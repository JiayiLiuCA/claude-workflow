#!/usr/bin/env node
/**
 * announce-phase.js — SessionStart hook（matcher: resume|compact）：
 * 续接会话 / 上下文压缩后，若阶段标记仍在，把当前阶段播报进 context。
 * Claude Code 不会在后续 turn 重读 skill 文件，compaction 后阶段 skill 的完整指令可能已丢失，
 * 所以提示模型重新调用对应 skill 再继续。
 * SessionStart 的 stdout 会注入 context；无标记时不输出任何内容。
 * 与 clear-phase.js 互补：startup / clear 清标记，resume / compact 播报标记。
 */
const fs = require("fs");
const path = require("path");

const SKILL = { discuss: "discuss-step", plan: "plan-step", execute: "execute-step", close: "close-step", roadmap: "roadmap" };
const NAME = { discuss: "Discuss", plan: "Plan", execute: "Execute", close: "Close", roadmap: "Roadmap" };

let phase = "";
try {
  phase = fs
    .readFileSync(path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), ".claude", "workflow-phase"))
    .toString("utf8")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
} catch {
  process.exit(0);
}
if (!SKILL[phase]) process.exit(0);

const rule =
  phase === "execute"
    ? "禁止写文档（docs/planning/ 与 .claude/rules/），hook 仍在强制"
    : "只允许写文档（docs/planning/ 与 .claude/rules/），hook 仍在强制";
console.log(
  `[workflow] 当前仍处于 ${NAME[phase]} 阶段（.claude/workflow-phase 标记存在），本会话是续接 / 压缩后的会话，${SKILL[phase]} skill 的完整指令可能已不在 context 中。` +
    `继续之前先重新调用 /${SKILL[phase]}（带上原来的 step 参数），按其「续接」说明从中断处接着推进；` +
    `若该阶段实际已经结束，执行 rm .claude/workflow-phase 清除标记。当前规则：${rule}。`
);
process.exit(0);
