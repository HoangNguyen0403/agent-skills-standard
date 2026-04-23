import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { Agent } from '../constants';
import { McpConfig } from '../models/config';

/**
 * Per-runtime MCP config-file location and JSON path.
 *
 * `projectFile` — path RELATIVE to the project root (we may write here freely
 *                 if scope is 'project' or 'user').
 * `userFile`    — ABSOLUTE path under $HOME (we only write here if scope is
 *                 'user' AND the user confirms each write).
 * `key`         — dotted JSON path under which servers are registered.
 *
 * `null` for either path means that runtime does not support that scope; in that
 * case we either skip (project scope) or surface only via snippet generation.
 */
export interface McpTarget {
  agent: Agent;
  /** Project-scope path, relative to project root. */
  projectFile: string | null;
  /** User-scope path, absolute (resolved at call time so $HOME is current). */
  userFile: string | null;
  /** Dotted JSON path where MCP servers live (e.g. "mcpServers", "experimental.modelContextProtocolServers"). */
  key: string;
  /** Whether the runtime stores servers as a map (key = server name) or a list. */
  shape: 'map' | 'list';
}

export const SERVER_NAME = 'agent-skills-standard';
export const PACKAGE = 'agent-skills-standard-mcp';

const getTargets = (home = os.homedir()): Record<string, McpTarget> => {
  const HOME = home;
  return {
    [Agent.Claude]: {
      agent: Agent.Claude,
      projectFile: '.mcp.json',
      userFile: path.join(HOME, '.claude', '.mcp.json'),
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Cursor]: {
      agent: Agent.Cursor,
      projectFile: '.cursor/mcp.json',
      userFile: (() => {
        if (process.platform === 'win32') {
          return path.join(
            HOME,
            'AppData',
            'Roaming',
            'Cursor',
            'User',
            'globalStorage',
            'mcp.json',
          );
        }
        if (process.platform === 'darwin') {
          return path.join(
            HOME,
            'Library',
            'Application Support',
            'Cursor',
            'User',
            'globalStorage',
            'mcp.json',
          );
        }
        if (process.platform === 'linux') {
          return path.join(
            HOME,
            '.config',
            'Cursor',
            'User',
            'globalStorage',
            'mcp.json',
          );
        }
        return path.join(HOME, '.cursor', 'mcp.json');
      })(),
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Antigravity]: {
      agent: Agent.Antigravity,
      projectFile: '.antigravity/mcp_config.json',
      userFile: (() => {
        if (process.platform === 'win32') {
          return path.join(
            HOME,
            'AppData',
            'Local',
            'Google',
            'Antigravity',
            'mcp_config.json',
          );
        }
        if (process.platform === 'darwin') {
          return path.join(
            HOME,
            'Library',
            'Application Support',
            'Google',
            'Antigravity',
            'mcp_config.json',
          );
        }
        return path.join(HOME, '.gemini', 'antigravity', 'mcp_config.json');
      })(),
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Kiro]: {
      agent: Agent.Kiro,
      projectFile: '.kiro/settings/mcp.json',
      userFile: (() => {
        if (process.platform === 'win32') {
          return path.join(
            HOME,
            'AppData',
            'Roaming',
            'Kiro',
            'settings',
            'mcp.json',
          );
        }
        return path.join(HOME, '.kiro', 'settings', 'mcp.json');
      })(),
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Windsurf]: {
      agent: Agent.Windsurf,
      projectFile: '.codeium/windsurf/mcp_config.json',
      userFile: (() => {
        if (process.platform === 'win32') {
          return path.join(
            HOME,
            'AppData',
            'Roaming',
            'Codeium',
            'Windsurf',
            'mcp_config.json',
          );
        }
        if (process.platform === 'darwin') {
          return path.join(
            HOME,
            'Library',
            'Application Support',
            'Codeium',
            'Windsurf',
            'mcp_config.json',
          );
        }
        return path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
      })(),
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Trae]: {
      agent: Agent.Trae,
      projectFile: '.trae/mcp.json',
      userFile: null,
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Roo]: {
      agent: Agent.Roo,
      projectFile: '.roo/mcp_config.json',
      userFile: null,
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Gemini]: {
      agent: Agent.Gemini,
      projectFile: '.gemini/settings.json',
      userFile: path.join(HOME, '.gemini', 'settings.json'),
      key: 'mcpServers',
      shape: 'map',
    },
    [Agent.Copilot]: {
      agent: Agent.Copilot,
      projectFile: '.vscode/mcp.json',
      userFile: (() => {
        if (process.platform === 'darwin') {
          return path.join(
            HOME,
            'Library',
            'Application Support',
            'Code',
            'User',
            'globalStorage',
            'github.copilot-chat',
            'mcp.json',
          );
        }
        if (process.platform === 'win32') {
          return path.join(
            HOME,
            'AppData',
            'Roaming',
            'Code',
            'User',
            'globalStorage',
            'github.copilot-chat',
            'mcp.json',
          );
        }
        if (process.platform === 'linux') {
          return path.join(
            HOME,
            '.config',
            'Code',
            'User',
            'globalStorage',
            'github.copilot-chat',
            'mcp.json',
          );
        }
        return null;
      })(),
      key: 'servers',
      shape: 'map',
    },
    [Agent.OpenCode]: {
      agent: Agent.OpenCode,
      projectFile: 'opencode.json',
      userFile: path.join(HOME, '.config', 'opencode', 'opencode.json'),
      key: 'mcp',
      shape: 'map',
    },
    [Agent.OpenAI]: {
      agent: Agent.OpenAI,
      projectFile: '.codex/mcp.json',
      userFile: path.join(HOME, '.codex', 'mcp.json'),
      key: 'mcpServers',
      shape: 'map',
    },
  };
};

/** What a sync/install pass actually did, returned for reporting. */
export interface McpWriteReport {
  /** Agents whose project-scope config was written or updated. */
  projectWrites: Array<{
    agent: Agent;
    file: string;
    action: 'added' | 'updated' | 'skipped-existing';
  }>;
  /** Agents whose user-scope config was written (only happens with explicit consent). */
  userWrites: Array<{
    agent: Agent;
    file: string;
    action: 'added' | 'updated' | 'skipped-existing';
  }>;
  /** Snippet files produced under `mcp-config-snippets/`. */
  snippets: Array<{ agent: Agent; file: string }>;
  /** Agents we asked about but the user declined. */
  declined: Array<{ agent: Agent; file: string }>;
  /** Agents that have no MCP support and were skipped. */
  unsupported: Agent[];
}

export interface UserScopePrompt {
  (agent: Agent, file: string): Promise<boolean>;
}

/**
 * Owns all MCP-config writes. Pure logic — never prompts the user directly.
 * The caller (sync command, mcp subcommand) supplies a `userScopePrompt`
 * callback that is invoked ONLY when the user has chosen `scope: 'user'` AND
 * a user-home file is about to be modified.
 */
export class McpConfigService {
  /** Returns the standard MCP server entry our CLI proposes. */
  buildEntry(version?: string): { command: string; args: string[] } {
    const spec = version ? `${PACKAGE}@${version}` : PACKAGE;
    return { command: 'npx', args: ['-y', spec] };
  }

  /** For testing: allows overriding the home directory. */
  private testHome: string | null = null;
  setHomeForTesting(home: string | null): void {
    this.testHome = home;
  }

  private getTargets(): Record<string, McpTarget> {
    return getTargets(this.testHome ?? undefined);
  }

  /**
   * Write MCP configs for the given agents based on the configured scope.
   * Always safe-merge (never overwrite other servers, never replace whole files).
   */
  async install(opts: {
    rootDir: string;
    agents: Agent[];
    mcp: McpConfig;
    /** Required when mcp.scope === 'user'. Called per file before any write. */
    userScopePrompt?: UserScopePrompt;
  }): Promise<McpWriteReport> {
    const report: McpWriteReport = {
      projectWrites: [],
      userWrites: [],
      snippets: [],
      declined: [],
      unsupported: [],
    };
    const { rootDir, agents, mcp } = opts;

    if (mcp.scope === 'disabled' || !mcp.enabled) {
      return report;
    }

    const TARGETS = this.getTargets();
    const entry = this.buildEntry(mcp.version);
    // mcp.scope cannot be 'disabled' here (early-returned above), so always
    // generate snippets when we reach this point.
    await this.generateSnippets(rootDir, agents, entry, report);

    if (mcp.scope === 'snippets-only') {
      return report;
    }

    for (const agent of agents) {
      const target = TARGETS[agent];
      if (!target) {
        report.unsupported.push(agent);
        continue;
      }

      // Project-scope writes — always allowed when scope is project or user.
      if (target.projectFile) {
        const abs = path.join(rootDir, target.projectFile);
        const action = await this.mergeFile(abs, target, entry);
        report.projectWrites.push({ agent, file: target.projectFile, action });
      }

      // User-scope writes — only with scope === 'user' AND per-file consent.
      if (mcp.scope === 'user' && target.userFile) {
        const ok = opts.userScopePrompt
          ? await opts.userScopePrompt(agent, target.userFile)
          : false;
        if (!ok) {
          report.declined.push({ agent, file: target.userFile });
          continue;
        }
        const action = await this.mergeFile(target.userFile, target, entry);
        report.userWrites.push({ agent, file: target.userFile, action });
      }
    }

    return report;
  }

  /**
   * Remove our MCP entry from configs we may have added it to. Other entries
   * in the same file are untouched.
   */
  async uninstall(opts: {
    rootDir: string;
    agents: Agent[];
    /** Where to remove from. 'all' removes from BOTH project and user files. */
    from: 'project' | 'user' | 'all';
  }): Promise<{ removed: Array<{ agent: Agent; file: string }> }> {
    const removed: Array<{ agent: Agent; file: string }> = [];
    const TARGETS = this.getTargets();
    for (const agent of opts.agents) {
      const target = TARGETS[agent];
      if (!target) continue;

      const candidates: Array<{ abs: string; rel: string }> = [];
      if (
        target.projectFile &&
        (opts.from === 'project' || opts.from === 'all')
      ) {
        candidates.push({
          abs: path.join(opts.rootDir, target.projectFile),
          rel: target.projectFile,
        });
      }
      if (target.userFile && (opts.from === 'user' || opts.from === 'all')) {
        candidates.push({ abs: target.userFile, rel: target.userFile });
      }

      for (const { abs, rel } of candidates) {
        if (!(await fs.pathExists(abs))) continue;
        const removedHere = await this.removeFromFile(abs, target);
        if (removedHere) removed.push({ agent, file: rel });
      }
    }
    return { removed };
  }

  /** Snapshot what's currently installed. Read-only. */
  async status(opts: {
    rootDir: string;
    agents: Agent[];
  }): Promise<Array<{ agent: Agent; project?: boolean; user?: boolean }>> {
    const out: Array<{ agent: Agent; project?: boolean; user?: boolean }> = [];
    const TARGETS = this.getTargets();
    for (const agent of opts.agents) {
      const target = TARGETS[agent];
      if (!target) continue;
      const row: { agent: Agent; project?: boolean; user?: boolean } = {
        agent,
      };
      if (target.projectFile) {
        row.project = await this.hasOurEntry(
          path.join(opts.rootDir, target.projectFile),
          target,
        );
      }
      if (target.userFile) {
        row.user = await this.hasOurEntry(target.userFile, target);
      }
      out.push(row);
    }
    return out;
  }

  // ---- private helpers ----

  private async generateSnippets(
    rootDir: string,
    agents: Agent[],
    entry: { command: string; args: string[] },
    report: McpWriteReport,
  ): Promise<void> {
    const dir = path.join(rootDir, 'mcp-config-snippets');
    await fs.ensureDir(dir);
    const TARGETS = this.getTargets();
    for (const agent of agents) {
      const target = TARGETS[agent];
      if (!target) continue;
      const file = path.join(dir, `${agent}.json`);
      const snippet = this.buildFreshDoc(target, entry);
      await fs.writeJson(file, snippet, { spaces: 2 });
      report.snippets.push({ agent, file: path.relative(rootDir, file) });
    }
  }

  /**
   * Read-modify-write a config file. Only the SERVER_NAME key is touched.
   * Never replaces or removes other entries.
   */
  private async mergeFile(
    abs: string,
    target: McpTarget,
    entry: { command: string; args: string[] },
  ): Promise<'added' | 'updated' | 'skipped-existing'> {
    const existing = (await fs.pathExists(abs))
      ? ((await fs.readJson(abs).catch(() => ({}))) as Record<string, unknown>)
      : {};

    const container = this.ensurePathContainer(existing, target);

    if (target.shape === 'map') {
      const map = container as Record<string, unknown>;
      const previous = map[SERVER_NAME];
      const next = entry;
      if (previous && deepEqual(previous, next)) {
        return 'skipped-existing';
      }
      map[SERVER_NAME] = next;
      await this.writeAtomic(abs, existing);
      return previous ? 'updated' : 'added';
    } else {
      // shape === 'list'
      const list = container as Array<Record<string, unknown>>;
      const idx = list.findIndex((item) => item.name === SERVER_NAME);
      const next = {
        name: SERVER_NAME,
        transport: { type: 'stdio', ...entry },
      };
      if (idx >= 0) {
        if (deepEqual(list[idx], next)) return 'skipped-existing';
        list[idx] = next;
        await this.writeAtomic(abs, existing);
        return 'updated';
      }
      list.push(next);
      await this.writeAtomic(abs, existing);
      return 'added';
    }
  }

  private async removeFromFile(
    abs: string,
    target: McpTarget,
  ): Promise<boolean> {
    const data = (await fs.readJson(abs).catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!data) return false;
    const container = this.ensurePathContainer(data, target);
    if (target.shape === 'map') {
      const map = container as Record<string, unknown>;
      if (!(SERVER_NAME in map)) return false;
      delete map[SERVER_NAME];
      await this.writeAtomic(abs, data);
      return true;
    } else {
      const list = container as Array<Record<string, unknown>>;
      const before = list.length;
      const filtered = list.filter((item) => item.name !== SERVER_NAME);
      if (filtered.length === before) return false;
      this.setNestedValue(data, target.key, filtered);
      await this.writeAtomic(abs, data);
      return true;
    }
  }

  private async hasOurEntry(abs: string, target: McpTarget): Promise<boolean> {
    if (!(await fs.pathExists(abs))) return false;
    const data = (await fs.readJson(abs).catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!data) return false;
    const container = this.getNestedValue(data, target.key);
    if (!container) return false;
    if (target.shape === 'map') {
      return Boolean((container as Record<string, unknown>)[SERVER_NAME]);
    }
    return (container as Array<Record<string, unknown>>).some(
      (item) => item.name === SERVER_NAME,
    );
  }

  private buildFreshDoc(
    target: McpTarget,
    entry: { command: string; args: string[] },
  ): Record<string, unknown> {
    const doc: Record<string, unknown> = {};
    const container =
      target.shape === 'map'
        ? { [SERVER_NAME]: entry }
        : [{ name: SERVER_NAME, transport: { type: 'stdio', ...entry } }];
    this.setNestedValue(doc, target.key, container);
    return doc;
  }

  private ensurePathContainer(
    data: Record<string, unknown>,
    target: McpTarget,
  ): unknown {
    const existing = this.getNestedValue(data, target.key);
    if (existing) {
      if (target.shape === 'map') {
        if (
          typeof existing === 'object' &&
          existing !== null &&
          !Array.isArray(existing)
        ) {
          return existing;
        }
      } else if (target.shape === 'list') {
        if (Array.isArray(existing)) {
          return existing;
        }
      }
      // Type mismatch: replace it
    }
    const fresh: unknown = target.shape === 'map' ? {} : [];
    this.setNestedValue(data, target.key, fresh);
    return fresh;
  }

  private getNestedValue(
    data: Record<string, unknown>,
    dotted: string,
  ): unknown {
    const parts = dotted.split('.');
    let cur: unknown = data;
    for (const p of parts) {
      if (p === '__proto__' || p === 'constructor' || p === 'prototype') {
        throw new Error(
          `Prototype pollution attempt detected in key: ${dotted}`,
        );
      }
      if (typeof cur !== 'object' || cur === null) return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  }

  private setNestedValue(
    data: Record<string, unknown>,
    dotted: string,
    value: unknown,
  ): void {
    const parts = dotted.split('.');
    let cur = data;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (p === '__proto__' || p === 'constructor' || p === 'prototype') {
        throw new Error(
          `Prototype pollution attempt detected in key: ${dotted}`,
        );
      }
      if (typeof cur[p] !== 'object' || cur[p] === null) {
        cur[p] = {};
      }
      cur = cur[p] as Record<string, unknown>;
    }

    const last = parts[parts.length - 1];
    if (
      last === '__proto__' ||
      last === 'constructor' ||
      last === 'prototype'
    ) {
      throw new Error(`Prototype pollution attempt detected in key: ${dotted}`);
    }
    cur[last] = value;
  }

  private async writeAtomic(abs: string, data: unknown): Promise<void> {
    await fs.ensureDir(path.dirname(abs));
    const tmp = `${abs}.tmp`;
    await fs.writeJson(tmp, data, { spaces: 2 });
    await fs.move(tmp, abs, { overwrite: true });
  }
}

/** Default mcp config block used when none is present in `.skillsrc`. */
export function defaultMcpConfig(): McpConfig {
  return { enabled: false, scope: 'snippets-only', prompted: false };
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
