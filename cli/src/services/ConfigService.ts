import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { z } from 'zod';
import { SKILL_DETECTION_REGISTRY } from '../constants';
import { CategoryConfig, SkillConfig } from '../models/config';
import { RegistryMetadata } from '../models/types';

const SkillConfigSchema = z.object({
  registry: z.string().url(),
  agents: z.array(z.string()).optional(),
  skills: z.record(
    z.string(), // Category name
    z.object({
      ref: z.string().optional(),
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
    }),
  ),
  custom_overrides: z.array(z.string()).optional(),
});

export class ConfigService {
  async loadConfig(cwd: string = process.cwd()): Promise<SkillConfig | null> {
    const configPath = path.join(cwd, '.skillsrc');

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    try {
      const content = await fs.readFile(configPath, 'utf8');
      const rawConfig = yaml.load(content);

      // Validate with Zod
      const parsed = SkillConfigSchema.safeParse(rawConfig);

      if (!parsed.success) {
        throw new Error(`Invalid .skillsrc format: ${parsed.error.message}`);
      }

      return parsed.data as SkillConfig;
    } catch (error) {
      throw new Error(`Failed to load config: ${error}`);
    }
  }

  async saveConfig(
    config: SkillConfig,
    cwd: string = process.cwd(),
  ): Promise<void> {
    const configPath = path.join(cwd, '.skillsrc');
    await fs.writeFile(configPath, yaml.dump(config));
  }

  buildInitialConfig(
    framework: string,
    agents: string[],
    registry: string,
    metadata: Partial<RegistryMetadata>,
    languages: string[] = [],
  ): SkillConfig {
    const skills: Record<string, CategoryConfig> = {};

    // Add main framework
    skills[framework] = {
      ref: metadata.categories?.[framework]?.version
        ? `${metadata.categories[framework].tag_prefix || ''}${metadata.categories[framework].version}`
        : 'main',
    };

    // Add associated languages (e.g., typescript, javascript)
    for (const lang of languages) {
      if (metadata.categories?.[lang]) {
        skills[lang] = {
          ref: `${metadata.categories[lang].tag_prefix || ''}${metadata.categories[lang].version}`,
        };
      }
    }

    // Add common category if available
    if (metadata.categories?.['common']) {
      skills['common'] = {
        ref: `${metadata.categories['common'].tag_prefix || ''}${metadata.categories['common'].version}`,
      };
    }

    return {
      registry,
      agents,
      skills,
      custom_overrides: [],
    };
  }

  applyDependencyExclusions(
    config: SkillConfig,
    framework: string,
    projectDeps: Set<string>,
  ) {
    const category = config.skills[framework];
    if (!category) return;

    const exclusions = new Set<string>(category.exclude || []);

    // mapping of "sub-skill identifier" to "package keywords"
    // from the centralized SKILL_DETECTION_REGISTRY
    const detections = SKILL_DETECTION_REGISTRY[framework] || [];

    for (const detection of detections) {
      const hasDep = Array.from(projectDeps).some((d) =>
        detection.packages.some((pkg) =>
          d.toLowerCase().includes(pkg.toLowerCase()),
        ),
      );

      if (!hasDep) {
        exclusions.add(detection.id);
      }
    }

    if (exclusions.size > 0) {
      category.exclude = Array.from(exclusions);
    }
  }
}
