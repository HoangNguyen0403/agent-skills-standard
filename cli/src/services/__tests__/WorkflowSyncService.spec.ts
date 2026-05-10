import fs from 'fs-extra';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
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
    it('should return false if treeData is missing', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(null);
      const result = await workflowSyncService.reconcileWorkflows({
        registry: 'https://github.com/o/r',
      } as any);
      expect(result).toBe(false);
    });

    it('should return false if no workflows are in repo', async () => {
      mockGithubService.getRepoTree.mockResolvedValue({ tree: [] });
      const result = await workflowSyncService.reconcileWorkflows({
        registry: 'https://github.com/o/r',
      } as any);
      expect(result).toBe(false);
    });

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
          { path: '.agents/workflows/code-review.md' },
          { path: '.agents/workflows/plan-feature.md' },
          { path: '.agents/workflows/custom.md' },
        ],
      });

      const result = await workflowSyncService.reconcileWorkflows(config);

      expect(result).toBe(true);
      expect(config.workflows).toContain('code-review');
      expect(config.workflows).toContain('plan-feature');
      expect(config.workflows).not.toContain('custom');
    });

    it('should return false if all default workflows are already present', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        workflows: [
          'code-review',
          'plan-feature',
          'smart-release',
          'update-docs',
          'skill-benchmark',
          'battle-test',
          'create-skillset',
          'codebase-review',
        ],
      } as any;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: '.agents/workflows/code-review.md' }],
      });
      const result = await workflowSyncService.reconcileWorkflows(config);
      expect(result).toBe(false);
    });

    it('should initialize workflows to default array if undefined', async () => {
      const config = {
        registry: 'https://github.com/o/r',
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: '.agents/workflows/code-review.md' }],
      });

      const result = await workflowSyncService.reconcileWorkflows(config);

      expect(result).toBe(true);
      expect(Array.isArray(config.workflows)).toBe(true);
      expect(config.workflows).toContain('code-review');
    });

    it('should preserve workflows: true as a stable state', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        workflows: true,
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: '.agents/workflows/code-review.md' }],
      });

      const result = await workflowSyncService.reconcileWorkflows(config);

      expect(result).toBe(false); // No change to .skillsrc
      expect(config.workflows).toBe(true);
    });
  });

  describe('assembleWorkflows', () => {
    it('should return empty if workflows are disabled in config', async () => {
      const config = { workflows: false } as unknown as SkillConfig;
      const result = await workflowSyncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should return empty if registry URL is invalid', async () => {
      const config = { workflows: true, registry: 'invalid' } as any;
      const result = await workflowSyncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should return empty if repo tree fails to fetch', async () => {
      const config = {
        workflows: true,
        registry: 'https://github.com/o/r',
      } as any;
      mockGithubService.getRepoTree.mockResolvedValue(null);
      const result = await workflowSyncService.assembleWorkflows(config);
      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch workflows'),
      );
    });

    it('should fetch all workflows if config.workflows is true', async () => {
      const config = {
        workflows: true,
        registry: 'https://github.com/o/r',
      } as unknown as SkillConfig;
      const treeData = {
        tree: [{ path: '.agents/workflows/w1.md' }, { path: 'other/file.md' }],
      };
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'develop',
      });
      mockGithubService.getRepoTree.mockResolvedValue(treeData);
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([
        { path: '.agents/workflows/w1.md', content: 'c1' },
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
          { path: '.agents/workflows/w1.md' },
          { path: '.agents/workflows/w2.md' },
        ],
      };
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue(treeData);
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([]);

      const result = await workflowSyncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });
  });

  describe('writeWorkflows', () => {
    it('should bail if no workflows to write', async () => {
      await workflowSyncService.writeWorkflows([], {} as any);
      expect(fs.ensureDir).not.toHaveBeenCalled();
    });

    it('should write native workflow files for Antigravity', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [
            { name: 'test.md', content: '---\ndescription: test\n---\n# Test' },
          ],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Antigravity,
      ]);
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
        expect.any(String),
      );
    });

    it('should transform to Claude command format with $ARGUMENTS', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [
            {
              name: 'review.md',
              content:
                '---\ndescription: Review code.\n---\n# Review\n## Step 1',
            },
          ],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Claude,
      ]);
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('review.md'),
        expect.stringContaining('$ARGUMENTS'),
      );
    });

    it('should transform to Gemini toml command format', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [
            {
              name: 'review.md',
              content: '---\ndescription: Review.\n---\n# Review',
            },
          ],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Gemini,
      ]);
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('review.toml'),
        expect.stringContaining('{{args}}'),
      );
    });

    it('should transform to Copilot prompt format', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [
            {
              name: 'review.md',
              content: '---\ndescription: Review.\n---\n# Review',
            },
          ],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Copilot,
      ]);
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('review.prompt.md'),
        expect.stringContaining('description: "Review."'),
      );
    });

    it('should skip agents with no workflow support', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [
            {
              name: 'review.md',
              content: '---\ndescription: Review.\n---\n# Review',
            },
          ],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Windsurf,
      ]);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should write to multiple agents with different formats', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [
            {
              name: 'review.md',
              content: '---\ndescription: Review.\n---\n# Review',
            },
          ],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Antigravity,
        Agent.Claude,
        Agent.Gemini,
      ]);
      expect(fs.outputFile).toHaveBeenCalledTimes(3);
    });

    it('should skip workflows where skill is not "workflows"', async () => {
      const workflows = [{ skill: 'not-workflows', files: [] }];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Antigravity,
      ]);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should handle security error for dangerous paths', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [
            {
              name: '../malicious.md',
              content: '---\ndescription: evil\n---\n# Evil',
            },
          ],
        },
      ];
      await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
        Agent.Antigravity,
      ]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Security Error'),
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    describe('writeWorkflows additional coverage', () => {
      it('should handle native skill folder format (agent.workflowFormat === "skill")', async () => {
        const workflows = [
          {
            skill: 'workflows',
            files: [
              {
                name: 'test.md',
                content: '---\ndescription: test\n---\n# Test',
              },
            ],
          },
        ];

        await workflowSyncService.writeWorkflows(workflows as any, {} as any, [
          Agent.Cursor,
        ]);
        // Should be path/workflowName/SKILL.md
        expect(fs.outputFile).toHaveBeenCalledWith(
          expect.stringContaining(
            path.join('.cursor', 'skills', 'test', 'SKILL.md'),
          ),
          expect.any(String),
        );
      });

      it('should handle overrides', async () => {
        const workflows = [
          {
            skill: 'workflows',
            files: [
              {
                name: 'overridden.md',
                content: '---\ndescription: test\n---\n# Test',
              },
            ],
          },
        ];
        // Antigravity workflow path is .agents/workflows
        const targetPath = path.join(
          process.cwd(),
          '.agents/workflows/overridden.md',
        );
        const relPath = path
          .relative(process.cwd(), targetPath)
          .replace(/\\/g, '/');
        const overrides = [relPath];

        await workflowSyncService.writeWorkflows(
          workflows as any,
          { custom_overrides: overrides } as any,
          [Agent.Antigravity],
        );

        expect(fs.outputFile).not.toHaveBeenCalled();
      });

      it('should handle partial path overrides', async () => {
        const workflows = [
          {
            skill: 'workflows',
            files: [
              {
                name: 'sub/test.md',
                content: '---\ndescription: test\n---\n# Test',
              },
            ],
          },
        ];
        // Antigravity workflow path is .agents/workflows
        const targetPath = path.join(
          process.cwd(),
          '.agents/workflows/sub/test.md',
        );
        const relPath = path
          .relative(
            process.cwd(),
            path.join(process.cwd(), '.agents/workflows/sub'),
          )
          .replace(/\\/g, '/');
        const overrides = [relPath];

        await workflowSyncService.writeWorkflows(
          workflows as any,
          { custom_overrides: overrides } as any,
          [Agent.Antigravity],
        );
        expect(fs.outputFile).not.toHaveBeenCalled();
      });
    });
  });
});
