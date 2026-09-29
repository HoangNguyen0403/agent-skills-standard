import fs from 'node:fs';
import path from 'node:path';

/**
 * Strip ANSI escape sequences from string.
 */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Parse skill names from `npx skills add . --list -y` output.
 * Handles `│    <name>` layout plus trailing description lines and ANSI codes.
 * Returns sorted, unique skill names.
 */
export function parseSkillsList(output: string): string[] {
  const stripped = stripAnsi(output);
  const names = new Set<string>();

  for (const line of stripped.split('\n')) {
    // skills CLI uses clack/prompts layout: "│    <skill-name>"
    // Notice 4 spaces after │, then skill name. Description lines use 6+ spaces.
    const match = line.match(/^\s*│\s{4}([a-z0-9][a-z0-9-_]*)\s*$/);
    if (match && match[1]) {
      names.add(match[1]);
    }
  }

  return Array.from(names).sort();
}

/**
 * Parse server names from `codex mcp list` table output.
 * Skips header and separator lines, extracts first column.
 */
export function parseCodexMcpList(output: string): string[] {
  const stripped = stripAnsi(output).trim();
  if (!stripped) return [];

  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: string[] = [];

  for (const line of lines) {
    if (/^name\b/i.test(line) || /^[-=\s]+$/.test(line)) {
      continue;
    }
    const match = line.match(/^(\S+)/);
    if (match && match[1]) {
      results.push(match[1]);
    }
  }

  return results;
}

/**
 * Parse agent names from `opencode agent list`.
 * Handles lines like `architecture-guard (subagent)` and bare names.
 */
export function parseOpencodeAgentList(output: string): string[] {
  const stripped = stripAnsi(output);
  const results: string[] = [];

  for (const rawLine of stripped.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^name\b/i.test(line) || /^[-=]+$/.test(line)) continue;

    // Remove leading list markers like bullet points, dashes, box-drawing chars
    const cleaned = line.replace(/^[-*•│]\s*/, '').trim();
    // Strip parenthetical notes like (subagent)
    const namePart = cleaned.split('(')[0].trim().split(/\s+/)[0];
    if (namePart && /^[a-zA-Z0-9_-]+$/.test(namePart)) {
      results.push(namePart);
    }
  }

  return Array.from(new Set(results));
}

/**
 * Parse GitHub CLI version tuple from `gh --version` output.
 * e.g., "gh version 2.98.0 (...)" -> [2, 98, 0]
 */
export function parseGhVersion(
  output: string,
): [number, number, number] | null {
  const stripped = stripAnsi(output);
  const match = stripped.match(/gh\s+version\s+(\d+)\.(\d+)\.(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Scan repoRoot for names of skills/<cat>/<skill>/SKILL.md excluding skills/specialists.
 * Returns sorted, unique skill names.
 */
export function registrySkillNames(repoRoot: string): string[] {
  const skillsDir = path.join(repoRoot, 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const names = new Set<string>();
  const categories = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory() || cat.name === 'specialists') continue;
    const catDir = path.join(skillsDir, cat.name);
    const skillEntries = fs.readdirSync(catDir, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(catDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        names.add(entry.name);
      }
    }
  }

  return Array.from(names).sort();
}
