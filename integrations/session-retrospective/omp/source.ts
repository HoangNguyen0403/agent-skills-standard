/**
 * Local inputs for the OMP retrospective adapter: one explicitly selected
 * adapter config file, read through a bounded pre-parse reader.
 *
 * Privacy boundary: the adapter resolves no session identity and projects no
 * transcript scope. Preparation requires a human-authored local manifest, so
 * unverified host inventory is never silently narrowed or invented.
 */

import { constants, promises as fsPromises } from "node:fs";
import path from "node:path";

/** Absolute path to the adapter config file; the only config source. */
export const CONFIG_ENV = "OMP_SESSION_RETROSPECTIVE_CONFIG";

export const CONFIG_MAX_BYTES = 65_536;

/**
 * Shared invitation-owner vocabulary with the Paseo adapter. Exactly one host
 * may own passive invitations for a session; the OMP adapter currently
 * implements no passive invitation because host eligibility is unverified, so
 * this field only records ownership for a future supported surface.
 */
export type InvitationOwner = "omp" | "paseo";

export type AdapterConfig = {
  schemaVersion: 1;
  invitationOwner: InvitationOwner;
  enabled: boolean;
  root: string | null;
};

export const DEFAULT_CONFIG: Readonly<AdapterConfig> = Object.freeze({
  schemaVersion: 1 as const,
  invitationOwner: "omp" as const,
  enabled: true,
  root: null,
});

export type ConfigStatus = "absent" | "loaded" | "invalid";

/** Bounded, non-secret reasons for an unusable config. */
export type ConfigProblem =
  | "config-malformed"
  | "config-too-large"
  | "config-not-regular"
  | "config-not-utf8"
  | "config-unreadable"
  | "config-unknown-key"
  | "config-owner"
  | "config-root"
  | "config-enabled"
  | "config-version"
  | "config-env-relative";

export type LoadedConfig = {
  config: AdapterConfig;
  sourcePath: string;
  status: ConfigStatus;
  problem: ConfigProblem | null;
};

export type ConfigInputs = {
  env: NodeJS.ProcessEnv;
  readTextFile(absolutePath: string): Promise<string>;
};

/** A bounded reader failure; the code is safe to show to the local user. */
export class ConfigReadError extends Error {
  constructor(readonly code: ConfigProblem) {
    super(code);
    this.name = "ConfigReadError";
  }
}

export type ResolvedConfigPath =
  | { absolutePath: string; problem: null }
  | { absolutePath: null; problem: ConfigProblem | null };

/**
 * Config path resolution: only the explicit environment override, which must be
 * an absolute path. No project/cwd-relative file, no ancestor walk, and no
 * user-home fallback: a repository the user does not control must not be able
 * to place private report output inside its own working tree.
 */
export function resolveConfigPath(env: NodeJS.ProcessEnv): ResolvedConfigPath {
  const override = env[CONFIG_ENV];
  if (override === undefined || override.length === 0) {
    return { absolutePath: null, problem: null };
  }
  if (!path.isAbsolute(override) || override.includes("\0")) {
    return { absolutePath: null, problem: "config-env-relative" };
  }
  return { absolutePath: override, problem: null };
}

function fileErrorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

/**
 * Resolve a path that may not exist yet: realpath the nearest existing ancestor
 * and re-append the remaining segments. Returns null when no ancestor resolves.
 */
export async function resolveRealPath(
  absolutePath: string,
): Promise<string | null> {
  let current = path.resolve(absolutePath);
  const suffix: string[] = [];
  while (true) {
    try {
      const resolved = await fsPromises.realpath(current);
      return suffix.length === 0
        ? resolved
        : path.join(resolved, ...suffix.reverse());
    } catch (error) {
      const code = fileErrorCode(error);
      if (code !== "ENOENT" && code !== "ENOTDIR") return null;
      const parent = path.dirname(current);
      if (parent === current) return null;
      suffix.push(path.basename(current));
      current = parent;
    }
  }
}

/** Lexical containment on already-resolved paths. */
export function isAtOrInside(candidate: string, directory: string): boolean {
  const relative = path.relative(directory, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

export type RepositoryTop =
  | { kind: "found"; top: string }
  | { kind: "absent" }
  | { kind: "unresolved" };

/**
 * Nearest ancestor of a real cwd that contains a `.git` entry (directory or
 * file, detected with lstat; no git spawn). The bounded walk stops at the
 * filesystem root.
 *
 * Only `ENOENT` and `ENOTDIR` mean "marker absent, keep walking". Any other
 * lstat failure means the marker could not be inspected, so the repository
 * boundary is unknown and containment is `unresolved` rather than `outside`.
 */
export async function findRepositoryTop(
  realCwd: string,
): Promise<RepositoryTop> {
  let current = realCwd;
  while (true) {
    try {
      const entry = await fsPromises.lstat(path.join(current, ".git"));
      if (entry.isDirectory() || entry.isFile()) {
        return { kind: "found", top: current };
      }
      // A marker that is neither a file nor a directory is not a repository
      // boundary; keep walking with the same absence semantics.
    } catch (error) {
      const code = fileErrorCode(error);
      if (code !== "ENOENT" && code !== "ENOTDIR") {
        return { kind: "unresolved" };
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return { kind: "absent" };
    current = parent;
  }
}

export type StoreRootContainment =
  | { kind: "outside"; realRoot: string }
  | { kind: "inside-cwd"; realRoot: string }
  | { kind: "inside-repository"; realRoot: string }
  | { kind: "unresolved" };

/**
 * Symlink-proof, repository-wide containment decision for a configured store
 * root. The root itself may not exist yet; its nearest existing ancestor is
 * resolved so the check cannot be evaded by a symlinked alias of the session
 * working tree or by starting the session in a repository subdirectory.
 */
export async function assessStoreRootContainment(
  root: string,
  cwd: string,
): Promise<StoreRootContainment> {
  const realRoot = await resolveRealPath(root);
  const realCwd = await resolveRealPath(cwd);
  if (realRoot === null || realCwd === null) return { kind: "unresolved" };
  if (isAtOrInside(realRoot, realCwd)) {
    return { kind: "inside-cwd", realRoot };
  }
  const repository = await findRepositoryTop(realCwd);
  if (repository.kind === "unresolved") return { kind: "unresolved" };
  if (repository.kind === "found" && isAtOrInside(realRoot, repository.top)) {
    return { kind: "inside-repository", realRoot };
  }
  return { kind: "outside", realRoot };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Production reader: reject non-regular files, bound allocation before any
 * parse, and decode strictly. A FIFO or oversized file cannot hold the reader
 * past its checks; no post-allocation truncation is used.
 */
export async function readConfigText(absolutePath: string): Promise<string> {
  const linkStats = await fsPromises.lstat(absolutePath);
  if (!linkStats.isFile() || linkStats.isSymbolicLink()) {
    throw new ConfigReadError("config-not-regular");
  }
  if (linkStats.size > CONFIG_MAX_BYTES) {
    throw new ConfigReadError("config-too-large");
  }
  const handle = await fsPromises.open(
    absolutePath,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  ).catch(() => {
    throw new ConfigReadError("config-unreadable");
  });
  try {
    const stats = await handle.stat();
    if (
      !stats.isFile() ||
      stats.dev !== linkStats.dev ||
      stats.ino !== linkStats.ino
    ) {
      throw new ConfigReadError("config-not-regular");
    }
    if (stats.size > CONFIG_MAX_BYTES) {
      throw new ConfigReadError("config-too-large");
    }
    const buffer = Buffer.alloc(CONFIG_MAX_BYTES + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > CONFIG_MAX_BYTES) {
      throw new ConfigReadError("config-too-large");
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(
        buffer.subarray(0, offset),
      );
    } catch {
      throw new ConfigReadError("config-not-utf8");
    }
  } finally {
    await handle.close();
  }
}

const CONFIG_KEYS: Record<string, true> = {
  schemaVersion: true,
  invitationOwner: true,
  enabled: true,
  root: true,
};

type ParsedConfig = { config: AdapterConfig } | { problem: ConfigProblem };

/**
 * Strict config parse. Unknown keys are refused so a typo cannot silently
 * change ownership or disable the adapter.
 */
function parseConfig(value: unknown): ParsedConfig {
  if (!isPlainObject(value)) return { problem: "config-malformed" };
  for (const key of Object.keys(value)) {
    if (CONFIG_KEYS[key] !== true) return { problem: "config-unknown-key" };
  }
  if (value.schemaVersion !== 1) return { problem: "config-version" };
  const owner = value.invitationOwner;
  if (owner !== "omp" && owner !== "paseo") return { problem: "config-owner" };
  const rawEnabled = value.enabled;
  let enabled = true;
  if (rawEnabled !== undefined) {
    if (typeof rawEnabled !== "boolean") return { problem: "config-enabled" };
    enabled = rawEnabled;
  }
  const rawRoot = value.root;
  let root: string | null = null;
  if (rawRoot !== undefined && rawRoot !== null) {
    if (typeof rawRoot !== "string") return { problem: "config-root" };
    if (rawRoot.length === 0 || rawRoot.length > 4_096) {
      return { problem: "config-root" };
    }
    if (rawRoot.includes("\0") || !path.isAbsolute(rawRoot)) {
      return { problem: "config-root" };
    }
    root = rawRoot;
  }
  return { config: { schemaVersion: 1, invitationOwner: owner, enabled, root } };
}

function invalidConfig(sourcePath: string, problem: ConfigProblem): LoadedConfig {
  return {
    config: { ...DEFAULT_CONFIG, enabled: false, root: null },
    sourcePath,
    status: "invalid",
    problem,
  };
}

/**
 * Load the explicit adapter config. No config path means the documented
 * defaults (manual-only: no root configured). A malformed, unsupported, or
 * non-absolute env path fails closed: the adapter becomes inert rather than
 * guessing a root/owner.
 */
export async function loadAdapterConfig(
  inputs: ConfigInputs,
): Promise<LoadedConfig> {
  const resolved = resolveConfigPath(inputs.env);
  if (resolved.absolutePath === null) {
    if (resolved.problem !== null) {
      return invalidConfig(
        CONFIG_ENV,
        resolved.problem,
      );
    }
    return {
      config: { ...DEFAULT_CONFIG },
      sourcePath: CONFIG_ENV,
      status: "absent",
      problem: null,
    };
  }
  const sourcePath = resolved.absolutePath;
  let text: string;
  try {
    text = await inputs.readTextFile(sourcePath);
  } catch (error) {
    if (error instanceof ConfigReadError) {
      return invalidConfig(sourcePath, error.code);
    }
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
    if (code === "ENOENT") {
      return {
        config: { ...DEFAULT_CONFIG },
        sourcePath,
        status: "absent",
        problem: null,
      };
    }
    return invalidConfig(sourcePath, "config-unreadable");
  }
  if (Buffer.byteLength(text, "utf8") > CONFIG_MAX_BYTES) {
    return invalidConfig(sourcePath, "config-too-large");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return invalidConfig(sourcePath, "config-malformed");
  }
  const parsed = parseConfig(value);
  if ("problem" in parsed) return invalidConfig(sourcePath, parsed.problem);
  return { config: parsed.config, sourcePath, status: "loaded", problem: null };
}
