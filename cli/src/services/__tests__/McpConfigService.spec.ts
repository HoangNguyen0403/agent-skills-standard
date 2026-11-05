import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { McpConfig } from '../../models/config';
import {
  McpConfigService,
  McpTarget,
  PACKAGE,
  SERVER_NAME,
  defaultMcpConfig,
  globalVersionProbeCommand,
} from '../McpConfigService';
import { MCP_COMPATIBLE_VERSION } from '../../constants/mcp';

describe('McpConfigService', () => {
  let service: McpConfigService;
  let root: string;
  let mockHome: string;

  beforeEach(async () => {
    service = new McpConfigService();
    service.setPlatformForTesting('linux');
    service.setGlobalVersionProbeForTesting(() => null);
    service.setGlobalManifestProbeForTesting(() => null);
    service.setGlobalPathProbeForTesting(null);
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

  describe('buildEntry', () => {
    it('npx mode pins to the CLI-compatible MCP version with --prefer-offline', () => {
      const entry = service.buildEntry({ via: 'npx' });
      expect(entry).toEqual({
        command: 'npx',
        args: [
          '-y',
          '--prefer-offline',
          `${PACKAGE}@${MCP_COMPATIBLE_VERSION}`,
        ],
      });
    });

    it('npx mode honors an explicit version override', () => {
      const entry = service.buildEntry({ version: '1.2.3', via: 'npx' });
      expect(entry.args).toContain(`${PACKAGE}@1.2.3`);
      expect(entry.args[0]).toBe('-y');
      expect(entry.args[1]).toBe('--prefer-offline');
    });

    it('global mode uses the POSIX binary directly', () => {
      service.setPlatformForTesting('linux');
      expect(service.buildEntry({ via: 'global' })).toEqual({
        command: 'ags-mcp',
        args: [],
      });
    });

    it('global mode uses cmd /c on win32', () => {
      service.setPlatformForTesting('win32');
      expect(service.buildEntry({ via: 'global' })).toEqual({
        command: 'cmd',
        args: ['/c', 'ags-mcp'],
      });
    });

    it('auto uses the global binary when the detected version matches the pin', () => {
      service.setGlobalVersionProbeForTesting(() => MCP_COMPATIBLE_VERSION);
      expect(service.buildEntry({ via: 'auto' })).toEqual({
        command: 'ags-mcp',
        args: [],
      });
    });

    it('auto uses a manifest-verified global binary published before --version', () => {
      service.setGlobalVersionProbeForTesting(() => null);
      service.setGlobalManifestProbeForTesting(() => MCP_COMPATIBLE_VERSION);
      expect(service.buildEntry({ via: 'auto' }).command).toBe('ags-mcp');
    });

    it('auto falls back to npx when the probe misses', () => {
      service.setGlobalVersionProbeForTesting(() => null);
      const entry = service.buildEntry({ via: 'auto' });
      expect(entry.command).toBe('npx');
      expect(entry.args).toContain(`${PACKAGE}@${MCP_COMPATIBLE_VERSION}`);
    });

    it('auto falls back to npx when the global version differs from the pin', () => {
      service.setGlobalVersionProbeForTesting(() => '9.9.9');
      expect(service.buildEntry({ via: 'auto' }).command).toBe('npx');
    });

    it('auto never uses a global binary on win32', () => {
      service.setPlatformForTesting('win32');
      service.setGlobalVersionProbeForTesting(() => MCP_COMPATIBLE_VERSION);
      expect(service.buildEntry({ via: 'auto' }).command).toBe('npx');
    });

    it('omitting via defaults to auto', () => {
      service.setGlobalVersionProbeForTesting(() => MCP_COMPATIBLE_VERSION);
      expect(service.buildEntry().command).toBe('ags-mcp');
    });
  });

  describe('detectGlobalVersion', () => {
    it('returns the injected probe value', () => {
      service.setGlobalVersionProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBe('0.8.0');
    });

    it('returns null when the binary is not on PATH', () => {
      service.setGlobalVersionProbeForTesting(() => {
        throw Object.assign(new Error('spawn ags-mcp ENOENT'), {
          code: 'ENOENT',
        });
      });
      expect(service.detectGlobalVersion()).toBeNull();
    });

    it('falls back to the global manifest when the binary prints no version', () => {
      // Published servers before `--version` support start the stdio server
      // instead of printing anything, so the manifest is the only truth.
      service.setGlobalVersionProbeForTesting(() => null);
      service.setGlobalManifestProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBe('0.8.0');
    });

    it('never trusts the manifest when the binary is missing', () => {
      service.setGlobalVersionProbeForTesting(() => {
        throw Object.assign(new Error('spawn ags-mcp ENOENT'), {
          code: 'ENOENT',
        });
      });
      service.setGlobalManifestProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBeNull();
    });

    it('prefers the binary version over the manifest', () => {
      service.setGlobalVersionProbeForTesting(() => '0.9.0');
      service.setGlobalManifestProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBe('0.9.0');
    });

    it('does not trust the manifest on win32 when the shim is not on PATH', () => {
      service.setPlatformForTesting('win32');
      service.setGlobalVersionProbeForTesting(() => null);
      service.setGlobalPathProbeForTesting(() => false);
      service.setGlobalManifestProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBeNull();
    });

    it('allows the manifest fallback on win32 for a resolvable legacy binary', () => {
      service.setPlatformForTesting('win32');
      service.setGlobalVersionProbeForTesting(() => null);
      service.setGlobalPathProbeForTesting(() => true);
      service.setGlobalManifestProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBe('0.8.0');
    });

    it('returns the win32 version probe result without consulting PATH', () => {
      service.setPlatformForTesting('win32');
      const pathProbe = vi.fn(() => false);
      service.setGlobalVersionProbeForTesting(() => MCP_COMPATIBLE_VERSION);
      service.setGlobalPathProbeForTesting(pathProbe);
      service.setGlobalManifestProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBe(MCP_COMPATIBLE_VERSION);
      expect(pathProbe).not.toHaveBeenCalled();
    });

    it('keeps the POSIX manifest fallback without a PATH gate', () => {
      service.setPlatformForTesting('linux');
      service.setGlobalVersionProbeForTesting(() => null);
      service.setGlobalPathProbeForTesting(() => false);
      service.setGlobalManifestProbeForTesting(() => '0.8.0');
      expect(service.detectGlobalVersion()).toBe('0.8.0');
    });
  });

  describe('globalVersionProbeCommand', () => {
    it('invokes the binary directly on POSIX without a shell', () => {
      expect(globalVersionProbeCommand('darwin')).toEqual({
        command: 'ags-mcp',
        args: ['--version'],
      });
      expect(globalVersionProbeCommand('linux')).toEqual({
        command: 'ags-mcp',
        args: ['--version'],
      });
    });

    it('goes through cmd /c on Windows so the npm .cmd shim is spawnable', () => {
      expect(globalVersionProbeCommand('win32')).toEqual({
        command: 'cmd',
        args: ['/c', 'ags-mcp', '--version'],
      });
    });
  });

  describe('detectGlobalVersion — real probes', () => {
    const originalPath = process.env.PATH;
    let binDir: string;
    let globalRoot: string;

    async function writeExecutable(name: string, body: string): Promise<void> {
      const file = path.join(binDir, name);
      await fs.writeFile(file, `#!/bin/sh\n${body}\n`);
      await fs.chmod(file, 0o755);
    }

    async function writeManifest(version: string): Promise<void> {
      await fs.outputJson(
        path.join(globalRoot, PACKAGE, 'package.json'),
        { version },
        { spaces: 2 },
      );
    }

    beforeEach(async () => {
      // Use the real probes: PATH is isolated to a temp bin directory.
      service.setGlobalVersionProbeForTesting(null);
      service.setGlobalManifestProbeForTesting(null);
      binDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-bin-'));
      globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-groot-'));
      process.env.PATH = binDir;
    });

    afterEach(async () => {
      process.env.PATH = originalPath;
      await fs.remove(binDir);
      await fs.remove(globalRoot);
    });

    const posixOnly = process.platform === 'win32' ? it.skip : it;

    posixOnly('reads the version from `ags-mcp --version`', async () => {
      await writeExecutable('ags-mcp', 'echo 0.8.0');
      expect(service.detectGlobalVersion()).toBe('0.8.0');
    });

    posixOnly(
      'ignores silence and falls back to the global manifest',
      async () => {
        // Published servers before `--version` support start the stdio server
        // instead of printing a version.
        await writeExecutable('ags-mcp', 'exit 0');
        await writeExecutable('npm', `echo ${globalRoot}`);
        await writeManifest('0.8.0');
        expect(service.detectGlobalVersion()).toBe('0.8.0');
      },
    );

    posixOnly(
      'falls back to the manifest when the binary exits non-zero',
      async () => {
        await writeExecutable('ags-mcp', 'exit 1');
        await writeExecutable('npm', `echo ${globalRoot}`);
        await writeManifest('0.8.0');
        expect(service.detectGlobalVersion()).toBe('0.8.0');
      },
    );

    posixOnly('returns null when `npm root -g` fails', async () => {
      await writeExecutable('ags-mcp', 'exit 0');
      await writeExecutable('npm', 'exit 1');
      expect(service.detectGlobalVersion()).toBeNull();
    });

    posixOnly('returns null when `npm root -g` prints nothing', async () => {
      await writeExecutable('ags-mcp', 'exit 0');
      await writeExecutable('npm', ':');
      expect(service.detectGlobalVersion()).toBeNull();
    });

    posixOnly('returns null when the global manifest is absent', async () => {
      await writeExecutable('ags-mcp', 'exit 0');
      await writeExecutable('npm', `echo ${globalRoot}`);
      expect(service.detectGlobalVersion()).toBeNull();
    });

    posixOnly(
      'returns null when the manifest version is not semver',
      async () => {
        await writeExecutable('ags-mcp', 'exit 0');
        await writeExecutable('npm', `echo ${globalRoot}`);
        await writeManifest('not-a-version');
        expect(service.detectGlobalVersion()).toBeNull();
      },
    );

    posixOnly(
      'never consults the manifest when `ags-mcp` is absent',
      async () => {
        await writeExecutable('npm', `echo ${globalRoot}`);
        await writeManifest('0.8.0');
        expect(service.detectGlobalVersion()).toBeNull();
      },
    );
  });

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

    it('carries the parsed json-map entry for project and user scopes', async () => {
      const userPrompt = vi.fn().mockResolvedValue(true);
      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: mcp('user'),
        userScopePrompt: userPrompt,
      });
      const expected = service.buildEntry({ via: 'npx' });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Claude],
      });

      expect(stats[0].projectEntry).toEqual(expected);
      expect(stats[0].userEntry).toEqual(expected);
    });

    it('carries the parsed json-list entry from the transport block', async () => {
      const listTarget: McpTarget = {
        agent: Agent.Claude,
        projectFile: 'list-mcp.json',
        userFile: null,
        key: 'mcp.servers',
        shape: 'list',
      };
      vi.spyOn(
        service as unknown as { getTargets(): Record<string, McpTarget> },
        'getTargets',
      ).mockReturnValue({ [Agent.Claude]: listTarget });
      const expected = service.buildEntry({ via: 'npx' });
      await fs.outputJson(path.join(root, 'list-mcp.json'), {
        mcp: {
          servers: [
            {
              name: SERVER_NAME,
              transport: { type: 'stdio', ...expected },
            },
          ],
        },
      });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Claude],
      });

      expect(stats[0].projectEntry).toEqual(expected);
    });

    it('carries the parsed TOML entry', async () => {
      await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: mcp('project'),
      });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Codex],
      });

      expect(stats[0].projectEntry).toEqual(service.buildEntry({ via: 'npx' }));
    });

    it('defaults missing args to an empty array', async () => {
      await fs.outputJson(path.join(root, '.mcp.json'), {
        mcpServers: { [SERVER_NAME]: { command: 'ags-mcp' } },
      });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Claude],
      });

      expect(stats[0].projectEntry).toEqual({
        command: 'ags-mcp',
        args: [],
      });
    });

    it('returns null entries for files without our valid entry', async () => {
      await fs.outputJson(path.join(root, '.mcp.json'), {
        mcpServers: {
          [SERVER_NAME]: { command: 42, args: 'not-an-array' },
        },
      });
      await fs.outputJson(path.join(root, '.cursor', 'mcp.json'), {
        mcpServers: {},
      });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Claude, Agent.Cursor],
      });

      expect(stats[0].projectEntry).toBeNull();
      expect(stats[1].projectEntry).toBeNull();
    });

    it('returns null for list entries without a valid transport', async () => {
      const listTarget: McpTarget = {
        agent: Agent.Claude,
        projectFile: 'list-invalid.json',
        userFile: null,
        key: 'mcp.servers',
        shape: 'list',
      };
      vi.spyOn(
        service as unknown as { getTargets(): Record<string, McpTarget> },
        'getTargets',
      ).mockReturnValue({ [Agent.Claude]: listTarget });
      await fs.outputJson(path.join(root, 'list-invalid.json'), {
        mcp: { servers: [{ name: SERVER_NAME }] },
      });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Claude],
      });

      expect(stats[0].projectEntry).toBeNull();
    });
    it('returns null when a container has the wrong shape', async () => {
      const listTarget: McpTarget = {
        agent: Agent.Claude,
        projectFile: 'shape-list.json',
        userFile: null,
        key: 'mcp.servers',
        shape: 'list',
      };
      const mapTarget: McpTarget = {
        agent: Agent.Cursor,
        projectFile: 'shape-map.json',
        userFile: null,
        key: 'mcpServers',
        shape: 'map',
      };
      vi.spyOn(
        service as unknown as { getTargets(): Record<string, McpTarget> },
        'getTargets',
      ).mockReturnValue({
        [Agent.Claude]: listTarget,
        [Agent.Cursor]: mapTarget,
      });
      await fs.outputJson(path.join(root, 'shape-list.json'), {
        mcp: { servers: {} },
      });
      await fs.outputJson(path.join(root, 'shape-map.json'), {
        mcpServers: [],
      });

      const stats = await service.status({
        rootDir: root,
        agents: [Agent.Claude, Agent.Cursor],
      });

      expect(stats[0].projectEntry).toBeNull();
      expect(stats[1].projectEntry).toBeNull();
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

  describe('platform-specific paths', () => {
    const originalPlatform = process.platform;

    const normalizedPath = (value: string) => value.split(path.sep).join('/');

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('uses correct Cursor paths on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const targets = (service as any).getTargets();
      expect(normalizedPath(targets[Agent.Cursor].userFile)).toContain(
        'AppData/Roaming/Cursor',
      );
    });

    it('uses correct Cursor paths on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const targets = (service as any).getTargets();
      expect(normalizedPath(targets[Agent.Cursor].userFile)).toContain(
        '.config/Cursor',
      );
    });

    it('uses correct Antigravity paths on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const targets = (service as any).getTargets();
      expect(normalizedPath(targets[Agent.Antigravity].userFile)).toContain(
        'AppData/Local/Google/Antigravity',
      );
    });

    it('uses correct Kiro paths on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const targets = (service as any).getTargets();
      expect(normalizedPath(targets[Agent.Kiro].userFile)).toContain(
        'AppData/Roaming/Kiro',
      );
    });

    it('uses correct Windsurf paths on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const targets = (service as any).getTargets();
      expect(normalizedPath(targets[Agent.Windsurf].userFile)).toContain(
        'AppData/Roaming/Codeium/Windsurf',
      );
    });

    it('uses correct Copilot paths on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const targets = (service as any).getTargets();
      expect(normalizedPath(targets[Agent.Copilot].userFile)).toContain(
        'AppData/Roaming/Code/User',
      );
    });

    it('uses correct Copilot paths on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const targets = (service as any).getTargets();
      expect(normalizedPath(targets[Agent.Copilot].userFile)).toContain(
        '.config/Code/User',
      );
    });
  });

  describe('Codex TOML target', () => {
    it('writes [mcp_servers.agent-skills-standard] to .codex/config.toml, preserving other keys', async () => {
      const file = path.join(root, '.codex', 'config.toml');
      await fs.outputFile(file, 'sandbox_mode = "workspace-write"\n');
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: mcp('project'),
      });
      const text = await fs.readFile(file, 'utf8');
      expect(text.startsWith('sandbox_mode = "workspace-write"\n')).toBe(true);
      expect(text).toContain('[mcp_servers.agent-skills-standard]');
      expect(report.projectWrites).toEqual([
        { agent: Agent.Codex, file: '.codex/config.toml', action: 'added' },
      ]);
    });
    it('second install is skipped-existing and leaves the file unchanged', async () => {
      await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: mcp('project'),
      });
      const file = path.join(root, '.codex', 'config.toml');
      const before = await fs.readFile(file, 'utf8');
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: mcp('project'),
      });
      expect(report.projectWrites[0].action).toBe('skipped-existing');
      expect(await fs.readFile(file, 'utf8')).toBe(before);
    });
    it('removes our stale entry from legacy .codex/mcp_config.json and keeps others', async () => {
      const legacy = path.join(root, '.codex', 'mcp_config.json');
      await fs.outputJson(legacy, {
        mcpServers: {
          'agent-skills-standard': { command: 'x' },
          other: { command: 'y' },
        },
      });
      await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: mcp('project'),
      });
      expect(await fs.readJson(legacy)).toEqual({
        mcpServers: { other: { command: 'y' } },
      });
    });
    it('status and uninstall read the TOML table', async () => {
      await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: mcp('project'),
      });
      expect(
        (await service.status({ rootDir: root, agents: [Agent.Codex] }))[0]
          .project,
      ).toBe(true);
      const res = await service.uninstall({
        rootDir: root,
        agents: [Agent.Codex],
        from: 'project',
      });
      expect(res.removed).toEqual([
        { agent: Agent.Codex, file: '.codex/config.toml' },
      ]);
      expect(
        await fs.readFile(path.join(root, '.codex', 'config.toml'), 'utf8'),
      ).not.toContain('agent-skills-standard');
    });
    it('writes a .toml snippet for Codex', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: { ...mcp('project'), snippets: true },
      });
      const snip = report.snippets.find((s) => s.agent === Agent.Codex)!;
      expect(snip.file).toBe(path.join('mcp-config-snippets', 'codex.toml'));
    });

    it('renders an empty args array for a global launch in toml', async () => {
      service.setPlatformForTesting('linux');
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Codex],
        mcp: { ...mcp('project'), snippets: true, via: 'global' },
      });
      const snip = report.snippets.find((s) => s.agent === Agent.Codex)!;
      const text = await fs.readFile(path.join(root, snip.file), 'utf8');
      expect(text).toContain('command = "ags-mcp"');
      expect(text).toContain('args = []');
    });

    it('uses the configured via for merged project configs', async () => {
      service.setPlatformForTesting('linux');
      await service.install({
        rootDir: root,
        agents: [Agent.Claude],
        mcp: { ...mcp('project'), via: 'global' },
      });
      const data = await fs.readJson(path.join(root, '.mcp.json'));
      expect(data.mcpServers[SERVER_NAME]).toEqual({
        command: 'ags-mcp',
        args: [],
      });
    });
  });
});
