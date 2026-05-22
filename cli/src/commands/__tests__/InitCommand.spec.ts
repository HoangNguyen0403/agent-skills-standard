import fs from 'fs-extra';
import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { InitService } from '../../services/InitService';
import { RegistryService } from '../../services/RegistryService';
import { InitCommand } from '../init';

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
    red: vi.fn((t) => t),
    magenta: vi.fn((t) => t),
  },
}));

describe('InitCommand', () => {
  let command: InitCommand;
  let mockInitService: Mocked<InitService>;
  let mockRegistryService: Mocked<RegistryService>;

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
    } as unknown as Mocked<InitService>;
    mockRegistryService = {
      discoverRegistry: vi
        .fn()
        .mockResolvedValue({ categories: [], metadata: {} }),
    } as unknown as Mocked<RegistryService>;

    // Explicitly pass undefined to cover constructor 14-15
    command = new InitCommand(undefined, undefined);

    // Patch the instances after constructor runs to use our mocks
    // @ts-expect-error - testing private instance patching
    command.initService = mockInitService;
    // @ts-expect-error - testing private instance patching
    command.registryService = mockRegistryService;

    vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.spyOn(fs, 'pathExists').mockResolvedValue(false as never);
    // First call answers framework/agents/registry; second call answers MCP consent.
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({
        framework: 'react',
        agents: ['cursor'],
        registry: 'reg',
      })
      .mockResolvedValueOnce({ mcpEnabled: true, mcpScope: 'project' });
  });

  it('should initialize project from scratch', async () => {
    await command.run();
    expect(mockInitService.buildAndSaveConfig).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Initialized .skillsrc'),
    );
  });

  it('should handle existing config and abort if requested', async () => {
    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);
    vi.mocked(inquirer.prompt).mockResolvedValue({ overwrite: false });

    await command.run();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Aborted'),
    );
    expect(mockInitService.buildAndSaveConfig).not.toHaveBeenCalled();
  });

  it('should handle existing config and overwrite if requested', async () => {
    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);
    // Reset the prompt queue from beforeEach, then enqueue the full sequence
    // for this test: overwrite confirm → framework/agents/registry → MCP consent.
    vi.mocked(inquirer.prompt).mockReset();
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ overwrite: true })
      .mockResolvedValueOnce({
        framework: 'react',
        agents: ['cursor'],
        registry: 'reg',
      })
      .mockResolvedValueOnce({ mcpEnabled: true, mcpScope: 'project' });

    await command.run();
    expect(mockInitService.buildAndSaveConfig).toHaveBeenCalled();
  });

  it('should handle initialization with MCP disabled', async () => {
    vi.mocked(inquirer.prompt).mockReset();
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({
        framework: 'react',
        agents: ['cursor'],
        registry: 'reg',
      })
      .mockResolvedValueOnce({ mcpEnabled: false });

    await command.run();
    expect(mockInitService.buildAndSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ mcpEnabled: false, mcpScope: 'disabled' }),
      expect.any(Object),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('MCP integration: disabled'),
    );
  });

  it('should cover mcpEnabled when condition', async () => {
    await command.run();
    const mcpQuestions = vi.mocked(inquirer.prompt).mock.calls[1][0] as any[];
    const whenFunc = mcpQuestions[1].when;
    expect(whenFunc({ mcpEnabled: true })).toBe(true);
    expect(whenFunc({ mcpEnabled: false })).toBe(false);
  });
});
