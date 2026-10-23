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
  | 'copilot-agent-md'
  | 'opencode-md'
  | 'gemini-md'
  | 'kiro-md'
  | 'codex-toml';

export type HookKind = 'js-pretooluse' | 'kiro-md';

/**
 * Canonical delegation operations from SRS D3. Names are shared with the
 * conformance evidence records in `scripts/harness-smoke/qualification.ts`
 * so a capability claim and its evidence use one vocabulary.
 */
export type DelegationOperation =
  | 'prepare'
  | 'dispatch'
  | 'receive_completion'
  | 'resume'
  | 'cancel'
  | 'collect_receipt'
  | 'verify_acceptance';

export const DELEGATION_OPERATIONS: readonly DelegationOperation[] = [
  'prepare',
  'dispatch',
  'receive_completion',
  'resume',
  'cancel',
  'collect_receipt',
  'verify_acceptance',
];

/** `supported` / `unsupported` are claims; absence of evidence is not proof. */
export type SupportStatus = 'supported' | 'unsupported' | 'not_verified';

/**
 * - `native-agent`: a native agent definition file the host may load as an agent.
 * - `instruction-only`: a serialized persona/instruction file; not a runnable agent.
 * - `none`: no delegation artifact is written for this host.
 */
export type DelegationSurfaceKind =
  'native-agent' | 'instruction-only' | 'none';

export interface DelegationSurface {
  kind: DelegationSurfaceKind;
  /** Host-surface id carried by conformance evidence; null when kind is 'none'. */
  surface: string | null;
}

/**
 * One validated conformance observation. Mirrors the evidence record fields
 * owned by the qualification harness (host/surface/version/revision/operation,
 * layer/executor/outcome, trace artifact, controls) — keep the vocabulary in
 * sync rather than adding a second runtime-status type.
 *
 * A boolean or a bare in-memory observation is not evidence: promotion to
 * `supported` requires a live `execution` layer observation backed by a
 * non-empty trace artifact reference.
 */
export interface RuntimeEvidence {
  host: string;
  surface: string;
  version: string;
  revision: string;
  operation: DelegationOperation;
  layer: 'serialization' | 'discovery' | 'execution' | 'denial';
  executor: 'live' | 'synthetic';
  outcome: 'observed_pass' | 'observed_fail';
  /** Relative artifact/trace path proving the observation. */
  trace: string;
  /** Controls exercised by the observation (e.g. `tool_allowlist`). */
  controls: readonly string[];
}

export interface RuntimeQuery {
  /** Exact host version the evidence must have been collected on. */
  version: string;
  /** Exact source revision the evidence must have been collected on. */
  revision: string;
  /** Controls the claim depends on; evidence must have exercised all of them. */
  requiredControls: readonly string[];
  evidence: readonly RuntimeEvidence[];
}

export function delegationSurface(def: AgentDefinition): DelegationSurface {
  return def.delegation;
}

function isLiveExecutionEvidence(record: RuntimeEvidence): boolean {
  return (
    record.layer === 'execution' &&
    record.executor === 'live' &&
    record.outcome === 'observed_pass' &&
    record.trace.trim().length > 0
  );
}

function coversControls(
  record: RuntimeEvidence,
  requiredControls: readonly string[],
): boolean {
  return requiredControls.every((control) => record.controls.includes(control));
}

/**
 * Resolves one operation's support status for the exact host surface,
 * version, revision and required controls.
 *
 * No evidence, fixture evidence, evidence from another revision, or evidence
 * that did not exercise the required controls leaves the claim at
 * `not_verified`; a host without a delegation artifact is a definite
 * `unsupported`. A conformance record is evidence of an observation, never
 * authentication of the actor or of host enforcement.
 */
export function delegationStatus(
  def: AgentDefinition,
  operation: DelegationOperation,
  query?: RuntimeQuery,
): SupportStatus {
  if (def.delegation.kind !== 'native-agent') return 'unsupported';
  if (!def.delegation.surface || !query) return 'not_verified';

  const evidence = query.evidence.filter(
    (record) =>
      record.host === def.id &&
      record.surface === def.delegation.surface &&
      record.version === query.version &&
      record.revision === query.revision &&
      record.operation === operation,
  );

  const failing = evidence.some(
    (record) =>
      record.outcome === 'observed_fail' &&
      (query.requiredControls.length === 0 ||
        query.requiredControls.some((control) =>
          record.controls.includes(control),
        )),
  );
  if (failing) return 'unsupported';
  const promoting = evidence.filter(
    (record) =>
      isLiveExecutionEvidence(record) &&
      coversControls(record, query.requiredControls),
  );
  return promoting.length > 0 ? 'supported' : 'not_verified';
}

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
  /**
   * Serialized delegation artifact this agent receives. This is a
   * serialization fact, not a runtime capability: support is decided per
   * operation by `delegationStatus` from versioned evidence.
   */
  delegation: DelegationSurface;
}

export const AGENT_CAPABILITIES: Record<Agent, AgentDefinition> = {
  [Agent.Cursor]: {
    id: Agent.Cursor,
    delegation: { kind: 'instruction-only', surface: null },
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
    delegation: { kind: 'none', surface: null },
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
    delegation: { kind: 'native-agent', surface: 'claude-code-subagents' },
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
    delegation: { kind: 'native-agent', surface: 'copilot-custom-agents' },
    name: 'GitHub Copilot',
    path: '.github/skills',
    ruleFile: '.github/instructions',
    ruleExtension: '.instructions.md',
    frontmatterStyle: 'copilot',
    detectionFiles: ['.github'],
    workflowFormat: 'prompt',
    workflowPath: '.github/prompts',
    agentPath: '.github/agents',
    hookScriptPath: '.github/hooks/preedit-skill-loader.js',
    hookConfigPath: '.github/hooks.json',
    specialistFormat: 'copilot-agent-md',
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
    delegation: { kind: 'none', surface: null },
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
    delegation: { kind: 'native-agent', surface: 'codex-subagents' },
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
    delegation: { kind: 'native-agent', surface: 'opencode-agents' },
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
    delegation: { kind: 'native-agent', surface: 'gemini-cli-subagents' },
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
    delegation: { kind: 'none', surface: null },
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
    delegation: { kind: 'none', surface: null },
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
    delegation: { kind: 'instruction-only', surface: null },
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
