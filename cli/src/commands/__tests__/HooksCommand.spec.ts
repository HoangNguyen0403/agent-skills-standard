import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { ConfigService } from '../../services/ConfigService';
import { HookService } from '../../services/HookService';
import { HooksCommand } from '../hooks';

describe('HooksCommand', () => {
  let configService: ConfigService;
  let hookService: HookService;
  let command: HooksCommand;

  beforeEach(() => {
    configService = {
      loadConfig: vi.fn().mockResolvedValue({
        registry: 'https://github.com/o/r',
        agents: [Agent.Claude],
        skills: {},
      }),
    } as unknown as ConfigService;
    hookService = {
      install: vi.fn().mockResolvedValue({ writes: [], unsupported: [] }),
      uninstall: vi.fn().mockResolvedValue({ removed: [] }),
      status: vi.fn().mockResolvedValue([]),
    } as unknown as HookService;
    command = new HooksCommand(configService, hookService);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.log).mockRestore();
  });

  it('passes enforce: true through to hookService.install when --enforce is set', async () => {
    await command.run('install', { enforce: true });

    expect(hookService.install).toHaveBeenCalledWith(
      expect.objectContaining({ enforce: true }),
    );
  });

  it('defaults to enforce: false when --enforce is not passed', async () => {
    await command.run('install');

    expect(hookService.install).toHaveBeenCalledWith(
      expect.objectContaining({ enforce: false }),
    );
  });

  it('errors without calling hookService when .skillsrc is missing', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(null);

    await command.run('install', { enforce: true });

    expect(hookService.install).not.toHaveBeenCalled();
  });

  it('prints an unknown-action message and calls no hookService method', async () => {
    await command.run('bogus');

    expect(hookService.install).not.toHaveBeenCalled();
    expect(hookService.uninstall).not.toHaveBeenCalled();
    expect(hookService.status).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Unknown action: bogus'),
      expect.stringContaining('Valid actions'),
    );
  });

  describe('status', () => {
    it('prints "no agents configured" when there are no rows', async () => {
      vi.mocked(configService.loadConfig).mockResolvedValue({
        registry: 'https://github.com/o/r',
        agents: [],
        skills: {},
      });
      vi.mocked(hookService.status).mockResolvedValue([]);

      await command.run('status');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('no agents configured'),
      );
    });

    it('prints installed/not-installed badges and each file per row', async () => {
      vi.mocked(hookService.status).mockResolvedValue([
        {
          agent: Agent.Claude,
          installed: true,
          files: ['.claude/hooks/preedit-skill-loader.js'],
        },
        { agent: Agent.Kiro, installed: false, files: [] },
      ]);

      await command.run('status');

      const logged = vi.mocked(console.log).mock.calls.flat().join('\n');
      expect(logged).toContain('✓ installed');
      expect(logged).toContain('✗ not installed');
      expect(logged).toContain('.claude/hooks/preedit-skill-loader.js');
    });
  });

  describe('uninstall', () => {
    it('prints "Nothing to remove" when nothing was removed', async () => {
      vi.mocked(hookService.uninstall).mockResolvedValue({ removed: [] });

      await command.run('uninstall');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Nothing to remove'),
      );
    });

    it('lists each removed file by agent', async () => {
      vi.mocked(hookService.uninstall).mockResolvedValue({
        removed: [
          { agent: Agent.Claude, file: '.claude/settings.json' },
          { agent: Agent.Cursor, file: '.cursor/hooks.json' },
        ],
      });

      await command.run('uninstall');

      const logged = vi.mocked(console.log).mock.calls.flat().join('\n');
      expect(logged).toContain('Removed hook files');
      expect(logged).toContain('.claude/settings.json');
      expect(logged).toContain('.cursor/hooks.json');
    });
  });

  describe('install — printReport branches', () => {
    it('shows the --enforce hint line when enforce is true', async () => {
      await command.run('install', { enforce: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('--enforce'),
      );
    });

    it('renders added/updated/up-to-date tags and the unsupported-agents line', async () => {
      vi.mocked(hookService.install).mockResolvedValue({
        writes: [
          { agent: Agent.Claude, file: 'a', action: 'added' },
          { agent: Agent.Cursor, file: 'b', action: 'updated' },
          { agent: Agent.Codex, file: 'c', action: 'skipped-existing' },
        ],
        unsupported: [Agent.Antigravity],
      });

      await command.run('install');

      const logged = vi.mocked(console.log).mock.calls.flat().join('\n');
      expect(logged).toContain('+ added');
      expect(logged).toContain('~ updated');
      expect(logged).toContain('= up-to-date');
      expect(logged).toContain('no hook support: antigravity');
      expect(logged).toContain('Hooks installed');
    });

    it('does not print the unsupported line or the "Hooks installed" summary when nothing changed', async () => {
      vi.mocked(hookService.install).mockResolvedValue({
        writes: [
          { agent: Agent.Claude, file: 'a', action: 'skipped-existing' },
        ],
        unsupported: [],
      });

      await command.run('install');

      const logged = vi.mocked(console.log).mock.calls.flat().join('\n');
      expect(logged).not.toContain('no hook support');
      expect(logged).not.toContain('Hooks installed');
    });
  });
});
