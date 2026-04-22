import path from "path";
import fs from "fs-extra";

/** Reason a project state may be incomplete — surfaced to the LLM via tool responses. */
export type SetupHint =
  | { kind: "ready" }
  | { kind: "no-agents-md"; searchedFrom: string }
  | { kind: "no-skills-dir"; projectRoot: string; candidates: string[] };

export interface ResolvedConfig {
  /** Absolute path to the project root. May be cwd if AGENTS.md was not found. */
  projectRoot: string;
  /** Absolute path to the skills directory, or `null` if no skills installed yet. */
  skillsDir: string | null;
  /** Optional: absolute path to a metadata.json. */
  metadataPath?: string;
  /** Setup state. `kind: 'ready'` means everything resolved. Otherwise the LLM gets a guided hint. */
  setup: SetupHint;
}

/**
 * Resolves the project the MCP server should serve skills from.
 *
 * Resolution order:
 * 1. SKILLS_PROJECT_ROOT env var
 * 2. Walk up from process.cwd() looking for AGENTS.md
 * 3. Fall back to process.cwd() with a setup hint
 *
 * The skills directory is detected by checking, in order:
 *   <root>/skills              (registry layout)
 *   <root>/.claude/skills
 *   <root>/.cursor/skills
 *   <root>/.gemini/skills
 *   <root>/.kiro/skills
 *   <root>/.windsurf/skills
 *   <root>/.continue/skills
 *   <root>/.antigravity/skills
 *   <root>/.trae/skills
 *   <root>/.roo/skills
 *
 * Never throws — returns a config with `setup.kind !== 'ready'` if anything is missing,
 * so tools can deliver helpful guidance instead of the server crashing on first run.
 */
export async function resolveConfig(): Promise<ResolvedConfig> {
  const explicit = process.env.SKILLS_PROJECT_ROOT;
  const startDir = process.cwd();

  let projectRoot: string;
  let setup: SetupHint = { kind: "ready" };

  if (explicit) {
    projectRoot = path.resolve(explicit);
  } else {
    const found = await findProjectRoot(startDir);
    if (found) {
      projectRoot = found;
    } else {
      projectRoot = path.resolve(startDir);
      setup = { kind: "no-agents-md", searchedFrom: startDir };
    }
  }

  const skillsDir = await findSkillsDir(projectRoot);
  if (!skillsDir) {
    return {
      projectRoot,
      skillsDir: null,
      setup:
        setup.kind === "ready"
          ? {
              kind: "no-skills-dir",
              projectRoot,
              candidates: SKILL_DIR_CANDIDATES,
            }
          : setup,
    };
  }

  const metadataCandidate = path.join(skillsDir, "metadata.json");
  const metadataPath = (await fs.pathExists(metadataCandidate))
    ? metadataCandidate
    : undefined;

  return { projectRoot, skillsDir, metadataPath, setup };
}

const SKILL_DIR_CANDIDATES = [
  "skills",
  ".claude/skills",
  ".cursor/skills",
  ".gemini/skills",
  ".kiro/skills",
  ".windsurf/skills",
  ".continue/skills",
  ".antigravity/skills",
  ".trae/skills",
  ".roo/skills",
];

async function findSkillsDir(root: string): Promise<string | null> {
  for (const candidate of SKILL_DIR_CANDIDATES) {
    const full = path.join(root, candidate);
    if (await fs.pathExists(full)) {
      return full;
    }
  }
  return null;
}

async function findProjectRoot(start: string): Promise<string | null> {
  let current = path.resolve(start);
  while (true) {
    if (await fs.pathExists(path.join(current, "AGENTS.md"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
