import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
