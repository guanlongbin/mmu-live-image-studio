/**
 * @ks-data/build-preset
 *
 * AI 建站基建：rsbuild 配置工厂、沙箱 HMR 插件、端口探测工具、Cookie 加载
 *
 * 使用示例（rsbuild.config.js）：
 * ```js
 * import { createRsbuildConfig } from '@ks-data/build-preset';
 * export default createRsbuildConfig({
 *   __dirname,
    htmlTitle: 'DataAgent 智能建站',
 * });
 * ```
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, createConnection } from 'node:net';
import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createEmptyAssetPlugin } from './empty-asset-plugin.js';
import { createProxyOptions } from './proxy-options.js';

export { createEmptyAssetPlugin } from './empty-asset-plugin.js';

// ===== 沙箱 Cookie 路径 =====
const COOKIE_FILE = '/data_agent/users/.agent-cookie/.data-agent-cookie';
const SANDBOX_FILE = '/data_agent/users/.env';

// corp 域名（*.corp.kuaishou.com 等）应用层做了 IDC 源检查，
// 从 IDC 沙箱直连会命中 40314「Unable To Access On The IDC Network Segment」。
// rsbuild dev proxy 底层是 Node 原生 http/https 模块，不读 HTTP_PROXY ENV，
// 沙箱镜像注入的 NO_PROXY 对它也无效，必须在代码层显式挂 agent 走 137 代理。
const CORP_PROXY_URL = 'http://172.28.127.137:8000';

// ===== 端口探测工具 =====

/** 尝试在指定 host 上监听端口，成功返回 true */
function probe(port, host) {
    return new Promise((resolveFn) => {
        const server = createServer();
        server.unref();
        const done = (ok) => {
            server.removeAllListeners();
            try { server.close(); } catch {}
            resolveFn(ok);
        };
        server.once('error', () => done(false));
        server.once('listening', () => done(true));
        server.listen({ port, host, exclusive: true });
    });
}

/** TCP connect 探测：连上 = 有进程监听 = 占用 */
function canConnect(port, host) {
    return new Promise((resolveFn) => {
        const socket = createConnection({ port, host });
        socket.setTimeout(500);
        const finish = (occupied) => {
            socket.removeAllListeners();
            try { socket.destroy(); } catch {}
            resolveFn(occupied);
        };
        socket.once('connect', () => finish(true));
        socket.once('error', () => finish(false));
        socket.once('timeout', () => finish(false));
    });
}

/**
 * 综合判断端口是否可用：
 * 1) 在 127.0.0.1 / ::1 上 connect，能连上即占用
 * 2) 再尝试在 0.0.0.0 / :: 上 listen，失败也算占用
 */
export async function isPortAvailable(port) {
    const connectHosts = ['127.0.0.1', '::1'];
    for (const h of connectHosts) {
        // eslint-disable-next-line no-await-in-loop
        if (await canConnect(port, h)) {
            console.log(`[rsbuild] 端口 ${port} 已被占用（${h} 连接成功）`);
            return false;
        }
    }
    const listenHosts = ['0.0.0.0', '::'];
    for (const h of listenHosts) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await probe(port, h))) {
            console.log(`[rsbuild] 端口 ${port} 在 ${h} 上 listen 失败，视为占用`);
            return false;
        }
    }
    return true;
}

/**
 * 从指定端口开始，找一个未被占用的端口
 * @param {number} startPort 起始端口
 * @param {number} maxTry 最大尝试次数，默认 100
 */
export async function findAvailablePort(startPort, maxTry = 100) {
    let port = Number(startPort) || 3000;
    for (let i = 0; i < maxTry; i++) {
        // eslint-disable-next-line no-await-in-loop
        if (await isPortAvailable(port)) return port;
        port += 1;
    }
    throw new Error(`[rsbuild] 无法在 ${startPort}~${port} 范围内找到可用端口`);
}

// ===== .env 端口读写 =====

/** 从 .env 文件读取 port 字段 */
export function readPortFromEnv(envFile) {
    if (!existsSync(envFile)) return 3000;
    const raw = readFileSync(envFile, 'utf-8');
    const m = raw.match(/^\s*port\s*=\s*(\d+)\s*$/im);
    return m ? Number(m[1]) : 3000;
}

/** 向 .env 文件写入 port 字段，保留其它行 */
export function writePortToEnv(envFile, port) {
    let raw = existsSync(envFile) ? readFileSync(envFile, 'utf-8') : '';
    if (/^\s*port\s*=.*$/im.test(raw)) {
        raw = raw.replace(/^\s*port\s*=.*$/im, `port=${port}`);
    } else {
        raw = (raw && !raw.endsWith('\n') ? raw + '\n' : raw) + `port=${port}\n`;
    }
    writeFileSync(envFile, raw, 'utf-8');
}

/** 向 .env 文件写入 dataagent_system_var 字段，保留其它行 */
function writeSystemVarToEnv(envFile, systemVar) {
    const raw = existsSync(envFile) ? readFileSync(envFile, 'utf-8') : '';
    let nextRaw;
    if (/^\s*dataagent_system_var\s*=.*$/im.test(raw)) {
        nextRaw = raw.replace(
            /^\s*dataagent_system_var\s*=.*$/im,
            `dataagent_system_var=${systemVar}`,
        );
    } else {
        nextRaw =
            (raw && !raw.endsWith('\n') ? raw + '\n' : raw) +
            `dataagent_system_var=${systemVar}\n`;
    }
    // 避免重复 dev 初始化时无意义地更新 .env mtime，进而触发文件监听或重载。
    if (nextRaw !== raw) writeFileSync(envFile, nextRaw, 'utf-8');
}

/**
 * 将项目目录名转换为合法的 Shell 变量名并写入 .env，仅记录名称，不设置进程环境变量
 *
 * @param {string} envFile .env 文件路径
 * @param {string} callerDir 调用方目录，项目约定为 `<project>/web/app`
 * @returns {string} 写入 dataagent_system_var 的变量名
 */
function writeProjectSystemVarToEnv(envFile, callerDir) {
    const projectName = basename(resolve(callerDir, '../..'));
    const normalizedProjectName = projectName.replace(/[^a-zA-Z0-9_]+/g, '_').toUpperCase();
    const shellSafeProjectName = /^[A-Z_]/.test(normalizedProjectName)
        ? normalizedProjectName
        : `_${normalizedProjectName}`;
    const systemVar = `${shellSafeProjectName}_PORT`;

    writeSystemVarToEnv(envFile, systemVar);
    return systemVar;
}

// ===== Cookie 加载 =====

/**
 * 加载本地联调 Cookie
 * 优先级：沙箱共享路径 > 模板本地 .cookie 文件
 * @param {string} localCookieFile 本地 .cookie 文件路径（绝对路径）
 * @param {string} [sharedCookieFile] 沙箱共享 Cookie 文件路径
 */
export function loadCookie(
    localCookieFile,
    sharedCookieFile = COOKIE_FILE,
) {
    try {
        const c = readFileSync(sharedCookieFile, 'utf-8').trim();
        if (c) {
            console.log('[rsbuild] 使用沙箱共享 Cookie');
            return c;
        }
    } catch {
        // 沙箱路径不可用，尝试本地文件
    }
    try {
        if (localCookieFile) {
            const c = readFileSync(localCookieFile, 'utf-8').trim();
            if (c) {
                console.log('[rsbuild] 使用本地 .cookie');
                return c;
            }
        }
    } catch {
        // 本地文件不存在
    }
    console.warn('[rsbuild] 未找到登录 Cookie，接口将未鉴权');
    return '';
}

/**
 * 加载沙箱环境变量文件（/data_agent/users/.env）
 * @returns {{ sandbox_id?: string, cdn_token?: string, [key: string]: string }}
 */
export function loadSandboxEnv() {
    try {
        const raw = readFileSync(SANDBOX_FILE, 'utf-8');
        return Object.fromEntries(
            raw
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('#'))
                .map((line) => {
                    const idx = line.indexOf('=');
                    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
                }),
        );
    } catch {
        return {};
    }
}

// ===== 沙箱 HMR 插件 =====

/**
 * 沙箱 HMR 路径修复插件
 *
 * rsbuild 把 dev.client.path 同时灌给浏览器 ws URL 和容器内 ws.Server 的 path 选项。
 * 沙箱外层网关把 BASE_PATH 前缀剥掉再转给容器，容器内 ws.Server.shouldHandle 字面
 * 比对路径 → mismatch → 静默丢弃 upgrade，HMR 永远 CONNECTING。
 * 此插件在 httpServer 挂自己 upgrade listener 之前 prepend 一个，把 BASE_PATH 加回 req.url。
 *
 * @param {string} basePath 沙箱 BASE_PATH（如 /view/<id>/<port>/）
 */
export function createSandboxHmrPlugin(basePath) {
    return {
        name: 'sandbox-hmr-prefix',
        setup(api) {
            api.onBeforeStartDevServer(({ server }) => {
                const httpServer = server?.httpServer;
                if (!httpServer) return;
                if (!basePath || basePath === '/') return;
                const prefix = basePath.replace(/\/$/, '');
                httpServer.prependListener('upgrade', (req) => {
                    const url = req.url || '';
                    if (url === '/rsbuild-hmr' || url.startsWith('/rsbuild-hmr?')) {
                        req.url = prefix + url;
                    }
                });
            });
        },
    };
}

// ===== rsbuild 配置工厂 =====

/**
 * 创建 rsbuild 配置
 *
 * @param {object} options 项目级配置
 * @param {string} options.proxyTarget           接口代理目标地址（如 'https://rc-dataagent.corp.kuaishou.com'）
 * @param {string} options.cdnOutputPath         CDN 输出路径（如 '/kcdn/cdn-kcdn113209/data-agent-website-build-file'）
 * @param {string} [options.cdnDomain]           CDN 域名，默认 'https://h2.static.yximgs.com'
 * @param {string[]} [options.proxyPaths]        代理路径列表，默认 ['/api', '/rest/flow', '/dp']
 * @param {string} [options.htmlTemplate]        HTML 模板路径，默认 './public/index.html'
 * @param {string} [options.htmlTitle]           页面标题，默认 'DataAgent 智能建站'
 * @param {string} [options.entry]               入口文件，默认 './src/index.ts'
 * @param {Record<string, string>} [options.sourceDefines] 额外的编译时常量
 * @param {object} [options.extraPlugins]        额外 rsbuild 插件
 * @param {object} [options.extraConfig]         额外 rsbuild 配置（深度合并）
 * @param {string} [options.cookieFile]          沙箱共享 Cookie 文件路径
 * @param {string} [options.__dirname]           调用方的 __dirname（用于路径解析，必传）
 */
export async function createRsbuildConfig(options = {}) {
    const {
        proxyTarget = 'https://dataagent.corp.kuaishou.com',
        cdnOutputPath = '/kcdn/cdn-kcdn113209/data-agent-website-build-file',
        proxyPaths = ['/api', '/rest/flow', '/dp'],
        cdnDomain = 'https://h2.static.yximgs.com',
        htmlTemplate = './public/index.html',
        htmlTitle = 'DataAgent 智能建站',
        entry = './src/index.ts',
        sourceDefines = {},
        extraPlugins = [],
        extraConfig = {},
    } = options;

    // 调用方传入 __dirname（ESM 下需要手动传）
    const callerDir = options.__dirname || process.cwd();

    // 代理日志写到 app 根目录下的 tmp 文件夹
    const PROXY_LOG_DIR = resolve(callerDir, 'tmp');
    const PROXY_LOG_FILE = resolve(PROXY_LOG_DIR, 'proxy.log');
    try { mkdirSync(PROXY_LOG_DIR, { recursive: true }); } catch { /* 目录已存在忽略 */ }
    const proxyLog = (msg) => {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        process.stdout.write(line);
        try { appendFileSync(PROXY_LOG_FILE, line); } catch { /* 写文件失败不影响主流程 */ }
    };
    const ENV_FILE = resolve(callerDir, '.env');
    const LOCAL_COOKIE_FILE = resolve(callerDir, '.cookie');
    const SHARED_COOKIE_FILE = options.cookieFile || COOKIE_FILE;

    // 初始化 .env
    if (!existsSync(ENV_FILE)) {
        writeFileSync(ENV_FILE, 'port=3000\n', 'utf-8');
    }

    const isBuild = process.argv.includes('build') || process.env.BUILD_MODE === 'build';
    const isDev = !isBuild && process.argv.includes('dev');
    console.log('[rsbuild] command =', isBuild ? 'build' : 'dev/other');

    const desiredPort = readPortFromEnv(ENV_FILE);
    const PORT = isBuild ? desiredPort : await findAvailablePort(desiredPort);
    if (!isBuild) {
        if (PORT !== desiredPort) {
            console.warn(`[rsbuild] 端口 ${desiredPort} 被占用，已自动切换到 ${PORT} 并写回 .env`);
            writePortToEnv(ENV_FILE, PORT);
        } else {
            console.log(`[rsbuild] 使用端口 ${PORT}`);
        }
        if (isDev) {
            const systemVar = writeProjectSystemVarToEnv(ENV_FILE, callerDir);
            console.log(`[rsbuild] 已写入 .env：dataagent_system_var=${systemVar}`);
        }
    }

    const COOKIE = loadCookie(LOCAL_COOKIE_FILE, SHARED_COOKIE_FILE);
    const sandboxEnv = loadSandboxEnv();
    const SANDBOX_SID = sandboxEnv.sandbox_id;
    const SANDBOX_HOST = 'wanqing-sandbox-test.test.gifshow.com';
    const BASE_PATH = SANDBOX_SID ? `/view/${SANDBOX_SID}/${PORT}/` : '/';

    const CDN_BASE = `${cdnDomain}${cdnOutputPath}`;
    const isProd = process.env.NODE_ENV === 'production';

    const proxyWithCookie = {
        ...createProxyOptions({
            target: proxyTarget,
            cookie: COOKIE,
            agent: new HttpsProxyAgent(CORP_PROXY_URL),
        }),
        onProxyReq: (_proxyReq, req) => {
            const safePath = (req.url || '').split('?')[0];
            const targetUrl = `${proxyTarget}${safePath}`;
            proxyLog(`[proxy] ${req.method} ${safePath} → ${targetUrl}`);
            // const cookiePresent = Boolean(COOKIE || req.headers['cookie']);
            // proxyLog(`[proxy] cookiePresent=${cookiePresent}`);
        },
    };

    const proxy = Object.fromEntries(proxyPaths.map((p) => [p, proxyWithCookie]));

    const sandboxHmrPlugin = createSandboxHmrPlugin(BASE_PATH);

    return defineConfig({
        plugins: [pluginVue(), createEmptyAssetPlugin(), sandboxHmrPlugin, ...extraPlugins],
        source: {
            entry: { index: entry },
            define: {
                ...sourceDefines,
                __BASE_PATH__: JSON.stringify(BASE_PATH),
                __IS_DEV__: JSON.stringify(!isBuild),
            },
        },
        resolve: {
            alias: { '@': resolve(callerDir, 'src')},
        },
        html: {
            template: htmlTemplate,
            title: htmlTitle,
        },
        server: {
            port: PORT,
            host: '0.0.0.0',
            compress: false,
            proxy,
        },
        dev: {
            assetPrefix: BASE_PATH,
            client: {
                host: SANDBOX_HOST,
                port: '443',
                protocol: 'wss',
                path: `${BASE_PATH}rsbuild-hmr`,
            },
            writeToDisk: false,
            lazyCompilation: false,
        },
        output: {
            cleanDistPath: isBuild,
            assetPrefix: isProd ? CDN_BASE : BASE_PATH,
        },
        ...extraConfig,
    });
}
