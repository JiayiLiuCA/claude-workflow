---
name: roadmap
description: 路线图变更快速通道：新需求、砍功能、合并 / 拆分 step、调整顺序。只改 PIPELINE 的路线图与决议台账，不写代码，不改历史存档。
when_to_use: 用户输入 "roadmap <变更描述>"、"调整路线图" 或 /roadmap <描述> 时执行；Close 校验与 Plan 对齐闸门改路线图时也遵守本 skill 的规则。
argument-hint: "<变更描述>"
---

你现在处于 Roadmap 变更通道。变更描述：`$ARGUMENTS`（为空则从对话取）。目标：把路线图改到与最新认知一致，并留下可追溯的记录。
**续接**（resume / compact 后重新调用）：先看 `git diff` 里 PIPELINE 已改了什么，跳过已完成的步骤，不重复 commit。

# 第零步：阶段标记

用 Bash 执行 `printf 'roadmap' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`（此后 hook 只允许写文档）

# 第一步：读取

1. `PIPELINE.md` §2 路线图（变更日志 + Step 列表）与 §3 决议台账
2. `PROGRESS.md` 索引：哪些 step 已完成；`git branch --show-current` 看进行中的是哪个
3. 受影响的 step 若已有 plan 文件，读其「目标」「范围内」两节

# 第二步：提出变更方案

按 CLAUDE.md「沟通风格」列出：改哪些 step 的目标 / 范围 / 顺序，新增或废弃哪些，对交付节奏的影响，哪些已有 plan 会失效。涉及取舍的用 AskUserQuestion 交用户拍板。

# 第三步：落笔

- 变更日志最新在上加一行：日期 + 改了什么 + 为什么 + 来源 roadmap
- 已有 step 编号不变；新增 step 编号顺延；废弃的用 ~~删除线~~ 保留并注明原因
- 决议台账记一条
- 已 plan 未 execute 的受影响 step，在条目上标「需重跑 plan」
- 历史 plan、实录、`REQUIREMENTS.md` 不改；新需求的原文补进决议台账那一条里

# 第四步：收尾

1. commit：`Roadmap: <描述>`。当前在 step 分支且变更只涉及该 step 时提交到该分支；否则在 main（main 受保护则 `docs/<slug>` 分支 + PR）
2. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
3. 输出摘要（产品语言）：改了什么、影响哪些 step、哪些 plan 需要重跑、建议的下一步
