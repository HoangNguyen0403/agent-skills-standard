import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Agent,
  SKILL_DETECTION_REGISTRY,
  SkillDetection,
} from '../../constants';
import { CategoryConfig, SkillConfig } from '../../models/config';
import { RegistryMetadata } from '../../models/types';
import { ConfigService } from '../ConfigService';

vi.mock('fs-extra');
vi.mock('js-yaml');

describe('ConfigService', () => {
  let configService: ConfigService;
  const mockCwd = '/mock/cwd';

  beforeEach(() => {
    vi.clearAllMocks();
    configService = new ConfigService();
  });

  describe('loadConfig', () => {
    it('should return null if .skillsrc does not exist', async () => {
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(false));
      const config = await configService.loadConfig(mockCwd);
      expect(config).toBeNull();
      expect(fs.pathExists).toHaveBeenCalledWith(
        path.join(mockCwd, '.skillsrc'),
      );
    });

    it('should return parsed config if .skillsrc exists and is valid', async () => {
      const mockYamlText = 'registry: https://example.com\nskills: {}';
      const mockConfig: SkillConfig = {
        registry: 'https://example.com',
        skills: {},
        agents: [Agent.Cursor],
        custom_overrides: [],
      };

      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(mockYamlText as unknown as Buffer),
      );
      vi.mocked(yaml.load).mockReturnValue(mockConfig);

      const config = await configService.loadConfig(mockCwd);
      expect(config).toEqual(mockConfig);
    });

    it('should throw error if .skillsrc format is invalid', async () => {
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve('invalid yaml' as unknown as Buffer),
      );
      vi.mocked(yaml.load).mockReturnValue({ some: 'garbage' });

      await expect(configService.loadConfig(mockCwd)).rejects.toThrow(
        'Invalid .skillsrc format',
      );
    });

    it('should throw error if file reading fails', async () => {
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read failed'));

      await expect(configService.loadConfig(mockCwd)).rejects.toThrow(
        'Failed to load config',
      );
    });
  });

  describe('saveConfig', () => {
    it('should save config as YAML', async () => {
      const mockConfig: SkillConfig = {
        registry: 'https://example.com',
        skills: {},
        agents: [Agent.Cursor],
        custom_overrides: [],
      };
      vi.mocked(yaml.dump).mockReturnValue('mock yaml');

      await configService.saveConfig(mockConfig, mockCwd);

      expect(yaml.dump).toHaveBeenCalledWith(mockConfig);
      expect(fs.outputFile).toHaveBeenCalledWith(
        path.join(mockCwd, '.skillsrc'),
        'mock yaml',
      );
    });
  });

  describe('buildInitialConfig', () => {
    it('should build initial config correctly', () => {
      const metadata: RegistryMetadata = {
        global: { author: 'test', repository: 'test' },
        categories: {
          flutter: { version: '1.0.0', tag_prefix: 'v' },
          common: { version: '1.2.0', tag_prefix: '' },
        },
      };

      const config = configService.buildInitialConfig(
        'flutter',
        [Agent.Cursor],
        'https://registry.com',
        metadata,
      );

      expect(config.registry).toBe('https://registry.com');
      expect(config.agents).toEqual([Agent.Cursor]);
      expect(config.skills.flutter?.ref).toBe('v1.0.0');
      expect(config.skills.common?.ref).toBe('1.2.0');
    });

    it('should handle missing metadata/tags in buildInitialConfig', () => {
      const metadata: RegistryMetadata = {
        global: { author: 'test', repository: 'test' },
        categories: {
          flutter: { version: '1.0.0' }, // missing tag_prefix
        },
      };

      const config = configService.buildInitialConfig(
        'flutter',
        [Agent.Cursor],
        'https://registry.com',
        metadata,
      );

      expect(config.skills.flutter?.ref).toBe('1.0.0');
      expect(config.skills.common).toBeUndefined();
    });

    it('should handle missing tag_prefix for languages in buildInitialConfig', () => {
      const metadata: RegistryMetadata = {
        global: { author: 'test', repository: 'test' },
        categories: {
          typescript: { version: '1.1.0' }, // missing tag_prefix
        },
      };

      const config = configService.buildInitialConfig(
        'flutter',
        [Agent.Cursor],
        'https://registry.com',
        metadata,
        ['typescript'],
      );

      // Branch check for line 76: fallback to '' (empty string) prefix
      expect(config.skills.typescript?.ref).toBe('1.1.0');
    });

    it('should add associated languages to initial config', () => {
      const metadata: RegistryMetadata = {
        global: { author: 'test', repository: 'test' },
        categories: {
          flutter: { version: '1.0.0', tag_prefix: 'v' },
          typescript: { version: '1.1.0', tag_prefix: 'v' },
        },
      };

      const config = configService.buildInitialConfig(
        'flutter',
        [Agent.Cursor],
        'https://registry.com',
        metadata,
        ['typescript', 'nonexistent'],
      );

      expect(config.skills.typescript?.ref).toBe('v1.1.0');
      // Should NOT add nonexistent
      expect(config.skills.nonexistent).toBeUndefined();
    });

    it('should handle missing categories or framework in registry metadata', () => {
      // Missing categories entirely
      const config1 = configService.buildInitialConfig('f', [], 'url', {}, []);
      expect(Object.keys(config1.skills)).toHaveLength(1);
      expect(config1.skills.f.ref).toBe('main');

      // Category missing for primary framework
      const config2 = configService.buildInitialConfig(
        'f',
        [],
        'url',
        { categories: {} },
        [],
      );
      expect(Object.keys(config2.skills)).toHaveLength(1);
      expect(config2.skills.f.ref).toBe('main');
    });

    it('should fallback to empty registry in buildInitialConfig if not provided (branch coverage)', () => {
      // Branch check for line 108 if framework detections are missing
      const config = configService.buildInitialConfig(
        'unknown',
        [],
        'url',
        {},
        [],
      );
      expect(config.skills.unknown.ref).toBe('main');
    });

    it('should explicitly map the react category by default for frontend react frameworks', () => {
      const metadata: RegistryMetadata = {
        global: { author: 'test', repository: 'test' },
        categories: {
          'react-native': { version: '1.0.0', tag_prefix: 'v' },
          react: { version: '1.0.0', tag_prefix: 'v' },
        },
      };

      const config = configService.buildInitialConfig(
        'react-native',
        [Agent.Cursor],
        'https://registry.com',
        metadata,
      );

      expect(config.skills['react']?.ref).toEqual('v1.0.0');
    });

    it('should auto-include database category for backend frameworks', () => {
      const metadata: RegistryMetadata = {
        global: { author: 'test', repository: 'test' },
        categories: {
          nestjs: { version: '1.0.0', tag_prefix: 'v' },
          database: { version: '1.0.0', tag_prefix: 'v' },
        },
      };

      const config = configService.buildInitialConfig(
        'nestjs',
        [Agent.Cursor],
        'https://registry.com',
        metadata,
      );

      expect(config.skills.database).toBeDefined();
      expect(config.skills.database?.ref).toBe('v1.0.0');
    });

    it('should include workflows in initial config if provided', () => {
      const config = configService.buildInitialConfig(
        'flutter',
        [],
        'url',
        {},
        [],
        ['workflow-1'],
      );
      expect(config.workflows).toEqual(['workflow-1']);
    });
  });

  describe('applyDependencyExclusions', () => {
    it('should add exclusions for missing dependencies', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {
          flutter: { ref: 'v1.0.0' },
        },
        custom_overrides: [],
      };
      const projectDeps = new Set(['flutter_bloc']);

      configService.applyDependencyExclusions(config, projectDeps);

      const category = config.skills.flutter as CategoryConfig;
      expect(category.exclude).toBeDefined();
      expect(category.exclude).toContain('riverpod-state-management');
      expect(category.exclude).not.toContain('bloc-state-management');
    });

    it('should handle multiple categories in applyDependencyExclusions', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {
          nestjs: { ref: 'v1.0.0' },
          database: { ref: 'v1.0.0' },
        },
        custom_overrides: [],
      };

      // nestjs networking requires @nestjs/passport
      // database postgresql requires pg or postgres
      const projectDeps = new Set(['@nestjs/passport']);

      configService.applyDependencyExclusions(config, projectDeps);

      expect(config.skills.nestjs?.exclude).not.toContain('networking');
      expect(config.skills.database?.exclude).toContain('postgresql');
    });

    it('should do nothing if category does not exist', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {},
        custom_overrides: [],
      };
      configService.applyDependencyExclusions(config, new Set());
      expect(config.skills).toEqual({});
    });

    it('should handle category with existing empty exclusions (branch coverage)', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {
          flutter: { ref: 'v1.0.0', exclude: [] },
        },
        custom_overrides: [],
      };
      // Should add exclusions to the empty list
      configService.applyDependencyExclusions(config, new Set());
      const category = config.skills.flutter as CategoryConfig;
      expect(category.exclude?.length).toBeGreaterThan(0);
    });
  });

  describe('SKILL_DETECTION_REGISTRY Guard Tests', () => {
    Object.entries(SKILL_DETECTION_REGISTRY).forEach(
      ([framework, detections]: [string, SkillDetection[]]) => {
        describe(`Framework: ${framework}`, () => {
          detections.forEach((detection: SkillDetection) => {
            it(`should exclude ${detection.id} when dependencies ${JSON.stringify(detection.packages)} are missing`, () => {
              const config: SkillConfig = {
                registry: 'https://example.com',
                agents: [Agent.Cursor],
                skills: {
                  [framework]: { ref: 'v1.0.0' },
                },
                custom_overrides: [],
              };
              const projectDeps = new Set(['some-other-dep']);

              configService.applyDependencyExclusions(config, projectDeps);

              const category = config.skills[framework] as CategoryConfig;
              expect(category.exclude).toContain(detection.id);
            });

            it(`should NOT exclude ${detection.id} when dependencies/files are present`, () => {
              const config: SkillConfig = {
                registry: 'https://example.com',
                agents: [Agent.Cursor],
                skills: {
                  [framework]: { ref: 'v1.0.0' },
                },
                custom_overrides: [],
              };
              // Simulate presence of the first package in the detection list if it exists
              const projectDeps = new Set(
                detection.packages.length > 0 ? [detection.packages[0]] : [],
              );

              // Mock fs.existsSync to simulate filesystem matches for file-based exclusions
              vi.mocked(fs.existsSync).mockReturnValue(true);

              configService.applyDependencyExclusions(config, projectDeps);

              const category = config.skills[framework] as CategoryConfig;
              expect(category.exclude || []).not.toContain(detection.id);

              // Cleanup the mock so it doesn't leak into other tests
              vi.mocked(fs.existsSync).mockReset();
            });
          });
        });
      },
    );
  });

  describe('reconcileDependencies', () => {
    it('should re-enable skills if dependencies are found', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {
          android: {
            ref: 'v1.0.0',
            exclude: ['networking', 'persistence'],
          },
        },
        custom_overrides: [],
      };

      // networking is detected by 'retrofit'
      // persistence is detected by 'androidx.room:room-runtime'
      const projectDeps = new Set(['retrofit', 'some-other-dep']);

      // Mock fs.existsSync to satisfy mobile folder requirements
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const reenabled = configService.reconcileDependencies(
        config,
        projectDeps,
      );

      expect(reenabled).toContain('android/networking');
      const category = config.skills.android as CategoryConfig;
      expect(category.exclude).toEqual(['persistence']);

      vi.mocked(fs.existsSync).mockReset();
    });

    it('should remove exclude key if all skills are re-enabled', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {
          android: {
            ref: 'v1.0.0',
            exclude: ['networking'],
          },
        },
        custom_overrides: [],
      };

      const projectDeps = new Set(['retrofit']);

      // Mock fs.existsSync to satisfy mobile folder requirements
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const reenabled = configService.reconcileDependencies(
        config,
        projectDeps,
      );

      expect(reenabled).toContain('android/networking');
      const category = config.skills.android as CategoryConfig;
      expect(category.exclude).toBeUndefined();

      vi.mocked(fs.existsSync).mockReset();
    });

    it('should automatically add "database" category if dependencies are found', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {
          nestjs: { ref: 'v1.0.0' },
        },
      };

      // redis is a dependency for database/redis
      const projectDeps = new Set(['redis']);

      const reenabled = configService.reconcileDependencies(
        config,
        projectDeps,
      );

      expect(reenabled).toContain('database');
      expect(config.skills.database).toBeDefined();
      expect(config.skills.database?.ref).toBe('main');
      // Sub-skills not found should be excluded
      expect(config.skills.database?.exclude).toContain('postgresql');
      expect(config.skills.database?.exclude).toContain('mongodb');
      expect(config.skills.database?.exclude).not.toContain('redis');
    });

    it('should re-enable new category without exclusions if all dependencies strictly met', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {},
      };

      const originalRegistry = { ...SKILL_DETECTION_REGISTRY };
      (SKILL_DETECTION_REGISTRY as any)['test-new'] = [
        { id: 'sub-skill', packages: ['needed-dep'] },
      ];

      const projectDeps = new Set(['needed-dep']);

      const reenabled = configService.reconcileDependencies(
        config,
        projectDeps,
      );

      expect(reenabled).toContain('test-new');
      expect(config.skills['test-new']).toBeDefined();
      expect(config.skills['test-new'].exclude).toBeUndefined();

      delete (SKILL_DETECTION_REGISTRY as any)['test-new'];
    });

    it('should return empty if no skills are re-enabled', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {
          android: {
            ref: 'v1.0.0',
            exclude: ['persistence'],
          },
        },
        custom_overrides: [],
      };

      const projectDeps = new Set(['some-other-dep']);

      const reenabled = configService.reconcileDependencies(
        config,
        projectDeps,
      );

      expect(reenabled).toEqual([]);
      const category = config.skills.android as CategoryConfig;
      expect(category.exclude).toEqual(['persistence']);
    });

    it('should return empty if category or exclude list is missing', () => {
      const config: SkillConfig = {
        registry: 'https://example.com',
        agents: [Agent.Cursor],
        skills: {},
      };
      expect(configService.reconcileDependencies(config, new Set())).toEqual(
        [],
      );
    });

    it('should handle unknown framework in reconcileDependencies (line 140 coverage)', () => {
      const config: SkillConfig = {
        registry: 'url',
        agents: [],
        skills: {
          unknown: { ref: 'main', exclude: ['something'] },
        },
      };
      const reenabled = configService.reconcileDependencies(config, new Set());
      expect(reenabled).toEqual([]);
    });

    it('should handle short package names (length <= 3) for exact match', () => {
      const config: SkillConfig = {
        registry: 'url',
        agents: [],
        skills: {
          android: {
            ref: 'v1.0.0',
            exclude: ['networking'],
          },
        },
      };
      // Mock a detection with a short package name
      // 'retrofit' is long, but let's assume 'net' for networking
      // Wait, let's use a real one if possible, or just mock the registry
      // Actually, I can just use a fictional framework or mock the registry constant
      // But it's easier to just pass a dep that matches a short pkg if it exists.
      // In android networking uses 'retrofit' (long).
      // Let's check common.

      // I'll just use a test-specific mock of the registry
      const originalRegistry = { ...SKILL_DETECTION_REGISTRY };
      (SKILL_DETECTION_REGISTRY as any)['test-short'] = [
        { id: 'short-skill', packages: ['io'] },
      ];

      const testConfig: SkillConfig = {
        registry: 'url',
        agents: [],
        skills: {
          'test-short': { ref: 'main', exclude: ['short-skill'] },
        },
      };

      const reenabled = configService.reconcileDependencies(
        testConfig,
        new Set(['io']),
      );

      expect(reenabled).toEqual(['test-short/short-skill']);

      // Cleanup
      delete (SKILL_DETECTION_REGISTRY as any)['test-short'];
    });
  });

  describe('applyDependencyExclusions extra coverage', () => {
    it('should handle unknown framework (line 108 coverage)', () => {
      const config: SkillConfig = {
        registry: 'url',
        agents: [],
        skills: { unknown: { ref: 'main' } },
      };
      configService.applyDependencyExclusions(config, new Set());
      expect(config.skills.unknown.exclude).toBeUndefined();
    });

    it('should not add exclude key if exclusions are empty (line 122 coverage)', () => {
      const config: SkillConfig = {
        registry: 'url',
        agents: [],
        skills: { nestjs: { ref: 'main' } },
      };
      // Satisfy all nestjs detections to have zero exclusions
      const deps = new Set([
        '@nestjs/core',
        '@nestjs/cache-manager',
        '@nestjs/typeorm',
        '@nestjs/passport',
      ]);
      configService.applyDependencyExclusions(config, deps);
      expect(config.skills.nestjs.exclude).toBeUndefined();
    });
  });

  describe('getRegistryUrl', () => {
    it('should return default registry if .skillsrc missing', async () => {
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(false));
      const url = await configService.getRegistryUrl('/tmp');
      expect(url).toContain('github.com');
    });

    it('should return registry from config if exists', async () => {
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve('registry: https://custom.com\nskills: {}' as any),
      );
      vi.mocked(yaml.load).mockReturnValue({
        registry: 'https://custom.com',
        skills: {},
      });

      const url = await configService.getRegistryUrl('/tmp');
      expect(url).toBe('https://custom.com');
    });
  });
});
