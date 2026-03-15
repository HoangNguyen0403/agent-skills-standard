import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillConfig } from '../../models/config';
import { WorkflowSyncService } from '../WorkflowSyncService';

// Mock fs-extra
vi.mock('fs-extra');

describe('WorkflowSyncService', () => {
  let workflowSyncService: WorkflowSyncService;
  let mockGithubService: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGithubService = {
      getRepoTree: vi.fn(),
      fetchSkillFiles: vi.fn(),
      downloadFilesConcurrent: vi.fn(),
      getRawFile: vi.fn(),
      getRepoInfo: vi.fn(),
    };

    workflowSyncService = new WorkflowSyncService(mockGithubService as any);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('reconcileWorkflows', () => {
    it('should discover and add new workflows from DEFAULT_WORKFLOWS if config.workflows is an array', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        workflows: ['code-review'],
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: '.agent/workflows/code-review.md' },
          { path: '.agent/workflows/plan-feature.md' },
          { path: '.agent/workflows/custom.md' },
        ],
      });

      const result = await workflowSyncService.reconcileWorkflows(config);

      expect(result).toBe(true);
      expect(config.workflows).toContain('code-review');
      expect(config.workflows).toContain('plan-feature');
      expect(config.workflows).not.toContain('custom');
    });

    it('should initialize workflows if undefined and true', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        workflows: true,
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: '.agent/workflows/code-review.md' }],
      });

      const result = await workflowSyncService.reconcileWorkflows(config);

      expect(result).toBe(true);
      expect(config.workflows).toEqual(['code-review']);
    });
  });

  describe('assembleWorkflows', () => {
    it('should return empty if workflows are disabled in config', async () => {
      const config = { workflows: false } as unknown as SkillConfig;
      const result = await workflowSyncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should fetch all workflows if config.workflows is true', async () => {
      const config = {
        workflows: true,
        registry: 'https://github.com/o/r',
      } as unknown as SkillConfig;
      const treeData = {
        tree: [{ path: '.agent/workflows/w1.md' }, { path: 'other/file.md' }],
      };
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'develop',
      });
      mockGithubService.getRepoTree.mockResolvedValue(treeData);
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([
        { path: '.agent/workflows/w1.md', content: 'c1' },
      ]);

      const result = await workflowSyncService.assembleWorkflows(config);

      expect(result).toHaveLength(1);
      expect(result[0].skill).toBe('workflows');
    });

    it('should fetch specific workflows if config.workflows is an array', async () => {
      const config = {
        workflows: ['w1'],
        registry: 'https://github.com/o/r',
      } as unknown as SkillConfig;
      const treeData = {
        tree: [
          { path: '.agent/workflows/w1.md' },
          { path: '.agent/workflows/w2.md' },
        ],
      };
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue(treeData);
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([]);

      await workflowSyncService.assembleWorkflows(config);

      expect(mockGithubService.downloadFilesConcurrent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: '.agent/workflows/w1.md' }),
        ]),
      );
    });
  });

  describe('writeWorkflows', () => {
    it('should write workflow files to local .agent/workflows', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [{ name: 'test.md', content: 'content' }],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any);
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
        'content',
      );
    });
  });
});
