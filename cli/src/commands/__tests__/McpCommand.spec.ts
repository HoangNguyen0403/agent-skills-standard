import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { Agent } from '../../constants';
import { McpScope, SkillConfig } from '../../models/config';
import { ConfigService } from '../../services/ConfigService';
import { McpConfigService } from '../../services/McpConfigService';
import { McpCommand } from '../mcp';

vi.mock('picocolors', () => ({
  default: {
    green: vi.fn((t) => t),
    cyan: vi.fn((t) => t),
    gray: vi.fn((t) => t),
    bold: vi.fn((t) => t),
    yellow: vi.fn((t) => t),
    blue: vi.fn((t) => t),
    red: vi.fn((t) => t),
    magenta: vi.fn((t) => t),
  },
}));

function makeConfig(overrides: Partial<SkillConfig> = {}): SkillConfig {
  return {
    registry: 'https://example.com',
    agents: [Agent.Claude, Agent.Cursor],
    skills: { common: { ref: 'common-v2.0.4' } },
    ...overrides,
  };
}

describe('McpCommand — actionStatus mismatch detection', () => {
  let command: McpCommand;
  let mockConfigService: Mocked<ConfigService>;
  let mockMcpService: Mocked<McpConfigService>;
  let logs: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });

    mockConfigService = {
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
    } as unknown as Mocked<ConfigService>;

    mockMcpService = {
      status: vi.fn(),
      install: vi.fn(),
      uninstall: vi.fn(),
      buildEntry: vi.fn(),
    } as unknown as Mocked<McpConfigService>;

    command = new McpCommand(mockConfigService, mockMcpService);
  });

  function output(): string {
    return logs.join('\n');
  }

  it('warns when .skillsrc says enabled=false but a runtime config has the MCP', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: { enabled: false, scope: 'snippets-only' as McpScope, prompted: true },
      }),
    );
    mockMcpService.status.mockResolvedValue([
      { agent: Agent.Claude, project: true, user: false },
      { agent: Agent.Cursor, project: false, user: false },
    ]);

    await command.run('status');

    expect(output()).toContain('Mismatch detected');
    expect(output()).toContain('mcp.enabled=false');
    expect(output()).toContain('IS present in at least one runtime config');
    // Both fix suggestions should appear
    expect(output()).toContain('`ags mcp enable`');
    expect(output()).toContain('`ags mcp uninstall --from project`');
  });

  it('warns when .skillsrc says enabled=true but no runtime config has the MCP', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: { enabled: true, scope: 'project' as McpScope, prompted: true },
      }),
    );
    mockMcpService.status.mockResolvedValue([
      { agent: Agent.Claude, project: false, user: false },
      { agent: Agent.Cursor, project: false, user: false },
    ]);

    await command.run('status');

    expect(output()).toContain('Mismatch detected');
    expect(output()).toContain('mcp.enabled=true');
    expect(output()).toContain('no runtime config has the MCP registered');
    expect(output()).toContain('`ags mcp install`');
    expect(output()).toContain('`ags mcp disable`');
  });

  it('does NOT warn when consent and runtime presence both align (enabled=true + installed)', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: { enabled: true, scope: 'project' as McpScope, prompted: true },
      }),
    );
    mockMcpService.status.mockResolvedValue([
      { agent: Agent.Claude, project: true, user: false },
      { agent: Agent.Cursor, project: true, user: false },
    ]);

    await command.run('status');

    expect(output()).not.toContain('Mismatch detected');
  });

  it('does NOT warn when consent and runtime presence both align (enabled=false + nothing installed)', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: { enabled: false, scope: 'snippets-only' as McpScope, prompted: true },
      }),
    );
    mockMcpService.status.mockResolvedValue([
      { agent: Agent.Claude, project: false, user: false },
      { agent: Agent.Cursor, project: false, user: false },
    ]);

    await command.run('status');

    expect(output()).not.toContain('Mismatch detected');
  });

  it('treats user-scope install as "installed" too (mismatch fires either way)', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: { enabled: false, scope: 'snippets-only' as McpScope, prompted: true },
      }),
    );
    mockMcpService.status.mockResolvedValue([
      { agent: Agent.Claude, project: false, user: true }, // installed in $HOME only
      { agent: Agent.Cursor, project: false, user: false },
    ]);

    await command.run('status');

    expect(output()).toContain('Mismatch detected');
  });

  it('skips mismatch detection cleanly when no agents are configured', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        agents: [],
        mcp: { enabled: true, scope: 'project' as McpScope, prompted: true },
      }),
    );
    mockMcpService.status.mockResolvedValue([]);

    await command.run('status');

    expect(output()).toContain('(no agents configured)');
    expect(output()).not.toContain('Mismatch detected');
  });

  it('aborts gracefully when .skillsrc is missing', async () => {
    mockConfigService.loadConfig.mockResolvedValue(null);

    await command.run('status');

    expect(output()).toContain('.skillsrc not found');
    expect(mockMcpService.status).not.toHaveBeenCalled();
  });
});
