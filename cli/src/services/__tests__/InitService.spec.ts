import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitService } from '../InitService';

vi.mock('fs-extra');

vi.mock('../DetectionService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.detectFrameworks = vi.fn().mockResolvedValue({ flutter: true });
    this.detectAgents = vi.fn().mockResolvedValue({ cursor: true });
    this.detectLanguages = vi.fn().mockResolvedValue(['dart']);
    this.getProjectDeps = vi.fn().mockResolvedValue(new Set());
  });
  return { DetectionService: Mock };
});

vi.mock('../ConfigService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.buildInitialConfig = vi
      .fn()
      .mockReturnValue({ registry: 'url', skills: {} });
    this.applyDependencyExclusions = vi.fn();
  });
  return { ConfigService: Mock };
});

describe('InitService', () => {
  let initService: InitService;
  let mockDetectionService: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    initService = new InitService();
    mockDetectionService = (initService as any).detectionService;
    mockConfigService = (initService as any).configService;
  });

  describe('getInitializationContext', () => {
    it('should gather framework and agent detection data', async () => {
      const context = await initService.getInitializationContext();
      expect(context.frameworkDetection).toEqual({ flutter: true });
      expect(context.agentDetection).toEqual({ cursor: true });
    });
  });

  describe('getPromptChoices', () => {
    it('should provide correct choices based on detection and registry', () => {
      const context = {
        frameworkDetection: { flutter: true, nestjs: false },
        agentDetection: { cursor: true, copilot: false },
      };
      const supported = ['flutter'];

      const choices = initService.getPromptChoices(context, supported);

      expect(choices.defaultFramework).toBe('flutter');
      expect(
        choices.frameworkChoices.find((f) => f.value === 'flutter')?.name,
      ).not.toContain('Soon');
      expect(
        choices.frameworkChoices.find((f) => f.value === 'nestjs')?.name,
      ).toContain('Soon');

      const agentChoiceCursor = choices.agentChoices.find(
        (a) => a.value === 'cursor',
      );
      const agentChoiceCopilot = choices.agentChoices.find(
        (a) => a.value === 'copilot',
      );

      expect(agentChoiceCursor?.checked).toBe(true);
      expect(agentChoiceCopilot?.checked).toBe(false);
    });

    it('should check all agents if none are detected', () => {
      const context = {
        frameworkDetection: {},
        agentDetection: { cursor: false, copilot: false },
      };
      const choices = initService.getPromptChoices(context, []);
      expect(choices.agentChoices.every((a) => a.checked)).toBe(true);
    });
  });

  describe('buildAndSaveConfig', () => {
    it('should build, refine, and save configuration to disk', async () => {
      const answers = {
        framework: 'flutter',
        agents: ['cursor'],
        registry: 'https://github.com/owner/repo',
      };
      const metadata = { categories: { flutter: { version: '1.0.0' } } };

      await initService.buildAndSaveConfig(answers, metadata, '/tmp');

      expect(mockConfigService.buildInitialConfig).toHaveBeenCalled();
      expect(mockConfigService.applyDependencyExclusions).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.skillsrc'),
        expect.stringContaining('Auto-detected configuration'),
      );
    });

    it('should handle unsupported framework by defaulting languages to empty (line 75 coverage)', async () => {
      const answers = {
        framework: 'unsupported-framework',
        agents: ['cursor'],
        registry: 'url',
      };
      await initService.buildAndSaveConfig(answers, {}, '/tmp');
      expect(mockDetectionService.detectLanguages).not.toHaveBeenCalled();
      expect(mockConfigService.buildInitialConfig).toHaveBeenCalledWith(
        'unsupported-framework',
        expect.any(Array),
        expect.any(String),
        expect.any(Object),
        [], // Empty languages
      );
    });
  });
});
