import { execFile as nodeExecFile } from 'child_process';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import {
  HarnessConfig,
  HarnessError,
  validateHarnessOrigin,
} from './HarnessSetupService';

export interface HarnessProject {
  projectId: string;
  name: string;
  path: string;
  kind: string;
}

export interface HarnessInventoryHost {
  hostKey: string;
  status: 'reachable' | 'unreachable' | 'unsupported';
  projects: HarnessProject[];
  error?: string;
}

export interface HarnessInventory {
  schemaVersion: 1;
  complete: boolean;
  hosts: HarnessInventoryHost[];
}

export interface ExecFileResult {
  stdout: string;
  stderr: string;
}

export interface ExecFileOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeout: number;
  maxBuffer: number;
}

export type ExecFileFn = (
  file: string,
  args: string[],
  options: ExecFileOptions,
) => Promise<ExecFileResult>;

export const DISCOVERY_LIMITS = {
  MAX_REMOTE_HOSTS: 32,
  MAX_PROJECTS_PER_HOST: 10000,
  SUBPROCESS_TIMEOUT_MS: 10000,
  AGGREGATE_TIMEOUT_MS: 60000,
  MAX_BUFFER_BYTES: 4 * 1024 * 1024,
} as const;

export function getSanitizedEnv(): NodeJS.ProcessEnv {
  const allowlist = [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'TMPDIR',
    'TMP',
    'TEMP',
    'PASEO_HOME',
    'PASEO_BIN_PATH',
    'SYSTEMROOT',
    'WINDIR',
    'COMSPEC',
    'PATHEXT',
  ];

  const env: NodeJS.ProcessEnv = {};
  for (const key of allowlist) {
    if (process.env[key] !== undefined) {
      env[key] = process.env[key];
    }
  }
  return env;
}

export function classifySubprocessError(err: unknown): string {
  if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    const msg = typeof errorObj.message === 'string' ? errorObj.message : '';
    const code = typeof errorObj.code === 'string' ? errorObj.code : '';
    const signal = typeof errorObj.signal === 'string' ? errorObj.signal : '';
    const killed = Boolean(errorObj.killed);

    if (
      code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ||
      msg.includes('maxBuffer')
    ) {
      return 'BUFFER_OVERFLOW';
    }
    if (
      killed ||
      code === 'ETIMEDOUT' ||
      signal === 'SIGTERM' ||
      signal === 'SIGKILL' ||
      msg.includes('TIMEDOUT')
    ) {
      return 'TIMEOUT';
    }
    if (code === 'ENOENT') {
      return 'COMMAND_NOT_FOUND';
    }
    if (code === 'EACCES') {
      return 'PERMISSION_DENIED';
    }
    if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) {
      return 'UNREACHABLE';
    }
  }
  return 'PROCESS_FAILED';
}

function resolveSafeHostKey(
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

  constructor(execFileFn?: ExecFileFn) {
    this.execFileFn = execFileFn ?? defaultExecFile;
  }

  private async runCommand(
    paseoCommand: string,
    args: string[],
    timeoutMs: number,
  ): Promise<{ ok: true; stdout: string } | { ok: false; errorCode: string }> {
    try {
      const res = await this.execFileFn(paseoCommand, args, {
        cwd: os.tmpdir(),
        env: getSanitizedEnv(),
        timeout: Math.max(1, timeoutMs),
        maxBuffer: DISCOVERY_LIMITS.MAX_BUFFER_BYTES,
      });
      return { ok: true, stdout: res.stdout };
    } catch (err: unknown) {
      return { ok: false, errorCode: classifySubprocessError(err) };
    }
  }

  private parseProjects(stdout: string):
    | {
        ok: true;
        projects: HarnessProject[];
        overflow: boolean;
      }
    | {
        ok: false;
        error: string;
      } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return { ok: false, error: 'MALFORMED_OUTPUT' };
    }

    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'MALFORMED_OUTPUT' };
    }

    const projects: HarnessProject[] = [];
    const overflow = parsed.length > DISCOVERY_LIMITS.MAX_PROJECTS_PER_HOST;
    const countToProcess = Math.min(
      parsed.length,
      DISCOVERY_LIMITS.MAX_PROJECTS_PER_HOST,
    );

    for (let i = 0; i < countToProcess; i++) {
      const item = parsed[i];
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        typeof (item as Record<string, unknown>).projectId !== 'string' ||
        typeof (item as Record<string, unknown>).name !== 'string' ||
        typeof (item as Record<string, unknown>).path !== 'string' ||
        typeof (item as Record<string, unknown>).kind !== 'string'
      ) {
        return { ok: false, error: 'MALFORMED_OUTPUT' };
      }
      const p = item as Record<string, string>;
      projects.push({
        projectId: p.projectId,
        name: p.name,
        path: p.path,
        kind: p.kind,
      });
    }

    return { ok: true, projects, overflow };
  }

  private parseHostList(stdout: string):
    | {
        ok: true;
        rawHosts: unknown[];
        selfServerId?: string;
      }
    | {
        ok: false;
        error: string;
      } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return { ok: false, error: 'MALFORMED_OUTPUT' };
    }

    if (Array.isArray(parsed)) {
      return { ok: true, rawHosts: parsed };
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as Record<string, unknown>).hosts)
    ) {
      const obj = parsed as Record<string, unknown>;
      let selfServerId: string | undefined;

      if (
        obj.self &&
        typeof obj.self === 'object' &&
        !Array.isArray(obj.self)
      ) {
        const selfObj = obj.self as Record<string, unknown>;
        if (typeof selfObj.serverId === 'string' && selfObj.serverId.trim()) {
          selfServerId = selfObj.serverId.trim();
        }
      }

      return {
        ok: true,
        rawHosts: obj.hosts as unknown[],
        selfServerId,
      };
    }

    return { ok: false, error: 'MALFORMED_OUTPUT' };
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

    // 1. Query origin projects
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

    const originProjectArgs = [
      ...(config.origin ? ['--host', config.origin] : []),
      'project',
      'ls',
      '--json',
    ];
    const originProjectRes = await this.runCommand(
      config.paseoCommand,
      originProjectArgs,
      Math.min(DISCOVERY_LIMITS.SUBPROCESS_TIMEOUT_MS, originRemaining),
    );

    if (!originProjectRes.ok) {
      complete = false;
      hosts.push({
        hostKey: originHostKey,
        status: 'unreachable',
        projects: [],
        error: originProjectRes.errorCode,
      });
    } else {
      const parsedOriginProjects = this.parseProjects(originProjectRes.stdout);
      if (!parsedOriginProjects.ok) {
        complete = false;
        hosts.push({
          hostKey: originHostKey,
          status: 'unreachable',
          projects: [],
          error: parsedOriginProjects.error,
        });
      } else if (parsedOriginProjects.overflow) {
        complete = false;
        hosts.push({
          hostKey: originHostKey,
          status: 'reachable',
          projects: parsedOriginProjects.projects,
          error: 'PROJECT_LIMIT_EXCEEDED',
        });
      } else {
        hosts.push({
          hostKey: originHostKey,
          status: 'reachable',
          projects: parsedOriginProjects.projects,
        });
      }
    }

    // 2. Query origin host directory
    const hostDirRemaining = aggregateDeadline - Date.now();
    if (hostDirRemaining <= 0) {
      complete = false;
      return {
        schemaVersion: 1,
        complete,
        hosts,
      };
    }

    const originHostArgs = [
      ...(config.origin ? ['--host', config.origin] : []),
      'host',
      'ls',
      '--json',
    ];
    const originHostRes = await this.runCommand(
      config.paseoCommand,
      originHostArgs,
      Math.min(DISCOVERY_LIMITS.SUBPROCESS_TIMEOUT_MS, hostDirRemaining),
    );

    if (!originHostRes.ok) {
      // Keep origin entry even host-list fails and report incomplete
      complete = false;
      return {
        schemaVersion: 1,
        complete,
        hosts,
      };
    }

    const parsedHosts = this.parseHostList(originHostRes.stdout);
    if (!parsedHosts.ok) {
      complete = false;
      return {
        schemaVersion: 1,
        complete,
        hosts,
      };
    }

    // Seed self identity from SDK style listing if present
    if (parsedHosts.selfServerId) {
      visitedServerIds.add(parsedHosts.selfServerId);
    }

    // 3. Traverse discovered remote hosts
    let traversedRemoteCount = 0;
    for (let i = 0; i < parsedHosts.rawHosts.length; i++) {
      const rawHost = parsedHosts.rawHosts[i];

      if (!rawHost || typeof rawHost !== 'object' || Array.isArray(rawHost)) {
        complete = false;
        hosts.push({
          hostKey: `host_${i + 1}`,
          status: 'unsupported',
          projects: [],
          error: 'UNKNOWN_HOST_SHAPE',
        });
        continue;
      }

      const rawObj = rawHost as Record<string, unknown>;
      const safeHostKey = resolveSafeHostKey(rawObj, i);

      // Check if deadline has been reached: preserve all remaining known hosts without running subprocess
      if (Date.now() >= aggregateDeadline) {
        complete = false;
        const isExplicitlyDisabled =
          (typeof rawObj.status === 'string' &&
            rawObj.status.toLowerCase() === 'disabled') ||
          (typeof rawObj.state === 'string' &&
            rawObj.state.toLowerCase() === 'disabled') ||
          rawObj.enabled === false;

        hosts.push({
          hostKey: safeHostKey,
          status: isExplicitlyDisabled ? 'unsupported' : 'unreachable',
          projects: [],
          error: isExplicitlyDisabled ? 'HOST_DISABLED' : 'TIMEOUT',
        });
        continue;
      }

      // Check disabled status
      const statusStr =
        typeof rawObj.status === 'string' ? rawObj.status.toLowerCase() : '';
      const stateStr =
        typeof rawObj.state === 'string' ? rawObj.state.toLowerCase() : '';
      const isExplicitlyDisabled =
        statusStr === 'disabled' ||
        stateStr === 'disabled' ||
        rawObj.enabled === false;

      if (isExplicitlyDisabled) {
        complete = false;
        hosts.push({
          hostKey: safeHostKey,
          status: 'unsupported',
          projects: [],
          error: 'HOST_DISABLED',
        });
        continue;
      }

      // Deduplication on verified registrationId or serverId
      const rawRegId =
        typeof rawObj.registrationId === 'string' &&
        rawObj.registrationId.trim()
          ? rawObj.registrationId.trim()
          : '';
      const rawServerId =
        typeof rawObj.serverId === 'string' && rawObj.serverId.trim()
          ? rawObj.serverId.trim()
          : '';

      const isDuplicateIdentity =
        (rawRegId && visitedRegistrationIds.has(rawRegId)) ||
        (rawServerId && visitedServerIds.has(rawServerId));

      if (isDuplicateIdentity) {
        continue;
      }

      if (rawRegId) {
        visitedRegistrationIds.add(rawRegId);
      }
      if (rawServerId) {
        visitedServerIds.add(rawServerId);
      }

      // Check remote host count limit (32)
      if (traversedRemoteCount >= DISCOVERY_LIMITS.MAX_REMOTE_HOSTS) {
        complete = false;
        hosts.push({
          hostKey: safeHostKey,
          status: 'unsupported',
          projects: [],
          error: 'HOST_LIMIT_EXCEEDED',
        });
        continue;
      }
      traversedRemoteCount++;

      // Remote hosts from Paseo HostSummary (packages/protocol/src/hosts.ts) contain:
      // registrationId, serverId (nullable), label, source, metadata, enabled, status, targetDescription.
      // CLI output never includes connection endpoints. Because --host requires an explicit connection endpoint,
      // remote project enumeration cannot be performed via the CLI without invented guessing or reading private files.
      // Therefore, offline hosts report HOST_OFFLINE, and reachable/online hosts report REMOTE_ROUTING_UNAVAILABLE
      // truthfully with complete: false.
      complete = false;
      if (statusStr === 'offline' || stateStr === 'offline') {
        hosts.push({
          hostKey: safeHostKey,
          status: 'unreachable',
          projects: [],
          error: 'HOST_OFFLINE',
        });
      } else {
        hosts.push({
          hostKey: safeHostKey,
          status: 'unsupported',
          projects: [],
          error: 'REMOTE_ROUTING_UNAVAILABLE',
        });
      }
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
