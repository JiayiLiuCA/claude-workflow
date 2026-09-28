---
name: discuss-step
description: 可选的第 0 阶段：为 Step N 逐项拍板关键决定，写进 step 文件的「决议」节，作为 plan 的输入。大 step 或方向未明时使用；小 step 直接 plan。
when_to_use: 用户输入 "discuss step N"（可附预先给出的议题或倾向）或 /discuss-step N 时执行。
argument-hint: "N [预先给出的议题或倾向]"
arguments: [step]
---

你现在处于 **Step {N}** 的 Discuss 阶段：把 plan 之前该拍板的事逐项与用户敲定，避免 plan 建立在未决假设上。不写代码，唯一产物是 step 文件的「决议」节。

**参数**：N = `$step`（为空或不是数字则从触发语取）；`$ARGUMENTS` 去掉 N 后是用户预先给出的议题或倾向，优先处理。
**续接**（resume / compact 后或新会话接着做时重新调用）：先看 `git status`、`git log --oneline -5` 与 step 文件判断做到哪一步，跳过已完成的。

# 第零步：阶段标记与分支

1. 用 Bash 执行 `printf 'discuss' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
2. 分支 `feat/step-{NN}-<slug>` 已存在则切过去。不存在则 `git fetch origin`，先核对上一个 step 已合入：`git show origin/main:docs/planning/OVERVIEW.md` 的路线图里 Step {N} 前面还有条目，说明上一个 step 的 PR 还没 merge 或顺序变了，停下问用户。核对通过后从 `origin/main` 创建（slug 为本 step 主题的 kebab-case 短词；无 origin 时核对与创建都用本地 main）

# 第一步：读取

ARCHITECTURE 已随根 CLAUDE.md 自动加载，项目全局、系统地图与架构规则都在 context 里，不用再读。另外只读下面这些，定位读取，不通读：

1. OVERVIEW：路线图中 Step {N} 的条目（含前置提示）、「待决」中相关项
2. 相关代码：先用系统地图找到涉及的功能目录，再看结构与既有实现。想了解既有行为先搜测试名。域笔记在读到对应功能的代码时自动加载
3. 涉及前端时：design reference 对应文件

不读历史 step 文件：后续需要的信息 close 已写进路线图条目、域笔记和 ARCHITECTURE。

# 第二步：列出待决问题

按类分组：范围边界（做 / 不做 / 推迟到哪）、技术选型、数据模型与接口形态、UI 与交互（如涉及）、与既有代码的关系（复用 / 重写 / 不动）。每个问题给推荐、理由、备选，按 CLAUDE.md「沟通风格」先讲对用户的影响。有明显惯例答案的不问，按惯例处理并在决议里注明。

把问题建成任务清单（TaskCreate，一题一个；会话里没有该工具就用文字列出），每拍板一项置 completed，清零才进入第四步。

# 第三步：逐项拍板

用 AskUserQuestion 或对话逐项确认，用户预先给出的议题优先。用户说「留到 plan 再定」的单独记录。

# 第四步：写决议

创建 `docs/planning/STEPS/{NN}-<slug>.md`（已存在则就地修改「决议」节）：

~~~markdown
# Step {N}：<标题>

## 决议
- **结论**。理由；否决：<备选>，因为…

### 留给 plan
- …（没有就省略本小节）
~~~

plan 阶段会在同一文件追加 Plan 节，决议是 plan 必须遵守的输入。

# 第五步：收尾

1. commit：`Step {N} Discuss: <标题>`
2. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
3. 输出决议摘要（一条一行），提示下一步 `/plan-step {N}`
