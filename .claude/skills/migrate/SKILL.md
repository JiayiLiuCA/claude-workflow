---
name: migrate
description: 一次性迁移：把用旧版脚手架实例化的项目（PIPELINE 含原始需求 / schema 总览 / 契约索引，PROGRESS 存完整实录，ARCHITECTURE 含代码规范）搬到当前文档结构。只搬家不重写，不改代码。
when_to_use: 用户在已有项目里输入 "迁移"、"migrate" 或 /migrate 时执行；前提是 .claude/ 与 CLAUDE.md 已替换为新版。
---

你现在处于迁移通道。目标：把旧结构的 planning 文档搬到新结构，内容只搬不改写，全程不改代码。本通道不设阶段标记（要动 `.gitignore` 等非文档文件），只在 step 间隙运行。

# 第零步：前置检查

1. `.claude/skills/close-step/SKILL.md` 是新版（第一步写着「只读这三样」）
2. `docs/planning/PIPELINE.md` 是旧结构（含「Schema 总览」或「已实现契约索引」节）；不是则说明已迁移，停下
3. 没有进行中的 step：`git branch --show-current` 为 main 且工作树干净；否则停下让用户先 close 或 stash

# 第一步：通读旧文档（唯一一次通读）

`PIPELINE.md`、`PROGRESS.md`（及 `PROGRESS_ARCHIVE.md`，如有）、`ARCHITECTURE.md`、`pipeline/*.md`。列出：契约索引每行归哪个域、schema 每张表归哪个域、PROGRESS 有几条记录、ARCHITECTURE 的代码规范按什么层拆。域归属拿不准的先问用户。

# 第二步：PIPELINE 重排

- 旧 §1 原始需求 → 新建 `REQUIREMENTS.md`，原文照搬，按功能模块分节
- 旧 §2 核心概念 → 新 §1
- 旧 §3 step 拆分 → 新 §2「Step 列表」；其上加「变更日志」子节，旧节顶部的顺序调整记录搬进去（没有则写 `_暂无。_`）；已有的 ✅ 保留
- 旧 §4 schema 总览 → 每张表变成一行进对应域文件的「表索引」（表 + 用途 + model / migration 位置 + step）；字段表格丢弃，以代码为准
- 旧 §5 契约索引 → 每行进对应域文件的「契约索引」；没有对应域文件的新建
- 旧 §6 决议台账 → 新 §3
- 旧 §7 域索引 → 新 §4，新建的域文件补一行
- 顶部说明与 §2 的规则说明换成新骨架（见模板 `docs/planning/PIPELINE.md`）

# 第三步：域文件

每个 `pipeline/<domain>.md` 顶部插入「契约索引」「表索引」两张表（结构见新版 `pipeline/README.md`），原有内容整体放到「行为参考」节下，不改写。

# 第四步：PROGRESS 拆实录

- 每条 step 记录 → `STEPS/STEP_NN_close.md`，小节沿用新实录模板（实际完成 / 与 plan 的偏离 / 关键决策 / 遗留问题 / 涉及的文件），「路线图校验」写「迁移前无此项」；内容原样搬，不补写
- `PROGRESS.md` 改为新骨架：杂项节保留，「Step 索引」表每 step 一行，一句话结论从该记录的「实际完成」提炼
- `PROGRESS_ARCHIVE.md` 同样拆完后删除

# 第五步：ARCHITECTURE 与 rules

代码规范、前端设计规范两节 → `.claude/rules/<layer>.md`（每个文件 frontmatter 必须带 `paths`），原节替换为新骨架的指向说明；其余节不动。

# 第六步：补齐模板文件

`.claude/rules/planning-docs.md`、`docs/planning/STEPS/README.md`、`docs/planning/pipeline/README.md` 换成新版（随 `.claude/` 复制已带的跳过）；`.gitignore` 补 `.claude/workflow-phase*` 与 `.claude/worktrees/`。

# 第七步：校验

- 新 PIPELINE 里没有「原始需求」「Schema 总览」「契约索引」节
- 旧契约索引的每一行都能在某个域文件里找到；旧 schema 的每张表都在某个表索引里
- PROGRESS 索引行数 = `STEPS/*_close.md` 文件数
- 每个 `.claude/rules/*.md` 都有 `paths`
- grep 全仓库没有 `PROGRESS_ARCHIVE`、`§5`、`§6`、`§7` 的残留引用

# 第八步：收尾

commit：`Migrate: 迁移到新版 workflow 文档结构`，在 main（受保护则分支 + PR）。汇报（产品语言）：搬了多少契约、多少表、多少条实录；哪些域归属是你判断的、需要用户确认；之后正常从下一个 step 的 `/plan-step` 或 `/discuss-step` 开始。
