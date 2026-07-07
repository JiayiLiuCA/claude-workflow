---
name: bootstrap
description: 项目启动（仅第一次运行）：收集项目参数，把脚手架文档骨架实例化为本项目的 planning 体系，生成 Step 0 plan。用户输入 "bootstrap" 时执行。
---

你现在处于本项目的 Bootstrap 阶段。这是项目启动后的第一次运行，目标：收集项目参数，把 `docs/planning/` 的骨架实例化为本项目的 planning 文档体系，并为 Step 0 生成 plan。本阶段不写任何业务代码。

开始时把第一步到第八步建成任务清单（TaskCreate），推进时同步状态。

# 第一步：收集项目参数

若用户提供了项目简介（brief / PRD / 备忘 / 口头描述），先完整阅读理解。然后核对以下参数，缺失项用 AskUserQuestion 或对话一次性问全（不要挤牙膏式追问）：

1. **项目定位**：一句话说清做什么、给谁用
2. **形态与平台**：Web app / 桌面 app / CLI / 服务 / 库；目标操作系统
3. **技术栈**：前端 / 后端 / 数据库 / 关键依赖；尚未决定的项标注为「Step 0 确定」或「Step N 确定」
4. **核心约束**：离线要求、数据规模、性能目标、协作模式（solo / 团队）、部署方式
5. **Design reference**：是否有 UI/UX 视觉参考文件；有则确认位置（约定 `docs/design-reference/`）
6. **功能划分**：大致的功能 pipeline / 模块划分，用于 step 拆分草案

# 第二步：填充 ARCHITECTURE.md

按 `docs/planning/ARCHITECTURE.md` 骨架中的 bootstrap 注释逐节填充：项目概述、核心约束、技术栈表、目录结构、初始 ADR（形态级决策，如进程/通信模型、数据持久化分层）、代码规范（按技术栈惯例：类型要求、错误处理模式、日志、命名约定）。只写已确认的；未定项登记进 PIPELINE.md 决议台账。填完删除对应的 bootstrap 注释。

# 第三步：填充 PIPELINE.md

- **§1 原始需求**：用户需求的原文或忠实摘录
- **§2 核心概念**：领域名词定义，全项目统一用词
- **§3 step 拆分草案**：每个 step 给目标一句话 + 范围要点 + 依赖关系。拆分原则：每 step 完成后有用户可观察的行为增量；外部依赖集成的 step 单独拆；标注 DRAFT 待用户 review
- **§6 决议台账**：把所有待定技术选型登记为 `- [ ] 问题（预计 Step N 确定）`

# 第四步：Design tokens（如有 design reference）

逐个阅读 reference 文件，提取**实际出现**的 design tokens（颜色 / 字体 / 间距 / 圆角 / 阴影），不要自行发挥添加；识别核心复用组件清单（布局壳 / 表格 / 表单控件 / 状态进度 / modal 等），落入 ARCHITECTURE.md「前端设计规范」节。没有 reference 则删除该节并注明 UI 规范待定。

# 第五步：实例化 CI

把 `.github/ci.yml.example` 按技术栈改写后落为 `.github/workflows/ci.yml`（测试 job + 类型检查/构建 job），然后删除 `.example` 文件。技术栈未定的部分留注释占位。若 push 时提示 OAuth token 缺 `workflow` scope，提示用户执行 `gh auth refresh -s workflow` 后重推。

# 第六步：更新 CLAUDE.md

替换 `{项目名}` 与「关于本项目」章节；按用户偏好微调语言与 git 约定。工作流章节保持不动。

# 第七步：生成 Step 0 plan

按 plan-step skill 的章节模板创建 `docs/planning/STEPS/STEP_00_plan.md`。Step 0 的目标固定为「可运行骨架」：

- app 能启动，走通一次端到端调用（如前端调后端 ping / CLI 跑通空命令）
- DB 初始化 + migration 机制就位（如适用）
- design tokens 落地到样式系统（如适用）
- 决议台账中标注「Step 0 确定」的选型在本 plan 中做出决定并说明理由

# 第八步：输出总结

1. 文档体系就位状态（哪些文件已实例化）
2. step 拆分草案概览（等用户 review）
3. Step 0 plan 关键决策摘要（2-3 句）
4. 需要用户拍板 / 确认的清单

用户 review 确认后：在 main 分支 commit（`Bootstrap: 实例化 planning 文档体系`），然后才能进入 Step 0 的 Execute（Step 0 的 plan 已在本阶段生成，无需再跑 plan-step）。
