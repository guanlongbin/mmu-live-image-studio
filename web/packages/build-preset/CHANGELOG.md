# Changelog

## Unreleased

### Added

- dev 启动时将项目根目录名转换为合法的 `*_PORT` 变量名并写入 `.env` 的 `dataagent_system_var`，不修改进程环境变量

### Fixed
- 在生产压缩完成、真实内容哈希计算前填充 0 字节 JS/CSS 构建产物，避免 KCDN 拒绝上传空文件
- 不再在构建期将沙箱 `BASE_PATH` 固化到 HTML，避免沙箱构建产物部署线上后继续携带 `/view/<id>/<port>/`
- 使用 `HttpsProxyAgent` 时通过静态 `headers` 注入 Cookie，避免 `onProxyReq` 在请求头已发送后触发 `ERR_HTTP_HEADERS_SENT` 并导致 dev server 退出

## [1.0.0] - 2026-07-08

### Added
- `createRsbuildConfig(options)` rsbuild 配置工厂函数，封装端口探测、沙箱 HMR、Cookie 加载、CDN 配置
- `createSandboxHmrPlugin(basePath)` 沙箱 HMR 路径修复插件
- `findAvailablePort(startPort)` 端口探测工具
- `isPortAvailable(port)` 单端口可用性检测
- `loadCookie(localCookieFile)` Cookie 加载（沙箱共享路径优先）
- `loadSandboxEnv()` 沙箱环境变量加载
- `readPortFromEnv(envFile)` / `writePortToEnv(envFile, port)` .env 端口读写工具
