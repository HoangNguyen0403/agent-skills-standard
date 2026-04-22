import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Agent } from '../../constants';
import {
  McpConfigService,
  SERVER_NAME,
  defaultMcpConfig,
} from '../McpConfigService';
import { McpConfig } from '../../models/config';

describe('McpConfigService', () => {
  let service: McpConfigService;
  let root: string;

  beforeEach(async () => {
    service = new McpConfigService();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-svc-'));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  function mcp(scope: McpConfig['scope']): McpConfig {
    return { enabled: true, scope, prompted: true };
  }

  describe('install — scope: disabled', () => {
    it('writes nothing', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude, Agent.Cursor],
        mcp: { ...defaultMcpConfig(), enabled: false },
      });
      expect(report.projectWrites).toEqual([]);
      expect(report.snippets).toEqual([]);
      expect(await fs.pathExists(path.join(root, '.mcp.json'))).toBe(false);
      expect(await fs.pathExists(path.join(root, 'mcp-config-snippets'))).toBe(
        false,
      );
    });
  });

  describe('install — scope: snippets-only', () => {
    it('writes snippet files but no runtime configs', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude, Agent.Cursor],
        mcp: mcp('snippets-only'),
      });
      expect(report.snippets).toHaveLength(2);
      expect(report.projectWrites).toEqual([]);
      expect(await fs.pathExists(path.join(root, '.mcp.json'))).toBe(false);
      const snippet = await fs.readJson(
        path.join(root, 'mcp-config-snippets', 'claude.json'),
      );
      expect(snippet.mcpServers[SERVER_NAME]).toEqual({
        command: 'npx',
        args: ['-y', 'agent-skills-standard-mcp'],
      });
    });
  });

  describe('install — scope: project', () => {
    it('writes project-scope configs and snippets, never user-scope', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude, Agent.Cursor],
        mcp: mcp('project'),
      });
      expect(report.projectWrites.map((w) => w.agent).sort()).toEqual(
        [Agent.Claude, Agent.Cursor].sort(),
      );
      expect(report.userWrites).toEqual([]);
      const claudeConfig = await fs.readJson(path.join(root, '.mcp.json'));
      expect(claudeConfig.mcpServers[SERVER_NAME].command).toBe('npx');
    });

    it('does not modify $HOME files even if a user-scope path exists', async () => {
      // Cursor has both project AND user scope. Project mode must NOT touch user.
      const fakeHome = path.join(os.homedir(), '.cursor', 'mcp.json');
      const homeExisted = await fs.pathExists(fakeHome);
      const homeBefore = homeExisted ? await fs.readJson(fakeHome) : null;
      try {
        await service.install({
          rootDir: root,
          agents: [Agent.Cursor],
          mcp: mcp('project'),
        });
        // We can't assert "no write" globally without mocking, but we can assert
        // the user file wasn't created as a side effect of our project run.
        if (!homeExisted) {
          expect(await fs.pathExists(fakeHome)).toBe(false);
        } else {
          const homeAfter = await fs.readJson(fakeHome);
          expect(homeAfter).toEqual(homeBefore);
        }
      } finally {
        if (homeExisted && homeBefore) {
          await fs.writeJson(fakeHome, homeBefore, { spaces: 2 });
        }
      }
    });
  });

  describe('install — scope: user', () => {
    it('declines user-scope writes when prompt returns false', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Cursor],
        mcp: mcp('user'),
        userScopePrompt: async () => false,
      });
      expect(report.userWrites).toEqual([]);
      expect(report.declined).toHaveLength(1);
      expect(report.declined[0].agent).toBe(Agent.Cursor);
      // Project-scope still happens regardless of user-scope decision.
      expect(report.projectWrites).toHaveLength(1);
    });
  });

  describe('safe-merge', () => {
    it('preserves OTHER mcp servers in the same file', async () => {
      const target = path.join(root, '.mcp.json');
      await fs.outputJson(target, {
        mcpServers: {
          'some-other-server': { command: 'foo', args: ['bar'] },
        },
      });

      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });

      const merged = await fs.readJson(target);
      expect(merged.mcpServers['some-other-server']).toEqual({
        command: 'foo',
        args: ['bar'],
      });
      expect(merged.mcpServers[SERVER_NAME]).toBeDefined();
    });

    it('returns "skipped-existing" when the entry is already correct', async () => {
      const first = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });
      expect(first.projectWrites[0].action).toBe('added');

      const second = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });
      expect(second.projectWrites[0].action).toBe('skipped-existing');
    });

    it('returns "updated" when a stale entry is rewritten', async () => {
      const target = path.join(root, '.mcp.json');
      await fs.outputJson(target, {
        mcpServers: {
          [SERVER_NAME]: { command: 'old-cmd', args: [] },
        },
      });

      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });
      expect(report.projectWrites[0].action).toBe('updated');
    });
  });

  describe('uninstall', () => {
    it('removes only our entry, leaves siblings alone', async () => {
      const target = path.join(root, '.mcp.json');
      await fs.outputJson(target, {
        mcpServers: {
          [SERVER_NAME]: { command: 'npx', args: ['-y', 'agent-skills-standard-mcp'] },
          'sibling-server': { command: 'foo' },
        },
      });

      const { removed } = await service.uninstall({
        rootDir: root,
        agents: [Agent.Claude],
        from: 'project',
      });

      expect(removed).toHaveLength(1);
      const after = await fs.readJson(target);
      expect(after.mcpServers[SERVER_NAME]).toBeUndefined();
      expect(after.mcpServers['sibling-server']).toEqual({ command: 'foo' });
    });

    it('is a no-op when our entry was never present', async () => {
      const target = path.join(root, '.mcp.json');
      await fs.outputJson(target, { mcpServers: { other: {} } });
      const { removed } = await service.uninstall({
        rootDir: root,
        agents: [Agent.Claude],
        from: 'project',
      });
      expect(removed).toEqual([]);
    });
  });

  describe('status', () => {
    it('reports project=true after an install, project=false after uninstall', async () => {
      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });
      const before = await service.status({ rootDir: root, agents: [Agent.Claude] });
      expect(before[0].project).toBe(true);

      await service.uninstall({
        rootDir: root,
        agents: [Agent.Claude],
        from: 'project',
      });
      const after = await service.status({ rootDir: root, agents: [Agent.Claude] });
      expect(after[0].project).toBe(false);
    });
  });

  describe('unsupported agents', () => {
    it('reports Copilot as unsupported (no MCP support yet)', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Copilot],
        mcp: mcp('project'),
      });
      expect(report.unsupported).toEqual([Agent.Copilot]);
      expect(report.projectWrites).toEqual([]);
    });
  });
});
