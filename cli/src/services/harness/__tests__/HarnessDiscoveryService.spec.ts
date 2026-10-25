import { describe, expect, it, vi } from 'vitest';
import { HarnessDiscoveryService } from '../HarnessDiscoveryService';
import type { HarnessInventory } from '../HarnessDiscoveryService';
import type { HarnessConfig } from '../HarnessSetupService';
import { HarnessError } from '../HarnessSetupService';
import { DISCOVERY_LIMITS } from '../PaseoSdkConnection';
import type {
  ConnectedPaseoOrigin,
  ExecFileFn,
  PaseoConnectionFactory,
  PaseoDriver,
  PaseoOriginApi,
  PaseoRemoteApi,
  PaseoSdkWorkspace,
  PaseoSdkWorkspaceListOptions,
  PaseoSdkWorkspaceListResult,
  RawHostSummary,
  RawProjectItem,
} from '../PaseoSdkConnection';
import {
  isValidWorkspaceId,
  isValidWorkspacePath,
  getProjectCheckoutPaths,
} from '../HarnessDiscoveryService';

describe('HarnessDiscoveryService', () => {
  const validLocalConfig: HarnessConfig = {
    schemaVersion: 1,
    paseoCommand: '/usr/local/bin/paseo',
  };

  const sampleRawProjects: RawProjectItem[] = [
    {
      projectId: 'proj_alpha',
      projectKey: 'remote:github.com/org/alpha',
      projectDisplayName: 'Alpha Project',
      projectRootPath: '/workspace/alpha',
      projectKind: 'git',
    },
    {
      projectId: 'proj_beta',
      projectKey: 'remote:github.com/org/beta',
      projectDisplayName: 'Beta Project',
      projectRootPath: '/workspace/beta',
      projectKind: 'git',
    },
  ];

  const defaultMockExecFile: ExecFileFn = async () => ({
    stdout: JSON.stringify({
      localDaemon: 'running',
      listen: '127.0.0.1:6767',
      serverId: 'srv_origin_local',
    }),
    stderr: '',
  });

  /**
   * Untrusted wire seam for adversarial fixtures.
   *
   * The SDK client is an external boundary, so malformed list payloads are
   * injected as `unknown` and handed to the production validator unchanged.
   * This is the only place adversarial fixture data is cast to the declared
   * client result type: nothing is normalized, repaired, or re-shaped, and the
   * cast cannot hide a production defect because every other field stays as
   * the test wrote it.
   */
  function untrustedWorkspacePage(page: unknown): PaseoSdkWorkspaceListResult {
    return page as PaseoSdkWorkspaceListResult;
  }

  function createMockConnectionFactory(options?: {
    originProjects?: RawProjectItem[];
    originProjectsResponse?: unknown;
    originHosts?: RawHostSummary[];
    selfServerId?: string;
    onOriginDispose?: () => void;
    onDriverClose?: () => void;
    onRemoteDispose?: (serverId: string) => void;
    remoteProjectsByServerId?: Record<string, RawProjectItem[]>;
    throwOnOriginConnect?: Error;
    throwOnOriginProjects?: Error;
    throwOnOriginHosts?: Error;
    throwOnRemoteClient?: Record<string, Error>;
    originWorkspaces?: PaseoSdkWorkspace[];
    originWorkspacePages?: PaseoSdkWorkspaceListResult[];
    /** Malformed pages returned verbatim through the untrusted wire seam. */
    originWorkspaceRawPages?: unknown[];
    remoteWorkspacesByServerId?: Record<string, PaseoSdkWorkspace[]>;
    remoteWorkspacePagesByServerId?: Record<
      string,
      PaseoSdkWorkspaceListResult[]
    >;
    throwOnOriginWorkspaces?: Error;
    throwOnRemoteWorkspaces?: Record<string, Error>;
    disableOriginWorkspaces?: boolean;
    disableRemoteWorkspaces?: Record<string, boolean>;
    onOriginWorkspacesList?: (options?: PaseoSdkWorkspaceListOptions) => void;
    onRemoteWorkspacesList?: (
      serverId: string,
      options?: PaseoSdkWorkspaceListOptions,
    ) => void;
  }): PaseoConnectionFactory {
    return {
      async connectOrigin(): Promise<ConnectedPaseoOrigin> {
        if (options?.throwOnOriginConnect) {
          throw options.throwOnOriginConnect;
        }

        const driver: PaseoDriver = {
          async connect() {},
          async close() {
            options?.onDriverClose?.();
          },
        };

        const api: PaseoOriginApi = {
          async dispose() {
            options?.onOriginDispose?.();
          },
          hosts: {
            async list() {
              if (options?.throwOnOriginHosts) {
                throw options.throwOnOriginHosts;
              }
              return {
                self: {
                  serverId: options?.selfServerId ?? 'srv_origin_local',
                  label: 'Local Host',
                },
                hosts: options?.originHosts ?? [],
              };
            },
            async client(serverId: string): Promise<PaseoRemoteApi> {
              const remoteError = options?.throwOnRemoteClient?.[serverId];
              if (remoteError) {
                throw remoteError;
              }

              const remoteProjects =
                options?.remoteProjectsByServerId?.[serverId] ?? [];

              const disableRemoteWs =
                options?.disableRemoteWorkspaces?.[serverId];

              let remoteWsPageIndex = 0;
              const remoteWorkspaces = !disableRemoteWs
                ? {
                    async list(
                      listOpts?: PaseoSdkWorkspaceListOptions,
                    ): Promise<PaseoSdkWorkspaceListResult> {
                      options?.onRemoteWorkspacesList?.(serverId, listOpts);
                      const throwErr =
                        options?.throwOnRemoteWorkspaces?.[serverId];
                      if (throwErr) {
                        throw throwErr;
                      }
                      const pages =
                        options?.remoteWorkspacePagesByServerId?.[serverId];
                      if (pages) {
                        return (
                          pages[remoteWsPageIndex++] ?? {
                            requestId: 'req_rws',
                            entries: [],
                            pageInfo: {
                              nextCursor: null,
                              prevCursor: null,
                              hasMore: false,
                            },
                          }
                        );
                      }
                      return {
                        requestId: 'req_rws',
                        entries:
                          options?.remoteWorkspacesByServerId?.[serverId] ?? [],
                        pageInfo: {
                          nextCursor: null,
                          prevCursor: null,
                          hasMore: false,
                        },
                      };
                    },
                  }
                : undefined;

              return {
                async dispose() {
                  options?.onRemoteDispose?.(serverId);
                },
                projects: {
                  async list() {
                    return { projects: remoteProjects };
                  },
                },
                ...(remoteWorkspaces ? { workspaces: remoteWorkspaces } : {}),
              };
            },
          },
          projects: {
            async list() {
              if (options?.throwOnOriginProjects) {
                throw options.throwOnOriginProjects;
              }
              if (options?.originProjectsResponse !== undefined) {
                // Injected verbatim: malformed responses (null, nonarray, ...)
                // must reach the production parser unchanged.
                return options.originProjectsResponse as {
                  requestId?: string;
                  projects: RawProjectItem[];
                };
              }
              return {
                requestId: 'req_123',
                projects: options?.originProjects ?? sampleRawProjects,
              };
            },
          },
          ...(options?.disableOriginWorkspaces
            ? {}
            : {
                workspaces: (() => {
                  let originWsPageIndex = 0;
                  return {
                    async list(
                      listOpts?: PaseoSdkWorkspaceListOptions,
                    ): Promise<PaseoSdkWorkspaceListResult> {
                      options?.onOriginWorkspacesList?.(listOpts);
                      if (options?.throwOnOriginWorkspaces) {
                        throw options.throwOnOriginWorkspaces;
                      }
                      if (options?.originWorkspaceRawPages) {
                        const rawPage =
                          options.originWorkspaceRawPages[originWsPageIndex++];
                        if (rawPage !== undefined) {
                          return untrustedWorkspacePage(rawPage);
                        }
                      }
                      if (options?.originWorkspacePages) {
                        return (
                          options.originWorkspacePages[originWsPageIndex++] ?? {
                            requestId: 'req_ws',
                            entries: [],
                            pageInfo: {
                              nextCursor: null,
                              prevCursor: null,
                              hasMore: false,
                            },
                          }
                        );
                      }
                      return {
                        requestId: 'req_ws',
                        entries: options?.originWorkspaces ?? [],
                        pageInfo: {
                          nextCursor: null,
                          prevCursor: null,
                          hasMore: false,
                        },
                      };
                    },
                  };
                })(),
              }),
        };

        return { driver, api };
      },
    };
  }

  it('discover_LocalValidProjectsAndEmptyHosts_ReturnsCompleteInventory', async () => {
    let originDisposed = false;
    let driverClosed = false;

    const mockFactory = createMockConnectionFactory({
      originProjects: sampleRawProjects,
      originHosts: [],
      selfServerId: 'srv_origin_local',
      onOriginDispose: () => {
        originDisposed = true;
      },
      onDriverClose: () => {
        driverClosed = true;
      },
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory: HarnessInventory =
      await service.discover(validLocalConfig);

    expect(inventory.schemaVersion).toBe(1);
    expect(inventory.complete).toBe(true);
    expect(inventory.hosts).toHaveLength(1);

    const originHost = inventory.hosts[0];
    expect(originHost.hostKey).toBe('local');
    expect(originHost.status).toBe('reachable');
    expect(originHost.serverId).toBe('srv_origin_local');
    expect(originHost.projects).toHaveLength(2);
    expect(originHost.projects[0]).toEqual({
      projectId: 'proj_alpha',
      name: 'Alpha Project',
      path: '/workspace/alpha',
      kind: 'git',
      projectKey: 'remote:github.com/org/alpha',
      checkouts: [],
    });
    expect(originHost.projects[1]).toEqual({
      projectId: 'proj_beta',
      name: 'Beta Project',
      path: '/workspace/beta',
      kind: 'git',
      projectKey: 'remote:github.com/org/beta',
      checkouts: [],
    });

    expect(originDisposed).toBe(true);
    expect(driverClosed).toBe(true);
  });

  it('discover_ExplicitOrigin_PassesHostTargetAndUsesOriginAsHostKey', async () => {
    const config: HarnessConfig = {
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
      origin: '192.168.1.50:6767',
    };

    const mockFactory = createMockConnectionFactory({
      originProjects: sampleRawProjects,
      originHosts: [],
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(config);

    expect(inventory.complete).toBe(true);
    expect(inventory.hosts[0].hostKey).toBe('192.168.1.50:6767');
  });

  it('discover_InvalidOriginInConfig_ThrowsSanitizedError', async () => {
    const service = new HarnessDiscoveryService(defaultMockExecFile);

    await expect(
      service.discover({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
        origin: 'bad;origin',
      }),
    ).rejects.toThrow(HarnessError);

    await expect(
      service.discover({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
        origin: 'user@host:6767',
      }),
    ).rejects.toThrow(HarnessError);

    await expect(
      service.discover({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
        origin: '-flag',
      }),
    ).rejects.toThrow(HarnessError);
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

    // Empty command
    await expect(
      service.discover({
        schemaVersion: 1,
        paseoCommand: '   ',
      }),
    ).rejects.toThrow(HarnessError);

    // NUL character
    await expect(
      service.discover({
        schemaVersion: 1,
        paseoCommand: '/bin/paseo\0evil',
      }),
    ).rejects.toThrow(HarnessError);
  });

  it('discover_DaemonStatusFails_ReturnsUnreachableOriginAndIncomplete', async () => {
    const failingExecFile: ExecFileFn = async () => {
      const err = new Error('Process killed') as unknown as Record<
        string,
        unknown
      >;
      err.code = 'ETIMEDOUT';
      throw err;
    };

    const service = new HarnessDiscoveryService(failingExecFile);
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('TIMEOUT');
  });

  it('discover_OriginConnectionFails_ReturnsUnreachableOriginAndIncomplete', async () => {
    const mockFactory = createMockConnectionFactory({
      throwOnOriginConnect: Object.assign(new Error('Connection refused'), {
        code: 'ECONNREFUSED',
      }),
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('UNREACHABLE');
  });

  it('discover_OriginProjectListFails_ReturnsUnreachableOriginAndIncomplete', async () => {
    let originDisposed = false;
    let driverClosed = false;

    const mockFactory = createMockConnectionFactory({
      throwOnOriginProjects: Object.assign(new Error('Auth failed'), {
        code: 'authentication_failed',
      }),
      onOriginDispose: () => {
        originDisposed = true;
      },
      onDriverClose: () => {
        driverClosed = true;
      },
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('AUTHENTICATION_FAILED');
    expect(originDisposed).toBe(true);
    expect(driverClosed).toBe(true);
  });

  it('discover_OriginProjectListTransportFailure_ReturnsUnreachableOrigin', async () => {
    let originDisposed = false;
    let driverClosed = false;

    const mockFactory = createMockConnectionFactory({
      throwOnOriginProjects: Object.assign(
        new Error('connect ECONNREFUSED 127.0.0.1'),
        { code: 'ECONNREFUSED' },
      ),
      onOriginDispose: () => {
        originDisposed = true;
      },
      onDriverClose: () => {
        driverClosed = true;
      },
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].status).toBe('unreachable');
    expect(inventory.hosts[0].error).toBe('UNREACHABLE');
    expect(inventory.hosts[0].projects).toEqual([]);
    expect(originDisposed).toBe(true);
    expect(driverClosed).toBe(true);
  });

  it('discover_RemoteHostAuthFailure_ReturnsUnreachableRemoteWithoutDuplicateRows', async () => {
    const disposedRemotes: string[] = [];
    let originDisposed = false;
    let driverClosed = false;

    const mockFactory = createMockConnectionFactory({
      originHosts: [
        {
          registrationId: 'reg_worker_auth',
          serverId: 'srv_worker_auth',
          label: 'Auth Worker',
          enabled: true,
          status: 'online',
        },
      ],
      throwOnRemoteClient: {
        srv_worker_auth: Object.assign(new Error('Incorrect password'), {
          code: 'authentication_failed',
        }),
      },
      onRemoteDispose: (serverId) => {
        disposedRemotes.push(serverId);
      },
      onOriginDispose: () => {
        originDisposed = true;
      },
      onDriverClose: () => {
        driverClosed = true;
      },
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    // One origin row plus exactly one routed row: no duplicate error rows.
    expect(inventory.hosts).toHaveLength(2);
    expect(inventory.hosts[1].hostKey).toBe('reg_worker_auth');
    expect(inventory.hosts[1].status).toBe('unreachable');
    expect(inventory.hosts[1].error).toBe('AUTHENTICATION_FAILED');
    expect(inventory.hosts[1].projects).toEqual([]);
    // Origin cleanup ran; nothing was acquired for the routed host.
    expect(originDisposed).toBe(true);
    expect(driverClosed).toBe(true);
    expect(disposedRemotes).toEqual([]);
  });

  it('discover_OriginHostListFails_KeepsOriginProjectsAndReturnsIncomplete', async () => {
    const mockFactory = createMockConnectionFactory({
      originProjects: sampleRawProjects,
      throwOnOriginHosts: new Error('Hosts failure'),
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(1);
    expect(inventory.hosts[0].status).toBe('reachable');
    expect(inventory.hosts[0].projects).toHaveLength(2);
  });

  it('discover_ProjectCountExceedsLimit_TruncatesAndReturnsIncompleteWithProjectLimitExceeded', async () => {
    const oversizedProjects: RawProjectItem[] = [];
    for (let i = 0; i < DISCOVERY_LIMITS.MAX_PROJECTS_PER_HOST + 10; i++) {
      oversizedProjects.push({
        projectId: `proj_${i}`,
        projectDisplayName: `Project ${i}`,
        projectRootPath: `/path/${i}`,
        projectKind: 'git',
      });
    }

    const mockFactory = createMockConnectionFactory({
      originProjects: oversizedProjects,
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts[0].status).toBe('reachable');
    expect(inventory.hosts[0].projects).toHaveLength(
      DISCOVERY_LIMITS.MAX_PROJECTS_PER_HOST,
    );
    expect(inventory.hosts[0].error).toBe('PROJECT_LIMIT_EXCEEDED');
  });

  it('discover_DisabledRemoteHost_ReturnsUnsupportedHostDisabledAndIncomplete', async () => {
    const mockFactory = createMockConnectionFactory({
      originHosts: [
        {
          registrationId: 'reg_disabled_1',
          serverId: 'srv_disabled_1',
          label: 'Disabled Worker',
          enabled: false,
          status: 'disabled',
        },
      ],
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('reg_disabled_1');
    expect(remoteHost.status).toBe('unsupported');
    expect(remoteHost.error).toBe('HOST_DISABLED');
    expect(remoteHost.projects).toHaveLength(0);
  });

  it('discover_OfflineRemoteHost_ReturnsUnreachableHostOfflineAndIncomplete', async () => {
    const mockFactory = createMockConnectionFactory({
      originHosts: [
        {
          registrationId: 'reg_offline_1',
          serverId: 'srv_offline_1',
          label: 'Offline Worker',
          enabled: true,
          status: 'offline',
        },
      ],
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('reg_offline_1');
    expect(remoteHost.status).toBe('unreachable');
    expect(remoteHost.error).toBe('HOST_OFFLINE');
    expect(remoteHost.projects).toHaveLength(0);
  });

  it('discover_UnidentifiedRemoteHost_ReturnsUnsupportedUnidentifiedAndIncomplete', async () => {
    const mockFactory = createMockConnectionFactory({
      originHosts: [
        {
          registrationId: 'reg_unidentified',
          serverId: null,
          label: 'Unidentified Node',
          enabled: true,
          status: 'online',
        },
      ],
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('reg_unidentified');
    expect(remoteHost.status).toBe('unsupported');
    expect(remoteHost.error).toBe('UNIDENTIFIED_HOST');
    expect(remoteHost.projects).toHaveLength(0);
  });

  it('discover_RemoteHostRoutingSucceeds_GathersRemoteProjectsWithServerIdAndProjectKey', async () => {
    const disposedRemotes: string[] = [];

    const mockFactory = createMockConnectionFactory({
      originHosts: [
        {
          registrationId: 'reg_worker_east',
          serverId: 'srv_worker_east',
          label: 'Worker East',
          enabled: true,
          status: 'online',
        },
      ],
      remoteProjectsByServerId: {
        srv_worker_east: [
          {
            projectId: 'proj_remote_1',
            projectKey: 'remote:github.com/org/remote-service',
            projectDisplayName: 'Remote Service',
            projectRootPath: '/opt/services/remote',
            projectKind: 'git',
          },
        ],
      },
      onRemoteDispose: (serverId) => {
        disposedRemotes.push(serverId);
      },
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(true);
    expect(inventory.hosts).toHaveLength(2);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('reg_worker_east');
    expect(remoteHost.serverId).toBe('srv_worker_east');
    expect(remoteHost.status).toBe('reachable');
    expect(remoteHost.projects).toHaveLength(1);
    expect(remoteHost.projects[0]).toEqual({
      projectId: 'proj_remote_1',
      name: 'Remote Service',
      path: '/opt/services/remote',
      kind: 'git',
      projectKey: 'remote:github.com/org/remote-service',
      checkouts: [],
    });

    expect(disposedRemotes).toContain('srv_worker_east');
  });

  it('discover_RemoteHostRoutingFails_CleansUpScopeAndReturnsClassifiedError', async () => {
    const mockFactory = createMockConnectionFactory({
      originHosts: [
        {
          registrationId: 'reg_worker_failing',
          serverId: 'srv_worker_failing',
          label: 'Failing Worker',
          enabled: true,
          status: 'online',
        },
      ],
      throwOnRemoteClient: {
        srv_worker_failing: Object.assign(
          new Error('Host srv_worker_failing is offline'),
          { code: 'host_offline' },
        ),
      },
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    expect(inventory.hosts).toHaveLength(2);

    const remoteHost = inventory.hosts[1];
    expect(remoteHost.hostKey).toBe('reg_worker_failing');
    expect(remoteHost.serverId).toBe('srv_worker_failing');
    expect(remoteHost.status).toBe('unreachable');
    expect(remoteHost.error).toBe('HOST_OFFLINE');
    expect(remoteHost.projects).toHaveLength(0);
  });

  it('discover_RemoteHostCountExceedsLimit_EnforcesMax32RemoteHosts', async () => {
    const manyHosts: RawHostSummary[] = [];
    for (let i = 0; i < 35; i++) {
      manyHosts.push({
        registrationId: `reg_remote_${i + 1}`,
        serverId: `srv_remote_${i + 1}`,
        label: `Host ${i + 1}`,
        enabled: true,
        status: 'online',
      });
    }

    const mockFactory = createMockConnectionFactory({
      originHosts: manyHosts,
      remoteProjectsByServerId: {},
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    expect(inventory.complete).toBe(false);
    // 1 origin + 35 remotes = 36 total
    expect(inventory.hosts).toHaveLength(36);

    // Hosts 1 to 32 should have connected and succeeded (reachable)
    for (let i = 1; i <= 32; i++) {
      expect(inventory.hosts[i].status).toBe('reachable');
    }

    // Host 33rd onward should be marked unsupported due to limit
    for (let i = 33; i <= 35; i++) {
      expect(inventory.hosts[i].status).toBe('unsupported');
      expect(inventory.hosts[i].error).toBe('HOST_LIMIT_EXCEEDED');
    }
  });

  it('discover_DeduplicationPreservesDistinctRegistrations', async () => {
    const mockFactory = createMockConnectionFactory({
      originHosts: [
        {
          registrationId: 'reg_alpha',
          serverId: 'srv_alpha',
          enabled: true,
          status: 'online',
        },
        {
          registrationId: 'reg_alpha', // duplicate registrationId
          serverId: 'srv_distinct',
          enabled: true,
          status: 'online',
        },
        {
          registrationId: 'reg_beta',
          serverId: 'srv_alpha', // duplicate serverId
          enabled: true,
          status: 'online',
        },
        {
          registrationId: 'reg_gamma',
          serverId: 'srv_gamma',
          enabled: true,
          status: 'online',
        },
      ],
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    // Origin + reg_alpha + reg_gamma = 3 hosts (duplicates skipped)
    expect(inventory.hosts).toHaveLength(3);
    expect(inventory.hosts.map((h) => h.hostKey)).toEqual([
      'local',
      'reg_alpha',
      'reg_gamma',
    ]);
  });

  it('discover_SelfHostInHostList_DedupesOriginServerId', async () => {
    const mockFactory = createMockConnectionFactory({
      selfServerId: 'srv_origin_local',
      originHosts: [
        {
          registrationId: 'reg_self_as_remote',
          serverId: 'srv_origin_local', // same serverId as self
          enabled: true,
          status: 'online',
        },
        {
          registrationId: 'reg_other_remote',
          serverId: 'srv_other_remote',
          enabled: true,
          status: 'online',
        },
      ],
    });

    const service = new HarnessDiscoveryService(
      defaultMockExecFile,
      mockFactory,
    );
    const inventory = await service.discover(validLocalConfig);

    // Origin + reg_other_remote = 2 hosts (self as remote skipped)
    expect(inventory.hosts).toHaveLength(2);
    expect(inventory.hosts[1].hostKey).toBe('reg_other_remote');
  });

  describe('workspace checkout discovery v8', () => {
    const sampleWorkspaces: PaseoSdkWorkspace[] = [
      {
        id: 'ws_alpha_feat',
        projectId: 'proj_alpha',
        projectDisplayName: 'Alpha Project',
        projectRootPath: '/workspace/alpha',
        workspaceDirectory: '/workspace/alpha-worktree',
        workspaceKind: 'worktree',
        name: 'feat-branch',
        status: 'done',
        statusEnteredAt: '2026-10-25T00:00:00Z',
        activityAt: '2026-10-25T00:00:00Z',
        archivingAt: null,
        scripts: [],
        projectKind: 'git',
      },
      {
        id: 'ws_beta_fix',
        projectId: 'proj_beta',
        projectDisplayName: 'Beta Project',
        projectRootPath: '/workspace/beta',
        workspaceDirectory: '/workspace/beta-checkout',
        workspaceKind: 'checkout',
        name: 'fix-branch',
        status: 'done',
        statusEnteredAt: '2026-10-25T00:00:00Z',
        activityAt: '2026-10-25T00:00:00Z',
        archivingAt: null,
        scripts: [],
        projectKind: 'git',
      },
    ];

    it('discover_OriginWorkspacesSuccess_PopulatesCheckoutsOnMatchingProjects', async () => {
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: sampleWorkspaces,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      expect(inventory.hosts).toHaveLength(1);
      const originHost = inventory.hosts[0];
      expect(originHost.status).toBe('reachable');
      expect(originHost.projects).toHaveLength(2);

      // Checkouts array attached to registered projects
      expect(originHost.projects[0].checkouts).toEqual([
        {
          workspaceId: 'ws_alpha_feat',
          path: '/workspace/alpha-worktree',
          kind: 'worktree',
        },
      ]);
      expect(originHost.projects[1].checkouts).toEqual([
        {
          workspaceId: 'ws_beta_fix',
          path: '/workspace/beta-checkout',
          kind: 'checkout',
        },
      ]);

      // Base project properties remain unchanged
      expect(originHost.projects[0].projectId).toBe('proj_alpha');
      expect(originHost.projects[0].name).toBe('Alpha Project');
      expect(originHost.projects[0].path).toBe('/workspace/alpha');
      expect(originHost.projects[0].projectKey).toBe(
        'remote:github.com/org/alpha',
      );
    });

    it('discover_OriginWorkspacesEmpty_SetsCheckoutsToEmptyArray', async () => {
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: [],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      expect(inventory.hosts[0].projects[0].checkouts).toEqual([]);
      expect(inventory.hosts[0].projects[1].checkouts).toEqual([]);
    });

    it('discover_OriginWorkspacesWithoutExplicitWorkspaceDirectory_DoesNotInventPath', async () => {
      // The published descriptor *output* type normalizes workspaceDirectory to
      // a required string, so an entry whose optional input field is absent
      // cannot be written as a valid PaseoWorkspace fixture. It is injected as
      // untrusted wire data instead; production must still not invent a path.
      const entryWithoutDirectory: unknown = {
        id: 'ws_default_no_dir',
        projectId: 'proj_alpha',
        projectDisplayName: 'Alpha Project',
        projectRootPath: '/workspace/alpha',
        workspaceKind: 'directory',
        name: 'default',
        status: 'done',
        statusEnteredAt: '2026-10-25T00:00:00Z',
        activityAt: '2026-10-25T00:00:00Z',
        archivingAt: null,
        scripts: [],
        projectKind: 'git',
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaceRawPages: [
          {
            requestId: 'req_no_dir',
            entries: [entryWithoutDirectory],
            pageInfo: {
              nextCursor: null,
              prevCursor: null,
              hasMore: false,
            },
          },
        ],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      // Does not invent checkoutPath/gitRoot: checkouts stays empty
      expect(inventory.hosts[0].projects[0].checkouts).toEqual([]);
    });

    it('discover_PagedWorkspaces_AccumulatesCheckoutsAcrossMultiplePages', async () => {
      const page1: PaseoSdkWorkspaceListResult = {
        requestId: 'req_p1',
        entries: [
          {
            id: 'ws_page1',
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: '/workspace/alpha-wt1',
            workspaceKind: 'worktree',
            name: 'wt1',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
        pageInfo: {
          nextCursor: 'cur_page_2',
          prevCursor: null,
          hasMore: true,
        },
      };

      const page2: PaseoSdkWorkspaceListResult = {
        requestId: 'req_p2',
        entries: [
          {
            id: 'ws_page2',
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: '/workspace/alpha-wt2',
            workspaceKind: 'worktree',
            name: 'wt2',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
        pageInfo: {
          nextCursor: null,
          prevCursor: 'cur_page_2',
          hasMore: false,
        },
      };

      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: [page1, page2],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      expect(inventory.hosts[0].projects[0].checkouts).toHaveLength(2);
      expect(inventory.hosts[0].projects[0].checkouts).toEqual([
        {
          workspaceId: 'ws_page1',
          path: '/workspace/alpha-wt1',
          kind: 'worktree',
        },
        {
          workspaceId: 'ws_page2',
          path: '/workspace/alpha-wt2',
          kind: 'worktree',
        },
      ]);
    });

    it('discover_WorkspacePaging_ForwardsReturnedCursorToNextRequest', async () => {
      const cursors: Array<string | undefined> = [];
      const first: PaseoSdkWorkspaceListResult = {
        requestId: 'req_first',
        entries: [],
        pageInfo: {
          nextCursor: 'cur_step_2',
          prevCursor: null,
          hasMore: true,
        },
      };
      const second: PaseoSdkWorkspaceListResult = {
        requestId: 'req_second',
        entries: [],
        pageInfo: {
          nextCursor: null,
          prevCursor: 'cur_step_2',
          hasMore: false,
        },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: [first, second],
        onOriginWorkspacesList: (options) => {
          cursors.push(options?.page?.cursor);
        },
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      // The continuation request carries the cursor returned by the server.
      expect(cursors).toEqual([undefined, 'cur_step_2']);
      expect(inventory.hosts[0].projects[0].checkouts).toEqual([]);
    });

    it('discover_WorkspacePaging_NonProgressingCursorFailsClosed', async () => {
      const badPage: PaseoSdkWorkspaceListResult = {
        requestId: 'req_bad',
        entries: [],
        pageInfo: {
          nextCursor: '', // Empty cursor when hasMore is true
          prevCursor: null,
          hasMore: true,
        },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: [badPage],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PAGING');
    });

    it('discover_WorkspacePaging_DuplicateCursorLoopFailsClosed', async () => {
      const loopPage: PaseoSdkWorkspaceListResult = {
        requestId: 'req_loop',
        entries: [],
        pageInfo: {
          nextCursor: 'loop_token',
          prevCursor: null,
          hasMore: true,
        },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: [loopPage, loopPage],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PAGING');
    });

    it('discover_TerminalPageMissingNextCursor_FailsClosed', async () => {
      const missingCursorPage: unknown = {
        requestId: 'req_missing_terminal_cursor',
        entries: [],
        pageInfo: { prevCursor: null, hasMore: false },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaceRawPages: [missingCursorPage],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PAGING');
    });

    it('discover_TerminalPageNonStringPrevCursor_FailsClosed', async () => {
      const badPrevPage: unknown = {
        requestId: 'req_bad_prev',
        entries: [],
        pageInfo: {
          nextCursor: null,
          prevCursor: 42,
          hasMore: false,
        },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaceRawPages: [badPrevPage],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PAGING');
    });

    it('discover_ContinuationPageMalformedPrevCursor_FailsClosedBeforeNextRpc', async () => {
      const malformedContinuation: unknown = {
        requestId: 'req_bad_continuation',
        entries: [],
        pageInfo: {
          nextCursor: 'cur_next',
          prevCursor: {},
          hasMore: true,
        },
      };

      let rpcCalls = 0;
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaceRawPages: [malformedContinuation],
        onOriginWorkspacesList: () => {
          rpcCalls++;
        },
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PAGING');
      expect(rpcCalls).toBe(1);
    });

    it('discover_TerminalPageStringNextCursor_CompletesDiscovery', async () => {
      // The pinned protocol permits a string nextCursor on a terminal page.
      const terminalStringCursor: PaseoSdkWorkspaceListResult = {
        requestId: 'req_terminal_string',
        entries: [],
        pageInfo: {
          nextCursor: 'tail_cursor',
          prevCursor: null,
          hasMore: false,
        },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: [terminalStringCursor],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      expect(inventory.hosts[0].status).toBe('reachable');
      expect(inventory.hosts[0].projects[0].checkouts).toEqual([]);
    });

    it('discover_UnknownProjectAssociation_FailsClosedWithHostError', async () => {
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: [
          {
            id: 'ws_orphan',
            projectId: 'proj_nonexistent_association',
            projectDisplayName: 'Unknown Project',
            projectRootPath: '/workspace/unknown',
            workspaceDirectory: '/workspace/unknown-wt',
            workspaceKind: 'worktree',
            name: 'orphan',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('UNKNOWN_PROJECT_ASSOCIATION');
    });

    it('discover_InvalidWorkspaceId_FailsClosedWithHostError', async () => {
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: [
          {
            id: 'invalid id with whitespace',
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: '/workspace/alpha-wt',
            workspaceKind: 'worktree',
            name: 'bad-id',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_ID');
    });

    it('discover_InvalidWorkspacePath_FailsClosedWithHostError', async () => {
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: [
          {
            id: 'ws_bad_path',
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: 'relative/path/not/absolute',
            workspaceKind: 'worktree',
            name: 'bad-path',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PATH');
    });

    it('discover_InvalidWorkspacePathTraversal_FailsClosedWithHostError', async () => {
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: [
          {
            id: 'ws_traversal_path',
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: '/workspace/alpha/../../escape',
            workspaceKind: 'worktree',
            name: 'traversal',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PATH');
    });

    it('discover_InvalidWorkspaceKind_FailsClosedWithHostError', async () => {
      const badKindEntry: unknown = {
        id: 'ws_bad_kind',
        projectId: 'proj_alpha',
        projectDisplayName: 'Alpha Project',
        projectRootPath: '/workspace/alpha',
        workspaceDirectory: '/workspace/alpha-custom',
        workspaceKind: 'unsupported_symlink_kind',
        name: 'bad-kind',
        status: 'done',
        statusEnteredAt: '2026-10-25T00:00:00Z',
        activityAt: '2026-10-25T00:00:00Z',
        archivingAt: null,
        scripts: [],
        projectKind: 'git',
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaceRawPages: [
          {
            requestId: 'req_bad_kind',
            entries: [badKindEntry],
            pageInfo: { nextCursor: null, prevCursor: null, hasMore: false },
          },
        ],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_KIND');
    });

    it('discover_WorkspaceLimitExceeded_TotalEntriesExceed10kFailsClosed', async () => {
      const overflowEntries: PaseoSdkWorkspace[] = [];
      for (let i = 0; i < 10001; i++) {
        overflowEntries.push({
          id: `ws_${i}`,
          projectId: 'proj_alpha',
          projectDisplayName: 'Alpha Project',
          projectRootPath: '/workspace/alpha',
          workspaceDirectory: `/workspace/alpha-wt-${i}`,
          workspaceKind: 'worktree',
          name: `wt-${i}`,
          status: 'done',
          statusEnteredAt: '2026-10-25T00:00:00Z',
          activityAt: '2026-10-25T00:00:00Z',
          archivingAt: null,
          scripts: [],
          projectKind: 'git',
        });
      }

      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: overflowEntries,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('WORKSPACE_LIMIT_EXCEEDED');
    });

    it('discover_WorkspaceLimitExceeded_PagesExceed100FailsClosed', async () => {
      const pages: PaseoSdkWorkspaceListResult[] = [];
      for (let i = 0; i < 101; i++) {
        pages.push({
          requestId: `req_${i}`,
          entries: [
            {
              id: `ws_${i}`,
              projectId: 'proj_alpha',
              projectDisplayName: 'Alpha Project',
              projectRootPath: '/workspace/alpha',
              workspaceDirectory: `/workspace/alpha-wt-${i}`,
              workspaceKind: 'worktree',
              name: `wt-${i}`,
              status: 'done',
              statusEnteredAt: '2026-10-25T00:00:00Z',
              activityAt: '2026-10-25T00:00:00Z',
              archivingAt: null,
              scripts: [],
              projectKind: 'git',
            },
          ],
          pageInfo: {
            nextCursor: `cur_${i + 1}`,
            prevCursor: null,
            hasMore: true,
          },
        });
      }

      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: pages,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('WORKSPACE_LIMIT_EXCEEDED');
    });

    it('discover_RemoteHostWorkspacesSuccess_PopulatesCheckoutsOnRemoteProjects', async () => {
      const remoteProject: RawProjectItem = {
        projectId: 'proj_remote',
        projectDisplayName: 'Remote Project',
        projectRootPath: '/opt/remote/primary',
        projectKind: 'git',
        projectKey: 'remote:github.com/org/remote',
      };

      const remoteWorkspace: PaseoSdkWorkspace = {
        id: 'ws_remote_worktree',
        projectId: 'proj_remote',
        projectDisplayName: 'Remote Project',
        projectRootPath: '/opt/remote/primary',
        workspaceDirectory: '/opt/remote/worktree_1',
        workspaceKind: 'worktree',
        name: 'remote-wt',
        status: 'done',
        statusEnteredAt: '2026-10-25T00:00:00Z',
        activityAt: '2026-10-25T00:00:00Z',
        archivingAt: null,
        scripts: [],
        projectKind: 'git',
      };

      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: [],
        originHosts: [
          {
            registrationId: 'reg_worker',
            serverId: 'srv_worker',
            enabled: true,
            status: 'online',
          },
        ],
        remoteProjectsByServerId: {
          srv_worker: [remoteProject],
        },
        remoteWorkspacesByServerId: {
          srv_worker: [remoteWorkspace],
        },
      });

      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      expect(inventory.hosts).toHaveLength(2);
      const remoteHost = inventory.hosts[1];
      expect(remoteHost.status).toBe('reachable');
      expect(remoteHost.projects).toHaveLength(1);
      expect(remoteHost.projects[0].checkouts).toEqual([
        {
          workspaceId: 'ws_remote_worktree',
          path: '/opt/remote/worktree_1',
          kind: 'worktree',
        },
      ]);
    });

    it('discover_RemoteHostWorkspaceError_FailsClosedOnRemoteHost', async () => {
      const remoteProject: RawProjectItem = {
        projectId: 'proj_remote',
        projectDisplayName: 'Remote Project',
        projectRootPath: '/opt/remote/primary',
        projectKind: 'git',
      };

      const badRemoteWorkspace: PaseoSdkWorkspace = {
        id: 'ws_remote_orphan',
        projectId: 'proj_other_nonexistent',
        projectDisplayName: 'Other',
        projectRootPath: '/opt/remote/other',
        workspaceDirectory: '/opt/remote/other-wt',
        workspaceKind: 'worktree',
        name: 'orphan',
        status: 'done',
        statusEnteredAt: '2026-10-25T00:00:00Z',
        activityAt: '2026-10-25T00:00:00Z',
        archivingAt: null,
        scripts: [],
        projectKind: 'git',
      };

      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: [],
        originHosts: [
          {
            registrationId: 'reg_worker',
            serverId: 'srv_worker',
            enabled: true,
            status: 'online',
          },
        ],
        remoteProjectsByServerId: {
          srv_worker: [remoteProject],
        },
        remoteWorkspacesByServerId: {
          srv_worker: [badRemoteWorkspace],
        },
      });

      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      const remoteHost = inventory.hosts[1];
      expect(remoteHost.error).toBe('UNKNOWN_PROJECT_ASSOCIATION');
    });

    it('discover_DuplicateWorkspaceEntries_CollapsesDuplicatesWithinProject', async () => {
      const duplicateWorkspaces: PaseoSdkWorkspace[] = [
        {
          id: 'ws_dup_1',
          projectId: 'proj_alpha',
          projectDisplayName: 'Alpha Project',
          projectRootPath: '/workspace/alpha',
          workspaceDirectory: '/workspace/alpha-common-checkout',
          workspaceKind: 'worktree',
          name: 'wt1',
          status: 'done',
          statusEnteredAt: '2026-10-25T00:00:00Z',
          activityAt: '2026-10-25T00:00:00Z',
          archivingAt: null,
          scripts: [],
          projectKind: 'git',
        },
        {
          id: 'ws_dup_2',
          projectId: 'proj_alpha',
          projectDisplayName: 'Alpha Project',
          projectRootPath: '/workspace/alpha',
          workspaceDirectory: '/workspace/alpha-common-checkout', // Same path
          workspaceKind: 'worktree',
          name: 'wt2',
          status: 'done',
          statusEnteredAt: '2026-10-25T00:00:00Z',
          activityAt: '2026-10-25T00:00:00Z',
          archivingAt: null,
          scripts: [],
          projectKind: 'git',
        },
      ];

      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: duplicateWorkspaces,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      // Collapsed: only 1 checkout entry for that path
      expect(inventory.hosts[0].projects[0].checkouts).toHaveLength(1);
      expect(inventory.hosts[0].projects[0].checkouts![0].path).toBe(
        '/workspace/alpha-common-checkout',
      );
    });

    it('discover_MissingWorkspaceApi_ReturnsUnsupportedIncompleteHost', async () => {
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        disableOriginWorkspaces: true,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].status).toBe('unsupported');
      expect(inventory.hosts[0].error).toBe('UNSUPPORTED_WORKSPACE_API');
    });

    it('discover_MalformedPageInfo_MissingOrInvalidBooleanFailsClosed', async () => {
      const badPage: unknown = {
        requestId: 'req_bad_info',
        entries: [],
        pageInfo: {
          hasMore: 'true', // deliberately non-boolean wire value
          nextCursor: 'cur_1',
          prevCursor: null,
        },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaceRawPages: [badPage],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PAGING');
    });

    it('discover_WorkspaceDirectoryNullOrNonString_FailsClosed', async () => {
      const badEntry: unknown = {
        id: 'ws_null_dir',
        projectId: 'proj_alpha',
        projectDisplayName: 'Alpha Project',
        projectRootPath: '/workspace/alpha',
        workspaceDirectory: null, // deliberately non-string wire value
        workspaceKind: 'worktree',
        name: 'null-dir',
        status: 'done',
        statusEnteredAt: '2026-10-25T00:00:00Z',
        activityAt: '2026-10-25T00:00:00Z',
        archivingAt: null,
        scripts: [],
        projectKind: 'git',
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaceRawPages: [
          {
            requestId: 'req_null_dir',
            entries: [badEntry],
            pageInfo: { nextCursor: null, prevCursor: null, hasMore: false },
          },
        ],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('INVALID_WORKSPACE_PATH');
    });

    it('discover_SinglePageExceeds100Entries_FailsClosedImmediately', async () => {
      const entries101: PaseoSdkWorkspace[] = [];
      for (let i = 0; i < 101; i++) {
        entries101.push({
          id: `ws_single_${i}`,
          projectId: 'proj_alpha',
          projectDisplayName: 'Alpha Project',
          projectRootPath: '/workspace/alpha',
          workspaceDirectory: `/workspace/alpha-dir-${i}`,
          workspaceKind: 'worktree',
          name: `wt-${i}`,
          status: 'done',
          statusEnteredAt: '2026-10-25T00:00:00Z',
          activityAt: '2026-10-25T00:00:00Z',
          archivingAt: null,
          scripts: [],
          projectKind: 'git',
        });
      }
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspaces: entries101,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('WORKSPACE_LIMIT_EXCEEDED');
    });

    it('discover_Exact100PagesOf100EntriesWithFinalHasMoreFalse_Succeeds', async () => {
      const pages: PaseoSdkWorkspaceListResult[] = [];
      for (let p = 0; p < 100; p++) {
        const entries: PaseoSdkWorkspace[] = [];
        for (let e = 0; e < 100; e++) {
          const idx = p * 100 + e;
          entries.push({
            id: `ws_10k_${idx}`,
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: `/workspace/alpha-exact-${idx}`,
            workspaceKind: 'worktree',
            name: `exact-${idx}`,
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          });
        }
        const isLast = p === 99;
        pages.push({
          requestId: `req_${p}`,
          entries,
          pageInfo: {
            nextCursor: isLast ? null : `cur_${p + 1}`,
            prevCursor: p === 0 ? null : `cur_${p}`,
            hasMore: !isLast,
          },
        });
      }

      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: pages,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      expect(inventory.hosts[0].status).toBe('reachable');
      expect(inventory.hosts[0].projects[0].checkouts).toHaveLength(10000);
    }, 15_000);

    it('discover_100thPageWithHasMoreTrue_FailsClosedWithout101stRPC', async () => {
      const pages: PaseoSdkWorkspaceListResult[] = [];
      for (let p = 0; p < 100; p++) {
        pages.push({
          requestId: `req_${p}`,
          entries: [
            {
              id: `ws_page_${p}`,
              projectId: 'proj_alpha',
              projectDisplayName: 'Alpha Project',
              projectRootPath: '/workspace/alpha',
              workspaceDirectory: `/workspace/alpha-wt-${p}`,
              workspaceKind: 'worktree',
              name: `wt-${p}`,
              status: 'done',
              statusEnteredAt: '2026-10-25T00:00:00Z',
              activityAt: '2026-10-25T00:00:00Z',
              archivingAt: null,
              scripts: [],
              projectKind: 'git',
            },
          ],
          pageInfo: {
            nextCursor: `cur_${p + 1}`,
            prevCursor: null,
            hasMore: true, // 100th page also hasMore: true!
          },
        });
      }

      let rpcCount = 0;
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: pages,
        onOriginWorkspacesList: () => {
          rpcCount++;
        },
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('WORKSPACE_LIMIT_EXCEEDED');
      // Verified: exactly 100 RPCs issued; no 101st RPC call!
      expect(rpcCount).toBe(100);
    });

    it('discover_ConflictingWorkspaceIdAcrossPages_FailsClosed', async () => {
      const page1: PaseoSdkWorkspaceListResult = {
        requestId: 'p1',
        entries: [
          {
            id: 'ws_conflict',
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: '/workspace/alpha-path-1',
            workspaceKind: 'worktree',
            name: 'wt1',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
        pageInfo: { nextCursor: 'c2', prevCursor: null, hasMore: true },
      };
      const page2: PaseoSdkWorkspaceListResult = {
        requestId: 'p2',
        entries: [
          {
            id: 'ws_conflict', // same ID but conflicting path
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: '/workspace/alpha-path-2',
            workspaceKind: 'worktree',
            name: 'wt2',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
        pageInfo: { nextCursor: null, prevCursor: 'c2', hasMore: false },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: [page1, page2],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('CONFLICTING_WORKSPACE_IDENTITY');
    });

    it('discover_SameWorkspaceIdDifferentProject_FailsClosed', async () => {
      const page1: PaseoSdkWorkspaceListResult = {
        requestId: 'p1',
        entries: [
          {
            id: 'ws_cross_proj',
            projectId: 'proj_alpha',
            projectDisplayName: 'Alpha Project',
            projectRootPath: '/workspace/alpha',
            workspaceDirectory: '/workspace/alpha-wt',
            workspaceKind: 'worktree',
            name: 'wt1',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
        pageInfo: { nextCursor: 'c2', prevCursor: null, hasMore: true },
      };
      const page2: PaseoSdkWorkspaceListResult = {
        requestId: 'p2',
        entries: [
          {
            id: 'ws_cross_proj', // same ID for different project
            projectId: 'proj_beta',
            projectDisplayName: 'Beta Project',
            projectRootPath: '/workspace/beta',
            workspaceDirectory: '/workspace/beta-wt',
            workspaceKind: 'worktree',
            name: 'wt2',
            status: 'done',
            statusEnteredAt: '2026-10-25T00:00:00Z',
            activityAt: '2026-10-25T00:00:00Z',
            archivingAt: null,
            scripts: [],
            projectKind: 'git',
          },
        ],
        pageInfo: { nextCursor: null, prevCursor: 'c2', hasMore: false },
      };
      const mockFactory = createMockConnectionFactory({
        originProjects: sampleRawProjects,
        originWorkspacePages: [page1, page2],
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('CONFLICTING_WORKSPACE_IDENTITY');
    });

    it('discover_PrimaryProjectsInvalidShape_FailsClosed', async () => {
      const mockFactory = createMockConnectionFactory({
        // Sent verbatim: projects.list() really returns {projects: null}.
        originProjectsResponse: { requestId: 'req_bad', projects: null },
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].status).toBe('unsupported');
      expect(inventory.hosts[0].error).toBe('INVALID_PROJECT_DATA');
      expect(inventory.hosts[0].projects).toEqual([]);
    });

    it('discover_PrimaryProjectsConflictingDuplicateId_FailsClosed', async () => {
      const conflictingPrimary: RawProjectItem[] = [
        {
          projectId: 'proj_dup',
          projectDisplayName: 'Project Alpha',
          projectRootPath: '/workspace/root_alpha',
          projectKind: 'git',
        },
        {
          projectId: 'proj_dup',
          projectDisplayName: 'Project Beta',
          projectRootPath: '/workspace/root_beta', // Conflicting root
          projectKind: 'git',
        },
      ];
      const mockFactory = createMockConnectionFactory({
        originProjects: conflictingPrimary,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(false);
      expect(inventory.hosts[0].error).toBe('CONFLICTING_PROJECT_DESCRIPTOR');
    });

    it('discover_PrimaryProjectsIdenticalDuplicateId_CollapsesSafely', async () => {
      const identicalPrimary: RawProjectItem[] = [
        {
          projectId: 'proj_same',
          projectDisplayName: 'Project Same',
          projectRootPath: '/workspace/root_same',
          projectKind: 'git',
          projectKey: 'remote:github.com/org/same',
        },
        {
          projectId: 'proj_same',
          projectDisplayName: 'Project Same',
          projectRootPath: '/workspace/root_same',
          projectKind: 'git',
          projectKey: 'remote:github.com/org/same',
        },
      ];
      const mockFactory = createMockConnectionFactory({
        originProjects: identicalPrimary,
      });
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );
      const inventory = await service.discover(validLocalConfig);

      expect(inventory.complete).toBe(true);
      // Identical primary row collapsed: length is 1, not 2
      expect(inventory.hosts[0].projects).toHaveLength(1);
      expect(inventory.hosts[0].projects[0].projectId).toBe('proj_same');
    });

    it('discover_StalledWorkspaceRpc_ReturnsTimeoutAfterCallStarts', async () => {
      vi.useFakeTimers();
      const rpcStarted = Promise.withResolvers<void>();
      let rpcCalls = 0;
      const mockFactory: PaseoConnectionFactory = {
        async connectOrigin(): Promise<ConnectedPaseoOrigin> {
          return {
            driver: { async connect() {}, async close() {} },
            api: {
              async dispose() {},
              hosts: {
                async list() {
                  return { self: { serverId: 'srv_origin_local' }, hosts: [] };
                },
                async client(): Promise<PaseoRemoteApi> {
                  throw new Error('routed client must not be requested');
                },
              },
              projects: {
                async list() {
                  return { requestId: 'req_1', projects: sampleRawProjects };
                },
              },
              workspaces: {
                async list(): Promise<PaseoSdkWorkspaceListResult> {
                  rpcCalls++;
                  rpcStarted.resolve();
                  return new Promise<PaseoSdkWorkspaceListResult>(() => {});
                },
              },
            },
          };
        },
      };
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );

      try {
        const pending = service.discover(validLocalConfig);
        // The RPC is genuinely in flight before the deadline is advanced.
        await rpcStarted.promise;
        expect(rpcCalls).toBe(1);

        await vi.advanceTimersByTimeAsync(
          DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS + 1,
        );
        const inventory = await pending;

        expect(inventory.complete).toBe(false);
        expect(inventory.hosts[0].status).toBe('unreachable');
        expect(inventory.hosts[0].error).toBe('TIMEOUT');
      } finally {
        vi.useRealTimers();
      }
    });

    it('discover_LateRoutedClientAfterDeadline_IsDisposedOnce', async () => {
      vi.useFakeTimers();
      const clientStarted = Promise.withResolvers<void>();
      const clientResult = Promise.withResolvers<PaseoRemoteApi>();
      const lateDisposed = Promise.withResolvers<void>();
      let disposeCalls = 0;
      const mockFactory: PaseoConnectionFactory = {
        async connectOrigin(): Promise<ConnectedPaseoOrigin> {
          return {
            driver: { async connect() {}, async close() {} },
            api: {
              async dispose() {},
              hosts: {
                async list() {
                  return {
                    self: { serverId: 'srv_origin_local' },
                    hosts: [
                      {
                        registrationId: 'reg_late',
                        serverId: 'srv_late',
                        enabled: true,
                        status: 'online',
                      },
                    ],
                  };
                },
                client(): Promise<PaseoRemoteApi> {
                  clientStarted.resolve();
                  return clientResult.promise;
                },
              },
              projects: {
                async list() {
                  return { requestId: 'req_1', projects: sampleRawProjects };
                },
              },
              workspaces: {
                async list(): Promise<PaseoSdkWorkspaceListResult> {
                  return {
                    requestId: 'req_ws',
                    entries: [],
                    pageInfo: {
                      nextCursor: null,
                      prevCursor: null,
                      hasMore: false,
                    },
                  };
                },
              },
            },
          };
        },
      };
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );

      try {
        const pending = service.discover(validLocalConfig);
        await clientStarted.promise;

        await vi.advanceTimersByTimeAsync(
          DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS + 1,
        );
        const inventory = await pending;
        expect(inventory.complete).toBe(false);
        expect(inventory.hosts[1].error).toBe('TIMEOUT');

        // The acquisition resolves after discovery returned: its single owner
        // must still dispose it.
        vi.useRealTimers();
        clientResult.resolve({
          async dispose() {
            disposeCalls++;
            lateDisposed.resolve();
          },
          projects: {
            async list() {
              return { requestId: 'req_late', projects: [] };
            },
          },
        });
        await lateDisposed.promise;
        expect(disposeCalls).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('discover_StalledOriginCleanup_ReturnsWithinAggregateBudget', async () => {
      vi.useFakeTimers();
      const startedAt = Date.now();
      const disposeStarted = Promise.withResolvers<void>();
      let disposeCalls = 0;
      const mockFactory: PaseoConnectionFactory = {
        async connectOrigin(): Promise<ConnectedPaseoOrigin> {
          return {
            driver: { async connect() {}, async close() {} },
            api: {
              dispose() {
                disposeCalls++;
                disposeStarted.resolve();
                return new Promise<void>(() => {});
              },
              hosts: {
                async list() {
                  return { self: { serverId: 'srv_origin_local' }, hosts: [] };
                },
                async client(): Promise<PaseoRemoteApi> {
                  throw new Error('routed client must not be requested');
                },
              },
              projects: {
                async list() {
                  return { requestId: 'req_1', projects: sampleRawProjects };
                },
              },
              workspaces: {
                async list(): Promise<PaseoSdkWorkspaceListResult> {
                  return {
                    requestId: 'req_ws',
                    entries: [],
                    pageInfo: {
                      nextCursor: null,
                      prevCursor: null,
                      hasMore: false,
                    },
                  };
                },
              },
            },
          };
        },
      };
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );

      try {
        const pending = service.discover(validLocalConfig);
        await disposeStarted.promise;
        expect(Date.now() - startedAt).toBeLessThan(
          DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS,
        );

        // The documented per-cleanup ceiling bounds the wait; the response is
        // never extended by a fresh cleanup grace window.
        await vi.advanceTimersByTimeAsync(2000);
        const inventory = await pending;

        expect(inventory.complete).toBe(true);
        expect(disposeCalls).toBe(1);
        expect(Date.now() - startedAt).toBeLessThan(
          DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS,
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('discover_StalledOriginAcquisition_TimesOutAndDisposesLateConnection', async () => {
      vi.useFakeTimers();
      const acquisitionStarted = Promise.withResolvers<void>();
      const acquisition = Promise.withResolvers<ConnectedPaseoOrigin>();
      const lateDisposed = Promise.withResolvers<void>();
      const lateClosed = Promise.withResolvers<void>();
      let disposeCalls = 0;
      let closeCalls = 0;
      const mockFactory: PaseoConnectionFactory = {
        connectOrigin(): Promise<ConnectedPaseoOrigin> {
          acquisitionStarted.resolve();
          return acquisition.promise;
        },
      };
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );

      try {
        const pending = service.discover(validLocalConfig);
        await acquisitionStarted.promise;

        await vi.advanceTimersByTimeAsync(
          DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS + 1,
        );
        const inventory = await pending;
        expect(inventory.complete).toBe(false);
        expect(inventory.hosts[0].status).toBe('unreachable');
        expect(inventory.hosts[0].error).toBe('TIMEOUT');

        vi.useRealTimers();
        acquisition.resolve({
          driver: {
            async connect() {},
            async close() {
              closeCalls++;
              lateClosed.resolve();
            },
          },
          api: {
            async dispose() {
              disposeCalls++;
              lateDisposed.resolve();
            },
            hosts: {
              async list() {
                return { hosts: [] };
              },
              async client(): Promise<PaseoRemoteApi> {
                throw new Error('routed client must not be requested');
              },
            },
            projects: {
              async list() {
                return { requestId: 'req_late', projects: [] };
              },
            },
          },
        });

        await lateDisposed.promise;
        await lateClosed.promise;
        expect(disposeCalls).toBe(1);
        expect(closeCalls).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('discover_BudgetExpiredBeforeRoutedAcquisition_DoesNotStartClient', async () => {
      vi.useFakeTimers();
      const startedAt = Date.now();
      let clientCalls = 0;
      const mockFactory: PaseoConnectionFactory = {
        async connectOrigin(): Promise<ConnectedPaseoOrigin> {
          return {
            driver: { async connect() {}, async close() {} },
            api: {
              async dispose() {},
              hosts: {
                async list() {
                  // Budget expires after the host directory, before the routed
                  // acquisition entry is reached.
                  vi.setSystemTime(
                    startedAt + DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS + 1,
                  );
                  return {
                    self: { serverId: 'srv_origin_local' },
                    hosts: [
                      {
                        registrationId: 'reg_not_reached',
                        serverId: 'srv_not_reached',
                        enabled: true,
                        status: 'online',
                      },
                    ],
                  };
                },
                client(): Promise<PaseoRemoteApi> {
                  clientCalls++;
                  return Promise.reject(new Error('must not be called'));
                },
              },
              projects: {
                async list() {
                  return { requestId: 'req_1', projects: sampleRawProjects };
                },
              },
              workspaces: {
                async list(): Promise<PaseoSdkWorkspaceListResult> {
                  return {
                    requestId: 'req_ws',
                    entries: [],
                    pageInfo: {
                      nextCursor: null,
                      prevCursor: null,
                      hasMore: false,
                    },
                  };
                },
              },
            },
          };
        },
      };
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );

      try {
        const inventory = await service.discover(validLocalConfig);

        expect(clientCalls).toBe(0);
        expect(inventory.complete).toBe(false);
        expect(inventory.hosts).toHaveLength(2);
        expect(inventory.hosts[1].status).toBe('unreachable');
        expect(inventory.hosts[1].error).toBe('TIMEOUT');
      } finally {
        vi.useRealTimers();
      }
    });

    it('discover_ResolvedRoutedClientWhenDeadlineExpires_DisposesOnce', async () => {
      vi.useFakeTimers();
      const startedAt = Date.now();
      const lateDisposed = Promise.withResolvers<void>();
      let disposeCalls = 0;
      let clientCalls = 0;
      const lateClient: PaseoRemoteApi = {
        async dispose() {
          disposeCalls++;
          lateDisposed.resolve();
        },
        projects: {
          async list() {
            return { requestId: 'req_late', projects: [] };
          },
        },
      };
      const mockFactory: PaseoConnectionFactory = {
        async connectOrigin(): Promise<ConnectedPaseoOrigin> {
          return {
            driver: { async connect() {}, async close() {} },
            api: {
              async dispose() {},
              hosts: {
                async list() {
                  return {
                    self: { serverId: 'srv_origin_local' },
                    hosts: [
                      {
                        registrationId: 'reg_edge',
                        serverId: 'srv_edge',
                        enabled: true,
                        status: 'online',
                      },
                    ],
                  };
                },
                client(): Promise<PaseoRemoteApi> {
                  clientCalls++;
                  // Fulfilment wins the race against an expired timer: only the
                  // post-resolution absolute check can observe the expiry.
                  return Promise.resolve().then(() => {
                    vi.setSystemTime(
                      startedAt + DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS + 1,
                    );
                    return lateClient;
                  });
                },
              },
              projects: {
                async list() {
                  return { requestId: 'req_1', projects: sampleRawProjects };
                },
              },
              workspaces: {
                async list(): Promise<PaseoSdkWorkspaceListResult> {
                  return {
                    requestId: 'req_ws',
                    entries: [],
                    pageInfo: {
                      nextCursor: null,
                      prevCursor: null,
                      hasMore: false,
                    },
                  };
                },
              },
            },
          };
        },
      };
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );

      try {
        const inventory = await service.discover(validLocalConfig);
        await lateDisposed.promise;

        expect(clientCalls).toBe(1);
        expect(disposeCalls).toBe(1);
        expect(inventory.complete).toBe(false);
        expect(inventory.hosts).toHaveLength(2);
        expect(inventory.hosts[1].status).toBe('unreachable');
        expect(inventory.hosts[1].error).toBe('TIMEOUT');
      } finally {
        vi.useRealTimers();
      }
    });

    it('discover_ResolvedOriginConnectionWhenDeadlineExpires_DisposesOnce', async () => {
      vi.useFakeTimers();
      const startedAt = Date.now();
      const lateDisposed = Promise.withResolvers<void>();
      const lateClosed = Promise.withResolvers<void>();
      let disposeCalls = 0;
      let closeCalls = 0;
      const mockFactory: PaseoConnectionFactory = {
        connectOrigin(): Promise<ConnectedPaseoOrigin> {
          return Promise.resolve().then(() => {
            vi.setSystemTime(
              startedAt + DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS + 1,
            );
            return {
              driver: {
                async connect() {},
                async close() {
                  closeCalls++;
                  lateClosed.resolve();
                },
              },
              api: {
                async dispose() {
                  disposeCalls++;
                  lateDisposed.resolve();
                },
                hosts: {
                  async list() {
                    return { hosts: [] };
                  },
                  async client(): Promise<PaseoRemoteApi> {
                    throw new Error('routed client must not be requested');
                  },
                },
                projects: {
                  async list() {
                    return { requestId: 'req_unused', projects: [] };
                  },
                },
              },
            };
          });
        },
      };
      const service = new HarnessDiscoveryService(
        defaultMockExecFile,
        mockFactory,
      );

      try {
        const inventory = await service.discover(validLocalConfig);
        await lateDisposed.promise;
        await lateClosed.promise;

        expect(disposeCalls).toBe(1);
        expect(closeCalls).toBe(1);
        expect(inventory.complete).toBe(false);
        expect(inventory.hosts).toHaveLength(1);
        expect(inventory.hosts[0].status).toBe('unreachable');
        expect(inventory.hosts[0].error).toBe('TIMEOUT');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('workspace validation utilities', () => {
    it('isValidWorkspaceId rejects invalid syntax or bounds', () => {
      expect(isValidWorkspaceId('ws_valid-1.0:test')).toBe(true);
      expect(isValidWorkspaceId('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(
        true,
      );
      expect(isValidWorkspaceId('')).toBe(false);
      expect(isValidWorkspaceId('   ')).toBe(false);
      expect(isValidWorkspaceId('has spaces')).toBe(false);
      expect(isValidWorkspaceId('user@domain')).toBe(false);
      expect(isValidWorkspaceId('has\0nul')).toBe(false);
      expect(isValidWorkspaceId('has\nnewline')).toBe(false);
      expect(isValidWorkspaceId('a'.repeat(257))).toBe(false);
    });

    it('isValidWorkspacePath accepts absolute POSIX and Windows and rejects traversal/relative', () => {
      expect(isValidWorkspacePath('/workspace/alpha')).toBe(true);
      expect(isValidWorkspacePath('C:\\workspace\\alpha')).toBe(true);
      expect(isValidWorkspacePath('\\\\server\\share\\alpha')).toBe(true);
      expect(isValidWorkspacePath('relative/path')).toBe(false);
      expect(isValidWorkspacePath('')).toBe(false);
      expect(isValidWorkspacePath('   ')).toBe(false);
      expect(isValidWorkspacePath('/workspace/alpha/../../etc')).toBe(false);
      expect(isValidWorkspacePath('/workspace/alpha/..')).toBe(false);
      expect(isValidWorkspacePath('/workspace/\0null')).toBe(false);
      expect(isValidWorkspacePath('/' + 'a'.repeat(4096))).toBe(false);
    });

    it('getProjectCheckoutPaths includes primary path and unique checkout paths', () => {
      const proj = {
        projectId: 'p1',
        name: 'Project 1',
        path: '/primary/root',
        kind: 'git',
        checkouts: [
          { workspaceId: 'w1', path: '/primary/root' }, // matches primary
          { workspaceId: 'w2', path: '/worktree/one' },
          { workspaceId: 'w3', path: '/worktree/two' },
        ],
      };
      expect(getProjectCheckoutPaths(proj)).toEqual([
        '/primary/root',
        '/worktree/one',
        '/worktree/two',
      ]);
    });
  });
});
