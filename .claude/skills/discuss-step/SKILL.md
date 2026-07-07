---
name: discuss-step
description: 可选的第 0 阶段：为 Step N 逐项拍板关键决策，产出决议清单存档，作为 plan 阶段的输入。大 step 或方向未明时使用；小 step 直接 plan。用户输入 "discuss step N" 时执行。
---

你现在处于 **Step {N}** 的 Discuss 阶段。N 取自参数的第一个 token；其余文本是用户预先给出的议题或倾向，优先处理。目标：把 plan 之前该拍板的事逐项与用户敲定，避免 plan 建立在未决假设上。本阶段不写任何代码，唯一产物是决议清单文档。

# 第零步：阶段标记与分支

1. 用 Bash 执行 `printf 'discuss' > .claude/workflow-phase`（此后 hook 只允许写 `docs/planning/`）
2. 若 `feat/step-{NN}-<slug>` 分支不存在：从最新 main 创建（slug 用本 step 主题的 kebab-case 短词）；存在则切换过去

# 第一步：读取背景

1. `docs/planning/ARCHITECTURE.md` 全文
2. `docs/planning/PIPELINE.md`：本 step 在 step 拆分中的描述、决议台账相关条目、契约索引中相关的已有接口
3. `docs/planning/pipeline/` 下与本 step 相关的域文件
4. `docs/planning/PROGRESS.md` 最近 2-3 条记录
5. 相关的实际代码（结构与既有实现）
6. 如涉及前端：design reference 对应文件

# 第二步：列出待决问题

基于阅读列出本 step 所有值得拍板的问题，按类分组：

- **范围边界**：做什么 / 明确不做什么 / 推迟到哪个 step
- **技术选型**：库、算法、存储与执行方案
- **数据模型 / 接口形态**
- **UI / 交互形态**（如涉及）
- **与既有代码的关系**：复用 / 重写 / 不动

每个问题给出你的推荐 + 理由 + 备选项。已有明显惯例答案的不要拿来问——直接按惯例处理并在决议清单中注明。

# 第三步：逐项拍板

用 AskUserQuestion 或对话逐项与用户确认。用户预先给出的议题优先处理。所有问题拍板完成前不进入第四步；用户明确说「留到 plan 再定」的项单独记录。

# 第四步：产出决议清单

创建 `docs/planning/STEPS/STEP_{NN}_discuss.md`：

- 每条决议：**结论**（加粗）+ 理由 + 被否选项（一句话即可）
- 「留到 plan 阶段再定」的项单独一节
- 本文件是 plan 阶段的直接输入，也是历史存档（close 后不修改）

# 第五步：收尾

1. commit：`Step {N} Discuss: <标题>`
2. 用 Bash 执行 `rm -f .claude/workflow-phase`
3. 输出决议摘要（一条一行），提示用户下一步 `plan step {N}`（新会话）
