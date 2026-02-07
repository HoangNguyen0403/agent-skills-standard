import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { z } from 'zod';
import {
  Agent,
  DEFAULT_REGISTER,
  SKILL_DETECTION_REGISTRY,
} from '../constants';
import { CategoryConfig, SkillConfig } from '../models/config';
import { RegistryMetadata } from '../models/types';

const SkillConfigSchema = z.object({
  registry: z.string().url(),
  agents: z.array(z.nativeEnum(Agent)).optional(),
  skills: z.record(
    z.string(), // Category name
    z.object({
      ref: z.string().optional(),
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
    }),
  ),
  custom_overrides: z.array(z.string()).optional(),
  workflows: z.union([z.boolean(), z.array(z.string())]).optional(),
});

/**
 * Service for managing the `.skillsrc` configuration file.
 * Handles loading, saving, and initial construction of the configuration based on project metadata.
 */
export class ConfigService {
  /**
   * Loads and validates the skill configuration from the workspace.
   * @param cwd Current working directory
   * @returns The parsed SkillConfig or null if not found
   * @throws Error if the configuration format is invalid
   */
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

  /**
   * Saves the provided configuration to the `.skillsrc` file.
   * @param config The configuration to save
   * @param cwd Current working directory
   */
  async saveConfig(
    config: SkillConfig,
    cwd: string = process.cwd(),
  ): Promise<void> {
    const configPath = path.join(cwd, '.skillsrc');
    await fs.outputFile(configPath, yaml.dump(config));
  }

  /**
   * Constructs an initial configuration object based on project analysis.
   * @param framework The primary framework detected
   * @param agents List of enabled AI agents
   * @param registry Registry URL
   * @param metadata Registry metadata for versioning and prefixes
   * @param languages Detected programming languages
   * @param workflows List of workflow names to sync
   * @returns A fresh SkillConfig object
   */
  buildInitialConfig(
    framework: string,
    agents: Agent[],
    registry: string,
    metadata: Partial<RegistryMetadata>,
    languages: string[] = [],
    workflows: string[] = [],
  ): SkillConfig {
    const skills: Record<string, CategoryConfig> = {};

    // Add main framework
    skills[framework] = {
      ref: metadata.categories?.[framework]?.version
        ? `${metadata.categories[framework].tag_prefix || ''}${metadata.categories[framework].version}`
        : 'main',
    };

    // Specialized Logic: React Native projects should include React hooks/patterns by default
    if (framework === 'react-native' && metadata.categories?.['react']) {
      skills[framework].include = ['react/hooks', 'react/component-patterns'];
    }

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
      workflows: workflows.length > 0 ? workflows : true, // Array if specific, true if empty/default
    };
  }

  /**
   * Identifies sub-skills to exclude based on the absence of their required package dependencies.
   * @param config The current configuration
   * @param framework The framework to analyze
   * @param projectDeps Current set of project dependencies
   */
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
        detection.packages.some((pkg) => {
          const depLower = d.toLowerCase();
          const pkgLower = pkg.toLowerCase();
          // Use exact match for short package names to avoid false positives (e.g., 'get' matching 'widget')
          if (pkg.length <= 3) {
            return depLower === pkgLower;
          }
          return depLower.includes(pkgLower);
        }),
      );

      if (!hasDep) {
        exclusions.add(detection.id);
      }
    }

    if (exclusions.size > 0) {
      category.exclude = Array.from(exclusions);
    }
  }

  /**
   * Automatically re-enables skills that were previously excluded if their dependencies
   * are now present in the project.
   */
  reconcileDependencies(
    config: SkillConfig,
    framework: string,
    projectDeps: Set<string>,
  ): string[] {
    const category = config.skills[framework];
    if (!category || !category.exclude) return [];

    const reenabled: string[] = [];
    const detections = SKILL_DETECTION_REGISTRY[framework] || [];
    const currentExclusions = new Set(category.exclude);

    for (const detection of detections) {
      if (currentExclusions.has(detection.id)) {
        const hasDep = Array.from(projectDeps).some((d) =>
          detection.packages.some((pkg) => {
            const depLower = d.toLowerCase();
            const pkgLower = pkg.toLowerCase();
            if (pkg.length <= 3) {
              return depLower === pkgLower;
            }
            return depLower.includes(pkgLower);
          }),
        );

        if (hasDep) {
          currentExclusions.delete(detection.id);
          reenabled.push(detection.id);
        }
      }
    }

    if (reenabled.length > 0) {
      category.exclude = Array.from(currentExclusions);
      if (category.exclude.length === 0) {
        delete category.exclude;
      }
    }

    return reenabled;
  }

  /**
   * Retrieves the registry URL from configuration or returns the default.
   * @param cwd Current working directory
   */
  async getRegistryUrl(cwd: string = process.cwd()): Promise<string> {
    const config = await this.loadConfig(cwd).catch(() => null);
    return config?.registry || DEFAULT_REGISTER;
  }
}
