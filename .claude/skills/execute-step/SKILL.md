---
name: execute-step
description: Execute 阶段：严格按 STEP_NN_plan.md 写代码，不越界、不自由发挥；文档更新留给 Close。支持按 plan 定义的 P1/P2… 分段执行。
when_to_use: 用户输入 "execute step N"（分段执行时 "execute step N P1" / "P2" 等）或 /execute-step N [Pk] 时执行。
argument-hint: "N [Pk] [补充说明]"
arguments: [step, segment]
---

你现在处于 **Step {N}** 的 Execute 阶段。目标：严格按 plan 写代码。

**参数**：N = `$step`（为空或不是数字则从触发语取）；`$segment` 形如 `P{k}` 时本次只执行该段，否则它属于补充说明；`$ARGUMENTS` 去掉 N 与段号后为补充说明。
**续接**（resume / compact 后重新调用）：先看 `git status`、`git log --oneline` 与对话摘要判断做到哪一步，跳过已完成的，不重复 commit。

# 第零步：阶段标记与分支

1. 用 Bash 执行 `printf 'execute' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
2. 确认当前在 `feat/step-{NN}-*` 分支上
3. **分段对齐**：查看 plan 是否含「执行分段」章节，与参数核对：
   - plan 有分段、参数带 `P{k}`：k > 1 时先用 `git log --oneline` 确认 P1…P{k-1} 的 Execute commit 齐全，并快速重跑上一段的退出验收（至少编译 / 类型检查 + 相关测试绿）；缺段或验收不过，停下汇报
   - plan 有分段、参数未带段号：按 git log 推断下一个未执行的段，明确告知「本次执行 P{k}」后继续
   - plan 无分段、参数带段号：停下询问，不能自行发明段边界

# 核心原则

1. **按 plan 的「范围内 / 范围外」严格约束自己**：plan 没写的不做，明确说不做的绝对不做。
2. **plan 没写清楚的细节，停下来问用户**（命名、字段类型、UI 交互、错误处理策略），不要自己决定。
3. **plan 与实际代码冲突，停下来问用户**，不要自己调和。
4. **不修改 `docs/planning/` 与 `.claude/rules/`**（hook 拦截；文档更新是 Close 的事）。
5. **按依赖顺序推进**：migration → model → service → API → 前端（按项目形态调整），每层写完先跑通再下一层，写一块测一块。
6. **分段执行时，本段之外一律视同「范围外」**：不提前实现后续段，不重构已交付段（plan 明确要求的衔接改动除外）；段边界本身有问题时按「偏离 plan」停下汇报。

# 第一步：读取并复述

1. `STEPS/STEP_{NN}_plan.md` 完整阅读：复述「范围内」「范围外」「不要做的事」「测试计划」；分段执行时另复述本段的范围、前置、退出验收与相邻段边界
2. 相关域文件 `pipeline/<domain>.md`：契约索引、表索引中本 step 依赖的已有 API / 表 / 组件，以及行为参考
3. 代码规范由 `.claude/rules/` 在触碰对应文件时自动加载；`ARCHITECTURE.md` 只在需要目录结构或某条 ADR 时用 Grep 定位读取，不通读
4. 如涉及前端：design reference 对应文件
5. 相关的现有代码

# 第二步：确认理解，再开工

写代码之前列出：plan 中需要澄清的点、plan 与现有代码的潜在冲突、计划的执行顺序（按文件或模块分组）。有问题暂停等用户回答；没有则明确说「理解无歧义，开始执行」。

开工前把执行顺序建成任务清单（TaskCreate，一个阶段一个任务，末尾追加「验收自检」）：这是给用户看的里程碑视图，不代表剩余时间。中途冒出的新工作先加进清单再动手。

# 第三步：按序执行

按第二步的顺序推进，在关键边界自检并简报，不停下等确认：migration 跑通、表结构正确；后端各层能 import、单测绿、API 实测正确；前端类型检查 / build 通过、页面加载不报错。

**唯一必须停下汇报并等待指示的情况：发现任何偏离 plan 的事实**（字段类型不对、依赖的接口与预期不符、plan 遗漏了必要改动）。按用户裁决分流：

- **小偏离**（不动范围边界与契约本质：字段改名、必要的连带修改、实现细节调整）：继续执行，记入 commit 正文的「偏离」。
- **大偏离**（方案更换、范围增减、契约 / schema 变化）：中止 execute，清除阶段标记，由用户重开 `/plan-step {N}` 把修订写进 plan 文件、review 后再重新 execute。不允许带着「文件是方案 A、口头改成方案 B」的状态继续跑：修订必须经过 plan 阶段的人工 gate。

**大规模机械改造**（全量重命名、批量文案抽取、迁移适配）：拆成互不相交的文件集，用并行 subagent 分组执行（Agent 工具选 `fork` 类型，继承已读的 plan 与代码），汇合后统一跑类型检查与测试。

# 第四步：验收自检

分段执行的非末段只按本段「退出验收」自检 + 跑本段测试；以下适用于单段与末段。

按 plan「验收标准」逐条自检并跑全量测试，输出 checklist：✅ 已验证通过（附方式）/ ⚠️ 需用户手动验证（附步骤）/ ❌ 未达成（附原因）。

diff 较大或触及核心逻辑时，在总结中建议用户在 close 前跑 `/code-review high origin/main...HEAD`（不自动跑；**不加 `--fix`**，它的修改在 checkpoint 之外且绕过下面的分流）。review 发现的问题按性质分流，不一律回写 plan：

- **实现 bug**（绝大多数）：当场修复，追加 commit `Step {N} Execute: review fixes`，plan 不动。
- **plan 缺漏但不动范围与契约**：按「小偏离」处理。
- **动摇 plan 决策**（契约 / schema / 方案不成立）：升级为「大偏离」。

# 第五步：总结汇报

按 CLAUDE.md「沟通风格」写给产品负责人看：

1. **现在能做什么了**：用户可见的功能与行为变化，2-4 句
2. **和 plan 说好的有什么不一样**：功能多了 / 少了 / 变了，各附一句为什么
3. **需要用户决定或确认的事**
4. **建议怎么验证**：按操作步骤写
5. **遗留问题**：用产品语言

技术细节（文件清单、临场技术决策与理由）不进汇报，写进 execute commit 的正文（见收尾），供 Close 阶段与 git 历史使用。分段的非末段：只覆盖本段，第 1 点先注明「P{k} 完成，下一段 P{k+1}：<段标题>」。

# 收尾（用户验收通过后）

1. commit：标题 `Step {N} Execute: <标题>`（分段时 `Step {N} Execute: <标题>（P{k}）`，P 标号专用于分段；单段内拆多个 commit 用 `Step {N} Execute: <子标题>`）。正文固定四段，Close 阶段直接取用，无内容写「无」：
   ```text
   偏离：与 plan 不同之处 + 原因
   临场决策：plan 没明确、现场决定的事 + 理由
   遗留：已知但本 step 不解决的问题
   验收：验收标准逐条结果（✅ / ⚠️ / ❌）+ 测试通过数
   ```
2. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
3. 提示下一步：非末段 → **新开 session** 跑 `/execute-step {N} P{k+1}`；单段或末段 → `/close-step {N}`

# 禁止事项

- 不修改历史 step 的代码（除非 plan 明确要求）
- 不顺手引入 plan 之外的依赖库
- 不添加 "for future use" 的代码
- 不把多个独立改动打包成一个「优化」
