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
        'bloc-state-management',
        'unknown-skill',
      ]);

      const result = await skillService.getSkillsWithStatus(
        framework,
        registryUrl,
        projectDeps,
      );

      expect(result).toHaveLength(2);
      expect(
        result.find((s) => s.name === 'bloc-state-management')?.status,
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
        result.find((s) => s.name === 'riverpod-state-management')?.status,
      ).toBe('detected');
    });

    it('should handle correctly not-detected status', async () => {
      const framework = 'flutter';
      const projectDeps = new Set(['some-random-dep']);

      mockRegistryService.getFrameworkSkills.mockResolvedValue([
        'bloc-state-management',
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
});
