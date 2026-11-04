import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import type {
  AttributionCatalog,
  AttributionDestinationBinding,
  AttributionFileRecord,
  AttributionPackageRecord,
  AttributionSourceRecord,
} from '../models/types';
import { assertNoSymlinksUnderRoot } from './install/safePath';

/**
 * Attribution provenance: structural validation for the additive lock
 * namespace and a pure comparison/planning boundary for the command layer.
 *
 * This module never writes. Reading installed bytes is an explicit helper
 * (`collectInstalledAttributionDigests`) so the comparison itself stays pure
 * and testable; no caller may use prior metadata without validating the bytes
 * it describes.
 */

export const ATTRIBUTION_CATALOG_VERSION = 1;

const DIGEST_RE = /^[0-9a-f]{64}$/;
const GIT_BLOB_SHA1_RE = /^[0-9a-f]{40}$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;
const PACKAGE_ID_RE =
  /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CATEGORY_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ATTRIBUTION_FILE_NAME_RE = /^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i;

export function isBoundedRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.includes('\0') || value.includes('\\')) return false;
  if (path.posix.isAbsolute(value) || path.isAbsolute(value)) return false;
  if (path.posix.normalize(value) !== value) return false;
  return !value.split('/').includes('..');
}

export function isBoundedAttributionFileName(value: unknown): value is string {
  return typeof value === 'string' && ATTRIBUTION_FILE_NAME_RE.test(value);
}

function fail(where: string, message: string): never {
  throw new Error(
    `Invalid .skills-lock.json attributionCatalog: ${where} ${message}`,
  );
}

function assertExactKeys(
  where: string,
  value: Record<string, unknown>,
  keys: readonly string[],
): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(where, `has unexpected field '${key}'`);
  }
}

function assertString(where: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    fail(where, `has an invalid ${field}`);
  }
  return value;
}

function assertRecord(where: string, value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(where, 'must be an object');
  }
  return value as Record<string, unknown>;
}

function assertDigest(where: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || !DIGEST_RE.test(value)) {
    fail(where, `has an invalid ${field}`);
  }
  return value;
}

function assertCommit(where: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || !COMMIT_RE.test(value)) {
    fail(where, `has an invalid ${field} (expected a resolved commit)`);
  }
  return value;
}

function assertBlobSha1(where: string, value: unknown): string {
  if (typeof value !== 'string' || !GIT_BLOB_SHA1_RE.test(value)) {
    fail(
      where,
      'has an invalid blobSha1 (expected a Git blob SHA-1, not a truncated SHA-256)',
    );
  }
  return value;
}

function parseDestination(
  where: string,
  value: unknown,
): AttributionDestinationBinding {
  const raw = assertRecord(where, value);
  assertExactKeys(where, raw, ['agent', 'path', 'sha256']);
  const agent = assertString(where, 'destination agent', raw.agent);
  const destinationPath = assertString(where, 'destination path', raw.path);
  if (!isBoundedRelativePath(destinationPath)) {
    fail(where, 'has an unsafe destination path');
  }
  return {
    agent,
    path: destinationPath,
    sha256: assertDigest(where, 'destination sha256', raw.sha256),
  };
}

function parseFile(where: string, value: unknown): AttributionFileRecord {
  const raw = assertRecord(where, value);
  assertExactKeys(where, raw, [
    'name',
    'sourcePath',
    'sourceKind',
    'requestedRef',
    'resolvedCommit',
    'blobSha1',
    'sha256',
    'basis',
    'destinations',
  ]);
  const name = raw.name;
  if (!isBoundedAttributionFileName(name)) {
    fail(where, 'has an invalid installed filename');
  }
  const sourcePath = assertString(where, 'sourcePath', raw.sourcePath);
  if (!isBoundedRelativePath(sourcePath)) {
    fail(where, 'has an unsafe sourcePath');
  }
  if (raw.sourceKind !== 'package' && raw.sourceKind !== 'root') {
    fail(where, 'has an invalid sourceKind');
  }
  if (raw.basis !== 'release-manifest' && raw.basis !== 'commit-tree-blob') {
    fail(where, 'has an invalid verification basis');
  }
  if (!Array.isArray(raw.destinations) || raw.destinations.length === 0) {
    fail(where, 'has no published destinations');
  }
  const destinations = raw.destinations.map((binding, index) =>
    parseDestination(`${where} destination[${index}]`, binding),
  );
  return {
    name,
    sourcePath,
    sourceKind: raw.sourceKind,
    requestedRef: assertString(where, 'requestedRef', raw.requestedRef),
    resolvedCommit: assertCommit(where, 'resolvedCommit', raw.resolvedCommit),
    blobSha1: assertBlobSha1(where, raw.blobSha1),
    sha256: assertDigest(where, 'sha256', raw.sha256),
    basis: raw.basis,
    destinations,
  };
}

function parsePackage(where: string, value: unknown): AttributionPackageRecord {
  const raw = assertRecord(where, value);
  assertExactKeys(where, raw, [
    'registry',
    'declaringCategory',
    'requestedRef',
    'resolvedCommit',
    'files',
  ]);
  if (
    typeof raw.declaringCategory !== 'string' ||
    !CATEGORY_TOKEN_RE.test(raw.declaringCategory)
  ) {
    fail(where, 'has an invalid declaringCategory');
  }
  if (!Array.isArray(raw.files) || raw.files.length === 0) {
    fail(where, 'has no attribution files');
  }
  const fileNames = new Set<string>();
  const files = raw.files.map((file, index) => {
    const parsed = parseFile(`${where} files[${index}]`, file);
    if (fileNameKey(parsed.name, fileNames)) {
      fail(where, `has a duplicate installed filename '${parsed.name}'`);
    }
    return parsed;
  });
  return {
    registry: assertString(where, 'registry', raw.registry),
    declaringCategory: raw.declaringCategory,
    requestedRef: assertString(where, 'requestedRef', raw.requestedRef),
    resolvedCommit: assertCommit(where, 'resolvedCommit', raw.resolvedCommit),
    files,
  };
}

function fileNameKey(name: string, seen: Set<string>): boolean {
  const key = name.toLowerCase();
  if (seen.has(key)) return true;
  seen.add(key);
  return false;
}

/**
 * Validates and narrows the optional attribution catalog. Unknown versions and
 * malformed qualified records fail closed so no caller can republish them.
 */
export function validateAttributionCatalog(
  catalog: unknown,
): AttributionCatalog {
  const raw = assertRecord('root', catalog);
  assertExactKeys('root', raw, ['version', 'packages']);
  if (raw.version !== ATTRIBUTION_CATALOG_VERSION) {
    fail(
      'root',
      `has unsupported version ${String(raw.version)} (this CLI only reads version ${ATTRIBUTION_CATALOG_VERSION})`,
    );
  }
  const rawPackages = assertRecord('packages', raw.packages);
  const packages: Record<string, AttributionPackageRecord> = {};
  for (const [packageId, record] of Object.entries(rawPackages)) {
    if (!PACKAGE_ID_RE.test(packageId)) {
      fail(`package '${packageId}'`, 'is not a bounded category/skill key');
    }
    packages[packageId] = parsePackage(`package '${packageId}'`, record);
  }
  return { version: ATTRIBUTION_CATALOG_VERSION, packages };
}

export type AttributionChangeReason =
  | 'first-install'
  | 'added'
  | 'changed'
  | 'removed'
  | 'unchanged'
  | 'origin-changed'
  | 'unqualified-origin'
  | 'installed-bytes-mismatch';

export type AttributionFileChangeStatus =
  'added' | 'changed' | 'removed' | 'unchanged' | 'origin-changed';

export interface AttributionFileChange {
  name: string;
  status: AttributionFileChangeStatus;
  previousSha256: string | null;
  plannedSha256: string | null;
  /** Old record only when its origin is still trustworthy for installed bytes. */
  previous: AttributionFileRecord | null;
  planned: AttributionFileRecord | null;
}

export interface AttributionPackageChange {
  packageId: string;
  status:
    | 'added'
    | 'changed'
    | 'removed'
    | 'unchanged'
    | 'origin-changed'
    | 'legacy-unqualified';
  reason: AttributionChangeReason;
  /** Old record only when it could be qualified against installed bytes. */
  previous: AttributionPackageRecord | null;
  planned: AttributionPackageRecord | null;
  files: AttributionFileChange[];
  requiresConsent: boolean;
}

export interface AttributionComparison {
  /** True when no managed installation with attribution existed before this run. */
  firstInstall: boolean;
  /** Transition consent is needed before publishing. */
  requiresConsent: boolean;
  packages: AttributionPackageChange[];
  /** Packages whose prior origin could not be qualified from installed bytes. */
  legacyUnqualified: string[];
  /** Origin disclosure for a first installation (no transition to accept). */
  disclosures: AttributionPackageRecord[];
}

export interface AttributionComparisonInput {
  /** Attribution records computed for this run, keyed `<category>/<skill>`. */
  planned: Record<string, AttributionPackageRecord>;
  /** Validated catalog previously published, if any. */
  previousCatalog?: AttributionCatalog;
  /** Whether managed entries with provenance already exist. */
  hasExistingInstallation: boolean;
  /**
   * State of the bytes actually installed at each recorded destination.
   * Omitted or empty means the installed bytes could not be verified, which
   * never qualifies them.
   */
  installed?: InstalledAttributionState;
}

/** One recorded destination and the digest of the bytes found there. */
export interface InstalledAttributionBinding {
  agent: string;
  path: string;
  /** Digest of the installed bytes, or null when the destination is absent. */
  sha256: string | null;
}

/** `<category>/<skill>` -> installed filename -> per-destination state. */
export type InstalledAttributionState = Record<
  string,
  Record<string, InstalledAttributionBinding[]>
>;

function sameOrigin(
  left: AttributionSourceRecord,
  right: AttributionSourceRecord,
): boolean {
  return (
    left.sourcePath === right.sourcePath &&
    left.sourceKind === right.sourceKind &&
    left.requestedRef === right.requestedRef &&
    left.resolvedCommit === right.resolvedCommit &&
    left.blobSha1 === right.blobSha1 &&
    left.sha256 === right.sha256 &&
    left.basis === right.basis
  );
}

/**
 * A previous record is trustworthy only when every recorded destination
 * exists and its own bytes still match its own recorded digest. A pooled
 * digest anywhere is not evidence: one intact copy never qualifies an edited
 * or missing sibling, and digests swapped between agents never match.
 */
function qualifiesAgainstInstalled(
  previous: AttributionFileRecord,
  installed: InstalledAttributionBinding[] | undefined,
): boolean {
  if (!installed || installed.length === 0) return false;
  return previous.destinations.every((recorded) => {
    const actual = installed.find(
      (candidate) =>
        candidate.agent === recorded.agent && candidate.path === recorded.path,
    );
    return (
      actual !== undefined &&
      actual.sha256 !== null &&
      actual.sha256 === recorded.sha256
    );
  });
}

function compareFiles(
  previous: AttributionPackageRecord,
  planned: AttributionPackageRecord,
  unqualifiedNames: Set<string>,
  originMoved: boolean,
): {
  files: AttributionFileChange[];
  sawAdded: boolean;
  sawRemoved: boolean;
  sawBytesChanged: boolean;
  sawOriginChanged: boolean;
} {
  const previousByName = new Map(
    previous.files.map((file) => [file.name, file]),
  );
  const plannedByName = new Map(planned.files.map((file) => [file.name, file]));
  const names = [
    ...new Set([...previousByName.keys(), ...plannedByName.keys()]),
  ].sort();

  const files: AttributionFileChange[] = [];
  let sawAdded = false;
  let sawRemoved = false;
  let sawBytesChanged = false;
  let sawOriginChanged = false;

  for (const name of names) {
    const oldFile = previousByName.get(name) ?? null;
    const newFile = plannedByName.get(name) ?? null;
    const unqualified = oldFile ? unqualifiedNames.has(name) : false;
    const trustworthyOld = unqualified ? null : oldFile;

    if (!oldFile && newFile) {
      sawAdded = true;
      files.push({
        name,
        status: 'added',
        previousSha256: null,
        plannedSha256: newFile.sha256,
        previous: null,
        planned: newFile,
      });
      continue;
    }
    if (oldFile && !newFile) {
      sawRemoved = true;
      files.push({
        name,
        status: 'removed',
        previousSha256: oldFile.sha256,
        plannedSha256: null,
        previous: trustworthyOld,
        planned: null,
      });
      continue;
    }
    if (oldFile && newFile) {
      if (oldFile.sha256 !== newFile.sha256) {
        sawBytesChanged = true;
        files.push({
          name,
          status: 'changed',
          previousSha256: oldFile.sha256,
          plannedSha256: newFile.sha256,
          previous: trustworthyOld,
          planned: newFile,
        });
        continue;
      }
      if (!sameOrigin(oldFile, newFile) || originMoved) {
        sawOriginChanged = true;
        files.push({
          name,
          status: 'origin-changed',
          previousSha256: oldFile.sha256,
          plannedSha256: newFile.sha256,
          previous: trustworthyOld,
          planned: newFile,
        });
        continue;
      }
      files.push({
        name,
        status: 'unchanged',
        previousSha256: oldFile.sha256,
        plannedSha256: newFile.sha256,
        previous: trustworthyOld,
        planned: newFile,
      });
    }
  }

  return { files, sawAdded, sawRemoved, sawBytesChanged, sawOriginChanged };
}

/**
 * Pure comparison of qualified attribution metadata. No writes, no prompts:
 * the command layer owns consent, publication and exit behavior.
 */
export function compareAttribution(
  input: AttributionComparisonInput,
): AttributionComparison {
  const previousPackages = input.previousCatalog?.packages ?? {};
  const packageIds = [
    ...new Set([
      ...Object.keys(previousPackages),
      ...Object.keys(input.planned),
    ]),
  ].sort();

  const packages: AttributionPackageChange[] = [];
  const legacyUnqualified: string[] = [];
  const disclosures: AttributionPackageRecord[] = [];
  let requiresConsent = false;

  for (const packageId of packageIds) {
    const previous = previousPackages[packageId] ?? null;
    const planned = input.planned[packageId] ?? null;

    if (!input.hasExistingInstallation) {
      if (!planned) continue;
      packages.push({
        packageId,
        status: 'added',
        reason: 'first-install',
        previous: null,
        planned,
        files: planned.files.map((file) => ({
          name: file.name,
          status: 'added',
          previousSha256: null,
          plannedSha256: file.sha256,
          previous: null,
          planned: file,
        })),
        requiresConsent: false,
      });
      disclosures.push(planned);
      continue;
    }

    if (!previous) {
      if (!planned) continue;
      const installed = input.installed?.[packageId];
      const isInstalled = Object.values(installed ?? {}).some((bindings) =>
        bindings.some((binding) => binding.sha256 !== null),
      );
      if (isInstalled) {
        legacyUnqualified.push(packageId);
        requiresConsent = true;
        packages.push({
          packageId,
          status: 'legacy-unqualified',
          reason: 'unqualified-origin',
          previous: null,
          planned,
          files: planned.files.map((file) => ({
            name: file.name,
            status: 'added',
            previousSha256: null,
            plannedSha256: file.sha256,
            previous: null,
            planned: file,
          })),
          requiresConsent: true,
        });
        continue;
      }
      requiresConsent = true;
      packages.push({
        packageId,
        status: 'added',
        reason: 'added',
        previous: null,
        planned,
        files: planned.files.map((file) => ({
          name: file.name,
          status: 'added',
          previousSha256: null,
          plannedSha256: file.sha256,
          previous: null,
          planned: file,
        })),
        requiresConsent: true,
      });
      continue;
    }

    const installed = input.installed?.[packageId];
    const unqualifiedNames = new Set(
      previous.files
        .filter(
          (file) => !qualifiesAgainstInstalled(file, installed?.[file.name]),
        )
        .map((file) => file.name),
    );

    if (!planned) {
      requiresConsent = true;
      packages.push({
        packageId,
        status: 'removed',
        reason: 'removed',
        previous: unqualifiedNames.size > 0 ? null : previous,
        planned: null,
        files: previous.files.map((file) => ({
          name: file.name,
          status: 'removed',
          previousSha256: file.sha256,
          plannedSha256: null,
          previous: unqualifiedNames.has(file.name) ? null : file,
          planned: null,
        })),
        requiresConsent: true,
      });
      continue;
    }

    // Registry identity is part of the package origin; a fork switch with the
    // same ref/commit/path/bytes is still an attribution origin change.
    const originMoved =
      previous.registry !== planned.registry ||
      previous.declaringCategory !== planned.declaringCategory ||
      previous.requestedRef !== planned.requestedRef ||
      previous.resolvedCommit !== planned.resolvedCommit;
    const compared = compareFiles(
      previous,
      planned,
      unqualifiedNames,
      originMoved,
    );
    if (unqualifiedNames.size > 0) {
      legacyUnqualified.push(packageId);
      requiresConsent = true;
      packages.push({
        packageId,
        status: 'legacy-unqualified',
        reason:
          installed && Object.keys(installed).length > 0
            ? 'installed-bytes-mismatch'
            : 'unqualified-origin',
        previous: null,
        planned,
        files: compared.files,
        requiresConsent: true,
      });
      continue;
    }

    let reason: AttributionChangeReason = 'unchanged';
    let status: AttributionPackageChange['status'] = 'unchanged';
    if (compared.sawRemoved) {
      reason = 'removed';
      status = 'changed';
    } else if (compared.sawAdded) {
      reason = 'added';
      status = 'changed';
    } else if (compared.sawBytesChanged) {
      reason = 'changed';
      status = 'changed';
    } else if (compared.sawOriginChanged) {
      reason = 'origin-changed';
      status = 'origin-changed';
    }
    if (status !== 'unchanged') requiresConsent = true;
    packages.push({
      packageId,
      status,
      reason,
      previous,
      planned,
      files: compared.files,
      requiresConsent: status !== 'unchanged',
    });
  }

  return {
    firstInstall: !input.hasExistingInstallation,
    requiresConsent,
    packages,
    legacyUnqualified,
    disclosures,
  };
}

/**
 * Digest of an installed attribution file, or null when it cannot be read
 * inside the project root. The shared install path boundary rejects traversal
 * and any symlink component (terminal, parent, or dangling) before the bytes
 * are read, so external bytes can never qualify a record.
 */
export async function readInstalledAttributionDigest(
  rootDir: string,
  relativePath: string,
): Promise<string | null> {
  try {
    const absPath = path.join(rootDir, relativePath);
    await assertNoSymlinksUnderRoot(rootDir, absPath);
    const bytes = await fs.readFile(absPath);
    return createHash('sha256').update(bytes).digest('hex');
  } catch {
    // Missing, unreadable, escaping, or symlinked: unqualified, never a match.
    return null;
  }
}

/**
 * Reads the bytes actually installed at every recorded destination, preserving
 * agent/path identity. A missing or unsafe destination is reported with
 * `sha256: null`, which the comparison treats as unqualified rather than as
 * agreement.
 */
export async function collectInstalledAttributionDigests(
  rootDir: string,
  packages: Record<string, AttributionPackageRecord>,
): Promise<InstalledAttributionState> {
  const state: InstalledAttributionState = {};
  for (const [packageId, record] of Object.entries(packages)) {
    const perFile: Record<string, InstalledAttributionBinding[]> = {};
    for (const file of record.files) {
      perFile[file.name] = [];
      for (const binding of file.destinations) {
        perFile[file.name].push({
          agent: binding.agent,
          path: binding.path,
          sha256: await readInstalledAttributionDigest(rootDir, binding.path),
        });
      }
    }
    state[packageId] = perFile;
  }
  return state;
}

export function buildAttributionCatalog(
  packages: Record<string, AttributionPackageRecord>,
): AttributionCatalog {
  const sorted: Record<string, AttributionPackageRecord> = {};
  for (const packageId of Object.keys(packages).sort()) {
    sorted[packageId] = packages[packageId];
  }
  return { version: ATTRIBUTION_CATALOG_VERSION, packages: sorted };
}

/**
 * Merges a run's catalog over the previously published one. `next` wins per
 * package; a previous record survives only when the caller still retains it.
 * The predicate receives the record so retention can follow the explicit
 * declaring category instead of the physical package key.
 */
export function mergeAttributionCatalog(
  previous: AttributionCatalog | undefined,
  next: AttributionCatalog,
  retain: (packageId: string, record: AttributionPackageRecord) => boolean,
): AttributionCatalog {
  const packages: Record<string, AttributionPackageRecord> = {};
  for (const [packageId, record] of Object.entries(previous?.packages ?? {})) {
    if (packageId in next.packages) continue;
    if (!retain(packageId, record)) continue;
    packages[packageId] = record;
  }
  Object.assign(packages, next.packages);
  return buildAttributionCatalog(packages);
}
