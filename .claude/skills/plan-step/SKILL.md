---
name: plan-step
description: Plan 阶段：为 Step N 生成 implementation plan（docs/planning/STEPS/STEP_NN_plan.md），本阶段不写代码。含路线图对齐闸门。
when_to_use: 用户输入 "plan step N"（可附特殊关注点）或 /plan-step N 时执行。
argument-hint: "N [特殊关注点]"
arguments: [step]
---

你现在处于 **Step {N}** 的 Planning 阶段。本阶段不写任何代码，唯一产物是 step plan 文档。

**参数**：N = `$step`（为空或不是数字则从触发语取）；`$ARGUMENTS` 去掉 N 后为本 step 的特殊关注点。
**续接**（resume / compact 后重新调用）：先看 `git status`、`git log --oneline -5` 与已有的 plan 文件判断做到哪一步，跳过已完成的，不重复建分支或 commit。

# 第零步：阶段标记与分支

1. 用 Bash 执行 `printf 'plan' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
2. 若 `feat/step-{NN}-<slug>` 分支不存在：`git fetch origin` 后从 `origin/main` 创建（无 origin 则从本地 main）；已存在（如 discuss 建过）则切换过去

# 第一步：读取文档并复述

按需定位读取，不通读；读完用中文简短复述：

1. `ARCHITECTURE.md`：与本 step 相关的 ADR 与约束（代码规范由 `.claude/rules/` 自动加载，不用读）
2. `REQUIREMENTS.md` 中与本 step 相关的章节
3. `PIPELINE.md`：路线图中本 step 的条目（目标一句话 + 范围要点 + 依赖）、决议台账中的相关决议、域索引
4. 相关域文件 `pipeline/<domain>.md`：契约索引、表索引中相关的已有 API / 组件 / 表；行为参考、edge case、之前 step 留下的承诺
5. `STEPS/STEP_{NN}_discuss.md`（如存在）：复述全部决议，plan 必须遵守
6. `PROGRESS.md` 索引 + 最近 1-2 个 `STEP_NN_close.md`：实况、偏离、遗留，特别关注与本 step 相关的
7. 如涉及前端：design reference 对应文件，简述视觉与交互要点
8. 实际代码结构（Glob / Grep / Read）：相关的 model / migration / 路由 / 组件 / service

# 第二步：冲突检查

对比域文件索引记录的接口 / 表与实际代码：一致则在复述中确认；不一致**以实际代码为准**，并在 plan 末尾「文档待更新」章节记录修正项。不要猜测 schema，实际代码是终极 ground truth。

# 第三步：路线图对齐

plan 的「目标」必须是路线图中本 step 条目的细化，不得扩展。对照后分三种：

- **一致**：进入第四步。
- **范围小于条目**（有意推迟部分内容）：推迟部分写进「范围外」并注明去向（哪个 step 或待定），在总结里说明。
- **范围超出条目或目标变了**：超出部分不写进「范围内」，在总结里列为「路线图变更」交用户拍板；用户同意后先按 PIPELINE §2 的规则改路线图（变更日志 + 条目 + 决议台账），再定稿 plan；不同意则进「范围外」。

# 第四步：生成 Step Plan

创建 `docs/planning/STEPS/STEP_{NN}_plan.md`（N 补零两位），章节如下：

## 目标
用户视角的可观察行为。「系统能做 X」而不是「实现了 Y 类」。

## 范围内
清单，颗粒度到：新增/修改的文件（大致）、API endpoint、DB 表/字段、页面/组件。

## 范围外
清单。特别写清容易越界、容易被顺手做掉的部分。

## 分层改动（按项目形态设节：前端改动 / 后端改动 / CLI 改动 / 外部依赖集成…）
每层列出：新增/修改的模块、复用的已有部分、状态管理或数据流变化。涉及外部 package / repo 集成时写明：来源、trim 范围（删掉 demo / 不相关 module）、预计要改的地方。

## 接口契约
每个新增/修改的 API：method + path、request/response 字段清单与类型、错误情况。**描述契约即可，不贴实现代码。**

## DB 变更
每个新增/修改的表：字段、类型、约束、索引、外键关系、migration 顺序（如依赖复杂）。

## 测试计划
新增哪些自动化用例（正常路径 + 至少 1-2 条异常路径）、放在哪、怎么跑。

## 验收标准
可手动 verify 的 checklist（`- [ ]`），每条能明确判断「做到 / 没做到」。覆盖：可见行为、API 可用性、DB 变化、异常场景（至少 1-2 条）。

## 执行分段（仅在判定需分段时写本节，判定方法见下方「执行分段判定」）
每段一小节：
- **P{k}：<段标题>** — 范围（本段负责的文件 / 模块 / 层）；前置（依赖上一段交付的什么，P1 写「无」）；退出验收（`- [ ]` checklist：编译 / 测试 / 可运行行为，能明确判断本段完成）

末段的退出验收 = 全 plan「验收标准」，写「同验收标准」即可。

## 假设与待确认
plan 做的假设（如「某 package 假设提供 X 函数」），用户 review 重点。

## 不要做的事
明确告诉 Execute 阶段哪些不要顺手做，越具体越好：不要实现某后续 step 的功能 / 不要动某表 / 不要重构某模块 / 不要修某个已知的 pre-existing 问题。

## 文档待更新（Close 阶段的工作清单）
本 step 完成后要更新的文档，具体到章节：哪个域文件的契约索引 / 表索引要加行、要写哪些行为参考；决议台账要落哪几条；是否需要新 ADR；`.claude/rules/` 是否新增约定；第二步发现的文档偏差修正项。Close 阶段以这一节为清单，不再通读文档。

## 开放问题
需要用户 review 时回答的问题。

**执行分段判定**（每个 plan 必做，结论写进「输出总结」）：

估算 Execute 能否在**一个 session 的 context** 内舒适完成。当前 effort：`${CLAUDE_EFFORT}`；effort 越高 thinking 占 context 越多，工具输出、测试与调试轮次同样计入，要留余量。计入：需读的文档与代码量、预计新增 / 修改的行数与文件数、测试调试轮次、review 修复。

- **装得下 → 不分段**：分段有交接成本，不为分而分。不写「执行分段」节即单段执行。
- **装不下 → 分段**，质量优先：宁可多分一段，不让任何一段在 context 将尽时赶工。沿依赖顺序切（如 P1 = migration + model + service，P2 = API + 前端），段间文件集尽量不相交；每段结束必须是可验证的完整状态（编译 / 类型检查通过、该段测试绿、不留半成品接口），下一段是全新 session，只能从 git commit 与 plan 文件接手；常见 2-3 段，超过 4 段说明 step 过大，优先拆 step。
- 经验信号（满足其一即认真考虑分段）：预计新增 / 修改超过 ~1000 行或 15+ 文件；跨多个都需大量读现有代码的子系统；大规模机械改造与新逻辑混合。阈值按 200K context 校准，1M 窗口可放宽约 3 倍但仍质量优先；没有 auto compact 兜底的环境要更保守。
- **分段 ≠ 拆 step**：分段解决「目标单一但工作量大」；目标发散、篇幅超标的 plan 仍应拆 step，走路线图变更。

**Plan 写作纪律**：描述行为与契约，**不写实现代码**（函数签名、伪代码、目录树除外）；目标篇幅 150-350 行，明显超出说明 step 过大，在总结中提出拆分建议。

# 第五步：输出总结

按 CLAUDE.md「沟通风格」写给产品负责人看：

1. 做完这个 step，用户能做什么（1-2 句）
2. 关键取舍：建议怎么选、对用户意味着什么（2-3 句）
3. 路线图变更（如有）：超出条目的部分、建议是否纳入、对后续 step 的影响，需要用户拍板
4. 主要风险或不确定处（产品语言）
5. 一次做完还是分几次做：分段判定结论，分段时一句话讲每段交付什么
6. 需要用户拍板的问题（引用 plan「开放问题」章节）

# 第六步：review 与收尾

等用户 review。**所有 review 结论（含口头调整）必须回写进 plan 文件**：Execute 只认 plan 文件。用户确认后：

1. 若拍板了路线图变更：先按 PIPELINE §2 规则改路线图，再定稿 plan
2. commit：`Step {N} Plan: <标题>`（execute 中途大偏离回到 plan 修订时同样以此格式提交）
3. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
4. 提示下一步：单段 → `/execute-step {N}`（大 step 建议新会话）；分段 → `/execute-step {N} P1`，每段完成后**新开 session** 跑下一段
