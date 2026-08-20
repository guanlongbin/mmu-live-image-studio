# Changelog

## [1.0.0] - 2026-07-08

### Added
- `useDataAgent(options)` composable：封装 @ks-data/data-agent-sdk 独立模式初始化、流式状态管理、parseChunks 解析
- `AgentAnalysis.vue` 一体化组件：触发按钮 + ExecuteProcessView + ConclusionView
  - Props: `agentId`、`content`、`buttonLabel`
  - Slots: `#trigger` 插槽支持完全自定义触发 UI
  - Emits: `analyze-start`、`analyze-complete`、`error`
  - Expose: `analyze(content)`、`cancel()`、`reset()`
- 透传导出 `ExecuteProcessView`、`ConclusionView`（来自 @ks-data/data-agent-sdk/renderer）
