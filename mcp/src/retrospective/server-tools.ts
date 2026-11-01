/**
 * Structural identity of this MCP server's own tool calls, shared by session
 * discovery (binding) and aggregation (skill-load accounting).
 *
 * OMP records a call to this server as a `write` whose `path` argument is
 * `xd://mcp__agent_skills_standard_<tool>`. Only the matched tool name leaves
 * this module: never the arguments body, never another path, never message text.
 */
export const SERVER_TOOL_DEVICE_PREFIX = "xd://mcp__agent_skills_standard_";

/** Tools of this server that load skills, workflows or guides into a session. */
export const SKILL_LOAD_TOOLS: readonly string[] = [
  "load_skills_for_files",
  "load_skills_for_keywords",
  "get_skill",
  "get_category_guide",
  "get_workflow",
];

/** Server tools that are finalization or housekeeping and never count as work. */
export const SERVER_HOUSEKEEPING_TOOLS: readonly string[] = [
  "prepare_retrospective",
  "get_retrospective_status",
  "get_session_cost",
  "audit_session_compliance",
];

const SAFE_TOOL_NAME = /^[a-zA-Z0-9_-]+$/;

/**
 * Returns the tool name a recorded tool call addressed, or `null` when the call
 * carries no usable name. A `write` to this server's device path yields the
 * server tool name; any other `write` yields `null`; every other tool yields its
 * own recorded name.
 */
export function extractServerToolName(
  name: unknown,
  args: unknown,
): string | null {
  if (typeof name !== "string") return null;
  if (name === "write" && typeof args === "object" && args !== null) {
    if ("path" in args && typeof args.path === "string") {
      const targetPath = args.path;
      if (targetPath.startsWith(SERVER_TOOL_DEVICE_PREFIX)) {
        const toolSuffix = targetPath.slice(SERVER_TOOL_DEVICE_PREFIX.length);
        if (toolSuffix.length > 0 && SAFE_TOOL_NAME.test(toolSuffix)) {
          return toolSuffix;
        }
      }
    }
    return null;
  }
  if (name !== "write") {
    return name;
  }
  return null;
}
