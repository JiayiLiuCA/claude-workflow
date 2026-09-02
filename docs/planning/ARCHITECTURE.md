# {项目名} Architecture

<!-- bootstrap 阶段按各节注释填充本文档，填完删除注释 -->

本文档定义核心约束、技术栈、目录结构、核心架构决策（ADR）。属于稳定文档，除非有明确理由，不随 step 频繁变化。代码规范与前端设计规范不在这里，见末节。

## 项目概述

<!-- bootstrap：项目做什么、给谁用、形态（Web / 桌面 / CLI / 服务 / 库）、工作流分几个阶段 -->

## 核心约束

<!-- bootstrap：硬约束逐条列出，每条一行。例如：离线运行 / 数据规模 / 性能目标 / solo dev 维护优先稳定可调试 / 部署方式 -->

## 技术栈

| 层 | 选择 |
|---|---|
<!-- bootstrap：逐层填写；未定项写「Step 0 确定」并在 PIPELINE.md 决议台账登记。
     后续 step 落地重要选型时在对应行追加「（Step N 落地）」与关键结论 -->

## 目录结构

```text
<!-- bootstrap：目标目录树（含 docs/planning 本体） -->
```

## 核心架构决策（ADR）

书写规范：

- 每条编号 A1、A2 … 顺延；标题一句话；正文给**结论 + 理由**
- 落地或修订时标注来源：`（Step N 落地）` / `（Step N 修订）`
- 决策被推翻时用 ~~删除线~~ 保留原文，写明推翻原因与新结论——**错误结论也是资产，不删除历史**

### A1. <!-- bootstrap：第一条形态级决策（如进程/通信模型） -->

### A2. <!-- bootstrap：数据持久化分层等 -->

## 代码规范与前端设计规范

不在本文档，按层写在 `.claude/rules/<layer>.md`：frontmatter 的 `paths` 指定作用范围，Claude Code 在触碰对应文件时自动加载，其他会话不付这笔 context。

<!-- bootstrap：按技术栈生成，例如
- backend.md（paths: backend/**）：语言版本与类型要求、错误处理模式、日志约定、命名约定、测试约定
- frontend.md（paths: frontend/**）：同上 + design reference 使用原则、从 reference 提取的 design tokens（只写实际出现的）、核心复用组件清单
每个 rule 文件必须带 paths，否则每个会话都会加载。后续 step 引入新约定时由 Close 阶段追加到对应文件 -->

## 文档维护

- 本文档主要在 Bootstrap 阶段完善；后续 step 推翻旧决策或需固化新 ADR 时，由该 step 的 Close 阶段追加 / 修订
- ADR 只增不删；被推翻的决策用删除线保留
