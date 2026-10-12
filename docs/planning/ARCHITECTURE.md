# {项目名} 架构

<!-- bootstrap 按各节注释填充，填完删除注释。
本文件由根 CLAUDE.md 导入，每个 session 启动时自动加载，是 Claude 看项目全局的入口：只写每个 session 都要用的，只写当前状态。写法与报警线见 `.claude/rules/planning-docs.md`「ARCHITECTURE」 -->

## 概述

<!-- 一两句：做什么、给谁用、形态（Web / 桌面 / CLI / 服务 / 库） -->

## 核心概念

<!-- 本项目特有的领域名词，一个一行：名词 + 定义。代码命名、文档、UI 用词以此为准。文件路径、字段名、枚举值不写，读代码 -->

## 核心约束

<!-- 会改变设计的硬约束，一条一行：离线运行、数据规模、性能目标、部署平台等 -->

## 目录结构

<!-- 一两句写顶层分层与功能目录的惯例，不画目录树、不逐个列功能（功能在「系统地图」）。例：
后端功能在 `backend/app/<feature>/`（内分 router / service / models），前端在 `frontend/src/features/<feature>/`；每个功能目录是一个域，域笔记是其中的 CLAUDE.md。
按层分目录的项目在这里注明：域笔记改用 `.claude/rules/<feature>.md`，paths 列出该功能在各层的文件，要看某功能的完整文件直接读该文件 -->

## 系统地图

| 功能 | 目录 | 负责 | 依赖 |
|---|---|---|---|
<!-- 例：| OCR | backend/app/ocr、frontend/src/features/ocr | 图片与 PDF 转文本，异步 job | storage、llm | -->

## 架构规则

### 全局

<!-- bootstrap：形态级决定，每条一行，如进程 / 通信模型、数据持久化分层。例：
- **A1 进程模型**：Electron 拉起本地 FastAPI 子进程，前端经 HTTP 调用。理由：后端可脱离 Electron 测试，Python 崩溃不连累 UI。 -->

### 只约束部分功能

| 编号 | 规则 | 约束的功能 | 正文 |
|---|---|---|---|
<!-- 「规则」先写哪种代码受约束，再写结论。例：| A7 | 新增 LLM 调用：先过共享 server 的归属检查 | 标注、评语 | `.claude/rules/llm-owner.md` | -->
