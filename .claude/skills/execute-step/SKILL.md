---
name: execute-step
description: Execute 阶段：严格按 STEP_NN_plan.md 写代码，不越界、不自由发挥；文档更新留给 Close。用户输入 "execute step N" 时执行。
---

你现在处于 **Step {N}** 的 Execute 阶段。N 取自参数的第一个 token；其余文本是补充说明。目标：严格按 plan 写代码。

# 第零步：阶段标记与分支

1. 用 Bash 执行 `printf 'execute' > "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`（此后 hook 会拦截对 `docs/planning/` 的写入）
2. 确认当前在 `feat/step-{NN}-*` 分支上

# 核心原则

1. **按 plan 的「范围内 / 范围外」严格约束自己**：plan 没写的不做，明确说不做的绝对不做。
2. **plan 没写清楚的细节，停下来问用户**：命名、字段类型、UI 交互细节、错误处理策略，不要自己决定。
3. **plan 与实际代码冲突，停下来问用户**，不要自己调和。
4. **不修改 `docs/planning/` 下任何文件**（hook 强制拦截；文档更新是 Close 阶段的事）。
5. **按依赖顺序推进**：migration → model → service → API → 前端（按项目形态调整），每层写完先跑通再下一层；**写一块测一块**，不把问题往下堆。

# 第一步：读取并复述

1. `ARCHITECTURE.md`：代码规范、目录结构、命名约定的要点
2. `STEPS/STEP_{NN}_plan.md` 完整阅读：复述「范围内」「范围外」「不要做的事」「测试计划」
3. `PIPELINE.md` 契约索引 + 相关域文件：本 step 会用到或依赖的已有 API / 表 / 组件
4. 如涉及前端：design reference 对应文件，记住视觉与交互
5. 相关的现有代码

# 第二步：确认理解，再开工

写任何代码之前列出：

1. plan 中不够清楚、需要澄清的点（如有）
2. plan 与现有代码的潜在冲突（如有）
3. 计划的执行顺序（按文件或模块分段）

有问题暂停等用户回答；没有则明确说「理解无歧义，开始执行」，进入第三步。

开工前把执行顺序建成任务清单（TaskCreate，一个阶段一个任务；末尾追加「验收自检」收尾任务）——terminal 的任务 tracker 就是本次 execute 的实时进度条。

# 第三步：按序执行

按第二步列出的顺序推进。在关键边界**自检并用一两句话简报进展，不停下等待确认**：

- migration 跑通、表结构正确
- 后端各层能 import、单测绿、API 实测响应正确
- 前端类型检查 / build 通过、页面加载不报错

任务状态同步推进：阶段开始置 in_progress、完成置 completed（TaskUpdate）；中途冒出的新工作先加进清单再动手，让清单始终与实际一致。

**唯一必须立刻停下汇报并等待指示的情况：发现任何偏离 plan 的事实**——字段类型不对、依赖的接口与预期不符、plan 遗漏了必要改动。

停下汇报后，按用户裁决分流：

- **小偏离**（不动范围边界与契约本质：字段改名、必要的连带修改、实现细节调整）：会话内继续执行，Close 阶段记入「与 plan 的偏离」。
- **大偏离**（方案更换、范围增减、契约 / schema 变化）：中止 execute——清除阶段标记，由用户重开 plan 阶段（`plan step {N}`）把修订写进 plan 文件、review 后再重新 execute。**不允许带着「文件是方案 A、口头改成方案 B」的状态继续跑**：plan 文件必须始终反映最新共识。execute 阶段被 hook 禁止改 plan 文件是有意设计——修订必须经由 plan 阶段的人工 gate，防止执行者自我合法化越界。

**大规模机械改造**（全量重命名、批量文案抽取、迁移适配等）：拆成互不相交的文件集，用并行 subagent 分组执行，汇合后统一跑类型检查与测试校验。

# 第四步：验收自检

全部写完后，按 plan「验收标准」逐条自检，并跑全量测试。输出 checklist，每条标注：

- ✅ 已验证通过（附验证方式）
- ⚠️ 需用户手动验证（附具体操作步骤）
- ❌ 未达成（附原因）

**不自动跑代码审查。**若本 step diff 较大或触及核心逻辑，在总结汇报中提示用户：可在 `close step {N}` 前手动跑 `/code-review origin/main...HEAD`（该 range 覆盖本 step 全部改动，不受分支 upstream 状态影响）；是否执行由用户决定。

# 第五步：总结汇报

1. 实际修改的文件清单（新建 / 修改分列）
2. 与 plan 的偏离点（如有）
3. 临场决策（plan 没明确、你现场决定的事，如实说明）
4. 遗留问题（已知但本 step 不打算解决的）
5. 建议用户手动验证的操作步骤

# 收尾（用户验收通过后）

1. commit：`Step {N} Execute: <标题>`（改动大可拆 `P1（后端）` / `P2（前端）` 两个 commit）
2. 用 Bash 执行 `rm -f "$(git rev-parse --show-toplevel)/.claude/workflow-phase"`
3. 提示用户下一步 `close step {N}`（同会话继续时，close 仍必须以 git diff 与实际代码为准，不凭对话记忆写文档）

# 禁止事项

- 不改 `docs/planning/` 下任何文件
- 不修改历史 step 的代码（除非 plan 明确要求）
- 不顺手引入 plan 之外的依赖库
- 不添加 "for future use" 的代码
- 不把多个独立改动打包成一个「优化」
- 不用 Bash（`sed -i`、重定向等）绕过阶段写入限制修改 `docs/planning/`——hook 只拦 Write/Edit 类工具，这条靠纪律
