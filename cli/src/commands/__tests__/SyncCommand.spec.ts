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
import { SyncCommand } from '../sync';

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
    } as unknown as Mocked<SyncService>;
    mockConfigService = {
      loadConfig: vi.fn().mockResolvedValue({
        registry: 'url',
        skills: {
          common: { ref: 'v1.0.0' },
        },
      }),
      saveConfig: vi.fn(),
    } as unknown as Mocked<ConfigService>;
    mockDetectionService = {
      getProjectDeps: vi.fn().mockResolvedValue(new Set()),
    } as unknown as Mocked<DetectionService>;

    // Explicitly pass undefined to cover constructor branches 16-18
    command = new SyncCommand(undefined, undefined, undefined);

    // Patch the instances after constructor runs to use our mocks
    // @ts-expect-error - testing private instance patching
    command.configService = mockConfigService;
    // @ts-expect-error - testing private instance patching
    command.detectionService = mockDetectionService;
    // @ts-expect-error - testing private instance patching
    command.syncService = mockSyncService;

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
      vi.mocked(inquirer.prompt).mockResolvedValue({ update: false });

      await command.run();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('New skill versions detected'),
      );
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
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
});
