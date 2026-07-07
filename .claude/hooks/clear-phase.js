#!/usr/bin/env node
/**
 * clear-phase.js — SessionStart hook（matcher: startup|clear）：
 * 新会话开始时清除上个 session 残留的阶段标记，避免 phase-guard 误拦。
 * resume / compact 不触发（会话仍在阶段中，标记有效）。
 * 静默执行：SessionStart 的 stdout 会注入 context，成功时不输出任何内容。
 */
const fs = require("fs");
const path = require("path");
try {
  fs.rmSync(
    path.join(
      process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      ".claude",
      "workflow-phase"
    ),
    { force: true }
  );
} catch {}
process.exit(0);
