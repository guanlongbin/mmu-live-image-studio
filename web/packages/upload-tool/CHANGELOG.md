# Changelog

## Unreleased

### Fixed
- Weblog 失败事件改为立即发送并等待回调，避免 CLI 退出导致终态事件丢失
- 补齐参数预检、不可重试错误和空上传结果的终态上报
- 强制关闭 KCDN SDK 的进程级退出，并为失败事件增加 `uploadId` 等诊断字段

## [1.0.0] - 2026-07-08

### Added
- `uploadWithRetry(options, maxRetries?)` KCDN 上传工具函数，支持指数退避自动重试
- `extractErrorCode(err)` KCDN 错误码提取工具
- `classifyError(err)` 错误分类（fatal / non-retriable / retriable）
- `ks-upload-cdn` CLI，从环境变量读取配置，上传 dist/static 到 KCDN
- 支持 `KCDN_TOKEN`、`KCDN_PID`、`KCDN_DIR`、`KCDN_UID`、`KCDN_DIST_DIR` 环境变量配置
