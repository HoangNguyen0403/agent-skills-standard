import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { z } from 'zod';
import {
  Agent,
  BACKEND_FRAMEWORKS,
  DEFAULT_REGISTER,
  FRONTEND_REACT_FRAMEWORKS,
  Framework,
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

    // Specialized Logic: Frontend React-based projects must inherently sync the React category natively.
    if (
      FRONTEND_REACT_FRAMEWORKS.includes(framework as Framework) &&
      metadata.categories?.['react']
    ) {
      skills['react'] = {
        ref: metadata.categories['react'].version
          ? `${metadata.categories['react'].tag_prefix || ''}${metadata.categories['react'].version}`
          : 'main',
      };
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

    // Add database category for backend frameworks
    if (
      BACKEND_FRAMEWORKS.includes(framework as Framework) &&
      metadata.categories?.['database']
    ) {
      skills['database'] = {
        ref: metadata.categories['database'].version
          ? `${metadata.categories['database'].tag_prefix || ''}${metadata.categories['database'].version}`
          : 'main',
      };
    }

    return {
      registry,
      agents,
      skills,
      custom_overrides: [],
      workflows: workflows.length > 0 ? workflows : false, // Array if specific, false if empty
    };
  }

  /**
   * Identifies sub-skills to exclude based on the absence of their required package dependencies.
   * Scans all categories defined in the config.
   * @param config The current configuration
   * @param projectDeps Current set of project dependencies
   */
  applyDependencyExclusions(
    config: SkillConfig,
    projectDeps: Set<string>,
    cwd: string = process.cwd(),
  ) {
    const depsArray = Array.from(projectDeps);

    for (const categoryId in config.skills) {
      const category = config.skills[categoryId];
      const detections = SKILL_DETECTION_REGISTRY[categoryId] || [];
      if (detections.length === 0) continue;

      const exclusions = new Set<string>(category.exclude || []);

      for (const detection of detections) {
        const hasDeps = this.hasDependency(detection.packages, depsArray);
        const hasDirs = this.hasFiles(detection.files, cwd);
        if (!hasDeps || !hasDirs) {
          exclusions.add(detection.id);
        }
      }

      if (exclusions.size > 0) {
        category.exclude = Array.from(exclusions);
      }
    }
  }

  /**
   * Automatically re-enables skills that were previously excluded if their dependencies
   * are now present in the project. Scans all categories.
   */
  reconcileDependencies(
    config: SkillConfig,
    projectDeps: Set<string>,
    cwd: string = process.cwd(),
  ): string[] {
    const totalReenabled: string[] = [];
    const allKnownCategories = Object.keys(SKILL_DETECTION_REGISTRY);
    const depsArray = Array.from(projectDeps);

    for (const categoryId of allKnownCategories) {
      let category = config.skills[categoryId];
      const detections = SKILL_DETECTION_REGISTRY[categoryId] || [];
      if (detections.length === 0) continue;

      const isNewCategory = !category;
      if (isNewCategory) {
        const shouldEnableCategory = detections.some(
          (detection) =>
            this.hasDependency(detection.packages, depsArray) &&
            this.hasFiles(detection.files, cwd),
        );

        if (shouldEnableCategory) {
          config.skills[categoryId] = { ref: 'main' };
          category = config.skills[categoryId];

          const exclusions = detections
            .filter(
              (d) =>
                !this.hasDependency(d.packages, depsArray) ||
                !this.hasFiles(d.files, cwd),
            )
            .map((d) => d.id);

          if (exclusions.length > 0) {
            category.exclude = exclusions;
          }
          totalReenabled.push(categoryId);
        }
        continue;
      }

      // Existing category reconciliation
      if (!category.exclude) continue;

      const currentExclusions = new Set(category.exclude);
      const reenabled: string[] = [];

      for (const detection of detections) {
        if (
          currentExclusions.has(detection.id) &&
          this.hasDependency(detection.packages, depsArray) &&
          this.hasFiles(detection.files, cwd)
        ) {
          currentExclusions.delete(detection.id);
          reenabled.push(`${categoryId}/${detection.id}`);
        }
      }

      if (reenabled.length > 0) {
        category.exclude =
          currentExclusions.size > 0
            ? Array.from(currentExclusions)
            : undefined;
        totalReenabled.push(...reenabled);
      }
    }

    return totalReenabled;
  }

  /**
   * Checks if ANY of the required files exist in the project directory.
   */
  private hasFiles(files: string[] | undefined, cwd: string): boolean {
    if (!files || files.length === 0) return true; // If no files required, assume condition met
    for (const file of files) {
      if (fs.existsSync(path.join(cwd, file))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if ANY of the required dependencies are found in the project.
   */
  private hasDependency(packages: string[], projectDeps: string[]): boolean {
    if (packages.length === 0) return true; // If no packages are required, condition met
    return projectDeps.some((d) =>
      packages.some((pkg) => {
        const depLower = d.toLowerCase();
        const pkgLower = pkg.toLowerCase();

        // Exact match
        if (depLower === pkgLower) return true;

        // Skip fuzzy matching for short names to avoid noise
        if (pkg.length <= 3) return false;

        // Handle scoped packages: @scope/package matches package
        if (depLower.includes('/') && depLower.split('/').pop() === pkgLower)
          return true;

        // Handle framework-prefixed packages (e.g. @nestjs/core, flask-cors)
        // Only match if the package is a standalone word in the dependency name
        const parts = depLower.split(/[-/_]/);
        return parts.includes(pkgLower);
      }),
    );
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
