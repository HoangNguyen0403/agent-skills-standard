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
  "prepare_retrospective_index",
  "get_retrospective_status",
  "get_session_cost",
  "audit_session_compliance",
];

const SAFE_TOOL_NAME = /^[a-zA-Z0-9_-]+$/;

/** URI prefix of the host's own skill-loading reads (`read skill://<name>`). */
export const HOST_SKILL_URI_PREFIX = "skill://";

const SKILL_ID_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_HOST_SKILL_ID_LENGTH = 96;
// Skill package layout directories: a second segment naming one of these is a
// file location inside the skill, not part of the skill id.
const SKILL_PACKAGE_DIRECTORIES: Record<string, true> = {
  references: true,
  scripts: true,
  assets: true,
  templates: true,
  examples: true,
  evals: true,
  docs: true,
};

function isSkillNameSegment(segment: string): boolean {
  return (
    !segment.endsWith(".md") && SKILL_PACKAGE_DIRECTORIES[segment] !== true
  );
}

/**
 * Skill id from an OMP `read skill://...` call, or `null`.
 *
 * Only `read` calls qualify; the id is the first path segment, plus the second
 * segment when it looks like a skill name (matches the segment pattern, does
 * not end in `.md`, and is not a package directory such as `references`). Each
 * segment must match the segment pattern; anything else yields `null`. Query
 * strings and fragments are cut before parsing. The id is path-derived: it is
 * NOT validated against the registry.
 */
export function extractHostSkillId(
  name: unknown,
  args: unknown,
): string | null {
  if (name !== "read") return null;
  if (typeof args !== "object" || args === null) return null;
  if (!("path" in args) || typeof args.path !== "string") return null;
  const targetPath = args.path;
  if (!targetPath.startsWith(HOST_SKILL_URI_PREFIX)) return null;

  const remainder = targetPath.slice(HOST_SKILL_URI_PREFIX.length);
  const cutIndex = remainder.search(/[?#]/);
  const rest = cutIndex >= 0 ? remainder.slice(0, cutIndex) : remainder;

  const segments = rest.split("/");
  // A trailing slash names the same package; every other empty segment is invalid.
  if (segments[segments.length - 1] === "") segments.pop();
  if (segments.length === 0) return null;
  for (const segment of segments) {
    if (!SKILL_ID_SEGMENT.test(segment)) return null;
  }

  const firstSegment = segments[0];
  const skillId =
    segments.length >= 2 && isSkillNameSegment(segments[1])
      ? `${firstSegment}/${segments[1]}`
      : firstSegment;
  if (skillId.length > MAX_HOST_SKILL_ID_LENGTH) return null;
  return skillId;
}

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
