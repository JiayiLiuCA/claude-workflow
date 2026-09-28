---
name: roadmap
description: 路线图变更快速通道：新需求、砍功能、合并 / 拆分 step、调整顺序。只改 OVERVIEW 的路线图与待决，不写代码，不改历史 step 文件。
when_to_use: 用户输入 "roadmap <变更描述>"、"调整路线图" 或 /roadmap <描述> 时执行。
argument-hint: "<变更描述>"
---

你现在处于 Roadmap 变更通道。变更描述：`$ARGUMENTS`（为空则从对话取）。目标：把路线图改到与最新认知一致，原因留在 commit 正文里。
**续接**（resume / compact 后或新会话接着做时重新调用）：先看 `git diff` 里 OVERVIEW 已改了什么，跳过已完成的步骤，不重复 commit。

# 第零步：阶段标记与分支

1. 用 Bash 执行 `printf 'roadmap' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`（此后 hook 只允许写文档）
2. 选分支：`git branch --show-current` 看进行中的是哪个 step。当前在 step 分支、且变更只涉及该 step，就留在该分支。否则在 main 上改：当前分支有未提交工作先停下问用户；`git fetch origin` 后切到 main，`git merge --ff-only origin/main`，快进失败停下问用户。main 受保护时改为从 `origin/main` 建 `docs/<slug>` 分支。无 origin 跳过同步

# 第一步：读取

1. OVERVIEW 的「路线图」「待决」与「已完成」表（已完成的 step 只在表里，用来确定最大编号）
2. 受影响的 step 若已有 step 文件，读其 Plan 的「目标」「范围内」

# 第二步：提出变更方案

按 CLAUDE.md「沟通风格」列出：改哪些 step 的目标 / 范围 / 顺序，新增或删除哪些，对交付节奏的影响，哪些已有 plan 会失效。涉及取舍的用 AskUserQuestion 交用户拍板。

# 第三步：落笔

- 已有 step 编号不变；新增 step 编号接在最大编号之后；废弃的 step 直接删除条目，编号不复用
- 已 plan 未 execute 的受影响 step，状态改为「需重跑 plan」
- 变更带出的未决问题写进「待决」
- 历史 step 文件不改

# 第四步：收尾

1. commit：`Roadmap: <描述>`，正文写改了什么、为什么，新需求的原话附在正文里
2. 在 main 上的直接 push，下一个 step 从 `origin/main` 建分支才拿得到；`docs/<slug>` 分支 push 后提议建 PR，经用户确认后创建；step 分支上的不单独 push，随该 step 的 PR 合入
3. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
4. 第零步从 step 分支切过来的，切回该分支
5. 输出摘要（产品语言）：改了什么、影响哪些 step、哪些 plan 需要重跑、建议的下一步
