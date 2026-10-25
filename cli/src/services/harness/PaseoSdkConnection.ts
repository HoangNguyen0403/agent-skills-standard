import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type {
  createPaseoApi as CreatePaseoApi,
  PaseoTerminalActions,
  PaseoTerminalCaptureResult,
  PaseoTerminalCreateOptions,
  PaseoTerminalHandle,
  PaseoWorkspace,
  PaseoWorkspaceListOptions,
  PaseoWorkspaceListResult,
} from '@getpaseo/client';
import type { createHostClient as CreateHostClient } from '@getpaseo/client/node';
import type { HarnessConfig } from './HarnessSetupService';
import { HarnessError, validateHarnessOrigin } from './HarnessSetupService';

/**
 * Verified terminal capability surface used by the remote fleet dispatcher.
 * Types are the real published SDK shapes; no structural lookalikes or casts.
 */
export type PaseoSdkTerminalCreator = Pick<PaseoTerminalActions, 'create'>;
export type PaseoSdkTerminalHandle = PaseoTerminalHandle;
export type PaseoSdkTerminalCreateOptions = PaseoTerminalCreateOptions;
export type PaseoSdkTerminalCaptureResult = PaseoTerminalCaptureResult;

/** Options for the non-subscribing workspace listing call actually consumed. */
export type PaseoSdkWorkspaceListOptions = Omit<
  PaseoWorkspaceListOptions,
  'subscribe'
>;
export type PaseoSdkWorkspaceListResult = PaseoWorkspaceListResult;
export type PaseoSdkWorkspace = PaseoWorkspace;

/**
 * Actual consumed workspace surface: the non-subscribing `list` overload.
 *
 * `PaseoWorkspaceActions['list']` is overloaded; calling it with
 * `{ subscribe: {} }` returns a live subscription handle instead. Discovery
 * never subscribes, so this pins the single signature it calls. A real SDK
 * action object is structurally assignable to it — the published overload set
 * contains exactly this non-subscribing signature — while no caller has to
 * fabricate subscription handles.
 */
export type PaseoSdkWorkspaceLister = {
  list(
    options?: PaseoSdkWorkspaceListOptions,
  ): Promise<PaseoSdkWorkspaceListResult>;
};

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
  MAX_WORKSPACES_PER_PAGE: 100,
  MAX_WORKSPACES_PER_HOST: 10000,
  MAX_WORKSPACE_PAGES_PER_HOST: 100,
  SUBPROCESS_TIMEOUT_MS: 10000,
  CONNECT_TIMEOUT_MS: 5000,
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

export interface RawProjectItem {
  projectId: string;
  projectKey?: string;
  projectDisplayName: string;
  projectRootPath: string;
  projectKind: string;
}

export interface RawHostSummary {
  registrationId: string;
  serverId: string | null;
  label?: string | null;
  enabled?: boolean;
  status: 'connecting' | 'online' | 'offline' | 'error' | 'disabled';
  targetDescription?: string;
  [key: string]: unknown;
}

export interface PaseoRemoteApi {
  dispose(): Promise<void>;
  projects: {
    list(options?: unknown): Promise<{
      requestId?: string;
      projects: RawProjectItem[];
    }>;
  };
  workspaces?: PaseoSdkWorkspaceLister;
  /**
   * Routed per-host terminal capability. Present on real SDK host clients;
   * optional here so discovery-only consumers continue to work.
   */
  terminals?: PaseoSdkTerminalCreator;
}

export interface PaseoOriginApi {
  dispose(): Promise<void>;
  hosts: {
    list(): Promise<{
      self?: { serverId?: string; label?: string };
      hosts: RawHostSummary[];
    }>;
    client(serverId: string): Promise<PaseoRemoteApi>;
  };
  projects: {
    list(options?: unknown): Promise<{
      requestId?: string;
      projects: RawProjectItem[];
    }>;
  };
  workspaces?: PaseoSdkWorkspaceLister;
}

export interface PaseoDriver {
  connect(): Promise<void>;
  close(): Promise<void>;
}

export interface ConnectOriginOptions {
  connection: string;
  clientId: string;
  clientType: 'cli';
  connectTimeoutMs: number;
  reconnect: { enabled: false };
  localCredential?: () => string | null;
  password?: string;
}

export interface ConnectedPaseoOrigin {
  driver: PaseoDriver;
  api: PaseoOriginApi;
}

export interface PaseoConnectionFactory {
  connectOrigin(options: ConnectOriginOptions): Promise<ConnectedPaseoOrigin>;
}

export interface ResolvedOriginTarget {
  target: string;
  serverId?: string;
  home?: string;
  localCredential?: string;
  password?: string;
}

/**
 * Normalizes host:port, mapping loopback addresses to localhost.
 */
export function normalizeHostPort(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new Error('Host is required');
  }

  // IPv6: [::1]:6767
  if (trimmed.startsWith('[')) {
    const match = trimmed.match(/^\[([^\]]+)\]:(\d{1,5})$/);
    if (!match) {
      throw new Error('Invalid host:port (expected [::1]:6767)');
    }
    const host = match[1].trim();
    const port = Number(match[2]);
    if (host === '::1' || host === '::') {
      return `localhost:${port}`;
    }
    return `[${host}]:${port}`;
  }

  const match = trimmed.match(/^(.+):(\d{1,5})$/);
  if (!match) {
    throw new Error('Invalid host:port (expected localhost:6767)');
  }
  const host = match[1].trim();
  const port = Number(match[2]);
  if (host === '127.0.0.1' || host === '0.0.0.0') {
    return `localhost:${port}`;
  }
  return `${host}:${port}`;
}

/**
 * Normalizes target strings for local credential verification.
 */
export function normalizeTargetForComparison(target: string): string | null {
  try {
    const trimmed = target.trim();
    if (trimmed.startsWith('tcp://')) {
      const url = new URL(trimmed);
      const isIpv6 = url.hostname.startsWith('[') && url.hostname.endsWith(']');
      const host = isIpv6 ? url.hostname.slice(1, -1) : url.hostname;
      const port = url.port || '80';
      const endpoint = isIpv6 ? `[${host}]:${port}` : `${host}:${port}`;
      return normalizeHostPort(endpoint);
    }
    if (trimmed.startsWith('unix://') || trimmed.startsWith('pipe://')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return `unix://${trimmed}`;
    }
    if (trimmed.startsWith('\\\\.\\pipe\\')) {
      return `pipe://${trimmed}`;
    }
    if (/^\d+$/.test(trimmed)) {
      return `localhost:${trimmed}`;
    }
    return normalizeHostPort(trimmed);
  } catch {
    return null;
  }
}

/**
 * Verifies that the requested target matches the listening local daemon in paseo.pid,
 * and if so, securely reads the local credential token without logging or leaking it.
 */
export function readLocalCredentialForTarget(
  home: string,
  target: string,
): string | null {
  try {
    const pidFile = path.join(home, 'paseo.pid');
    if (!fs.existsSync(pidFile)) {
      return null;
    }
    const lockRaw = fs.readFileSync(pidFile, 'utf8');
    const lock = JSON.parse(lockRaw);
    if (!lock || typeof lock.listen !== 'string') {
      return null;
    }

    const selected = normalizeTargetForComparison(target);
    const listening = normalizeTargetForComparison(lock.listen);
    if (!selected || !listening || selected !== listening) {
      return null;
    }

    const credFile = path.join(home, 'local-credential');
    if (!fs.existsSync(credFile)) {
      return null;
    }
    const token = fs.readFileSync(credFile, 'utf8').trim();
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * Resolves origin endpoint and authentication credentials.
 */
export async function resolveOriginTarget(
  config: HarnessConfig,
  execFileFn: ExecFileFn,
  timeoutMs: number,
): Promise<
  { ok: true; value: ResolvedOriginTarget } | { ok: false; error: string }
> {
  let stdout: string;
  try {
    const res = await execFileFn(
      config.paseoCommand,
      ['daemon', 'status', '--json'],
      {
        cwd: os.tmpdir(),
        env: getSanitizedEnv(),
        timeout: Math.max(1, timeoutMs),
        maxBuffer: DISCOVERY_LIMITS.MAX_BUFFER_BYTES,
      },
    );
    stdout = res.stdout;
  } catch (err: unknown) {
    return { ok: false, error: classifySubprocessError(err) };
  }

  let status: Record<string, unknown>;
  try {
    status = JSON.parse(stdout);
  } catch {
    return { ok: false, error: 'MALFORMED_OUTPUT' };
  }

  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    return { ok: false, error: 'MALFORMED_OUTPUT' };
  }

  const isLocalRunning =
    status.localDaemon === 'running' ||
    status.connectedDaemon === 'reachable' ||
    status.connectedDaemon === 'connected';

  if (!isLocalRunning) {
    return { ok: false, error: 'UNREACHABLE' };
  }

  const listen =
    typeof status.listen === 'string' && status.listen.trim()
      ? status.listen.trim()
      : '';
  if (!listen) {
    return { ok: false, error: 'DAEMON_NOT_LISTENING' };
  }

  const home =
    typeof status.home === 'string' && status.home.trim()
      ? status.home.trim()
      : undefined;
  const serverId =
    typeof status.serverId === 'string' && status.serverId.trim()
      ? status.serverId.trim()
      : undefined;

  let target: string;
  if (config.origin !== undefined) {
    validateHarnessOrigin(config.origin);
    target = config.origin;
  } else {
    target = listen;
  }

  // Auth resolution
  let localCredential: string | undefined;
  if (home) {
    const cred = readLocalCredentialForTarget(home, target);
    if (cred) {
      localCredential = cred;
    }
  }

  const envPassword =
    typeof process.env.PASEO_PASSWORD === 'string' &&
    process.env.PASEO_PASSWORD.trim()
      ? process.env.PASEO_PASSWORD.trim()
      : undefined;

  return {
    ok: true,
    value: {
      target,
      serverId,
      home,
      ...(localCredential ? { localCredential } : {}),
      ...(envPassword ? { password: envPassword } : {}),
    },
  };
}

/**
 * Classifies SDK connection and network errors into canonical error codes.
 */
export function classifySdkError(err: unknown): string {
  if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    const code =
      typeof errorObj.code === 'string' ? errorObj.code.toLowerCase() : '';
    const msg =
      typeof errorObj.message === 'string'
        ? errorObj.message.toLowerCase()
        : '';

    if (
      code === 'host_offline' ||
      msg.includes('is offline') ||
      msg.includes('host_offline')
    ) {
      return 'HOST_OFFLINE';
    }
    if (code === 'host_disabled' || msg.includes('disabled')) {
      return 'HOST_DISABLED';
    }
    if (
      code === 'authentication_failed' ||
      code === 'incorrect_password' ||
      code === 'password_required' ||
      msg.includes('authentication') ||
      msg.includes('password')
    ) {
      return 'AUTHENTICATION_FAILED';
    }
    if (
      code === 'etimedout' ||
      code === 'timeout' ||
      msg.includes('timed out') ||
      msg.includes('timeout')
    ) {
      return 'TIMEOUT';
    }
    if (
      code === 'econnrefused' ||
      msg.includes('econnrefused') ||
      msg.includes('connection refused')
    ) {
      return 'UNREACHABLE';
    }
    if (
      code === 'resource_limit' ||
      msg.includes('buffer limit') ||
      msg.includes('maxbuffer')
    ) {
      return 'BUFFER_OVERFLOW';
    }
    if (code === 'unsupported' || msg.includes('unsupported')) {
      return 'UNSUPPORTED';
    }
  }
  return 'CONNECTION_FAILED';
}

/**
 * Default production implementation connecting via @getpaseo/client SDK.
 */
export class DefaultPaseoConnectionFactory implements PaseoConnectionFactory {
  async connectOrigin(
    options: ConnectOriginOptions,
  ): Promise<ConnectedPaseoOrigin> {
    const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
    if (Number.isInteger(nodeMajor) && nodeMajor < 22) {
      throw new HarnessError(
        'UNSUPPORTED_ENGINE',
        `Node.js 22 or later is required for Paseo SDK client (current: ${process.versions.node})`,
      );
    }

    let createHostClient: typeof CreateHostClient;
    let createPaseoApi: typeof CreatePaseoApi;

    try {
      // Dynamic import required: @getpaseo/client is an ESM-only package loaded from a CommonJS bundle.
      const nodeModule = await import('@getpaseo/client/node');
      createHostClient = nodeModule.createHostClient;
      const rootModule = await import('@getpaseo/client');
      createPaseoApi = rootModule.createPaseoApi;
    } catch (err: unknown) {
      throw new HarnessError(
        'SDK_LOAD_FAILED',
        `Failed to dynamically load @getpaseo/client: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const localCredential = options.localCredential;
    const driver = createHostClient(options.connection, {
      clientId: options.clientId,
      clientType: options.clientType,
      connectTimeoutMs: options.connectTimeoutMs,
      reconnect: options.reconnect,
      ...(localCredential
        ? { localCredential: () => localCredential() ?? undefined }
        : {}),
      ...(options.password ? { password: options.password } : {}),
    });

    // Ownership transfers to the caller only once connect and API creation
    // succeed. Until then this factory owns the created driver and closes it,
    // so a failed handshake cannot leak a live connection.
    try {
      await driver.connect();
      const api = createPaseoApi(driver);
      return { driver, api };
    } catch (err: unknown) {
      try {
        await driver.close();
      } catch {
        // Best-effort close: never mask the original connection failure.
      }
      throw err;
    }
  }
}
