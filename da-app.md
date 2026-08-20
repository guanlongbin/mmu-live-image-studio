# 应用模块清单

- id: image-generator-workbench
  owner: guanyalong
  source: TokenVerse 图片生成 API + 浏览器本地存储
  files: web/app/src/pages/HomePage1.vue
  description: API 配置、浏览器密钥自动回填与清除、模型选择、提示词、参考图上传、生成进度、图片预览下载及历史侧边栏。

- id: image-generation-api
  owner: guanyalong
  source: TokenVerse 图片生成 API
  files: web/app/src/services/api.ts
  description: Gemini 原生与 OpenAI Images 协议的请求构建、响应图片 Base64 解析。

- id: local-generation-history
  owner: guanyalong
  source: 浏览器 IndexedDB
  files: web/app/src/services/history.ts
  description: 本机持久保存生成会话、提示词、参数和图片；支持读取、保存、删除与清空，数据不上传服务端。
