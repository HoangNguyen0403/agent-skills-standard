import { createHash } from "node:crypto";
import fs from "fs-extra";
import path from "path";
import * as yaml from "js-yaml";

export interface WorkflowMetadata {
  /** Workflow identifier without extension (e.g. `dev-fix`) */
  name: string;
  /** Description parsed from frontmatter, or empty string */
  description: string;
  /** Absolute path to the workflow markdown file */
  path: string;
}

export type WorkflowLookupStatus =
  "managed" | "local_source" | "unverified" | "unavailable";

export interface WorkflowLookupResult {
  status: WorkflowLookupStatus;
  name: string;
  /** Present only for authored files read without an installation lock. */
  source?: "local_source";
  description?: string;
  /** Frontmatter-stripped body from the verified bytes. */
  body?: string;
  /** Digest of the raw bytes that were verified/read. */
  digest?: string;
  /** True only when at least one published native binding matches on disk. */
  nativeParity: boolean;
  /** Project-relative binding paths that no longer match their digest. */
  parityIssues: string[];
  /** Explicit diagnosis when nothing can be served. */
  reason?: string;
}

export interface WorkflowListEntry {
  name: string;
  description: string;
  source: "managed" | "local_source";
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const LOCKFILE_NAME = ".skills-lock.json";
const WORKFLOW_DIR = ".agents/workflows";
const DIGEST_RE = /^[a-f0-9]{64}$/;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function digestOf(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

function isBoundedRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\0") || value.includes("\\")) return false;
  if (path.posix.isAbsolute(value) || path.isAbsolute(value)) return false;
  if (path.posix.normalize(value) !== value) return false;
  return !value.split("/").includes("..");
}

function isWorkflowName(value: string): boolean {
  return NAME_RE.test(value) && !value.includes("..");
}

function parseWorkflowText(content: string): {
  description: string;
  body: string;
} {
  const fm = FRONTMATTER_RE.exec(content);
  if (!fm) return { description: "", body: content.trim() };

  let description = "";
  try {
    const parsed = (yaml.load(fm[1]) as Record<string, unknown>) ?? {};
    if (typeof parsed.description === "string") {
      description = parsed.description;
    } else if (typeof parsed.summary === "string") {
      description = parsed.summary;
    }
  } catch {
    // Fall back if yaml parsing fails
  }
  return { description, body: fm[2].trim() };
}

/**
 * Validates the optional versioned catalog. Returns a diagnosis instead of
 * throwing so callers can surface an explicit unavailable result.
 */
function catalogError(catalog: unknown): string | null {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return "workflow catalog is not an object";
  }
  const raw = catalog as Record<string, unknown>;
  if (raw.version !== 1) {
    return `unsupported workflow catalog version ${String(raw.version)}`;
  }
  const workflows = raw.workflows;
  if (!workflows || typeof workflows !== "object" || Array.isArray(workflows)) {
    return "workflow catalog has no workflows map";
  }
  for (const [name, value] of Object.entries(
    workflows as Record<string, unknown>,
  )) {
    if (!isWorkflowName(name)) {
      return `invalid workflow name '${name}'`;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return `workflow '${name}' is not an object`;
    }
    const entry = value as Record<string, unknown>;
    if (
      !isBoundedRelativePath(entry.path) ||
      entry.path !== `${WORKFLOW_DIR}/${name}.md`
    ) {
      return `workflow '${name}' path is not a bounded canonical path`;
    }
    if (typeof entry.digest !== "string" || !DIGEST_RE.test(entry.digest)) {
      return `workflow '${name}' has an invalid digest`;
    }
    if (
      typeof entry.registry !== "string" ||
      typeof entry.requestedRef !== "string"
    ) {
      return `workflow '${name}' has invalid provenance`;
    }
    if (
      entry.resolvedCommit !== null &&
      typeof entry.resolvedCommit !== "string"
    ) {
      return `workflow '${name}' has an invalid resolved commit`;
    }
    if (!Array.isArray(entry.nativeBindings)) {
      return `workflow '${name}' has no native bindings array`;
    }
    const bindingsByPath = new Map<
      string,
      { outputDigest: string; canonicalDigest: string }
    >();
    const bindingKeys = new Set<string>();
    for (const rawBinding of entry.nativeBindings) {
      if (
        !rawBinding ||
        typeof rawBinding !== "object" ||
        Array.isArray(rawBinding)
      ) {
        return `workflow '${name}' has an invalid native binding`;
      }
      const binding = rawBinding as Record<string, unknown>;
      if (typeof binding.agent !== "string" || binding.agent.length === 0) {
        return `workflow '${name}' has an invalid binding agent`;
      }
      if (!isBoundedRelativePath(binding.path)) {
        return `workflow '${name}' has an unsafe binding path`;
      }
      const bindingKey = `${binding.agent}\0${binding.path}`;
      if (bindingKeys.has(bindingKey)) {
        return `workflow '${name}' has a duplicate native binding for '${binding.path}'`;
      }
      bindingKeys.add(bindingKey);
      if (
        typeof binding.outputDigest !== "string" ||
        !DIGEST_RE.test(binding.outputDigest) ||
        typeof binding.canonicalDigest !== "string" ||
        binding.canonicalDigest !== entry.digest
      ) {
        return `workflow '${name}' has a binding that does not reference its canonical digest`;
      }
      // Aliased providers may share one physical path only while their bytes
      // agree; otherwise the catalog is ambiguous.
      const alias = bindingsByPath.get(binding.path);
      if (
        alias &&
        (alias.outputDigest !== binding.outputDigest ||
          alias.canonicalDigest !== binding.canonicalDigest)
      ) {
        return `workflow '${name}' has conflicting native bindings for '${binding.path}'`;
      }
      bindingsByPath.set(binding.path, {
        outputDigest: binding.outputDigest,
        canonicalDigest: binding.canonicalDigest,
      });
    }

    if (entry.nativeConflicts !== undefined) {
      if (!Array.isArray(entry.nativeConflicts)) {
        return `workflow '${name}' has an invalid nativeConflicts value`;
      }
      const conflictKeys = new Set<string>();
      for (const rawConflict of entry.nativeConflicts) {
        if (
          !rawConflict ||
          typeof rawConflict !== "object" ||
          Array.isArray(rawConflict)
        ) {
          return `workflow '${name}' has an invalid native conflict`;
        }
        const conflict = rawConflict as Record<string, unknown>;
        if (
          typeof conflict.agent !== "string" ||
          conflict.agent.length === 0 ||
          !isBoundedRelativePath(conflict.path)
        ) {
          return `workflow '${name}' has an invalid native conflict`;
        }
        const key = `${conflict.agent}\0${conflict.path}`;
        if (conflictKeys.has(key)) {
          return `workflow '${name}' has a duplicate native conflict for '${conflict.path}'`;
        }
        conflictKeys.add(key);
      }
    }
  }
  return null;
}

/**
 * Resolves a project-relative path and rejects traversal plus realpath/symlink
 * escape from the project root.
 */
async function resolveContained(
  rootReal: string,
  relativePath: string,
): Promise<string | null> {
  if (!isBoundedRelativePath(relativePath)) return null;
  const absolute = path.resolve(rootReal, relativePath);
  if (absolute !== rootReal && !absolute.startsWith(rootReal + path.sep)) {
    return null;
  }
  try {
    const real = await fs.realpath(absolute);
    if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
      return null;
    }
    return real;
  } catch {
    return null;
  }
}

interface LockSnapshot {
  present: boolean;
  raw: unknown;
  error?: string;
}

/**
 * Parses lock JSON after the existing YAML core parser rejects duplicate
 * object keys that `JSON.parse` would silently collapse. The returned value is
 * still parsed with strict JSON semantics.
 */
function parseStrictJson(text: string): unknown {
  try {
    yaml.load(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicated mapping key/i.test(message)) {
      throw new Error("installation lock has duplicate JSON keys", {
        cause: error,
      });
    }
    throw new Error(`installation lock is malformed: ${message}`, {
      cause: error,
    });
  }
  return JSON.parse(text);
}

async function readLockSnapshot(projectRoot: string): Promise<LockSnapshot> {
  const lockPath = path.join(projectRoot, LOCKFILE_NAME);
  if (!(await fs.pathExists(lockPath))) {
    return { present: false, raw: undefined };
  }
  try {
    const text = await fs.readFile(lockPath, "utf8");
    return { present: true, raw: parseStrictJson(text) };
  } catch (error) {
    return {
      present: true,
      raw: undefined,
      error:
        error instanceof Error
          ? error.message
          : "installation lock is unreadable",
    };
  }
}

async function readLocalWorkflow(
  rootReal: string,
  name: string,
): Promise<{ bytes: Buffer; description: string; body: string } | null> {
  const real = await resolveContained(rootReal, `${WORKFLOW_DIR}/${name}.md`);
  if (!real) return null;
  try {
    const bytes = await fs.readFile(real);
    const parsed = parseWorkflowText(bytes.toString("utf8"));
    return { bytes, ...parsed };
  } catch {
    return null;
  }
}

/**
 * Looks up an installed canonical workflow. Managed lookups read one lock
 * snapshot and verify the catalog, path containment and actual bytes; there is
 * no network access and no fallback to native/local content on bad metadata.
 */
export async function lookupWorkflow(
  projectRoot: string,
  requestedName: string,
): Promise<WorkflowLookupResult> {
  const name = requestedName.replace(/\.md$/i, "");
  if (!isWorkflowName(name)) {
    return {
      status: "unavailable",
      name,
      nativeParity: false,
      parityIssues: [],
      reason: `Invalid workflow name '${requestedName}'.`,
    };
  }

  const rootReal = await fs.realpath(projectRoot);
  const lock = await readLockSnapshot(projectRoot);

  if (!lock.present) {
    const local = await readLocalWorkflow(rootReal, name);
    if (!local) {
      return {
        status: "unavailable",
        name,
        nativeParity: false,
        parityIssues: [],
        reason: `Workflow '${name}' not found.`,
      };
    }
    return {
      status: "local_source",
      name,
      source: "local_source",
      description: local.description,
      body: local.body,
      digest: digestOf(local.bytes),
      nativeParity: false,
      parityIssues: [],
    };
  }

  if (lock.error) {
    return {
      status: "unavailable",
      name,
      nativeParity: false,
      parityIssues: [],
      reason: lock.error,
    };
  }

  const raw =
    lock.raw && typeof lock.raw === "object"
      ? (lock.raw as Record<string, unknown>)
      : null;
  if (!raw) {
    return {
      status: "unavailable",
      name,
      nativeParity: false,
      parityIssues: [],
      reason: "installation lock is malformed",
    };
  }

  if (raw.version === 1) {
    return {
      status: "unverified",
      name,
      nativeParity: false,
      parityIssues: [],
      reason:
        "Installation lock is legacy (version 1) and has no workflow catalog; run `ags sync`.",
    };
  }

  if (raw.version !== 2) {
    return {
      status: "unavailable",
      name,
      nativeParity: false,
      parityIssues: [],
      reason: `Unsupported installation lock version ${String(raw.version)}.`,
    };
  }

  if (raw.workflowCatalog === undefined) {
    return {
      status: "unverified",
      name,
      nativeParity: false,
      parityIssues: [],
      reason:
        "Installation lock has no workflow catalog metadata; run `ags sync` before managed lookup.",
    };
  }

  const problem = catalogError(raw.workflowCatalog);
  if (problem) {
    return {
      status: "unavailable",
      name,
      nativeParity: false,
      parityIssues: [],
      reason: `Managed workflow metadata is invalid: ${problem}.`,
    };
  }

  const catalog = raw.workflowCatalog as {
    version: 1;
    workflows: Record<
      string,
      {
        path: string;
        digest: string;
        nativeBindings: Array<{
          agent: string;
          path: string;
          outputDigest: string;
          canonicalDigest: string;
        }>;
        nativeConflicts?: Array<{ agent: string; path: string }>;
      }
    >;
  };

  const entryKey =
    name in catalog.workflows
      ? name
      : Object.keys(catalog.workflows).find(
          (key) => key.toLowerCase() === name.toLowerCase(),
        );
  if (!entryKey) {
    return {
      status: "unavailable",
      name,
      nativeParity: false,
      parityIssues: [],
      reason: `Workflow '${name}' is not listed in the installed workflow catalog.`,
    };
  }
  const entry = catalog.workflows[entryKey];

  const canonicalReal = await resolveContained(rootReal, entry.path);
  if (!canonicalReal) {
    return {
      status: "unavailable",
      name: entryKey,
      nativeParity: false,
      parityIssues: [],
      reason: `Canonical path for '${entryKey}' escapes the project root.`,
    };
  }

  let canonicalBytes: Buffer;
  try {
    canonicalBytes = await fs.readFile(canonicalReal);
  } catch {
    return {
      status: "unavailable",
      name: entryKey,
      nativeParity: false,
      parityIssues: [],
      reason: `Canonical body for '${entryKey}' is missing.`,
    };
  }

  // The bytes used for the digest check are the same bytes returned below.
  if (digestOf(canonicalBytes) !== entry.digest) {
    return {
      status: "unavailable",
      name: entryKey,
      nativeParity: false,
      parityIssues: [],
      reason: `Canonical body for '${entryKey}' does not match its digest; run \`ags sync\`.`,
    };
  }

  const parityIssues: string[] = [];
  for (const conflict of entry.nativeConflicts ?? []) {
    if (!parityIssues.includes(conflict.path)) {
      parityIssues.push(conflict.path);
    }
  }
  for (const binding of entry.nativeBindings) {
    const bindingReal = await resolveContained(rootReal, binding.path);
    if (!bindingReal) {
      if (!parityIssues.includes(binding.path)) {
        parityIssues.push(binding.path);
      }
      continue;
    }
    try {
      const bytes = await fs.readFile(bindingReal);
      if (
        digestOf(bytes) !== binding.outputDigest &&
        !parityIssues.includes(binding.path)
      ) {
        parityIssues.push(binding.path);
      }
    } catch {
      if (!parityIssues.includes(binding.path)) {
        parityIssues.push(binding.path);
      }
    }
  }

  const parsed = parseWorkflowText(canonicalBytes.toString("utf8"));
  return {
    status: "managed",
    name: entryKey,
    description: parsed.description,
    body: parsed.body,
    digest: entry.digest,
    nativeParity: entry.nativeBindings.length > 0 && parityIssues.length === 0,
    parityIssues,
  };
}

/**
 * Lists workflows for `list_workflows`. Returns `null` when no managed catalog
 * is installed so the caller can fall back to authored local files.
 */
export async function listInstalledWorkflows(
  projectRoot: string,
): Promise<WorkflowListEntry[] | null> {
  const lock = await readLockSnapshot(projectRoot);
  if (!lock.present || lock.error) return lock.present ? [] : null;
  const raw =
    lock.raw && typeof lock.raw === "object"
      ? (lock.raw as Record<string, unknown>)
      : null;
  if (!raw) return [];
  if (raw.version !== 2) return [];
  if (raw.workflowCatalog === undefined) return null;
  if (catalogError(raw.workflowCatalog)) return [];

  const rootReal = await fs.realpath(projectRoot);
  const catalog = raw.workflowCatalog as {
    workflows: Record<string, { path: string; digest: string }>;
  };
  const entries: WorkflowListEntry[] = [];
  for (const [name, entry] of Object.entries(catalog.workflows)) {
    const real = await resolveContained(rootReal, entry.path);
    if (!real) continue;
    try {
      const bytes = await fs.readFile(real);
      if (digestOf(bytes) !== entry.digest) continue;
      const parsed = parseWorkflowText(bytes.toString("utf8"));
      entries.push({
        name,
        description: parsed.description,
        source: "managed",
      });
    } catch {
      continue;
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export async function scanWorkflows(
  projectRoot: string,
): Promise<WorkflowMetadata[]> {
  const workflowsDir = path.join(projectRoot, ".agents", "workflows");
  if (!(await fs.pathExists(workflowsDir))) {
    return [];
  }

  const entries = await fs.readdir(workflowsDir);
  const out: WorkflowMetadata[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const name = entry.replace(/\.md$/, "");
    const fullPath = path.join(workflowsDir, entry);

    const stat = await fs.stat(fullPath).catch(() => null);
    if (!stat?.isFile()) continue;

    const content = await fs.readFile(fullPath, "utf8");
    const { description } = parseWorkflowText(content);

    out.push({
      name,
      description,
      path: fullPath,
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readWorkflowBody(
  workflowPath: string,
): Promise<string | null> {
  if (!(await fs.pathExists(workflowPath))) return null;
  const content = await fs.readFile(workflowPath, "utf8");
  return parseWorkflowText(content).body;
}
