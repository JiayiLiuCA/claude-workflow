#!/usr/bin/env node
/**
 * phase-guard.js — PreToolUse hook：按当前工作流阶段限制 Write/Edit 的文件范围。
 *
 * 阶段标记：.claude/workflow-phase（由各阶段 skill 通过 Bash 写入/清除）
 *   discuss / plan / close → 只允许写 docs/planning/ 下的文件
 *   execute               → 禁止写 docs/planning/ 下的文件
 *   标记不存在            → 不限制
 *
 * 拦截方式：exit code 2 + stderr（阻止本次工具调用，消息反馈给 Claude）。
 * 只约束 repo 内的路径；repo 外（如 scratchpad、系统临时目录）不管。
 */
const fs = require("fs");
const path = require("path");

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let phase = "";
  try {
    // 容错各种编码（PowerShell 重定向可能写出 UTF-16 / BOM）：只保留字母
    phase = fs
      .readFileSync(path.join(root, ".claude", "workflow-phase"))
      .toString("utf8")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
  } catch {
    process.exit(0); // 无标记 → 不限制
  }

  const input = data.tool_input || {};
  const filePath = input.file_path || input.notebook_path;
  if (!phase || !filePath) process.exit(0);

  // Windows 大小写不敏感 + 反斜杠归一化
  const norm = (p) => path.resolve(root, p).replace(/\\/g, "/").toLowerCase();
  const rootN = norm(root).replace(/\/+$/, "") + "/";
  const fileN = norm(filePath);
  if (!fileN.startsWith(rootN)) process.exit(0); // repo 外不管

  const inPlanning = fileN.slice(rootN.length).startsWith("docs/planning/");
  const DOCS_ONLY = { discuss: "Discuss", plan: "Plan", close: "Close" };

  let msg = null;
  if (phase === "execute" && inPlanning) {
    msg =
      "[phase-guard] 当前处于 Execute 阶段，禁止修改 docs/planning/ 下的文件——文档更新是 Close 阶段的事。";
  } else if (DOCS_ONLY[phase] && !inPlanning) {
    msg = `[phase-guard] 当前处于 ${DOCS_ONLY[phase]} 阶段，只允许修改 docs/planning/ 下的文档，不允许改动代码或其他文件。`;
  }

  if (msg) {
    console.error(
      msg +
        "\n（若这是上个 session 残留的阶段标记，请手动清除：rm .claude/workflow-phase）"
    );
    process.exit(2);
  }
  process.exit(0);
});
