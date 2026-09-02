---
name: close-step
description: Close 阶段：Step N 代码验收通过后，以 plan「文档待更新」与 Execute commit 正文为输入，定点更新域文件 / 决议台账 / 路线图，写实录并建 PR。
when_to_use: 用户输入 "close step N"（可附 Execute 之外手动变更的说明）或 /close-step N 时执行。
argument-hint: "N [Execute 之外的手动变更说明]"
arguments: [step]
---

你现在处于 **Step {N}** 的 Close 阶段。目标：用尽量少的阅读把实况写进文档。本阶段只更新文档，不写代码。

**参数**：N = `$step`（为空或不是数字则从触发语取）；`$ARGUMENTS` 去掉 N 后是用户在 Execute 之外手动做的变更说明（如手改配置、手修数据），需一并记录。
**续接**（resume / compact 后重新调用）：先看 `git status` 与 `git diff --stat` 判断哪些文档已改，跳过已完成的步骤，不重复 commit 或建 PR。

# 第零步：阶段标记

用 Bash 执行 `printf 'close' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`

# 第一步：收集输入（只读这三样）

1. plan 的「文档待更新」「接口契约」「DB 变更」三节：Grep 定位标题后 Read 该段，不通读 plan
2. Execute commit 正文：`git log main..HEAD --format='%h %s%n%b'`，其中「偏离 / 临场决策 / 遗留 / 验收」四段是实录的直接来源。plan 含分段时顺带核对 P1 至末段的 commit 齐全，缺段则 execute 尚未完成，停下询问
3. `git diff --stat main...HEAD`：动了哪些文件

不读整份 PIPELINE，不读 PROGRESS 正文，不通读 diff。

# 第二步：分诊

根据第一步列出本次要改的地方，每处一行：哪个域文件的契约索引 / 表索引要加行、要写哪些行为参考；决议台账要落哪几条；是否新增 ADR；`.claude/rules/` 是否新增约定；路线图哪些条目可能受影响。

三节都空、commit 正文的偏离与临场决策都是「无」的小 step：跳过第三、四步，直接做第五步起。

# 第三步：定点核对

只对分诊出的契约与表，Grep 定位实际代码读签名 / 字段（Read 带 offset 与 limit），以代码为准，不为核对而通读文件。

# 第四步：定点更新（全部用 Edit 插入或追加，不重写整节）

1. 域文件 `pipeline/<domain>.md`：契约索引 / 表索引各加一行（契约 + 用途 + 实现位置 + Step N）；行为参考只写代码读不出来的（行为表、edge case、集成改造点、实测结论、给后续 step 的承诺）。文件不存在则按 `pipeline/README.md` 的结构创建，并在 PIPELINE §4 域索引加一行
2. PIPELINE §3 决议台账：本 step 拍板的落为 `- [x] 结论 + 理由（Step {N} 决议）`；推翻旧决议用 ~~删除线~~ 保留原文并写明新结论与原因
3. ARCHITECTURE：仅当某个决策需固化为新 ADR（编号顺延，标注 Step {N} 落地）；新代码约定追加到对应的 `.claude/rules/<layer>.md`

# 第五步：路线图校验

对照本 step 的实况，逐条看 PIPELINE §2 中后续 step 的条目（目标一句话 + 范围要点 + 依赖）是否仍然成立：依赖是否变了、范围是否该增减、顺序是否该调、是否有 step 该新增或废弃。

- 有变化：按 §2 的规则改条目、写变更日志、决议台账记一条，已 plan 未 execute 的受影响 step 标「需重跑 plan」；涉及取舍的先用 AskUserQuestion 问用户
- 无变化：实录里写「无变化」

顺带看决议台账里标「预计 Step {N+1} 确定」的未决项：超过 2 条则在总结里建议下一步先 `/discuss-step`。

最后在本 step 条目末尾追加 `✅ 完成于 {日期}`。

# 第六步：写实录与索引

1. 创建 `STEPS/STEP_{NN}_close.md`：

```markdown
# Step {N} 实录：{标题} — {日期}

## 实际完成
2-4 句概括。附测试通过数、关键 commit hash、分支名。

## 与 plan 的偏离
- 偏离项：描述 + 原因（无则写「无」）

## 关键决策
Execute 阶段做的、plan 没写明确的决定 + 理由（来源：commit 正文）。

## Execute 之外的手动变更
（用户口头告知的，如有；无则省略本节）

## 遗留问题 / 对后续 step 的提示
- 问题：描述 + 哪个 step 需要处理（无则写「无」）

## 路线图校验
无变化，或：改了什么 + 为什么（详见 PIPELINE 变更日志）。

## 涉及的文件
- 新建：…
- 修改：…
```

2. `PROGRESS.md`「Step 索引」表头下方插入一行：`| {N} | {标题} | {日期} | {一句话结论} | [实录](STEPS/STEP_{NN}_close.md) |`。一句话结论 = 后续 step 最需要知道的一条事实。

历史存档（`STEP_{NN}_plan.md` / `_discuss.md`）保持原样，不修改。

# 第七步：收尾

1. commit：`Step {N} Close: <标题>`
2. 触及鉴权 / 数据访问 / 外部输入解析的 step，可先建议用户跑 `/security-review`
3. push 分支，提议创建 PR（标题 `Step {N}: <标题>`，正文直接用实录文件内容，开头加一段用户可感知的变化摘要），**经用户确认后**创建
4. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
5. 输出总结（产品语言）：这个 step 给用户带来了什么；路线图有无调整；下一步建议（是否先 discuss）；给用户 review 的点
6. 提示：PR merge 后可选在 main 打 tag `step-{NN}`

用户 review 通过后本 step 正式关闭；下一个 step 从 Discuss（可选）或 Plan 开始。
