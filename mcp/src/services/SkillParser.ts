import fs from "fs-extra";
import yaml from "js-yaml";

/** SKILL.md files are prose, not payloads — refuse to parse anything absurdly large. */
const MAX_SKILL_FILE_BYTES = 1024 * 1024; // 1 MiB

/**
 * Zero-width / bidi control code points that render invisibly in a diff but
 * can hide instructions from a human reviewer while an LLM still reads them.
 * Built from numeric code points (not regex-literal escapes) so no literal
 * control character ends up embedded in this source file.
 */
const ZERO_WIDTH_BIDI_CODEPOINTS = [
  0x200b,
  0x200c,
  0x200d,
  0x200e,
  0x200f, // zero-width space/joiners, LTR/RTL marks
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e, // bidi embedding/override
  0x2066,
  0x2067,
  0x2068,
  0x2069, // bidi isolates
  0xfeff, // BOM / zero-width no-break space
];
const zeroWidthBidiPattern = new RegExp(
  `[${ZERO_WIDTH_BIDI_CODEPOINTS.map((cp) => String.fromCodePoint(cp)).join("")}]`,
  "g",
);

function stripZeroWidthBidi(value: string): string {
  return value.replace(zeroWidthBidiPattern, "");
}

/**
 * Parsed metadata for a single SKILL.md file. Mirrors the subset of fields the
 * MCP needs for matching and loading. Kept intentionally minimal — the MCP does
 * not need to know about evals, tags, or registry-only fields.
 */
export interface SkillMetadata {
  /** Stable skill identifier (parent directory name, e.g. `flutter-bloc-state-management`). */
  id: string;
  /** Category derived from path (e.g. `flutter`, `golang`). */
  category: string;
  /** Absolute path to the SKILL.md file. */
  path: string;
  /** From frontmatter `name`. */
  name: string;
  /** From frontmatter `description`. */
  description: string;
  /** Triggers from frontmatter `metadata.triggers`. */
  triggers: {
    files: string[];
    keywords: string[];
    composite: string[];
    exclude: string[];
  };
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export async function parseSkill(
  skillPath: string,
  category: string,
  id: string,
): Promise<SkillMetadata | null> {
  const stat = await fs.stat(skillPath).catch(() => null);
  if (!stat || stat.size > MAX_SKILL_FILE_BYTES) return null;

  const content = await fs.readFile(skillPath, "utf8");
  const fm = FRONTMATTER_RE.exec(content);
  if (!fm) return null;

  let parsed: Record<string, unknown>;
  try {
    // JSON_SCHEMA restricts to plain JSON-compatible types (no YAML
    // timestamp/binary/merge-key tags) — the frontmatter is a simple data
    // record, not a place that needs YAML's extended type system.
    parsed =
      (yaml.load(fm[1], { schema: yaml.JSON_SCHEMA }) as Record<
        string,
        unknown
      >) ?? {};
  } catch {
    return null;
  }

  const meta = (parsed.metadata as Record<string, unknown>) ?? {};
  const rawTriggers = (meta.triggers as Record<string, unknown>) ?? {};

  const triggers = {
    files: toStringArray(rawTriggers.files),
    keywords: toStringArray(rawTriggers.keywords),
    composite: toStringArray(rawTriggers.composite),
    exclude: toStringArray(rawTriggers.exclude),
  };

  return {
    id,
    category,
    path: skillPath,
    name: typeof parsed.name === "string" ? parsed.name : id,
    description: stripZeroWidthBidi(
      typeof parsed.description === "string" ? parsed.description : "",
    ),
    triggers,
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/**
 * Reads the full SKILL.md body (frontmatter + content) for delivery to the agent.
 * Returns null if the file does not exist.
 */
export async function readSkillBody(skillPath: string): Promise<string | null> {
  if (!(await fs.pathExists(skillPath))) return null;
  return fs.readFile(skillPath, "utf8");
}
