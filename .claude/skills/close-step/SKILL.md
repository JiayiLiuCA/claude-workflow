---
name: close-step
description: Close 阶段：Step N 验收通过后，把 execute 的 commit 正文与 Plan「文档影响」写到将来会被读到的地方（系统地图、路线图、待决、架构规则、域笔记、已有功能），校验路线图，在 step 文件追加实录并建 PR。
when_to_use: 用户输入 "close step N"（可附 Execute 之外手动变更的说明）或 /close-step N 时执行。
argument-hint: "N [Execute 之外的手动变更说明]"
arguments: [step]
---

你现在处于 **Step {N}** 的 Close 阶段。目标：用最少的阅读，把本 step 产生的信息写到将来消费它的地方，后续 session 不用翻历史。只改文档，不写代码。信息去处与写作原则见 `.claude/rules/planning-docs.md`，读写文档时自动加载。

**参数**：N = `$step`（为空或不是数字则从触发语取）；`$ARGUMENTS` 去掉 N 后是用户在 Execute 之外手动做的变更（如手改配置、手修数据），一并处理。
**续接**（resume / compact 后重新调用）：先看 `git status` 与 `git diff --stat` 判断哪些文档已改，跳过已完成的步骤，不重复 commit 或建 PR。

# 第零步：阶段标记

用 Bash 执行 `printf 'close' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`

# 第一步：收集输入

只读这三样：

1. step 文件 Plan 节的「目标」「文档影响」「执行分段」：Grep 定位后读该段，不通读
2. Execute commit 正文：`git log main..HEAD --format='%h %s%n%b'`。有分段时核对 P1 到末段齐全，缺段则 execute 未完成，停下询问
3. `git diff --stat main...HEAD`：动了哪些文件，其中哪些功能目录的 CLAUDE.md 已被 execute 更新

之后只为写入而定点读要改的段落。不通读 diff，不读历史 step 文件。

# 第二步：路由

把 commit 正文（偏离 / 临场决策 / 遗留）、「文档影响」、用户的手动变更说明逐条按「信息去处」分配，列成清单，每条一行：

- 遗留与给后续的提示：目标 step 路线图条目的「前置提示」；没有明确目标 step 的进「待决」
- 新增的功能目录、功能间依赖的变化：ARCHITECTURE「系统地图」，每个功能一行，写目录、技术职责、依赖。从 `git diff --stat` 看新目录，从 commit 正文看依赖变化
- 仍约束后续工作的决定与知识：涉及多个功能的进 ARCHITECTURE 架构规则；单个功能内的进该功能的域笔记。功能目录的 CLAUDE.md 由 execute 写，这里核对，缺了补；按层分的项目由 close 写进 `.claude/rules/<feature>.md`，新功能新建该文件，`paths` 列出该功能在各层的文件
- 新代码约定：`.claude/rules/<layer>.md`
- 本 step 决定了的「待决」项：从「待决」删除，结论已落在上面某处
- 只是过程（为什么偏离、试过什么）：只进实录

「文档影响」为「无」、commit 正文的偏离 / 临场决策 / 遗留都是「无」：跳过第三步。

# 第三步：定点写入

用 Edit 定点插入或改写，不重写整节。写进 ARCHITECTURE 与域笔记前，对涉及的代码 Grep 定位核对，以代码为准。推翻既有规则时直接改写成新结论，不留原文。

# 第四步：OVERVIEW

1. **已有功能**：更新或新增相关功能的两三句，只用产品语言，不写目录
2. **路线图校验**：逐条看后续 step 的条目是否仍成立（依赖、范围、顺序、是否该新增或删除）。有变化按「路线图」开头的规则改，已 plan 未 execute 的标「需重跑 plan」，涉及取舍先用 AskUserQuestion 问用户；原因写进 commit 正文与实录
3. 删除 Step {N} 的路线图条目，在「已完成」表顶部插入一行：`| {N} | [<标题>](STEPS/{NN}-<slug>.md) | {日期} | <用户得到了什么，一句话> |`
4. 「待决」里标「预计 Step {N+1} 决定」的超过 2 条：总结里建议下一步先 `/discuss-step`

# 第五步：压缩检查

本次碰过的域笔记超过约 150 行、或 ARCHITECTURE 超过约 200 行（它每个 session 都会加载，上限最要紧）：用 AskUserQuestion 问用户是否顺带压缩，说明压缩只合并重复、删过时内容，并会列出删除清单。同意则按规则文件的「压缩」一节执行。

# 第六步：追加实录

在 step 文件末尾追加：

~~~markdown
## 实录（{日期}）

### 结果
交付了什么；测试通过数；分支。

### 偏离与临场决策
- 描述 + 原因（来源 commit 正文；无则写「无」）

### 信息去向
- <条目>：写进了 <去处>（第二步的路由清单；无则写「无」）

### 路线图校验
无变化，或改了什么 + 为什么。
~~~

决议与 Plan 节保持原样；追加实录后整个文件是存档，不再修改。

# 第七步：收尾

1. commit：`Step {N} Close: <标题>`；正文写路线图变更原因（如有）与压缩的删除与合并清单（如有）
2. 触及鉴权 / 数据访问 / 外部输入解析的 step，建议用户先跑 `/security-review`
3. push 分支，提议创建 PR（标题 `Step {N}: <标题>`，正文开头一段用户可感知的变化，其后贴实录），**经用户确认后**创建
4. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
5. 输出总结（产品语言）：这个 step 给用户带来了什么；路线图有无调整；下一步建议（是否先 discuss）；给用户 review 的点
6. 提示：PR merge 后可选在 main 打 tag `step-{NN}`
