import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../services/ConfigService';
import { DetectionService } from '../../services/DetectionService';
import { SyncService } from '../../services/SyncService';
import { SyncCommand } from '../sync';

describe('SyncCommand', () => {
  let syncCommand: SyncCommand;
  let mockConfigService: ConfigService;
  let mockDetectionService: DetectionService;
  let mockSyncService: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
    } as unknown as ConfigService;

    mockDetectionService = {
      getProjectDeps: vi.fn().mockResolvedValue(new Set()),
    } as unknown as DetectionService;

    mockSyncService = {
      reconcileConfig: vi.fn(),
      assembleSkills: vi.fn(),
      writeSkills: vi.fn(),
      checkForUpdates: vi.fn().mockImplementation((c) => Promise.resolve(c)),
    } as unknown as SyncService;

    syncCommand = new SyncCommand(
      mockConfigService,
      mockDetectionService,
      mockSyncService,
    );
  });

  describe('run', () => {
    it('should fail if .skillsrc is not found', async () => {
      vi.mocked(mockConfigService.loadConfig).mockResolvedValue(null);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await syncCommand.run();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('.skillsrc not found'),
      );
      consoleSpy.mockRestore();
    });

    it('should run successfully if config is valid', async () => {
      const config = { registry: 'url', skills: { flutter: {} } };
      vi.mocked(mockConfigService.loadConfig).mockResolvedValue(config as any);
      vi.mocked(mockSyncService.assembleSkills).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await syncCommand.run();

      expect(mockSyncService.reconcileConfig).toHaveBeenCalled();
      expect(mockSyncService.assembleSkills).toHaveBeenCalled();
      expect(mockSyncService.writeSkills).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('All skills synced successfully!'),
      );
      consoleSpy.mockRestore();
    });

    it('should catch and log errors', async () => {
      vi.mocked(mockConfigService.loadConfig).mockRejectedValue(
        new Error('Test error'),
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await syncCommand.run();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync failed:'),
        'Test error',
      );
      consoleSpy.mockRestore();
    });

    it('should catch and log non-Error objects', async () => {
      vi.mocked(mockConfigService.loadConfig).mockRejectedValue('String error');
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await syncCommand.run();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync failed:'),
        'String error',
      );
      consoleSpy.mockRestore();
    });

    it('should use default services if not provided', () => {
      const command = new SyncCommand();
      expect(command).toBeDefined();
    });
  });
});
