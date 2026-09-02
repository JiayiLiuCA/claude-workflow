#!/usr/bin/env node
/**
 * phase-audit.js — PostToolUse hook（matcher: Bash|PowerShell）：阶段纪律兜底审计。
 *
 * phase-guard 对 Bash / PowerShell 的拦截是启发式的（解析不了 python -c / node -e 之类的写入），
 * 本 hook 在每次命令执行后用 git status 核对工作树：
 *   execute               → docs/planning/ 下不应有任何未提交改动
 *   discuss / plan / close → docs/planning/ 之外不应有任何未提交改动
 * 发现越界：stderr 报告 + exit 2（PostToolUse 无法撤销，但消息会反馈给 Claude，要求其立即回滚）。
 * 同一组文件只报告一次（状态存 .claude/workflow-phase.audit，gitignored），
 * 既有未提交改动 / 构建产物不会每次命令都刷屏；文件集变化时再报。
 * 标记不存在 / 不是 git repo / git 失败 → 静默放行。
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DOCS_ONLY = { discuss: "Discuss", plan: "Plan", close: "Close" };
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const markerPath = path.join(root, ".claude", "workflow-phase");
const statePath = markerPath + ".audit";

let phase = "";
try {
  phase = fs.readFileSync(markerPath).toString("utf8").toLowerCase().replace(/[^a-z]/g, "");
} catch {
  process.exit(0);
}
if (phase !== "execute" && !DOCS_ONLY[phase]) process.exit(0);

let out = "";
try {
  out = execFileSync("git", ["status", "--porcelain", "-uall", "--no-renames"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  process.exit(0);
}

const files = out
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => {
    let p = l.slice(3).trim();
    if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
    return p.replace(/\\/g, "/");
  })
  .filter((p) => !p.startsWith(".claude/workflow-phase")); // 标记与审计状态本身不算

const inPlanning = (p) => p.startsWith("docs/planning/");
const bad = (phase === "execute" ? files.filter(inPlanning) : files.filter((p) => !inPlanning(p))).sort();

if (!bad.length) {
  try {
    fs.rmSync(statePath, { force: true });
  } catch {}
  process.exit(0);
}

const key = JSON.stringify({ phase, bad });
let prev = "";
try {
  prev = fs.readFileSync(statePath, "utf8");
} catch {}
if (prev === key) process.exit(0);
try {
  fs.writeFileSync(statePath, key);
} catch {}

const list =
  bad.slice(0, 20).map((f) => `  - ${f}`).join("\n") + (bad.length > 20 ? `\n  …共 ${bad.length} 个文件` : "");
const rollback = "（已跟踪文件 `git restore <文件>`；新文件 `git clean -f -- <文件>`）";
const msg =
  phase === "execute"
    ? `[phase-audit] Execute 阶段检测到 docs/planning/ 下存在未提交改动：\n${list}\n文档更新是 Close 阶段的事。若这是你刚才的命令造成的，立即回滚${rollback}后再继续；若是既有改动或用户手动所为，如实向用户说明后继续，不要动它们。`
    : `[phase-audit] ${DOCS_ONLY[phase]} 阶段检测到 docs/planning/ 之外存在未提交改动：\n${list}\n本阶段只允许修改 docs/planning/ 下的文档。若这是你刚才的命令造成的，立即回滚${rollback}后再继续；若是既有改动、构建产物或用户手动所为，如实向用户说明后继续，不要动它们。`;
console.error(msg);
process.exit(2);
