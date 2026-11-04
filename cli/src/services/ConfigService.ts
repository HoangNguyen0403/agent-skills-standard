import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import * as yaml from 'js-yaml';
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
import { defaultCategorySelection } from './CategoryDefaults';

const McpScopeSchema = z.enum(['project', 'user', 'snippets-only', 'disabled']);

const McpConfigSchema = z.object({
  enabled: z.boolean(),
  scope: McpScopeSchema,
  prompted: z.boolean(),
  version: z.string().optional(),
  via: z.enum(['auto', 'npx', 'global']).optional(),
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
  skills_mode: z.enum(['auto', 'explicit']).optional(),
  custom_overrides: z.array(z.string()).optional(),
  workflows: z.union([z.boolean(), z.array(z.string())]).optional(),
  prune: z.boolean().optional(),
  workflows_ref: z.string().optional(),
  specialists_ref: z.string().optional(),
  mcp: McpConfigSchema.optional(),
  telemetry: z.boolean().optional(),
});

/**
 * Known top-level runtime fields a reviewed publication may replace. Unlisted
 * (unknown/extension) root fields are always preserved verbatim.
 */
const REVIEWED_ROOT_FIELDS = [
  'registry',
  'agents',
  'custom_overrides',
  'workflows',
  'prune',
  'workflows_ref',
  'specialists_ref',
  'telemetry',
  'skills_mode',
] as const;

/** Known MCP fields; unknown MCP extension keys survive an MCP consent update. */
const MCP_FIELD_KEYS = [
  'enabled',
  'scope',
  'prompted',
  'version',
  'via',
  'snippets',
] as const;

const DEFAULT_SDLC_SUPPORT_CATEGORIES = ['quality-engineering'] as const;
const PRIMARY_CONFIG_FILE = '.skillsrc';
const LEGACY_YAML_CONFIG_FILE = '.skillsrc.yaml';

type ConfigMigrationResult = {
  config: Record<string, unknown>;
  migrated: boolean;
};

type ConfigSource = {
  config: SkillConfig;
  /**
   * Validated normalized document used for publication. It keeps schema-external
   * root and category fields so a migration write never strips user data.
   */
  document: Record<string, unknown>;
  raw: Record<string, unknown>;
  sourcePath: string;
  fingerprint: string;
  migrated: boolean;
  migratedFromText: boolean;
  shouldRenameLegacyYamlFile: boolean;
};

const CONFIG_CONFLICT_MESSAGE =
  'Configuration changed on disk since it was opened; reload before applying.';

/**
 * Keys that belong inside a category entry, with repair guidance. They can
 * never be category names, so a config that places one in category position is
 * reported instead of being coerced into an empty category and fetched from
 * the registry.
 */
type ReservedSelectionKey = 'ref' | 'include' | 'exclude';

const RESERVED_SELECTION_KEYS: Record<ReservedSelectionKey, string> = {
  ref: 'set `ref` on the category itself, e.g. `skills.<category>.ref`',
  include:
    'move the allowlist under the category it applies to, e.g. `skills.<category>.include`',
  exclude:
    'move the exclusion list under the category it applies to, e.g. `skills.<category>.exclude`; a global `skills.exclude` is not supported',
};

function isReservedSelectionKey(key: string): key is ReservedSelectionKey {
  return Object.prototype.hasOwnProperty.call(RESERVED_SELECTION_KEYS, key);
}

function isLegacySectionKey(trimmed: string): string | null {
  if (trimmed === 'workflows:') return 'workflows';
  if (trimmed === 'mcp:') return 'mcp';
  if (trimmed.startsWith('custom_overrides:')) return 'custom_overrides';
  return null;
}

/**
 * Invalid configuration that names both the file and the logical key needing
 * repair. Callers surface the message verbatim rather than guessing a
 * migration or rewriting the user's document.
 */
export class ConfigValidationError extends Error {
  constructor(
    readonly configPath: string,
    readonly logicalPath: string,
    detail: string,
  ) {
    super(`Invalid configuration at ${configPath}: "${logicalPath}" ${detail}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Read-only view of the configuration used by the interactive manager. It
 * carries the validated model plus the raw document so a later save can merge
 * changes without discarding unrelated or extension fields.
 */
export interface ConfigSnapshot {
  config: SkillConfig;
  raw: Record<string, unknown>;
  sourcePath: string;
  fingerprint: string;
}

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

  /**
   * Parses one inline legacy value with the document YAML parser so quoted
   * scalars and flow collections keep their YAML meaning. Shapes the
   * line-oriented fallback cannot represent unambiguously are refused instead
   * of being published as raw token strings.
   */
  private parseLegacyYamlValue(
    raw: string,
    configPath: string,
    logicalPath: string,
  ): unknown {
    let parsed: unknown;
    try {
      parsed = yaml.load(raw);
    } catch (error) {
      throw new ConfigValidationError(
        configPath,
        logicalPath,
        `has an inline value ("${raw}") that is not valid YAML: ${(error as Error).message}`,
      );
    }

    const isFlowCollection = raw.startsWith('{') || raw.startsWith('[');
    if (isFlowCollection) {
      if (!this.isRecord(parsed) && !Array.isArray(parsed)) {
        throw new ConfigValidationError(
          configPath,
          logicalPath,
          `has an inline value ("${raw}") that does not parse as a YAML collection.`,
        );
      }
      return parsed;
    }

    if (typeof parsed === 'object' && parsed !== null) {
      throw new ConfigValidationError(
        configPath,
        logicalPath,
        `has an inline value ("${raw}") that parses as a YAML collection without flow braces; quote it or use {..}/[..].`,
      );
    }
    return parsed;
  }

  private parseLegacyBoolean(value: string): boolean | undefined {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
  }

  private migrateLegacyTextConfig(
    content: string,
    configPath: string,
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

    const skills: Record<string, CategoryConfig & Record<string, unknown>> = {};
    config.skills = skills;

    let currentCategory: string | null = null;
    let currentCategoryIndent = 0;
    let pendingList: { key: string; indent: number } | null = null;

    for (let index = skillsIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.length - line.trimStart().length;
      const sectionKey = isLegacySectionKey(trimmed);

      if (sectionKey) {
        // A section nested deeper than the category it appears under is
        // ambiguous: it is neither the documented flattened root section nor a
        // known extension, so refuse before writing anything.
        if (currentCategory && indent > currentCategoryIndent) {
          throw new ConfigValidationError(
            configPath,
            `skills.${currentCategory}.${sectionKey}`,
            'is indented as a category property but names a root section; cannot infer which it is.',
          );
        }
        break;
      }

      if (trimmed.startsWith('- ')) {
        const item = trimmed.slice(2).trim();
        if (!pendingList || !currentCategory) continue;
        if (indent < pendingList.indent) {
          throw new ConfigValidationError(
            configPath,
            `skills.${currentCategory}.${pendingList.key}`,
            `has a list item ("${item}") indented less than the key that opened it; cannot infer membership.`,
          );
        }
        if (item) {
          const entry = skills[currentCategory];
          const value = this.parseLegacyYamlValue(
            item,
            configPath,
            `skills.${currentCategory}.${pendingList.key}`,
          );
          if (
            isReservedSelectionKey(pendingList.key) &&
            typeof value !== 'string'
          ) {
            throw new ConfigValidationError(
              configPath,
              `skills.${currentCategory}.${pendingList.key}`,
              `has a non-string list item ("${item}"); selection ids must be strings.`,
            );
          }
          const current = entry[pendingList.key];
          entry[pendingList.key] = Array.isArray(current)
            ? [...current, value]
            : [value];
        }
        continue;
      }

      const keyMatch = trimmed.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
      if (!keyMatch) continue;
      const key = keyMatch[1];
      const inlineValue = (keyMatch[2] ?? '').trim();
      const isNestedProperty =
        currentCategory !== null && indent > currentCategoryIndent;

      if (pendingList && indent > pendingList.indent) {
        throw new ConfigValidationError(
          configPath,
          `skills.${currentCategory}.${pendingList.key}`,
          'opened a block list, but a nested key appears instead; cannot infer membership.',
        );
      }

      if (isReservedSelectionKey(key)) {
        // A selection key above the category level cannot be attributed to a
        // category; guessing would silently move a global exclusion.
        if (!currentCategory || indent < currentCategoryIndent) {
          throw new ConfigValidationError(
            configPath,
            key,
            `cannot infer which category this ${key} applies to. Correction: ${RESERVED_SELECTION_KEYS[key]}.`,
          );
        }

        pendingList = null;
        const entry = skills[currentCategory];
        if (key === 'ref') {
          if (!inlineValue) {
            throw new ConfigValidationError(
              configPath,
              `skills.${currentCategory}.ref`,
              'must name a git ref.',
            );
          }
          entry.ref = inlineValue;
          continue;
        }

        entry[key] = inlineValue ? this.parseLegacyList(inlineValue) : [];
        if (!inlineValue) pendingList = { key, indent };
        continue;
      }

      if (isNestedProperty && currentCategory) {
        // Deeper keys are category-scoped extensions, never categories. Their
        // values keep their YAML meaning so a later save cannot change or drop
        // them.
        pendingList = null;
        const entry = skills[currentCategory];
        if (inlineValue) {
          entry[key] = this.parseLegacyYamlValue(
            inlineValue,
            configPath,
            `skills.${currentCategory}.${key}`,
          );
        } else {
          entry[key] = null;
          pendingList = { key, indent };
        }
        continue;
      }

      if (inlineValue) {
        // Only the documented flattened form (`category:` with no value) is
        // recoverable; an inline value would be silently discarded otherwise.
        throw new ConfigValidationError(
          configPath,
          `skills.${key}`,
          `has an inline value ("${inlineValue}") where a category entry is required. Correction: write selection keys as nested mapping entries under "skills.${key}".`,
        );
      }

      currentCategory = key;
      currentCategoryIndent = indent;
      pendingList = null;
      skills[currentCategory] = {};
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

  private describeValue(value: unknown): string {
    if (Array.isArray(value)) return 'a list';
    if (value === null) return 'null';
    return `a ${typeof value}`;
  }

  /**
   * Rejects reserved selection keys and non-mapping category values before any
   * registry request, naming the exact logical key. Category names themselves
   * are never checked against a local allowlist: a project may use any category
   * the remote registry actually publishes.
   */
  private assertValidSkillCategories(
    skills: unknown,
    configPath: string,
  ): asserts skills is
    Record<string, Record<string, unknown> | null | undefined> | undefined {
    if (skills === undefined) return;
    if (!this.isRecord(skills)) {
      throw new ConfigValidationError(
        configPath,
        'skills',
        `must be a mapping of category name to its selection, not ${this.describeValue(skills)}.`,
      );
    }

    for (const [category, value] of Object.entries(skills)) {
      if (isReservedSelectionKey(category)) {
        throw new ConfigValidationError(
          configPath,
          `skills.${category}`,
          `is a reserved selection key, not a category. Correction: ${RESERVED_SELECTION_KEYS[category]}.`,
        );
      }
      if (value === null || value === undefined) continue;
      if (!this.isRecord(value)) {
        throw new ConfigValidationError(
          configPath,
          `skills.${category}`,
          `must be a mapping of optional ref/include/exclude (plus extension keys), not ${this.describeValue(value)}.`,
        );
      }
    }
  }

  private normalizeRawConfig(
    rawConfig: unknown,
    configPath: string,
  ): ConfigMigrationResult {
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

    this.assertValidSkillCategories(normalized.skills, configPath);

    if (this.isRecord(normalized.skills)) {
      const normalizedSkills: Record<string, Record<string, unknown>> = {};
      for (const [category, value] of Object.entries(normalized.skills)) {
        if (value === null || value === undefined) {
          // A bare legacy category (`typescript:`) declares membership with no
          // selection yet; that is a valid v1/v2 equivalent, not a category
          // value we may invent.
          normalizedSkills[category] = {};
          migrated = true;
          continue;
        }

        // Keep unknown/extension keys so saving a selection never discards
        // configuration this service does not interpret.
        const entry: Record<string, unknown> = { ...value };
        if (typeof value.ref === 'string') {
          entry.ref = value.ref;
        } else {
          delete entry.ref;
        }

        if (Array.isArray(value.include)) {
          entry.include = value.include.filter(
            (item): item is string => typeof item === 'string',
          );
        } else {
          delete entry.include;
        }

        if (Array.isArray(value.exclude)) {
          entry.exclude = value.exclude.filter(
            (item): item is string => typeof item === 'string',
          );
        } else if (typeof value.exclude === 'string') {
          entry.exclude = this.parseLegacyList(value.exclude);
          migrated = true;
        } else {
          delete entry.exclude;
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
   * Reads, migrates in memory, and validates the configuration without
   * touching the filesystem. Legacy filenames and text-format migrations are
   * only written when a caller explicitly saves.
   */
  private async readConfigSource(cwd: string): Promise<ConfigSource | null> {
    const configPath = await this.resolveConfigPath(cwd);
    if (!configPath) return null;

    const content = await fs.readFile(configPath, 'utf8');
    return this.parseConfigSource(content, configPath, cwd);
  }

  /**
   * Parses already-read bytes with the same parser as `readConfigSource`. Used
   * by reviewed publication so its baseline comes from the verified file
   * content rather than caller-held snapshot objects.
   */
  private parseConfigSource(
    content: string,
    configPath: string,
    cwd: string,
  ): ConfigSource {
    let rawConfig: unknown;
    let migratedFromText = false;

    try {
      rawConfig = yaml.load(content);
    } catch (parseError) {
      rawConfig = this.migrateLegacyTextConfig(content, configPath);
      migratedFromText = rawConfig !== null;

      if (!migratedFromText) {
        throw parseError;
      }
    }

    const { config: normalizedConfig, migrated } = this.normalizeRawConfig(
      rawConfig,
      configPath,
    );

    const parsed = SkillConfigSchema.safeParse(normalizedConfig);

    if (!parsed.success) {
      throw new Error(`Invalid .skillsrc format: ${parsed.error.message}`);
    }

    return {
      config: parsed.data as SkillConfig,
      // Validated normalized document, not the parsed projection: schema
      // parsing strips unknown keys, and a migration write must not delete
      // unrelated extension fields.
      document: normalizedConfig,
      // Original document, not normalized values: a save must preserve
      // unrelated legacy values (e.g. an `openai` agent alias) verbatim.
      raw: this.isRecord(rawConfig) ? { ...rawConfig } : {},
      sourcePath: configPath,
      fingerprint: createHash('sha256').update(content, 'utf8').digest('hex'),
      migrated,
      migratedFromText,
      shouldRenameLegacyYamlFile: configPath !== this.getPrimaryConfigPath(cwd),
    };
  }

  /**
   * Loads and validates the skill configuration from the workspace.
   * @param cwd Current working directory
   * @returns The parsed SkillConfig or null if not found
   * @throws Error if the configuration format is invalid
   */
  async loadConfig(cwd: string = process.cwd()): Promise<SkillConfig | null> {
    try {
      const source = await this.readConfigSource(cwd);
      if (!source) {
        return null;
      }

      if (
        source.migratedFromText ||
        source.migrated ||
        source.shouldRenameLegacyYamlFile
      ) {
        await fs.outputFile(
          this.getPrimaryConfigPath(cwd),
          this.dumpConfig(source.document),
        );
      }

      if (source.shouldRenameLegacyYamlFile) {
        await fs.remove(source.sourcePath);
      }

      return source.config;
    } catch (error) {
      // Validation errors already name the file and repair; wrapping them
      // would bury that under a generic load failure.
      if (error instanceof ConfigValidationError) throw error;
      throw new Error(`Failed to load config: ${error}`, { cause: error });
    }
  }

  /**
   * Loads the configuration for the interactive manager without writing
   * migrations. Returns null when no configuration exists.
   */
  async readSnapshot(
    cwd: string = process.cwd(),
  ): Promise<ConfigSnapshot | null> {
    const source = await this.readConfigSource(cwd);
    if (!source) return null;

    return {
      config: source.config,
      raw: source.raw,
      sourcePath: source.sourcePath,
      fingerprint: source.fingerprint,
    };
  }

  /**
   * Persists a reviewed selection after verifying the source has not changed
   * since the snapshot was read. Only `skills` and `skills_mode` are rewritten;
   * unrelated root values and category extension fields survive.
   */
  async saveSelection(
    snapshot: ConfigSnapshot,
    next: SkillConfig,
    cwd: string = process.cwd(),
  ): Promise<ConfigSnapshot> {
    return this.commitReviewedSnapshot(
      snapshot,
      next,
      cwd,
      (baseline, validated) => {
        const raw = baseline.raw;
        const merged: Record<string, unknown> = { ...raw };
        merged.skills = this.mergeSkillEntries(raw.skills, validated.skills);
        if (validated.skills_mode) {
          merged.skills_mode = validated.skills_mode;
        } else {
          delete merged.skills_mode;
        }
        return merged;
      },
    );
  }

  /**
   * Publishes a complete reviewed configuration (accepted category/workflow/
   * specialist pins and later MCP consent updates) without dropping unknown
   * data. Changed known runtime fields are applied over the source document,
   * skill entries merge while preserving category extensions, and unknown root
   * fields plus unknown MCP extension fields survive.
   */
  async saveReviewedConfig(
    snapshot: ConfigSnapshot,
    next: SkillConfig,
    cwd: string = process.cwd(),
  ): Promise<ConfigSnapshot> {
    return this.commitReviewedSnapshot(
      snapshot,
      next,
      cwd,
      (baseline, validated, configPath) =>
        this.buildReviewedDocument(
          baseline.config,
          baseline.raw,
          validated,
          configPath,
        ),
    );
  }

  /**
   * Shared publication: validate, verify the snapshot still matches the file
   * bytes, re-parse those bytes as the only baseline, build and validate the
   * normalized document, then write. Any failure refuses before the filesystem
   * is touched. `snapshot.config`/`snapshot.raw` are never used as a baseline
   * because callers can mutate them in place.
   */
  private async commitReviewedSnapshot(
    snapshot: ConfigSnapshot,
    next: SkillConfig,
    cwd: string,
    buildDocument: (
      baseline: ConfigSource,
      validated: SkillConfig,
      configPath: string,
    ) => Record<string, unknown>,
  ): Promise<ConfigSnapshot> {
    this.assertValidSkillCategories(next.skills, snapshot.sourcePath);
    const parsedNext = SkillConfigSchema.safeParse(next);
    if (!parsedNext.success) {
      throw new Error(`Invalid .skillsrc format: ${parsedNext.error.message}`);
    }
    const validated = parsedNext.data as SkillConfig;

    const currentPath = await this.resolveConfigPath(cwd);
    if (currentPath !== snapshot.sourcePath) {
      throw new Error(CONFIG_CONFLICT_MESSAGE);
    }

    const currentContent = await fs.readFile(snapshot.sourcePath, 'utf8');
    const currentFingerprint = createHash('sha256')
      .update(currentContent, 'utf8')
      .digest('hex');
    if (currentFingerprint !== snapshot.fingerprint) {
      throw new Error(CONFIG_CONFLICT_MESSAGE);
    }

    // Only the verified source bytes define the baseline. Reusing the normal
    // read path keeps one parser; no second recovery parser exists.
    const baseline = this.parseConfigSource(
      currentContent,
      snapshot.sourcePath,
      cwd,
    );
    const primaryConfigPath = this.getPrimaryConfigPath(cwd);
    const merged = buildDocument(baseline, validated, primaryConfigPath);

    // Validate the normalized projection that a reload would produce, and
    // return that projection so callers see exactly the persisted state.
    const { config: normalizedDocument } = this.normalizeRawConfig(
      merged,
      primaryConfigPath,
    );
    const persisted = SkillConfigSchema.safeParse(normalizedDocument);
    if (!persisted.success) {
      throw new Error(`Invalid .skillsrc format: ${persisted.error.message}`);
    }

    const content = this.dumpConfig(merged);
    await fs.outputFile(primaryConfigPath, content);

    // Only the verified source may be migrated away. An unrelated legacy file
    // beside an existing `.skillsrc` is not ours to delete.
    const legacyYamlPath = this.getLegacyYamlConfigPath(cwd);
    if (
      snapshot.sourcePath === legacyYamlPath &&
      (await fs.pathExists(legacyYamlPath))
    ) {
      await fs.remove(legacyYamlPath);
    }

    return {
      config: persisted.data as SkillConfig,
      raw: merged,
      sourcePath: primaryConfigPath,
      fingerprint: createHash('sha256').update(content, 'utf8').digest('hex'),
    };
  }

  private buildReviewedDocument(
    previous: SkillConfig,
    raw: Record<string, unknown>,
    next: SkillConfig,
    configPath: string,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...raw };
    merged.skills = this.mergeSkillEntries(raw.skills, next.skills);

    const previousFields = previous as unknown as Record<string, unknown>;
    const nextFields = next as unknown as Record<string, unknown>;

    for (const field of REVIEWED_ROOT_FIELDS) {
      if (this.valuesEqual(nextFields[field], previousFields[field])) continue;
      if (nextFields[field] === undefined) {
        delete merged[field];
      } else {
        merged[field] = nextFields[field];
      }
    }

    if (!this.valuesEqual(next.mcp, previous.mcp)) {
      if (next.mcp === undefined) {
        const unknownKeys = this.isRecord(raw.mcp)
          ? Object.keys(raw.mcp).filter(
              (key) => !(MCP_FIELD_KEYS as readonly string[]).includes(key),
            )
          : [];
        if (unknownKeys.length > 0) {
          // Removing the whole block would silently discard data this service
          // does not understand; refuse before any write instead.
          throw new ConfigValidationError(
            configPath,
            'mcp',
            `cannot be removed because it contains unrecognized extension keys (${unknownKeys.join(', ')}); remove them explicitly first.`,
          );
        }
        delete merged.mcp;
      } else {
        const rawMcp = this.isRecord(raw.mcp) ? raw.mcp : {};
        const mcp: Record<string, unknown> = { ...rawMcp };
        const nextMcp = next.mcp as unknown as Record<string, unknown>;
        for (const key of MCP_FIELD_KEYS) {
          if (Object.prototype.hasOwnProperty.call(nextMcp, key)) {
            mcp[key] = nextMcp[key];
          } else {
            delete mcp[key];
          }
        }
        merged.mcp = mcp;
      }
    }

    return merged;
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    if (left === right) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
      return (
        left.length === right.length &&
        left.every((value, index) => this.valuesEqual(value, right[index]))
      );
    }
    if (this.isRecord(left) && this.isRecord(right)) {
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      return (
        leftKeys.length === rightKeys.length &&
        leftKeys.every(
          (key) =>
            Object.prototype.hasOwnProperty.call(right, key) &&
            this.valuesEqual(left[key], right[key]),
        )
      );
    }
    return false;
  }

  private mergeSkillEntries(
    rawSkills: unknown,
    nextSkills: Record<string, CategoryConfig>,
  ): Record<string, unknown> {
    const existing = this.isRecord(rawSkills) ? rawSkills : {};
    const merged: Record<string, unknown> = {};

    for (const [category, entry] of Object.entries(nextSkills)) {
      const base = this.isRecord(existing[category])
        ? { ...existing[category] }
        : {};

      if (entry.ref !== undefined) {
        base.ref = entry.ref;
      } else {
        delete base.ref;
      }
      if (entry.include !== undefined) {
        base.include = [...entry.include];
      } else {
        delete base.include;
      }
      if (entry.exclude !== undefined) {
        base.exclude = [...entry.exclude];
      } else {
        delete base.exclude;
      }

      merged[category] = base;
    }

    return merged;
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

    this.assertValidSkillCategories(config.skills, primaryConfigPath);

    await fs.outputFile(
      primaryConfigPath,
      this.dumpConfig(config as unknown as Record<string, unknown>),
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

    // Add product-management category if available in metadata, pinned using getCategoryRef
    // with include allowlist restricted exactly to the two foundation skills (preserving default BRD/PRD planning).
    if (
      metadata.categories?.['product-management'] &&
      !skills['product-management']
    ) {
      skills['product-management'] = defaultCategorySelection(
        'product-management',
        this.getCategoryRef('product-management', metadata),
      );
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
    if (config.skills_mode === 'explicit') return [];

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
