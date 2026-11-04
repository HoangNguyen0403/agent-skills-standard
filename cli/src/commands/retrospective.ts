import { spawn } from 'child_process';
import {
  MCP_COMPATIBLE_VERSION,
  RETROSPECTIVE_MIN_MCP_VERSION,
} from '../constants/mcp';
import { PACKAGE } from '../services/McpConfigService';

export interface RetrospectiveOptions {
  storeRoot?: string;
  sourceRoot?: string | string[];
  since?: string;
  until?: string;
  folder?: string;
  [key: string]: unknown;
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: { stdio: 'inherit'; shell?: boolean },
) => Promise<{ code: number | null }>;

export interface RetrospectiveCommandDeps {
  spawnFn?: SpawnFn;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  exit?: (code: number) => void;
  log?: (msg: string) => void;
  /** Pinned MCP version; defaults to the version this CLI release ships. */
  mcpVersion?: string;
}

interface NodeErrorLike {
  code?: unknown;
  message?: string;
}

function isNodeErrorLike(value: unknown): value is NodeErrorLike {
  return typeof value === 'object' && value !== null;
}

function extractErrorCode(err: unknown): string {
  if (isNodeErrorLike(err) && err.code !== undefined && err.code !== null) {
    return String(err.code);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export function isVersionAtLeast(version: string, minVersion: string): boolean {
  const parse = (v: string): [number, number, number] => {
    const parts = v.split('.');
    const major = parseInt(parts[0] ?? '', 10);
    const minor = parseInt(parts[1] ?? '', 10);
    const patch = parseInt(parts[2] ?? '', 10);
    return [
      Number.isFinite(major) ? major : 0,
      Number.isFinite(minor) ? minor : 0,
      Number.isFinite(patch) ? patch : 0,
    ];
  };
  const [maj1, min1, pat1] = parse(version);
  const [maj2, min2, pat2] = parse(minVersion);
  if (maj1 !== maj2) return maj1 > maj2;
  if (min1 !== min2) return min1 > min2;
  return pat1 >= pat2;
}

export function defaultSpawn(
  command: string,
  args: string[],
  options: { stdio: 'inherit'; shell?: boolean },
): Promise<{ code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      resolve({ code });
    });
  });
}

const VALID_ACTIONS: Record<string, true> = {
  enable: true,
  disable: true,
  status: true,
  index: true,
};
const ACTION_PATTERN = /^[A-Za-z0-9-]{1,30}$/;
const WINDOWS_ARG_PATTERN = /^[A-Za-z0-9._:/\\@~=+ -]{1,260}$/;

const ALLOWED_OPTIONS: Record<string, Record<string, true>> = {
  enable: { storeRoot: true, sourceRoot: true },
  index: { since: true, until: true, folder: true },
  disable: {},
  status: {},
};

export class RetrospectiveCommand {
  private spawnFn: SpawnFn;
  private platform: NodeJS.Platform;
  private env: NodeJS.ProcessEnv;
  private customExit?: (code: number) => void;
  private log: (msg: string) => void;
  private mcpVersion: string;

  constructor(deps: RetrospectiveCommandDeps = {}) {
    this.spawnFn = deps.spawnFn ?? defaultSpawn;
    this.platform = deps.platform ?? process.platform;
    this.env = deps.env ?? process.env;
    this.customExit = deps.exit;
    this.log = deps.log ?? console.log;
    this.mcpVersion = deps.mcpVersion ?? MCP_COMPATIBLE_VERSION;
  }

  private exit(code: number): void {
    process.exitCode = code;
    if (this.customExit) {
      this.customExit(code);
    }
  }

  async run(
    action: string,
    options: RetrospectiveOptions = {},
    extraArgs: string[] = [],
  ): Promise<void> {
    if (typeof action !== 'string' || !VALID_ACTIONS[action]) {
      if (typeof action === 'string' && ACTION_PATTERN.test(action)) {
        this.log(
          `Unknown action "${action}". Use: enable | disable | status | index`,
        );
      } else {
        this.log('Unknown action. Use: enable | disable | status | index');
      }
      this.exit(2);
      return;
    }

    if (extraArgs && extraArgs.length > 0) {
      this.log(
        `Unexpected option or argument for action "${action}". Allowed options for "enable": --store-root, --source-root; for "index": --since, --until, --folder; "disable" and "status" take no options.`,
      );
      this.exit(2);
      return;
    }

    const allowed = ALLOWED_OPTIONS[action] ?? {};
    for (const [key, value] of Object.entries(options)) {
      if (value === undefined || value === false) {
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }
      if (!allowed[key]) {
        this.log(
          `Unexpected option or argument for action "${action}". Allowed options for "enable": --store-root, --source-root; for "index": --since, --until, --folder; "disable" and "status" take no options.`,
        );
        this.exit(2);
        return;
      }
    }

    const envSpec = this.env.AGS_MCP_PACKAGE_SPEC;
    const hasOverride = typeof envSpec === 'string' && envSpec.trim() !== '';

    if (
      !hasOverride &&
      !isVersionAtLeast(this.mcpVersion, RETROSPECTIVE_MIN_MCP_VERSION)
    ) {
      this.log(
        `Session retrospectives need agent-skills-standard-mcp ${RETROSPECTIVE_MIN_MCP_VERSION} or newer, but this ags is pinned to ${this.mcpVersion}. Upgrade ags (ags upgrade), or set AGS_MCP_PACKAGE_SPEC to a newer package for testing.`,
      );
      this.exit(1);
      return;
    }

    const mappedAction = action === 'status' ? 'consent-status' : action;
    const forwarded: string[] = [];

    if (action === 'enable') {
      if (
        typeof options.storeRoot === 'string' &&
        options.storeRoot.length > 0
      ) {
        forwarded.push('--store-root', options.storeRoot);
      }
      if (options.sourceRoot !== undefined) {
        const roots = Array.isArray(options.sourceRoot)
          ? options.sourceRoot
          : [options.sourceRoot];
        for (const root of roots) {
          if (typeof root === 'string' && root.length > 0) {
            forwarded.push('--source-root', root);
          }
        }
      }
    } else if (action === 'index') {
      if (typeof options.since === 'string' && options.since.length > 0) {
        forwarded.push('--since', options.since);
      }
      if (typeof options.until === 'string' && options.until.length > 0) {
        forwarded.push('--until', options.until);
      }
      if (typeof options.folder === 'string' && options.folder.length > 0) {
        forwarded.push('--folder', options.folder);
      }
    }

    const spec =
      typeof envSpec === 'string' && envSpec.trim() !== ''
        ? envSpec
        : `${PACKAGE}@${this.mcpVersion}`;
    const argsToSpawn = [
      '-y',
      '--prefer-offline',
      spec,
      'retrospective',
      mappedAction,
      ...forwarded,
    ];

    const isWindows = this.platform === 'win32';
    if (isWindows) {
      for (const arg of argsToSpawn) {
        if (!WINDOWS_ARG_PATTERN.test(arg)) {
          this.log(
            `Invalid argument for Windows execution: "${arg}". Value must match ^[A-Za-z0-9._:/\\\\@~=+ -]{1,260}$`,
          );
          this.exit(2);
          return;
        }
      }
    }

    const command = isWindows ? 'npx.cmd' : 'npx';
    const spawnOptions: { stdio: 'inherit'; shell?: boolean } = {
      stdio: 'inherit',
      ...(isWindows ? { shell: true } : {}),
    };

    try {
      const result = await this.spawnFn(command, argsToSpawn, spawnOptions);
      this.exit(result.code ?? 1);
    } catch (err) {
      const errorCode = extractErrorCode(err);
      this.log(`Could not run npx: ${errorCode}`);
      this.exit(1);
    }
  }
}
