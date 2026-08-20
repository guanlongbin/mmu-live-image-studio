/**
 * @ks-data/utils 包入口
 *
 * 统一导出所有工具函数和常量
 */

// 请求工具
export { request, withBase, getAccount, getAuth, ensureLogin, setGlobalNotify } from './request';
export type { NotifyFn } from './request';

// WebLogger + Radar
export { initWebLogger, initGlobalErrorCapture, sendlog } from './weblogger';
export type { InitWebLoggerOptions } from './weblogger';

// 水印
export { initWaterMark } from './watermark';

// 常量
export { ELEMENT_ACTION, RADAR_CUSTOM_EVENT } from './const/weblogger';

// Kim 工具
export { isInKimAppMobile, openNewPage, openSchemaUrl } from './kim';
