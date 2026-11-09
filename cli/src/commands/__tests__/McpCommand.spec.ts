import inquirer from 'inquirer';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import { Agent } from '../../constants';
import { MCP_COMPATIBLE_VERSION } from '../../constants/mcp';
import { McpScope, SkillConfig } from '../../models/config';
import { ConfigService } from '../../services/ConfigService';
import { McpConfigService } from '../../services/McpConfigService';
import { McpCommand } from '../mcp';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

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
      buildEntry: vi.fn().mockReturnValue({
        command: 'npx',
        args: [
          '-y',
          '--prefer-offline',
          `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
        ],
      }),
      detectGlobalVersion: vi.fn().mockReturnValue(null),
    } as unknown as Mocked<McpConfigService>;

    command = new McpCommand(mockConfigService, mockMcpService);
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  function output(): string {
    return logs.join('\n');
  }

  it('warns when .skillsrc says enabled=false but a runtime config has the MCP', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: {
          enabled: false,
          scope: 'snippets-only' as McpScope,
          prompted: true,
        },
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
        mcp: {
          enabled: false,
          scope: 'snippets-only' as McpScope,
          prompted: true,
        },
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
        mcp: {
          enabled: false,
          scope: 'snippets-only' as McpScope,
          prompted: true,
        },
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
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: { enabled: false, scope: 'project', prompted: false },
      }),
    );
    await command.run('enable');
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mcp: expect.objectContaining({ enabled: true, prompted: true }),
      }),
    );
    expect(output()).toContain('MCP enabled');
  });

  it('handles "disable" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({ mcp: { enabled: true, scope: 'project', prompted: true } }),
    );
    await command.run('disable');
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mcp: expect.objectContaining({ enabled: false, prompted: true }),
      }),
    );
    expect(output()).toContain('MCP disabled');
  });

  it('handles "scope" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    await command.run('scope', { scope: 'user' });
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mcp: expect.objectContaining({ scope: 'user' }),
      }),
    );
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
      projectWrites: [
        { agent: Agent.Claude, file: '.mcp.json', action: 'added' },
      ],
      userWrites: [
        {
          agent: Agent.Cursor,
          file: '/home/.cursor/mcp.json',
          action: 'added',
        },
      ],
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
      removed: [{ agent: Agent.Claude, file: '.mcp.json' }],
    });

    await command.run('uninstall', { from: 'all' });

    expect(mockMcpService.uninstall).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'all' }),
    );
    expect(output()).toContain('Removed agent-skills MCP entry');
  });

  it('handles "snippets" action correctly', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.install.mockResolvedValue({
      projectWrites: [],
      userWrites: [],
      snippets: [
        { agent: Agent.Claude, file: 'mcp-config-snippets/claude.json' },
      ],
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
    mockConfigService.loadConfig.mockResolvedValue(
      makeConfig({
        mcp: { enabled: false, scope: 'disabled', prompted: true },
      }),
    );
    await command.run('enable');
    expect(output()).toContain('scope is currently "disabled"');
    expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
  });

  it('prints report with "skipped-existing" project writes', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    mockMcpService.install.mockResolvedValue({
      projectWrites: [
        { agent: Agent.Claude, file: '.mcp.json', action: 'skipped-existing' },
      ],
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

  it('rejects invalid --scope in install', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    await command.run('install', { scope: 'invalid' });
    expect(output()).toContain('Invalid --scope value');
  });

  it('handles "disabled" scope in install', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    await command.run('install', { scope: 'disabled' });
    expect(output()).toContain('Scope is "disabled"');
  });

  describe('installPrompt Logic', () => {
    it('should cover the userPrompt callback in actionInstall', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());
      mockMcpService.install.mockImplementation(async (opts: any) => {
        if (opts.userScopePrompt) {
          await opts.userScopePrompt(Agent.Claude, '/home/.mcp.json');
        }
        return {
          projectWrites: [],
          userWrites: [],
          snippets: [],
          declined: [],
          unsupported: [],
        };
      });

      vi.mocked(inquirer.prompt).mockResolvedValue({ ok: true });

      await command.run('install', { scope: 'user' });

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'ok' })]),
      );
    });

    it('enable global mode asks per user-scope file and writes it when accepted', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'user',
            prompted: true,
            via: 'global',
          },
        }),
      );
      command.setGlobalInstallerForTesting(vi.fn());
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );
      let consent: boolean | undefined;
      mockMcpService.install.mockImplementation(
        async (opts: Parameters<McpConfigService['install']>[0]) => {
          consent = await opts.userScopePrompt?.(
            Agent.Claude,
            '/home/.claude.json',
          );
          return {
            projectWrites: [
              { agent: Agent.Claude, file: '.mcp.json', action: 'added' },
            ],
            userWrites: consent
              ? [
                  {
                    agent: Agent.Claude,
                    file: '/home/.claude.json',
                    action: 'added',
                  },
                ]
              : [],
            snippets: [],
            declined: consent
              ? []
              : [{ agent: Agent.Claude, file: '/home/.claude.json' }],
            unsupported: [],
          };
        },
      );
      vi.mocked(inquirer.prompt).mockResolvedValue({ ok: true });

      await command.run('enable');

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'ok', type: 'confirm' }),
        ]),
      );
      expect(consent).toBe(true);
      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({
            scope: 'user',
            via: 'global',
            enabled: true,
          }),
          userScopePrompt: expect.any(Function),
        }),
      );
      expect(output()).toContain('Project-scope writes');
      expect(output()).toContain('User-scope writes');
      expect(process.exitCode).toBeUndefined();
    });

    it('enable global mode records a declined user-scope file without writing it', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'user',
            prompted: true,
            via: 'global',
          },
        }),
      );
      command.setGlobalInstallerForTesting(vi.fn());
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );
      let consent: boolean | undefined;
      mockMcpService.install.mockImplementation(
        async (opts: Parameters<McpConfigService['install']>[0]) => {
          consent = await opts.userScopePrompt?.(
            Agent.Claude,
            '/home/.claude.json',
          );
          return {
            projectWrites: [],
            userWrites: [],
            snippets: [],
            declined: consent
              ? []
              : [{ agent: Agent.Claude, file: '/home/.claude.json' }],
            unsupported: [],
          };
        },
      );
      vi.mocked(inquirer.prompt).mockResolvedValue({ ok: false });

      await command.run('enable');

      expect(consent).toBe(false);
      expect(output()).toContain('User-scope declined');
    });
  });

  it('rejects invalid --from value in uninstall', async () => {
    mockConfigService.loadConfig.mockResolvedValue(makeConfig());
    await command.run('uninstall', { from: 'invalid' });
    expect(output()).toContain('--from must be: project | user | all');
    expect(mockMcpService.uninstall).not.toHaveBeenCalled();
  });

  describe('McpCommand - Additional Branch Coverage', () => {
    it('status with undefined config.mcp, mcp.version defined, and project/user undefined in rows', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: undefined,
        }),
      );
      mockMcpService.status.mockResolvedValue([
        { agent: Agent.Claude, project: undefined, user: undefined },
      ]);

      // Temporary override to check version print
      const configWithVersion = makeConfig({
        mcp: {
          enabled: true,
          scope: 'project',
          prompted: true,
          version: '1.2.3',
        },
      });
      mockConfigService.loadConfig.mockResolvedValueOnce(configWithVersion);

      await command.run('status');
      expect(output()).toContain('version : 1.2.3');
      expect(output()).toContain('project: —   user: —');
    });

    it('install action with projectWrites having action updated', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());
      mockMcpService.install.mockResolvedValue({
        projectWrites: [
          { agent: Agent.Claude, file: '.mcp.json', action: 'updated' },
        ],
        userWrites: [],
        snippets: [],
        declined: [],
        unsupported: [],
      });

      await command.run('install');
      expect(output()).toContain('~ updated');
    });

    it('enable and disable action with config.mcp undefined', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: undefined,
        }),
      );

      await command.run('enable');
      expect(mockConfigService.saveConfig).toHaveBeenCalled();

      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: undefined,
        }),
      );
      await command.run('disable');
      expect(mockConfigService.saveConfig).toHaveBeenCalled();
    });
  });

  describe('launch mode (via)', () => {
    it('status prints via, resolved launch command, pin, and detected global version', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: true,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      mockMcpService.status.mockResolvedValue([
        { agent: Agent.Claude, project: true, user: false },
      ]);
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );

      await command.run('status');

      expect(output()).toContain('via     : global');
      expect(output()).toContain('launch  : npx -y --prefer-offline');
      expect(output()).toContain(`pin     : ${MCP_COMPATIBLE_VERSION}`);
      expect(output()).toContain(`global  : ${MCP_COMPATIBLE_VERSION}`);
      expect(mockMcpService.buildEntry).toHaveBeenCalledWith({
        version: undefined,
        via: 'global',
      });
      expect(output()).not.toContain('Global ags-mcp is');
    });

    it('status warns when the detected global version differs from the pin', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: true, scope: 'project', prompted: true },
        }),
      );
      mockMcpService.status.mockResolvedValue([
        { agent: Agent.Claude, project: true, user: false },
      ]);
      mockMcpService.detectGlobalVersion.mockReturnValue('0.7.0');

      await command.run('status');

      expect(output()).toContain('Global ags-mcp is 0.7.0');
      expect(output()).toContain(
        `npm i -g agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
    });

    it('"via" persists the launch mode', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('via', { via: 'global' });

      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ via: 'global' }),
        }),
      );
      expect(output()).toContain('MCP launch mode set to "global"');
    });

    it('"via" accepts a positional value', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('via', {
        _: ['npx'],
      } as unknown as Record<string, string>);

      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ via: 'npx' }),
        }),
      );
    });

    it('rejects an invalid "via" value', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('via', { via: 'bogus' });

      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('Invalid via');
    });

    it('install --via overrides the mode for that run without persisting', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: true, scope: 'project', prompted: true },
        }),
      );
      mockMcpService.install.mockResolvedValue({
        projectWrites: [],
        userWrites: [],
        snippets: [],
        declined: [],
        unsupported: [],
      });

      await command.run('install', { via: 'global' });

      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ via: 'global' }),
        }),
      );
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
    });

    it('install rejects an invalid --via value', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('install', { via: 'bogus' });

      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(output()).toContain('Invalid --via value');
    });

    it('snippets --via overrides the mode', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());
      mockMcpService.install.mockResolvedValue({
        projectWrites: [],
        userWrites: [],
        snippets: [{ agent: Agent.Claude, file: 'claude.json' }],
        declined: [],
        unsupported: [],
      });

      await command.run('snippets', { via: 'global' });

      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({
            via: 'global',
            scope: 'snippets-only',
          }),
        }),
      );
    });

    it('enable --via installs configs with the override but does not persist it', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: false, scope: 'project', prompted: false },
        }),
      );
      mockMcpService.install.mockResolvedValue({
        projectWrites: [],
        userWrites: [],
        snippets: [],
        declined: [],
        unsupported: [],
      });

      await command.run('enable', { via: 'npx' });

      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ via: 'npx', enabled: true }),
        }),
      );
      const saved = mockConfigService.saveConfig.mock.calls[0][0];
      expect(saved.mcp?.via).toBeUndefined();
    });

    it('enable rejects an invalid --via value', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('enable', { via: 'bogus' });

      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('Invalid --via value');
    });

    it('snippets rejects an invalid --via value', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('snippets', { via: 'bogus' });

      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(output()).toContain('Invalid --via value');
    });

    it('status prints the configured entry and warns on pin drift', async () => {
      const stale = {
        command: 'npx',
        args: ['-y', '--prefer-offline', 'agent-skills-standard-mcp@0.6.1'],
      };
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: true, scope: 'project', prompted: true },
        }),
      );
      mockMcpService.status.mockResolvedValue([
        {
          agent: Agent.Claude,
          project: true,
          user: false,
          projectEntry: stale,
          userEntry: null,
        },
      ]);

      await command.run('status');

      expect(output()).toContain(
        'project: ✓ npx -y --prefer-offline agent-skills-standard-mcp@0.6.1',
      );
      expect(output()).toContain(
        'MCP pin drift: claude project pins npx -y --prefer-offline agent-skills-standard-mcp@0.6.1',
      );
      expect(output()).toContain(
        `this CLI expects npx -y --prefer-offline agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(output()).toContain(
        'Run `ags sync` (or `ags mcp install`) to refresh; existing agents pick it up on their next MCP start.',
      );
    });

    it('status stays silent when the configured entry matches the expected one', async () => {
      const expected = {
        command: 'npx',
        args: [
          '-y',
          '--prefer-offline',
          `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
        ],
      };
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: true, scope: 'project', prompted: true },
        }),
      );
      mockMcpService.status.mockResolvedValue([
        {
          agent: Agent.Claude,
          project: true,
          user: false,
          projectEntry: expected,
          userEntry: null,
        },
      ]);

      await command.run('status');

      expect(output()).not.toContain('MCP pin drift');
      expect(output()).toContain(
        `project: ✓ npx -y --prefer-offline agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
    });

    it('status warns on user-scope drift too', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: true, scope: 'user', prompted: true },
        }),
      );
      mockMcpService.status.mockResolvedValue([
        {
          agent: Agent.Claude,
          project: false,
          user: true,
          projectEntry: null,
          userEntry: {
            command: 'npx',
            args: ['-y', '--prefer-offline', 'agent-skills-standard-mcp@0.6.1'],
          },
        },
      ]);

      await command.run('status');

      expect(output()).toContain('MCP pin drift: claude user pins');
      expect(output()).toContain('project: ✗ (none)');
    });

    it('status renders (none) and stays silent when a present entry is unreadable', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: true, scope: 'project', prompted: true },
        }),
      );
      mockMcpService.status.mockResolvedValue([
        {
          agent: Agent.Claude,
          project: true,
          user: false,
          projectEntry: null,
          userEntry: null,
        },
      ]);

      await command.run('status');

      expect(output()).toContain('project: ✓ (none)');
      expect(output()).not.toContain('MCP pin drift');
    });

    it('status keeps a bare global entry clean and drift-free', async () => {
      const globalEntry = { command: 'ags-mcp', args: [] };
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: true,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      mockMcpService.buildEntry.mockReturnValue(globalEntry);
      mockMcpService.status.mockResolvedValue([
        {
          agent: Agent.Claude,
          project: true,
          user: false,
          projectEntry: globalEntry,
          userEntry: null,
        },
      ]);

      await command.run('status');

      expect(output()).toContain('project: ✓ ags-mcp');
      expect(output()).not.toContain('MCP pin drift');
    });

    it('status prints a bare binary as the launch line', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: true,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      mockMcpService.status.mockResolvedValue([]);
      mockMcpService.buildEntry.mockReturnValue({
        command: 'ags-mcp',
        args: [],
      });

      await command.run('status');

      expect(output()).toContain('launch  : ags-mcp');
    });

    it('scope user warns that writes prompt per file', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('scope', { scope: 'user' });

      expect(output()).toContain('prompted per file');
    });

    it('"via auto" explains the resolution order', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('via', { via: 'auto' });

      expect(output()).toContain('version-matched global ags-mcp');
    });

    it('enable --install-global reports a probe that finds no version', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());
      command.setGlobalInstallerForTesting(vi.fn());
      mockMcpService.detectGlobalVersion.mockReturnValue(null);

      await command.run('enable', { installGlobal: 'true' });

      expect(process.exitCode).toBe(1);
      expect(output()).toContain('reports no version');
    });

    it('enable --install-global installs the pinned package and verifies the probe', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: false, scope: 'project', prompted: false },
        }),
      );
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );

      await command.run('enable', { installGlobal: 'true' });

      expect(installer).toHaveBeenCalledWith(
        `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(mockConfigService.saveConfig).toHaveBeenCalled();
      expect(output()).toContain('installed and verified');
      expect(process.exitCode).toBeUndefined();
    });

    it('enable --install-global exits 1 on version mismatch and does not enable', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: false, scope: 'project', prompted: false },
        }),
      );
      command.setGlobalInstallerForTesting(vi.fn());
      mockMcpService.detectGlobalVersion.mockReturnValue('0.0.1');

      await command.run('enable', { installGlobal: 'true' });

      expect(process.exitCode).toBe(1);
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('reports 0.0.1');
      expect(output()).toContain(
        `npm i -g agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
    });

    it('enable --install-global exits 1 when npm fails', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());
      command.setGlobalInstallerForTesting(() => {
        throw new Error('npm failed');
      });

      await command.run('enable', { installGlobal: 'true' });

      expect(process.exitCode).toBe(1);
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('Global install failed');
    });

    it('enable with saved global mode installs the pin, verifies, and writes global configs', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'project',
            prompted: false,
            via: 'global',
          },
        }),
      );
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );
      mockMcpService.install.mockResolvedValue({
        projectWrites: [],
        userWrites: [],
        snippets: [],
        declined: [],
        unsupported: [],
      });

      await command.run('enable');

      expect(installer).toHaveBeenCalledWith(
        `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ enabled: true, via: 'global' }),
        }),
      );
      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ enabled: true, via: 'global' }),
        }),
      );
      expect(output()).toContain('installed and verified');
      expect(output()).toContain('launch mode "global"');
      expect(process.exitCode).toBeUndefined();
    });

    it('enable uses the effective configured pin, not the compiled default', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'project',
            prompted: true,
            via: 'global',
            version: '1.2.3',
          },
        }),
      );
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockMcpService.detectGlobalVersion.mockReturnValue('1.2.3');
      mockMcpService.install.mockResolvedValue({
        projectWrites: [],
        userWrites: [],
        snippets: [],
        declined: [],
        unsupported: [],
      });

      await command.run('enable');

      expect(installer).toHaveBeenCalledWith('agent-skills-standard-mcp@1.2.3');
      expect(process.exitCode).toBeUndefined();
    });

    it('enable --via global installs even when the saved mode differs', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'project',
            prompted: true,
            via: 'npx',
          },
        }),
      );
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );
      mockMcpService.install.mockResolvedValue({
        projectWrites: [],
        userWrites: [],
        snippets: [],
        declined: [],
        unsupported: [],
      });

      await command.run('enable', { via: 'global' });

      expect(installer).toHaveBeenCalledWith(
        `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ via: 'global', enabled: true }),
        }),
      );
      // Per-run override is not persisted.
      expect(mockConfigService.saveConfig.mock.calls[0][0].mcp?.via).toBe(
        'npx',
      );
      expect(output()).toContain('launch mode "global"');
    });

    it('enable --via npx skips the global install even when saved mode is global', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockMcpService.install.mockResolvedValue({
        projectWrites: [],
        userWrites: [],
        snippets: [],
        declined: [],
        unsupported: [],
      });

      await command.run('enable', { via: 'npx' });

      expect(installer).not.toHaveBeenCalled();
      expect(mockMcpService.detectGlobalVersion).not.toHaveBeenCalled();
      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ via: 'npx', enabled: true }),
        }),
      );
    });

    it('enable saved global mode aborts without enabling or installing on probe failure', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      command.setGlobalInstallerForTesting(vi.fn());
      mockMcpService.detectGlobalVersion.mockReturnValue(null);

      await command.run('enable');

      expect(process.exitCode).toBe(1);
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(output()).toContain('reports no version');
      expect(output()).toContain('`ags-mcp --version`');
      expect(output()).toContain('global bin directory is on PATH');
    });

    it('enable saved global mode aborts on installer failure', async () => {
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: false,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      command.setGlobalInstallerForTesting(() => {
        throw new Error('npm failed');
      });

      await command.run('enable');

      expect(process.exitCode).toBe(1);
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(output()).toContain('Global install failed');
    });
  });

  describe('upgrade', () => {
    const emptyReport = {
      projectWrites: [],
      userWrites: [],
      snippets: [],
      declined: [],
      unsupported: [],
    };

    function enabledConfig(): SkillConfig {
      return makeConfig({
        mcp: { enabled: true, scope: 'project', prompted: true, via: 'auto' },
      });
    }

    it('U1 installs and verifies the pin when the global install is stale', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());
      mockMcpService.install.mockResolvedValue(emptyReport);
      mockMcpService.detectGlobalVersion
        .mockReturnValueOnce('0.7.0')
        .mockReturnValue(MCP_COMPATIBLE_VERSION);

      await command.run('upgrade');

      expect(installer).toHaveBeenCalledWith(
        `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(output()).toContain('installed and verified');
      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ version: MCP_COMPATIBLE_VERSION }),
        }),
      );
      expect(process.exitCode).toBeUndefined();
    });

    it('U1 exits 1 with the manual command and writes no configs when the install fails', async () => {
      const installer = vi.fn(() => {
        throw new Error('npm failed');
      });
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());
      mockMcpService.detectGlobalVersion.mockReturnValue('0.7.0');

      await command.run('upgrade');

      expect(process.exitCode).toBe(1);
      expect(output()).toContain('Global install failed');
      expect(output()).toContain(
        `npm i -g agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
    });

    it('U2 does not reinstall a global install already at the pin', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());
      mockMcpService.install.mockResolvedValue(emptyReport);
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );

      await command.run('upgrade');

      expect(installer).not.toHaveBeenCalled();
      expect(output()).toContain('already at');
      expect(output()).toContain('no install needed');
      expect(process.exitCode).toBeUndefined();
    });

    it('U3 --dry-run prints the plan and performs no install or write', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());
      mockMcpService.detectGlobalVersion.mockReturnValue('0.7.0');

      await command.run('upgrade', { dryRun: 'true' });

      expect(installer).not.toHaveBeenCalled();
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('Dry run');
      expect(output()).toContain(
        `0.7.0 → agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(output()).toContain('refresh (scope project');
      // buildEntry keeps npx on win32, so the note only applies elsewhere.
      if (process.platform !== 'win32') {
        expect(output()).toContain(
          '"auto" entries resolve to the global binary',
        );
      }
      expect(process.exitCode).toBeUndefined();
    });

    it('U4 refreshes enabled configs at the pin and honors --via for this run only', async () => {
      command.setGlobalInstallerForTesting(vi.fn());
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());
      mockMcpService.install.mockResolvedValue(emptyReport);
      mockMcpService.detectGlobalVersion.mockReturnValue(
        MCP_COMPATIBLE_VERSION,
      );

      await command.run('upgrade', { via: 'global' });

      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({
            enabled: true,
            scope: 'project',
            via: 'global',
            version: MCP_COMPATIBLE_VERSION,
          }),
          userScopePrompt: expect.any(Function),
        }),
      );
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('next MCP start');
    });

    it('U4 writes no configs for disabled and snippets-only projects', async () => {
      command.setGlobalInstallerForTesting(vi.fn());
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: false, scope: 'project', prompted: false },
        }),
      );

      await command.run('upgrade');

      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(output()).toContain('none (MCP disabled)');

      vi.clearAllMocks();
      logs = [];
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: true, scope: 'snippets-only', prompted: true },
        }),
      );

      await command.run('upgrade');

      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(output()).toContain('none (scope snippets-only)');
      expect(output()).toContain('No runtime configs to refresh');
    });

    it('U5 prints guidance and exits 0 with no global install and no enabled configs', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: false, scope: 'disabled', prompted: false },
        }),
      );
      mockMcpService.detectGlobalVersion.mockReturnValue(null);

      await command.run('upgrade');

      expect(installer).not.toHaveBeenCalled();
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('no readable global ags-mcp detected');
      expect(output()).toContain('`ags mcp enable`');
      expect(output()).not.toContain('next MCP start');
      expect(process.exitCode).toBeUndefined();
    });

    it('F1 targets the project pin from mcp.version, not the compiled pin', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: true,
            scope: 'project',
            prompted: true,
            via: 'auto',
            version: '0.7.5',
          },
        }),
      );
      mockMcpService.install.mockResolvedValue(emptyReport);
      mockMcpService.detectGlobalVersion
        .mockReturnValueOnce('0.7.0')
        .mockReturnValue('0.7.5');

      await command.run('upgrade');

      expect(installer).toHaveBeenCalledWith('agent-skills-standard-mcp@0.7.5');
      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ version: '0.7.5' }),
        }),
      );
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(output()).toContain('project pin 0.7.5 wins');
      expect(process.exitCode).toBeUndefined();
    });

    it('F2 refuses the config refresh when via is global and no global binary is readable', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: true,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      mockMcpService.detectGlobalVersion.mockReturnValue(null);

      await command.run('upgrade');

      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(output()).toContain(
        `npm i -g agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(output()).toContain('needs a global install');
      expect(output()).not.toContain('next MCP start');
    });

    it('R1 dry-run refuses unusable global mode instead of printing a success plan', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: {
            enabled: true,
            scope: 'project',
            prompted: true,
            via: 'global',
          },
        }),
      );
      mockMcpService.detectGlobalVersion.mockReturnValue(null);

      await command.run('upgrade', { dryRun: 'true' });

      expect(process.exitCode).toBe(1);
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(installer).not.toHaveBeenCalled();
      expect(output()).toContain('needs a global install');
      expect(output()).toContain(
        `npm i -g agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(output()).not.toContain('Dry run: no global install');
      expect(output()).not.toContain('"auto" entries resolve');
    });

    it('F2 allows auto mode to fall back to npx when no global binary is readable', async () => {
      command.setGlobalInstallerForTesting(vi.fn());
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());
      mockMcpService.install.mockResolvedValue(emptyReport);
      mockMcpService.detectGlobalVersion.mockReturnValue(null);

      await command.run('upgrade');

      expect(mockMcpService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp: expect.objectContaining({ enabled: true, via: 'auto' }),
        }),
      );
      expect(process.exitCode).toBeUndefined();
    });

    it('F4 still reports the host restart when a global upgrade happens out of config scope', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(
        makeConfig({
          mcp: { enabled: false, scope: 'disabled', prompted: false },
        }),
      );
      mockMcpService.detectGlobalVersion
        .mockReturnValueOnce('0.7.0')
        .mockReturnValue(MCP_COMPATIBLE_VERSION);

      await command.run('upgrade');

      expect(installer).toHaveBeenCalledWith(
        `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
      );
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(output()).toContain('next MCP start');
      expect(process.exitCode).toBeUndefined();
    });

    it('F3 rejects --dry-run for install and performs no writes', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());

      await command.run('install', { dryRun: 'true' });

      expect(process.exitCode).toBe(1);
      expect(output()).toContain('only supported by');
      expect(installer).not.toHaveBeenCalled();
      expect(mockMcpService.install).not.toHaveBeenCalled();
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
    });

    it('U6 rejects an invalid --via without touching state', async () => {
      const installer = vi.fn();
      command.setGlobalInstallerForTesting(installer);
      mockConfigService.loadConfig.mockResolvedValue(enabledConfig());
      mockMcpService.detectGlobalVersion.mockReturnValue('0.7.0');

      await command.run('upgrade', { via: 'bogus' });

      expect(output()).toContain('Invalid --via value');
      expect(installer).not.toHaveBeenCalled();
      expect(mockMcpService.install).not.toHaveBeenCalled();
    });

    it('U7 lists upgrade among the valid actions', async () => {
      mockConfigService.loadConfig.mockResolvedValue(makeConfig());

      await command.run('nope');

      expect(output()).toContain('snippets, upgrade');
    });
  });
});
