---
site_id: 2218
site_name: mmu-live-image-studio
display_name: MMU Live Image Studio
description: 面向公司员工的通用 AI 生图工具，支持文本生成、参考图编辑与多图融合。
scene: tool-app
theme: A
owner: guanyalong
status: PUBLISHED
last_publish: 2026-08-20
git_project_path: DataAgent-AI/mmu-live-image-studio
---
## 概述
给公司员工使用的通用 AI 生图工作台，统一适配 Gemini 与 OpenAI 图片生成协议。

## 数据源
- TokenVerse 图片生成 API：浏览器通过用户 API Key 调用。
- 浏览器 IndexedDB：仅本机保存用户生成会话和图片，不上传服务端。

## 模块
- 生图工作台:`web/app/src/pages/HomePage1.vue` · 配置、历史侧边栏、生成结果、预览和下载。
- 协议适配:`web/app/src/services/api.ts` · Gemini 与 GPT-Image-2 请求、解析。
- 本地历史:`web/app/src/services/history.ts` · IndexedDB 会话与图片持久化。

## 硬约束
- API Key 仅保存在用户当前浏览器 localStorage，不上传服务器、不写入数据库、日志或 Cookie；支持一键清除。
- 生成图片与会话仅保存到用户当前浏览器 IndexedDB，默认保留，支持单条/全部手动清除。
- 参考图仅作为当前请求 Base64 数据，不持久化。
- Gemini 使用 v1beta generateContent；GPT-Image-2 使用 v1 images generations。

## 当前状态
- 已发布 V7：支持 API Key 自动回填和清除。
- 已发布 V8：支持本机生成历史和图片保留。
- 已发布 V9：本地历史图片保存已修复。
- 已发布 V10：全宽三栏布局、分栏独立滚动和结果图片视口适配。
- 正在修复 Gemini 生成请求的 imageConfig.aspectRatio 映射，保持其他功能不变。
