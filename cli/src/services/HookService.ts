import fs from 'fs-extra';
import path from 'path';
import pkg from '../../package.json';
import { Agent, getAgentDefinition } from '../constants';

// ── Embedded hook templates ───────────────────────────────────────────────────

/**
 * Version marker embedded as the hook script's first line after the shebang.
 * On install, an existing script carrying an *older* marker is understood to
 * be our own previous auto-generated version (not a user customization) and
 * is refreshed; a script with no marker at all predates this feature and is
 * left untouched, matching this hook's original "create once, preserve if
 * customized" contract. A script that keeps the marker line but edits the
 * body around it will still be treated as ours and overwritten on the next
 * version bump — that residual case can't be told apart from a stale file
 * without a full diff/backup mechanism, which is out of scope here.
 */
const HOOK_SCRIPT_VERSION = pkg.version;
const HOOK_VERSION_MARKER_RE = /^\/\/ ags-hook-version: (\S+)$/m;

/**
 * Universal PreToolUse hook script (Node.js / JavaScript).
 * Reminds AI agents to call load_skills_for_files() before any code edit.
 * Guaranteed to execute on any machine running agent-skills-standard.
 * Advisory by default; blocks only in opt-in enforce mode, where it verifies
 * the call against the session transcript and applies a fixed deny-list.
 */
export const UNIVERSAL_SKILL_LOADER_JS = `#!/usr/bin/env node
// ags-hook-version: ${HOOK_SCRIPT_VERSION}
/**
 * PreToolUse hook: require load_skills_for_files() before any code edit.
 * Installed by agent-skills-standard (ags sync). Remove via: ags hooks uninstall
 * Advisory by default (exits 0). With AGS_HOOK_ENFORCE=1 (opt-in via
 * \`ags hooks install --enforce\`) it exits 2 when either:
 *   1. the target file matches the fixed identity/secret deny-list below, or
 *   2. the session transcript has no load_skills_for_files() call covering
 *      this file. Enforcement reads Claude Code's \`transcript_path\` from hook
 *      stdin; hosts that do not send it fail open with a warning.
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
    // Boundary-aware: '.github-extra' must not match '.github'.
    if (SKIP_DIRS.some(d => real === d || real.startsWith(d + path.sep))) return true;
    if (SKIP_FILES.includes(real)) return true;
    return false;
  } catch {
    return false;
  }
}

const ENFORCE = process.env.AGS_HOOK_ENFORCE === '1';
const DENY_BASENAMES = new Set(['SOUL.md', 'MEMORY.md']);
const DENY_PATTERNS = [
  /(^|[\\\\/])\\.env(\\.[^\\\\/]*)?$/i,
  /(^|[\\\\/])\\.ssh([\\\\/]|$)/i,
  /credentials[^\\\\/]*\\.(json|ya?ml)$/i,
];

function isDenied(filePath) {
  if (DENY_BASENAMES.has(path.basename(filePath))) return true;
  return DENY_PATTERNS.some(re => re.test(filePath));
}
// Mirrors match.ts
function normalizePath(p) {
  let norm = p.split('\\\\').join('/');
  while (norm.startsWith('./')) norm = norm.slice(2);
  return norm;
}

function matchesPattern(pattern, relPath) {
  const normPat = normalizePath(pattern);
  const normPath = normalizePath(relPath);
  if (normPat === '**') return true;
  if (!normPat.includes('/')) {
    const base = normPath.includes('/') ? normPath.slice(normPath.lastIndexOf('/') + 1) : normPath;
    let segRe = '^';
    for (let i = 0; i < normPat.length; i++) {
      const c = normPat[i];
      if (c === '*') segRe += '[^/]*';
      else if (c === '?') segRe += '[^/]';
      else segRe += '-\\\\^$*+?.()|[]{}'.indexOf(c) !== -1 ? '\\\\' + c : c;
    }
    segRe += '$';
    return new RegExp(segRe).test(base);
  }
  let reStr = '^';
  let i = 0;
  while (i < normPat.length) {
    if (normPat.startsWith('/**/', i)) {
      reStr += '(?:/.+)?/';
      i += 4;
    } else if (i === 0 && normPat.startsWith('**/', i)) {
      reStr += '(?:.+/)?';
      i += 3;
    } else if (normPat.startsWith('/**', i) && i + 3 === normPat.length) {
      reStr += '(?:/.*)?';
      i += 3;
    } else {
      const c = normPat[i];
      if (c === '*') reStr += '[^/]*';
      else if (c === '?') reStr += '[^/]';
      else reStr += '-\\\\^$*+?.()|[]{}'.indexOf(c) !== -1 ? '\\\\' + c : c;
      i++;
    }
  }
  reStr += '$';
  return new RegExp(reStr).test(normPath);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });

// ── Enforce mode: transcript verification ────────────────────────────────────
// Claude Code sends \`transcript_path\` (session JSONL) on hook stdin. A target
// file is covered when an assistant tool_use named *load_skills_for_files*
// listed a file that either equals the target's normalized project-relative
// path or shares its extension. Extension matching is deliberately lenient:
// loading rules for one *.ts file covers sibling *.ts edits. Only the last
// 5 MB is read, keeping the 5s hook timeout safe.
const TRANSCRIPT_MAX_BYTES = 5 * 1024 * 1024;

function readTranscriptTail(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - TRANSCRIPT_MAX_BYTES);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function toRelPath(p, projectDir) {
  // Resolve first so 'src/../Makefile' and 'Makefile' compare equal.
  return normalizePath(path.relative(projectDir, path.resolve(projectDir, p)));
}

function fileExtension(p) {
  const base = p.slice(p.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot).toLowerCase() : '';
}

function toolUseBlocks(entry) {
  const blocks = [];
  if (entry && entry.message && Array.isArray(entry.message.content)) {
    blocks.push(...entry.message.content);
  }
  if (entry && Array.isArray(entry.content)) blocks.push(...entry.content);
  return blocks;
}

// true = covering call found, false = readable but absent, null = unusable.
function transcriptCoversFile(transcriptPath, filePath, projectDir) {
  if (typeof transcriptPath !== 'string' || transcriptPath === '') return null;
  let text;
  try {
    text = readTranscriptTail(transcriptPath);
  } catch {
    return null;
  }
  const target = toRelPath(filePath, projectDir);
  const targetExt = fileExtension(target);
  const lines = text.split('\\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('load_skills_for_files') === -1) continue;
    let entry;
    try { entry = JSON.parse(lines[i]); } catch { continue; }
    const blocks = toolUseBlocks(entry);
    for (let j = 0; j < blocks.length; j++) {
      const block = blocks[j];
      if (!block || block.type !== 'tool_use') continue;
      const name = typeof block.name === 'string' ? block.name : '';
      if (!name.endsWith('load_skills_for_files')) continue;
      const files = block.input && Array.isArray(block.input.files) ? block.input.files : [];
      for (let k = 0; k < files.length; k++) {
        if (typeof files[k] !== 'string') continue;
        const candidate = toRelPath(files[k], projectDir);
        if (candidate === target) return true;
        if (targetExt !== '' && fileExtension(candidate) === targetExt) return true;
      }
    }
  }
  return false;
}

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

    const filePath = data.tool_input?.file_path || '';
    if (!filePath) process.exit(0);
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const policyFile = path.join(projectDir, '.ags/policy.json');
    let policyDoc = null;
    if (fs.existsSync(policyFile)) {
      try {
        const raw = fs.readFileSync(policyFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schema_version === 1 && Array.isArray(parsed.rules)) {
          let hasConflict = false;
          let invalidShape = false;
          const patternActions = {};
          for (let i = 0; i < parsed.rules.length; i++) {
            const r = parsed.rules[i];
            if (r && r.kind === 'protected_path') {
              if (!Array.isArray(r.paths) || !r.paths.every(function(p) { return typeof p === 'string'; })) {
                invalidShape = true;
                break;
              }
              const act = r.action || 'warn';
              for (let j = 0; j < r.paths.length; j++) {
                const np = normalizePath(r.paths[j]);
                if (patternActions[np] && patternActions[np] !== act) {
                  hasConflict = true;
                  break;
                }
                patternActions[np] = act;
              }
              if (hasConflict) break;
            }
          }
          if (invalidShape) {
            console.error('[AGS POLICY] ignored: invalid protected_path rule shape');
          } else if (hasConflict) {
            console.error('[AGS POLICY] ignored: conflicting action for pattern');
          } else {
            policyDoc = parsed;
          }
        } else {
          console.error('[AGS POLICY] ignored: schema_version must be 1 and rules must be an array');
        }
      } catch (err) {
        console.error('[AGS POLICY] ignored: ' + (err && err.message ? err.message : String(err)));
      }
    }

    if (policyDoc) {
      const relPath = normalizePath(path.isAbsolute(filePath) ? path.relative(projectDir, filePath) : filePath);
      const matched = [];
      for (let i = 0; i < policyDoc.rules.length; i++) {
        const r = policyDoc.rules[i];
        if (r && r.kind === 'protected_path' && Array.isArray(r.paths)) {
          if (r.paths.some(function(p) { return matchesPattern(p, relPath); })) {
            matched.push(r);
          }
        }
      }

      if (matched.length > 0) {
        const BYPASS = process.env.AGS_POLICY_BYPASS === '1' || process.env.AGS_POLICY_BYPASS === 'true';
        if (BYPASS) {
          // Waives policy rules only; deny-list and transcript gates still apply.
          const waived = matched.map(function(m) { return m.id; }).join(', ');
          console.error('[AGS POLICY] bypass active: waived ' + waived);
        } else {
          const blockRule = matched.find(function(m) { return (m.action || 'warn') === 'block'; });
          if (blockRule) {
            if (ENFORCE) {
              console.error('[AGS BLOCKED] ' + blockRule.id + ': ' + blockRule.reason);
              process.exit(2);
            } else {
              console.error('[AGS POLICY WARN] ' + blockRule.id + ': ' + blockRule.reason);
            }
          }

          for (let i = 0; i < matched.length; i++) {
            const m = matched[i];
            if ((m.action || 'warn') === 'warn') {
              console.error('[AGS POLICY WARN] ' + m.id + ': ' + m.reason);
            }
          }
        }
      }
    }

    if (ENFORCE && isDenied(filePath)) {
      console.error(
        '[AGS BLOCKED] Refusing to edit ' + path.basename(filePath) + ': ' +
        'matches the default identity/secret deny-list (SOUL.md, MEMORY.md, .env*, .ssh/, credentials*.json|yaml).\\n' +
        'If this edit is intentional, re-run \`ags hooks install\` (without --enforce) to return to advisory-only mode.'
      );
      process.exit(2);
    }

    // Harness / agent-config paths (.claude, .github, .codex, .agents, AGENTS.md,
    // CLAUDE.md, ...) skip only the skill-loading gate and the reminder below:
    // they are agent configuration, not skill-governed source. Policy rules and
    // the secret deny-list above already ran, so they still protect these paths.
    if (shouldSkip(filePath)) process.exit(0);

    if (ENFORCE) {
      const relTarget = toRelPath(filePath, projectDir);
      const covered = transcriptCoversFile(data.transcript_path, filePath, projectDir);
      if (covered === null) {
        console.error(
          '[AGS HOOK] No readable transcript_path on hook stdin; cannot verify ' +
          'load_skills_for_files(). Allowing this edit (fail-open).'
        );
      } else if (covered === false) {
        console.error(
          '[AGS BLOCKED] No load_skills_for_files() call covering ' + relTarget + ' in this session transcript.\\n' +
          '-> Call load_skills_for_files(files=[ "' + relTarget + '" ]) on the agent-skills-standard MCP, then retry.\\n' +
          '-> To return to advisory-only mode, re-run \`ags hooks install\` (without --enforce).'
        );
        process.exit(2);
      }
    }

    const fileName = path.basename(filePath);
    console.log(
      '[SKILL TRIGGER] Editing: ' + fileName + '\\n' +
      '-> Call load_skills_for_files(files=[ "' + filePath + '" ]) on the ' +
      'agent-skills-standard MCP. It returns applicable SKILL.md rules, ' +
      'or nothing if no skills match this file type.\\n' +
      '-> If this work spans a whole framework or migration, also call ' +
      'get_category_guide(category="...") for the framework-level map.'
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

export const CLAUDE_MCP_PERMISSION = 'mcp__agent-skills-standard__*';
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
    /**
     * Called only the first time a hook install would add the MCP
     * permission entry to an agent's settings file (not on subsequent
     * syncs once granted). If omitted, the permission is added without
     * prompting — the caller (SyncCommand) supplies this to gate it behind
     * user consent unless --yes was passed. Returning false skips adding
     * the permission entry but still installs the reminder script/hook.
     */
    promptPermission?: (agent: Agent) => Promise<boolean>;
    /**
     * Opt-in, Claude-only: block (exit 2) an Edit/Write/MultiEdit when either
     * (a) the target file matches the fixed identity/secret deny-list baked
     * into UNIVERSAL_SKILL_LOADER_JS (SOUL.md, MEMORY.md, .env*, .ssh/,
     * credentials*.json|yaml), or (b) the session transcript (Claude's
     * `transcript_path` on hook stdin) holds no load_skills_for_files() call
     * covering that file. Other agents' PreToolUse hooks aren't guaranteed to
     * honor a blocking exit code the same way, so this only affects Claude
     * regardless of which agents are passed in `agents`.
     *
     * This is not a permissions.filesystem.deny check: deny patterns cannot
     * see which skills an agent actually loaded. Enforcement instead replays
     * the session JSONL, which records every MCP tool call. Coverage is
     * exact-relative-path or same-extension, and the read is capped at the
     * last 5 MB to stay inside the hook's 5s timeout. Hosts that omit
     * transcript_path (or whose transcript is unreadable) fail open with a
     * stderr warning rather than blocking edits that cannot be verified.
     */
    enforce?: boolean;
  }): Promise<HookWriteReport> {
    const report: HookWriteReport = { writes: [], unsupported: [] };

    for (const agent of opts.agents) {
      const def = getAgentDefinition(agent);
      if (def.hookKind === 'kiro-md') {
        await this.installKiroHook(opts.rootDir, report);
        continue;
      }

      if (
        def.hookKind === 'js-pretooluse' &&
        def.hookScriptPath &&
        def.hookConfigPath
      ) {
        const enforcePrefix =
          opts.enforce && agent === Agent.Claude ? 'AGS_HOOK_ENFORCE=1 ' : '';
        await this.installStandardHookConfig({
          rootDir: opts.rootDir,
          agent,
          scriptRelPath: def.hookScriptPath,
          configRelPath: def.hookConfigPath,
          hookCmd:
            agent === Agent.Claude
              ? `${enforcePrefix}node "$CLAUDE_PROJECT_DIR/.claude/hooks/preedit-skill-loader.js"`
              : `node "${def.hookScriptPath}"`,
          report,
          promptPermission: opts.promptPermission,
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
      const def = getAgentDefinition(agent);
      if (def.hookKind === 'kiro-md') {
        const abs = path.join(opts.rootDir, KIRO_HOOK_REL);
        if (await fs.pathExists(abs)) {
          await fs.remove(abs);
          removed.push({ agent, file: KIRO_HOOK_REL });
        }
        continue;
      }

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
      const def = getAgentDefinition(agent);
      if (def.hookKind === 'kiro-md') {
        const exists = await fs.pathExists(
          path.join(opts.rootDir, KIRO_HOOK_REL),
        );
        rows.push({ agent, installed: exists, files: [KIRO_HOOK_REL] });
        continue;
      }

      if (
        def.hookKind === 'js-pretooluse' &&
        def.hookScriptPath &&
        def.hookConfigPath
      ) {
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
    promptPermission?: (agent: Agent) => Promise<boolean>;
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
      const existingScript = await fs.readFile(scriptAbs, 'utf8');
      const installedVersion = existingScript.match(
        HOOK_VERSION_MARKER_RE,
      )?.[1];
      // A recognized (but older) marker means this is our own previous
      // auto-generated file, not a user customization — safe to refresh.
      // No marker at all predates this feature; leave it untouched.
      if (installedVersion && installedVersion !== HOOK_SCRIPT_VERSION) {
        await fs.writeFile(scriptAbs, UNIVERSAL_SKILL_LOADER_JS);
        opts.report.writes.push({
          agent: opts.agent,
          file: opts.scriptRelPath,
          action: 'updated',
        });
      } else {
        opts.report.writes.push({
          agent: opts.agent,
          file: opts.scriptRelPath,
          action: 'skipped-existing',
        });
      }
    }

    const configAbs = path.join(opts.rootDir, opts.configRelPath);
    const configExists = await fs.pathExists(configAbs);
    const existing = await this.readJson(configAbs);
    let changed = false;

    // Add MCP permission (idempotent), gated behind consent when the
    // caller supplied a prompt — this previously wrote silently.
    const permissions = this.ensureObject(existing, 'permissions');
    const allow = this.ensureArray<string>(permissions, 'allow');
    if (!allow.includes(CLAUDE_MCP_PERMISSION)) {
      const consented = opts.promptPermission
        ? await opts.promptPermission(opts.agent)
        : true;
      if (consented) {
        permissions['allow'] = [CLAUDE_MCP_PERMISSION, ...allow];
        changed = true;
      }
    }

    // Add or refresh the PreToolUse hook entry (matched by script path
    // fragment, not exact command) — an existing entry whose command string
    // differs from opts.hookCmd (e.g. an AGS_HOOK_ENFORCE=1 prefix toggled
    // on/off since the last install) is replaced, not left stale.
    const hooks = this.ensureObject(existing, 'hooks');
    const preToolUse = this.ensureArray<Record<string, unknown>>(
      hooks,
      'PreToolUse',
    );
    const existingEntry = preToolUse.find((entry) =>
      this.claudeHookEntryMatches(entry),
    );
    if (!existingEntry) {
      preToolUse.unshift({
        matcher: 'Edit|Write|MultiEdit|NotebookEdit',
        hooks: [{ type: 'command', command: opts.hookCmd, timeout: 5 }],
      });
      changed = true;
    } else {
      const entryHooks = (existingEntry['hooks'] ?? []) as Array<
        Record<string, unknown>
      >;
      const matchingHook = entryHooks.find((h) =>
        (h['command'] as string | undefined)?.includes('preedit-skill-loader'),
      );
      if (matchingHook && matchingHook['command'] !== opts.hookCmd) {
        matchingHook['command'] = opts.hookCmd;
        changed = true;
      }
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
      Array<Record<string, unknown>> | undefined;
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
