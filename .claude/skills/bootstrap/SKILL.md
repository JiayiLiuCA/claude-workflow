---
name: bootstrap
description: 项目启动（仅第一次运行）：收集项目参数，实例化 OVERVIEW 与 ARCHITECTURE，生成代码规范 rules、CI 与 Step 0 plan。
when_to_use: 用户输入 "bootstrap" 或 /bootstrap 时执行；只在 docs/planning/ 还是骨架、尚未实例化时使用。
argument-hint: "[项目简介或 brief 文件路径]"
---

你现在处于 Bootstrap 阶段：把 `docs/planning/` 的骨架实例化为本项目的文档，生成代码规范 rules 与 CI，产出 Step 0 plan。不写业务代码。信息去处与写作原则见 `.claude/rules/planning-docs.md`，读写文档时自动加载。

**参数**：`$ARGUMENTS`（为空则以用户对话中提供的简介 / 文件为准）。

# 第一步：收集项目参数

若用户提供了简介（brief / PRD / 备忘 / 口头描述），先完整阅读。已有项目先读现有代码结构与 README，以现状为准。然后核对以下参数，缺失项用 AskUserQuestion 或对话一次性问全，不要挤牙膏式追问：

1. **项目定位**：做什么、给谁用
2. **形态与平台**：Web / 桌面 / CLI / 服务 / 库；目标操作系统
3. **技术栈**：前端 / 后端 / 数据库 / 关键依赖 / 测试工具链（单测、API 测试，有 UI 时 component 与 e2e 框架）；未定项标「Step N 决定」
4. **核心约束**：离线要求、数据规模、性能目标、solo 或团队、部署方式
5. **Design reference**：有无 UI/UX 视觉参考；有则确认位置（约定 `docs/design-reference/`）
6. **功能划分**：大致有哪些功能，用于路线图草案与功能目录

# 第二步：ARCHITECTURE.md

按骨架注释逐节填充：概述、核心概念、核心约束、技术栈、目录结构、系统地图、初始架构规则（形态级决定，如进程 / 通信模型、数据持久化分层）。只写已确认的，未定项进 OVERVIEW「待决」。填完删除注释。

本文件由根 CLAUDE.md 导入，每个 session 都会加载，是 Claude 看项目全局的入口：写得紧凑，控制在约 200 行以内。

**目录结构决定域的边界**，这一步要定清楚，后续 step 不再重新判断：

- 新项目按功能分目录、功能内部再分层，如 `backend/app/ocr/{router,service,models}.py` 与 `frontend/src/features/ocr/`。目录树只画顶层结构和功能目录内部的分层惯例，并注明「每个功能目录是一个域，域笔记 CLAUDE.md 放在这里」。
- 已有项目沿用现有布局。按功能分的同上。按层分的注明「域笔记用 `.claude/rules/<feature>.md`」，规则见 `.claude/rules/planning-docs.md`「按层分目录的项目」。
- 框架惯例强制按层时（如 Rails 的 `app/models`、`app/controllers`），遵循框架，采用 rule 方式，同样在目录结构里注明。

**系统地图**只列已经存在的功能，每个一行：目录、技术上负责什么、依赖哪些功能。新项目留空表头，功能由后续 close 逐个加入；已有项目按现状填。规划中的功能只在 OVERVIEW 路线图。

brief / PRD **不复制进 `docs/planning/`**：概述写一段定位，功能拆进路线图，原文件留在原处并在概述末尾链接。原文几个 step 后必然过时，之后的需求变化走路线图与待决。

# 第三步：OVERVIEW.md

- 开头一句话定位
- **已有功能**：新项目保留「尚无」；已有项目每个功能写两三句现状，只用产品语言，不写目录
- **路线图**：Step 0 到最后的草案，按骨架格式，状态都是「未开始」。拆分原则：每个 step 完成后有用户可观察的变化；外部依赖集成单独成 step。标题后标 DRAFT 待用户 review
- **待决**：所有未定选型与开放问题

已有项目不要为现有代码批量写域笔记：域笔记随后续 step 在碰到的目录里长出来。

# 第四步：代码规范 rules

按技术栈分层写 `.claude/rules/<layer>.md`（如 `backend.md`、`frontend.md`），frontmatter **必须带 `paths`**（如 `backend/**`），否则每个会话都会加载。内容按技术栈惯例简洁地写：语言版本与类型要求、错误处理模式、日志约定、命名约定（文件 / 类 / 函数 / DB 表 / API 路由）、测试约定（框架、目录、跑法；有 UI 的层写明 e2e 框架、怎么起 app、截图存 `.claude/verify/`）。

代码只有 Claude 读，写法按「让下一个 session 少走几轮、少犯错」来定。每份 rule 都必须有「注释与测试」一节，按下面的内容写，示例换成该层的语法：

~~~markdown
## 注释与测试

- 知识先放进代码：类型写全，名字表达意图，取值约束用 schema / enum 表达，不用魔法字符串。
- 功能性行为都要有自动化测试，edge case 也写成测试，测试名描述行为，如 `test_scanned_pdf_falls_back_to_ocr`。想知道某功能的行为，先搜它的测试名。UI 的功能性行为（点了之后发生什么、表单校验、路由、数据展示、错误呈现）用 component test 或 e2e 测；审美（视觉、动效、手感）不写测试，由用户把握。
- 注释只写两种：故意为之、看起来像 bug 的写法的原因；会被其他功能调用的函数的契约，即失败时返回什么、单位、副作用。
- 不写复述代码的注释、教程式说明、为文档生成器写的长篇 docstring、注释掉的旧代码、文件头的作者与日期。
- 改代码时同步改相关注释，过期注释按 bug 处理。
~~~

有 design reference 时逐个阅读，把使用原则、**实际出现**的 design tokens（颜色 / 字体 / 间距 / 圆角 / 阴影，标注来源文件，不自行发挥）、核心复用组件清单（布局壳 / 表格 / 表单控件 / 状态进度 / modal 等）写进前端 rule。没有则在前端 rule 注明 UI 规范待定。

# 第五步：CI

把 `.github/ci.yml.example` 按技术栈改写为 `.github/workflows/ci.yml`（测试 job + 类型检查 / 构建 job，有 UI 时加 e2e job），然后删除 `.example`。技术栈未定的部分留注释占位。push 时若提示 OAuth token 缺 `workflow` scope，提示用户执行 `gh auth refresh -s workflow` 后重推。

# 第六步：CLAUDE.md

替换 `{项目名}`，填写「关于本项目」一句话；按用户偏好微调语言与 git 约定，其余章节不动。

# 第七步：Step 0 plan

按 plan-step skill 的 Plan 节模板创建 `docs/planning/STEPS/00-skeleton.md`（首行 `# Step 0：可运行骨架`，只有 Plan 节），删除 `STEPS/.gitkeep`。Step 0 的目标固定为「可运行骨架」：

- app 能启动，走通一次端到端调用（如前端调后端 ping / CLI 跑通空命令）
- DB 初始化 + migration 机制就位（如适用）
- 测试基础设施就位：单测与 API 测试框架各跑通一个用例；有 UI 时 e2e 框架跑通一个打开首页的用例，并能把截图存到 `.claude/verify/`；CI 全部跑。后续每个 step 的验收默认写成这些框架里的测试
- design tokens 落进样式系统（如适用）
- 「待决」中标「Step 0 决定」的选型在 Plan 中定下并写明理由

# 第八步：输出总结

1. 实例化了哪些文件、生成了哪些 rules
2. 路线图草案概览（等用户 review）
3. Step 0 plan 的关键决定
4. 需要用户拍板的清单

用户 review 确认后：去掉路线图的 DRAFT 标记，Step 0 状态改为「plan 已定稿」，在 main commit（`Bootstrap: 实例化 planning 文档`）并 push（无 origin 跳过），然后从 main 建 `feat/step-00-skeleton` 分支，提示下一步 `/execute-step 0`（Step 0 的 plan 已在本阶段生成，无需再跑 plan-step）。
