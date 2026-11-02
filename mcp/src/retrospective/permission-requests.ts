import { createHash } from "node:crypto";

export type ParsedPermissionRequest = {
  requestId: string;
  agent: string;
  tool: string;
  program: string | null;
  kind: string;
  command: string | null;
};

export const MAX_COMMAND_CHARS = 2000;

const KIND_REGEX = /^[A-Za-z0-9._ -]{1,32}$/;

/** C0 and C1 control characters excluding \t (0x09) and \n (0x0a). */
const CONTROL_CHARACTERS_EXCEPT_NL_TAB = new RegExp(
  `[${String.fromCharCode(0x00)}-${String.fromCharCode(0x08)}${String.fromCharCode(0x0b)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}-${String.fromCharCode(0x9f)}]`,
  "g",
);

const ENV_NAME_SENSITIVE_REGEX =
  /(?:KEY|TOKEN|SECRET|PASSW(?:OR)?D|CREDENTIAL|AUTH|COOKIE|SESSION)/i;

const ENV_ASSIGNMENT_CAPTURE_REGEX =
  /(?<=^|[\s"';])([A-Za-z_][A-Za-z0-9_]{0,127})=("[^"\n]{0,2000}"|'[^'\n]{0,2000}'|\S{1,2000})/g;

const SENSITIVE_FLAGS_REGEX =
  /(?<=^|[\s"';])(--(?:password|passwd|token|secret|api-key|apikey|auth|credentials))(=| )("[^"\n]{0,2000}"|'[^'\n]{0,2000}'|\S{1,2000})/g;

const SENSITIVE_HEADERS_REGEX =
  /(?<=^|[\s"'])((?:Authorization|Proxy-Authorization|X-Api-Key|X-Auth-Token|Cookie|Set-Cookie):)[ \t]*([^"'\r\n]+)/gi;

const BEARER_TOKEN_REGEX = /(?<=^|[\s"'])Bearer[ \t]+([^\s"'\r\n]{1,2000})/gi;

const URL_USERINFO_REGEX =
  /([A-Za-z][A-Za-z0-9+.-]{0,31}:\/\/)(?:[^/\s@"']{1,256})@/g;

const SK_TOKEN_REGEX =
  /(?<=^|[^A-Za-z0-9_-])sk-[A-Za-z0-9_-]{16,256}(?![A-Za-z0-9_-])/g;

const GH_TOKEN_REGEX =
  /(?<=^|[^A-Za-z0-9_])gh[pousr]_[A-Za-z0-9]{20,256}(?![A-Za-z0-9])/g;

const GH_PAT_REGEX =
  /(?<=^|[^A-Za-z0-9_])github_pat_[A-Za-z0-9_]{20,256}(?![A-Za-z0-9_])/g;

const AKIA_REGEX = /(?<=^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}(?![0-9A-Z])/g;

const SLACK_TOKEN_REGEX =
  /(?<=^|[^A-Za-z0-9-])xox[abprs]-[A-Za-z0-9-]{10,256}(?![A-Za-z0-9-])/g;

const JWT_REGEX =
  /(?<=^|[^A-Za-z0-9_.-])eyJ[A-Za-z0-9_-]{5,1000}\.[A-Za-z0-9_-]{5,1000}\.[A-Za-z0-9_-]{5,1000}(?![A-Za-z0-9_.-])/g;

const GENERIC_SECRET_RUN_REGEX =
  /(?<![A-Za-z0-9+_=-])[A-Za-z0-9+_=-]{40,4000}(?![A-Za-z0-9+_=-])/g;

/**
 * Redacts secrets from command text per Contract v3.4 Section 2.
 * Pure, bounded, linear-time, never throws.
 */
export function redactCommand(text: string): string {
  if (typeof text !== "string") {
    return "";
  }

  // 1. Input beyond 4000 chars is cut first
  let sanitized = text.length > 4000 ? text.slice(0, 4000) : text;

  // Replace control characters except \n and \t with a space
  sanitized = sanitized.replace(CONTROL_CHARACTERS_EXCEPT_NL_TAB, " ");

  // 2. Secret redactions
  // Environment assignments NAME=value
  sanitized = sanitized.replace(
    ENV_ASSIGNMENT_CAPTURE_REGEX,
    (match, name: string) => {
      if (ENV_NAME_SENSITIVE_REGEX.test(name)) {
        return `${name}=[redacted]`;
      }
      return match;
    },
  );

  // Flags
  sanitized = sanitized.replace(SENSITIVE_FLAGS_REGEX, "$1$2[redacted]");

  // HTTP header values
  sanitized = sanitized.replace(SENSITIVE_HEADERS_REGEX, "$1 [redacted]");

  // Bearer <token>
  sanitized = sanitized.replace(BEARER_TOKEN_REGEX, "Bearer [redacted]");

  // URL userinfo
  sanitized = sanitized.replace(URL_USERINFO_REGEX, "$1[redacted]@");

  // Known token shapes
  sanitized = sanitized.replace(SK_TOKEN_REGEX, "[redacted]");
  sanitized = sanitized.replace(GH_TOKEN_REGEX, "[redacted]");
  sanitized = sanitized.replace(GH_PAT_REGEX, "[redacted]");
  sanitized = sanitized.replace(AKIA_REGEX, "[redacted]");
  sanitized = sanitized.replace(SLACK_TOKEN_REGEX, "[redacted]");
  sanitized = sanitized.replace(JWT_REGEX, "[redacted]");

  // Any other run of 40+ chars from [A-Za-z0-9+_=-] that looks random: it has a digit and
  // either an uppercase letter or is pure hex. Slash-separated path segments and long
  // lowercase identifiers (route names, file names) are kept so the command stays reviewable.
  sanitized = sanitized.replace(GENERIC_SECRET_RUN_REGEX, (run) =>
    /[0-9]/.test(run) && (/[A-Z]/.test(run) || /^[0-9a-f]+$/.test(run))
      ? "[redacted]"
      : run,
  );

  // 3. Length ceiling
  if (sanitized.length > MAX_COMMAND_CHARS) {
    let cutLen = MAX_COMMAND_CHARS;
    const highSurrogate = sanitized.charCodeAt(cutLen - 1);
    if (highSurrogate >= 0xd800 && highSurrogate <= 0xdbff) {
      cutLen -= 1;
    }
    sanitized = sanitized.slice(0, cutLen) + "…[truncated]";
  }

  return sanitized;
}

const SAFE_PROGRAM_REGEX = /^[a-z0-9][a-z0-9._+-]{0,31}$/;
const ENV_ASSIGNMENT_REGEX = /^[A-Za-z_][A-Za-z0-9_]*=/;
const REQUEST_ID_REGEX = /^[A-Za-z0-9-]{1,64}$/;
const VALID_AGENT_ID_REGEX = /^[A-Za-z0-9-]{8,128}$/;
const TOOL_NAME_REGEX = /^[A-Za-z0-9._ -]{1,32}$/;
const DURATION_REGEX = /^[0-9]+(\.[0-9]+)?[smhd]?$/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripDir(path: string): string {
  const slashIdx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return slashIdx !== -1 ? path.slice(slashIdx + 1) : path;
}

/**
 * Derives a sanitized program word from a command description per Contract v3.3 Section 2.2.
 * The privacy rule for programWord is the core boundary: only a short safe token or "other"
 * is ever returned, never command text, arguments, paths or secrets.
 */
export function programWord(description: string): string {
  if (typeof description !== "string") {
    return "other";
  }

  let str = description.trim();
  if (str.startsWith("Command:")) {
    str = str.slice("Command:".length).trim();
  }
  if (!str) {
    return "other";
  }

  const rawTokens = str.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.slice(0, 64);
  if (tokens.length === 0) {
    return "other";
  }

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // 1. Environment assignments
    if (ENV_ASSIGNMENT_REGEX.test(token)) {
      i++;
      continue;
    }

    // 2. rtk proxy wrapper pair (lone rtk not followed by proxy stays as program)
    if (token === "rtk" && i + 1 < tokens.length && tokens[i + 1] === "proxy") {
      i += 2;
      continue;
    }

    const baseToken = stripDir(token);

    // 3. env with its options (-i, -u NAME, -S, any token starting with - while skipping env)
    if (baseToken === "env") {
      i++;
      while (i < tokens.length) {
        const opt = tokens[i];
        if (opt === "-u" || opt === "--unset") {
          i++;
          if (i < tokens.length) {
            i++;
          }
        } else if (opt.startsWith("-")) {
          i++;
        } else {
          break;
        }
      }
      continue;
    }

    // 4. command, nohup, time, timeout followed by a number/duration token
    if (baseToken === "command") {
      i++;
      while (i < tokens.length && tokens[i].startsWith("-")) {
        i++;
      }
      continue;
    }

    if (baseToken === "nohup") {
      i++;
      continue;
    }

    if (baseToken === "time") {
      i++;
      while (i < tokens.length && tokens[i].startsWith("-")) {
        i++;
      }
      continue;
    }

    if (baseToken === "timeout") {
      let next = i + 1;
      while (next < tokens.length && tokens[next].startsWith("-")) {
        const hasSeparateValue =
          tokens[next] === "-k" ||
          tokens[next] === "-s" ||
          tokens[next] === "--kill-after" ||
          tokens[next] === "--signal";
        next += hasSeparateValue ? 2 : 1;
      }
      if (next < tokens.length && DURATION_REGEX.test(tokens[next])) {
        i = next + 1;
        continue;
      }
    }

    // First remaining token is the program
    break;
  }

  if (i >= tokens.length) {
    return "other";
  }

  const candidate = stripDir(tokens[i]).toLowerCase();

  // sudo, sh, bash, zsh, node, python3 stay as the program (inner command not examined)
  if (SAFE_PROGRAM_REGEX.test(candidate)) {
    return candidate;
  }

  return "other";
}

/**
 * Parses a permission request from notification message text per Contract v3.3 Section 2.1.
 */
export function parsePermissionRequestMessage(
  text: string,
): ParsedPermissionRequest | null {
  if (typeof text !== "string") {
    return null;
  }

  const scanned = text.length > 200_000 ? text.slice(0, 200_000) : text;

  // Quick reject unless text includes event="permission-required" or needs permission
  if (
    !scanned.includes('event="permission-required"') &&
    !scanned.includes("needs permission")
  ) {
    return null;
  }

  const eventMatch = scanned.match(/event="([^"]+)"/);
  if (eventMatch && eventMatch[1] !== "permission-required") {
    return null;
  }

  // Decode only when the block is HTML-escaped; a raw message is taken as is, so entity-like
  // text inside a raw command is never decoded. `&amp;` is unescaped LAST so an escaped
  // ampersand cannot be decoded twice (`&amp;lt;` stays the literal text `&lt;`).
  const openTag = "<permission-request>";
  const closeTag = "</permission-request>";
  let unescaped: string;
  if (scanned.includes(openTag)) {
    unescaped = scanned;
  } else if (scanned.includes("&lt;permission-request&gt;")) {
    unescaped = scanned
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  } else {
    return null;
  }

  const startIdx = unescaped.indexOf(openTag);
  if (startIdx === -1) {
    return null;
  }

  // A command may itself contain the close tag: try each close tag in turn (bounded) until
  // the text between parses as JSON, so such a request is not silently dropped.
  const jsonStart = startIdx + openTag.length;
  let parsed: unknown;
  let parsedOk = false;
  let searchFrom = jsonStart;
  for (let attempt = 0; attempt < 8 && !parsedOk; attempt++) {
    const endIdx = unescaped.indexOf(closeTag, searchFrom);
    if (endIdx === -1) {
      break;
    }
    try {
      parsed = JSON.parse(unescaped.slice(jsonStart, endIdx).trim());
      parsedOk = true;
    } catch {
      searchFrom = endIdx + closeTag.length;
    }
  }
  if (!parsedOk) {
    return null;
  }

  if (!isObject(parsed)) {
    return null;
  }

  const reqObj = isObject(parsed.request) ? parsed.request : null;

  let requestId: string | null = null;
  if (
    typeof parsed.requestId === "string" &&
    REQUEST_ID_REGEX.test(parsed.requestId)
  ) {
    requestId = parsed.requestId;
  } else if (
    reqObj !== null &&
    typeof reqObj.id === "string" &&
    REQUEST_ID_REGEX.test(reqObj.id)
  ) {
    requestId = reqObj.id;
  }

  if (!requestId) {
    return null;
  }

  let agent: string;
  const rawAgentId = parsed.agentId;
  if (typeof rawAgentId === "string" && VALID_AGENT_ID_REGEX.test(rawAgentId)) {
    agent = rawAgentId.slice(0, 8);
  } else {
    const digest = createHash("sha256")
      .update(String(rawAgentId))
      .digest("hex")
      .slice(0, 8);
    agent = `agent-${digest}`;
  }

  let tool = "other";
  if (
    reqObj !== null &&
    typeof reqObj.name === "string" &&
    TOOL_NAME_REGEX.test(reqObj.name)
  ) {
    tool = reqObj.name;
  }

  let program: string | null = null;
  if (tool === "bash") {
    const desc =
      reqObj !== null && typeof reqObj.description === "string"
        ? reqObj.description
        : "";
    program = programWord(desc);
  }
  let kind = "other";
  if (
    reqObj !== null &&
    typeof reqObj.kind === "string" &&
    KIND_REGEX.test(reqObj.kind)
  ) {
    kind = reqObj.kind;
  }

  let rawCommand: string | null = null;
  if (tool === "bash") {
    if (reqObj !== null && typeof reqObj.description === "string") {
      let desc = reqObj.description.trim();
      if (desc.startsWith("Command:")) {
        desc = desc.slice("Command:".length).replace(/^[ \t]+/, "");
      }
      if (desc.trim().length > 0) {
        rawCommand = desc;
      }
    }
  } else {
    if (reqObj !== null) {
      if (typeof reqObj.title === "string" && reqObj.title.trim().length > 0) {
        rawCommand = reqObj.title.trim();
      } else if (
        typeof reqObj.description === "string" &&
        reqObj.description.trim().length > 0
      ) {
        rawCommand = reqObj.description.trim();
      }
    }
  }

  let command: string | null = null;
  if (rawCommand !== null) {
    const redacted = redactCommand(rawCommand);
    command = redacted.trim().length > 0 ? redacted : null;
  }

  return {
    requestId,
    agent,
    tool,
    program,
    kind,
    command,
  };
}
