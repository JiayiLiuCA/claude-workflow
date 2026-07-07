---
name: close-step
description: Close 阶段：Step N 代码验收通过后，把实况写入文档（PIPELINE 索引 / 域文件 / PROGRESS / ARCHITECTURE），收尾 git 并建 PR。用户输入 "close step N" 时执行。
---

你现在处于 **Step {N}** 的 Close 阶段。N 取自参数的第一个 token；其余文本是用户在 Execute 之外手动做的变更说明（如手改配置、手修数据），需一并记录。代码已实现并通过验证，现在把实况写入文档，为后续 step 建立正确的记忆。本阶段只更新文档，不写代码。

# 第零步：阶段标记

用 Bash 执行 `printf 'close' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`（此后 hook 只允许写 `docs/planning/`）

# 第一步：读取并对照

1. `STEPS/STEP_{NN}_plan.md`（原计划）与 `STEP_{NN}_discuss.md`（如有）
2. `PIPELINE.md`：契约索引、schema 总览、决议台账
3. 相关域文件 `pipeline/<domain>.md`
4. `PROGRESS.md` 最近记录（对齐格式）
5. `git log --stat` 与 `git diff main...HEAD`：本 step 实际引入的变更
6. 读实际代码确认：API 实际签名、表实际 schema、组件实际 props

# 第二步：差异分析

列出（如有）：

- **Plan 说要做 vs 实际做了**：字段 / 路径 / 契约的调整，多做或少做的内容
- **文档说有 vs 实际有**：Planning 阶段发现的不一致，确认已修正
- **新发现**：执行中发现的问题、约束、教训；对未来 step 的提示

# 第三步：更新 PIPELINE.md（薄核心）

**原则：以实际代码为准，不以 plan 为准；契约只留索引，细节在代码里。**

1. **契约索引（§5）**：每个新增 API / 组件 / 模块**只加一行**（契约 + 用途 + 实现位置 + Step N）。不抄 request/response schema——那是代码的事
2. **Schema 总览（§4）**：新表 / 改字段同步到最新状态，标注「(Step {N} 新增/修改)」
3. **Step 拆分（§3）**：本 step 描述末尾追加 `✅ 完成于 {日期}`
4. **决议台账（§6）**：本 step 拍板的决议落为 `- [x] 结论 + 理由（Step {N} 决议）`；推翻旧决议用 ~~删除线~~ 保留原文并写明新结论与原因

# 第四步：更新域详细参考

在 `docs/planning/pipeline/<domain>.md` 写入本 step 产生的、**代码读不出来的**知识（文件不存在则创建，并在 PIPELINE.md §7 域索引加一行）：

- 行为表、edge case 处理约定
- 外部依赖的集成 / 改造点清单（上游升级时按此 merge）
- 实测结论（性能数字、benchmark、踩坑记录）
- 给后续 step 的承诺与提示

判断标准：**下一个 session 读代码就能知道的，不写。**

# 第五步：更新 PROGRESS.md

在「杂项（hotfix log）」节之后、第一条 step 记录之前插入新记录，格式：

```markdown
## Step {N}: {简短标题} — {日期}

### 实际完成
2-4 句概括。附测试通过数、关键 commit hash、分支名。

### 与 plan 的偏离
- 偏离项：描述 + 原因（无则写「无」）

### 关键决策
Execute 阶段做的、plan 没写明确的决定 + 理由。

### Execute 之外的手动变更
（用户口头告知的，如有；无则省略本节）

### 遗留问题 / 对后续 step 的提示
- 问题：描述 + 哪个 step 需要处理（无则写「无」）

### 涉及的文件
- 新建：…
- 修改：…

---
```

占位文字「_尚未开始任何 step._」如还在则删除。

**归档规则**：PROGRESS.md 超过 10 条 step 记录时，把最旧的记录移入 `PROGRESS_ARCHIVE.md`（不存在则创建，格式一致，同样最新置顶）。

# 第六步：判断是否更新 ARCHITECTURE.md

仅在以下情况更新：本 step 引入了新代码规范或约定；修正了既有错误或模糊处；某个决策需固化为新 ADR（编号顺延，标注 Step {N} 落地）。不需要则明确说「本 step 无需更新 ARCHITECTURE.md」。

**历史存档（`STEP_{NN}_plan.md` / `_discuss.md`）保持原样，不修改。**

# 第七步：收尾

1. commit：`Step {N} Close: <标题>`
2. push 分支，提议创建 PR（标题 `Step {N}: <标题>`，正文含 step 摘要与验收结果），**经用户确认后**创建（用 `gh pr create` 或当前环境可用的平台工具）
3. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
4. 输出总结：
   - 本次修改的文档清单（文件 + 改动位置）
   - **最关键的一条记录**（后续 step 的 Claude 最需要知道的一条事实）
   - 给用户 review 的建议点
5. 提示：PR merge 后可选在 main 打 tag `step-{NN}`

用户 review 通过后本 step 正式关闭；下一个 step 从 Discuss（可选）或 Plan 开始。
