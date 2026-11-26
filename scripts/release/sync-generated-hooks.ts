import fs from "node:fs";
import path from "node:path";

/**
 * Tracked repository copies of the canonical PreToolUse hook script.
 * HookService owns the script body; this module only keeps the copies in
 * lockstep with it so the release version marker cannot drift.
 */
export const GENERATED_HOOK_PATHS = [
  ".claude/hooks/preedit-skill-loader.js",
  ".github/hooks/preedit-skill-loader.js",
  ".codex/hooks/preedit-skill-loader.js",
] as const;

export interface HookSyncResult {
  written: string[];
  unchanged: string[];
}

const HOOK_VERSION_MARKER_RE = /^\/\/ ags-hook-version: \S+$/m;

/**
 * Loads the embedded hook template from the CLI source.
 *
 * Imported lazily because the template's version marker is bound to
 * cli/package.json at module load, and release preparation bumps that file
 * first.
 */
export async function loadCanonicalHookTemplate(): Promise<string> {
  const mod = await import("../../cli/src/services/HookService");
  return mod.UNIVERSAL_SKILL_LOADER_JS;
}

/**
 * Renders the canonical template for the version being prepared.
 *
 * The script body is taken verbatim from the single embedded template; only
 * the declared version marker is release input. A template without that
 * marker is rejected rather than written, so a stale or partial template
 * cannot silently produce an unversioned hook.
 */
export function renderHookTemplate(template: string, version: string): string {
  if (!HOOK_VERSION_MARKER_RE.test(template)) {
    throw new Error(
      "Canonical hook template is missing its ags-hook-version marker; refusing to write a versionless hook.",
    );
  }
  return template.replace(
    HOOK_VERSION_MARKER_RE,
    `// ags-hook-version: ${version}`,
  );
}

/**
 * Writes every tracked generated hook copy from the canonical template.
 * Byte-compares first so repeated preparation of the same version leaves
 * files untouched.
 */
export async function syncGeneratedHooks(opts: {
  rootDir: string;
  version: string;
  template?: string;
}): Promise<HookSyncResult> {
  const template = opts.template ?? (await loadCanonicalHookTemplate());
  const rendered = renderHookTemplate(template, opts.version);
  const result: HookSyncResult = { written: [], unchanged: [] };

  for (const relPath of GENERATED_HOOK_PATHS) {
    const absPath = path.join(opts.rootDir, relPath);
    let current: string | undefined;
    try {
      current = fs.readFileSync(absPath, "utf8");
    } catch {
      current = undefined;
    }

    if (current === rendered) {
      result.unchanged.push(relPath);
      continue;
    }

    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, rendered, "utf8");
    result.written.push(relPath);
  }

  return result;
}
