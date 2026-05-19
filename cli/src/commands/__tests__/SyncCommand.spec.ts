import inquirer from 'inquirer';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import { ConfigService } from '../../services/ConfigService';
import { DetectionService } from '../../services/DetectionService';
import { SyncService } from '../../services/SyncService';
import { HookService } from '../../services/HookService';
import { SyncCommand } from '../sync';
import { Agent } from '../../constants';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock('picocolors', () => ({
  default: {
    green: vi.fn((t) => t),
    cyan: vi.fn((t) => t),
    gray: vi.fn((t) => t),
    bold: vi.fn((t) => t),
    yellow: vi.fn((t) => t),
    blue: vi.fn((t) => t),
    red: vi.fn((t) => t),
  },
}));

describe('SyncCommand', () => {
  let command: SyncCommand;
  let mockSyncService: Mocked<SyncService>;
  let mockConfigService: Mocked<ConfigService>;
  let mockDetectionService: Mocked<DetectionService>;
  let mockHookService: Mocked<HookService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncService = {
      reconcileConfig: vi.fn().mockResolvedValue(false),
      assembleSkills: vi.fn().mockResolvedValue([]),
      writeSkills: vi.fn(),
      applyIndices: vi.fn(),
      checkForUpdates: vi.fn().mockResolvedValue(null),
      assembleWorkflows: vi.fn().mockResolvedValue([]),
      writeWorkflows: vi.fn(),
      reconcileWorkflows: vi.fn().mockResolvedValue(false),
      syncSpecialists: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<SyncService>;
    mockConfigService = {
      loadConfig: vi.fn().mockResolvedValue({
        registry: 'url',
        skills: {
          common: { ref: 'v1.0.0' },
        },
        agents: [Agent.Antigravity],
        // Mark MCP as already-prompted-and-disabled so Phase 7 fast-returns.
        // Tests that exercise the MCP path should override this.
        mcp: { enabled: false, scope: 'disabled', prompted: true },
      }),
      saveConfig: vi.fn(),
    } as unknown as Mocked<ConfigService>;
    mockDetectionService = {
      getProjectDeps: vi.fn().mockResolvedValue(new Set()),
    } as unknown as Mocked<DetectionService>;
    mockHookService = {
      install: vi.fn().mockResolvedValue({ writes: [], unsupported: [] }),
      uninstall: vi.fn().mockResolvedValue({ removed: [] }),
      status: vi.fn().mockResolvedValue([]),
    } as unknown as Mocked<HookService>;

    // Explicitly pass undefined to cover constructor branches 16-18
    command = new SyncCommand(undefined, undefined, undefined);

    // Patch the instances after constructor runs to use our mocks
    // @ts-expect-error - testing private instance patching
    command.configService = mockConfigService;
    // @ts-expect-error - testing private instance patching
    command.detectionService = mockDetectionService;
    // @ts-expect-error - testing private instance patching
    command.syncService = mockSyncService;
    // @ts-expect-error - testing private instance patching
    command.hookService = mockHookService;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should run sync successfully', async () => {
    await command.run();
    expect(mockConfigService.loadConfig).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Syncing skills'),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('All skills synced successfully'),
    );
  });

  it('should save config when new workflows are discovered during reconciliation', async () => {
    mockSyncService.reconcileWorkflows.mockResolvedValue(true);
    await command.run();
    expect(mockSyncService.reconcileWorkflows).toHaveBeenCalled();
    expect(mockConfigService.saveConfig).toHaveBeenCalled();
  });

  it('should handle Error instances in catch block', async () => {
    mockConfigService.loadConfig.mockRejectedValue(new Error('Load error'));
    await command.run();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Sync failed'),
      'Load error',
    );
  });

  it('should handle non-Error throws in catch block', async () => {
    mockConfigService.loadConfig.mockRejectedValue('String error');
    await command.run();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Sync failed'),
      'String error',
    );
  });

  it('should handle missing config', async () => {
    mockConfigService.loadConfig.mockResolvedValue(null);
    await command.run();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('not found'),
    );
  });

  describe('Update Flows', () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      mockSyncService.checkForUpdates.mockReset();
      originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
    });

    afterEach(() => {
      if (originalIsTTY !== undefined) {
        process.stdin.isTTY = originalIsTTY;
      }
    });

    it('should prompt user and update config when updates are found', async () => {
      mockSyncService.checkForUpdates.mockResolvedValue({
        common: 'v1.1.0',
      });
      vi.mocked(inquirer.prompt).mockResolvedValue({ update: true });

      await command.run();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('New skill versions detected'),
      );
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: {
            common: { ref: 'v1.1.0' },
          },
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('.skillsrc updated'),
      );
    });

    it('should not update config if user rejects updates', async () => {
      mockSyncService.checkForUpdates.mockResolvedValue({
        common: 'v1.1.0',
      });
      // Mocking false for update, and false for the MCP re-prompt if it happens
      vi.mocked(inquirer.prompt).mockResolvedValue({
        update: false,
        enabled: false,
      });

      await command.run();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('New skill versions detected'),
      );
      expect(inquirer.prompt).toHaveBeenCalled();
      // It might be called for MCP now, so we can't just check not.toHaveBeenCalled
      // Instead we check it was NOT called for versions
      const saveCalls = vi.mocked(mockConfigService.saveConfig).mock.calls;
      const versionUpdateCall = saveCalls.find(
        (call) => call[0].skills?.common?.ref === 'v1.1.0',
      );
      expect(versionUpdateCall).toBeUndefined();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping version updates'),
      );
    });

    it('should auto-update config when --yes flag is provided', async () => {
      mockSyncService.checkForUpdates.mockResolvedValue({
        common: 'v1.1.0',
      });

      await command.run({ yes: true });

      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: {
            common: { ref: 'v1.1.0' },
          },
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('.skillsrc updated'),
      );
    });

    it('should skip updates in non-interactive environment', async () => {
      process.stdin.isTTY = false;
      mockSyncService.checkForUpdates.mockResolvedValue({
        common: 'v1.1.0',
      });

      await command.run();

      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Non-interactive environment detected'),
      );
    });
  });

  describe('Phase 7 — MCP Integration', () => {
    let mockMcpService: any;
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      mockMcpService = {
        install: vi.fn().mockResolvedValue({
          projectWrites: [],
          userWrites: [],
          declined: [],
          snippets: [],
          unsupported: [],
        }),
      };
      // @ts-expect-error - testing private instance patching
      command.mcpService = mockMcpService;
      originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
    });

    afterEach(() => {
      if (originalIsTTY !== undefined) {
        process.stdin.isTTY = originalIsTTY;
      }
    });

    it('should prompt for consent if not yet prompted (TTY)', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: false, scope: 'disabled', prompted: false },
      } as any);

      vi.mocked(inquirer.prompt).mockResolvedValue({
        enabled: true,
        scope: 'project',
      });

      await command.run();

      expect(inquirer.prompt).toHaveBeenCalled();
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ enabled: true, prompted: true }),
        }),
      );
    });

    it('should skip consent prompt if not yet prompted (non-TTY)', async () => {
      process.stdin.isTTY = false;
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: false, scope: 'disabled', prompted: false },
      } as any);

      await command.run();

      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('MCP integration not yet configured'),
      );
    });

    it('should execute install if MCP is enabled', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: true, scope: 'project', prompted: true },
      } as any);

      await command.run();

      expect(mockMcpService.install).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Wiring MCP server'),
      );
    });

    it('should use conservative default for --yes during consent', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: false, scope: 'disabled', prompted: false },
      } as any);

      await command.run({ yes: true });

      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({
            enabled: true,
            scope: 'project',
            prompted: true,
          }),
        }),
      );
    });

    it('should handle different MCP install report outcomes', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: true, scope: 'project', prompted: true },
      } as any);

      mockMcpService.install.mockResolvedValue({
        projectWrites: [
          { agent: 'claude', file: 'f1', action: 'added' },
          { agent: 'cursor', file: 'f2', action: 'updated' },
          { agent: 'trae', file: 'f3', action: 'up-to-date' },
        ],
        userWrites: [{ agent: 'claude', file: 'u1', action: 'added' }],
        declined: [{ agent: 'cursor', file: 'u2' }],
        snippets: [{ agent: 'claude', file: 's1' }],
        unsupported: ['copilot'],
      });

      await command.run();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('+ added'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('~ updated'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('= up-to-date'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('+ wrote'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('(declined)'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('snippet(s) written'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('no MCP support yet'),
      );
    });

    it('should handle user declining MCP consent', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: false, scope: 'disabled', prompted: false },
      } as any);

      vi.mocked(inquirer.prompt).mockResolvedValue({ enabled: false });

      await command.run();

      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({
            enabled: false,
            scope: 'disabled',
            prompted: true,
          }),
        }),
      );
      expect(mockMcpService.install).not.toHaveBeenCalled();
    });

    it('should fast-return if MCP is disabled after prompting', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: false, scope: 'disabled', prompted: true },
      } as any);

      await command.run();
      expect(mockMcpService.install).not.toHaveBeenCalled();
    });

    it('should generate snippets even when MCP is disabled if --snippets is set', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: false, scope: 'disabled', prompted: false },
      } as any);

      await command.run({ snippets: true });

      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(mockMcpService.install).toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
    });
  });

  describe('Phase 8 — Hook Integration', () => {
    it('should report hook updates during sync when MCP is enabled', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: { common: { ref: 'v1.0.0' } },
        agents: ['claude' as any],
        mcp: { enabled: true, scope: 'project', prompted: true },
      } as any);

      mockHookService.install.mockResolvedValue({
        writes: [
          { agent: 'claude' as any, file: 'f1', action: 'added' },
          { agent: 'kiro' as any, file: 'f2', action: 'updated' },
          { agent: 'claude' as any, file: 'f3', action: 'skipped-existing' },
        ],
        unsupported: [],
      });

      await command.run();

      expect(mockHookService.install).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Updating skill-loader hooks'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('+ added'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('~ updated'),
      );
      // skipped-existing should NOT be printed
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('skipped-existing'),
      );
    });

    it('should uninstall hooks and skip install when MCP is disabled', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: { common: { ref: 'v1.0.0' } },
        agents: ['claude' as any],
        mcp: { enabled: false, scope: 'disabled', prompted: true },
      } as any);

      await command.run();

      expect(mockHookService.uninstall).toHaveBeenCalledWith(
        expect.objectContaining({ agents: ['claude'] }),
      );
      expect(mockHookService.install).not.toHaveBeenCalled();
    });

    it('should skip hook reporting if no writes occurred', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: { common: { ref: 'v1.0.0' } },
        agents: ['claude' as any],
        mcp: { enabled: true, scope: 'project', prompted: true },
      } as any);

      mockHookService.install.mockResolvedValue({
        writes: [
          { agent: 'claude' as any, file: 'f1', action: 'skipped-existing' },
        ],
        unsupported: [],
      });

      await command.run();

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Updating skill-loader hooks'),
      );
    });

    it('should skip hook integration if no agents configured', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        agents: [],
      } as any);

      await command.run();

      expect(mockHookService.install).not.toHaveBeenCalled();
    });
  });

  describe('promptMcpConsent Logic', () => {
    it('should cover the when callback in promptMcpConsent', async () => {
      mockConfigService.loadConfig.mockResolvedValue({
        registry: 'url',
        skills: {},
        mcp: { enabled: false, scope: 'disabled', prompted: false },
      } as any);

      await command.run();

      const promptCall = vi
        .mocked(inquirer.prompt)
        .mock.calls.find((call: any) => call[0][0].name === 'enabled');
      expect(promptCall).toBeDefined();
      const questions = promptCall![0] as any[];
      const scopeQuestion = questions.find((q: any) => q.name === 'scope');
      expect(scopeQuestion).toBeDefined();

      // Manually trigger the 'when' callback to cover the arrow function
      expect(scopeQuestion.when({ enabled: true })).toBe(true);
      expect(scopeQuestion.when({ enabled: false })).toBe(false);
    });
  });
});
