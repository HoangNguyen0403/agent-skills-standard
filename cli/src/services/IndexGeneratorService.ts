/**
 * Subset of the registry's metadata.json that the IndexGeneratorService needs at
 * index-generation time. Provided by the caller (e.g. SyncService) so the file
 * never needs to be written to disk inside the user's project.
 */
export interface RemoteMetadata {
  file_routing?: Record<string, string[]>;
  broad_globs?: string[];
  base_language_skills?: Record<string, string>;
  foundational_composite_rules?: Record<string, string[]>;
}

/**
 * Metadata structure for a skill, extracted from the frontmatter and content of a SKILL.md file.
 */
export interface SkillMetadata {
  /** The human-readable name of the skill. */
  name: string;
  /** A brief summary of what the skill covers. */
  description: string;
  /** The priority level (e.g., P0, P1) determining its critical importance. */
  priority: string;
  /** Trigger conditions for when this skill should be activated. */
  triggers: {
    /** Glob patterns of files that trigger this skill. */
    files?: string[];
    /** List of keywords that trigger this skill. */
    keywords?: string[];
    /** Other skill IDs that, when active, also trigger this skill. */
    composite?: string[];
    /** Patterns to explicitly exclude from triggering this skill. */
    exclude?: string[];
  };
}

/**
 * Interface definition for IndexGeneratorService.
 */
export abstract class IndexGeneratorService {
  abstract withMetadata(metadata: RemoteMetadata): this;

  abstract generate(
    baseDir: string,
    allowedCategories?: string[],
  ): Promise<string>;

  abstract generateCategoryIndex(
    baseDir: string,
    category: string,
  ): Promise<string>;

  abstract generateAllCategoryIndices(
    baseDir: string,
    allowedCategories?: string[],
  ): Promise<Record<string, string>>;

  abstract assembleRouterIndex(
    baseDir: string,
    allowedCategories?: string[],
    mcpEnabled?: boolean,
  ): Promise<string>;

  abstract assembleIndex(entries: string[]): string;

  abstract sanitizeDescription(desc: string, skillId?: string): string;
}
