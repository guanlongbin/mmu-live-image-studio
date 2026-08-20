// 全局类型声明

/** rsbuild source.define 注入的编译期常量：开发模式下的 base path（如 /view/<id>/<port>/ 或 /） */
declare const __BASE_PATH__: string;
/** rsbuild source.define 注入的编译期常量：是否为开发模式（dev server 下为 true，build 产物为 false） */
declare const __IS_DEV__: boolean;

/** 当前环境对应的 DataAgent 站点地址，由 Rsbuild 在编译时注入 */
declare const __DATA_AGENT_ORIGIN__: string;

interface Window {
    /**
     * 应用基础路径（运行时由 index.html 注入）。
     * 兼容应用被外层网关挂到子路径下（如沙箱 /view/<会话id>/<端口>/）；根部署为 '/'。
     */
    __APP_BASE__?: string;

    /**
     * WebLogger 实例（由 initWebLogger 初始化后挂载）
     * 用于用户行为埋点（sendlog / sendImmediately）
     */
    weblog?: import('@ks/weblogger/es/log.browser').Weblog;

    /**
     * Radar 监控实例（由 initWebLogger 初始化后挂载）
     * 用于性能监控与异常告警上报
     */
    radarInstance?: any;

    /**
     * KIM JS-SDK 实例（快手 IM 桥接）
     */
    KIM?: any;

    /**
     * KIM OpenApp 原生桥接对象
     */
    __kim_OpenApp_Bridge__?: any;
}
