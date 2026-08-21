# 应用模块清单

- id: image-generator-workbench
  owner: guanyalong
  source: TokenVerse 图片生成 API + 浏览器本地存储
  files: web/app/src/pages/HomePage1.vue
  description: API 配置、浏览器密钥与偏好设置、自适应 Prompt 编辑器与本地可维护灵感模板、参考图上传、可取消生成、多图容错、引用来源→Prompt→结果的创作链路、GPT-5.6 多模态分析气泡、轮次对比与批量操作，以及可搜索/收藏/导入导出的本地历史。

- id: case-inspiration-library
  owner: guanyalong
  source: awesome-gpt-image-2 公开案例索引（MIT）+ 浏览器 localStorage 收藏
  files: web/app/src/pages/CaseLibraryPage.vue, web/app/src/data/case-library.json
  description: 523 个公开案例的前端静态索引；支持全文搜索、分类/风格/场景筛选、本地收藏、完整 Prompt 查看复制和一键带入工作台。保留来源项目、原案例及作者链接；预览图片从上游公开 GitHub 地址加载，不复制到本站仓库。

- id: image-generation-api
  owner: guanyalong
  source: TokenVerse 图片生成 API
  files: web/app/src/services/api.ts
  description: Gemini generateContent、OpenAI Images generations 与单参考图 edits 协议的请求构建、响应图片 Base64 解析。

- id: local-generation-history
  owner: guanyalong
  source: 浏览器 IndexedDB
  files: web/app/src/services/history.ts
  description: 本机持久保存生成会话、提示词、参数和图片；支持读取、保存、删除与清空，数据不上传服务端。
