import { execFile as nodeExecFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import type { HarnessConfig } from './HarnessSetupService';
import { HarnessError, validateHarnessOrigin } from './HarnessSetupService';
import {
  classifySdkError,
  DefaultPaseoConnectionFactory,
  DISCOVERY_LIMITS,
  resolveOriginTarget,
} from './PaseoSdkConnection';
import type {
  ConnectedPaseoOrigin,
  ExecFileFn,
  PaseoConnectionFactory,
  PaseoRemoteApi,
  PaseoSdkWorkspaceLister,
  PaseoSdkWorkspaceListResult,
  RawHostSummary,
} from './PaseoSdkConnection';

export type HarnessProjectCheckoutKind =
  'worktree' | 'checkout' | 'local_checkout' | 'directory';

export interface HarnessProjectCheckout {
  workspaceId: string;
  path: string;
  kind?: HarnessProjectCheckoutKind;
}

export interface HarnessProject {
  projectId: string;
  name: string;
  path: string;
  kind: string;
  projectKey?: string;
  checkouts?: HarnessProjectCheckout[];
}

export function isValidWorkspaceId(id: string): boolean {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > 256 || trimmed !== id) {
    return false;
  }
  if (
    trimmed.includes('\0') ||
    /[\r\n\t]/.test(trimmed) ||
    trimmed.includes('@') ||
    trimmed.includes(' ')
  ) {
    return false;
  }
  return /^[a-zA-Z0-9_.:-]+$/.test(trimmed);
}

export function isValidWorkspacePath(p: string): boolean {
  if (typeof p !== 'string') return false;
  const trimmed = p.trim();
  if (trimmed.length === 0 || trimmed.length > 4096 || trimmed !== p) {
    return false;
  }
  if (trimmed.includes('\0')) {
    return false;
  }
  const normalized = trimmed.replace(/\\/g, '/');
  if (
    normalized.includes('/../') ||
    normalized.endsWith('/..') ||
    normalized === '..'
  ) {
    return false;
  }
  return path.posix.isAbsolute(trimmed) || path.win32.isAbsolute(trimmed);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new HarnessError('TIMEOUT', 'Discovery deadline exceeded');
  }
  const { promise: timeoutPromise, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(() => {
    reject(new HarnessError('TIMEOUT', 'Discovery deadline exceeded'));
  }, timeoutMs);
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Status for a caught SDK operation failure.
 *
 * A failed SDK call is a reachability failure by provenance: the API exists but
 * the host could not serve it. Only an explicit capability/disabled
 * classification from `classifySdkError` means the host answered and cannot
 * serve this API, which is `unsupported`. Returned-but-invalid descriptors are
 * handled separately and never reach this function.
 */
function hostStatusForSdkFailure(
  errorCode: string,
): 'unreachable' | 'unsupported' {
  return errorCode === 'UNSUPPORTED' || errorCode === 'HOST_DISABLED'
    ? 'unsupported'
    : 'unreachable';
}

/** Per-cleanup ceiling; the absolute discovery deadline always wins. */
const CLEANUP_TIMEOUT_MS = 2000;

/**
 * Cleans up an owned SDK resource inside the absolute discovery deadline.
 *
 * While budget remains, the cleanup is awaited for at most
 * `min(remaining, CLEANUP_TIMEOUT_MS)`. Once the deadline is exhausted the
 * cleanup is still started, but it is not awaited: a fresh grace window would
 * push the response past the aggregate deadline. Cleanup failures and cleanup
 * timeouts never change the discovery result, and outcomes are observed so
 * they cannot surface as unhandled rejections.
 */
async function cleanupWithinDeadline(
  cleanup: (() => Promise<void>) | undefined,
  deadline: number,
): Promise<void> {
  if (!cleanup) return;

  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    void Promise.resolve()
      .then(cleanup)
      .catch(() => undefined);
    return;
  }

  try {
    await withTimeout(
      Promise.resolve().then(cleanup),
      Math.min(remaining, CLEANUP_TIMEOUT_MS),
    );
  } catch {
    // Best-effort cleanup: errors and timeouts never mask the inventory result.
  }
}

/**
 * Creates and bounds an SDK resource acquisition by the absolute discovery
 * deadline while keeping ownership of the single created promise.
 *
 * The callback is invoked only once the entry check proves budget remains, so
 * no SDK resource work starts on an expired budget. If the wait fails, or the
 * deadline expires after creation (including a fulfillment that wins the race
 * against an expired timer), exactly one owner disposes the resource: either
 * the catch continuation for a pending/late fulfillment, or the post-check for
 * an already-resolved value. Both are never attached for the same value.
 */
async function acquireWithinDeadline<T>(
  acquire: () => Promise<T>,
  deadline: number,
  disposeLate: (value: T) => Promise<void>,
): Promise<T> {
  if (deadline - Date.now() <= 0) {
    throw new HarnessError('TIMEOUT', 'Discovery deadline exceeded');
  }

  const acquisition = acquire();

  let acquired: T;
  try {
    acquired = await withTimeout(acquisition, deadline - Date.now());
  } catch (err: unknown) {
    acquisition.then(
      (late) => {
        void disposeLate(late).catch(() => undefined);
      },
      () => undefined,
    );
    throw err;
  }

  if (deadline - Date.now() <= 0) {
    await disposeLate(acquired).catch(() => undefined);
    throw new HarnessError('TIMEOUT', 'Discovery deadline exceeded');
  }

  return acquired;
}

export interface ParsePrimaryProjectsResult {
  ok: boolean;
  projects?: HarnessProject[];
  error?: string;
  overflow?: boolean;
}

export function parsePrimaryProjects(
  rawResult: unknown,
): ParsePrimaryProjectsResult {
  if (
    !rawResult ||
    typeof rawResult !== 'object' ||
    !('projects' in rawResult) ||
    !Array.isArray((rawResult as { projects?: unknown }).projects)
  ) {
    return { ok: false, error: 'INVALID_PROJECT_DATA' };
  }

  const rawList = (rawResult as { projects: unknown[] }).projects;
  const overflow = rawList.length > DISCOVERY_LIMITS.MAX_PROJECTS_PER_HOST;
  const count = Math.min(
    rawList.length,
    DISCOVERY_LIMITS.MAX_PROJECTS_PER_HOST,
  );

  const projects: HarnessProject[] = [];
  const projectById = new Map<string, HarnessProject>();

  for (let i = 0; i < count; i++) {
    const item = rawList[i];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'INVALID_PROJECT_DATA' };
    }

    const rec = item as Record<string, unknown>;
    const projectId = rec.projectId;
    if (typeof projectId !== 'string' || !isValidWorkspaceId(projectId)) {
      return { ok: false, error: 'INVALID_PROJECT_ID' };
    }

    const name = rec.projectDisplayName;
    if (typeof name !== 'string' || name.trim().length === 0) {
      return { ok: false, error: 'INVALID_PROJECT_DATA' };
    }

    const rootPath = rec.projectRootPath;
    if (typeof rootPath !== 'string' || !isValidWorkspacePath(rootPath)) {
      return { ok: false, error: 'INVALID_PROJECT_PATH' };
    }

    const kind = rec.projectKind;
    if (typeof kind !== 'string' || kind.trim().length === 0) {
      return { ok: false, error: 'INVALID_PROJECT_DATA' };
    }

    const rawKey = rec.projectKey;
    const projectKey =
      typeof rawKey === 'string' && rawKey.trim().length > 0
        ? rawKey.trim()
        : undefined;

    const existing = projectById.get(projectId);
    if (existing) {
      const identical =
        existing.path === rootPath.trim() &&
        existing.name === name.trim() &&
        existing.kind === kind.trim() &&
        existing.projectKey === projectKey;
      if (!identical) {
        return { ok: false, error: 'CONFLICTING_PROJECT_DESCRIPTOR' };
      }
      continue;
    }

    const project: HarnessProject = {
      projectId,
      name: name.trim(),
      path: rootPath.trim(),
      kind: kind.trim(),
      ...(projectKey ? { projectKey } : {}),
    };

    projectById.set(projectId, project);
    projects.push(project);
  }

  return { ok: true, projects, overflow };
}

export interface WorkspaceDiscoveryOutcome {
  ok: boolean;
  error?: string;
  status?: 'reachable' | 'unreachable' | 'unsupported';
}

export async function discoverWorkspacesForHost(
  api: { workspaces?: PaseoSdkWorkspaceLister },
  projects: HarnessProject[],
  aggregateDeadline: number,
): Promise<WorkspaceDiscoveryOutcome> {
  // CD1: unavailable SDK workspaces API visible unsupported/incomplete
  if (!api.workspaces || typeof api.workspaces.list !== 'function') {
    return {
      ok: false,
      error: 'UNSUPPORTED_WORKSPACE_API',
      status: 'unsupported',
    };
  }

  const projectMap = new Map<string, HarnessProject>();
  for (const p of projects) {
    p.checkouts = [];
    projectMap.set(p.projectId, p);
  }

  let cursor: string | undefined = undefined;
  let pageCount = 0;
  let totalEntries = 0;
  const seenCursors = new Set<string>();

  // CD5: host-wide workspaceId tracking
  interface WorkspaceRecord {
    projectId: string;
    path?: string;
    kind?: HarnessProjectCheckoutKind;
  }
  const hostWorkspaces = new Map<string, WorkspaceRecord>();

  const MAX_PAGES = DISCOVERY_LIMITS.MAX_WORKSPACE_PAGES_PER_HOST;
  const MAX_HOST_ENTRIES = DISCOVERY_LIMITS.MAX_WORKSPACES_PER_HOST;
  const MAX_PAGE_ENTRIES = DISCOVERY_LIMITS.MAX_WORKSPACES_PER_PAGE;

  while (true) {
    const remainingTime = aggregateDeadline - Date.now();
    if (remainingTime <= 0) {
      return { ok: false, error: 'TIMEOUT', status: 'unreachable' };
    }

    // CD3: enforce page cap BEFORE requesting RPC
    if (pageCount >= MAX_PAGES) {
      return { ok: false, error: 'WORKSPACE_LIMIT_EXCEEDED' };
    }

    let pageRes: PaseoSdkWorkspaceListResult;
    try {
      // CD4: bounded await with remaining aggregate deadline
      pageRes = await withTimeout(
        api.workspaces.list({
          page: {
            limit: MAX_PAGE_ENTRIES,
            ...(cursor !== undefined ? { cursor } : {}),
          },
        }),
        remainingTime,
      );
    } catch (err: unknown) {
      const classified = classifySdkError(err);
      if (classified === 'TIMEOUT') {
        return { ok: false, error: 'TIMEOUT', status: 'unreachable' };
      }
      return { ok: false, error: classified };
    }

    pageCount++;

    if (
      !pageRes ||
      typeof pageRes !== 'object' ||
      !Array.isArray(pageRes.entries)
    ) {
      return { ok: false, error: 'INVALID_WORKSPACE_DATA' };
    }

    // CD3: enforce <= 100 response entries per page
    if (pageRes.entries.length > MAX_PAGE_ENTRIES) {
      return { ok: false, error: 'WORKSPACE_LIMIT_EXCEEDED' };
    }

    // CD3: enforce <= 10k total entries across host
    totalEntries += pageRes.entries.length;
    if (totalEntries > MAX_HOST_ENTRIES) {
      return { ok: false, error: 'WORKSPACE_LIMIT_EXCEEDED' };
    }

    for (const entry of pageRes.entries) {
      if (!entry || typeof entry !== 'object') {
        return { ok: false, error: 'INVALID_WORKSPACE_DATA' };
      }

      const workspaceId = entry.id;
      if (typeof workspaceId !== 'string' || !isValidWorkspaceId(workspaceId)) {
        return { ok: false, error: 'INVALID_WORKSPACE_ID' };
      }

      const projectId = entry.projectId;
      if (typeof projectId !== 'string' || !isValidWorkspaceId(projectId)) {
        return { ok: false, error: 'INVALID_PROJECT_ID' };
      }

      const targetProject = projectMap.get(projectId);
      if (!targetProject) {
        return { ok: false, error: 'UNKNOWN_PROJECT_ASSOCIATION' };
      }

      // CD2: distinguish genuinely absent optional workspaceDirectory from supplied null/nonstring
      let wsDir: string | undefined = undefined;
      if (
        'workspaceDirectory' in entry &&
        entry.workspaceDirectory !== undefined
      ) {
        if (
          entry.workspaceDirectory === null ||
          typeof entry.workspaceDirectory !== 'string'
        ) {
          return { ok: false, error: 'INVALID_WORKSPACE_PATH' };
        }
        if (!isValidWorkspacePath(entry.workspaceDirectory)) {
          return { ok: false, error: 'INVALID_WORKSPACE_PATH' };
        }
        wsDir = entry.workspaceDirectory.trim();
      }

      let kind: HarnessProjectCheckoutKind | undefined;
      if (
        'workspaceKind' in entry &&
        entry.workspaceKind !== undefined &&
        entry.workspaceKind !== null
      ) {
        const rawKind = entry.workspaceKind;
        if (
          rawKind === 'worktree' ||
          rawKind === 'checkout' ||
          rawKind === 'local_checkout' ||
          rawKind === 'directory'
        ) {
          kind = rawKind;
        } else {
          return { ok: false, error: 'INVALID_WORKSPACE_KIND' };
        }
      }

      // CD5: host-wide workspaceId tracking
      const existing = hostWorkspaces.get(workspaceId);
      if (existing) {
        const sameProject = existing.projectId === projectId;
        const samePath = existing.path === wsDir;
        const sameKind = existing.kind === kind;
        if (!sameProject || !samePath || !sameKind) {
          return { ok: false, error: 'CONFLICTING_WORKSPACE_IDENTITY' };
        }
        continue;
      }

      hostWorkspaces.set(workspaceId, { projectId, path: wsDir, kind });

      if (wsDir !== undefined) {
        const checkouts = targetProject.checkouts!;
        // CD5: same project/path different IDs allowed collapse
        const duplicateRoot = checkouts.some((c) => c.path === wsDir);
        if (!duplicateRoot) {
          checkouts.push({
            workspaceId,
            path: wsDir,
            ...(kind ? { kind } : {}),
          });
        }
      }
    }

    // CD2: strict consumed pageInfo
    const pageInfo = pageRes.pageInfo;
    if (!pageInfo || typeof pageInfo !== 'object') {
      return { ok: false, error: 'INVALID_WORKSPACE_PAGING' };
    }
    if (typeof pageInfo.hasMore !== 'boolean') {
      return { ok: false, error: 'INVALID_WORKSPACE_PAGING' };
    }

    // CD2: both cursors are required `string | null` in the pinned 0.13
    // protocol. A missing or malformed cursor is invalid metadata rather than
    // an end-of-list signal, and a terminal page may still carry a string
    // nextCursor, so no null-only rule is inferred.
    if (
      (pageInfo.nextCursor !== null &&
        typeof pageInfo.nextCursor !== 'string') ||
      (pageInfo.prevCursor !== null && typeof pageInfo.prevCursor !== 'string')
    ) {
      return { ok: false, error: 'INVALID_WORKSPACE_PAGING' };
    }

    if (!pageInfo.hasMore) {
      break;
    }

    // CD3: enforce bounds BEFORE issuing next RPC
    if (pageCount >= MAX_PAGES || totalEntries >= MAX_HOST_ENTRIES) {
      return { ok: false, error: 'WORKSPACE_LIMIT_EXCEEDED' };
    }

    const nextCursor = pageInfo.nextCursor;
    if (typeof nextCursor !== 'string' || nextCursor.trim().length === 0) {
      return { ok: false, error: 'INVALID_WORKSPACE_PAGING' };
    }

    if (seenCursors.has(nextCursor)) {
      return { ok: false, error: 'INVALID_WORKSPACE_PAGING' };
    }

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return { ok: true };
}

export function getProjectCheckoutPaths(project: HarnessProject): string[] {
  const paths = [project.path];
  if (Array.isArray(project.checkouts)) {
    for (const c of project.checkouts) {
      if (c.path && !paths.includes(c.path)) {
        paths.push(c.path);
      }
    }
  }
  return paths;
}

export interface HarnessInventoryHost {
  hostKey: string;
  status: 'reachable' | 'unreachable' | 'unsupported';
  projects: HarnessProject[];
  error?: string;
  serverId?: string;
}

export interface HarnessInventory {
  schemaVersion: 1;
  complete: boolean;
  hosts: HarnessInventoryHost[];
}

export function resolveSafeHostKey(
  rawObj: Record<string, unknown>,
  index: number,
): string {
  const candidate =
    (typeof rawObj.registrationId === 'string' &&
      rawObj.registrationId.trim()) ||
    (typeof rawObj.serverId === 'string' && rawObj.serverId.trim()) ||
    '';

  // Safe identifier: alphanumeric, hyphens, underscores, dots, NO credentials (@), NO control chars/whitespace
  if (
    candidate &&
    /^[a-zA-Z0-9_.-]+$/.test(candidate) &&
    !candidate.includes('@')
  ) {
    return candidate;
  }

  return `host_${index + 1}`;
}

const nodeExecFileAsync = promisify(nodeExecFile);

const defaultExecFile: ExecFileFn = async (file, args, options) => {
  const result = await nodeExecFileAsync(file, args, {
    cwd: options.cwd,
    env: options.env,
    timeout: options.timeout,
    maxBuffer: options.maxBuffer,
    encoding: 'utf8',
  });
  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
  };
};

export class HarnessDiscoveryService {
  private readonly execFileFn: ExecFileFn;
  private readonly connectionFactory: PaseoConnectionFactory;

  constructor(
    execFileFn?: ExecFileFn,
    connectionFactory?: PaseoConnectionFactory,
  ) {
    this.execFileFn = execFileFn ?? defaultExecFile;
    this.connectionFactory =
      connectionFactory ?? new DefaultPaseoConnectionFactory();
  }

  async discover(config: HarnessConfig): Promise<HarnessInventory> {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new HarnessError(
        'INVALID_CONFIG',
        'Configuration must be an object',
      );
    }
    if (config.schemaVersion !== 1) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Unsupported schema version: ${String(config.schemaVersion)}`,
      );
    }
    if (
      typeof config.paseoCommand !== 'string' ||
      config.paseoCommand.trim().length === 0 ||
      !path.isAbsolute(config.paseoCommand) ||
      config.paseoCommand.includes('\0')
    ) {
      throw new HarnessError(
        'INVALID_CONFIG',
        'Paseo command must be a non-empty absolute path without NUL characters',
      );
    }
    if (config.origin !== undefined) {
      validateHarnessOrigin(config.origin);
    }

    const aggregateDeadline =
      Date.now() + DISCOVERY_LIMITS.AGGREGATE_TIMEOUT_MS;
    const hosts: HarnessInventoryHost[] = [];
    let complete = true;

    const originHostKey = config.origin ?? 'local';
    const visitedRegistrationIds = new Set<string>([originHostKey]);
    const visitedServerIds = new Set<string>([originHostKey]);

    // 1. Resolve origin target, serverId, and auth
    const originRemaining = aggregateDeadline - Date.now();
    if (originRemaining <= 0) {
      return {
        schemaVersion: 1,
        complete: false,
        hosts: [
          {
            hostKey: originHostKey,
            status: 'unreachable',
            projects: [],
            error: 'TIMEOUT',
          },
        ],
      };
    }

    const resolvedOrigin = await resolveOriginTarget(
      config,
      this.execFileFn,
      Math.min(DISCOVERY_LIMITS.SUBPROCESS_TIMEOUT_MS, originRemaining),
    );

    if (!resolvedOrigin.ok) {
      return {
        schemaVersion: 1,
        complete: false,
        hosts: [
          {
            hostKey: originHostKey,
            status: 'unreachable',
            projects: [],
            error: resolvedOrigin.error,
          },
        ],
      };
    }

    // 2. Connect to origin via Paseo SDK
    const connectRemaining = aggregateDeadline - Date.now();
    if (connectRemaining <= 0) {
      return {
        schemaVersion: 1,
        complete: false,
        hosts: [
          {
            hostKey: originHostKey,
            status: 'unreachable',
            projects: [],
            error: 'TIMEOUT',
            ...(resolvedOrigin.value.serverId
              ? { serverId: resolvedOrigin.value.serverId }
              : {}),
          },
        ],
      };
    }

    let originConnection: ConnectedPaseoOrigin;
    try {
      // The acquisition starts only after the pre-expiry check, and the wait is
      // bounded by the absolute aggregate deadline. If the factory resolves a
      // connection after the deadline won, this caller disposes it as the
      // single owner instead of leaking the late driver/API.
      originConnection = await acquireWithinDeadline(
        () => {
          const connectBudget = aggregateDeadline - Date.now();
          return this.connectionFactory.connectOrigin({
            connection: resolvedOrigin.value.target,
            clientId: 'ags-discovery',
            clientType: 'cli',
            connectTimeoutMs: Math.max(
              1,
              Math.min(DISCOVERY_LIMITS.CONNECT_TIMEOUT_MS, connectBudget),
            ),
            reconnect: { enabled: false },
            localCredential: resolvedOrigin.value.localCredential
              ? () => resolvedOrigin.value.localCredential!
              : undefined,
            password: resolvedOrigin.value.password,
          });
        },
        aggregateDeadline,
        async (late) => {
          await cleanupWithinDeadline(
            () => late.api.dispose(),
            aggregateDeadline,
          );
          await cleanupWithinDeadline(
            () => late.driver.close(),
            aggregateDeadline,
          );
        },
      );
    } catch (err: unknown) {
      return {
        schemaVersion: 1,
        complete: false,
        hosts: [
          {
            hostKey: originHostKey,
            status: 'unreachable',
            projects: [],
            error: classifySdkError(err),
            ...(resolvedOrigin.value.serverId
              ? { serverId: resolvedOrigin.value.serverId }
              : {}),
          },
        ],
      };
    }

    const { driver, api: originApi } = originConnection;

    try {
      // 3. Query origin projects
      let originProjects: HarnessProject[] = [];
      let originProjectsOverflow = false;
      let originError: string | undefined;
      let originErrorStatus: 'unreachable' | 'unsupported' | undefined;

      try {
        const projRemaining = aggregateDeadline - Date.now();
        if (projRemaining <= 0) {
          throw new HarnessError('TIMEOUT', 'Discovery deadline exceeded');
        }
        const projRes = await withTimeout(
          originApi.projects.list(),
          projRemaining,
        );
        const parsed = parsePrimaryProjects(projRes);
        if (!parsed.ok) {
          // A payload was returned but its primary descriptors are malformed:
          // metadata/capability failure, not an unreachable host.
          originError = parsed.error;
          originErrorStatus = 'unsupported';
        } else {
          originProjects = parsed.projects!;
          originProjectsOverflow = parsed.overflow!;
        }
      } catch (err: unknown) {
        complete = false;
        originError = classifySdkError(err);
        originErrorStatus = hostStatusForSdkFailure(originError);
      }

      if (originError) {
        complete = false;
        hosts.push({
          hostKey: originHostKey,
          status: originErrorStatus ?? 'unsupported',
          projects: [],
          error: originError,
          ...(resolvedOrigin.value.serverId
            ? { serverId: resolvedOrigin.value.serverId }
            : {}),
        });
      } else if (originProjectsOverflow) {
        complete = false;
        hosts.push({
          hostKey: originHostKey,
          status: 'reachable',
          projects: originProjects,
          error: 'PROJECT_LIMIT_EXCEEDED',
          ...(resolvedOrigin.value.serverId
            ? { serverId: resolvedOrigin.value.serverId }
            : {}),
        });
      } else {
        const wsOutcome = await discoverWorkspacesForHost(
          originApi,
          originProjects,
          aggregateDeadline,
        );
        if (!wsOutcome.ok) {
          complete = false;
          hosts.push({
            hostKey: originHostKey,
            status: wsOutcome.status ?? 'reachable',
            projects: originProjects,
            error: wsOutcome.error,
            ...(resolvedOrigin.value.serverId
              ? { serverId: resolvedOrigin.value.serverId }
              : {}),
          });
        } else {
          hosts.push({
            hostKey: originHostKey,
            status: 'reachable',
            projects: originProjects,
            ...(resolvedOrigin.value.serverId
              ? { serverId: resolvedOrigin.value.serverId }
              : {}),
          });
        }
      }

      // 4. Query origin host directory
      const hostDirRemaining = aggregateDeadline - Date.now();
      if (hostDirRemaining <= 0) {
        complete = false;
        return {
          schemaVersion: 1,
          complete,
          hosts,
        };
      }

      let hostListRes: {
        self?: { serverId?: string };
        hosts?: RawHostSummary[];
      };
      try {
        hostListRes = await withTimeout(
          originApi.hosts.list(),
          hostDirRemaining,
        );
      } catch (err: unknown) {
        // Host directory is required for routed discovery: a failed query
        // keeps the origin metadata already gathered, records the classified
        // error and marks the inventory incomplete. The outer finally still
        // releases the origin API and driver.
        complete = false;
        const hostDirError = classifySdkError(err);
        const hostDirStatus = hostStatusForSdkFailure(hostDirError);
        const originEntry = hosts.find((h) => h.hostKey === originHostKey);
        if (originEntry) {
          if (originEntry.error === undefined) {
            originEntry.error = hostDirError;
          }
          if (originEntry.projects.length === 0) {
            originEntry.status = hostDirStatus;
          }
        } else {
          hosts.push({
            hostKey: originHostKey,
            status: hostDirStatus,
            projects: [],
            error: hostDirError,
            ...(resolvedOrigin.value.serverId
              ? { serverId: resolvedOrigin.value.serverId }
              : {}),
          });
        }
        return {
          schemaVersion: 1,
          complete,
          hosts,
        };
      }

      const selfServerId = hostListRes?.self?.serverId?.trim();
      if (selfServerId) {
        visitedServerIds.add(selfServerId);
        if (hosts.length > 0 && !hosts[0].serverId) {
          hosts[0].serverId = selfServerId;
        }
      }

      const rawHosts = Array.isArray(hostListRes?.hosts)
        ? hostListRes.hosts
        : [];

      // 5. Traverse discovered remote hosts
      let traversedRemoteCount = 0;
      for (let i = 0; i < rawHosts.length; i++) {
        const rawHost = rawHosts[i];
        if (!rawHost || typeof rawHost !== 'object') {
          complete = false;
          hosts.push({
            hostKey: `host_${i + 1}`,
            status: 'unsupported',
            projects: [],
            error: 'UNKNOWN_HOST_SHAPE',
          });
          continue;
        }

        const safeHostKey = resolveSafeHostKey(rawHost, i);
        const rawServerId =
          typeof rawHost.serverId === 'string' && rawHost.serverId.trim()
            ? rawHost.serverId.trim()
            : undefined;
        const rawRegId =
          typeof rawHost.registrationId === 'string' &&
          rawHost.registrationId.trim()
            ? rawHost.registrationId.trim()
            : undefined;

        // Check deadline
        if (Date.now() >= aggregateDeadline) {
          complete = false;
          const isExplicitlyDisabled =
            rawHost.enabled === false || rawHost.status === 'disabled';
          hosts.push({
            hostKey: safeHostKey,
            status: isExplicitlyDisabled ? 'unsupported' : 'unreachable',
            projects: [],
            error: isExplicitlyDisabled ? 'HOST_DISABLED' : 'TIMEOUT',
            ...(rawServerId ? { serverId: rawServerId } : {}),
          });
          continue;
        }

        // Check disabled
        if (rawHost.enabled === false || rawHost.status === 'disabled') {
          complete = false;
          hosts.push({
            hostKey: safeHostKey,
            status: 'unsupported',
            projects: [],
            error: 'HOST_DISABLED',
            ...(rawServerId ? { serverId: rawServerId } : {}),
          });
          continue;
        }

        // Deduplication
        if (
          (rawRegId && visitedRegistrationIds.has(rawRegId)) ||
          (rawServerId && visitedServerIds.has(rawServerId))
        ) {
          continue;
        }
        if (rawRegId) visitedRegistrationIds.add(rawRegId);
        if (rawServerId) visitedServerIds.add(rawServerId);

        // Enforce MAX_REMOTE_HOSTS (32)
        if (traversedRemoteCount >= DISCOVERY_LIMITS.MAX_REMOTE_HOSTS) {
          complete = false;
          hosts.push({
            hostKey: safeHostKey,
            status: 'unsupported',
            projects: [],
            error: 'HOST_LIMIT_EXCEEDED',
            ...(rawServerId ? { serverId: rawServerId } : {}),
          });
          continue;
        }
        traversedRemoteCount++;

        // Check offline
        if (rawHost.status === 'offline') {
          complete = false;
          hosts.push({
            hostKey: safeHostKey,
            status: 'unreachable',
            projects: [],
            error: 'HOST_OFFLINE',
            ...(rawServerId ? { serverId: rawServerId } : {}),
          });
          continue;
        }

        // Check unidentified (missing or invalid serverId)
        if (!rawServerId) {
          complete = false;
          hosts.push({
            hostKey: safeHostKey,
            status: 'unsupported',
            projects: [],
            error: 'UNIDENTIFIED_HOST',
          });
          continue;
        }

        // Connect to remote host: api.hosts.client(rawServerId) - ONE HOP ONLY
        let remoteApi: PaseoRemoteApi | null = null;
        try {
          const remoteRemaining = aggregateDeadline - Date.now();
          if (remoteRemaining <= 0) {
            complete = false;
            hosts.push({
              hostKey: safeHostKey,
              status: 'unreachable',
              projects: [],
              error: 'TIMEOUT',
              serverId: rawServerId,
            });
            continue;
          }

          remoteApi = await acquireWithinDeadline(
            () => originApi.hosts.client(rawServerId),
            aggregateDeadline,
            (late) =>
              cleanupWithinDeadline(() => late.dispose(), aggregateDeadline),
          );

          const remoteProjRemaining = aggregateDeadline - Date.now();
          if (remoteProjRemaining <= 0) {
            complete = false;
            hosts.push({
              hostKey: safeHostKey,
              status: 'unreachable',
              projects: [],
              error: 'TIMEOUT',
              serverId: rawServerId,
            });
            continue;
          }
          const remoteProjectsRes = await withTimeout(
            remoteApi.projects.list(),
            remoteProjRemaining,
          );
          const parsedRemote = parsePrimaryProjects(remoteProjectsRes);
          if (!parsedRemote.ok) {
            complete = false;
            hosts.push({
              hostKey: safeHostKey,
              status: 'unsupported',
              projects: [],
              error: parsedRemote.error,
              serverId: rawServerId,
            });
            continue;
          }

          const remoteProjects = parsedRemote.projects!;
          const remoteOverflow = parsedRemote.overflow!;

          if (remoteOverflow) {
            complete = false;
            hosts.push({
              hostKey: safeHostKey,
              status: 'reachable',
              projects: remoteProjects,
              error: 'PROJECT_LIMIT_EXCEEDED',
              serverId: rawServerId,
            });
          } else {
            const wsOutcome = await discoverWorkspacesForHost(
              remoteApi,
              remoteProjects,
              aggregateDeadline,
            );
            if (!wsOutcome.ok) {
              complete = false;
              hosts.push({
                hostKey: safeHostKey,
                status: wsOutcome.status ?? 'reachable',
                projects: remoteProjects,
                error: wsOutcome.error,
                serverId: rawServerId,
              });
            } else {
              hosts.push({
                hostKey: safeHostKey,
                status: 'reachable',
                projects: remoteProjects,
                serverId: rawServerId,
              });
            }
          }
        } catch (err: unknown) {
          complete = false;
          const errCode = classifySdkError(err);
          hosts.push({
            hostKey: safeHostKey,
            status: hostStatusForSdkFailure(errCode),
            projects: [],
            error: errCode,
            serverId: rawServerId,
          });
        } finally {
          const ownedRemote = remoteApi;
          await cleanupWithinDeadline(
            ownedRemote ? () => ownedRemote.dispose() : undefined,
            aggregateDeadline,
          );
        }
      }
    } finally {
      // Cleanup shares the absolute deadline: it is awaited only while budget
      // remains and merely started once the deadline is exhausted, so the
      // response cannot be extended by fresh cleanup grace windows.
      await cleanupWithinDeadline(() => originApi.dispose(), aggregateDeadline);
      await cleanupWithinDeadline(() => driver.close(), aggregateDeadline);
    }

    // Final completeness verification
    if (hosts.length === 0) {
      complete = false;
    } else {
      for (const h of hosts) {
        if (h.status !== 'reachable' || h.error !== undefined) {
          complete = false;
          break;
        }
      }
    }

    return {
      schemaVersion: 1,
      complete,
      hosts,
    };
  }
}
