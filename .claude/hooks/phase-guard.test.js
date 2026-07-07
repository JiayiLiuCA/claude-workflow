#!/usr/bin/env node
/**
 * phase-guard.test.js — phase-guard.js 的自测。改动 guard 后必跑。
 * 用法：node .claude/hooks/phase-guard.test.js
 * 在系统临时目录搭 fixture 项目，逐用例喂 stdin JSON、断言退出码。
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const GUARD = path.join(__dirname, "phase-guard.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "phase-guard-test-"));
fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
const marker = path.join(root, ".claude", "workflow-phase");

function setMarker(value, encoding) {
  if (value === null) {
    fs.rmSync(marker, { force: true });
    return;
  }
  if (encoding === "utf16le") {
    // 模拟 PowerShell 重定向写出的 UTF-16LE + BOM
    fs.writeFileSync(marker, Buffer.from("﻿" + value, "utf16le"));
  } else {
    fs.writeFileSync(marker, value);
  }
}

function run(input) {
  return spawnSync(process.execPath, [GUARD], {
    input,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  }).status;
}

const j = (filePath, tool = "Write") =>
  JSON.stringify({ tool_name: tool, tool_input: { file_path: filePath } });
const abs = (rel) => path.join(root, rel);

// [名称, 标记值(null=无), 标记编码, stdin, 期望退出码]
const CASES = [
  ["无标记：写 planning 放行", null, undefined, j(abs("docs/planning/PIPELINE.md")), 0],
  ["execute：写 planning 拒绝（相对路径）", "execute", undefined, j("docs/planning/PROGRESS.md", "Edit"), 2],
  ["execute：写代码放行", "execute", undefined, j(abs("backend/app/main.py")), 0],
  ["plan：写代码拒绝（绝对路径反斜杠）", "plan", undefined, j(abs("backend\\app\\main.py")), 2],
  ["plan：写 plan 文档放行", "plan", undefined, j("docs/planning/STEPS/STEP_03_plan.md"), 0],
  ["plan：repo 外路径放行", "plan", undefined, j(path.join(os.tmpdir(), "scratch.md")), 0],
  ["discuss：写代码拒绝", "discuss", undefined, j(abs("src/foo.ts")), 2],
  ["close：写 planning 放行", "close", undefined, j(abs("docs/planning/PROGRESS.md")), 0],
  ["UTF-16 标记 close：写代码拒绝", "close", "utf16le", j(abs("src/foo.ts")), 2],
  ["非法 JSON：fail-open 放行", "execute", undefined, "{not json", 0],
];

let failed = 0;
for (const [name, phase, enc, input, expect] of CASES) {
  setMarker(phase, enc);
  const got = run(input);
  const ok = got === expect;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (expect ${expect}, got ${got})`);
}
fs.rmSync(root, { recursive: true, force: true });
console.log(failed ? `\n${failed} 个用例失败` : "\n全部通过");
process.exit(failed ? 1 : 0);
