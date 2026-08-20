---
site_id: 2218
site_name: mmu-live-image-studio
display_name: MMU Live Image Studio
description: 面向公司员工的通用 AI 生图工具，支持文本生成、参考图编辑与多图融合。
scene: tool-app
theme: A
owner: guanyalong
status: DEV
last_publish: null
git_project_path: DataAgent-AI/mmu-live-image-studio
---
## 概述
给公司员工使用的通用 AI 生图工作台，统一适配 Gemini 与 OpenAI 图片生成协议。

## 数据源
- TokenVerse 图片生成 API：浏览器会话 API Key 调用，不持久化密钥或参考图。

## 模块
- 生图工作台:`web/app/src/pages/HomePage1.vue` · 配置、参考图、生成结果和下载。
- 协议适配:`web/app/src/services/api.ts` · Gemini 与 GPT-Image-2 请求、解析。

## 硬约束
- API Key 仅在浏览器运行内存使用，不写入存储、数据库和日志。
- 参考图仅作为当前请求 Base64 数据，不持久化。
- Gemini 使用 v1beta generateContent；GPT-Image-2 使用 v1 images generations。

## 进行中
- 正在完成 V1 开发与发布。
