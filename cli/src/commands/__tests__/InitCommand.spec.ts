import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitCommand } from '../init';
import fs from 'fs-extra';
import inquirer from 'inquirer';

vi.mock('fs-extra');
vi.mock('inquirer');
vi.mock('picocolors', () => ({
  default: {
    green: vi.fn((t) => t),
    cyan: vi.fn((t) => t),
    gray: vi.fn((t) => t),
    bold: vi.fn((t) => t),
    yellow: vi.fn((t) => t),
    blue: vi.fn((t) => t),
  },
}));

describe('InitCommand', () => {
  let command: InitCommand;
  let mockInitService: any;
  let mockRegistryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInitService = {
      initializeProject: vi.fn().mockResolvedValue(true),
      getInitializationContext: vi.fn().mockResolvedValue({}),
      getPromptChoices: vi.fn().mockReturnValue({
        frameworkChoices: [],
        agentChoices: [],
        defaultFramework: 'none',
      }),
      buildAndSaveConfig: vi.fn().mockResolvedValue(undefined),
    };
    mockRegistryService = {
      discoverRegistry: vi
        .fn()
        .mockResolvedValue({ categories: [], metadata: {} }),
    };

    // Explicitly pass undefined to cover constructor 14-15
    command = new InitCommand(undefined, undefined);

    (command as any).initService = mockInitService;
    (command as any).registryService = mockRegistryService;

    vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.mocked(fs.pathExists).mockResolvedValue(false);
    vi.mocked(inquirer.prompt).mockResolvedValue({
      framework: 'react',
      agents: ['cursor'],
      registry: 'reg',
    });
  });

  it('should initialize project from scratch', async () => {
    await command.run();
    expect(mockInitService.buildAndSaveConfig).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Initialized .skillsrc'),
    );
  });

  it('should handle existing config and abort if requested', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(inquirer.prompt).mockResolvedValue({ overwrite: false });

    await command.run();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Aborted'),
    );
    expect(mockInitService.buildAndSaveConfig).not.toHaveBeenCalled();
  });

  it('should handle existing config and overwrite if requested', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    // Sequence for multiple prompts
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ overwrite: true })
      .mockResolvedValueOnce({
        framework: 'react',
        agents: ['cursor'],
        registry: 'reg',
      });

    await command.run();
    expect(mockInitService.buildAndSaveConfig).toHaveBeenCalled();
  });
});
