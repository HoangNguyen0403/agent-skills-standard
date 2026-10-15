import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import { ROOT_DIR } from "./constants";

/**
 * Given a list of file paths (e.g. from git diff), extract unique skill identifiers
 * in the form of "category/skillName", requiring that the directory actually contains
 * an authentic SKILL.md file. Excludes category-level reference directories
 * (such as skills/product-management/references) while correctly including internal edits
 * to resources/references within an actual skill.
 */
export function extractChangedSkills(
  filePaths: Iterable<string>,
  repoRoot: string = ROOT_DIR,
): string[] {
  const skills = new Set<string>();

  for (const rawPath of filePaths) {
    const trimmed = rawPath.trim();
    if (!trimmed) continue;

    const normalized = trimmed.replace(/\\/g, "/");

    // Match paths under skills/<category>/<skillName>(/...)
    const match = normalized.match(/^skills\/([^/]+)\/([^/]+)(?:\/.*)?$/);
    if (!match) continue;

    const [, category, skillName] = match;
    const skillDir = path.join(repoRoot, "skills", category, skillName);
    const skillFile = path.join(skillDir, "SKILL.md");

    try {
      if (fs.existsSync(skillFile) && fs.statSync(skillFile).isFile()) {
        skills.add(`${category}/${skillName}`);
      }
    } catch {
      // Ignore stat/access issues
    }
  }

  return Array.from(skills).sort();
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const files: string[] = [];

  if (args.length > 0) {
    for (const arg of args) {
      if (arg === "--help" || arg === "-h") {
        console.log(
          "Usage: changed-skills [file-paths...] or pipe file paths via stdin",
        );
        return;
      }
      files.push(arg);
    }
  } else if (!process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (line.trim()) files.push(line.trim());
    }
  }

  const changed = extractChangedSkills(files);
  for (const skill of changed) {
    console.log(skill);
  }
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith("changed-skills.ts") ||
    process.argv[1].endsWith("changed-skills.js"));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
