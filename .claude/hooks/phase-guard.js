#!/usr/bin/env node
/**
 * phase-guard.js — PreToolUse hook：按当前工作流阶段限制文件写入范围。
 *
 * 阶段标记：.claude/workflow-phase（由各阶段 skill 通过 Bash 写入/清除）
 *   discuss / plan / close → 只允许写 docs/planning/ 下的文件
 *   execute               → 禁止写 docs/planning/ 下的文件
 *   标记不存在            → 不限制
 *
 * 覆盖的工具：
 *   - Write / Edit / MultiEdit / NotebookEdit：按 file_path / notebook_path 判断
 *   - Bash / PowerShell：从命令文本启发式提取「写入目标」再判断——
 *       重定向（> >> &> >|）、heredoc 首行、tee、sed -i、mv / cp / rm / touch / mkdir /
 *       truncate / dd of=、git rm / mv；PowerShell 的 Set-Content / Add-Content / Out-File /
 *       New-Item / Remove-Item / Move-Item / Copy-Item / Rename-Item / Clear-Content 等。
 *     auto 权限模式下 harness 会引导模型优先用 Bash 改文件，所以这一层不是可选项。
 *     启发式覆盖不了的写入（python -c / node -e 里的 fs 调用等）由 PostToolUse 的
 *     phase-audit.js 用 git status 兜底。
 *
 * 拦截方式：exit code 2 + stderr（阻止本次工具调用，消息反馈给 Claude）。
 * 只约束 repo 内的路径：repo 外（scratchpad、/tmp、/dev/null）与 .claude/workflow-phase 本身不管；
 * 含 $VAR / $(...) / ~ 等无法解析的路径 fail-open，但文本里出现 docs/planning 的一律按 planning 处理。
 */
const fs = require("fs");
const path = require("path");

const DOCS_ONLY = { discuss: "Discuss", plan: "Plan", close: "Close" };
const SEP = Symbol("sep"); // 命令分隔哨兵（; | || && 换行）
const REDIR = /^(\d*|&)>{1,2}\|?$/; // > >> 2> &> >|  → 下一个 token 是写入目标
const FDDUP = /^(\d*|&)>{1,2}&\d*$/; // 2>&1 >&2      → fd 复制，不是文件
const INPUT = /^\d*<{1,3}$/; // < << <<<        → 下一个 token 是输入 / heredoc 分隔符
const WRAPPERS = new Set(["sudo", "command", "builtin", "exec", "env", "nohup", "time", "nice", "xargs"]);

const PS_WRITE = new Set([
  "set-content", "sc", "add-content", "ac", "out-file", "new-item", "ni",
  "remove-item", "rm", "del", "ri", "rmdir", "rd", "erase",
  "move-item", "mv", "mi", "move", "copy-item", "cp", "ci", "copy",
  "rename-item", "ren", "rni", "clear-content", "clc", "set-item", "si",
  "tee-object", "tee", "export-csv", "export-clixml", "set-itemproperty",
]);
const PS_PATH_PARAM = /^-(path|literalpath|filepath|destination|newname|target|outfile)$/i;
const PS_SWITCH = /^-(force|recurse|confirm|whatif|append|noclobber|passthru|nonewline|verbose|debug|asbytestream|raw|container)$/i;

// ---------- 通用 ----------
function readPhase(root) {
  try {
    // 容错各种编码（PowerShell 重定向可能写出 UTF-16 / BOM）：只保留字母
    return fs
      .readFileSync(path.join(root, ".claude", "workflow-phase"))
      .toString("utf8")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
  } catch {
    return "";
  }
}

const unq = (t) => String(t).trim().replace(/^(["'])([\s\S]*)\1$/, "$2");

/** 路径分类："planning" | "code" | "ignore"（repo 外 / 标记文件 / 无法判断） */
function classify(rawToken, root) {
  const t = unq(rawToken);
  if (!t || t === "-") return "ignore";
  let n = t.replace(/\\/g, "/");
  const lower = n.toLowerCase();
  if (lower.includes(".claude/workflow-phase")) return "ignore";
  if (/(^|\/)docs\/planning(\/|$)/.test(lower)) return "planning";
  if (/[$`~]/.test(n)) return "ignore"; // 变量 / 命令替换 / home 展开：无法确定
  if (/^\/(dev|tmp|proc|sys)(\/|$)/.test(lower)) return "ignore";
  if (process.platform === "win32") n = n.replace(/^\/([a-zA-Z])\//, "$1:/"); // MSYS 风格 /d/foo
  const isAbs = /^[a-zA-Z]:\//.test(n) || n.startsWith("/");
  const resolved = (isAbs ? path.resolve(n) : path.resolve(root, n)).replace(/\\/g, "/").toLowerCase();
  const rootN = path.resolve(root).replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") + "/";
  if (!resolved.startsWith(rootN)) return "ignore";
  const rel = resolved.slice(rootN.length);
  return rel === "docs/planning" || rel.startsWith("docs/planning/") ? "planning" : "code";
}

function judge(phase, kind, target) {
  if (phase === "execute" && kind === "planning") {
    return `[phase-guard] 当前处于 Execute 阶段，禁止修改 docs/planning/ 下的文件（目标：${target}）——文档更新是 Close 阶段的事。`;
  }
  if (DOCS_ONLY[phase] && kind === "code") {
    return `[phase-guard] 当前处于 ${DOCS_ONLY[phase]} 阶段，只允许修改 docs/planning/ 下的文档，不允许改动代码或其他文件（目标：${target}）。`;
  }
  return null;
}

// ---------- 命令解析 ----------
/** 反斜杠续行合并；heredoc 只保留首行（重定向目标在首行），正文跳过 */
function stripHeredocs(command) {
  const lines = command.replace(/\\\r?\n/g, " ").split(/\r?\n/);
  const out = [];
  let delim = null;
  for (const line of lines) {
    if (delim !== null) {
      if (line.trim() === delim) delim = null;
      continue;
    }
    out.push(line);
    const m = line.match(/<<-?\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))/);
    if (m) delim = m[1] || m[2] || m[3];
  }
  return out.join("\n");
}

/** 按空白切 token，保留引号；; | || && 换行 → SEP；重定向符独立成 token。
 *  escapes：bash 里反斜杠是转义符；PowerShell 里是路径分隔符，不转义 */
function tokenize(text, escapes = true) {
  const out = [];
  let cur = "";
  let has = false;
  let quote = null;
  const flush = () => {
    if (has) out.push(cur);
    cur = "";
    has = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (escapes && c === "\\" && n !== undefined) {
      cur += n;
      has = true;
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      cur += c;
      has = true;
      continue;
    }
    if (c === "\n" || c === ";") {
      flush();
      out.push(SEP);
      continue;
    }
    if (c === "|") {
      flush();
      out.push(SEP);
      if (n === "|") i++;
      continue;
    }
    if (c === "&" && n === "&") {
      flush();
      out.push(SEP);
      i++;
      continue;
    }
    if (c === ">" || c === "<") {
      let op = "";
      if (/^\d+$/.test(cur) || cur === "&") {
        op = cur;
        cur = "";
        has = false;
      } else {
        flush();
      }
      op += c;
      while (text[i + 1] === c) {
        op += c;
        i++;
      }
      if (c === ">" && text[i + 1] === "&") {
        op += "&";
        i++;
        while (/\d/.test(text[i + 1] || "")) op += text[++i];
      } else if (c === ">" && text[i + 1] === "|") {
        op += "|";
        i++;
      }
      out.push(op);
      continue;
    }
    if (/\s/.test(c)) {
      flush();
      continue;
    }
    cur += c;
    has = true;
  }
  flush();
  return out;
}

function splitSegments(tokens) {
  const segs = [[]];
  for (const t of tokens) {
    if (t === SEP) segs.push([]);
    else segs[segs.length - 1].push(t);
  }
  return segs.filter((s) => s.length);
}

/** 取出重定向目标，返回其余参数 */
function extractRedirects(seg, targets) {
  const args = [];
  for (let i = 0; i < seg.length; i++) {
    const tok = seg[i];
    if (FDDUP.test(tok)) continue;
    if (REDIR.test(tok)) {
      if (seg[i + 1] !== undefined) {
        targets.push(seg[i + 1]);
        i++;
      }
      continue;
    }
    if (INPUT.test(tok)) {
      i++;
      continue;
    }
    args.push(tok);
  }
  return args;
}

function bashSegmentTargets(seg) {
  const targets = [];
  const args = extractRedirects(seg, targets);
  while (args.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0]) || WRAPPERS.has(args[0]))) args.shift();
  if (!args.length) return targets;
  const cmd = path.posix.basename(unq(args[0]).replace(/\\/g, "/")).toLowerCase();
  const rest = args.slice(1);
  const nonOpt = rest.filter((a) => !a.startsWith("-"));
  switch (cmd) {
    case "tee":
      targets.push(...nonOpt);
      break;
    case "sed": {
      const inPlace =
        rest.some((a) => /^-[a-zA-Z]*i/.test(a) && !a.startsWith("--")) ||
        rest.some((a) => a.startsWith("--in-place"));
      if (!inPlace) break;
      const scriptOpt = rest.some((a) => /^-(?!i)[a-zA-Z]*[ef]$/.test(a) || /^--(expression|file)/.test(a));
      let files = nonOpt;
      if (!scriptOpt) files = unq(files[0] || "x") === "" ? files.slice(2) : files.slice(1); // 跳过脚本（macOS 的 -i '' 也跳）
      targets.push(...files);
      break;
    }
    case "mv": // 源被移走、目标被写入：都算改动
      targets.push(...nonOpt);
      break;
    case "cp":
    case "rsync":
    case "install":
    case "ln":
      if (nonOpt.length >= 2) targets.push(nonOpt[nonOpt.length - 1]);
      break;
    case "rm":
    case "rmdir":
    case "unlink":
    case "touch":
    case "mkdir":
    case "truncate":
    case "shred":
      targets.push(...nonOpt);
      break;
    case "dd":
      targets.push(...rest.filter((a) => a.startsWith("of=")).map((a) => a.slice(3)));
      break;
    case "git": {
      // restore / checkout -- / clean 只回到已提交状态，不算写入（audit 提示回滚时要能用）
      const sub = nonOpt[0];
      if (sub === "rm" || sub === "mv") targets.push(...nonOpt.slice(1));
      break;
    }
    default:
      break;
  }
  return targets;
}

function bashTargets(command) {
  const targets = [];
  for (const seg of splitSegments(tokenize(stripHeredocs(command)))) targets.push(...bashSegmentTargets(seg));
  return targets;
}

const looksLikePath = (t) => {
  const u = unq(t);
  return /[\\/]/.test(u) || /\.[A-Za-z0-9]{1,8}$/.test(u);
};

function psSegmentTargets(seg) {
  const targets = [];
  const args = extractRedirects(seg, targets);
  if (!args.length) return targets;
  const cmd = unq(args[0]).toLowerCase();
  if (!PS_WRITE.has(cmd)) return targets;
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("-")) {
      if (PS_PATH_PARAM.test(a)) {
        if (rest[i + 1] !== undefined) {
          targets.push(rest[i + 1]);
          i++;
        }
      } else if (!PS_SWITCH.test(a) && rest[i + 1] !== undefined && !rest[i + 1].startsWith("-")) {
        i++; // 带值参数（-Value / -Encoding / -ItemType …）：跳过其值
      }
      continue;
    }
    if (looksLikePath(a)) targets.push(a);
  }
  return targets;
}

function psTargets(command) {
  // here-string 正文（@'…'@ / @"…"@）不当命令解析
  const stripped = command.replace(/@'[\s\S]*?\n'@/g, "''").replace(/@"[\s\S]*?\n"@/g, '""');
  const targets = [];
  for (const seg of splitSegments(tokenize(stripped, false))) targets.push(...psSegmentTargets(seg));
  return targets;
}

// ---------- 入口 ----------
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
  const phase = readPhase(root);
  if (!phase) process.exit(0); // 无标记 → 不限制

  const input = data.tool_input || {};
  const tool = data.tool_name || "";
  let targets = [];
  let how = "";

  if (tool === "Bash" || tool === "PowerShell") {
    if (typeof input.command !== "string") process.exit(0);
    targets = tool === "Bash" ? bashTargets(input.command) : psTargets(input.command);
    how = `${tool} 命令：${input.command.replace(/\s+/g, " ").slice(0, 160)}`;
  } else {
    const filePath = input.file_path || input.notebook_path;
    if (!filePath) process.exit(0);
    targets = [filePath];
    how = `${tool} ${filePath}`;
  }

  for (const t of targets) {
    const msg = judge(phase, classify(t, root), unq(t));
    if (msg) {
      console.error(
        `${msg}\n（${how}）\n不要换用其他写法绕过阶段边界。若这是上个 session 残留的阶段标记，请手动清除：rm .claude/workflow-phase`
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
