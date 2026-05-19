import fs from 'fs-extra';
import path from 'path';
import { Agent, getAgentDefinition } from '../constants';

// ── Embedded hook templates ───────────────────────────────────────────────────

/**
 * Universal PreToolUse hook script (Node.js / JavaScript).
 * Reminds AI agents to call load_skills_for_files() before any code edit.
 * Guaranteed to execute on any machine running agent-skills-standard.
 * Always exits 0 to never block work.
 */
export const UNIVERSAL_SKILL_LOADER_JS = `#!/usr/bin/env node
/**
 * PreToolUse hook: remind AI agent to call load_skills_for_files() before any code edit.
 * Installed by agent-skills-standard (ags sync). Remove via: ags hooks uninstall
 * Guaranteed to execute on any system with Node.js. Always exits 0 to never block work.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '../../');
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SKIP_DIRS = [
  path.resolve(REPO_ROOT, '.claude'),
  path.resolve(REPO_ROOT, '.gemini'),
  path.resolve(REPO_ROOT, '.codex'),
  path.resolve(REPO_ROOT, '.github'),
  path.resolve(REPO_ROOT, '.cursor'),
  path.resolve(REPO_ROOT, '.roo'),
  path.resolve(REPO_ROOT, '.trae'),
  path.resolve(REPO_ROOT, '.opencode'),
  path.resolve(REPO_ROOT, '.kiro'),
  path.resolve(REPO_ROOT, '.windsurf'),
  path.resolve(REPO_ROOT, '.agents'),
  path.resolve(REPO_ROOT, '.vscode'),
];
const SKIP_FILES = [
  path.resolve(REPO_ROOT, 'AGENTS.md'),
  path.resolve(REPO_ROOT, 'CLAUDE.md'),
];

function shouldSkip(filePath) {
  try {
    const real = path.resolve(filePath);
    if (SKIP_DIRS.some(d => real.startsWith(d))) return true;
    if (SKIP_FILES.includes(real)) return true;
    return false;
  } catch {
    return false;
  }
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

    const filePath = data.tool_input?.file_path || '';
    if (!filePath || shouldSkip(filePath)) process.exit(0);

    const fileName = path.basename(filePath);
    console.log(
      '[SKILL TRIGGER] Editing: ' + fileName + '\\n' +
      '-> Call load_skills_for_files(files=[ "' + filePath + '" ]) on the ' +
      'agent-skills-standard MCP. It returns applicable SKILL.md rules, ' +
      'or nothing if no skills match this file type.'
    );
    process.exit(0);
  } catch {
    process.exit(0);
  }
});
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
 *   Cursor      — PreToolUse hook
 *   Windsurf    — PreToolUse hook
 *   Gemini      — PreToolUse hook
 *   Codex       — PreToolUse hook
 *   Copilot     — PreToolUse hook
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
      if (agent === Agent.Kiro) {
        await this.installKiroHook(opts.rootDir, report);
        continue;
      }

      const def = getAgentDefinition(agent);
      if (def.hookScriptPath && def.hookConfigPath) {
        await this.installStandardHookConfig({
          rootDir: opts.rootDir,
          agent,
          scriptRelPath: def.hookScriptPath,
          configRelPath: def.hookConfigPath,
          hookCmd:
            agent === Agent.Claude
              ? 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/preedit-skill-loader.js"'
              : `node "${def.hookScriptPath}"`,
          report,
        });
      } else {
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
      if (agent === Agent.Kiro) {
        const abs = path.join(opts.rootDir, KIRO_HOOK_REL);
        if (await fs.pathExists(abs)) {
          await fs.remove(abs);
          removed.push({ agent, file: KIRO_HOOK_REL });
        }
        continue;
      }

      const def = getAgentDefinition(agent);
      if (def.hookConfigPath) {
        const files = await this.uninstallStandardHookConfig(
          opts.rootDir,
          def.hookConfigPath,
        );
        removed.push(...files.map((f) => ({ agent, file: f })));
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
      if (agent === Agent.Kiro) {
        const exists = await fs.pathExists(
          path.join(opts.rootDir, KIRO_HOOK_REL),
        );
        rows.push({ agent, installed: exists, files: [KIRO_HOOK_REL] });
        continue;
      }

      const def = getAgentDefinition(agent);
      if (def.hookScriptPath && def.hookConfigPath) {
        rows.push(
          await this.standardHookStatus(
            opts.rootDir,
            agent,
            def.hookScriptPath,
            def.hookConfigPath,
          ),
        );
      }
    }

    return rows;
  }

  // ── Standard Python/JSON Hook System (Claude, Codex, Copilot) ────────────────

  private async installStandardHookConfig(opts: {
    rootDir: string;
    agent: Agent;
    scriptRelPath: string;
    configRelPath: string;
    hookCmd: string;
    report: HookWriteReport;
  }): Promise<void> {
    const scriptAbs = path.join(opts.rootDir, opts.scriptRelPath);
    const scriptExists = await fs.pathExists(scriptAbs);
    await fs.ensureDir(path.dirname(scriptAbs));

    // Clean up legacy Python script if present
    const legacyPyAbs = scriptAbs.replace(/\.js$/, '.py');
    if (await fs.pathExists(legacyPyAbs)) {
      await fs.remove(legacyPyAbs).catch(() => {});
    }

    if (!scriptExists) {
      await fs.writeFile(scriptAbs, UNIVERSAL_SKILL_LOADER_JS);
      opts.report.writes.push({
        agent: opts.agent,
        file: opts.scriptRelPath,
        action: 'added',
      });
    } else {
      opts.report.writes.push({
        agent: opts.agent,
        file: opts.scriptRelPath,
        action: 'skipped-existing',
      });
    }

    const configAbs = path.join(opts.rootDir, opts.configRelPath);
    const configExists = await fs.pathExists(configAbs);
    const existing = await this.readJson(configAbs);
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
        hooks: [{ type: 'command', command: opts.hookCmd, timeout: 5 }],
      });
      changed = true;
    }

    if (changed) {
      await this.writeAtomic(configAbs, existing);
      opts.report.writes.push({
        agent: opts.agent,
        file: opts.configRelPath,
        action: configExists ? 'updated' : 'added',
      });
    } else {
      opts.report.writes.push({
        agent: opts.agent,
        file: opts.configRelPath,
        action: 'skipped-existing',
      });
    }
  }

  private async uninstallStandardHookConfig(
    rootDir: string,
    configRelPath: string,
  ): Promise<string[]> {
    const removed: string[] = [];
    const configAbs = path.join(rootDir, configRelPath);
    if (!(await fs.pathExists(configAbs))) return removed;

    const data = await this.readJson(configAbs);
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
      await this.writeAtomic(configAbs, data);
      removed.push(configRelPath);
    }

    return removed;
  }

  private async standardHookStatus(
    rootDir: string,
    agent: Agent,
    scriptRelPath: string,
    configRelPath: string,
  ): Promise<HookStatusRow> {
    const scriptExists = await fs.pathExists(path.join(rootDir, scriptRelPath));
    const registeredInSettings = await this.claudeHookIsRegistered(
      path.join(rootDir, configRelPath),
    );
    return {
      agent,
      installed: scriptExists && registeredInSettings,
      files: [scriptRelPath, configRelPath],
    };
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

  private ensureArray<T>(parent: Record<string, unknown>, key: string): T[] {
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
