import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { INJECTION_PATTERNS } from '../constants/security';

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
 * Service for loading and providing consolidated metadata for index generation.
 * Handles both remote-injected metadata and local file-system fallbacks.
 */
export class MetadataReader {
  private remoteMetadata?: RemoteMetadata;

  constructor(remote?: RemoteMetadata) {
    this.remoteMetadata = remote;
  }

  /**
   * Loads foundational composite rules. Uses injected remote metadata when available;
   * falls back to reading metadata.json from baseDir.
   */
  async loadFoundationalRules(
    baseDir: string,
  ): Promise<Record<string, string[]>> {
    if (this.remoteMetadata?.foundational_composite_rules !== undefined) {
      return this.remoteMetadata.foundational_composite_rules;
    }
    try {
      const metaPath = path.join(baseDir, 'metadata.json');
      if (await fs.pathExists(metaPath)) {
        const raw = await fs.readFile(metaPath, 'utf8');
        const parsed = JSON.parse(raw) as {
          foundational_composite_rules?: Record<string, string[]>;
        };
        return parsed.foundational_composite_rules ?? {};
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `[MetadataReader] Failed to load foundational rules: ${error}`,
        );
      }
    }
    return {};
  }

  /**
   * Loads file routing rules. Uses injected remote metadata when available;
   * falls back to reading metadata.json from baseDir.
   */
  async loadFileRouting(baseDir: string): Promise<Record<string, string[]>> {
    if (this.remoteMetadata?.file_routing !== undefined) {
      return this.remoteMetadata.file_routing;
    }
    try {
      const metaPath = path.join(baseDir, 'metadata.json');
      if (await fs.pathExists(metaPath)) {
        const raw = await fs.readFile(metaPath, 'utf8');
        const parsed = JSON.parse(raw) as {
          file_routing?: Record<string, string[]>;
        };
        return parsed.file_routing ?? {};
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(`[MetadataReader] Failed to load file routing: ${error}`);
      }
    }
    return {};
  }

  /**
   * Loads broad glob patterns and base language skill mappings. Uses injected remote
   * metadata when available; falls back to reading metadata.json from baseDir.
   */
  async loadTierConfig(baseDir: string): Promise<{
    broadGlobs: string[];
    baseSkills: Record<string, string>;
  }> {
    if (this.remoteMetadata !== undefined) {
      return {
        broadGlobs: this.remoteMetadata.broad_globs ?? [],
        baseSkills: this.remoteMetadata.base_language_skills ?? {},
      };
    }
    try {
      const metaPath = path.join(baseDir, 'metadata.json');
      if (await fs.pathExists(metaPath)) {
        const raw = await fs.readFile(metaPath, 'utf8');
        const parsed = JSON.parse(raw) as {
          broad_globs?: string[];
          base_language_skills?: Record<string, string>;
        };
        return {
          broadGlobs: parsed.broad_globs ?? [],
          baseSkills: parsed.base_language_skills ?? {},
        };
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(`[MetadataReader] Failed to load tier config: ${error}`);
      }
    }
    return { broadGlobs: [], baseSkills: {} };
  }

  /**
   * Parses a SKILL.md file to extract its metadata (frontmatter + priority).
   */
  async parseSkill(skillPath: string): Promise<SkillMetadata | null> {
    try {
      const content = await fs.readFile(skillPath, 'utf8');
      const frontmatterMatch = content.match(
        /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/,
      );

      if (!frontmatterMatch) return null;

      const fm = yaml.load(frontmatterMatch[1]) as Record<string, unknown>;
      const body = frontmatterMatch[2];

      const priorityMatch = body.match(/## \*\*Priority:\s*([^*]+)\*\*/);
      const priority = priorityMatch ? priorityMatch[1].trim() : 'P1';

      const metadata = (fm?.metadata || {}) as Record<string, unknown>;
      const rawTriggers = (metadata?.triggers || {}) as Record<string, unknown>;

      const triggers: {
        files?: string[];
        keywords?: string[];
        composite?: string[];
        exclude?: string[];
      } = {
        files: Array.isArray(rawTriggers.files)
          ? (rawTriggers.files as string[])
          : [],
        keywords: Array.isArray(rawTriggers.keywords)
          ? (rawTriggers.keywords as string[])
          : [],
        composite: Array.isArray(rawTriggers.composite)
          ? (rawTriggers.composite as string[])
          : [],
        exclude: Array.isArray(rawTriggers.exclude)
          ? (rawTriggers.exclude as string[])
          : [],
      };

      const hasStructured =
        (triggers.files?.length || 0) > 0 ||
        (triggers.keywords?.length || 0) > 0;
      const description =
        typeof fm.description === 'string' ? fm.description : '';

      if (!hasStructured && description) {
        const descTrigs = description.match(/\(triggers:\s*`?(.*?)`?\)\s*$/);
        if (descTrigs) {
          const rawParts = descTrigs[1].split(',');
          const parts: string[] = [];
          let current = '';
          let braceCount = 0;

          for (let i = 0; i < rawParts.length; i++) {
            const p = rawParts[i];
            braceCount += (p.match(/{/g) || []).length;
            braceCount -= (p.match(/}/g) || []).length;
            current += (current ? ',' : '') + p;

            if (braceCount === 0) {
              parts.push(current.trim());
              current = '';
            }
          }
          if (current) parts.push(current.trim());

          const files = parts.filter(
            (p) =>
              p.includes('*') ||
              p.includes('/') ||
              p.includes('{') ||
              /\.\w+$/.test(p),
          );
          const keywords = parts.filter(
            (p) =>
              !p.includes('*') &&
              !p.includes('/') &&
              !p.includes('{') &&
              !/\.\w+$/.test(p),
          );

          if (files.length > 0) triggers.files = files;
          if (keywords.length > 0) triggers.keywords = keywords;
        }
      }

      return {
        name: typeof fm.name === 'string' ? fm.name : '',
        description,
        priority,
        triggers,
      };
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `[MetadataReader] Failed to parse skill at ${skillPath}: ${error}`,
        );
      }
      return null;
    }
  }

  /**
   * Sanitizes a skill description to prevent indirect prompt injection.
   */
  sanitizeDescription(desc: string, skillId: string = 'unknown'): string {
    let sanitized = desc;
    let wasModified = false;

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        wasModified = true;
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
      pattern.lastIndex = 0;
    }

    if (wasModified) {
      process.stderr.write(
        `[SECURITY] Prompt injection pattern stripped from skill description: ${skillId}\n`,
      );
    }

    return sanitized;
  }
}
