---
name: migrate
description: 常备升级通道：把项目的 planning 文档结构从已应用的 workflow 版本逐级升到当前模板版本。只搬家不重写，不改代码。每个版本的搬家规则在 migrations/v{N}.md。
when_to_use: 用户在已有项目里输入 "迁移"、"升级 workflow"、"migrate" 或 /migrate 时执行；前提是 .claude/ 与 CLAUDE.md 已替换为新版。
---

**模板版本：2**（本行随模板发布更新；新增版本时同步新增 `migrations/v{N}.md`）

你现在处于 workflow 升级通道。目标：把项目的 planning 文档结构从已应用版本逐级升到模板版本，内容只搬不改写，全程不改代码。本通道不设阶段标记（要动 `.gitignore` 等非文档文件），只在 step 间隙运行。

# 第零步：确定版本与前置

1. 已应用版本：读 `docs/planning/WORKFLOW_VERSION`；文件不存在视为 `1`（最初的脚手架没有版本号）
2. 目标版本：上方「模板版本」
3. 相等 → 已是最新，停下说明；已应用 > 目标 → `.claude/` 还是旧的，停下提示先覆盖新版
4. 没有进行中的 step：`git branch --show-current` 为 main 且工作树干净；否则停下让用户先 close 或 stash

# 第一步：逐版本执行

从「已应用 + 1」到目标版本，每个版本 k：

1. 读 `${CLAUDE_SKILL_DIR}/migrations/v{k}.md`，按其步骤执行（第一版通读旧文档是允许的，那是唯一一次通读）
2. 按该文件的「校验」节自检
3. 把 `docs/planning/WORKFLOW_VERSION` 写成 `k`
4. commit：`Migrate: workflow v{k-1} → v{k}`（一版一 commit，中断后重跑本 skill 可从下一版继续）

域归属、内容取舍拿不准的先问用户，不猜。

# 第二步：收尾

在 main（受保护则分支 + PR）。汇报（产品语言）：从哪版升到哪版；搬了多少契约、表、实录；哪些归属是你判断的、需要用户确认；之后正常从下一个 step 的 `/plan-step` 或 `/discuss-step` 开始。
