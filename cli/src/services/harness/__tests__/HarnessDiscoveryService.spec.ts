import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_LIMITS,
  ExecFileFn,
  getSanitizedEnv,
  HarnessDiscoveryService,
  HarnessInventory,
} from '../HarnessDiscoveryService';
import { HarnessConfig, HarnessError } from '../HarnessSetupService';

describe('HarnessDiscoveryService', () => {
  const validLocalConfig: HarnessConfig = {
    schemaVersion: 1,
    paseoCommand: '/usr/local/bin/paseo',
  };

  const sampleProjects = [
    {
      projectId: 'prj_1',
      name: 'agentic-ezrx',
      kind: 'git',
      path: '/Users/test/projects/agentic-ezrx',
    },
    {
      projectId: 'prj_2',
      name: 'agent-skills-standard',
      kind: 'git',
      path: '/Users/test/projects/agent-skills-standard',
    },
  ];

  it('discover_LocalValidProjectsAndEmptyHosts_ReturnsCompleteInventory', async () => {
    const executedCalls: Array<{ file: string; args: string[] }> = [];

    const mockExecFile: ExecFileFn = async (file, args, _options) => {
      executedCalls.push({ file, args });
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify([]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected command: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory: HarnessInventory =
      await service.discover(validLocalConfig);

    expect(inventory.schemaVersion).toBe(1);
    expect(inventory.complete).toBe(true);
    expect(inventory.hosts).toHaveLength(1);

    const localHost = inventory.hosts[0];
    expect(localHost.hostKey).toBe('local');
    expect(localHost.status).toBe('reachable');
    expect(localHost.error).toBeUndefined();
    expect(localHost.projects).toEqual(sampleProjects);

    expect(executedCalls).toEqual([
      { file: '/usr/local/bin/paseo', args: ['project', 'ls', '--json'] },
      { file: '/usr/local/bin/paseo', args: ['host', 'ls', '--json'] },
    ]);
  });

  it('discover_ExplicitOrigin_PassesHostArgAndUsesOriginAsHostKey', async () => {
    const executedCalls: Array<{ file: string; args: string[] }> = [];

    const mockExecFile: ExecFileFn = async (file, args, _options) => {
      executedCalls.push({ file, args });
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify([]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected command: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const config: HarnessConfig = {
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
      origin: 'build-box:6767',
    };

    const inventory = await service.discover(config);

    expect(inventory.complete).toBe(true);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].hostKey).toBe('build-box:6767');
    expect(inventory.hosts[0].status).toBe('reachable');
    expect(inventory.hosts[0].projects).toEqual(sampleProjects);

    expect(executedCalls).toEqual([
      {
        file: '/usr/local/bin/paseo',
        args: ['--host', 'build-box:6767', 'project', 'ls', '--json'],
      },
      {
        file: '/usr/local/bin/paseo',
        args: ['--host', 'build-box:6767', 'host', 'ls', '--json'],
      },
    ]);
  });

  it('discover_InvalidOriginInConfig_ThrowsSanitizedError', async () => {
    const service = new HarnessDiscoveryService(async () => ({
      stdout: '[]',
      stderr: '',
    }));

    const configWithBadOrigin: HarnessConfig = {
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
      origin: 'http://user:pass@evil.host',
    };

    await expect(service.discover(configWithBadOrigin)).rejects.toThrowError(
      /INVALID_ORIGIN/,
    );
  });

  it('discover_InvalidPaseoCommand_ThrowsInvalidConfig', async () => {
    const service = new HarnessDiscoveryService();

    // Relative command
    await expect(
      service.discover({
        schemaVersion: 1,
        paseoCommand: 'paseo',
      }),
    ).rejects.toThrow(HarnessError);

    // Command with NUL byte
    await expect(
      service.discover({
        schemaVersion: 1,
        paseoCommand: '/bin/paseo\0evil',
      }),
    ).rejects.toThrow(HarnessError);
  });

  it('discover_OriginProjectLsFails_ReturnsUnreachableOriginAndIncomplete', async () => {
    const mockExecFile: ExecFileFn = async () => {
      const err = new Error('Process exited with code 1');
      throw err;
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].hostKey).toBe('local');
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('PROCESS_FAILED');
    expect(inventory.hosts[0].projects).toEqual([]);
  });

  it('discover_OriginHostLsFails_KeepsOriginProjectsAndReturnsIncomplete', async () => {
    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        throw new Error('Host service offline');
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    // Origin projects must be preserved
    expect(inventory.hosts[0].hostKey).toBe('local');
    expect(inventory.hosts[0].status).toBe('reachable');
    expect(inventory.hosts[0].projects).toEqual(sampleProjects);
  });

  it('discover_MalformedJsonInOriginProjectLs_ReturnsIncompleteWithMalformedOutput', async () => {
    const mockExecFile: ExecFileFn = async () => {
      return {
        stdout: 'not-json-content',
        stderr: '',
      };
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].hostKey).toBe('local');
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('MALFORMED_OUTPUT');
  });

  it('discover_NonArrayInOriginProjectLs_ReturnsIncompleteWithMalformedOutput', async () => {
    const mockExecFile: ExecFileFn = async () => {
      return {
        stdout: JSON.stringify({ message: 'not an array' }),
        stderr: '',
      };
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('MALFORMED_OUTPUT');
  });

  it('discover_MalformedProjectItem_ReturnsIncompleteWithMalformedOutput', async () => {
    const mockExecFile: ExecFileFn = async () => {
      return {
        stdout: JSON.stringify([
          {
            projectId: 12345, // bad type, should be string
            name: 'broken',
            path: '/path',
            kind: 'git',
          },
        ]),
        stderr: '',
      };
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('MALFORMED_OUTPUT');
  });

  it('discover_ProjectCountExceedsLimit_TruncatesAndReturnsIncompleteWithProjectLimitExceeded', async () => {
    const overflowProjects = Array.from({ length: 10005 }, (_, i) => ({
      projectId: `prj_${i}`,
      name: `project-${i}`,
      path: `/path/${i}`,
      kind: 'git',
    }));

    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(overflowProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify([]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts[0].status).toBe('reachable');
    expect(inventory.hosts[0].projects).toHaveLength(
      DISCOVERY_LIMITS.MAX_PROJECTS_PER_HOST,
    );
    expect(inventory.hosts[0].error).toBe('PROJECT_LIMIT_EXCEEDED');
  });

  it('discover_DisabledRemoteHost_ReturnsUnsupportedHostDisabledAndIncomplete', async () => {
    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify([
            {
              registrationId: 'hst_disabled_node',
              label: 'offline-worker',
              status: 'disabled',
              targetDescription: 'ssh://worker-box',
            },
          ]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    const localHost = inventory.hosts[0];
    expect(localHost.hostKey).toBe('local');
    expect(localHost.status).toBe('reachable');

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('hst_disabled_node');
    expect(remoteHost.status).toBe('unsupported');
    expect(remoteHost.error).toBe('HOST_DISABLED');
    expect(remoteHost.projects).toEqual([]);
  });

  it('discover_OfflineRemoteHost_ReturnsUnreachableHostOfflineAndIncomplete', async () => {
    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify([
            {
              registrationId: 'hst_offline_node',
              label: 'build-node-2',
              status: 'offline',
              targetDescription: 'ssh://offline-box',
            },
          ]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('hst_offline_node');
    expect(remoteHost.status).toBe('unreachable');
    expect(remoteHost.error).toBe('HOST_OFFLINE');
    expect(remoteHost.projects).toEqual([]);
  });

  it('discover_RegisteredRemoteHost_ReturnsUnsupportedRemoteRoutingUnavailableAndIncomplete', async () => {
    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify([
            {
              registrationId: 'hst_live_remote',
              serverId: 'srv_remote_1',
              label: 'remote-worker',
              source: 'cli',
              enabled: true,
              status: 'online',
              targetDescription: 'ssh://remote-worker.internal',
            },
          ]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    expect(inventory.hosts[0].hostKey).toBe('local');
    expect(inventory.hosts[0].status).toBe('reachable');
    expect(inventory.hosts[0].projects).toEqual(sampleProjects);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('hst_live_remote');
    expect(remoteHost.status).toBe('unsupported');
    expect(remoteHost.error).toBe('REMOTE_ROUTING_UNAVAILABLE');
    expect(remoteHost.projects).toEqual([]);
  });

  it('discover_UnknownRemoteHostShape_ReturnsUnsupportedFormatAndIncomplete', async () => {
    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(['not-an-object']),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('host_1');
    expect(remoteHost.status).toBe('unsupported');
    expect(remoteHost.error).toBe('UNKNOWN_HOST_SHAPE');
    expect(remoteHost.projects).toEqual([]);
  });

  it('discover_RemoteHostCountExceedsLimit_EnforcesMax32RemoteHosts', async () => {
    const rawHosts = Array.from({ length: 35 }, (_, i) => ({
      registrationId: `hst_${i}`,
      status: 'online',
    }));

    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(rawHosts),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    // local host + 32 remote hosts (REMOTE_ROUTING_UNAVAILABLE) + 3 overflow remote hosts
    expect(inventory.hosts).toHaveLength(1 + 35);

    // First 32 remote hosts are marked REMOTE_ROUTING_UNAVAILABLE
    for (let i = 1; i <= 32; i++) {
      expect(inventory.hosts[i].status).toBe('unsupported');
      expect(inventory.hosts[i].error).toBe('REMOTE_ROUTING_UNAVAILABLE');
    }
    // Remote hosts beyond 32 are marked HOST_LIMIT_EXCEEDED
    for (let i = 33; i <= 35; i++) {
      expect(inventory.hosts[i].status).toBe('unsupported');
      expect(inventory.hosts[i].error).toBe('HOST_LIMIT_EXCEEDED');
    }
  });

  it('discover_SubprocessTimeout_ReturnsTimeoutAndIncomplete', async () => {
    const mockExecFile: ExecFileFn = async () => {
      const err = Object.assign(new Error('Subprocess timed out'), {
        code: 'ETIMEDOUT',
        killed: true,
      });
      throw err;
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('TIMEOUT');
  });

  it('discover_BufferOverflow_ReturnsBufferOverflowAndIncomplete', async () => {
    const mockExecFile: ExecFileFn = async () => {
      const err = Object.assign(new Error('maxBuffer length exceeded'), {
        code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
      });
      throw err;
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('BUFFER_OVERFLOW');
  });

  it('discover_DeduplicationPreservesDistinctRegistrations', async () => {
    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify([
            {
              registrationId: 'reg_alpha',
              label: 'shared-label',
              status: 'online',
            },
            {
              registrationId: 'reg_beta',
              label: 'shared-label', // Same label, different registrationId
              status: 'online',
            },
            {
              registrationId: 'reg_alpha', // Duplicate registrationId
              status: 'online',
            },
          ]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(3); // local + reg_alpha + reg_beta (duplicate reg_alpha deduped)
    expect(inventory.hosts[1].hostKey).toBe('reg_alpha');
    expect(inventory.hosts[2].hostKey).toBe('reg_beta');
  });

  it('discover_SDKStyleSelfHost_SeedsSelfIdentityAndDedupesMatchingRemoteHost', async () => {
    const mockExecFile: ExecFileFn = async (_file, args) => {
      if (args.includes('project') && args.includes('ls')) {
        return {
          stdout: JSON.stringify(sampleProjects),
          stderr: '',
        };
      }
      if (args.includes('host') && args.includes('ls')) {
        return {
          stdout: JSON.stringify({
            self: {
              serverId: 'srv_myself',
            },
            hosts: [
              {
                registrationId: 'reg_self_mirror',
                serverId: 'srv_myself', // Identical serverId as self -> deduped
                status: 'online',
              },
              {
                registrationId: 'reg_actual_remote',
                serverId: 'srv_remote_worker',
                status: 'online',
              },
            ],
          }),
          stderr: '',
        };
      }
      throw new Error(`Unexpected: ${args.join(' ')}`);
    };

    const service = new HarnessDiscoveryService(mockExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2); // local + reg_actual_remote (self mirror deduped)
    expect(inventory.hosts[1].hostKey).toBe('reg_actual_remote');
  });

  it('discover_SanitizedEnv_ExcludesAmbientSecrets', () => {
    const originalEnv = process.env;
    try {
      process.env = {
        ...originalEnv,
        API_KEY: 'secret_key_12345',
        AWS_SECRET_ACCESS_KEY: 'top_secret',
        CUSTOM_PASS: 'password123',
        PATH: '/usr/bin:/bin',
        HOME: '/Users/test',
      };

      const sanitized = getSanitizedEnv();
      expect(sanitized.PATH).toBe('/usr/bin:/bin');
      expect(sanitized.HOME).toBe('/Users/test');
      expect(sanitized.API_KEY).toBeUndefined();
      expect(sanitized.AWS_SECRET_ACCESS_KEY).toBeUndefined();
      expect(sanitized.CUSTOM_PASS).toBeUndefined();
    } finally {
      process.env = originalEnv;
    }
  });
});
