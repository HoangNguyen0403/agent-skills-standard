import fs from 'fs-extra';
import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitService } from '../../services/InitService';
import { RegistryService } from '../../services/RegistryService';
import { InitCommand } from '../init';

vi.mock('fs-extra');
vi.mock('inquirer');

describe('InitCommand', () => {
  let initCommand: InitCommand;
  let mockInitService: InitService;
  let mockRegistryService: RegistryService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockInitService = {
      getInitializationContext: vi.fn().mockResolvedValue({}),
      getPromptChoices: vi.fn().mockReturnValue({
        frameworkChoices: [],
        agentChoices: [],
        defaultFramework: 'flutter',
      }),
      buildAndSaveConfig: vi.fn().mockResolvedValue(undefined),
    } as unknown as InitService;

    mockRegistryService = {
      discoverRegistry: vi
        .fn()
        .mockResolvedValue({ categories: [], metadata: {} }),
    } as unknown as RegistryService;

    initCommand = new InitCommand(mockInitService, mockRegistryService);

    vi.mocked(inquirer.prompt).mockImplementation(async (questions: any) => {
      const q = Array.isArray(questions) ? questions[0] : questions;
      if (q.name === 'overwrite') return { overwrite: true };
      return { framework: 'flutter', agents: ['cursor'], registry: 'url' };
    });

    // Fix pathExists mock to avoid 'void' assignment lints
    vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(false));
  });

  describe('run', () => {
    it('should run initialization flow', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await initCommand.run();

      expect(mockInitService.getInitializationContext).toHaveBeenCalled();
      expect(mockInitService.buildAndSaveConfig).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialized .skillsrc'),
      );

      consoleSpy.mockRestore();
    });

    it('should abort if config exists and user says no', async () => {
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(inquirer.prompt).mockResolvedValue({ overwrite: false });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await initCommand.run();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Aborted'),
      );
      expect(mockInitService.buildAndSaveConfig).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use default services if not provided', () => {
      const command = new InitCommand();
      expect(command).toBeDefined();
    });
  });
});
