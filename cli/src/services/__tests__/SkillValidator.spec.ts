import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitService } from '../GitService';
import { SkillDiscoveryService } from '../SkillDiscoveryService';
import { SkillValidator } from '../SkillValidator';
import { ValidationRule } from '../validation/types';

vi.mock('fs-extra');
vi.mock('../GitService');
vi.mock('../SkillDiscoveryService');

describe('SkillValidator', () => {
  let validator: SkillValidator;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();

    (fs.pathExists as any).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue({
      categories: {
        test: { version: '1.0.0', tag_prefix: 'v' },
      },
    });
    vi.mocked(fs.readFile).mockResolvedValue(
      '---\nname: Test\ndescription: A test skill\n---\n## **Priority: 1**\n' as any,
    );

    vi.mocked(GitService.prototype.findProjectRoot).mockReturnValue('/app');
    vi.mocked(SkillDiscoveryService.prototype.findAllSkills).mockResolvedValue([
      'skills/test/SKILL.md',
    ]);
    vi.mocked(
      SkillDiscoveryService.prototype.findChangedSkills,
    ).mockResolvedValue(['skills/changed/SKILL.md']);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    validator = new SkillValidator();
  });

  afterEach(() => {
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

    it('should handle runtime errors', async () => {
      vi.spyOn(validator, 'validateAllSkills').mockRejectedValue(
        new Error('Fatal'),
      );
      const exitCode = await validator.run(true);
      expect(exitCode).toBe(1);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('validateSkill', () => {
    it('should report failure if file cannot be read', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read failed'));
      const result = await (validator as any).validateSkill(
        'skills/test/SKILL.md',
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Read failed');
    });

    it('should collect errors and warnings from rules', async () => {
      const mockRule: ValidationRule = {
        name: 'MockRule',
        validate: vi.fn().mockResolvedValue({
          passed: false,
          errors: ['err1'],
          warnings: ['warn1'],
        }),
      };
      (validator as any).rules = [mockRule];

      const result = await (validator as any).validateSkill(
        'skills/test/SKILL.md',
      );
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('err1');
      expect(result.warnings).toContain('warn1');
    });
  });

  describe('validateAllSkills', () => {
    it('should throw if skills directory is missing', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      await expect(validator.validateAllSkills()).rejects.toThrow(
        'skills/ directory not found',
      );
    });

    it('should use findAllSkills when validateAll is true', async () => {
      await validator.validateAllSkills(true);
      expect(SkillDiscoveryService.prototype.findAllSkills).toHaveBeenCalled();
    });

    it('should use findChangedSkills when validateAll is false', async () => {
      await validator.validateAllSkills(false);
      expect(
        SkillDiscoveryService.prototype.findChangedSkills,
      ).toHaveBeenCalled();
    });

    it('should validate skills and print summary with warnings', async () => {
      vi.mocked(
        SkillDiscoveryService.prototype.findAllSkills,
      ).mockResolvedValue(['skills/warn/SKILL.md']);

      vi.spyOn(validator as any, 'validateSkill').mockResolvedValue({
        file: 'skills/warn/SKILL.md',
        passed: true,
        errors: [],
        warnings: ['Some warning'],
      });

      const summary = await validator.validateAllSkills(true);
      expect(summary.warnings).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Some warning'),
      );
    });

    it('should validate skills and print summary with failures', async () => {
      vi.mocked(
        SkillDiscoveryService.prototype.findAllSkills,
      ).mockResolvedValue(['skills/fail/SKILL.md']);

      vi.spyOn(validator as any, 'validateSkill').mockResolvedValue({
        file: 'skills/fail/SKILL.md',
        passed: false,
        errors: ['Some error'],
        warnings: [],
      });

      const summary = await validator.validateAllSkills(true);
      expect(summary.failed).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Some error'),
      );
    });
  });

  describe('validateMetadata', () => {
    it('should pass for valid metadata', async () => {
      await expect(
        (validator as any).validateMetadata('/app'),
      ).resolves.not.toThrow();
    });

    it('should fail if metadata.json is missing', async () => {
      vi.mocked(fs.pathExists).mockImplementation(
        async (p) => !String(p).endsWith('metadata.json'),
      );
      await expect((validator as any).validateMetadata('/app')).rejects.toThrow(
        'Metadata validation failed: skills/metadata.json not found',
      );
    });

    it('should fail if metadata.json is invalid json', async () => {
      vi.mocked(fs.readJson).mockRejectedValue(new Error('Invalid JSON'));
      await expect((validator as any).validateMetadata('/app')).rejects.toThrow(
        'Metadata validation failed: Invalid JSON',
      );
    });

    it('should fail if missing categories field', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({});
      await expect((validator as any).validateMetadata('/app')).rejects.toThrow(
        'Metadata validation failed: metadata.json missing "categories" field',
      );
    });

    it('should fail if missing version or tag_prefix in categories', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockResolvedValue({
        categories: {
          test: { version: '1.0.0' }, // missing tag_prefix
        },
      });
      await expect((validator as any).validateMetadata('/app')).rejects.toThrow(
        'Category "test" missing required fields (version, tag_prefix) in metadata.json',
      );
    });
  });

  describe('printSummary', () => {
    it('should print correctly', () => {
      validator.printSummary({ total: 1, passed: 1, failed: 0, warnings: 0 });
      expect(console.log).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('All skills passed'),
      );
    });

    it('should print correctly with warnings', () => {
      validator.printSummary({ total: 1, passed: 1, failed: 0, warnings: 1 });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('warnings found'),
      );
    });

    it('should print correctly with failures', () => {
      validator.printSummary({ total: 1, passed: 0, failed: 1, warnings: 0 });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed!'),
      );
    });
  });

  describe('Non-Error Catches', () => {
    it('should handle non-Error throw in run', async () => {
      vi.spyOn(validator, 'validateAllSkills').mockRejectedValue(
        'String error',
      );
      const exitCode = await validator.run(true);
      expect(exitCode).toBe(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('String error'),
      );
    });

    it('should handle non-Error throw in validateSkill', async () => {
      vi.mocked(fs.readFile).mockRejectedValue('String read error');
      const result = await (validator as any).validateSkill(
        'skills/test/SKILL.md',
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('String read error');
    });

    it('should handle non-Error throw in validateMetadata', async () => {
      vi.mocked(fs.pathExists).mockRejectedValue('String path error');
      await expect((validator as any).validateMetadata('/app')).rejects.toThrow(
        'Metadata validation failed: String path error',
      );
    });
  });
});
