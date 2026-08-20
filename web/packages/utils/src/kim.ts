/**
 * Kim App 移动端适配工具
 *
 * 解决问题：Kim App 内置 WebView 不支持 window.open 打开新标签页，
 * 跳转到新页面后无法返回，需改用 yoda bridge 的 webview.open 打开新页面。
 */
import { invoke } from '@yoda/bridge';

const ua = navigator.userAgent;

/** 是否在 Kim App 容器内（UA 含 Kim/x.x.x） */
function isKimApp(): boolean {
    return /Kim\/[\d.]+/.test(ua);
}

/** 是否是移动端设备 */
function isMobile(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(ua);
}

/** 是否在 Kim App 的移动端容器内 */
export function isInKimAppMobile(): boolean {
    return isKimApp() && isMobile();
}

/**
 * 打开新页面
 *
 * - Kim 移动端：调用 yoda bridge webview.open，在新 WebView 层打开（支持返回键回退）
 * - 其他环境：fallback 到 window.open
 */
export const openNewPage = (url: string): void => {
    if (isInKimAppMobile()) {
        try {
            invoke('webview.open', { url });
            return;
        } catch (e) {
            console.warn('[openNewPage] webview.open bridge failed, fallback to window.open', e);
        }
    }
    window.open(url, '_blank');
};

/**
 * 兼容 Kim 环境的打开链接方法（支持 Kim schema URL，如 kim://username?username=xxx）
 *
 * - Kim 桌面端：使用 KIM.openUrlWithDefaultBrowser
 * - Kim WebView：通过 location.href 跳转 schema
 * - 其他环境：window.open
 */
export const openSchemaUrl = (url: string): void => {
    if (window.KIM) {
        window.KIM?.openUrlWithDefaultBrowser(url);
    } else if (window.__kim_OpenApp_Bridge__) {
        window.location.href = url;
    } else {
        window.open(url, '_blank');
    }
};
