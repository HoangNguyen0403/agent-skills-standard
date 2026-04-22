import { Agent } from '../constants';

/**
 * Represents a single skill entry in the configuration.
 */
export interface SkillEntry {
  /** Optional reference (branch/tag/sha) for this skill/category */
  ref?: string;
  /** List of sub-skill IDs to exclude during sync */
  exclude?: string[];
  /** List of sub-skill IDs to explicitly include (overrides detection) */
  include?: string[];
}

/**
 * Alias for SkillEntry used within the ConfigService for consistency.
 */
export type CategoryConfig = SkillEntry;

/**
 * Where the MCP integration is allowed to write configuration:
 *   - `project`        — only files inside this project (e.g. ./.mcp.json) (recommended)
 *   - `user`           — also user-home files (e.g. ~/.cursor/mcp.json) — sync prompts each write
 *   - `snippets-only`  — never edits any runtime config; just generates ./mcp-config-snippets/*.json
 *   - `disabled`       — no MCP-related changes at all
 */
export type McpScope = 'project' | 'user' | 'snippets-only' | 'disabled';

/**
 * Optional MCP integration block for `.skillsrc`. The CLI never edits runtime
 * configs without explicit user consent recorded here.
 */
export interface McpConfig {
  /** Master toggle. `false` is equivalent to `scope: 'disabled'`. Default: false until user opts in. */
  enabled: boolean;
  /** Scope of writes allowed during `sync`. Default: 'snippets-only'. Recommended: 'project'. */
  scope: McpScope;
  /** True once the user has been asked at least once — prevents re-prompting on every sync. */
  prompted: boolean;
  /** Optional: pin a specific MCP server version. Default: tracks @latest via npx. */
  version?: string;
}

/**
 * The main configuration structure for agent-skills-standard (usually .skillsrc).
 */
export interface SkillConfig {
  /** Registry URL to sync from */
  registry: string;
  /** List of AI agents currently managed in this project */
  agents: Agent[];
  /** Map of categories and their associated skill configurations */
  skills: {
    [key: string]: SkillEntry;
  };
  /** Whether to sync workflows, or a specific list of workflow names */
  workflows?: boolean | string[];
  /** List of file paths to PROTECT from being overwritten by sync */
  custom_overrides?: string[];
  /** Whether to delete orphaned skill folders (true by default) */
  prune?: boolean;
  /** Optional: opt-in MCP server integration. See McpConfig. */
  mcp?: McpConfig;
}
