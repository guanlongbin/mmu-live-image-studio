# Spec · mmu-live-image-studio

## 基础参数
- site_name: mmu-live-image-studio
- display_name: MMU Live Image Studio
- description: 面向公司员工的通用 AI 生图工具，支持文本生成、参考图编辑与多图融合。
- scene: tool-app
- theme: A
- data_source_type: CUSTOM_API
- templateId: null
- 发布范围: 公司内公开

## 业务需求
- 用户原话: 做一个网站，可以输入 API Key 和 URL，选择模型 ID，上传图片参考，生成图片；做一个比较通用的大家都可以用的工具。
- 核心功能:
  - 输入 API Key（仅浏览器当前会话内存使用，不持久化、不入库）
  - 自定义服务地址，支持办公网和 IDC 地址
  - 模型下拉选择，按模型自动选择调用协议
  - 输入生成提示词、尺寸与生成数量
  - 支持上传单张或多张参考图，用于图生图、图片编辑或多图融合
  - 统一展示生成结果，支持预览与下载
- 场景约束: 工具型应用采用“导航 → 内容区 → 操作面板”的效率优先布局，信息密度适中，强调清晰的表单状态和请求反馈。
- 视觉意图承诺:
  - Tone: 沿用场景默认
  - 记忆点: 左侧为紧凑配置面板，右侧为大面积的图片生成结果工作台。
  - 说明: 使用工具型应用的清爽浅色界面，避免装饰性渐变，突出生成操作和图片预览。

## 数据契约
- 数据源实例: TokenVerse 图片生成 API（用户自定义 base URL + 浏览器会话 API Key）
- 请求安全规则:
  - API Key 仅存在于浏览器运行时内存，不写入 localStorage、Cookie、站点数据库或日志。
  - 上传参考图仅转为当前请求所需的 Data URL/Base64，不在站点侧持久化。
  - API Key 通过 Authorization: Bearer {API_KEY} 请求头发送。
- 模型映射:
  - Nano Banana 2 Lite → gemini-3-1-flash-lite-image
  - Nano Banana 2 → gemini-3-1-flash-image
  - GPT-Image-2 → gpt-image-2
- 协议与字段映射:
  - Gemini 系列基础地址 → {baseUrl}/v1beta
  - Gemini 系列请求地址 → POST {baseUrl}/v1beta/models/{modelId}:generateContent
  - Gemini 文本提示词 → contents[0].parts[].text
  - Gemini 参考图 → contents[0].parts[].inlineData（mimeType + Base64）
  - Gemini 生成配置 → generationConfig.responseModalities=["IMAGE"]
  - Gemini 返回图片 → candidates[].content.parts[].inlineData.data
  - GPT-Image-2 基础地址 → {baseUrl}/v1
  - GPT-Image-2 请求地址 → POST {baseUrl}/v1/images/generations
  - GPT-Image-2 请求字段 → model, prompt, n, size
  - GPT-Image-2 返回图片 → data[].b64_json
  - 图片结果 → Base64 转 Blob/Data URL 后统一渲染、下载
- 默认服务地址:
  - 办公网: https://tokenverse.corp.kuaishou.com
  - IDC: http://tokenverse.internal
- 用户确认版本: v1 (2026-08-20 21:27:14 +08:00)

## 原型确认
- 明确度评级: 高
- 原型文件: 无（需求、模块和布局已明确，跳过原型）
- 布局要点: 左侧配置区（密钥、地址、模型、提示词、参考图、参数与生成按钮）；右侧结果工作台（空态、生成中、图片网格、单图预览与下载）。

## 用户最终确认
- 确认时间: 2026-08-20 21:27:14 +08:00
- 确认方式: 对话中明确确认，站点名指定为 mmu-live-image-studio。
