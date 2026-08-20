/**
 * 埋点事件常量
 */

/** 用户行为埋点事件（weblog.sendImmediately 使用） */
export const ELEMENT_ACTION = {
    // 页面加载/初始化
    APP_INIT: 'APP_INIT',
    // 用户登录
    USER_LOGIN: 'USER_LOGIN',
    // 页面切换
    PAGE_NAVIGATE: 'PAGE_NAVIGATE',
} as const;

/** Radar 自定义告警事件 */
export const RADAR_CUSTOM_EVENT = {
    // 首屏加载超时
    LOAD_TIMEOUT: 'LOAD_TIMEOUT',
    // 主动抛出的控制台错误
    CONSOLE_ERROR: 'CONSOLE_ERROR',
    // 登录重试失败
    LOGIN_RETRY_ERROR: 'LOGIN_RETRY_ERROR',
    // 接口异常
    API_ERROR: 'API_ERROR',
} as const;
