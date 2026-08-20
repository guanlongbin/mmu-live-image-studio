# 应用模块清单

- id: image-generator-workbench
  owner: guanyalong
  source: TokenVerse 图片生成 API
  files: web/app/src/pages/HomePage1.vue
  description: API 配置、模型选择、提示词、参考图上传、生成结果预览与下载。

- id: image-generation-api
  owner: guanyalong
  source: TokenVerse 图片生成 API
  files: web/app/src/services/api.ts
  description: Gemini 原生与 OpenAI Images 协议的请求构建、响应图片 Base64 解析。
