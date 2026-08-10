---
name: plan-step
description: Plan 阶段：为 Step N 生成 implementation plan（docs/planning/STEPS/STEP_NN_plan.md），本阶段不写代码。用户输入 "plan step N" 时执行。
---

你现在处于 **Step {N}** 的 Planning 阶段。N 取自参数的第一个 token；其余文本作为本 step 的特殊关注点。本阶段不写任何代码，唯一产物是 step plan 文档。

# 第零步：阶段标记与分支

1. 用 Bash 执行 `printf 'plan' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`（此后 hook 只允许写 `docs/planning/`）
2. 若 `feat/step-{NN}-<slug>` 分支不存在：`git fetch origin` 后从 `origin/main` 创建（无 origin 的纯本地 repo 从本地 main 建）；已存在（如 discuss 阶段建过）则切换过去
3. 把本阶段五个步骤（读取复述 / 冲突检查 / 生成 plan / 输出总结 / review 收尾）建成任务清单（TaskCreate），推进时同步状态

# 第一步：读取文档并复述

按以下顺序读取，然后用中文简短复述：

1. `ARCHITECTURE.md`：与本 step 相关的架构决策（ADR）与代码规范
2. `PIPELINE.md`：本 step 在 step 拆分中的描述；契约索引中相关的已有 API / 组件 / 表；决议台账中的相关决议
3. `pipeline/` 中与本 step 相关的域文件：行为参考、edge case、之前 step 留下的承诺
4. `STEPS/STEP_{NN}_discuss.md`（如存在）：复述全部决议，plan 必须遵守
5. `PROGRESS.md` 最近 2-3 条：实况、偏离点、遗留问题，特别关注与本 step 相关的部分
6. 如涉及前端：design reference 对应文件，简述视觉与交互要点
7. 实际代码结构（用 Glob / Grep / Read）：相关的 model / migration / 路由 / 组件 / service

# 第二步：冲突检查

对比「文档记录的接口 / schema」与「实际代码」：一致则在复述中确认；不一致**以实际代码为准**，并在 plan 末尾「文档待更新」章节记录修正项。不要猜测 schema，实际代码是终极 ground truth。

# 第三步：生成 Step Plan

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

末段的退出验收 = 全 plan「验收标准」，不必重抄，写「同验收标准」即可。

## 假设与待确认
plan 做的假设（如「某 package 假设提供 X 函数」），用户 review 重点。

## 不要做的事
明确告诉 Execute 阶段哪些不要顺手做，越具体越好：不要实现某后续 step 的功能 / 不要动某表 / 不要重构某模块 / 不要修某个已知的 pre-existing 问题。

## 文档待更新（Close 阶段处理）
本 step 完成后 PIPELINE / 域文件 / PROGRESS / ARCHITECTURE 需更新的内容草稿；第二步发现的文档偏差修正项也记在这里。

## 开放问题
需要用户 review 时回答的问题。

**执行分段判定**（每个 plan 必做，结论写进「输出总结」）：

估算 Execute 阶段能否在**一个 session 的 context** 内舒适完成全部工作量。按高推理强度（high / xhigh）假设估算——thinking、工具输出、测试与调试轮次都占 context，要留足余量。计入的开销：需读取的文档与代码量、预计新增 / 修改的代码行数与文件数、测试与调试轮次、review 修复。

- **装得下 → 不分段**：分段有交接成本（每段重读文档与代码），不为分而分。plan 不写「执行分段」节即代表单段执行。
- **装不下 → 分段**，原则是**质量优先**：宁可多分一段，不让任何一段在 context 将尽时赶工收尾。分段规则：
  - 沿依赖顺序切（如 P1 = migration + model + service，P2 = API + 前端），段间文件集尽量不相交
  - 每段结束必须是**可验证的完整状态**：编译 / 类型检查通过、该段测试绿、不留半成品接口——下一段是全新 session，只能从 git commit 与 plan 文件接手
  - 常见 2-3 段；超过 4 段说明 step 本身过大，优先拆 step
- 经验信号（满足其一即认真考虑分段）：预计新增 / 修改超过 ~1000 行或 15+ 文件；跨多个都需大量读现有代码的独立子系统；大规模机械改造与新逻辑混合
- **分段 ≠ 拆 step**：分段解决「目标单一但工作量大」；plan 本身目标发散、篇幅明显超标，仍应拆成多个 step

**Plan 写作纪律**：

- 描述行为与契约，**不写实现代码**（函数签名、伪代码、目录树除外）
- 目标篇幅 150-350 行。明显超出说明 step 过大，在总结中提出拆分建议

# 第四步：输出总结

1. 本 step 核心目标（1 句）
2. 关键决策（2-3 句）
3. 主要风险或不确定处
4. 执行分段判定结论：单段，或分几段、每段边界与理由
5. 开放问题清单（引用 plan 中的「开放问题」章节）

# 第五步：review 与收尾

等用户 review。**所有 review 结论（含对话中的口头调整）必须回写进 plan 文件**——Execute 阶段只认 plan 文件，不接受文件外的补充。用户确认后：

1. commit：`Step {N} Plan: <标题>`（execute 中途大偏离回到 plan 修订时，同样以 `Step {N} Plan: <修订说明>` 提交）
2. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
3. 提示用户下一步：单段 plan 提示 `execute step {N}`（大 step 建议新会话，小 step 可同会话继续；见 CLAUDE.md「Session 策略」）；分段 plan 提示 `execute step {N} P1`，并说明每段完成后**新开 session** 跑下一段
