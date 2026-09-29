import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { Agent } from '../constants';
import { AGENT_CAPABILITIES } from '../capabilities/agentCapabilities';
import { MCP_COMPATIBLE_VERSION } from '../constants/mcp';
import { McpConfig } from '../models/config';
import {
  hasTomlMcpServer,
  removeTomlMcpServer,
  renderTomlMcpServer,
  upsertTomlMcpServer,
} from './utils/codexTomlMcp';
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
  /** Configuration file format. Defaults to 'json'. */
  format?: 'json' | 'toml';
  /** Legacy JSON files to clean up when migrating to a new format. */
  legacyJson?: { projectFile: string | null; userFile: string | null };
}

export const SERVER_NAME = 'agent-skills-standard';
export const PACKAGE = 'agent-skills-standard-mcp';

const getTargets = (
  home = os.homedir(),
  platform: NodeJS.Platform = process.platform,
): Record<string, McpTarget> => {
  const out: Record<string, McpTarget> = {};
  for (const agent of Object.values(Agent)) {
    const spec = AGENT_CAPABILITIES[agent].mcp;
    if (!spec) continue;
    const target: McpTarget = {
      agent,
      projectFile: spec.projectFile,
      userFile: spec.userFile(home, platform),
      key: spec.key,
      shape: spec.shape,
    };
    if (spec.format) target.format = spec.format;
    if (spec.legacyJson) {
      target.legacyJson = {
        projectFile: spec.legacyJson.projectFile,
        userFile: spec.legacyJson.userFile(home),
      };
    }
    out[agent] = target;
  }
  return out;
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
  /**
   * Returns the standard MCP server entry our CLI proposes. Defaults to the
   * version this CLI was released with rather than an unversioned `npx -y
   * <package>`, which would otherwise pull whatever is latest on npm the
   * moment the agent starts — an unpinned update-drift surface (AST07).
   * Pass an explicit `version` (from `mcp.version` in .skillsrc) to override.
   */
  buildEntry(version?: string): { command: string; args: string[] } {
    const spec = `${PACKAGE}@${version || MCP_COMPATIBLE_VERSION}`;
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
    // Only generate snippets if:
    // 1. scope is 'snippets-only'
    // 2. user explicitly requested snippets via mcp.snippets flag
    if (mcp.scope === 'snippets-only' || mcp.snippets) {
      await this.generateSnippets(rootDir, agents, entry, report);
    }

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
        if (target.legacyJson?.projectFile) {
          await this.cleanupLegacyJson(
            path.join(rootDir, target.legacyJson.projectFile),
          );
        }
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
        if (target.legacyJson?.userFile) {
          await this.cleanupLegacyJson(target.legacyJson.userFile);
        }
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

      if (
        target.legacyJson?.projectFile &&
        (opts.from === 'project' || opts.from === 'all')
      ) {
        await this.cleanupLegacyJson(
          path.join(opts.rootDir, target.legacyJson.projectFile),
        );
      }
      if (
        target.legacyJson?.userFile &&
        (opts.from === 'user' || opts.from === 'all')
      ) {
        await this.cleanupLegacyJson(target.legacyJson.userFile);
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
      if (target.format === 'toml') {
        const file = path.join(dir, `${agent}.toml`);
        await fs.writeFile(
          file,
          renderTomlMcpServer(SERVER_NAME, entry),
          'utf8',
        );
        report.snippets.push({ agent, file: path.relative(rootDir, file) });
      } else {
        const file = path.join(dir, `${agent}.json`);
        const snippet = this.buildFreshDoc(target, entry);
        await fs.writeJson(file, snippet, { spaces: 2 });
        report.snippets.push({ agent, file: path.relative(rootDir, file) });
      }
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
    if (target.format === 'toml') {
      const text = (await fs.pathExists(abs))
        ? await fs.readFile(abs, 'utf8')
        : '';
      const r = upsertTomlMcpServer(text, SERVER_NAME, entry);
      if (r.action !== 'skipped-existing') {
        await this.writeAtomicText(abs, r.content);
      }
      return r.action;
    }
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
    if (target.format === 'toml') {
      if (!(await fs.pathExists(abs))) return false;
      const r = removeTomlMcpServer(
        await fs.readFile(abs, 'utf8'),
        SERVER_NAME,
      );
      if (r.removed) await this.writeAtomicText(abs, r.content);
      return r.removed;
    }
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
    if (target.format === 'toml') {
      return hasTomlMcpServer(await fs.readFile(abs, 'utf8'), SERVER_NAME);
    }
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

  private async writeAtomicText(abs: string, text: string): Promise<void> {
    await fs.ensureDir(path.dirname(abs));
    const tmp = `${abs}.tmp`;
    await fs.writeFile(tmp, text, 'utf8');
    await fs.move(tmp, abs, { overwrite: true });
  }

  private async cleanupLegacyJson(abs: string): Promise<void> {
    if (!(await fs.pathExists(abs))) return;
    await this.removeFromFile(abs, {
      agent: Agent.Codex,
      projectFile: null,
      userFile: null,
      key: 'mcpServers',
      shape: 'map',
    });
  }
}

/** Default mcp config block used when none is present in `.skillsrc`. */
export function defaultMcpConfig(): McpConfig {
  return { enabled: false, scope: 'snippets-only', prompted: false };
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
