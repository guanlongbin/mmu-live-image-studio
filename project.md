---
site_id: 2218
site_name: mmu-live-image-studio
display_name: MMU Live Image Studio
description: 面向公司员工的通用 AI 生图工具，支持文本生成、参考图编辑与多图融合。
scene: tool-app
theme: A
owner: guanyalong
status: PUBLISHED
last_publish: 2026-08-21
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
- 已发布 V11：Gemini 请求按尺寸传递 imageConfig.aspectRatio。
- 已实现多轮图片引用创作：同一会话保存多轮 Prompt、参数和图片；选中结果后可作为 Gemini 下一轮引用图继续修改生成。
- V13–V15：结果图缩略展示，点击放大与引用继续分离；优化三栏宽度与字号；悬停结果图展示所属轮次 Prompt。
- V16–V17：Prompt 移至结果区顶部，并修复通用按钮宽度覆盖导致的输入框受挤压问题。
- 自定义尺寸使用 256–4096 px、步进 64 px 的宽高滑块；API Key 下方以黄色提示强调仅存当前浏览器。
- 结果图悬停 Prompt 使用图片内部底部覆盖层，避免被卡片 overflow 裁剪。
- 已实现请求取消、多图容错与失败重试；Prompt 模板/快捷键；轮次分组、选图对比、收藏、批量下载；可搜索、导入导出的本机历史；以及 localStorage 偏好设置与完成通知。
- GPT-Image-2 无参考图时使用 `/v1/images/generations`；存在引用图时使用用户已验证的 `/v1/images/edits`，以 multipart `image` 字段发送第一张参考图。
- 桌面端固定三栏高度，左侧和配置列不随结果增长滚动，右侧轮次结果区独立滚动；会话级历史操作仅在选中记录后可用。
- 引用生成轮次保存引用图快照与来源信息，并以“引用来源 → Prompt/参数 → 生成结果”链路展示；来源图和任意结果均可再次引用。
- Prompt 初始高度为 78px，随内容自动扩展至 220px、超出后内部滚动；灵感模板保留内置模板，并支持当前浏览器本地新增、编辑和删除自定义模板。
