import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncCommand } from '../sync';

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
  let mockSyncService: any;
  let mockConfigService: any;
  let mockDetectionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncService = {
      reconcileConfig: vi.fn().mockResolvedValue(false),
      assembleSkills: vi.fn().mockResolvedValue([]),
      writeSkills: vi.fn(),
      applyIndices: vi.fn(),
      checkForUpdates: vi.fn((c) => c),
    };
    mockConfigService = {
      loadConfig: vi.fn().mockResolvedValue({ registry: 'url', skills: {} }),
      saveConfig: vi.fn(),
    };
    mockDetectionService = {
      getProjectDeps: vi.fn().mockResolvedValue(new Set()),
    };

    // Explicitly pass undefined to cover constructor branches 16-18
    command = new SyncCommand(undefined, undefined, undefined);

    // Patch the instances after constructor runs to use our mocks
    (command as any).configService = mockConfigService;
    (command as any).detectionService = mockDetectionService;
    (command as any).syncService = mockSyncService;

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
});
