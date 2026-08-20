# Changelog

## [1.0.0] - 2026-07-08

### Added
- `request(url, options?)` 统一 fetch 封装，带 cookie、响应解包、Toast 错误提示
- `withBase(path)` URL 前缀处理，兼容沙箱子路径部署
- `getAccount()` 获取当前登录用户信息（平台标准接口）
- `getAuth()` 权限校验接口（平台标准接口）
- `ensureLogin()` 校验登录态，生产环境未登录自动跳转 SSO
- `initWebLogger(userName, options?)` WebLogger + Radar 初始化，productName/radarProjectId 有默认值
- `initGlobalErrorCapture()` 全局 console.error 上报到 Radar
- `sendlog(action, params?)` 发送用户行为埋点
- `initWaterMark(userName, displayName?)` 初始化全局水印
- `ELEMENT_ACTION` 基础埋点事件常量（用户侧可扩展）
- `RADAR_CUSTOM_EVENT` Radar 告警事件常量（用户侧可扩展）
