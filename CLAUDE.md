# {项目名}

<!-- bootstrap 阶段：替换 {项目名} 并填充「关于本项目」；工作流章节保持不动 -->

## 语言

与用户交流以及撰写 plan、文档时使用中文（专业 term 如 plan mode、frontend、component 等保留英文）。

## 沟通风格

把用户当产品负责人，不当工程师：用户只拿大方向，不看实现细节。

- 汇报（进展、总结、PR 描述）只讲三件事：实现了什么功能、用户现在能看到或做到什么、哪里和之前不一样。技术方案、文件清单、库名函数名默认不写，用户追问再说。
- 需要用户做选择时（AskUserQuestion 的选项、对话中的建议），每个选项讲它对用户意味着什么（多什么少什么、体验差在哪、代价是什么）；不给只有实现差异的选项。
- 风险、偏离、遗留问题也用产品语言：说「这次导出不含 PDF」，不说「PDF renderer 未接入」。
- 技术细节只在两种情况出现：需要用户拍板的决定（一句话讲清后果），或用户主动追问。

例：
- ✗ 新增 ExportService，接入 pdfkit，POST /api/export 返回 stream。
- ✓ 报表页现在可以把当前筛选结果导出成 PDF，导出中显示进度；这次不含 Excel。

**例外**：`docs/planning/` 下的文档与 commit 正文写给后续 session 的 Claude 读，保持技术精确。

## 关于本项目

<!-- bootstrap：一句话项目定位；详见 docs/planning/ARCHITECTURE.md -->

## 文档结构

所有 planning 文档位于 `docs/planning/`：

- `ARCHITECTURE.md` — 核心约束、技术栈、目录结构、ADR（稳定文档）
- `REQUIREMENTS.md` — 原始需求（只在 discuss / plan 按需读相关章节）
- `PIPELINE.md` — 核心概念、step 路线图、决议台账、域索引（**薄核心**，体量不随 step 增长）
- `pipeline/<domain>.md` — 各域的契约索引、表索引、行为参考（Close 阶段维护）
- `STEPS/STEP_NN_{discuss,plan,close}.md` — 每个 step 的决议、plan、实录（历史存档，close 后不改）
- `PROGRESS.md` — step 索引（一行一 step，指向实录）+ hotfix log
- `WORKFLOW_VERSION` — 已应用的 workflow 文档结构版本，`/migrate` 据此逐级升级

代码规范与前端设计规范在 `.claude/rules/<layer>.md`（path-scoped，触碰对应文件时自动加载，不用读）。

各阶段 skill 规定自己读什么，按需定位读取、不通读；hotfix 与普通会话不预读 planning 文档。写 `docs/planning/` 的收录与修改原则见 `.claude/rules/planning-docs.md`（触碰这些文件时自动加载）。

## 记忆分工

项目事实（决策与理由、契约、schema、step 实录、遗留问题）只进 `docs/planning/`：它进 git、团队可见、由 Close 阶段审计。auto memory 只存个人偏好与本机环境怪癖，不存 step 决策、契约、进度；两者冲突以 `docs/planning/` 为准。

## 工作流程

采用 **Discuss（可选）→ Plan → Execute → Close** 循环；小改动走 hotfix，路线图变化走 roadmap。各阶段的权威指令在 `.claude/skills/` 下的同名 skill 中。

| 触发（斜杠形式；自然语言 `plan step N` 等等价） | skill |
|---|---|
| `/bootstrap` | 项目启动，实例化文档体系 + 生成 rules 与 Step 0 plan（仅第一次） |
| `/discuss-step N` | 可选：逐项拍板本 step 关键决策，产出决议清单 |
| `/plan-step N` | 生成 `STEPS/STEP_NN_plan.md`，含路线图对齐闸门 |
| `/execute-step N [Pk]` | 严格按 plan 写代码；plan 定义了执行分段时按段执行，每段一个新 session |
| `/close-step N` | 以 plan「文档待更新」与 commit 正文为输入定点更新文档，路线图校验，写实录并建 PR |
| `/hotfix <描述>` | 小改动快速通道（typo / 一行修复 / 依赖 bump），判据见 skill |
| `/roadmap <变更描述>` | 路线图变更快速通道：新需求 / 砍功能 / 合并拆分 step / 调顺序，只改 PIPELINE 路线图与决议台账 |

触发语后可追加补充说明，作为该阶段的「特殊关注点」。收到触发语必须调用对应 skill 并按其步骤执行，不要基于触发语直接开工。

**任务清单**：只有 execute-step（执行顺序里程碑，Ctrl+T 展开）与 discuss-step（待决问题）使用任务清单，其他阶段不建；清单只反映完成项数，不代表剩余时间。若会话中没有 TaskCreate 等工具（`.claude/settings.json` 的 env 负责启用），改用文字列出，不要尝试调用。

### Session 策略

- **小 step**（三阶段能舒适装进一个 context）：可 plan → execute → close 同会话连跑。两条纪律不豁免：**review 结论必须回写 plan 文件**；**close 以 commit 正文与 git diff 为准**，不凭对话记忆。
- **大 step**：阶段之间开新会话（或 `/clear`），plan 的探索噪音不带进 execute。
- **超大 step**（execute 单个 session 装不下）：plan 阶段写「执行分段」章节拆成 P1/P2…，每段在**新 session** 执行，段间交接只靠 git commit 与 plan 文件；判据见 plan-step skill。
- resume 或 compact 之后 SessionStart hook 会播报当前阶段；按提示重新调用对应 skill（带原参数）再继续。
- 底线：**execute 的权威输入是 plan 文件，不是 plan 对话**。

### 阶段纪律（hooks 强制）

各阶段 skill 把阶段名写入 `.claude/workflow-phase`，hooks 据此限制。文档范围 = `docs/planning/` + `.claude/rules/`：

- Discuss / Plan / Close / Roadmap：只允许写文档
- Execute：禁止写文档

Write / Edit 与 Bash / PowerShell 的写入都会被检查，命令执行后还有 git status 审计。**被 hook 拦下即越界，不要换写法（`python -c`、`node -e` 等）绕过。** 误拦（如上个 session 残留标记）时手动 `rm .claude/workflow-phase`。

### Git 约定

- 每个 step 一个分支：`feat/step-NN-<slug>`（discuss 或 plan 开始时 `git fetch origin` 后从 `origin/main` 创建）
- 阶段 commit：`Step N Discuss: <标题>` / `Step N Plan: <标题>` / `Step N Execute: <标题>`（分段时 `Step N Execute: <标题>（P1）`…，P 标号专用于分段；正文固定写偏离 / 临场决策 / 遗留 / 验收四段，Close 从这里取材）/ `Step N Close: <标题>`
- Close 完成后建 PR 合回 main；merge 后可选打 tag `step-NN`
- 首次实例化：`Bootstrap: 实例化 planning 文档体系`，在 main
- 小改动：`Hotfix: <描述>`；`/roadmap` 通道的路线图变更：`Roadmap: <描述>`（plan / close 内的路线图变更随该阶段的 commit）。默认直接在 main（main 受保护则分支 + PR）
