/**
 * @ks-data/utils - 统一请求封装
 *
 * 提供：
 * - request()     统一 fetch 封装（带 cookie、统一解包响应、Toast 错误提示）
 * - withBase()    URL 前缀处理（沙箱路径兼容）
 * - getAccount()  获取当前登录用户信息（平台标准接口）
 * - getAuth()     权限校验接口（平台标准接口）
 * - ensureLogin() 校验登录态，未登录时跳转 SSO
 */

export type NotifyFn = (message: string) => void;

/** 全局默认错误通知函数，由应用层通过 setGlobalNotify 注入（如 Toast.error） */
let _globalNotify: NotifyFn | null = null;

/**
 * 注入全局错误通知函数。
 * 在应用入口（如 api.ts）调用一次，之后所有 request() 错误都会自动走这个函数。
 * @example
 *   import { setGlobalNotify } from '@ks-data/utils';
 *   import { useToast } from '@/composables/useToast';
 *   setGlobalNotify((msg) => useToast().error(msg));
 */
export function setGlobalNotify(fn: NotifyFn) {
    _globalNotify = fn;
}

interface RequestOptions {
    method?: 'GET' | 'POST';
    params?: Record<string, any>;
    /** 设为 true 时跳过错误提示（调用方自行处理错误展示）*/
    silent?: boolean;
    /** 单次调用级别的错误通知函数，优先级高于全局 setGlobalNotify */
    notify?: NotifyFn;
}

/**
 * 给接口路径加上应用基础路径前缀。
 * 兼容应用被外层网关挂到子路径下（如沙箱 /view/<会话id>/<端口>/）：
 * 根部署时前缀为空 -> /api/...；子路径下 -> /view/.../8888/api/...
 */
export function withBase(path: string): string {
    const base = ((window as any).__APP_BASE__ || '/').replace(/\/$/, '');
    return base + path;
}

/**
 * 统一请求方法。
 * 约定后端响应格式：{ result: 1, data: ... } 或 { code: 0, data: ... }。
 * 所有网络/业务错误均通过 Toast 统一提示后再 throw，调用方无需重复处理。
 * 若不希望弹 Toast（如静默重试场景），传 silent: true。
 */
export async function request(
    url: string,
    { method = 'GET', params = {}, silent = false, notify }: RequestOptions = {},
): Promise<any> {
    const notifyError: NotifyFn = (msg: string) => {
        if (silent) return;
        console.log(_globalNotify)
        const fn = notify ?? _globalNotify;
        if (fn) {
            fn(msg);
        } else {
            console.error('[request]', msg);
        }
    };

    let finalUrl = withBase(url);
    const headers: Record<string, string> = { Accept: 'application/json' };
    let body: string | undefined;

    if (method === 'GET') {
        const search = new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null) as [string, string][],
        ).toString();
        if (search) finalUrl += (finalUrl.includes('?') ? '&' : '?') + search;
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(params);
    }

    let res: Response;
    try {
        res = await fetch(finalUrl, {
            method,
            mode: 'cors',
            credentials: 'include',
            headers,
            body,
        });
    } catch (e: any) {
        const msg = `网络请求失败：${e?.message || '请检查网络连接'}`;
        notifyError(msg);
        throw new Error(msg);
    }

    if (res.status === 401) {
        const err = new Error('未登录或登录态已过期');
        (err as any).status = 401;
        throw err;
    }

    if (!res.ok) {
        const msg = `接口错误：${res.status} ${res.statusText}`;
        notifyError(msg);
        throw new Error(msg);
    }

    const result = await res.json();

    if (typeof result.code === 'number') {
        if (result.code === 0 || result.code === 200) return result.data;
        const msg = result.message || result.msg || '请求失败';
        notifyError(msg);
        throw new Error(msg);
    }
    if (result.result !== 1) {
        const msg = result.message || result.msg || '请求失败';
        notifyError(msg);
        throw new Error(msg);
    }
    return result.data;
}

// ===== 平台标准接口（所有站点通用）=====

/**
 * 获取当前登录用户信息
 * GET /api/v1/login/user/account?simple=true
 */
export function getAccount() {
    return request('/api/v1/login/user/account', { method: 'GET', params: { simple: true }, silent: true });
}

/**
 * 权限校验接口：获取当前登录用户是否有访问权限
 * GET /api/v1/site/access
 */
export function getAuth() {
    return request('/rest/flow/api/v1/site/access', { method: 'GET' });
}

// ===== SSO 登录跳转 =====

const SSO_BASE_URL = '//sso.corp.kuaishou.com/cas/login';
const LOGIN_CNT_KEY = 'loginCnt';
const MAX_LOGIN_RETRY = 3;

function isLocalhost(): boolean {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}

function isSandbox(): boolean {
    const base = (window as any).__APP_BASE__ || '/';
    return /^\/view\/[^/]+\/\d+\/?$/.test(base);
}

function isUnauthorized(e: any): boolean {
    return e?.status === 401;
}

function buildLoginUrl(currentHref: string): string {
    const authHost = `${window.location.protocol}//${window.location.host}`;
    const callbackUrl = withBase('/api/v1/login/callback');
    const returnUrl = `${authHost}${callbackUrl}?redirect=${encodeURIComponent(currentHref)}`;
    return `${SSO_BASE_URL}?service=${encodeURIComponent(returnUrl)}`;
}

function redirectToSSO(): void {
    const cnt = +(window.sessionStorage.getItem(LOGIN_CNT_KEY) || 0);
    if (cnt >= MAX_LOGIN_RETRY) {
        window.sessionStorage.setItem(LOGIN_CNT_KEY, '0');
        throw new Error('SSO 登录重试超过上限，请检查登录态后重试');
    }
    window.sessionStorage.setItem(LOGIN_CNT_KEY, String(cnt + 1));
    window.location.replace(buildLoginUrl(window.location.href));
}

/**
 * 校验登录态：
 * - 已登录 -> 返回用户信息
 * - 生产环境未登录 -> 跳转 SSO（返回的 Promise 永不 resolve，等待页面跳走）
 * - 本地未登录 / 其它错误 -> 抛出
 */
export async function ensureLogin(): Promise<any> {
    try {
        const user = await getAccount();
        window.sessionStorage.setItem(LOGIN_CNT_KEY, '0');
        return user;
    } catch (e: any) {
        if (isUnauthorized(e)) {
            if (isSandbox()) {
                throw new Error('沙箱登录凭证已失效，请重新启动开发服务以加载最新 Cookie');
            }
            if (!isLocalhost()) {
                redirectToSSO();
                return new Promise(() => {});
            }
        }
        throw e;
    }
}
