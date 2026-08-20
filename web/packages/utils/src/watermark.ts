/**
 * @ks-data/utils - 全局水印工具
 */
import KSWaterMark from '@ks/ks-watermark';

declare global {
    interface Window {
        waterMark: KSWaterMark;
    }
}

/**
 * 初始化全局水印
 * @param userName    用户英文名（工号）
 * @param displayName 用户展示名（可选，默认使用 userName）
 */
export function initWaterMark(userName: string, displayName?: string) {
    try {
        window.waterMark = new KSWaterMark({
            container: document.documentElement,
            fillStyle: 'rgba(184, 184, 184, 0.05)',
            width: '200px',
            height: '200px',
            content: [`快手资产 请勿外传 ${displayName || userName}`],
            font: '12px "PingFang SC", -apple-system, BlinkMacSystemFont, "Microsoft YaHei", Arial, sans-serif',
        });
    } catch (e) {
        console.warn('[watermark] init failed', e);
    }
}
