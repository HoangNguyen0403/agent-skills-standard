import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SKILL_DETECTION_REGISTRY } from '../../constants';
import { SkillService } from '../SkillService';

vi.mock('../RegistryService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.getFrameworkSkills = vi.fn();
  });
  return { RegistryService: Mock };
});

describe('SkillService', () => {
  let skillService: SkillService;
  let mockRegistryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    skillService = new SkillService();
    mockRegistryService = (skillService as any).registryService;
  });

  describe('getSkillsWithStatus', () => {
    it('should return skills with status from remote registry', async () => {
      const framework = 'flutter';
      const registryUrl = 'https://github.com/owner/repo';
      const projectDeps = new Set(['flutter_bloc']);

      mockRegistryService.getFrameworkSkills.mockResolvedValue([
        'flutter-bloc-state-management',
        'unknown-skill',
      ]);

      const result = await skillService.getSkillsWithStatus(
        framework,
        registryUrl,
        projectDeps,
      );

      expect(result).toHaveLength(2);
      expect(
        result.find((s) => s.name === 'flutter-bloc-state-management')?.status,
      ).toBe('detected');
      expect(result.find((s) => s.name === 'unknown-skill')?.status).toBe(
        'no-rule',
      );
    });

    it('should fallback to detection registry if remote returns nothing', async () => {
      const framework = 'flutter';
      const registryUrl = 'https://github.com/owner/repo';
      const projectDeps = new Set(['riverpod']);

      mockRegistryService.getFrameworkSkills.mockResolvedValue([]);

      const result = await skillService.getSkillsWithStatus(
        framework,
        registryUrl,
        projectDeps,
      );

      const expectedSkills = SKILL_DETECTION_REGISTRY[framework].map(
        (s) => s.id,
      );
      expect(result.map((s) => s.name)).toEqual(
        expect.arrayContaining(expectedSkills),
      );
      expect(
        result.find((s) => s.name === 'flutter-riverpod-state-management')
          ?.status,
      ).toBe('detected');
    });

    it('should handle correctly not-detected status', async () => {
      const framework = 'flutter';
      const projectDeps = new Set(['some-random-dep']);

      mockRegistryService.getFrameworkSkills.mockResolvedValue([
        'flutter-bloc-state-management',
      ]);

      const result = await skillService.getSkillsWithStatus(
        framework,
        'url',
        projectDeps,
      );

      expect(result[0].status).toBe('not-detected');
    });

    it('should handle unknown framework in getSkillsWithStatus (line 23 coverage)', async () => {
      const result = await skillService.getSkillsWithStatus(
        'non-existent-framework',
        'url',
        new Set(),
      );
      expect(result).toEqual([]);
    });
  });

  describe('hasDependency (private branch coverage)', () => {
    it('should return true if packages list is empty', () => {
      const result = (skillService as any).hasDependency([], ['any-dep']);
      expect(result).toBe(true);
    });

    it('should match dependency with short name (less than 3 chars) only for exact match', () => {
      // Line 81: if (pkg.length <= 3) return false; (when not exact match)
      const result = (skillService as any).hasDependency(['abc'], ['abcd']);
      expect(result).toBe(false);

      const exactResult = (skillService as any).hasDependency(['abc'], ['abc']);
      expect(exactResult).toBe(true);
    });

    it('should match scoped package name with exact match after split', () => {
      // Line 83: if (depLower.includes('/') && depLower.split('/').pop() === pkgLower) return true;
      const result = (skillService as any).hasDependency(
        ['core'],
        ['@nestjs/core'],
      );
      expect(result).toBe(true);
    });

    it('should match package name as part of hyphenated or underscored dependency', () => {
      const result = (skillService as any).hasDependency(
        ['bloc'],
        ['flutter-bloc'],
      );
      expect(result).toBe(true);

      const result2 = (skillService as any).hasDependency(
        ['core'],
        ['app_core_lib'],
      );
      expect(result2).toBe(true);
    });
  });
});
