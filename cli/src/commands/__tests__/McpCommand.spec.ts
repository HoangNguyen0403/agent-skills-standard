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

  it('handles "enable" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig({ mcp: { enabled: false, scope: 'project', prompted: false } }));
    await command.run('enable');
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      mcp: expect.objectContaining({ enabled: true, prompted: true })
    }));
    expect(output()).toContain('MCP enabled');
  });

  it('handles "disable" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig({ mcp: { enabled: true, scope: 'project', prompted: true } }));
    await command.run('disable');
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      mcp: expect.objectContaining({ enabled: false, prompted: true })
    }));
    expect(output()).toContain('MCP disabled');
  });

  it('handles "scope" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    await command.run('scope', { scope: 'user' });
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      mcp: expect.objectContaining({ scope: 'user' })
    }));
    expect(output()).toContain('MCP scope set to "user"');
  });

  it('rejects invalid "scope" value', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    await command.run('scope', { scope: 'invalid' });
    expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
    expect(output()).toContain('Invalid scope');
  });

  it('handles "install" action correctly with report printing', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.install.mockResolvedValue({
      projectWrites: [{ agent: Agent.Claude, file: '.mcp.json', action: 'added' }],
      userWrites: [{ agent: Agent.Cursor, file: '/home/.cursor/mcp.json', action: 'added' }],
      snippets: [{ agent: Agent.Claude, file: 'snippet.json' }],
      declined: [{ agent: Agent.Cursor, file: '/home/.cursor/mcp.json' }],
      unsupported: [Agent.Copilot],
    });

    await command.run('install', { scope: 'project' });

    expect(mockMcpService.install).toHaveBeenCalled();
    expect(output()).toContain('Project-scope writes');
    expect(output()).toContain('User-scope writes');
    expect(output()).toContain('User-scope declined');
    expect(output()).toContain('Snippet files');
    expect(output()).toContain('skipped — no MCP support yet');
  });

  it('handles "uninstall" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.uninstall.mockResolvedValue({
      removed: [{ agent: Agent.Claude, file: '.mcp.json' }]
    });

    await command.run('uninstall', { from: 'all' });

    expect(mockMcpService.uninstall).toHaveBeenCalledWith(expect.objectContaining({ from: 'all' }));
    expect(output()).toContain('Removed agent-skills MCP entry');
  });

  it('handles "snippets" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.install.mockResolvedValue({
      projectWrites: [],
      userWrites: [],
      snippets: [{ agent: Agent.Claude, file: 'mcp-config-snippets/claude.json' }],
      declined: [],
      unsupported: [],
    });

    await command.run('snippets');

    expect(output()).toContain('Generated 1 snippet(s)');
    expect(output()).toContain('claude.json');
  });

  it('handles "snippets" action with no snippets', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.install.mockResolvedValue({
      projectWrites: [],
      userWrites: [],
      snippets: [],
      declined: [],
      unsupported: [],
    });

    await command.run('snippets');
    expect(output()).toContain('No snippets generated');
  });

  it('handles "enable" action when scope is disabled', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig({
      mcp: { enabled: false, scope: 'disabled', prompted: true }
    }));
    await command.run('enable');
    expect(output()).toContain('scope is currently "disabled"');
    expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
  });

  it('prints report with "up-to-date" project writes', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.install.mockResolvedValue({
      projectWrites: [{ agent: Agent.Claude, file: '.mcp.json', action: 'up-to-date' }],
      userWrites: [],
      snippets: [],
      declined: [],
      unsupported: [],
    });

    await command.run('install');
    expect(output()).toContain('= up-to-date');
  });

  it('handles "uninstall" when nothing to remove', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.uninstall.mockResolvedValue({ removed: [] });

    await command.run('uninstall');
    expect(output()).toContain('Nothing to remove');
  });

  it('handles unknown action', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    await command.run('invalid-action');
    expect(output()).toContain('Unknown action: invalid-action');
  });
});
