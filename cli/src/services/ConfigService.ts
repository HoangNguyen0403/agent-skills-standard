import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { z } from 'zod';
import {
  Agent,
  BACKEND_FRAMEWORKS,
  COMMON_SKILL_EXCLUDES,
  DEFAULT_REGISTER,
  Framework,
  FrameworkDefinition,
  FRONTEND_REACT_FRAMEWORKS,
  getFrameworkType,
  SKILL_DETECTION_REGISTRY,
  SUPPORTED_FRAMEWORKS,
} from '../constants';
import { CategoryConfig, SkillConfig } from '../models/config';
import { RegistryMetadata } from '../models/types';

const McpScopeSchema = z.enum(['project', 'user', 'snippets-only', 'disabled']);

const McpConfigSchema = z.object({
  enabled: z.boolean(),
  scope: McpScopeSchema,
  prompted: z.boolean(),
  version: z.string().optional(),
  snippets: z.boolean().optional(),
});

const SkillConfigSchema = z.object({
  registry: z.string().url(),
  agents: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((a) =>
          typeof a === 'string' && a.toLowerCase() === 'openai' ? 'codex' : a,
        );
      }
      return val;
    },
    z.array(z.nativeEnum(Agent)).optional(),
  ),
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
  mcp: McpConfigSchema.optional(),
});

const DEFAULT_SDLC_SUPPORT_CATEGORIES = ['quality-engineering'] as const;
const PRIMARY_CONFIG_FILE = '.skillsrc';
const LEGACY_YAML_CONFIG_FILE = '.skillsrc.yaml';

type ConfigMigrationResult = {
  config: Record<string, unknown>;
  migrated: boolean;
};

/**
 * Service for managing the `.skillsrc` configuration file.
 * Handles loading, saving, and initial construction of the configuration based on project metadata.
 */
export class ConfigService {
  private getPrimaryConfigPath(cwd: string): string {
    return path.join(cwd, PRIMARY_CONFIG_FILE);
  }

  private getLegacyYamlConfigPath(cwd: string): string {
    return path.join(cwd, LEGACY_YAML_CONFIG_FILE);
  }

  private async resolveConfigPath(cwd: string): Promise<string | null> {
    const primaryPath = this.getPrimaryConfigPath(cwd);
    if (await fs.pathExists(primaryPath)) {
      return primaryPath;
    }

    const legacyYamlPath = this.getLegacyYamlConfigPath(cwd);
    if (await fs.pathExists(legacyYamlPath)) {
      return legacyYamlPath;
    }

    return null;
  }

  private dumpConfig(config: Record<string, unknown>): string {
    return yaml.dump(config, {
      noRefs: true,
      lineWidth: -1,
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private stripAngleBrackets(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  }

  private parseLegacyList(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[]') return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (trimmed.startsWith('- ')) {
      return trimmed
        .replace(/^-\s+/, '')
        .split(/\s+-\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseLegacyBoolean(value: string): boolean | undefined {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
  }

  private migrateLegacyTextConfig(
    content: string,
  ): Record<string, unknown> | null {
    const lines = content.split(/\r?\n/);
    const registryLine = lines.find((line) =>
      line.trim().startsWith('registry:'),
    );
    const agentsIndex = lines.findIndex((line) => line.trim() === 'agents:');
    const skillsIndex = lines.findIndex((line) => line.trim() === 'skills:');

    if (!registryLine || agentsIndex === -1 || skillsIndex === -1) {
      return null;
    }

    const registryMatch = registryLine.match(/^\s*registry:\s*(.+)$/);
    if (!registryMatch) {
      return null;
    }

    const config: Record<string, unknown> = {
      registry: this.stripAngleBrackets(registryMatch[1]),
      agents: [],
      skills: {},
    };

    const agents: string[] = [];
    for (let index = agentsIndex + 1; index < skillsIndex; index += 1) {
      const match = lines[index].match(/^\s*-\s+(.+)$/);
      if (!match) continue;
      agents.push(match[1].trim());
    }
    config.agents = agents;

    const sectionNames = new Set(['custom_overrides', 'workflows', 'mcp']);
    let currentCategory: string | null = null;

    for (let index = skillsIndex + 1; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (!trimmed) continue;

      if (
        trimmed === 'workflows:' ||
        trimmed === 'mcp:' ||
        trimmed.startsWith('custom_overrides:')
      ) {
        break;
      }

      const categoryMatch = trimmed.match(/^([A-Za-z0-9-]+):$/);
      if (categoryMatch && !sectionNames.has(categoryMatch[1])) {
        currentCategory = categoryMatch[1];
        (config.skills as Record<string, CategoryConfig>)[currentCategory] = {};
        continue;
      }

      if (!currentCategory) continue;

      const refMatch = trimmed.match(/^ref:\s*(.+)$/);
      if (refMatch) {
        (config.skills as Record<string, CategoryConfig>)[currentCategory].ref =
          refMatch[1].trim();
        continue;
      }

      const excludeMatch = trimmed.match(/^exclude:\s*(.+)$/);
      if (excludeMatch) {
        (config.skills as Record<string, CategoryConfig>)[
          currentCategory
        ].exclude = this.parseLegacyList(excludeMatch[1]);
        continue;
      }

      const includeMatch = trimmed.match(/^include:\s*(.+)$/);
      if (includeMatch) {
        (config.skills as Record<string, CategoryConfig>)[
          currentCategory
        ].include = this.parseLegacyList(includeMatch[1]);
      }
    }

    const overridesLine = lines.find((line) =>
      line.trim().startsWith('custom_overrides:'),
    );
    if (overridesLine) {
      const match = overridesLine.match(/^\s*custom_overrides:\s*(.*)$/);
      config.custom_overrides = this.parseLegacyList(match?.[1] ?? '');
    }

    const workflowsIndex = lines.findIndex(
      (line) => line.trim() === 'workflows:',
    );
    if (workflowsIndex !== -1) {
      const workflows: string[] = [];
      for (let index = workflowsIndex + 1; index < lines.length; index += 1) {
        const trimmed = lines[index].trim();
        if (!trimmed) continue;
        if (trimmed === 'mcp:') break;
        const match = trimmed.match(/^-\s+(.+)$/);
        if (match) workflows.push(match[1].trim());
      }
      config.workflows = workflows;
    }

    const mcpIndex = lines.findIndex((line) => line.trim() === 'mcp:');
    if (mcpIndex !== -1) {
      const mcp: Record<string, unknown> = {};
      for (let index = mcpIndex + 1; index < lines.length; index += 1) {
        const trimmed = lines[index].trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
        if (!match) continue;

        const [, key, rawValue] = match;
        if (key === 'enabled' || key === 'prompted' || key === 'snippets') {
          mcp[key] = this.parseLegacyBoolean(rawValue);
        } else {
          mcp[key] = rawValue.trim();
        }
      }
      config.mcp = mcp;
    }

    return config;
  }

  private normalizeRawConfig(rawConfig: unknown): ConfigMigrationResult {
    if (!this.isRecord(rawConfig)) {
      return { config: {}, migrated: false };
    }

    const normalized: Record<string, unknown> = { ...rawConfig };
    let migrated = false;

    if (typeof normalized.registry === 'string') {
      const strippedRegistry = this.stripAngleBrackets(normalized.registry);
      if (strippedRegistry !== normalized.registry) {
        normalized.registry = strippedRegistry;
        migrated = true;
      }
    }

    if (Array.isArray(normalized.agents)) {
      const updatedAgents = normalized.agents.map((agent) => {
        if (typeof agent === 'string' && agent.toLowerCase() === 'openai') {
          migrated = true;
          return Agent.Codex;
        }
        return agent;
      });
      normalized.agents = updatedAgents;
    }

    if (this.isRecord(normalized.skills)) {
      const normalizedSkills: Record<string, CategoryConfig> = {};
      for (const [category, value] of Object.entries(normalized.skills)) {
        if (!this.isRecord(value)) {
          normalizedSkills[category] = {};
          migrated = true;
          continue;
        }

        const entry: CategoryConfig = {};
        if (typeof value.ref === 'string') entry.ref = value.ref;
        if (Array.isArray(value.include))
          entry.include = value.include.filter(
            (item): item is string => typeof item === 'string',
          );
        if (Array.isArray(value.exclude)) {
          entry.exclude = value.exclude.filter(
            (item): item is string => typeof item === 'string',
          );
        } else if (typeof value.exclude === 'string') {
          entry.exclude = this.parseLegacyList(value.exclude);
          migrated = true;
        }
        normalizedSkills[category] = entry;
      }
      normalized.skills = normalizedSkills;
    }

    return { config: normalized, migrated };
  }

  private getCategoryRef(
    category: string,
    metadata: Partial<RegistryMetadata>,
  ): string {
    const categoryMetadata = metadata.categories?.[category];
    if (!categoryMetadata?.version) return 'main';
    return `${categoryMetadata.tag_prefix || ''}${categoryMetadata.version}`;
  }

  /**
   * Loads and validates the skill configuration from the workspace.
   * @param cwd Current working directory
   * @returns The parsed SkillConfig or null if not found
   * @throws Error if the configuration format is invalid
   */
  async loadConfig(cwd: string = process.cwd()): Promise<SkillConfig | null> {
    const configPath = await this.resolveConfigPath(cwd);

    if (!configPath) {
      return null;
    }

    const primaryConfigPath = this.getPrimaryConfigPath(cwd);
    const shouldRenameLegacyYamlFile = configPath !== primaryConfigPath;

    try {
      const content = await fs.readFile(configPath, 'utf8');
      let rawConfig: unknown;
      let migratedFromText = false;

      try {
        rawConfig = yaml.load(content);
      } catch (parseError) {
        rawConfig = this.migrateLegacyTextConfig(content);
        migratedFromText = rawConfig !== null;

        if (!migratedFromText) {
          throw parseError;
        }
      }

      const { config: normalizedConfig, migrated } =
        this.normalizeRawConfig(rawConfig);

      // Validate with Zod
      const parsed = SkillConfigSchema.safeParse(normalizedConfig);

      if (!parsed.success) {
        throw new Error(`Invalid .skillsrc format: ${parsed.error.message}`);
      }

      if (migratedFromText || migrated || shouldRenameLegacyYamlFile) {
        await fs.outputFile(
          primaryConfigPath,
          this.dumpConfig(parsed.data as Record<string, unknown>),
        );
      }

      if (shouldRenameLegacyYamlFile) {
        await fs.remove(configPath);
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
    const primaryConfigPath = this.getPrimaryConfigPath(cwd);
    const legacyYamlPath = this.getLegacyYamlConfigPath(cwd);

    await fs.outputFile(
      primaryConfigPath,
      this.dumpConfig(config as Record<string, unknown>),
    );

    if (
      legacyYamlPath !== primaryConfigPath &&
      (await fs.pathExists(legacyYamlPath))
    ) {
      await fs.remove(legacyYamlPath);
    }
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

    // Add common category if available, with framework-appropriate exclusions
    if (metadata.categories?.['common']) {
      const frameworkType = getFrameworkType(framework);
      const commonExcludes = frameworkType
        ? COMMON_SKILL_EXCLUDES[frameworkType]
        : [];

      skills['common'] = {
        ref: `${metadata.categories['common'].tag_prefix || ''}${metadata.categories['common'].version}`,
        ...(commonExcludes.length > 0 && { exclude: commonExcludes }),
      };
    }

    for (const category of DEFAULT_SDLC_SUPPORT_CATEGORIES) {
      if (metadata.categories?.[category] && !skills[category]) {
        skills[category] = {
          ref: this.getCategoryRef(category, metadata),
        };
      }
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
      const hasMetaFramework = Object.keys(config.skills).some((f) =>
        [Framework.Flutter, Framework.ReactNative].includes(f as Framework),
      );

      let category = config.skills[categoryId];

      // Skip platform-specific categories if a meta-framework is already present
      // unless the category is already active (we still want to reconcile its sub-skills)
      if (
        hasMetaFramework &&
        [Framework.Android, Framework.iOS].includes(categoryId as Framework)
      ) {
        if (!category) continue;
      }

      const detections = SKILL_DETECTION_REGISTRY[categoryId] || [];
      if (detections.length === 0) continue;

      const isNewCategory = !category;
      if (isNewCategory) {
        // First check if this is a supported framework and we don't have its base dependencies
        const frameworkDef = SUPPORTED_FRAMEWORKS.find(
          (f: FrameworkDefinition) => f.id === categoryId,
        );
        if (frameworkDef) {
          const hasBaseDeps =
            frameworkDef.detectionDependencies &&
            frameworkDef.detectionDependencies.length > 0
              ? this.hasDependency(
                  frameworkDef.detectionDependencies,
                  depsArray,
                )
              : false;

          const hasBaseFiles =
            frameworkDef.detectionFiles &&
            frameworkDef.detectionFiles.length > 0
              ? frameworkDef.detectionFiles.some((file) =>
                  fs.existsSync(path.join(cwd, file)),
                )
              : false;

          if (!hasBaseDeps && !hasBaseFiles) {
            continue; // Skip enabling this category if its base framework isn't detected
          }
        }

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
