import { execSync } from 'child_process';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitService } from '../GitService';

vi.mock('child_process');
vi.mock('fs-extra');

describe('GitService', () => {
  let gitService: GitService;

  beforeEach(() => {
    vi.clearAllMocks();
    gitService = new GitService();
  });

  describe('findProjectRoot', () => {
    it('should find root when pnpm-workspace.yaml exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) =>
        p.includes('pnpm-workspace.yaml'),
      );
      const root = gitService.findProjectRoot('/fake/dir/path');
      expect(root).toBe('/fake/dir/path');
    });

    it('should find root when .git exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) =>
        p.includes('.git'),
      );
      const root = gitService.findProjectRoot('/fake/dir/path');
      expect(root).toBe('/fake/dir/path');
    });

    it('should traverse up', () => {
      vi.mocked(fs.existsSync).mockImplementation(
        (p: any) => p === '/fake/pnpm-workspace.yaml',
      );
      const root = gitService.findProjectRoot('/fake/dir/path');
      expect(root).toBe('/fake');
    });
    it('should fall back to startDir if no root found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const root = gitService.findProjectRoot('/fake/dir/path');
      expect(root).toBe('/fake/dir/path');
    });
  });

  describe('getChangedFiles', () => {
    afterEach(() => {
      delete process.env.GITHUB_BASE_REF;
      delete process.env.DEBUG;
    });

    it('should use diff against base ref in CI', () => {
      process.env.GITHUB_BASE_REF = 'main';
      vi.mocked(execSync).mockReturnValue('file1.ts\nfile2.ts\n' as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const files = gitService.getChangedFiles('/app');
      expect(files).toEqual(['file1.ts', 'file2.ts']);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git fetch'),
        expect.anything(),
      );
    });

    it('should handle fetch failure gracefully', () => {
      process.env.GITHUB_BASE_REF = 'main';
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        if (cmd.includes('fetch')) throw new Error('Fetch failed');
        return 'file.ts\n';
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const files = gitService.getChangedFiles('/app');
      expect(files).toEqual(['file.ts']);
    });

    it('should use local diff when not in CI', () => {
      vi.mocked(execSync).mockReturnValue('file3.ts\n' as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const files = gitService.getChangedFiles('/app');
      expect(files).toEqual(['file3.ts']);
      expect(execSync).toHaveBeenCalledWith(
        'git diff --name-only HEAD',
        expect.anything(),
      );
    });

    it('should filter non-existent files', () => {
      vi.mocked(execSync).mockReturnValue('exist.ts\nmissing.ts\n' as any);
      vi.mocked(fs.existsSync).mockImplementation((p: any) =>
        p.includes('exist.ts'),
      );

      const files = gitService.getChangedFiles('/app');
      expect(files).toEqual(['exist.ts']);
    });

    it('should return empty array on git error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Git fail');
      });
      const files = gitService.getChangedFiles('/app');
      expect(files).toEqual([]);
    });

    it('should log warning on git error if DEBUG is set', () => {
      process.env.DEBUG = '1';
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Git fail');
      });
      const files = gitService.getChangedFiles('/app');
      expect(files).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Git failure while getting changed files:',
        expect.any(Error),
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getUntrackedFiles', () => {
    afterEach(() => {
      delete process.env.DEBUG;
    });

    it('should return untracked files', () => {
      vi.mocked(execSync).mockReturnValue('untracked.ts\n' as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const files = gitService.getUntrackedFiles('/app');
      expect(files).toEqual(['untracked.ts']);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('ls-files'),
        expect.anything(),
      );
    });

    it('should return empty array on failure', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Fail');
      });
      const files = gitService.getUntrackedFiles('/app');
      expect(files).toEqual([]);
    });

    it('should log warning on git error if DEBUG is set', () => {
      process.env.DEBUG = '1';
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Git fail');
      });
      const files = gitService.getUntrackedFiles('/app');
      expect(files).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Git failure while getting untracked files:',
        expect.any(Error),
      );
      consoleWarnSpy.mockRestore();
    });
  });
});
