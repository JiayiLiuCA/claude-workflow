# {项目名}

<!-- bootstrap 阶段：替换 {项目名} 并填充「关于本项目」；工作流章节保持不动 -->

## 语言

与用户交流以及撰写 plan、文档时使用中文（专业 term 如 plan mode、frontend、component 等保留英文）。

## 关于本项目

<!-- bootstrap：一句话项目定位；详见 docs/planning/ARCHITECTURE.md -->

## 文档结构

所有 planning 文档位于 `docs/planning/`：

- `ARCHITECTURE.md` — 架构决策（ADR）、技术栈、代码规范（稳定文档）
- `PIPELINE.md` — 核心概念、step 拆分、schema 总览、契约索引、决议台账（**薄核心**，随 step 增量更新）
- `pipeline/<domain>.md` — 各子系统的行为详细参考（按域拆分，Close 阶段维护）
- `STEPS/STEP_NN_plan.md` / `STEP_NN_discuss.md` — 每个 step 的 plan 与预备决议（历史存档，close 后不改）
- `PROGRESS.md` — 已完成 step 的实录（最新置顶）；顶部含「杂项（hotfix log）」节；每满 10 条 step 记录归档到 `PROGRESS_ARCHIVE.md`

任何会话开始时，先读 `ARCHITECTURE.md` 全文 + `PIPELINE.md` 建立全局理解；`pipeline/` 域文件与 `PROGRESS.md` 按当前任务按需读取（各阶段 skill 会具体指示）。

### 文档收录原则

**代码能回答的问题不进文档。** 文档只存代码回答不了的：决策与理由、被推翻的假设、edge case 行为、benchmark 结论、跨 step 的承诺。API / 组件契约在 PIPELINE.md 只留一行索引，签名细节以实际代码为准。

## 工作流程

采用 **Discuss（可选）→ Plan → Execute → Close** 循环（session 切分见下方「Session 策略」）；小改动走 hotfix 快速通道。各阶段的权威指令在 `.claude/skills/` 下的同名 skill 中。

| 用户输入（触发语，不区分大小写） | 执行的 skill |
|---|---|
| `bootstrap` | bootstrap — 项目启动，实例化文档体系 + 生成 Step 0 plan（仅第一次） |
| `discuss step N` | discuss-step — 可选：逐项拍板本 step 关键决策，产出决议清单 |
| `plan step N` | plan-step — 生成 `STEPS/STEP_NN_plan.md` |
| `execute step N` | execute-step — 严格按 plan 写代码 |
| `close step N` | close-step — 实况写入文档，收尾 git 并建 PR |
| `hotfix <描述>` | hotfix — 小改动快速通道（typo / 一行修复 / 依赖 bump），不走四阶段；判据与记录义务见 skill |

触发语后可追加补充说明（如 `plan step 3，特别注意离线场景`），作为该阶段的「特殊关注点」传入。收到触发语后必须以对应 skill 的指示为准，严格按其步骤顺序执行；不要跳过步骤，不要基于触发语直接开工。

各阶段 skill 会把自己的步骤 / 执行顺序建成任务清单（TaskCreate / TaskUpdate，即 terminal 的 todo tracker）作为实时进度显示；执行中新增的工作先入清单再动手。

### Session 策略

- **小 step**（改动集中、三阶段能舒适装进一个 context）：可 plan → execute → close 同一会话连跑。两条纪律不因同会话豁免：**review 结论必须回写 plan 文件**（不允许只存在于对话记忆）；**close 必须以 git diff 与实际代码为准**写文档，不凭对话记忆。
- **大 step**（多文件改动 / 长 execute / plan review 有时间间隔）：阶段之间开新会话（或 `/clear`）——plan 阶段的探索噪音不带进 execute，close 用新眼睛对账。
- 底线：**execute 的权威输入是 plan 文件，不是 plan 对话**。session 怎么切都不能破坏这条。

### 阶段纪律（hooks 强制）

各阶段 skill 会把阶段名写入 `.claude/workflow-phase`，PreToolUse hook（`.claude/hooks/phase-guard.js`）据此拦截越界写入：

- Discuss / Plan / Close 阶段：只允许写 `docs/planning/`
- Execute 阶段：禁止写 `docs/planning/`

阶段结束时 skill 会清除标记；session 异常中断残留的标记会在下次**新会话启动时**由 SessionStart hook 自动清除（resume 续会话不清除，阶段仍有效）。若仍遇到 phase-guard 误拦，手动执行 `rm .claude/workflow-phase`。

hook 只拦截 Write/Edit 类工具：**用 Bash（`sed -i`、重定向等）绕过阶段写入限制属于违规**，任何阶段都不允许。

### Git 约定

- 每个 step 一个分支：`feat/step-NN-<slug>`（discuss 或 plan 开始时 `git fetch origin` 后从 `origin/main` 创建）
- 阶段 commit 格式：`Step N Discuss: <标题>` / `Step N Plan: <标题>` / `Step N Execute: <标题>`（可拆 P1/P2）/ `Step N Close: <标题>`
- Close 完成后创建 PR 合回 main；merge 后可选打 tag `step-NN`
- 小改动：`Hotfix: <描述>`，默认直接在 main（main 受保护则 `fix/<slug>` 分支 + PR）

### 文档修改原则

直接编辑已有文件，不新建版本后缀文件（如 `STEP_01_plan_v2.md`）。**Plan review 的结论（含对话中的口头调整）必须回写 plan 文件本身**——Execute 阶段只认 plan 文件。
