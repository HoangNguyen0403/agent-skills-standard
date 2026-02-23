import fs from 'fs-extra';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitService } from '../GitService';
import { SkillDiscoveryService } from '../SkillDiscoveryService';

vi.mock('fs-extra');
vi.mock('../GitService');

describe('SkillDiscoveryService', () => {
  let discovery: SkillDiscoveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    discovery = new SkillDiscoveryService();
  });

  describe('findAllSkills', () => {
    it('should find skills recursively', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (dir === 'skills') return ['subdir', 'SKILL.md'] as any;
        if (dir === 'skills/subdir' || dir.includes('subdir'))
          return ['SKILL.md'] as any;
        return [];
      });
      vi.mocked(fs.stat).mockImplementation(
        async (p: any) =>
          ({
            isDirectory: () =>
              p === 'skills/subdir' || p === path.join('skills', 'subdir'),
          }) as any,
      );

      const files = await discovery.findAllSkills('skills');
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.includes('subdir'))).toBe(true);
    });

    it('should return empty array if directory does not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      const files = await discovery.findAllSkills('skills');
      expect(files).toEqual([]);
    });

    it('should continue discovery even if some directories fail to read', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (dir === 'skills') return ['fail-dir', 'SKILL.md'] as any;
        if (dir === 'skills/fail-dir') throw new Error('Permission denied');
        return [];
      });
      vi.mocked(fs.stat).mockImplementation(
        async (p: any) =>
          ({
            isDirectory: () => p === 'skills/fail-dir',
          }) as any,
      );

      const files = await discovery.findAllSkills('skills');
      expect(files).toHaveLength(1);
      expect(files[0]).toBe(path.join('skills', 'SKILL.md'));
    });
  });

  describe('findChangedSkills', () => {
    it('should merge changed and untracked skill files', async () => {
      vi.mocked(GitService.prototype.findProjectRoot).mockReturnValue('/app');
      vi.mocked(GitService.prototype.getChangedFiles).mockReturnValue([
        'skills/a/SKILL.md',
        'src/other.ts',
      ]);
      vi.mocked(GitService.prototype.getUntrackedFiles).mockReturnValue([
        'skills/b/SKILL.md',
        'skills/a/SKILL.md', // Duplicate should be removed
      ]);

      const files = await discovery.findChangedSkills();
      expect(files).toHaveLength(2);
      // Validates it uses absolute paths
      expect(files).toContain('/app/skills/a/SKILL.md');
      expect(files).toContain('/app/skills/b/SKILL.md');
      expect(files).not.toContain('/app/src/other.ts');
    });
  });
});
