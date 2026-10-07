import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { ConfigService } from '../../services/ConfigService';
import {
  UninstallPlan,
  UninstallService,
} from '../../services/install/UninstallService';
import { UninstallCommand } from '../uninstall';

describe('UninstallCommand', () => {
  let mockService: {
    plan: ReturnType<typeof vi.fn>;
    apply: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    loadConfig: ReturnType<typeof vi.fn>;
  };
  let logSpy: MockInstance;
  let confirmMock: ReturnType<typeof vi.fn>;
  let isTTYMock: ReturnType<typeof vi.fn>;
  let command: UninstallCommand;

  const validConfig: SkillConfig = {
    registry: 'https://github.com/owner/repo',
    agents: [Agent.Claude],
    skills: {},
  };

  beforeEach(() => {
    mockService = {
      plan: vi.fn(),
      apply: vi.fn(),
    };
    mockConfigService = {
      loadConfig: vi.fn().mockResolvedValue(validConfig),
    };
    confirmMock = vi.fn().mockResolvedValue(true);
    isTTYMock = vi.fn().mockReturnValue(true);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;

    command = new UninstallCommand(
      mockService as unknown as UninstallService,
      mockConfigService as unknown as ConfigService,
      isTTYMock,
      confirmMock,
    );
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('1. prints preview with counts, integrations, up to 10 paths, and +N more', async () => {
    const paths = Array.from(
      { length: 12 },
      (_, i) => `.claude/skills/s${i}/SKILL.md`,
    );
    const plan: UninstallPlan = {
      remove: paths,
      keepEdited: ['.claude/skills/edited/SKILL.md'],
      missing: [],
      sharedKept: ['.agents/workflows/shared.md'],
      integrations: {
        mcpAgents: [Agent.Claude],
        hookAgents: [Agent.Claude],
        clearAgentsIndex: true,
      },
      deleteLock: true,
    };
    mockService.plan.mockResolvedValue(plan);

    await command.run({ all: true, dryRun: true });

    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain(
      'Uninstall: 12 file(s) to remove, 1 edited file(s) kept, 1 shared path(s) kept',
    );
    expect(output).toContain('MCP entries: claude');
    expect(output).toContain('Hook registrations: claude');
    expect(output).toContain('AGENTS.md index block: cleared');
    // First 10 paths shown
    for (let i = 0; i < 10; i++) {
      expect(output).toContain(`- ${paths[i]}`);
    }
    // 11th and 12th not shown directly as "- path", +2 more shown
    expect(output).toContain('+2 more');
  });

  it('2. --dry-run prints preview and never calls apply', async () => {
    const plan: UninstallPlan = {
      remove: ['file1.md'],
      keepEdited: [],
      missing: [],
      sharedKept: [],
      integrations: {
        mcpAgents: [],
        hookAgents: [],
        clearAgentsIndex: false,
      },
      deleteLock: false,
    };
    mockService.plan.mockResolvedValue(plan);

    await command.run({ category: ['typescript'], dryRun: true });

    expect(mockService.apply).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Uninstall: 1 file(s) to remove');
  });

  it('3. Non-TTY without --yes prints "Re-run with --yes to apply" and sets exitCode = 1 without calling apply or confirm', async () => {
    isTTYMock.mockReturnValue(false);
    const plan: UninstallPlan = {
      remove: ['file1.md'],
      keepEdited: [],
      missing: [],
      sharedKept: [],
      integrations: {
        mcpAgents: [],
        hookAgents: [],
        clearAgentsIndex: false,
      },
      deleteLock: false,
    };
    mockService.plan.mockResolvedValue(plan);

    await command.run({ category: ['typescript'] });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(mockService.apply).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Re-run with --yes to apply'),
    );
  });

  it('4. TTY without --yes calls confirm; when false, does not call apply', async () => {
    isTTYMock.mockReturnValue(true);
    confirmMock.mockResolvedValue(false);
    const plan: UninstallPlan = {
      remove: ['file1.md'],
      keepEdited: [],
      missing: [],
      sharedKept: [],
      integrations: {
        mcpAgents: [],
        hookAgents: [],
        clearAgentsIndex: false,
      },
      deleteLock: false,
    };
    mockService.plan.mockResolvedValue(plan);

    await command.run({ category: ['typescript'] });

    expect(confirmMock).toHaveBeenCalled();
    expect(mockService.apply).not.toHaveBeenCalled();
  });

  it('5. --yes calls apply once; prints removed count, backup id, and hints', async () => {
    const plan: UninstallPlan = {
      remove: ['file1.md'],
      keepEdited: [],
      missing: [],
      sharedKept: [],
      integrations: {
        mcpAgents: [],
        hookAgents: [],
        clearAgentsIndex: false,
      },
      deleteLock: true,
    };
    mockService.plan.mockResolvedValue(plan);
    mockService.apply.mockResolvedValue({
      removed: ['file1.md'],
      backupId: '20260927-123456',
    });

    await command.run({ all: true, yes: true });

    expect(mockService.apply).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Removed 1 file(s)');
    expect(output).toContain(
      'Backup: .ags/backups/20260927-123456 (undo with ags restore 20260927-123456)',
    );
    expect(output).toContain(
      'Remove the matching entries from .skillsrc or the next ags sync reinstalls them.',
    );
    expect(output).toContain('CLAUDE.md was left unchanged.');
  });

  it('6. Nothing to remove and no integrations prints "Nothing to uninstall." and exits 0', async () => {
    const plan: UninstallPlan = {
      remove: [],
      keepEdited: [],
      missing: [],
      sharedKept: [],
      integrations: {
        mcpAgents: [],
        hookAgents: [],
        clearAgentsIndex: false,
      },
      deleteLock: false,
    };
    mockService.plan.mockResolvedValue(plan);

    await command.run({ category: ['typescript'] });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(mockService.apply).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Nothing to uninstall.'),
    );
  });

  it('7. Missing .skillsrc prints error and sets exitCode = 1', async () => {
    mockConfigService.loadConfig.mockResolvedValue(null);

    await command.run({ all: true });

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('.skillsrc not found'),
    );
  });

  it('8. Invalid agent id in --agent prints error listing valid ids and sets exitCode = 1', async () => {
    await command.run({ agent: ['invalid-agent'] });

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid agent'),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('claude'));
  });

  // Test intent: catches and logs error when service planning fails and sets exitCode = 1
  it('catches and logs error when service planning fails and sets exitCode = 1', async () => {
    mockService.plan.mockRejectedValue(new Error('Invalid selection'));
    await command.run({ all: true });

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid selection'),
    );
  });

  // Test intent: catches and logs non-Error string when service planning fails
  it('catches and logs non-Error string when service planning fails', async () => {
    mockService.plan.mockRejectedValue('plain failure message');
    await command.run({ all: true });

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('plain failure message'),
    );
  });

  // Test intent: instantiates with default dependencies and handles missing configuration
  it('instantiates with default constructor and executes', async () => {
    const cmd = new UninstallCommand();
    expect(cmd).toBeInstanceOf(UninstallCommand);
    await cmd.run({});
    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error: .skillsrc not found'),
    );
  });
});
