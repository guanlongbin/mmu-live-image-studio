/**
 * @ks-data/upload-tool
 *
 * AI 建站基建：KCDN 静态资源上传工具（含自动重试）
 *
 * 使用方式（package.json scripts）：
 * ```json
 * "build": "BUILD_MODE=build rsbuild build && ks-upload-cdn"
 * ```
 *
 * 或在 shell 脚本中调用：
 * ```js
 * import { uploadWithRetry } from '@ks-data/upload-tool';
 * ```
 */

import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import Upload from '@kcdn/multi-upload';

// ===== 重试策略 =====
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 指数退避：1s / 2s / 4s
const WEBLOG_REPORT_TIMEOUT_MS = 5000;
const WEBLOG_NETWORK_TIMEOUT_MS = WEBLOG_REPORT_TIMEOUT_MS + 1000;
const DEFAULT_WEBLOG_PRODUCT_NAME = 'DataAgentTemplate';

// KCDN 错误码语义（来自官方文档 + 实测补充）
const ERR = {
    RATE_LIMIT: 2006000,   // 请求太快，命中限速，可重试
    NAME_CONFLICT: 10401,  // 同名文件已存在，需 allowRewrite: true
    AUTH_FAIL: 10406,      // 鉴权失败，pid/token 错误，不可重试
    TOKEN_FAIL: 1001,      // 实测 token 错误时 SDK 返回 code=1001
    EMPTY_FILE: 10427,     // 空文件上传失败
    ILLEGAL_NAME: 10451,   // 非法文件名
};

const FATAL_CODES = new Set([ERR.AUTH_FAIL, ERR.TOKEN_FAIL]);
const FATAL_MESSAGE_KEYWORDS = [
    'token错误', 'token 错误', 'invalid token',
    'unauthorized', '鉴权失败', 'auth fail',
];
const NON_RETRIABLE_CODES = new Set([ERR.EMPTY_FILE, ERR.ILLEGAL_NAME]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 安全提取错误信息，避免循环引用、BigInt 或异常 getter 让失败处理链路再次抛错。
 */
function getErrorMessage(err) {
    if (typeof err === 'string') return err;

    try {
        if (err?.message) return String(err.message);
    } catch {
        // 继续走安全序列化兜底。
    }

    try {
        const seen = new WeakSet();
        const serialized = JSON.stringify(err, (_, value) => {
            if (typeof value === 'bigint') return String(value);
            if (value && typeof value === 'object') {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
            }
            return value;
        });
        if (serialized) return serialized;
    } catch {
        // 继续使用 String，确保异常上报本身不阻断上传流程。
    }

    try {
        return String(err);
    } catch {
        return '[无法序列化的错误]';
    }
}

// ===== Weblog 上报（惰性初始化）=====
let weblogInstance = null;
function getWeblog() {
    if (weblogInstance !== null) return weblogInstance || null;
    try {
        const require = createRequire(import.meta.url);
        const { Weblog } = require('@ks/weblogger/lib/log.core');
        if (!Weblog) throw new Error('@ks/weblogger 未导出 Weblog');

        const productName = process.env.KCDN_WEBLOG_PRODUCT_NAME?.trim() || DEFAULT_WEBLOG_PRODUCT_NAME;
        const userId = process.env.BUILD_USERNAME || process.env.PIPELINE_OWNER || process.env.USER || '';
        weblogInstance = new Weblog(
            {
                env: 'production',
                // 上报用于 CLI 终态告警，不能沿用默认 1 秒批处理，否则会被进程退出截断。
                wait: 0,
                // SDK 的 timeout 回调无法区分成功与超时，需晚于本工具自己的失败定时器。
                timeout: WEBLOG_NETWORK_TIMEOUT_MS,
            },
            { product_name: productName, user_id: userId },
        );
        console.log(`📡 Weblog 已初始化 [product_name=${productName}]`);
        return weblogInstance;
    } catch (e) {
        console.warn('⚠️  @ks/weblogger 加载失败，跳过上报：', e?.message || e);
        weblogInstance = false;
        return null;
    }
}

/**
 * 立即发送单条 Weblog，并等待 SDK 回调或超时。
 *
 * @param {object} weblog Weblog 实例
 * @param {string} key 自定义事件 key
 * @param {object} value 事件内容
 * @param {number} [timeoutMs] 最长等待时间
 * @returns {Promise<boolean>} 请求是否成功完成
 */
export function sendWeblogEvent(weblog, key, value, timeoutMs = WEBLOG_REPORT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (success, error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (success) {
                console.log(`📡 Weblog 上报请求完成 [${key}]`);
            } else {
                console.warn(`⚠️  Weblog 上报失败 [${key}]:`, getErrorMessage(error));
            }
            resolve(success);
        };
        const timer = setTimeout(
            () => finish(false, new Error(`等待 Weblog 回调超过 ${timeoutMs}ms`)),
            timeoutMs,
        );
        const callback = (error) => finish(!error, error);

        try {
            const event = { key, value, callback };
            if (typeof weblog.sendImmediately === 'function') {
                weblog.sendImmediately('CUSTOM', event);
            } else {
                // 兼容旧版 SDK；callback 负责确认送达，flush 用于跳过批处理等待。
                weblog.collect('CUSTOM', event);
                weblog.flush?.();
            }
        } catch (e) {
            finish(false, e);
        }
    });
}

async function reportWeblog(key, value) {
    try {
        const weblog = getWeblog();
        if (!weblog) return false;
        return await sendWeblogEvent(weblog, key, value);
    } catch (e) {
        console.warn(`⚠️  Weblog 上报失败 [${key}]:`, getErrorMessage(e));
        return false;
    }
}

/**
 * 从 SDK 抛出的错误中提取 KCDN 错误码
 */
export function extractErrorCode(err) {
    if (!err) return null;
    let direct;
    try {
        direct = err.code ?? err.errorCode ?? err.data?.code ?? err.data?.errorCode;
    } catch {
        direct = null;
    }
    if (typeof direct === 'number') return direct;
    if (typeof direct === 'string' && /^\d+$/.test(direct)) return Number(direct);
    const msg = getErrorMessage(err);
    if (msg) {
        const nearCode = msg.match(/(?:error[_-]?code|code)\D{0,4}(\d{4,7})/i);
        if (nearCode) return Number(nearCode[1]);
        for (const c of [ERR.RATE_LIMIT, ERR.AUTH_FAIL, ERR.EMPTY_FILE, ERR.ILLEGAL_NAME, ERR.NAME_CONFLICT]) {
            if (msg.includes(String(c))) return c;
        }
    }
    return null;
}

/**
 * 判断错误分类
 * @returns {{ kind: 'fatal' | 'non-retriable' | 'retriable', code: number | null }}
 */
export function classifyError(err) {
    const code = extractErrorCode(err);
    if (code && FATAL_CODES.has(code)) return { kind: 'fatal', code };
    if (code && NON_RETRIABLE_CODES.has(code)) return { kind: 'non-retriable', code };
    try {
        if (err?.retriable === false) return { kind: 'non-retriable', code };
    } catch {
        // 异常对象字段不可读时仍按通用错误处理。
    }
    const msg = getErrorMessage(err).toLowerCase();
    if (msg && FATAL_MESSAGE_KEYWORDS.some((kw) => msg.includes(kw.toLowerCase()))) {
        return { kind: 'fatal', code };
    }
    return { kind: 'retriable', code };
}

/**
 * 校验 SDK 无法可靠兜底的必填参数，确保前置失败也能进入统一上报链路。
 */
function validateUploadOptions(opts, maxRetries) {
    const problems = [];
    if (typeof opts.pid !== 'string' || !opts.pid.trim()) problems.push('pid 不能为空');
    if (typeof opts.token !== 'string' || !opts.token.trim()) problems.push('token 不能为空');
    if (typeof opts.cdnDir !== 'string' || !opts.cdnDir.trim()) problems.push('cdnDir 不能为空');
    if (!Array.isArray(opts.files) || opts.files.length === 0) problems.push('files 必须是非空数组');
    if (!Number.isInteger(maxRetries) || maxRetries < 1) problems.push('maxRetries 必须是正整数');
    if (problems.length) throw new TypeError(`KCDN 上传参数无效：${problems.join('；')}`);
}

function createFailurePayload({ uploadId, opts, err, kind, code, attempt, maxRetries, reason, startedAt }) {
    return {
        reportVersion: 2,
        uploadId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        cdnDir: opts.cdnDir,
        error: getErrorMessage(err),
        errorName: (() => {
            try { return err?.name || typeof err; } catch { return 'unknown'; }
        })(),
        errorCode: code,
        errorKind: kind,
        attempt,
        maxRetries,
        pid: opts.pid,
        uid: opts.uid,
        fileEntryCount: Array.isArray(opts.files) ? opts.files.length : 0,
        reason,
    };
}

/**
 * 创建可注入依赖的上传函数，生产环境使用默认 SDK，测试可替换网络与等待实现。
 *
 * @param {object} [runtime]
 * @param {typeof Upload} [runtime.UploadClass] KCDN SDK 构造函数
 * @param {(key: string, value: object) => Promise<boolean>} [runtime.report] 上报函数
 * @param {(ms: number) => Promise<void>} [runtime.delay] 重试等待函数
 * @param {() => string} [runtime.createUploadId] 上传链路 ID 生成函数
 * @returns {(uploadOptions: object, maxRetries?: number) => Promise<string[]>}
 */
export function createUploadWithRetry({
    UploadClass = Upload,
    report = reportWeblog,
    delay = sleep,
    createUploadId = randomUUID,
} = {}) {
    return async function uploadWithRetry(uploadOptions, maxRetries = MAX_RETRIES) {
        const opts = {
            allowRewrite: 'true',
            allowHash: 'false',
            ...(uploadOptions && typeof uploadOptions === 'object' ? uploadOptions : {}),
            // SDK 开启进程级退出会绕过本工具的 catch 和终态上报，因此在这里强制关闭。
            exitOnApiError: 'unknown',
            exitProcessOnError: false,
        };
        const uploadId = createUploadId();
        const startedAt = Date.now();
        const reportTasks = [];
        const queueReport = (key, value) => {
            const task = Promise.resolve()
                .then(() => report(key, value))
                .catch((e) => {
                    console.warn(`⚠️  Weblog 上报任务异常 [${key}]:`, getErrorMessage(e));
                    return false;
                });
            reportTasks.push(task);
            return task;
        };
        const drainReports = async () => {
            await Promise.allSettled(reportTasks);
        };

        try {
            validateUploadOptions(opts, maxRetries);
        } catch (err) {
            const { code } = classifyError(err);
            queueReport('CDN_UPLOAD_FAILED', createFailurePayload({
                uploadId, opts, err, kind: 'fatal', code, attempt: 0,
                maxRetries, reason: 'precheck', startedAt,
            }));
            await drainReports();
            throw err;
        }

        let lastErr = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            if (attempt > 0) {
                const wait = RETRY_DELAYS_MS[attempt - 1] ?? 4000;
                console.log(`⏱️  第 ${attempt} 次重试前退避 ${wait}ms ...`);
                await delay(wait);
            }

            console.log(`📦 [第 ${attempt + 1}/${maxRetries} 次] 上传到 KCDN ...`);
            try {
                const upload = new UploadClass(opts);
                const cdnUrls = await upload.start();
                if (!Array.isArray(cdnUrls) || cdnUrls.length === 0) {
                    const emptyResultError = new Error('KCDN SDK 未返回任何 CDN URL，请检查上传目录是否为空或文件是否被全部忽略。');
                    emptyResultError.retriable = false;
                    throw emptyResultError;
                }
                await drainReports();
                console.log(`✅ 本轮上传成功，共 ${cdnUrls.length} 个文件`);
                return cdnUrls;
            } catch (err) {
                lastErr = err;
                const { kind, code } = classifyError(err);
                const errorMessage = getErrorMessage(err);
                console.error(`❌ 第 ${attempt + 1} 次上传失败 [kind=${kind}, code=${code ?? '未知'}]`);
                console.error('   原始错误:', errorMessage);

                queueReport('CDN_UPLOAD_ATTEMPT_FAILED', createFailurePayload({
                    uploadId, opts, err, kind, code, attempt: attempt + 1,
                    maxRetries, reason: 'attempt', startedAt,
                }));

                if (kind === 'fatal' || kind === 'non-retriable') {
                    const reason = kind === 'fatal' ? 'fatal' : 'non-retriable';
                    queueReport('CDN_UPLOAD_FAILED', createFailurePayload({
                        uploadId, opts, err, kind, code, attempt: attempt + 1,
                        maxRetries, reason, startedAt,
                    }));
                    await drainReports();

                    if (kind === 'fatal') {
                        throw new Error(
                            `KCDN 鉴权失败(code=${code})：请检查 pid=${opts.pid} 与 token 是否正确。`,
                            { cause: err },
                        );
                    }
                    throw new Error(`KCDN 上传遇到不可自动恢复的错误：${errorMessage}`, { cause: err });
                }

                if (code === ERR.RATE_LIMIT) {
                    console.warn('⏳ 命中限速(2006000)，将按指数退避后重试');
                } else if (code === ERR.NAME_CONFLICT) {
                    console.warn('⚠️  同名冲突(10401) 却已设 allowRewrite=true，继续重试');
                } else {
                    console.warn('⚠️  未识别错误，走重试');
                }
            }
        }

        const { kind: lastKind, code: lastCode } = classifyError(lastErr);
        queueReport('CDN_UPLOAD_FAILED', createFailurePayload({
            uploadId, opts, err: lastErr, kind: lastKind, code: lastCode,
            attempt: maxRetries, maxRetries, reason: 'exhausted', startedAt,
        }));
        await drainReports();
        throw new Error(
            `CDN 上传在 ${maxRetries} 次尝试后仍失败。最后一次错误：${getErrorMessage(lastErr)}`,
            { cause: lastErr },
        );
    };
}

/**
 * 带自动重试和失败上报的 KCDN 上传。
 *
 * @param {object} uploadOptions
 * @param {string} uploadOptions.pid KCDN 项目 ID
 * @param {string} uploadOptions.token KCDN 鉴权 token
 * @param {string} uploadOptions.cdnDir CDN 目标目录路径
 * @param {string[]} uploadOptions.files 本地文件路径数组
 * @param {string} [uploadOptions.uid] 上传者账号
 * @param {string} [uploadOptions.allowRewrite] 是否允许同名覆盖，默认 'true'
 * @param {string} [uploadOptions.allowHash] 是否允许 CDN 加 hash，默认 'false'
 * @param {number} [maxRetries] 最大尝试次数（含首次），默认 3
 * @returns {Promise<string[]>} 成功后的 CDN URL 数组
 */
export const uploadWithRetry = createUploadWithRetry();
