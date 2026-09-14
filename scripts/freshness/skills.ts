// scripts/freshness/skills.ts
import fs from "fs-extra";
import yaml from "js-yaml";
import path from "path";
import type { SkillRecord } from "./types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Splits a SKILL.md into parsed YAML frontmatter and body.
 * Mirrors the CRLF-safe regex in cli/src/services/MetadataReader.ts.
 * Returns null when the file has no frontmatter block.
 */
export function parseFrontmatter(
  content: string,
): { frontmatter: Record<string, unknown>; body: string } | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;
  const loaded = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
  const frontmatter =
    loaded && typeof loaded === "object"
      ? (loaded as Record<string, unknown>)
      : {};
  return { frontmatter, body: match[2] };
}

/**
 * Walks `skills/<category>/<skill>/SKILL.md`. Skips dot-prefixed
 * directories and any subdirectory without a SKILL.md (e.g. `references/`).
 */
export function walkSkills(skillsDir: string): SkillRecord[] {
  const records: SkillRecord[] = [];
  const categories = fs
    .readdirSync(skillsDir)
    .filter(
      (c) =>
        !c.startsWith(".") &&
        fs.statSync(path.join(skillsDir, c)).isDirectory(),
    )
    .sort();
  for (const category of categories) {
    const categoryDir = path.join(skillsDir, category);
    const skillDirs = fs
      .readdirSync(categoryDir)
      .filter((s) => !s.startsWith("."))
      .sort();
    for (const name of skillDirs) {
      const dir = path.join(categoryDir, name);
      const skillPath = path.join(dir, "SKILL.md");
      if (!fs.existsSync(skillPath)) continue;
      const parsed = parseFrontmatter(fs.readFileSync(skillPath, "utf8"));
      if (!parsed) continue;
      records.push({
        category,
        name,
        dir,
        skillPath,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
      });
    }
  }
  return records;
}
