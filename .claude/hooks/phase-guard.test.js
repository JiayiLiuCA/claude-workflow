#!/usr/bin/env node
/**
 * phase-guard.test.js — phase-guard.js 的自测。改动 guard 后必跑。
 * 用法：node .claude/hooks/phase-guard.test.js
 * 在系统临时目录搭 fixture 项目，逐用例喂 stdin JSON、断言退出码。
 * 覆盖：Write/Edit 路径判断、Bash 写入启发式（重定向 / heredoc / tee / sed -i / mv / mkdir / git rm）、
 *       PowerShell cmdlet、变量路径 fail-open、标记文件豁免。
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
const b = (command, tool = "Bash") => JSON.stringify({ tool_name: tool, tool_input: { command } });
const abs = (rel) => path.join(root, rel);

// [名称, 标记值(null=无), 标记编码, stdin, 期望退出码]
const CASES = [
  // ---- Write / Edit ----
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
  // ---- Bash ----
  ["无标记：Bash 写 planning 放行", null, undefined, b("echo x > docs/planning/X.md"), 0],
  ["execute：Bash 重定向写 planning 拒绝", "execute", undefined, b("printf 'x' > docs/planning/PROGRESS.md"), 2],
  ["execute：Bash 追加写 planning 拒绝（绝对路径）", "execute", undefined, b(`echo x >> "${abs("docs/planning/PIPELINE.md")}"`), 2],
  ["execute：Bash heredoc 写 planning 拒绝", "execute", undefined, b("cat <<'EOF' > docs/planning/pipeline/ocr.md\nhello\nEOF"), 2],
  ["execute：Bash sed -i 改 planning 拒绝", "execute", undefined, b("sed -i 's/a/b/' docs/planning/PIPELINE.md"), 2],
  ["execute：Bash mkdir planning 子目录拒绝", "execute", undefined, b("mkdir -p docs/planning/pipeline"), 2],
  ["execute：git rm planning 拒绝", "execute", undefined, b("git rm docs/planning/pipeline/ocr.md"), 2],
  ["execute：git restore planning 放行（回滚不算写入）", "execute", undefined, b("git restore docs/planning/PROGRESS.md"), 0],
  ["execute：Bash 读 planning、写 /tmp 放行", "execute", undefined, b("cat docs/planning/PIPELINE.md | grep foo > /tmp/out.txt"), 0],
  ["execute：Bash 写代码放行", "execute", undefined, b("echo 'x' >> src/foo.ts && pnpm test"), 0],
  ["execute：commit message 提到 planning 放行", "execute", undefined, b('git add -A && git commit -m "Step 3 Execute: 按 docs/planning/STEPS 实现"'), 0],
  ["plan：写阶段标记放行", "plan", undefined, b("printf 'plan' > \"$(git rev-parse --show-toplevel)/.claude/workflow-phase\""), 0],
  ["plan：清阶段标记放行", "plan", undefined, b("rm -f \"$(git rev-parse --show-toplevel)/.claude/workflow-phase\""), 0],
  ["plan：heredoc 正文不当命令解析", "plan", undefined, b("cat <<'EOF' > docs/planning/STEPS/STEP_03_plan.md\nrm -rf src\necho x > src/a.ts\nEOF"), 0],
  ["plan：Bash 追加写代码拒绝", "plan", undefined, b("echo 'x' >> src/foo.ts"), 2],
  ["plan：Bash tee 写 plan 文档放行", "plan", undefined, b("cat notes.txt | tee docs/planning/STEPS/STEP_03_plan.md"), 0],
  ["plan：Bash tee 写代码拒绝", "plan", undefined, b("echo x | tee src/a.ts"), 2],
  ["plan：git 分支 / commit 放行", "plan", undefined, b("git fetch origin && git checkout -b feat/step-03-x origin/main && git commit -m 'Step 3 Plan: x'"), 0],
  ["plan：测试命令放行（2>/dev/null）", "plan", undefined, b("cd backend && pytest -q 2>/dev/null"), 0],
  ["plan：mkdir planning 子目录放行", "plan", undefined, b("mkdir -p docs/planning/pipeline"), 0],
  ["close：Bash mv 代码拒绝", "close", undefined, b("mv src/a.ts src/b.ts"), 2],
  ["close：Bash cp 到 planning 放行", "close", undefined, b("cp /tmp/draft.md docs/planning/pipeline/ocr.md"), 0],
  ["discuss：Bash 变量路径 fail-open", "discuss", undefined, b('echo x > "$OUT/file.txt"'), 0],
  ["discuss：Bash rm 代码拒绝", "discuss", undefined, b("rm -rf src/old"), 2],
  // ---- PowerShell ----
  ["execute：PowerShell Set-Content planning 拒绝", "execute", undefined, b("Set-Content -Path docs\\planning\\PROGRESS.md -Value 'x'", "PowerShell"), 2],
  ["execute：PowerShell 重定向 planning 拒绝", "execute", undefined, b("'x' > docs\\planning\\PROGRESS.md", "PowerShell"), 2],
  ["plan：PowerShell Out-File 代码拒绝", "plan", undefined, b("'x' | Out-File src\\a.ts", "PowerShell"), 2],
  ["plan：PowerShell Remove-Item 代码拒绝", "plan", undefined, b("Remove-Item -Recurse -Force src\\old", "PowerShell"), 2],
  ["plan：PowerShell 读取放行", "plan", undefined, b("Get-Content src\\a.ts | Select-String foo", "PowerShell"), 0],
  ["plan：PowerShell here-string 正文不当命令解析", "plan", undefined, b("@'\nrm src/a.ts\n'@ | Set-Content docs\\planning\\PIPELINE.md", "PowerShell"), 0],
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
console.log(failed ? `\n${failed} 个用例失败（共 ${CASES.length}）` : `\n全部通过（${CASES.length} 用例）`);
process.exit(failed ? 1 : 0);
