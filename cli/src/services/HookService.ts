import fs from 'fs-extra';
import path from 'path';
import { Agent } from '../constants';

// ── Embedded hook templates ───────────────────────────────────────────────────

/**
 * Claude Code PreToolUse hook script (Python).
 * Fires before every Edit/Write — emits a load_skills_for_files() reminder as
 * prompt context so Claude always consults skill rules before editing.
 * Always exits 0 — never blocks tool execution.
 */
export const CLAUDE_SKILL_LOADER_PY = `#!/usr/bin/env python3
"""PreToolUse hook: remind Claude to call load_skills_for_files() before any code edit.

Installed by agent-skills-standard (ags sync). Remove via: ags hooks uninstall

Why a hook (not just AGENTS.md or the MCP alone):
    Context compaction silently drops the check-AGENTS.md instruction.
    The MCP is on-demand - Claude must remember to call it.
    A hook fires mechanically on every edit - 100% trigger rate, cannot be forgotten.

Decision contract:
    - stdout: short MCP trigger prompt (injected as prompt context)
    - exit 0 always - never blocks the edit, only adds context
    - Silent on any error - hook bugs must never block legitimate work
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path(__file__).resolve().parents[2])

EDIT_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}

_SKIP_DIRS = (
    str(Path(os.path.realpath(REPO_ROOT / ".claude"))),
    str(Path(os.path.realpath(REPO_ROOT / ".gemini"))),
)
_SKIP_FILES = (
    str(Path(os.path.realpath(REPO_ROOT / "AGENTS.md"))),
    str(Path(os.path.realpath(REPO_ROOT / "CLAUDE.md"))),
)


def _should_skip(file_path: str) -> bool:
    try:
        real = str(Path(os.path.realpath(file_path)))
    except Exception:
        return False
    if any(real.startswith(d) for d in _SKIP_DIRS):
        return True
    if real in _SKIP_FILES:
        return True
    return False


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    if data.get("tool_name") not in EDIT_TOOLS:
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")
    if not file_path or _should_skip(file_path):
        sys.exit(0)

    print(
        f"[SKILL TRIGGER] Editing: {Path(file_path).name}\\n"
        f"-> Call load_skills_for_files(files=[ \\"{file_path}\\" ]) on the "
        f"agent-skills-standard MCP. It returns applicable SKILL.md rules, "
        f"or nothing if no skills match this file type."
    )

    sys.exit(0)


if __name__ == "__main__":
    main()
`;

/**
 * Kiro hook spec (Markdown + YAML frontmatter).
 * File-save trigger — advisory only (cannot block edits).
 * Placed at .kiro/hooks/ags-skill-loader.md
 */
export const KIRO_HOOK_MD = `---
enabled: true
name: ags-skill-loader
description: Load matching skill rules from agent-skills-standard before editing source files
triggers:
  - type: file_change
    fileFilter: "**/*"
instructions: |
  Before editing any source file, call load_skills_for_files(files=[<absolute_file_path>])
  on the agent-skills-standard MCP server. It returns applicable SKILL.md rules for the
  file being edited, or nothing if no skills match. Apply all returned rules strictly.
---
`;

// ── Constants ─────────────────────────────────────────────────────────────────

const CLAUDE_HOOK_SCRIPT_REL = '.claude/hooks/preedit-skill-loader.py';
const CLAUDE_SETTINGS_REL = '.claude/settings.json';
const CLAUDE_HOOK_CMD =
  'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/preedit-skill-loader.py"';
const CLAUDE_MCP_PERMISSION = 'mcp__agent-skills-standard__*';
const KIRO_HOOK_REL = '.kiro/hooks/ags-skill-loader.md';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HookWriteReport {
  writes: Array<{
    agent: Agent;
    file: string;
    action: 'added' | 'updated' | 'skipped-existing';
  }>;
  /** Agents with no hook system — skills delivered via rules files only. */
  unsupported: Agent[];
}

export interface HookStatusRow {
  agent: Agent;
  installed: boolean;
  files: string[];
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Installs and removes AI-agent lifecycle hooks for the skill-loader reminder.
 *
 * Supported hook systems:
 *   Claude Code — PreToolUse hook (blocking-capable, fires before every Edit/Write)
 *   Kiro        — File-save spec hook (advisory, cannot block edits)
 *
 * All other agents in the supported-agents list have no programmatic hook system;
 * they receive the MCP trigger via their rules file (CLAUDE.md, .cursor/rules, etc.)
 * which is written by SyncService — no separate hook file is needed.
 *
 * Settings writes are idempotent and merge existing content.
 * Claude hook script is created once and preserved if customized.
 * Kiro hook markdown stays in sync with the embedded template.
 */
export class HookService {
  async install(opts: {
    rootDir: string;
    agents: Agent[];
  }): Promise<HookWriteReport> {
    const report: HookWriteReport = { writes: [], unsupported: [] };

    for (const agent of opts.agents) {
      switch (agent) {
        case Agent.Claude:
          await this.installClaudeHook(opts.rootDir, report);
          break;
        case Agent.Kiro:
          await this.installKiroHook(opts.rootDir, report);
          break;
        default:
          report.unsupported.push(agent);
      }
    }

    return report;
  }

  async uninstall(opts: {
    rootDir: string;
    agents: Agent[];
  }): Promise<{ removed: Array<{ agent: Agent; file: string }> }> {
    const removed: Array<{ agent: Agent; file: string }> = [];

    for (const agent of opts.agents) {
      switch (agent) {
        case Agent.Claude: {
          const files = await this.uninstallClaudeHook(opts.rootDir);
          removed.push(...files.map((f) => ({ agent, file: f })));
          break;
        }
        case Agent.Kiro: {
          const abs = path.join(opts.rootDir, KIRO_HOOK_REL);
          if (await fs.pathExists(abs)) {
            await fs.remove(abs);
            removed.push({ agent, file: KIRO_HOOK_REL });
          }
          break;
        }
        default:
          break;
      }
    }

    return { removed };
  }

  async status(opts: {
    rootDir: string;
    agents: Agent[];
  }): Promise<HookStatusRow[]> {
    const rows: HookStatusRow[] = [];

    for (const agent of opts.agents) {
      switch (agent) {
        case Agent.Claude: {
          const scriptExists = await fs.pathExists(
            path.join(opts.rootDir, CLAUDE_HOOK_SCRIPT_REL),
          );
          const registeredInSettings = await this.claudeHookIsRegistered(
            path.join(opts.rootDir, CLAUDE_SETTINGS_REL),
          );
          rows.push({
            agent,
            installed: scriptExists && registeredInSettings,
            files: [CLAUDE_HOOK_SCRIPT_REL, CLAUDE_SETTINGS_REL],
          });
          break;
        }
        case Agent.Kiro: {
          const exists = await fs.pathExists(
            path.join(opts.rootDir, KIRO_HOOK_REL),
          );
          rows.push({ agent, installed: exists, files: [KIRO_HOOK_REL] });
          break;
        }
        default:
          break;
      }
    }

    return rows;
  }

  // ── Claude Code ─────────────────────────────────────────────────────────────

  private async installClaudeHook(
    rootDir: string,
    report: HookWriteReport,
  ): Promise<void> {
    const scriptAbs = path.join(rootDir, CLAUDE_HOOK_SCRIPT_REL);
    const scriptExists = await fs.pathExists(scriptAbs);
    await fs.ensureDir(path.dirname(scriptAbs));
    if (!scriptExists) {
      await fs.writeFile(scriptAbs, CLAUDE_SKILL_LOADER_PY);
      report.writes.push({
        agent: Agent.Claude,
        file: CLAUDE_HOOK_SCRIPT_REL,
        action: 'added',
      });
    } else {
      report.writes.push({
        agent: Agent.Claude,
        file: CLAUDE_HOOK_SCRIPT_REL,
        action: 'skipped-existing',
      });
    }

    const settingsAbs = path.join(rootDir, CLAUDE_SETTINGS_REL);
    const settingsExists = await fs.pathExists(settingsAbs);
    const existing = await this.readJson(settingsAbs);
    let changed = false;

    // Add MCP permission (idempotent)
    const permissions = this.ensureObject(existing, 'permissions');
    const allow = this.ensureArray<string>(permissions, 'allow');
    if (!allow.includes(CLAUDE_MCP_PERMISSION)) {
      permissions['allow'] = [CLAUDE_MCP_PERMISSION, ...allow];
      changed = true;
    }

    // Add PreToolUse hook entry (idempotent — guard by script path fragment)
    const hooks = this.ensureObject(existing, 'hooks');
    const preToolUse = this.ensureArray<Record<string, unknown>>(
      hooks,
      'PreToolUse',
    );
    if (!this.claudeHookEntryExists(preToolUse)) {
      preToolUse.unshift({
        matcher: 'Edit|Write|MultiEdit|NotebookEdit',
        hooks: [{ type: 'command', command: CLAUDE_HOOK_CMD, timeout: 5 }],
      });
      changed = true;
    }

    if (changed) {
      await this.writeAtomic(settingsAbs, existing);
      report.writes.push({
        agent: Agent.Claude,
        file: CLAUDE_SETTINGS_REL,
        action: settingsExists ? 'updated' : 'added',
      });
    } else {
      report.writes.push({
        agent: Agent.Claude,
        file: CLAUDE_SETTINGS_REL,
        action: 'skipped-existing',
      });
    }
  }

  private async uninstallClaudeHook(rootDir: string): Promise<string[]> {
    const removed: string[] = [];

    // Script file is intentionally preserved on uninstall — it belongs to the
    // user's project. We only remove our registration from settings.json.
    const settingsAbs = path.join(rootDir, CLAUDE_SETTINGS_REL);
    if (!(await fs.pathExists(settingsAbs))) return removed;

    const data = await this.readJson(settingsAbs);
    let changed = false;

    const permissions = this.ensureObject(data, 'permissions');
    const allow = this.ensureArray<string>(permissions, 'allow');
    if (allow.includes(CLAUDE_MCP_PERMISSION)) {
      permissions['allow'] = allow.filter((p) => p !== CLAUDE_MCP_PERMISSION);
      changed = true;
    }

    const hooks = this.ensureObject(data, 'hooks');
    const preToolUse = this.ensureArray<Record<string, unknown>>(
      hooks,
      'PreToolUse',
    );
    const filtered = preToolUse.filter(
      (entry) => !this.claudeHookEntryMatches(entry),
    );
    if (filtered.length !== preToolUse.length) {
      hooks['PreToolUse'] = filtered;
      changed = true;
    }

    if (changed) {
      await this.writeAtomic(settingsAbs, data);
      removed.push(CLAUDE_SETTINGS_REL);
    }

    return removed;
  }

  private async claudeHookIsRegistered(settingsAbs: string): Promise<boolean> {
    if (!(await fs.pathExists(settingsAbs))) return false;
    const data = await this.readJson(settingsAbs);
    const hooks = data['hooks'] as Record<string, unknown> | undefined;
    if (!hooks) return false;
    const preToolUse = hooks['PreToolUse'] as
      | Array<Record<string, unknown>>
      | undefined;
    if (!Array.isArray(preToolUse)) return false;
    return this.claudeHookEntryExists(preToolUse);
  }

  private claudeHookEntryExists(
    entries: Array<Record<string, unknown>>,
  ): boolean {
    return entries.some((entry) => this.claudeHookEntryMatches(entry));
  }

  private claudeHookEntryMatches(entry: Record<string, unknown>): boolean {
    const entryHooks = (entry['hooks'] ?? []) as Array<Record<string, unknown>>;
    return entryHooks.some((h) =>
      (h['command'] as string | undefined)?.includes('preedit-skill-loader'),
    );
  }

  // ── Kiro ────────────────────────────────────────────────────────────────────

  private async installKiroHook(
    rootDir: string,
    report: HookWriteReport,
  ): Promise<void> {
    const hookAbs = path.join(rootDir, KIRO_HOOK_REL);
    const exists = await fs.pathExists(hookAbs);
    await fs.ensureDir(path.dirname(hookAbs));
    if (!exists) {
      await fs.writeFile(hookAbs, KIRO_HOOK_MD);
      report.writes.push({
        agent: Agent.Kiro,
        file: KIRO_HOOK_REL,
        action: 'added',
      });
      return;
    }

    const current = await fs.readFile(hookAbs, 'utf8');
    if (current !== KIRO_HOOK_MD) {
      await fs.writeFile(hookAbs, KIRO_HOOK_MD);
      report.writes.push({
        agent: Agent.Kiro,
        file: KIRO_HOOK_REL,
        action: 'updated',
      });
      return;
    }

    report.writes.push({
      agent: Agent.Kiro,
      file: KIRO_HOOK_REL,
      action: 'skipped-existing',
    });
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  private async readJson(abs: string): Promise<Record<string, unknown>> {
    if (!(await fs.pathExists(abs))) return {};
    return (await fs.readJson(abs).catch(() => ({}))) as Record<
      string,
      unknown
    >;
  }

  private ensureObject(
    parent: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> {
    if (
      typeof parent[key] !== 'object' ||
      parent[key] === null ||
      Array.isArray(parent[key])
    ) {
      parent[key] = {};
    }
    return parent[key] as Record<string, unknown>;
  }

  private ensureArray<T>(
    parent: Record<string, unknown>,
    key: string,
  ): T[] {
    if (!Array.isArray(parent[key])) {
      parent[key] = [];
    }
    return parent[key] as T[];
  }

  private async writeAtomic(abs: string, data: unknown): Promise<void> {
    await fs.ensureDir(path.dirname(abs));
    const tmp = `${abs}.tmp`;
    await fs.writeJson(tmp, data, { spaces: 2 });
    await fs.move(tmp, abs, { overwrite: true });
  }
}
