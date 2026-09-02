---
paths:
  - "docs/planning/**"
---

# docs/planning 写作规则

本规则是 path-scoped rule：读写 `docs/planning/` 下的文件时由 Claude Code 自动加载，不占其他会话的 context。

## 收录原则

**代码能回答的问题不进文档。** 文档只存代码回答不了的：决策与理由、被推翻的假设、edge case 行为、benchmark 结论、跨 step 的承诺。API / 组件 / 表在域文件里只留一行索引（用途 + 实现位置 + step），签名与 schema 细节以实际代码为准，不复制进文档。

判断标准：**下一个 session 读代码就能知道的，不写。**

## 修改原则

- 直接编辑已有文件，不新建版本后缀文件（如 `STEP_01_plan_v2.md`）；更新用定点插入或追加，不重写整节。
- **Plan review 的结论（含对话中的口头调整）必须回写 plan 文件本身**：Execute 阶段只认 plan 文件，不接受文件外的补充。
- `STEPS/` 下的 discuss、plan、close 文件在 step close 后即为历史存档，不再修改；后续修正走 `PIPELINE.md` 与域文件。
- ADR 与决议台账只增不删：被推翻的决策用 ~~删除线~~ 保留原文，写明推翻原因与新结论。错误结论也是资产。
- 路线图变更遵守 `PIPELINE.md` §2 的规则：写变更日志、编号不变、废弃用删除线、受影响的 plan 标「需重跑」。
- `PIPELINE.md` 体量恒定：随 step 增长的内容进域文件或 `STEPS/`，不进 PIPELINE。

## 写作对象

这些文档写给后续 session 的 Claude 读：保持技术精确（实际签名、schema、偏离实录），不适用 CLAUDE.md「沟通风格」里「用户视角优先」的原则。
