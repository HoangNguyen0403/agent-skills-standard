import { execSync } from 'child_process';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillValidator } from '../SkillValidator';

vi.mock('fs-extra');
vi.mock('child_process');

describe('SkillValidator', () => {
  let validator: SkillValidator;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy path mocks
    vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
    // @ts-expect-error - mock types
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false });
    vi.mocked(fs.readJson).mockResolvedValue({
      categories: {
        test: { version: '1.0.0', tag_prefix: 'v' },
      },
    });
    vi.mocked(fs.readFile).mockImplementation(() =>
      Promise.resolve(
        '---\nname: Test\ndescription: A test skill\n---\n## **Priority: 1**\n' as unknown as Buffer,
      ),
    );
    vi.mocked(fs.readdir).mockImplementation(() => Promise.resolve([] as any));

    // Spy on console to avoid polluting output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    validator = new SkillValidator();
  });

  afterEach(() => {
    // Restore process.env
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  describe('run', () => {
    it('should return 0 when all skills pass', async () => {
      vi.spyOn(validator, 'validateAllSkills').mockResolvedValue({
        total: 1,
        passed: 1,
        failed: 0,
        warnings: 0,
      });
      const exitCode = await validator.run(true);
      expect(exitCode).toBe(0);
    });

    it('should return 1 when any skill fails', async () => {
      vi.spyOn(validator, 'validateAllSkills').mockResolvedValue({
        total: 1,
        passed: 0,
        failed: 1,
        warnings: 0,
      });
      const exitCode = await validator.run(true);
      expect(exitCode).toBe(1);
    });

    it('should return 1 when an exception occurs (Error object)', async () => {
      vi.spyOn(validator, 'validateAllSkills').mockRejectedValueOnce(
        new Error('Fatal'),
      );
      const exitCode = await validator.run(true);
      expect(exitCode).toBe(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation error: Error: Fatal'),
      );
    });

    it('should return 1 when an exception occurs (string error)', async () => {
      vi.spyOn(validator, 'validateAllSkills').mockRejectedValueOnce('Fatal');
      const exitCode = await validator.run(true);
      expect(exitCode).toBe(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation error: Fatal'),
      );
    });
  });

  describe('validateAllSkills', () => {
    it('should throw if skills directory is missing', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (path) => {
        return typeof path === 'string' && path.endsWith('skills')
          ? false
          : true;
      });
      await expect(validator.validateAllSkills()).rejects.toThrow(
        'skills/ directory not found',
      );
    });

    it('should print errors for failed skills', async () => {
      // Mock findSkillFiles to return one file
      // @ts-expect-error - private method
      vi.spyOn(validator, 'findSkillFiles').mockResolvedValue([
        'skills/test/SKILL.md',
      ]);

      // Mock validateSkill to fail
      // @ts-expect-error - private method
      vi.spyOn(validator, 'validateSkill').mockResolvedValue({
        file: 'test',
        errors: ['error'],
        warnings: [],
        passed: false,
      });

      const summary = await validator.validateAllSkills(true);
      expect(summary.failed).toBe(1);
      expect(console.log).toHaveBeenCalled();
    });

    it('should print warnings for passed skills with warnings', async () => {
      // @ts-expect-error - private method
      vi.spyOn(validator, 'findSkillFiles').mockResolvedValue([
        'skills/test/SKILL.md',
      ]);

      // @ts-expect-error - private method
      vi.spyOn(validator, 'validateSkill').mockResolvedValue({
        file: 'test',
        errors: [],
        warnings: ['warn'],
        passed: true,
      });

      const summary = await validator.validateAllSkills(true);
      expect(summary.passed).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(console.log).toHaveBeenCalled();
    });

    it('should call findChangedSkillFiles when validateAll is false', async () => {
      const spy = vi
        .spyOn(validator as any, 'findChangedSkillFiles')
        .mockResolvedValue([]);
      await validator.validateAllSkills(false);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('findChangedSkillFiles', () => {
    it('should use git diff against base ref in CI', async () => {
      process.env.GITHUB_BASE_REF = 'main';
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('diff'))
          return 'skills/changed/SKILL.md\n';
        return '';
      });

      // @ts-expect-error - private method
      const files = await validator.findChangedSkillFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('skills/changed/SKILL.md');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git fetch'),
      );
    });

    it('should handle git fetch failure in CI gracefully', async () => {
      process.env.GITHUB_BASE_REF = 'main';
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('fetch'))
          throw new Error('Fetch failed');
        if (typeof cmd === 'string' && cmd.includes('diff'))
          return 'skills/changed/SKILL.md\n';
        return '';
      });

      // @ts-expect-error - private method
      const files = await validator.findChangedSkillFiles();
      expect(files).toHaveLength(1);
      // Should proceed to diff even if fetch fails, so we just check if it found the file
      expect(files[0]).toContain('skills/changed/SKILL.md');
    });

    it('should use local git diff and ls-files when not in CI', async () => {
      delete process.env.GITHUB_BASE_REF;
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('diff'))
          return 'skills/changed/SKILL.md\n';
        if (typeof cmd === 'string' && cmd.includes('ls-files'))
          return 'skills/new/SKILL.md\n';
        return '';
      });

      // @ts-expect-error - private method
      const files = await validator.findChangedSkillFiles();
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.includes('changed'))).toBe(true);
      expect(files.some((f) => f.includes('new'))).toBe(true);
    });

    it('should return empty array on git command failure', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Git not found');
      });
      // @ts-expect-error - private method
      const files = await validator.findChangedSkillFiles();
      expect(files).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should return empty list if execSync returned non-string (mock edge case)', async () => {
      vi.mocked(execSync).mockReturnValue(123 as any);
      // @ts-expect-error - private method
      const files = await validator.findChangedSkillFiles();
      expect(files).toEqual([]);
    });
  });

  describe('validateSkill', () => {
    it('should pass for a valid skill', async () => {
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/ok/SKILL.md');
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if file reading fails', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/bad/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Failed to read or validate');
    });

    it('should fail if file is too large', async () => {
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve('line\n'.repeat(501) as unknown as Buffer),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/large/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('too large');
    });

    it('should fail if frontmatter is invalid', async () => {
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve('Just text' as unknown as Buffer),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/bad/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Missing or invalid frontmatter');
    });

    it('should handle generic error in validateSkill catch block', async () => {
      vi.mocked(fs.readFile).mockImplementation(() => {
        throw 'String error'; // Throw a non-Error object to cover the branch
      });
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/bad/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('String error');
    });

    it('should fail if name is missing in frontmatter', async () => {
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(
          '---\ndescription: D\n---\n## **Priority: 1**' as unknown as Buffer,
        ),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/bad/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Missing "name" field in frontmatter');
    });

    it('should fail if description is missing', async () => {
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(
          '---\nname: N\n---\n## **Priority: 1**' as unknown as Buffer,
        ),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/bad/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors).toContain(
        'Missing "description" field in frontmatter',
      );
    });

    it('should fail if description is too long', async () => {
      const longDesc = 'a'.repeat(201);
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(
          `---\nname: N\ndescription: ${longDesc}\n---\n## **Priority: 1**` as unknown as Buffer,
        ),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/bad/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Description too long');
    });

    it('should warn on conversational style in instructions', async () => {
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(
          '---\nname: N\ndescription: D\n---\n## **Priority: 1**\n- You should do this.' as unknown as Buffer,
        ),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/warn/SKILL.md');
      expect(result.passed).toBe(true);
      expect(result.warnings[0]).toContain('Consider using imperative mood');
    });

    it('should ignore conversational style inside code blocks', async () => {
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(
          '---\nname: N\ndescription: D\n---\n## **Priority: 1**\n```\n- Please note: You should do this.\n```' as unknown as Buffer,
        ),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/ok/SKILL.md');
      expect(result.passed).toBe(true);
      // It might still have a warning about references dir, but not the conversational one
      expect(
        result.warnings.some((w: any) => w.includes('imperative mood')),
      ).toBe(false);
    });

    it('should fail if missing priority section', async () => {
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(
          '---\nname: N\ndescription: D\n---\nJust content' as unknown as Buffer,
        ),
      );
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/bad/SKILL.md');
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Missing priority section');
    });
  });

  describe('validateSkillDirectory', () => {
    it('should warn for invalid script extensions', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.includes('scripts'))
          return ['bad.exe'] as any;
        return [];
      });
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/test/SKILL.md');
      expect(
        result.warnings.some((w: any) =>
          w.includes('Script without standard extension'),
        ),
      ).toBe(true);
    });

    it('should warn if references directory has no md files', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (path) => {
        // Mock references dir existing but empty or only non-md
        if (typeof path === 'string' && path.includes('references'))
          return ['image.png'] as any;
        return [];
      });
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/test/SKILL.md');
      expect(
        result.warnings.some((w: any) => w.includes('contains no .md files')),
      ).toBe(true);
    });

    it('should not warn if script extension is valid', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.includes('scripts'))
          return ['good.py'] as any;
        return [];
      });
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/test/SKILL.md');
      expect(
        result.warnings.some((w: any) =>
          w.includes('Script without standard extension'),
        ),
      ).toBe(false);
    });

    it('should handle missing scripts directory', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (p) => {
        if (typeof p === 'string' && p.includes('scripts')) return false;
        return true;
      });
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/test/SKILL.md');
      expect(
        result.warnings.some((w: any) => w.includes('Script without standard')),
      ).toBe(false);
    });

    it('should not warn if references directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (p) => {
        if (typeof p === 'string' && p.includes('references')) return false;
        return true;
      });
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/test/SKILL.md');
      expect(
        result.warnings.some((w: any) => w.includes('References directory')),
      ).toBe(false);
    });

    it('should not warn if references directory has md files', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (p) => {
        if (typeof p === 'string' && p.includes('references'))
          return ['doc.md'] as any;
        return [];
      });
      // @ts-expect-error - private method
      const result = await validator.validateSkill('skills/test/SKILL.md');
      expect(
        result.warnings.some((w: any) => w.includes('contains no .md files')),
      ).toBe(false);
    });
  });

  describe('validateMetadata', () => {
    it('should pass for valid metadata', async () => {
      // @ts-expect-error - private
      await expect(validator.validateMetadata()).resolves.not.toThrow();
    });

    it('should fail if metadata.json is missing', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.endsWith('metadata.json'))
          return false;
        return true;
      });
      // @ts-expect-error - private
      await expect(validator.validateMetadata()).rejects.toThrow(
        'metadata.json not found',
      );
    });

    it('should fail if categories field is missing', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({});
      // @ts-expect-error - private
      await expect(validator.validateMetadata()).rejects.toThrow(
        'missing "categories" field',
      );
    });

    it('should fail if category version is missing', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({
        categories: { test: { tag_prefix: 'v' } },
      });
      // @ts-expect-error - private
      await expect(validator.validateMetadata()).rejects.toThrow(
        'missing version',
      );
    });

    it('should fail if category tag_prefix is missing', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({
        categories: { test: { version: '1.0.0' } },
      });
      // @ts-expect-error - private
      await expect(validator.validateMetadata()).rejects.toThrow(
        'missing tag_prefix',
      );
    });

    it('should handle non-Error objects in metadata validation', async () => {
      vi.mocked(fs.readJson).mockImplementation(() => {
        throw 'String error';
      });
      // @ts-expect-error - private method
      await expect(validator.validateMetadata()).rejects.toThrow(
        'Metadata validation failed: String error',
      );
    });
  });

  describe('printSummary', () => {
    it('should print success message if no failures', () => {
      validator.printSummary({ total: 1, passed: 1, failed: 0, warnings: 0 });
      expect(console.log).toHaveBeenCalled();
    });

    it('should print warnings count if warnings exist', () => {
      validator.printSummary({ total: 1, passed: 1, failed: 0, warnings: 5 });
      expect(console.log).toHaveBeenCalled();
    });

    it('should print failure message if failures exist', () => {
      validator.printSummary({ total: 1, passed: 0, failed: 1, warnings: 0 });
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('findSkillFiles (recursive)', () => {
    it('should recursively find SKILL.md files', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.endsWith('skills'))
          return ['subdir', 'SKILL.md'] as any;
        if (typeof path === 'string' && path.endsWith('subdir'))
          return ['SKILL.md'] as any; // Another skill in subdir
        return [] as any;
      });

      vi.mocked(fs.stat).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.endsWith('subdir'))
          return { isDirectory: () => true } as any;
        return { isDirectory: () => false } as any;
      });

      // @ts-expect-error - private method
      const files = await validator.findSkillFiles('skills');
      expect(files).toHaveLength(2);
    });

    it('should skip non-SKILL.md files', async () => {
      vi.mocked(fs.readdir).mockImplementation(async () => {
        return ['other.txt'] as any;
      });
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as any);

      // @ts-expect-error - private method
      const files = await validator.findSkillFiles('skills');
      expect(files).toHaveLength(0);
    });

    it('should handle passed skill without warnings in validateAllSkills', async () => {
      vi.spyOn(validator as any, 'findSkillFiles').mockResolvedValue([
        'skills/ok/SKILL.md',
      ]);
      vi.spyOn(validator as any, 'validateSkill').mockResolvedValue({
        file: 'skills/ok/SKILL.md',
        errors: [],
        warnings: [],
        passed: true,
      });

      const summary = await validator.validateAllSkills(true);
      expect(summary.passed).toBe(1);
    });

    it('should ignore folder scanning errors', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.endsWith('skills'))
          return ['subdir'] as any;
        throw new Error('Scan failed');
      });
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      // @ts-expect-error - private method
      const files = await validator.findSkillFiles('skills');
      expect(files).toEqual([]);
    });

    it('should handle non-Error objects in folder scanning catch block', async () => {
      vi.mocked(fs.readdir).mockImplementation(async () => {
        throw 'Unknown error';
      });
      // @ts-expect-error - private method
      const files = await validator.findSkillFiles('skills');
      expect(files).toEqual([]);
    });

    it('should log warning when scan fails and DEBUG is set', async () => {
      process.env.DEBUG = 'true';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Scan error'));

      // @ts-expect-error - private method
      await validator.findSkillFiles('skills');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to scan skills directory'),
      );
      warnSpy.mockRestore();
    });

    it('should handle non-Error objects in folder scanning and log them', async () => {
      process.env.DEBUG = 'true';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(fs.readdir).mockRejectedValue('String error');

      // @ts-expect-error - private method
      await validator.findSkillFiles('skills');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('String error'),
      );
      warnSpy.mockRestore();
    });
  });
});

describe('SkillValidator - Root Discovery & Path Normalization', () => {
  let validator: SkillValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new SkillValidator();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should find project root when pnpm-workspace.yaml exists', () => {
    const cwdSpy = vi
      .spyOn(process, 'cwd')
      .mockReturnValue('/app/packages/cli');
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      return p === '/app/pnpm-workspace.yaml';
    });

    // @ts-expect-error - private method
    const root = validator.findProjectRoot();
    expect(root).toBe('/app');
    cwdSpy.mockRestore();
  });

  it('should find project root when .git exists', () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/app/src');
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      return p === '/app/.git';
    });

    // @ts-expect-error - private method
    const root = validator.findProjectRoot();
    expect(root).toBe('/app');
    cwdSpy.mockRestore();
  });

  it('should fallback to process.cwd() if no markers found', () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/app');
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // @ts-expect-error - private method
    const root = validator.findProjectRoot();
    expect(root).toBe('/app');
    cwdSpy.mockRestore();
  });

  it('should normalize path relative to project root', () => {
    // @ts-expect-error - private method
    vi.spyOn(validator, 'findProjectRoot').mockReturnValue('/app');
    // @ts-expect-error - private method
    const normalized = validator.normalizePath('/app/skills/test/SKILL.md');
    expect(normalized).toBe('skills/test/SKILL.md');
  });
});
