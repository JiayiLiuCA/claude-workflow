# {项目名}

<!-- bootstrap：替换 {项目名}，填写「关于本项目」；其余章节保持不动 -->

## 关于本项目

<!-- bootstrap：一句话定位 -->

## 语言

与用户交流、写 plan 和文档使用中文，专业 term（plan mode、frontend、component 等）保留英文。

## 沟通风格

把用户当产品负责人：用户只拿大方向，不看实现细节。

- 汇报（进展、总结、PR 描述）只讲三件事：实现了什么功能、用户现在能看到或做到什么、哪里和之前不一样。技术方案、文件清单、库名函数名不写，用户追问再说。
- 请用户做选择时（AskUserQuestion 的选项、对话中的建议），每个选项讲它对用户意味着什么：多了什么、少了什么、代价是什么。不给只有实现差异的选项。
- 风险与遗留也用产品语言：说「这次导出不含 PDF」，不说「PDF renderer 未接入」。
- 例：✗ 新增 ExportService，接入 pdfkit，POST /api/export 返回 stream。✓ 报表页现在可以把筛选结果导出成 PDF，导出中显示进度；这次不含 Excel。

**例外**：ARCHITECTURE、step 文件、域笔记与 commit 正文写给后续 session 的 Claude，保持技术精确。

## 文档

| 文件 | 内容 | 谁读 |
|---|---|---|
| `docs/planning/OVERVIEW.md` | 已有功能、路线图、待决、已完成 | 用户；plan 读本 step 的条目 |
| `docs/planning/ARCHITECTURE.md` | 概念、约束、技术栈、目录、系统地图、架构规则 | 每个 session 启动时自动导入，见本文件末尾 |
| `docs/planning/STEPS/NN-slug.md` | 每 step 一个文件：决议、Plan、实录 | 当前 step 使用，close 后是存档 |
| 功能目录下的 `CLAUDE.md` | 域笔记：该功能放不进代码的知识。按层分目录的项目改用 `.claude/rules/<feature>.md` | 读到该功能的代码时自动加载 |
| `.claude/rules/<layer>.md` | 代码规范 | 读到对应文件时自动加载 |

知识先放进代码：类型、命名、测试和必要的注释，规则见各层 rules 的「注释与测试」。放不进代码的才写文档，文档只写当前状态，历史交给 git。写入规则与信息去处见 `.claude/rules/planning-docs.md`，读写这些文件时自动加载。找功能先看末尾导入的「系统地图」，再进对应目录；除 ARCHITECTURE 外，hotfix 与普通会话不预读 planning 文档。

## 记忆分工

项目事实只进上面的文档：它们进 git、团队可见、由 close 维护。auto memory 只存个人偏好与本机环境怪癖，不存决定、契约、进度；两者冲突以文档为准。

## 工作流程

**Discuss（可选）→ Plan → Execute → Close**；小改动走 hotfix，路线图变化走 roadmap。收到触发语必须调用对应 skill 按其步骤执行，不要直接开工。自然语言（`plan step 3`）与斜杠形式等价，触发语后的补充说明是该阶段的特殊关注点。不在任何阶段中时，用户要改代码或提新需求却没给触发语，同样不直接开工：按 hotfix 的适用判据判断，小改动提议走 `/hotfix`，新需求、砍功能、调顺序提议走 `/roadmap`，其余提议开正式 step。

| 触发 | 做什么 |
|---|---|
| `/bootstrap` | 项目启动：实例化文档、rules、CI 与 Step 0 plan（仅一次） |
| `/discuss-step N` | 可选：逐项拍板本 step 的关键决定 |
| `/plan-step N` | 写 step 文件的 Plan 节，含路线图对齐闸门 |
| `/execute-step N [Pk]` | 严格按 step 文件写代码；验收全部自动化覆盖且无偏离时自行提交并提示下一段；分段时每段一个新 session |
| `/close-step N` | 把本 step 的信息写到消费点，校验路线图，写实录并建 PR |
| `/hotfix <描述>` | 小改动快速通道，判据见 skill |
| `/roadmap <描述>` | 新需求 / 砍功能 / 拆合 step / 调顺序 |

Execute 的权威输入是 step 文件，不是对话。小 step 可以 plan、execute、close 同会话连跑，但 review 结论仍须回写 step 文件、close 仍以 commit 正文为准；大 step 阶段之间开新会话或 `/clear`。resume 或 compact 后按 SessionStart 的提示重新调用当前阶段的 skill；新会话接着做未完成的阶段（如隔天继续 review plan）同样先重新调用该阶段的 skill，它的「续接」说明会从中断处接上。

任务清单只在 execute（执行顺序里程碑）与 discuss（待决问题）使用，只反映完成项数，不代表剩余时间。

## 阶段纪律（hooks 强制）

阶段 skill 把阶段名写入 `.claude/workflow-phase`。Discuss / Plan / Close / Roadmap 只允许写 `docs/planning/` 与 `.claude/rules/`；Execute 禁止写这两处。功能目录下的 CLAUDE.md 域笔记各阶段都可写。**被 hook 拦下即越界，不要换写法（`python -c`、`node -e` 等）绕过。** 上个 session 残留标记导致误拦时手动 `rm .claude/workflow-phase`。

## Git 约定

- 每个 step 一个分支 `feat/step-NN-<slug>`，discuss 或 plan 开始时 `git fetch origin` 后从 `origin/main` 创建，上一个 step 的 PR 须已 merge；close 开始时先合入最新 `origin/main`，之后建 PR 合回 main，merge 后可选打 tag `step-NN`
- 比较与同步一律以 `origin/main` 为基准：PR 在 GitHub 上 merge 后本地 main 不会自动更新
- 阶段 commit：`Step N Discuss|Plan|Execute|Close: <标题>`，分段 execute 加 `（Pk）`；execute 正文固定四段：偏离 / 临场决策 / 遗留 / 验收
- 其他：`Bootstrap: …`、`Hotfix: …`、`Roadmap: …`，默认直接在 main：提交前快进到 `origin/main`，提交后 push（main 受保护则分支 + PR）。改了路线图的 commit，正文写原因

## 项目架构（自动导入）

@docs/planning/ARCHITECTURE.md
