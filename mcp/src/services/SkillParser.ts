import fs from "fs-extra";
import yaml from "js-yaml";

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
  const content = await fs.readFile(skillPath, "utf8");
  const fm = FRONTMATTER_RE.exec(content);
  if (!fm) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = (yaml.load(fm[1]) as Record<string, unknown>) ?? {};
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
    description:
      typeof parsed.description === "string" ? parsed.description : "",
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
