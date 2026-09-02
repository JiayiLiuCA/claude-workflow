# Step 存档

每个 step 最多三个文件，按阶段命名：

- `STEP_NN_discuss.md` — 可选的预备决议清单（Discuss 阶段产出，作为 plan 的输入）
- `STEP_NN_plan.md` — implementation plan（Plan 阶段产出；**review 结论必须回写至此**，Execute 只认这个文件）
- `STEP_NN_close.md` — 实录（Close 阶段产出：实际完成、偏离、关键决策、遗留、路线图校验、涉及的文件）

三者在 step close 后即为历史存档，不再修改；后续修正走 `PIPELINE.md` 与域文件。`PROGRESS.md` 是这些实录的索引。

直接编辑已有文件，不新建版本后缀文件（如 `STEP_01_plan_v2.md`）。
