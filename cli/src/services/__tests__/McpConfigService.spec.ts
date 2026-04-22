import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { McpConfig } from '../../models/config';
import {
  McpConfigService,
  SERVER_NAME,
  defaultMcpConfig,
} from '../McpConfigService';

describe('McpConfigService', () => {
  let service: McpConfigService;
  let root: string;
  let mockHome: string;

  beforeEach(async () => {
    service = new McpConfigService();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-svc-'));
    mockHome = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-home-'));
    service.setHomeForTesting(mockHome);
  });

  it('exports defaultMcpConfig', () => {
    expect(defaultMcpConfig()).toEqual({
      enabled: false,
      scope: 'snippets-only',
      prompted: false,
    });
  });


  afterEach(async () => {
    await fs.remove(root);
    await fs.remove(mockHome);
  });

  function mcp(scope: McpConfig['scope']): McpConfig {
    return { enabled: true, scope, prompted: true };
  }

  describe('install', () => {
    it('writes project-scope configs and snippets', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });

      expect(report.projectWrites).toHaveLength(1);
      expect(report.projectWrites[0].agent).toBe(Agent.Claude);

      const data = await fs.readJson(path.join(root, '.mcp.json'));
      expect(data.mcpServers[SERVER_NAME]).toBeDefined();
    });

    it('returns early if mcp is disabled', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: { enabled: false, scope: 'project', prompted: true },
      });
      expect(report.projectWrites).toHaveLength(0);
    });

    it('returns early if scope is disabled', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: { enabled: true, scope: 'disabled', prompted: true },
      });
      expect(report.projectWrites).toHaveLength(0);
    });

    it('returns early after snippets if scope is snippets-only', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: { enabled: true, scope: 'snippets-only', prompted: true },
      });
      expect(report.projectWrites).toHaveLength(0);
      expect(report.snippets).toHaveLength(1);
    });

    it('handles unsupported agents', async () => {
      const report = await service.install({
        rootDir: root,
        agents: ['unsupported-agent' as any],
        mcp: mcp('project'),
      });
      expect(report.unsupported).toContain('unsupported-agent');
    });

    it('writes user-scope configs if user approves', async () => {
      const userPrompt = vi.fn().mockResolvedValue(true);
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('user'),
        userScopePrompt: userPrompt,
      });

      expect(userPrompt).toHaveBeenCalled();
      expect(report.userWrites).toHaveLength(1);

      const userConfigFile = path.join(mockHome, '.claude', '.mcp.json');
      expect(await fs.pathExists(userConfigFile)).toBe(true);
    });

    it('skips user-scope configs if user declines', async () => {
      const userPrompt = vi.fn().mockResolvedValue(false);
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('user'),
        userScopePrompt: userPrompt,
      });

      expect(userPrompt).toHaveBeenCalled();
      expect(report.userWrites).toHaveLength(0);
      expect(report.declined).toHaveLength(1);
    });

    it('skips user-scope configs if prompt is missing', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('user'),
      });

      expect(report.userWrites).toHaveLength(0);
    });
  });

  describe('uninstall', () => {
    it('removes from project scope', async () => {
      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });

      const res = await service.uninstall({
        rootDir: root,
        agents: [Agent.Claude],
        from: 'project',
      });

      expect(res.removed).toHaveLength(1);
      const data = await fs.readJson(path.join(root, '.mcp.json'));
      expect(data.mcpServers[SERVER_NAME]).toBeUndefined();
    });

    it('removes from all scopes', async () => {
      // Setup both scopes
      const userPrompt = vi.fn().mockResolvedValue(true);
      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('user'),
        userScopePrompt: userPrompt,
      });

      const res = await service.uninstall({
        rootDir: root,
        agents: [Agent.Claude],
        from: 'all',
      });

      expect(res.removed).toHaveLength(2);
    });

    it('skips removal if file does not exist', async () => {
      const res = await service.uninstall({
        rootDir: root,
        agents: [Agent.Claude],
        from: 'project',
      });
      expect(res.removed).toHaveLength(0);
    });

    it('skips if agent is unsupported', async () => {
      const res = await service.uninstall({
        rootDir: root,
        agents: ['unknown' as any],
        from: 'all',
      });
      expect(res.removed).toHaveLength(0);
    });
  });

  describe('status', () => {
    it('reports installed status correctly', async () => {
      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Claude, Agent.Cursor],
      });

      expect(stats.find((s) => s.agent === Agent.Claude)?.project).toBe(true);
      expect(stats.find((s) => s.agent === Agent.Cursor)?.project).toBe(false);
    });

    it('skips unsupported agents in status', async () => {
      const stats = await service.status({
        rootDir: root,
        agents: ['unknown' as any],
      });
      expect(stats).toHaveLength(0);
    });
  });

  describe('internal logic branches', () => {
    it('mergeFile: skips existing if identical', async () => {
      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });

      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });

      expect(report.projectWrites[0].action).toBe('skipped-existing');
    });

    it('mergeFile: updates if different', async () => {
      const target = path.join(root, '.mcp.json');
      await fs.outputJson(target, {
        mcpServers: { [SERVER_NAME]: { command: 'old' } },
      });

      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('project'),
      });

      expect(report.projectWrites[0].action).toBe('updated');
    });

    it('list-based config support (shape: "list")', async () => {
      const target: any = {
        agent: Agent.Claude,
        key: 'mcp.servers',
        shape: 'list',
      };
      const abs = path.join(root, 'list-mcp.json');
      const entry = { command: 'npx', args: ['foo'] };

      const action1 = await (service as any).mergeFile(abs, target, entry);
      expect(action1).toBe('added');

      const data1 = await fs.readJson(abs);
      expect(data1.mcp.servers).toHaveLength(1);
      expect(data1.mcp.servers[0].name).toBe(SERVER_NAME);

      // Same entry
      const action2 = await (service as any).mergeFile(abs, target, entry);
      expect(action2).toBe('skipped-existing');

      // Update entry
      const action3 = await (service as any).mergeFile(abs, target, {
        ...entry,
        args: ['bar'],
      });
      expect(action3).toBe('updated');

      const data2 = await fs.readJson(abs);
      expect(data2.mcp.servers[0].transport.args).toContain('bar');

      // Removal
      const removed = await (service as any).removeFromFile(abs, target);
      expect(removed).toBe(true);
      const data3 = await fs.readJson(abs);
      expect(data3.mcp.servers).toHaveLength(0);

      // Removal when not there
      const removed2 = await (service as any).removeFromFile(abs, target);
      expect(removed2).toBe(false);

      // Test buildFreshDoc for list
      const fresh: any = (service as any).buildFreshDoc(target, entry);
      expect(Array.isArray(fresh.mcp.servers)).toBe(true);
    });

    it('hasOurEntry support for list', async () => {
      const target: any = {
        agent: Agent.Claude,
        key: 'mcp.servers',
        shape: 'list',
      };
      const abs = path.join(root, 'list-check.json');

      expect(await (service as any).hasOurEntry(abs, target)).toBe(false);

      await fs.outputJson(abs, { mcp: { servers: [{ name: SERVER_NAME }] } });
      expect(await (service as any).hasOurEntry(abs, target)).toBe(true);

      // Test with missing container
      expect(
        await (service as any).hasOurEntry(abs, { ...target, key: 'wrong' }),
      ).toBe(false);
    });

    it('ensurePathContainer handles type mismatch', async () => {
      const data = { a: { b: [] } }; // expect object but got array
      const target: any = { key: 'a.b', shape: 'map' };
      (service as any).ensurePathContainer(data, target);
      expect((data as any).a.b).toEqual({});

      const data2 = { a: { b: {} } }; // expect array but got object
      const target2: any = { key: 'a.b', shape: 'list' };
      (service as any).ensurePathContainer(data2, target2);
      expect((data2 as any).a.b).toEqual([]);
    });

    it('getNestedValue returns undefined for non-objects', async () => {
      const data = { a: 1 };
      expect((service as any).getNestedValue(data, 'a.b')).toBeUndefined();
    });

    it('hasOurEntry returns false if data is null', async () => {
      const abs = path.join(root, 'null.json');
      await fs.outputFile(abs, '');
      const target: any = { key: 'foo', shape: 'map' };
      expect(await (service as any).hasOurEntry(abs, target)).toBe(false);
    });

    it('mergeFile handles corrupted JSON by returning empty object', async () => {
      const target = path.join(root, 'corrupt.json');
      await fs.outputFile(target, '{ invalid }');

      const mcpTarget: any = { key: 'mcpServers', shape: 'map' };
      const entry = { command: 'npx', args: ['foo'] };

      const action = await (service as any).mergeFile(target, mcpTarget, entry);
      expect(action).toBe('added'); // It should have treated it as {}
    });
  });

  describe('prototype pollution protection', () => {
    it('prevents pollution through setNestedValue (direct test)', async () => {
      const data = {};
      expect(() =>
        (service as any).setNestedValue(data, '__proto__.polluted', true),
      ).toThrow('Prototype pollution attempt detected');
      expect(() =>
        (service as any).setNestedValue(data, 'constructor.polluted', true),
      ).toThrow('Prototype pollution attempt detected');
      expect(() =>
        (service as any).setNestedValue(data, 'prototype.polluted', true),
      ).toThrow('Prototype pollution attempt detected');
    });

    it('prevents pollution through getNestedValue (direct test)', async () => {
      const data = {};
      expect(() =>
        (service as any).getNestedValue(data, 'constructor.polluted'),
      ).toThrow('Prototype pollution attempt detected');
      expect(() =>
        (service as any).getNestedValue(data, '__proto__.polluted'),
      ).toThrow('Prototype pollution attempt detected');
      expect(() =>
        (service as any).getNestedValue(data, 'prototype.polluted'),
      ).toThrow('Prototype pollution attempt detected');
    });

    it('prevents pollution in the last part of setNestedValue', async () => {
      const data = {};
      expect(() =>
        (service as any).setNestedValue(data, 'a.__proto__', true),
      ).toThrow('Prototype pollution attempt detected');
    });
  });
});
