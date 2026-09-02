#!/usr/bin/env node
/**
 * phase-audit.test.js — phase-audit.js 的自测。改动 audit 后必跑。
 * 用法：node .claude/hooks/phase-audit.test.js
 * 在系统临时目录 git init 一个 fixture repo，按阶段制造工作树改动，断言退出码与去重行为。
 */
const { spawnSync, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const AUDIT = path.join(__dirname, "phase-audit.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "phase-audit-test-"));
const marker = path.join(root, ".claude", "workflow-phase");
const state = marker + ".audit";

const git = (...args) => execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"] });
const write = (rel, content) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
const setMarker = (v) => (v === null ? fs.rmSync(marker, { force: true }) : write(".claude/workflow-phase", v));
const run = () => spawnSync(process.execPath, [AUDIT], { env: { ...process.env, CLAUDE_PROJECT_DIR: root } }).status;

// fixture repo
git("init", "-q");
git("config", "user.email", "t@t");
git("config", "user.name", "t");
git("config", "core.autocrlf", "false");
write(".gitignore", ".claude/workflow-phase*\n");
write("docs/planning/PIPELINE.md", "# pipeline\n");
write(".claude/rules/backend.md", "# backend rules\n");
write("src/a.ts", "export const a = 1;\n");
git("add", "-A");
git("commit", "-q", "-m", "init");

let failed = 0;
let total = 0;
const check = (name, expect, got) => {
  total++;
  const ok = got === expect;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (expect ${expect}, got ${got})`);
};

setMarker("execute");
check("execute：工作树干净放行", 0, run());
write("docs/planning/PIPELINE.md", "# pipeline\nchanged\n");
check("execute：planning 被改 → 报告", 2, run());
check("execute：同一改动第二次 → 去重静默", 0, run());
setMarker("plan");
check("plan：同一 planning 改动 → 允许", 0, run());
check("plan：允许时清掉审计状态", false, fs.existsSync(state));
write("src/a.ts", "export const a = 2;\n");
check("plan：代码被改 → 报告", 2, run());
check("plan：同一改动第二次 → 去重静默", 0, run());
write("src/new.ts", "export const b = 1;\n");
check("plan：新增未跟踪代码文件（集合变化）→ 再报告", 2, run());
setMarker("close");
check("close：换阶段同一集合 → 再报告", 2, run());
git("checkout", "--", "src/a.ts", "docs/planning/PIPELINE.md");
fs.rmSync(path.join(root, "src/new.ts"));
check("close：全部回滚后放行", 0, run());
setMarker("execute");
write("src/a.ts", "export const a = 3;\n");
check("execute：只改代码放行", 0, run());
git("checkout", "--", "src/a.ts");
write(".claude/rules/backend.md", "# backend rules\nchanged\n");
check("execute：改 .claude/rules → 报告", 2, run());
setMarker("plan");
check("plan：改 .claude/rules → 允许", 0, run());
setMarker("roadmap");
write("src/a.ts", "export const a = 4;\n");
check("roadmap：改代码 → 报告", 2, run());
git("checkout", "--", "src/a.ts", ".claude/rules/backend.md");
setMarker(null);
write("docs/planning/PIPELINE.md", "# pipeline\nchanged again\n");
check("无标记：放行", 0, run());

fs.rmSync(root, { recursive: true, force: true });
console.log(failed ? `\n${failed} 个用例失败（共 ${total}）` : `\n全部通过（${total} 用例）`);
process.exit(failed ? 1 : 0);
