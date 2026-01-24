import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../services/ConfigService';
import { DetectionService } from '../../services/DetectionService';
import { SkillService } from '../../services/SkillService';
import { ListSkillsCommand } from '../list-skills';

vi.mock('inquirer');

describe('ListSkillsCommand', () => {
  let listSkillsCommand: ListSkillsCommand;
  let mockConfigService: ConfigService;
  let mockDetectionService: DetectionService;
  let mockSkillService: SkillService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      getRegistryUrl: vi
        .fn()
        .mockResolvedValue('https://github.com/owner/repo'),
    } as unknown as ConfigService;

    mockDetectionService = {
      getProjectDeps: vi.fn().mockResolvedValue(new Set(['dep1'])),
    } as unknown as DetectionService;

    mockSkillService = {
      getSkillsWithStatus: vi.fn().mockResolvedValue([
        { name: 'skill1', status: 'detected' },
        { name: 'skill2', status: 'not-detected' },
        { name: 'skill3', status: 'no-rule' },
      ]),
    } as unknown as SkillService;

    listSkillsCommand = new ListSkillsCommand(
      mockConfigService,
      mockDetectionService,
      mockSkillService,
    );

    vi.mocked(inquirer.prompt).mockResolvedValue({ framework: 'flutter' });
  });

  describe('run', () => {
    it('should prompt user and display skills', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await listSkillsCommand.run();

      expect(inquirer.prompt).toHaveBeenCalled();
      expect(mockSkillService.getSkillsWithStatus).toHaveBeenCalledWith(
        'flutter',
        expect.any(String),
        expect.any(Set),
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('- skill1'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('- skill2'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('- skill3'),
      );

      consoleSpy.mockRestore();
    });

    it('should use default services if not provided', () => {
      const command = new ListSkillsCommand();
      expect(command).toBeDefined();
    });
  });
});
