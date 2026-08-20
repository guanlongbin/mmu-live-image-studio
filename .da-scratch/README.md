# .da-scratch/ · website-builder skill 的本地草稿目录

> **本目录内容 gitignored**——skill 生成的所有 plan-execute 三件套、分析笔记、失败尝试都在这里,per-branch 隔离,绝对不 push 到远端。
> 只有本 `README.md` 通过 `.gitignore` 的 `!.da-scratch/README.md` 例外规则被 track,保证 template clone 到沙箱时目录结构存在。

## 目录结构

```
.da-scratch/
├── plans/{git-branch}/           ← plan-execute 三件套(per-branch)
│   ├── plan.md                   总体计划(一次写不改)
│   ├── todo.md                   可变 checklist([ ] → [X])
│   ├── progress.md               append-only 进度 ledger(抗 compaction)
│   └── spec.md                   A1 clarify 输出的 4 参数锁定
├── archive/{date}-{version}/     完成后归档
├── analysis/                     LLM 分析笔记(memory-check / ui-qa report 等)
├── retry-log.md                  重试日志
└── notes.md                      自由笔记
```

## 谁在写这里

- **A1 clarify-requirement** → `plans/{branch}/spec.md`
- **A5 generate-code** → `plans/{branch}/progress.md`(每完成一 task 追一行)
- **A6 ui-qa-gate** → `analysis/ui-qa-<timestamp>.md`
- **A0 load-memory** → `analysis/memory-check-<timestamp>.md`(异常时)
- **plan-execute wrapper** → `plans/{branch}/plan.md` + `todo.md`(UR-2 覆盖场景)
- **A10 register-session** → `archive/{date}-{siteId}-v{n}/`(发布后归档 plans/)

## 为什么必须 gitignored

内容包含:
- **用户 prompt 原话**(隐私)
- **中间失败尝试 / 借口 / rationalization 记录**(不该被外部看到的过程)
- **LLM 分析的 blob**(污染仓库)
- **每个 branch 独立**,进 git 会引起大量无意义 diff

见 `website-builder-v3/references/general-rules.md § UR-2` 的 plan-execute 三件套规范。
