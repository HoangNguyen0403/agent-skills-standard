import { createHash } from "node:crypto";

export type ParsedPermissionRequest = {
  requestId: string;
  agent: string;
  tool: string;
  program: string | null;
};

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

  const unescaped = scanned
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const openTag = "<permission-request>";
  const closeTag = "</permission-request>";
  const startIdx = unescaped.indexOf(openTag);
  if (startIdx === -1) {
    return null;
  }

  const jsonStart = startIdx + openTag.length;
  const endIdx = unescaped.indexOf(closeTag, jsonStart);
  if (endIdx === -1) {
    return null;
  }

  const rawJson = unescaped.slice(jsonStart, endIdx).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
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

  return {
    requestId,
    agent,
    tool,
    program,
  };
}
