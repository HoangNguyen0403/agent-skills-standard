import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { AgentBridgeService } from '../AgentBridgeService';
import { DetectionService } from '../DetectionService';
import { IndexGeneratorService } from '../IndexGeneratorService';
import { SyncService } from '../SyncService';
import { MarkdownUtils } from '../utils/MarkdownUtils';

// Mock dependencies at the top level
vi.mock('fs-extra');
vi.mock('../IndexGeneratorService');
vi.mock('../DetectionService');
vi.mock('../AgentBridgeService');
vi.mock('../SkillSyncService');
vi.mock('../WorkflowSyncService');
vi.mock('../utils/MarkdownUtils');
vi.mock('../ConfigService');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockGithubService: any;
  let mockSkillSyncService: any;
  let mockWorkflowSyncService: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup IndexGeneratorService mock implementation
    vi.mocked(IndexGeneratorService).mockImplementation(function (this: any) {
      this.generate = vi.fn().mockResolvedValue('index content');
      this.assembleIndex = vi.fn().mockReturnValue('index content');
      this.generateAllCategoryIndices = vi.fn().mockResolvedValue({});
      this.assembleRouterIndex = vi.fn().mockResolvedValue('router content');
      return this;
    } as any);

    // Setup DetectionService mock implementation
    vi.mocked(DetectionService).mockImplementation(function (this: any) {
      this.detectAgents = vi.fn().mockResolvedValue({ [Agent.Cursor]: true });
      this.getProjectDeps = vi.fn().mockResolvedValue(new Set(['dep1']));
      return this;
    } as any);

    // Setup AgentBridgeService mock implementation
    vi.mocked(AgentBridgeService).mockImplementation(function (this: any) {
      this.bridge = vi.fn().mockResolvedValue(undefined);
      return this;
    } as any);

    // Mock MarkdownUtils static method
    vi.mocked(MarkdownUtils.injectIndex).mockResolvedValue(undefined as any);

    syncService = new SyncService();

    // Access the mocked services sub-instances
    mockSkillSyncService = (syncService as any).skillSyncService;
    mockWorkflowSyncService = (syncService as any).workflowSyncService;
    mockGithubService = (syncService as any).githubService;
    mockConfigService = (syncService as any).configService;

    // Properly mock GithubService methods
    mockGithubService.getRepoInfo = vi
      .fn()
      .mockResolvedValue({ default_branch: 'main' });
    mockGithubService.getRawFile = vi.fn().mockResolvedValue('{}');

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('reconcileConfig', () => {
    it('should return true if dependencies were reconciled', async () => {
      const config = { skills: {} } as any;
      const projectDeps = new Set(['react']);
      mockConfigService.reconcileDependencies.mockReturnValue(['react']);

      const result = await syncService.reconcileConfig(config, projectDeps);

      expect(result).toBe(true);
      expect(mockConfigService.reconcileDependencies).toHaveBeenCalledWith(
        config,
        projectDeps,
      );
    });

    it('should return false if no changes', async () => {
      const config = { skills: {} } as any;
      const projectDeps = new Set([]);
      mockConfigService.reconcileDependencies.mockReturnValue([]);

      const result = await syncService.reconcileConfig(config, projectDeps);

      expect(result).toBe(false);
    });
  });

  describe('reconcileWorkflows', () => {
    it('should delegate to workflowSyncService if Antigravity is enabled', async () => {
      const config = { agents: [Agent.Antigravity] } as any;
      mockWorkflowSyncService.reconcileWorkflows.mockResolvedValue(true);

      const result = await syncService.reconcileWorkflows(config);

      expect(result).toBe(true);
      expect(mockWorkflowSyncService.reconcileWorkflows).toHaveBeenCalledWith(
        config,
      );
    });

    it('should delegate to workflowSyncService for any agent', async () => {
      const config = { agents: [Agent.Cursor] } as any;
      mockWorkflowSyncService.reconcileWorkflows.mockResolvedValue(false);
      const result = await syncService.reconcileWorkflows(config);
      expect(mockWorkflowSyncService.reconcileWorkflows).toHaveBeenCalledWith(
        config,
      );
      expect(result).toBe(false);
    });
  });

  describe('assembleSkills', () => {
    it('should delegate to skillSyncService', async () => {
      const config = {} as any;
      const categories = ['cat1'];
      mockSkillSyncService.assembleSkills.mockResolvedValue([]);

      await syncService.assembleSkills(categories, config);

      expect(mockSkillSyncService.assembleSkills).toHaveBeenCalledWith(
        categories,
        config,
      );
    });
  });

  describe('writeSkills', () => {
    it('should delegate to skillSyncService with resolved agents', async () => {
      const config = { agents: [Agent.Cursor] } as any;
      const skills = [] as any;

      await syncService.writeSkills(skills, config);

      expect(mockSkillSyncService.writeSkills).toHaveBeenCalledWith(
        skills,
        config,
        [Agent.Cursor],
      );
    });
  });

  describe('assembleWorkflows', () => {
    it('should delegate to workflowSyncService for any agent', async () => {
      const config = { agents: [Agent.Cursor] } as any;
      mockWorkflowSyncService.assembleWorkflows.mockResolvedValue([
        { skill: 'wf' },
      ]);
      const result = await syncService.assembleWorkflows(config);
      expect(result).toHaveLength(1);
      expect(mockWorkflowSyncService.assembleWorkflows).toHaveBeenCalled();
    });
  });

  describe('writeWorkflows', () => {
    it('should delegate with resolved agents', async () => {
      const config = { agents: [Agent.Cursor] } as any;
      await syncService.writeWorkflows([{ skill: 'wf' }] as any, config);
      expect(mockWorkflowSyncService.writeWorkflows).toHaveBeenCalledWith(
        [{ skill: 'wf' }],
        config,
        [Agent.Cursor],
      );
    });
  });

  describe('applyIndices', () => {
    it('should update index correctly', async () => {
      const config = { agents: [Agent.Cursor], skills: {} } as any;
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);

      await syncService.applyIndices(config, [Agent.Cursor]);

      expect(MarkdownUtils.injectIndex).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('router index updated'),
      );
    });

    it('should log warning for unsupported agent ID', async () => {
      const config = { agents: ['unsupported-id' as any], skills: {} } as any;
      await syncService.applyIndices(config, ['unsupported-id' as any]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Agent definition not found'),
      );
    });

    it('should handle index generation failure', async () => {
      const config = { agents: [Agent.Cursor], skills: {} } as any;
      vi.mocked(IndexGeneratorService).mockImplementationOnce(function (
        this: any,
      ) {
        this.generateAllCategoryIndices = vi
          .fn()
          .mockRejectedValue(new Error('Gen failed'));
        this.assembleRouterIndex = vi.fn().mockResolvedValue('');
        return this;
      } as any);

      await syncService.applyIndices(config);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update index'),
      );
    });
  });

  describe('checkForUpdates', () => {
    it('should check remote registry for updates', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        skills: { ts: { ref: 'v1' } },
      } as any;

      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRawFile.mockResolvedValue(
        JSON.stringify({
          categories: { ts: { version: 'v2' } },
        }),
      );

      const updates = await syncService.checkForUpdates(config);
      expect(updates).toEqual({ ts: 'v2' });
    });

    it('should return empty updates if registry URL is invalid', async () => {
      const config = { registry: 'not-github' } as any;
      const updates = await syncService.checkForUpdates(config);
      expect(updates).toEqual({});
    });

    it('should return empty updates if remote metadata is missing', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        skills: { ts: { ref: 'v1' } },
      } as any;
      mockGithubService.getRawFile.mockResolvedValue(null);
      const updates = await syncService.checkForUpdates(config);
      expect(updates).toEqual({});
    });
  });
});
