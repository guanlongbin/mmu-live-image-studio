/**
 * @ks-data/utils - WebLogger + Radar 初始化工具
 */
import { Weblog } from '@ks/weblogger/es/log.browser';
import AutoPV from '@ks/weblogger/lib/plugins/autopv';
import AutoTrack from '@weblogger/plugin-auto-track';
import { commonEmerge } from '@weblogger/auto-track-util';
import Radar from '@ks-radar/radar';
import { RADAR_CUSTOM_EVENT } from './const/weblogger';

export interface InitWebLoggerOptions {
    /** 自动化埋点识别的应用名 */
    appName?: string;
    /** 埋点 product_name，默认 'DataAgentSite' */
    productName?: string;
    /** Radar 项目 ID，默认 '73b1bca936'，传 false 则不初始化 Radar */
    radarProjectId?: string | false;
}

/**
 * 初始化 WebLogger 与 Radar 监控
 * @param userName 用户英文名（工号），用于埋点 user_id
 * @param options  可选配置，均有默认值
 */
export const initWebLogger = (userName: string, options: InitWebLoggerOptions = {}) => {
    if ((window as any).weblog) return (window as any).weblog;

    const {
        appName,
        productName = 'DataAgentSite',
        radarProjectId = '73b1bca936',
    } = options;

    (window as any).weblog = new Weblog(
        {
            referer: {
                value: (() => {
                    try { return window.top?.location?.href || window.location.href; }
                    catch { return window.location.href; }
                })(),
                type: 'web',
            },
            env: 'production',
            plugins: [
                new AutoTrack({
                    beforeClickEventList: [commonEmerge],
                    appName,
                }),
                new AutoPV(),
            ],
        },
        {
            product_name: productName,
            user_id: userName || '',
        },
    );

    // 初始化雷达监控
    if (radarProjectId !== false) {
        (window as any).radarInstance = new Radar({
            weblog: (window as any).weblog,
            projectId: radarProjectId,
            sampling: 1,
            lcp: true,
            cls: true,
            fid: true,
            APIHook(apiData: any) {
                const { request, response, duration } = apiData;
                try {
                    const data = JSON.parse(response.data);
                    return {
                        response_code: data.code,
                        response_msg: { result: data.result, duration, request },
                        status: response.status,
                        custom_failed: false,
                    };
                } catch {
                    return {
                        response_code: -1,
                        response_msg: { duration, request },
                        status: response.status,
                        custom_failed: true,
                    };
                }
            },
        });
    }

    return (window as any).weblog;
};

/**
 * 重写 console.error，将错误同步上报到 Radar
 * 建议在 initWebLogger 之后调用一次
 */
export const initGlobalErrorCapture = () => {
    const originalConsoleError = console.error;

    console.error = (...args: any[]) => {
        originalConsoleError.apply(console, args);

        if ((window as any).radarInstance) {
            try {
                const errorMessage = args.map((arg) => {
                    if (arg instanceof Error) {
                        return { name: arg.name, message: arg.message, stack: arg.stack, type: 'Error' };
                    } else if (typeof arg === 'string') {
                        return { message: arg, type: 'String' };
                    } else {
                        return { message: String(arg), type: typeof arg };
                    }
                });
                (window as any).radarInstance.event({
                    name: RADAR_CUSTOM_EVENT.CONSOLE_ERROR,
                    extra_info: { error: errorMessage },
                });
            } catch (e) {
                originalConsoleError('Failed to send error to radar:', e);
            }
        }
    };
};

/**
 * 发送用户行为埋点（CLICK 事件）
 * @param action  事件名（建议使用 ELEMENT_ACTION 常量）
 * @param params  附加参数
 */
export const sendlog = (action: string, params?: Record<string, any>) => {
    if ((window as any).weblog) {
        (window as any).weblog.sendImmediately('CLICK', { action, params });
    } else {
        console.warn('[weblogger] weblog is not initialized yet');
    }
};
