import path from 'path';
import { Agent } from '../constants/enums';

/**
 * Defines how workflows are delivered to each agent platform.
 * Workflows are user-invoked multi-step procedures (not passive rules).
 * - 'native':  Direct markdown workflow files, executed by the agent's workflow runner (Antigravity, Kiro)
 * - 'command': Custom slash command files — inline the procedure (Claude: .claude/commands/*.md)
 * - 'toml':    TOML command files — reference the workflow by path (Gemini: .gemini/commands/*.toml)
 * - 'prompt':  Reusable prompt files (Copilot: .github/prompts/*.prompt.md)
 * - 'none':    Agent has no verified user-invoked command system
 */
export type WorkflowFormat =
  'native' | 'command' | 'toml' | 'prompt' | 'skill' | 'none';

export type SpecialistFormat =
  | 'claude-md'
  | 'cursor-mdc'
  | 'copilot-instructions'
  | 'opencode-md'
  | 'gemini-md'
  | 'kiro-md'
  | 'codex-toml';

export type HookKind = 'js-pretooluse' | 'kiro-md';

export interface McpSpec {
  /** Project-scope file, relative to project root; null = no project scope. */
  projectFile: string | null;
  /** User-scope absolute file for this home/platform; null = no user scope. */
  userFile: (home: string, platform: NodeJS.Platform) => string | null;
  key: string;
  shape: 'map' | 'list';
  format?: 'json' | 'toml';
  legacyJson?: {
    projectFile: string | null;
    userFile: (home: string) => string | null;
  };
}

export interface AgentDefinition {
  // --- existing fields, unchanged names and meaning ---
  id: Agent;
  name: string;
  path: string;
  ruleFile: string;
  ruleExtension: string;
  ruleFileName?: string;
  frontmatterStyle: 'cursor' | 'copilot' | 'none';
  detectionFiles: string[];
  /** How workflows should be transformed for this agent */
  workflowFormat: WorkflowFormat;
  /** Directory where transformed workflows are written (relative to cwd) */
  workflowPath: string;
  /** Directory where native specialist agent personas are written (optional) */
  agentPath?: string;
  /** Relative path to pre-edit hook reminder script (if supported) */
  hookScriptPath?: string;
  /** Relative path to hook configuration JSON file (if supported) */
  hookConfigPath?: string;
  // --- new fields ---
  /** How specialists are emitted; null = agent has no native sub-agent surface. */
  specialistFormat: SpecialistFormat | null;
  /** Hook mechanism; null = no programmatic hook system. */
  hookKind: HookKind | null;
  /** MCP registration target; null = no MCP support. */
  mcp: McpSpec | null;
  limits: { skillBodyBytes: number | null };
}

export const AGENT_CAPABILITIES: Record<Agent, AgentDefinition> = {
  [Agent.Cursor]: {
    id: Agent.Cursor,
    name: 'Cursor',
    path: '.cursor/skills',
    ruleFile: '.cursor/rules',
    ruleExtension: '.mdc',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.cursor', '.cursorrules'],
    workflowFormat: 'skill',
    workflowPath: '.cursor/skills',
    agentPath: '.cursor/agents',
    hookScriptPath: '.cursor/hooks/preedit-skill-loader.js',
    hookConfigPath: '.cursor/hooks.json',
    specialistFormat: 'cursor-mdc',
    hookKind: 'js-pretooluse',
    mcp: {
      projectFile: '.cursor/mcp.json',
      userFile: (home, platform) => {
        if (platform === 'win32') {
          return path.join(
            home,
            'AppData',
            'Roaming',
            'Cursor',
            'User',
            'globalStorage',
            'mcp.json',
          );
        }
        if (platform === 'darwin') {
          return path.join(
            home,
            'Library',
            'Application Support',
            'Cursor',
            'User',
            'globalStorage',
            'mcp.json',
          );
        }
        if (platform === 'linux') {
          return path.join(
            home,
            '.config',
            'Cursor',
            'User',
            'globalStorage',
            'mcp.json',
          );
        }
        return path.join(home, '.cursor', 'mcp.json');
      },
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Trae]: {
    id: Agent.Trae,
    name: 'Trae',
    path: '.trae/skills',
    ruleFile: '.trae/rules',
    ruleExtension: '.mdc',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.trae'],
    workflowFormat: 'skill',
    workflowPath: '.trae/skills',
    specialistFormat: null,
    hookKind: null,
    mcp: {
      projectFile: '.trae/mcp.json',
      userFile: () => null,
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Claude]: {
    id: Agent.Claude,
    name: 'Claude Code',
    path: '.claude/skills',
    ruleFile: '.',
    ruleExtension: '.md',
    ruleFileName: 'CLAUDE.md',
    frontmatterStyle: 'none',
    detectionFiles: ['.claude'],
    workflowFormat: 'command',
    workflowPath: '.claude/commands',
    agentPath: '.claude/agents',
    hookScriptPath: '.claude/hooks/preedit-skill-loader.js',
    hookConfigPath: '.claude/settings.json',
    specialistFormat: 'claude-md',
    hookKind: 'js-pretooluse',
    mcp: {
      projectFile: '.mcp.json',
      userFile: (home) => path.join(home, '.claude', '.mcp.json'),
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Copilot]: {
    id: Agent.Copilot,
    name: 'GitHub Copilot',
    path: '.github/skills',
    ruleFile: '.github/instructions',
    ruleExtension: '.instructions.md',
    frontmatterStyle: 'copilot',
    detectionFiles: ['.github'],
    workflowFormat: 'prompt',
    workflowPath: '.github/prompts',
    agentPath: '.github/copilot-agents',
    hookScriptPath: '.github/hooks/preedit-skill-loader.js',
    hookConfigPath: '.github/hooks.json',
    specialistFormat: 'copilot-instructions',
    hookKind: 'js-pretooluse',
    mcp: {
      projectFile: '.github/mcp.json',
      userFile: (home, platform) => {
        if (platform === 'darwin') {
          return path.join(
            home,
            'Library',
            'Application Support',
            'Code',
            'User',
            'globalStorage',
            'github.copilot-chat',
            'mcp.json',
          );
        }
        if (platform === 'win32') {
          return path.join(
            home,
            'AppData',
            'Roaming',
            'Code',
            'User',
            'globalStorage',
            'github.copilot-chat',
            'mcp.json',
          );
        }
        if (platform === 'linux') {
          return path.join(
            home,
            '.config',
            'Code',
            'User',
            'globalStorage',
            'github.copilot-chat',
            'mcp.json',
          );
        }
        return null;
      },
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Antigravity]: {
    id: Agent.Antigravity,
    name: 'Antigravity',
    path: '.agents/skills',
    ruleFile: '.agents/rules',
    ruleExtension: '.md',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.agents'],
    workflowFormat: 'native',
    workflowPath: '.agents/workflows',
    specialistFormat: null,
    hookKind: null,
    mcp: {
      projectFile: '.antigravity/mcp_config.json',
      userFile: (home, platform) => {
        if (platform === 'win32') {
          return path.join(
            home,
            'AppData',
            'Local',
            'Google',
            'Antigravity',
            'mcp_config.json',
          );
        }
        if (platform === 'darwin') {
          return path.join(
            home,
            'Library',
            'Application Support',
            'Google',
            'Antigravity',
            'mcp_config.json',
          );
        }
        return path.join(home, '.gemini', 'antigravity', 'mcp_config.json');
      },
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Codex]: {
    id: Agent.Codex,
    name: 'Codex',
    path: '.codex/skills',
    ruleFile: '.codex/rules',
    ruleExtension: '.md',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.codex'],
    workflowFormat: 'skill',
    workflowPath: '.codex/skills',
    agentPath: '.codex/agents',
    hookScriptPath: '.codex/hooks/preedit-skill-loader.js',
    hookConfigPath: '.codex/hooks.json',
    specialistFormat: 'codex-toml',
    hookKind: 'js-pretooluse',
    mcp: {
      projectFile: '.codex/config.toml',
      userFile: (home) => path.join(home, '.codex', 'config.toml'),
      key: 'mcp_servers',
      shape: 'map',
      format: 'toml',
      legacyJson: {
        projectFile: '.codex/mcp_config.json',
        userFile: (home) => path.join(home, '.codex', 'mcp_config.json'),
      },
    },
    limits: { skillBodyBytes: 8192 },
  },
  [Agent.OpenCode]: {
    id: Agent.OpenCode,
    name: 'OpenCode',
    path: '.opencode/skills',
    ruleFile: '.opencode/rules',
    ruleExtension: '.md',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.opencode'],
    workflowFormat: 'command',
    workflowPath: '.opencode/commands',
    agentPath: '.opencode/agents',
    specialistFormat: 'opencode-md',
    hookKind: null,
    mcp: {
      projectFile: '.opencode/mcp_config.json',
      userFile: (home) => path.join(home, '.opencode', 'mcp_config.json'),
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Gemini]: {
    id: Agent.Gemini,
    name: 'Gemini',
    path: '.gemini/skills',
    ruleFile: '.gemini/rules',
    ruleExtension: '.md',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.gemini'],
    workflowFormat: 'toml',
    workflowPath: '.gemini/commands',
    agentPath: '.gemini/agents',
    hookScriptPath: '.gemini/hooks/preedit-skill-loader.js',
    hookConfigPath: '.gemini/hooks.json',
    specialistFormat: 'gemini-md',
    hookKind: 'js-pretooluse',
    mcp: {
      projectFile: '.gemini/settings.json',
      userFile: (home) => path.join(home, '.gemini', 'settings.json'),
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Roo]: {
    id: Agent.Roo,
    name: 'Roo Code',
    path: '.roo/skills',
    ruleFile: '.roo/rules',
    ruleExtension: '.md',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.roo'],
    workflowFormat: 'command',
    workflowPath: '.roo/commands',
    specialistFormat: null,
    hookKind: null,
    mcp: {
      projectFile: '.roo/mcp_config.json',
      userFile: () => null,
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Windsurf]: {
    id: Agent.Windsurf,
    name: 'Windsurf',
    path: '.windsurf/skills',
    ruleFile: '.windsurf/rules',
    ruleExtension: '.md',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.windsurf'],
    workflowFormat: 'native',
    workflowPath: '.windsurf/workflows',
    hookScriptPath: '.windsurf/hooks/preedit-skill-loader.js',
    hookConfigPath: '.windsurf/hooks.json',
    specialistFormat: null,
    hookKind: 'js-pretooluse',
    mcp: {
      projectFile: '.codeium/windsurf/mcp_config.json',
      userFile: (home, platform) => {
        if (platform === 'win32') {
          return path.join(
            home,
            'AppData',
            'Roaming',
            'Codeium',
            'Windsurf',
            'mcp_config.json',
          );
        }
        if (platform === 'darwin') {
          return path.join(
            home,
            'Library',
            'Application Support',
            'Codeium',
            'Windsurf',
            'mcp_config.json',
          );
        }
        return path.join(home, '.codeium', 'windsurf', 'mcp_config.json');
      },
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
  [Agent.Kiro]: {
    id: Agent.Kiro,
    name: 'Kiro',
    path: '.kiro/skills',
    ruleFile: '.kiro/rules',
    ruleExtension: '.md',
    frontmatterStyle: 'cursor',
    detectionFiles: ['.kiro'],
    workflowFormat: 'native',
    workflowPath: '.agents/workflows',
    agentPath: '.kiro/agents',
    hookScriptPath: '.kiro/hooks/ags-skill-loader.md',
    specialistFormat: 'kiro-md',
    hookKind: 'kiro-md',
    mcp: {
      projectFile: '.kiro/settings/mcp.json',
      userFile: (home, platform) => {
        if (platform === 'win32') {
          return path.join(
            home,
            'AppData',
            'Roaming',
            'Kiro',
            'settings',
            'mcp.json',
          );
        }
        return path.join(home, '.kiro', 'settings', 'mcp.json');
      },
      key: 'mcpServers',
      shape: 'map',
    },
    limits: { skillBodyBytes: null },
  },
};

export type Surface = 'workflows' | 'specialists' | 'hooks' | 'mcp';

export function unsupportedSurfaces(def: AgentDefinition): Surface[] {
  const out: Surface[] = [];
  if (def.workflowFormat === 'none') out.push('workflows');
  if (!def.specialistFormat) out.push('specialists');
  if (!def.hookKind) out.push('hooks');
  if (!def.mcp) out.push('mcp');
  return out;
}

export function disclosureLines(
  agents: Agent[],
  previous: Record<string, string[]> | undefined,
): { lines: string[]; next: Record<string, string[]> } {
  const lines: string[] = [];
  const next: Record<string, string[]> = {};
  for (const agent of agents) {
    const def = AGENT_CAPABILITIES[agent];
    const unsupported = unsupportedSurfaces(def);
    next[agent] = unsupported;
    const prev = previous?.[agent];
    if (
      unsupported.length > 0 &&
      (!prev || prev.join(',') !== unsupported.join(','))
    ) {
      lines.push(`${def.name}: ${unsupported.join(', ')} not supported`);
    }
  }
  return { lines, next };
}
