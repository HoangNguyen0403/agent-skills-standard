#!/usr/bin/env node
// skills/product-management/product-evidence/scripts/validate-product-evidence.mjs
// Offline standalone validator for product evidence ledger JSON v1 (SDLC contract t01-v2)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { pathToFileURL } from "node:url";

const SCHEMA_VERSION = 1;
const TOOL_NAME = "product-evidence-validator";

const LIMITS = {
  MAX_FILE_BYTES: 1048576, // 1 MiB
  MAX_AUTHORITIES: 100, // current + historical
  MAX_RECORDS: 2000, // current + historical
  MAX_REFS: 10000, // total reference occurrences
  MAX_TRANSITIONS: 128,
  MAX_READ_FILES: 256,
  MAX_DEPTH: 64,
};

const MANDATORY_LIMITATIONS = [
  "source_truth_not_verified",
  "human_authorization_not_authenticated",
  "historical_payloads_not_authenticated",
];

const VALID_RECORD_KINDS = new Set(["SRC", "CLM", "OPP", "HYP", "EXP", "INV", "DEC", "MET", "REV"]);
const ID_PATTERN = /^(SRC|CLM|OPP|HYP|EXP|INV|DEC|MET|REV)-[0-9]{3,}$/;
const AUTH_ID_PATTERN = /^AUTH-[0-9]{3,}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVISION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const AUTH_REVISION_PATTERN = /^(?:sha256:[a-f0-9]{64}|[A-Za-z0-9][A-Za-z0-9._-]{0,63})$/;
const UTC_INSTANT_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const EXTENSION_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_RE = /\b(BRD-OBJ|REQ|AC|SRS)-([A-Za-z0-9]+)\b/g;
const ID_GRAMMAR = {
  "BRD-OBJ": /^BRD-OBJ-\d{3,}$/,
  REQ: /^REQ-\d{3,}$/,
  AC: /^AC-\d{3,}$/,
  SRS: /^SRS-\d{3,}$/,
};

const VALID_GATES = new Set(["structural", "experiment", "commit", "release"]);

function isNonEmptyString(val) {
  return typeof val === "string" && val.trim().length > 0;
}

function isSafeInteger(val) {
  return typeof val === "number" && Number.isSafeInteger(val);
}

function isFiniteNumber(val) {
  return typeof val === "number" && Number.isFinite(val);
}

function inspectJsonValue(root) {
  const pending = [{ value: root, path: "", depth: 0 }];
  const seen = new WeakSet();
  while (pending.length > 0) {
    const current = pending.pop();
    const { value, path: jsonPath, depth } = current;
    if (depth > LIMITS.MAX_DEPTH) return { ok: false, path: jsonPath, code: "LIMIT_EXCEEDED" };
    if (value === null || typeof value === "string" || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return { ok: false, path: jsonPath, code: "INVALID_FIELD" };
      continue;
    }
    if (typeof value !== "object" || seen.has(value)) {
      return { ok: false, path: jsonPath, code: "INVALID_FIELD" };
    }
    seen.add(value);
    if (Object.getOwnPropertySymbols(value).length > 0) return { ok: false, path: jsonPath, code: "INVALID_FIELD" };
    if (Array.isArray(value)) {
      const ownKeys = Object.keys(value);
      if (ownKeys.length !== value.length) return { ok: false, path: jsonPath, code: "INVALID_FIELD" };
      for (let index = value.length - 1; index >= 0; index--) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, "value")) {
          return { ok: false, path: `${jsonPath}/${index}`, code: "INVALID_FIELD" };
        }
        pending.push({ value: descriptor.value, path: `${jsonPath}/${index}`, depth: depth + 1 });
      }
      continue;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return { ok: false, path: jsonPath, code: "INVALID_FIELD" };
    for (const key of Object.keys(value).reverse()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        return { ok: false, path: `${jsonPath}/${escapeJsonPointer(key)}`, code: "INVALID_FIELD" };
      }
      pending.push({ value: descriptor.value, path: `${jsonPath}/${escapeJsonPointer(key)}`, depth: depth + 1 });
    }
  }
  return { ok: true };
}

function isAuthorityRevision(value) {
  return typeof value === "string" && (value.startsWith("sha256:")
    ? /^sha256:[a-f0-9]{64}$/.test(value)
    : isNonEmptyString(value));
}

function isSafeBudgetCap(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)(\.[0-9]{1,4})?$/.test(value)) return false;
  const [whole, fraction = ""] = value.split(".");
  if (whole.length > 15) return false;
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0")) <= 9007199254740991n;
}

function isValidGregorianDate(instantStr) {
  if (typeof instantStr !== "string" || !UTC_INSTANT_PATTERN.test(instantStr)) return false;
  const match = instantStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/);
  if (!match) return false;
  const [_, yStr, mStr, dStr, hrStr, minStr, secStr] = match;
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);
  const hour = parseInt(hrStr, 10);
  const minute = parseInt(minStr, 10);
  const second = parseInt(secStr, 10);

  if (month < 1 || month > 12) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;

  const daysInMonths = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > daysInMonths[month - 1]) return false;

  return true;
}

function compareInstants(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function scopesEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.segment === b.segment &&
    a.geography === b.geography &&
    a.window?.start === b.window?.start &&
    a.window?.end === b.window?.end
  );
}

function escapeJsonPointer(segment) {
  return String(segment).replace(/~/g, "~0").replace(/\//g, "~1");
}

function getProofMessage(code) {
  if (code === "OBSOLETE_BINDING") {
    return "Recorded proof binds an obsolete retained revision.";
  }
  if (code === "AUTHORITY_REVISION") {
    return "Recorded proof binds an obsolete retained authority revision.";
  }
  return `Recorded proof does not satisfy ${code}.`;
}
function hasBoldIdField(line) {
  let openIdx = 0;
  while ((openIdx = line.indexOf("**", openIdx)) !== -1) {
    const closeIdx = line.indexOf("**", openIdx + 2);
    if (closeIdx === -1) break;
    const inner = line.slice(openIdx + 2, closeIdx);
    if (!inner.includes("*") && /\bID\b/i.test(inner)) {
      return true;
    }
    openIdx = inner.includes("*") ? openIdx + 1 : closeIdx + 2;
  }
  return false;
}


// Markdown declaration parser mirroring scripts/trace/parse.ts
function scanMarkdownDeclarations(content) {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  const refs = [];

  function tableCells(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return undefined;
    const inner = trimmed.slice(1, -1);
    const cells = inner.split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) return undefined;
    return cells;
  }

  function firstCellSpan(line) {
    const cells = tableCells(line);
    if (!cells || cells.length === 0) return undefined;
    const start = line.indexOf("|") + 1;
    const nextBar = line.indexOf("|", start);
    const end = nextBar === -1 ? line.length : nextBar;
    return { text: cells[0], start, end };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const headingMarker = line.match(/^#{1,6}\s+/);
    const headingStart = headingMarker ? headingMarker[0].length : undefined;
    const idField = hasBoldIdField(line);
    const cellSpan = firstCellSpan(line);

    TOKEN_RE.lastIndex = 0;
    let match;
    let seenFirstOnLine = false;
    while ((match = TOKEN_RE.exec(line))) {
      const kind = match[1];
      const id = `${match[1]}-${match[2]}`;
      const valid = Boolean(ID_GRAMMAR[kind]?.test(id));

      let role = "reference";
      let weak = false;
      if (headingStart !== undefined && match.index === headingStart) {
        role = "declaration";
      } else if (idField && !seenFirstOnLine) {
        role = "declaration";
      } else if (cellSpan && cellSpan.text === id && match.index >= cellSpan.start && match.index < cellSpan.end) {
        role = "declaration";
        weak = true;
      }
      seenFirstOnLine = true;
      refs.push({ id, kind, line: lineNo, role, weak, valid });
    }
  }

  const strong = new Set();
  for (const ref of refs) {
    if (ref.role === "declaration" && !ref.weak && ref.valid) {
      strong.add(`${ref.kind}:${ref.id}`);
    }
  }
  for (const ref of refs) {
    if (ref.role === "declaration" && ref.weak && ref.valid) {
      if (strong.has(`${ref.kind}:${ref.id}`)) {
        ref.role = "reference";
      }
    }
  }

  const declarationCounts = new Map();
  for (const ref of refs) {
    if (ref.role === "declaration" && ref.valid) {
      declarationCounts.set(ref.id, (declarationCounts.get(ref.id) || 0) + 1);
    }
  }

  const declaredIds = new Set();
  let hasDuplicates = false;
  for (const [id, count] of declarationCounts.entries()) {
    declaredIds.add(id);
    if (count > 1) {
      hasDuplicates = true;
    }
  }

  return { declaredIds, hasDuplicates };
}

function validateLocalPathSecurity(relPath, authorityRoot) {
  if (!isNonEmptyString(relPath)) {
    return { ok: false, code: "INVALID_FIELD", message: "Path must be a non-empty string." };
  }
  if (
    relPath.includes("\\") ||
    relPath.includes("\0") ||
    relPath.startsWith("/") ||
    /^[A-Za-z]:/.test(relPath) ||
    relPath.includes("%") ||
    relPath.includes("?") ||
    relPath.includes("#")
  ) {
    return { ok: false, code: "UNSAFE_PATH", message: "Path contains unsafe characters or absolute format." };
  }

  const segments = relPath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return { ok: false, code: "UNSAFE_PATH", message: "Path contains dot, dot-dot, or empty segments." };
  }

  const targetPath = path.resolve(authorityRoot, ...segments);
  const relCheck = path.relative(authorityRoot, targetPath);
  if (relCheck === "" || relCheck.startsWith(`..${path.sep}`) || relCheck === ".." || path.isAbsolute(relCheck)) {
    return { ok: false, code: "UNSAFE_PATH", message: "Path escapes authority root." };
  }
  return { ok: true, targetPath };
}

function inspectContainedRegularFile(filePath, authorityRoot) {
  const relative = path.relative(authorityRoot, filePath);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    return { ok: false, code: "UNSAFE_PATH", message: "File must be below authority root." };
  }
  let current = authorityRoot;
  const segments = relative.split(path.sep);
  try {
    for (let index = 0; index < segments.length; index++) {
      current = path.join(current, segments[index]);
      let stat;
      try {
        stat = fs.lstatSync(current);
      } catch (error) {
        throw error;
      }
      if (stat.isSymbolicLink() || (index < segments.length - 1 ? !stat.isDirectory() : !stat.isFile())) {
        return { ok: false, code: "UNSAFE_PATH", message: "Path contains a symlink or non-regular component." };
      }
    }
    const canonical = fs.realpathSync(filePath);
    const canonicalRelative = path.relative(authorityRoot, canonical);
    if (canonicalRelative.startsWith(`..${path.sep}`) || canonicalRelative === ".." || path.isAbsolute(canonicalRelative)) {
      return { ok: false, code: "UNSAFE_PATH", message: "File escapes authority root." };
    }
    return { ok: true, stat: fs.lstatSync(filePath), canonical };
  } catch (error) {
    const code = error?.code === "ENOENT" ? "ENOENT" : "IO_ERROR";
    return { ok: false, code, message: "Unable to inspect file." };
  }
}

function validateExternalUriSecurity(uri) {
  if (typeof uri !== "string" || uri.length === 0 || /[\x00-\x1F\x7F]/.test(uri)) {
    return { ok: false, message: "URI must be non-empty and contain no control characters." };
  }

  if (uri.startsWith("urn:")) {
    const urnMatch = uri.match(/^urn:([a-z0-9][a-z0-9-]*):(.+)$/);
    return urnMatch && !/[\s]/.test(urnMatch[2]) ? { ok: true } : { ok: false, message: "URN format invalid or namespace disallowed." };
  }

  if (!uri.startsWith("https://")) return { ok: false, message: "URI scheme is not in allowlist (https or urn)." };
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname) {
      return { ok: false, message: "HTTPS URI must not contain credentials." };
    }
    for (const [key] of parsed.searchParams.entries()) {
      if (["token", "key", "secret", "password", "signature", "credential"].includes(key.toLowerCase())) {
        return { ok: false, message: "URI query contains credentials or tokens." };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Malformed https URL." };
  }
}

function readBoundedLocalFile(filePath, readFilesSet, authorityRoot) {
  readFilesSet.add(filePath);
  if (readFilesSet.size > LIMITS.MAX_READ_FILES) {
    return { ok: false, code: "LIMIT_EXCEEDED", message: "Exceeded max read files limit." };
  }
  const inspected = inspectContainedRegularFile(filePath, authorityRoot);
  if (!inspected.ok) return inspected;
  if (inspected.stat.size > LIMITS.MAX_FILE_BYTES) {
    return { ok: false, code: "LIMIT_EXCEEDED", message: "File exceeds 1 MiB size limit." };
  }
  let descriptor;
  try {
    const noFollow = fs.constants.O_NOFOLLOW ?? 0;
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | noFollow | fs.constants.O_NONBLOCK);
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || before.size > LIMITS.MAX_FILE_BYTES) {
      return { ok: false, code: before.isFile() ? "LIMIT_EXCEEDED" : "UNSAFE_PATH", message: "File is not a bounded regular file." };
    }
    const scratch = Buffer.allocUnsafe(Math.min(before.size, LIMITS.MAX_FILE_BYTES) + 1);
    let totalBytes = 0;
    while (totalBytes < scratch.length) {
      const bytesRead = fs.readSync(descriptor, scratch, totalBytes, scratch.length - totalBytes, null);
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
    }
    const buffer = scratch.subarray(0, totalBytes);
    const after = fs.fstatSync(descriptor);
    const current = inspectContainedRegularFile(filePath, authorityRoot);
    if (!current.ok || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs || current.stat.dev !== after.dev || current.stat.ino !== after.ino ||
        buffer.length !== after.size) {
      return { ok: false, code: "INPUT_CHANGED", message: "File identity or contents changed during read." };
    }
    if (totalBytes > LIMITS.MAX_FILE_BYTES) {
      return { ok: false, code: "LIMIT_EXCEEDED", message: "File exceeds 1 MiB size limit." };
    }
    return { ok: true, buffer, hash: crypto.createHash("sha256").update(buffer).digest("hex") };
  } catch (error) {
    const code = error?.code === "ENOENT" ? "ENOENT" : ["ELOOP", "ENOTDIR"].includes(error?.code) ? "UNSAFE_PATH" : "IO_ERROR";
    return { ok: false, code, message: "Failed to read bounded local file." };
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}


export async function validateProductEvidence(value, options = {}) {
  const { authorityRoot, ledgerPath, asOf, gate = "structural" } = options;

  const issues = [];
  const limitations = [...MANDATORY_LIMITATIONS];
  const affectedDecisions = new Set();
  const readFilesSet = new Set();
  const readFileCache = new Map();
  function readAssessmentFile(filePath) {
    const absolutePath = path.resolve(filePath);
    if (readFileCache.has(absolutePath)) return readFileCache.get(absolutePath);
    const result = readBoundedLocalFile(absolutePath, readFilesSet, canonicalRoot);
    readFileCache.set(absolutePath, result);
    return result;
  }
  let readiness = "not_assessed";
  let effectiveProductState = "unvalidated";
  let stateProofUnmet = false;
  let selectedStateDecisionForProof = null;
  const pendingStateHypothesisWarnings = [];
  let hasLimitError = false;
  let hasInvocationError = false;
  let hasIoOrPathError = false;

  function addIssue(code, severity, jsonPath, recordId, message) {
    const safeRecordId = typeof recordId === "string" && (ID_PATTERN.test(recordId) || AUTH_ID_PATTERN.test(recordId))
      ? recordId
      : null;
    issues.push({
      code,
      severity,
      path: jsonPath || "",
      record_id: safeRecordId,
      message,
    });
    if (code === "LIMIT_EXCEEDED") hasLimitError = true;
    if (code === "INVALID_ARGUMENT") hasInvocationError = true;
    if (["IO_ERROR", "UNSAFE_PATH", "INPUT_CHANGED", "INVALID_JSON"].includes(code)) hasIoOrPathError = true;
  }

  // Establish a narrow canonical root and contained ledger before payload traversal.
  if (!isNonEmptyString(authorityRoot) || !path.isAbsolute(authorityRoot)) {
    addIssue("INVALID_ARGUMENT", "error", "", null, "Authority root must be an existing absolute path.");
    return finalizeEnvelope(true);
  }

  const resolvedRoot = path.resolve(authorityRoot);
  if (resolvedRoot === path.parse(resolvedRoot).root || resolvedRoot === path.resolve(os.homedir())) {
    addIssue("UNSAFE_PATH", "error", "", null, "Authority root cannot be filesystem root or user home.");
    return finalizeEnvelope(true);
  }

  let canonicalRoot;
  try {
    const rootStat = fs.lstatSync(resolvedRoot);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      addIssue("UNSAFE_PATH", "error", "", null, "Authority root must be a canonical existing directory.");
      return finalizeEnvelope(true);
    }
    canonicalRoot = fs.realpathSync(resolvedRoot);
  } catch {
    addIssue("IO_ERROR", "error", "", null, "Authority root cannot be accessed.");
    return finalizeEnvelope(true);
  }
  if (canonicalRoot !== resolvedRoot || canonicalRoot === path.parse(canonicalRoot).root ||
      canonicalRoot === path.resolve(os.homedir())) {
    addIssue("UNSAFE_PATH", "error", "", null, "Canonical authority root must be narrow and not an alias.");
    return finalizeEnvelope(true);
  }

  if (!isNonEmptyString(ledgerPath) || !path.isAbsolute(ledgerPath)) {
    addIssue("INVALID_ARGUMENT", "error", "", null, "ledgerPath must be an absolute path.");
    return finalizeEnvelope(true);
  }
  const ledgerInspection = inspectContainedRegularFile(path.resolve(ledgerPath), canonicalRoot);
  if (!ledgerInspection.ok) {
    const code = ledgerInspection.code === "ENOENT" ? "IO_ERROR" : ledgerInspection.code;
    addIssue(code, "error", "", null, "ledgerPath must be a contained regular file.");
    return finalizeEnvelope(true);
  }
  if (ledgerInspection.stat.size > LIMITS.MAX_FILE_BYTES) {
    addIssue("LIMIT_EXCEEDED", "error", "", null, "Ledger file exceeds 1 MiB size limit.");
    return finalizeEnvelope(true);
  }
  readFilesSet.add(path.resolve(ledgerPath));
  if (readFilesSet.size > LIMITS.MAX_READ_FILES) {
    addIssue("LIMIT_EXCEEDED", "error", "", null, "Exceeded max read files limit.");
    return finalizeEnvelope(true);
  }

  if (!isNonEmptyString(asOf) || !isValidGregorianDate(asOf)) {
    addIssue("INVALID_ARGUMENT", "error", "", null, "asOf must be a valid UTC instant.");
    return finalizeEnvelope(true);
  }

  if (!VALID_GATES.has(gate)) {
    addIssue("INVALID_ARGUMENT", "error", "", null, `Gate must be one of: ${[...VALID_GATES].join(", ")}.`);
    return finalizeEnvelope(true);
  }

  // 2. Parse Value if String or Object
  let ledger = value;
  if (typeof value === "string") {
    try {
      ledger = JSON.parse(value);
    } catch (err) {
      addIssue("INVALID_JSON", "error", "", null, "Input is not valid JSON.");
      return finalizeEnvelope(true);
    }
  }

  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) {
    addIssue("INVALID_FIELD", "error", "", null, "Ledger must be a JSON object.");
    return finalizeEnvelope(true);
  }

  const jsonInspection = inspectJsonValue(ledger);
  if (!jsonInspection.ok) {
    addIssue(jsonInspection.code, "error", jsonInspection.path, null, "Ledger must contain bounded finite JSON data only.");
    return finalizeEnvelope(true);
  }

  // 3. Schema Version
  if (ledger.schema_version !== SCHEMA_VERSION) {
    addIssue("UNSUPPORTED_VERSION", "error", "/schema_version", null, "Expected schema_version 1.");
    return finalizeEnvelope(true);
  }

  const allowedRootKeys = new Set([
    "schema_version",
    "slug",
    "product_id",
    "revision",
    "synthetic",
    "updated_at",
    "strategy_authority",
    "strategy_gap",
    "authorities",
    "authority_history",
    "records",
    "record_history",
    "bridges",
    "product_state",
    "extensions",
  ]);

  for (const k of Object.keys(ledger)) {
    if (!allowedRootKeys.has(k)) {
      addIssue("INVALID_FIELD", "error", `/${escapeJsonPointer(k)}`, null, `Unknown key in root.`);
    }
  }

  for (const k of [
    "slug",
    "product_id",
    "revision",
    "synthetic",
    "updated_at",
    "strategy_authority",
    "strategy_gap",
    "authorities",
    "authority_history",
    "records",
    "record_history",
    "bridges",
    "product_state",
  ]) {
    if (!(k in ledger)) {
      addIssue("INVALID_FIELD", "error", `/${escapeJsonPointer(k)}`, null, `Missing required root field.`);
    }
  }

  if (typeof ledger.slug !== "string" || !SLUG_PATTERN.test(ledger.slug) || ledger.slug.length > 40) {
    addIssue("INVALID_FIELD", "error", "/slug", null, "Invalid slug grammar.");
  }
  if (typeof ledger.product_id !== "string" || !SLUG_PATTERN.test(ledger.product_id) || ledger.product_id.length > 64) {
    addIssue("INVALID_FIELD", "error", "/product_id", null, "Invalid product_id grammar.");
  }
  if (typeof ledger.revision !== "string" || !REVISION_PATTERN.test(ledger.revision)) {
    addIssue("INVALID_FIELD", "error", "/revision", null, "Invalid revision grammar.");
  }
  if (typeof ledger.synthetic !== "boolean") {
    addIssue("INVALID_FIELD", "error", "/synthetic", null, "synthetic must be boolean.");
  }
  if (!isValidGregorianDate(ledger.updated_at)) {
    addIssue("INVALID_FIELD", "error", "/updated_at", null, "updated_at must be valid UTC instant.");
  } else if (compareInstants(ledger.updated_at, asOf) > 0) {
    addIssue("INVALID_FIELD", "error", "/updated_at", null, "updated_at cannot be in the future relative to asOf.");
  }

  if (ledger.strategy_authority !== null) {
    if (typeof ledger.strategy_authority !== "string" || !AUTH_ID_PATTERN.test(ledger.strategy_authority)) {
      addIssue("INVALID_FIELD", "error", "/strategy_authority", null, "strategy_authority must be valid AUTH ID or null.");
    }
    if (ledger.strategy_gap !== null) {
      addIssue("INVALID_FIELD", "error", "/strategy_gap", null, "strategy_gap must be null when strategy_authority is set.");
    }
  } else {
    if (!isNonEmptyString(ledger.strategy_gap)) {
      addIssue("INVALID_FIELD", "error", "/strategy_gap", null, "strategy_gap must be non-empty when strategy_authority is null.");
    }
  }

  if ("extensions" in ledger) validateExtensions(ledger.extensions, "/extensions", null);

  // Root Arrays check
  if (!Array.isArray(ledger.authorities)) {
    addIssue("INVALID_FIELD", "error", "/authorities", null, "authorities must be an array.");
  }
  if (!Array.isArray(ledger.authority_history)) {
    addIssue("INVALID_FIELD", "error", "/authority_history", null, "authority_history must be an array.");
  }
  if (!Array.isArray(ledger.records)) {
    addIssue("INVALID_FIELD", "error", "/records", null, "records must be an array.");
  }
  if (!Array.isArray(ledger.record_history)) {
    addIssue("INVALID_FIELD", "error", "/record_history", null, "record_history must be an array.");
  }
  if (!Array.isArray(ledger.bridges)) {
    addIssue("INVALID_FIELD", "error", "/bridges", null, "bridges must be an array.");
  }
  if (!ledger.product_state || typeof ledger.product_state !== "object" || Array.isArray(ledger.product_state)) {
    addIssue("INVALID_FIELD", "error", "/product_state", null, "product_state must be an object.");
    return finalizeEnvelope(true);
  }
  const state = ledger.product_state;
  const stateKeys = ["value", "reason", "scope", "hypotheses", "decision", "assessed_at", "history"];
  validateExactObject(state, [...stateKeys, "extensions"], stateKeys, "/product_state", null);
  if ("extensions" in state) validateExtensions(state.extensions, "/product_state/extensions", null);
  if (!Array.isArray(state.history)) {
    addIssue("INVALID_FIELD", "error", "/product_state/history", null, "State history must be an array.");
    return finalizeEnvelope(true);
  }
  if (typeof state.value !== "string" ||
      !["unvalidated", "validating", "validated_for_scope", "invalidated", "inconclusive", "not_applicable"].includes(state.value) ||
      !isNonEmptyString(state.reason) || !Array.isArray(state.hypotheses) ||
      (state.decision !== null && (!state.decision || typeof state.decision !== "object" || Array.isArray(state.decision))) ||
      !state.scope || typeof state.scope !== "object" || Array.isArray(state.scope) ||
      !isValidGregorianDate(state.assessed_at) || compareInstants(state.assessed_at, asOf) > 0) {
    addIssue("INVALID_FIELD", "error", "/product_state", null, "State fields have invalid types or values.");
    return finalizeEnvelope(true);
  }
  validateRefArray(state.hypotheses, "/product_state/hypotheses", null, ["HYP"]);
  if (state.decision !== null) validateRefShape(state.decision, "/product_state/decision", null, ["DEC"]);
  let invalidHistory = false;
  for (let i = 0; i < state.history.length; i++) {
    const entry = state.history[i];
    const entryPath = `/product_state/history/${i}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      addIssue("INVALID_FIELD", "error", entryPath, null, "State history entry must be an object.");
      invalidHistory = true;
      continue;
    }
    const historyKeys = ["from", "to", "at", "reason", "decision"];
    validateExactObject(entry, historyKeys, historyKeys, entryPath, null);
    if (entry.decision !== null) validateRefShape(entry.decision, `${entryPath}/decision`, null, ["DEC"]);
    if (typeof entry.from !== "string" || typeof entry.to !== "string" ||
        !isValidGregorianDate(entry.at) || !isNonEmptyString(entry.reason) ||
        (entry.decision !== null && (!entry.decision || typeof entry.decision !== "object" || Array.isArray(entry.decision)))) {
      addIssue("INVALID_FIELD", "error", entryPath, null, "State history fields have invalid types or values.");
      invalidHistory = true;
    }
  }
  if (!Array.isArray(ledger.authorities) || !Array.isArray(ledger.authority_history) ||
      !Array.isArray(ledger.records) || !Array.isArray(ledger.record_history) || !Array.isArray(ledger.bridges)) {
    return finalizeEnvelope(true);
  }
  for (const [list, path] of [
    [ledger.authorities, "/authorities"],
    [ledger.authority_history, "/authority_history"],
    [ledger.records, "/records"],
    [ledger.record_history, "/record_history"],
    [ledger.bridges, "/bridges"],
  ]) {
    for (let i = 0; i < list.length; i++) {
      if (!list[i] || typeof list[i] !== "object" || Array.isArray(list[i])) {
        addIssue("INVALID_FIELD", "error", `${path}/${i}`, null, "Collection entry must be an object.");
      }
    }
  }
  if (invalidHistory || issues.some((issue) => issue.severity === "error")) return finalizeEnvelope(true);

  const authorities = ledger.authorities;
  const authorityHistory = ledger.authority_history;
  const records = ledger.records;
  const recordHistory = ledger.record_history;
  const bridges = ledger.bridges;
  const stateHistory = state.history;

  if (authorities.length + authorityHistory.length > LIMITS.MAX_AUTHORITIES) {
    addIssue("LIMIT_EXCEEDED", "error", "/authorities", null, "Authorities count exceeds maximum limit.");
    return finalizeEnvelope(true);
  }
  if (records.length + recordHistory.length > LIMITS.MAX_RECORDS) {
    addIssue("LIMIT_EXCEEDED", "error", "/records", null, "Records count exceeds maximum limit.");
    return finalizeEnvelope(true);
  }
  if (stateHistory.length > LIMITS.MAX_TRANSITIONS) {
    addIssue("LIMIT_EXCEEDED", "error", "/product_state/history", null, "State transitions count exceeds maximum limit.");
    return finalizeEnvelope(true);
  }

  // Count only declared typed references; record-shaped extension values remain inert.
  let totalRefs = 0;
  const countRef = (value) => {
    if (value !== null && value !== undefined) totalRefs++;
  };
  const countRefs = (value) => {
    if (Array.isArray(value)) totalRefs += value.length;
    else if (value !== null && value !== undefined) totalRefs++;
  };
  countRef(ledger.strategy_authority);
  const countRecordRefs = (list) => {
    for (const rec of list) {
      if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
      countRefs(rec.depends_on);
      const data = rec.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) continue;
      switch (rec.kind) {
        case "CLM":
          countRefs(data.sources);
          countRefs(data.counterevidence);
          break;
        case "OPP":
          countRefs(data.claims);
          break;
        case "HYP":
          countRef(data.opportunity);
          countRefs(data.claims);
          countRef(data.primary_metric);
          break;
        case "EXP":
          countRef(data.hypothesis);
          countRef(data.primary_metric);
          countRefs(data.guardrails);
          countRef(data.authorization);
          countRefs(data.result?.sources);
          break;
        case "INV":
          countRefs(data.claims);
          break;
        case "DEC":
          countRefs(data.consumes);
          countRefs(data.critical_claims);
          if (data.authority_id !== null || data.authority_revision !== null) countRefs(1);
          countRef(data.strategy_binding);
          countRef(data.supersedes);
          break;
        case "MET":
          countRef(data.query);
          countRef(data.baseline?.source);
          countRef(data.baseline_exception);
          break;
        case "REV":
          countRef(data.decision);
          countRefs(data.hypotheses);
          countRefs(data.metrics);
          countRefs(data.observations);
          countRefs(data.actual_costs);
          break;
        default:
          break;
      }
      if (totalRefs > LIMITS.MAX_REFS) return;
    }
  };
  countRecordRefs(records);
  if (totalRefs <= LIMITS.MAX_REFS) countRecordRefs(recordHistory);
  if (totalRefs <= LIMITS.MAX_REFS) {
    for (const bridge of bridges) {
      if (bridge && typeof bridge === "object") {
        countRef(bridge.record);
        if (bridge.authority_id !== undefined || bridge.authority_revision !== undefined) countRefs(1);
      }
      if (totalRefs > LIMITS.MAX_REFS) break;
    }
  }
  if (totalRefs <= LIMITS.MAX_REFS) {
    countRef(state.decision);
    countRefs(state.hypotheses);
    for (const entry of stateHistory) if (entry && typeof entry === "object") countRef(entry.decision);
  }
  if (totalRefs > LIMITS.MAX_REFS) {
    addIssue("LIMIT_EXCEEDED", "error", "", null, "Reference occurrences count exceeds maximum limit.");
    return finalizeEnvelope(true);
  }

  // Duplicate ID and Pair Tracking
  const currentAuthIds = new Set();
  const allAuthPairs = new Set();
  const authMap = new Map(); // id -> { current: auth, history: Map<rev, auth> }

  for (let i = 0; i < authorities.length; i++) {
    const auth = authorities[i];
    if (!auth || typeof auth !== "object") {
      addIssue("INVALID_FIELD", "error", `/authorities/${i}`, null, "Authority must be an object.");
      continue;
    }
    if (typeof auth.id === "string") {
      if (currentAuthIds.has(auth.id)) {
        addIssue("DUPLICATE_ID", "error", `/authorities/${i}/id`, auth.id, "Duplicate authority ID in authorities.");
      }
      currentAuthIds.add(auth.id);
      const pairKey = `${auth.id}@${auth.revision}`;
      if (allAuthPairs.has(pairKey)) {
        addIssue("DUPLICATE_ID", "error", `/authorities/${i}`, auth.id, "Duplicate authority pair.");
      }
      allAuthPairs.add(pairKey);

      if (!authMap.has(auth.id)) authMap.set(auth.id, { current: auth, history: new Map() });
      else authMap.get(auth.id).current = auth;
    }
  }

  for (let i = 0; i < authorityHistory.length; i++) {
    const auth = authorityHistory[i];
    if (!auth || typeof auth !== "object") {
      addIssue("INVALID_FIELD", "error", `/authority_history/${i}`, null, "Historical authority must be an object.");
      continue;
    }
    if (typeof auth.id === "string") {
      const pairKey = `${auth.id}@${auth.revision}`;
      if (allAuthPairs.has(pairKey)) {
        addIssue("DUPLICATE_ID", "error", `/authority_history/${i}`, auth.id, "Duplicate authority pair in history.");
      }
      allAuthPairs.add(pairKey);

      if (!authMap.has(auth.id)) authMap.set(auth.id, { current: null, history: new Map() });
      authMap.get(auth.id).history.set(auth.revision, auth);
    }
  }

  // Check orphan authority history
  for (const [authId, entry] of authMap.entries()) {
    if (!entry.current) {
      addIssue("DANGLING_REFERENCE", "error", "/authority_history", authId, "Archived authority ID has no current row.");
    }
  }

  const currentRecordIds = new Set();
  const allRecordPairs = new Set();
  const recordIndexMap = new Map();
  const recMap = new Map(); // id -> { current: rec, history: Map<rev, rec> }
  const recordedDecRevisions = new Map(); // id -> Set<revision>

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (!rec || typeof rec !== "object") {
      addIssue("INVALID_FIELD", "error", `/records/${i}`, null, "Record must be an object.");
      continue;
    }
    if (typeof rec.id === "string") {
      if (currentRecordIds.has(rec.id)) {
        addIssue("DUPLICATE_ID", "error", `/records/${i}/id`, rec.id, "Duplicate record ID in records.");
      }
      currentRecordIds.add(rec.id);
      recordIndexMap.set(rec.id, i);
      const pairKey = `${rec.id}@${rec.revision}`;
      if (allRecordPairs.has(pairKey)) {
        addIssue("DUPLICATE_ID", "error", `/records/${i}`, rec.id, "Duplicate record pair.");
      }
      allRecordPairs.add(pairKey);

      if (!recMap.has(rec.id)) recMap.set(rec.id, { current: rec, history: new Map() });
      else recMap.get(rec.id).current = rec;

      if (rec.kind === "DEC" && rec.data?.status === "recorded") {
        if (!recordedDecRevisions.has(rec.id)) recordedDecRevisions.set(rec.id, new Set());
        recordedDecRevisions.get(rec.id).add(rec.revision);
      }
    }
  }

  for (let i = 0; i < recordHistory.length; i++) {
    const rec = recordHistory[i];
    if (!rec || typeof rec !== "object") {
      addIssue("INVALID_FIELD", "error", `/record_history/${i}`, null, "Historical record must be an object.");
      continue;
    }
    if (typeof rec.id === "string") {
      const pairKey = `${rec.id}@${rec.revision}`;
      if (allRecordPairs.has(pairKey)) {
        addIssue("DUPLICATE_ID", "error", `/record_history/${i}`, rec.id, "Duplicate record pair in history.");
      }
      allRecordPairs.add(pairKey);

      if (!recMap.has(rec.id)) recMap.set(rec.id, { current: null, history: new Map() });
      recMap.get(rec.id).history.set(rec.revision, rec);

      if (rec.kind === "DEC" && rec.data?.status === "recorded") {
        // Same-ID replacement of recorded DEC check
        const curRow = recMap.get(rec.id)?.current;
        if (curRow && curRow.kind === "DEC" && curRow.revision !== rec.revision) {
          addIssue("INVALID_FIELD", "error", `/records/${recordIndexMap.get(rec.id) ?? 0}`, rec.id, "A recorded decision cannot be replaced by a new revision under the same ID.");
        }
      }
    }
  }

  // Check orphan record history (F07)
  for (const [recId, entry] of recMap.entries()) {
    if (!entry.current) {
      addIssue("DANGLING_REFERENCE", "error", "/record_history", recId, "Archived record ID has no current row.");
    }
  }

  // Validate Scope helper
  function validateScopeObject(scopeObj, jsonPath, recId) {
    if (!scopeObj || typeof scopeObj !== "object" || Array.isArray(scopeObj)) {
      addIssue("INVALID_FIELD", "error", jsonPath, recId, "Scope must be an object.");
      return false;
    }
    const allowed = new Set(["segment", "geography", "window"]);
    validateExactObject(scopeObj, [...allowed], [...allowed], jsonPath, recId);
    let ok = true;
    if (!isNonEmptyString(scopeObj.segment)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/segment`, recId, "segment must be non-empty string.");
      ok = false;
    }
    if (!isNonEmptyString(scopeObj.geography)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/geography`, recId, "geography must be non-empty string.");
      ok = false;
    }
    const win = scopeObj.window;
    if (!win || typeof win !== "object" || Array.isArray(win)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/window`, recId, "window must be an object.");
      ok = false;
    } else {
      const winAllowed = new Set(["start", "end"]);
      validateExactObject(win, [...winAllowed], [...winAllowed], `${jsonPath}/window`, recId);
      if (!isValidGregorianDate(win.start)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/window/start`, recId, "window start must be valid UTC instant.");
        ok = false;
      }
      if (!isValidGregorianDate(win.end)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/window/end`, recId, "window end must be valid UTC instant.");
        ok = false;
      }
      if (isValidGregorianDate(win.start) && isValidGregorianDate(win.end)) {
        if (compareInstants(win.start, win.end) >= 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/window/end`, recId, "window start must be strictly before end.");
          ok = false;
        }
      }
    }
    return ok;
  }

  // Validate Freshness helper
  function validateFreshnessObject(fObj, jsonPath, recId) {
    if (!fObj || typeof fObj !== "object" || Array.isArray(fObj)) {
      addIssue("INVALID_FIELD", "error", jsonPath, recId, "Freshness must be an object.");
      return;
    }
    const allowed = new Set(["status", "rationale", "reviewed_at", "expires_at", "review_triggers"]);
    validateExactObject(fObj, [...allowed], [...allowed], jsonPath, recId);
    if (!["current", "stale", "disputed", "unknown"].includes(fObj.status)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/status`, recId, "Invalid freshness status.");
    }
    if (!isNonEmptyString(fObj.rationale)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/rationale`, recId, "Freshness rationale must be non-empty string.");
    }
    if (fObj.reviewed_at !== null) {
      if (!isValidGregorianDate(fObj.reviewed_at)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/reviewed_at`, recId, "reviewed_at must be valid UTC instant or null.");
      } else if (compareInstants(fObj.reviewed_at, asOf) > 0) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/reviewed_at`, recId, "reviewed_at cannot be in the future.");
      }
    }
    if (fObj.expires_at !== null && !isValidGregorianDate(fObj.expires_at)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/expires_at`, recId, "expires_at must be valid UTC instant or null.");
    }
    if (!Array.isArray(fObj.review_triggers) || fObj.review_triggers.length === 0) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/review_triggers`, recId, "review_triggers must be a non-empty array.");
    } else {
      const seenTriggers = new Set();
      for (let idx = 0; idx < fObj.review_triggers.length; idx++) {
        const tr = fObj.review_triggers[idx];
        if (!isNonEmptyString(tr)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/review_triggers/${idx}`, recId, "Review trigger must be non-empty string.");
        } else if (seenTriggers.has(tr)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/review_triggers/${idx}`, recId, "Duplicate review trigger.");
        }
        seenTriggers.add(tr);
      }
    }

    if (fObj.status === "current") {
      if (fObj.reviewed_at === null) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/reviewed_at`, recId, "Current freshness requires non-null reviewed_at.");
      }
    }
  }

  // Validate Authority items

  function validateAuthorityItem(auth, jsonPath) {
    if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
      addIssue("INVALID_FIELD", "error", jsonPath, null, "Authority must be an object.");
      return;
    }
    const authorityKeys = ["id", "domain", "locator", "revision", "owner", "scope", "declared_ids", "access"];
    validateExactObject(auth, [...authorityKeys, "extensions"], authorityKeys, jsonPath, null);
    if ("extensions" in auth) validateExtensions(auth.extensions, `${jsonPath}/extensions`, auth.id);

    if (typeof auth.id !== "string" || !AUTH_ID_PATTERN.test(auth.id)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/id`, auth.id, "Invalid authority ID.");
    }
    if (!["strategy", "business", "requirements", "technical", "authorization"].includes(auth.domain)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/domain`, auth.id, "Invalid authority domain.");
    }
    if (!isNonEmptyString(auth.owner)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/owner`, auth.id, "Authority owner must be non-empty string.");
    }
    validateScopeObject(auth.scope, `${jsonPath}/scope`, auth.id);

    if (!Array.isArray(auth.declared_ids)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/declared_ids`, auth.id, "declared_ids must be an array.");
    } else {
      const seen = new Set();
      for (let i = 0; i < auth.declared_ids.length; i++) {
        const dId = auth.declared_ids[i];
        if (typeof dId !== "string" || !/^(BRD-OBJ|REQ|AC|SRS)-[0-9]{3,}$/.test(dId)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/declared_ids/${i}`, auth.id, "Invalid declared ID grammar.");
        } else if (seen.has(dId)) {
          addIssue("DUPLICATE_ID", "error", `${jsonPath}/declared_ids/${i}`, auth.id, "Duplicate declared ID.");
        }
        seen.add(dId);
      }
    }

    if (!["available", "protected", "unavailable"].includes(auth.access)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/access`, auth.id, "Invalid authority access.");
    }

    if (typeof auth.revision !== "string" || !auth.revision.trim() || /[\u0000-\u001f\u007f]/.test(auth.revision)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/revision`, auth.id, "Authority revision must be a non-empty opaque token.");
    }
    const locator = auth.locator;
    if (!locator || typeof locator !== "object" || Array.isArray(locator)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/locator`, auth.id, "Authority locator must be an object.");
      return;
    }

    if (locator.kind === "local") {
      validateExactObject(locator, ["kind", "path", "sha256"], ["kind", "path", "sha256"], `${jsonPath}/locator`, auth.id);
    } else if (locator.kind === "external") {
      validateExactObject(locator, ["kind", "uri", "snapshot_sha256"], ["kind", "uri", "snapshot_sha256"], `${jsonPath}/locator`, auth.id);
    } else {
      validateExactObject(locator, ["kind"], ["kind"], `${jsonPath}/locator`, auth.id);
    }

    if (locator.kind === "local") {
      const pathSec = validateLocalPathSecurity(locator.path, canonicalRoot);
      if (!pathSec.ok) {
        addIssue(pathSec.code, "error", `${jsonPath}/locator/path`, auth.id, pathSec.message);
        return;
      }
      if (typeof locator.sha256 !== "string" || !SHA256_PATTERN.test(locator.sha256)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/locator/sha256`, auth.id, "sha256 must be 64-hex lowercase.");
        return;
      }
      if (auth.revision !== `sha256:${locator.sha256}`) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/revision`, auth.id, "Local authority revision must equal sha256:<sha256>.");
      }

      // Read current available local authority (F09: never read archived or protected!)
      if (jsonPath.startsWith("/authorities/") && auth.access === "available") {
        const fileRes = readAssessmentFile(pathSec.targetPath);
        if (!fileRes.ok) {
          const code = fileRes.code === "ENOENT" ? "IO_ERROR" : fileRes.code;
          addIssue(code, "error", `${jsonPath}/locator/path`, auth.id, fileRes.message);
        } else if (fileRes.hash !== locator.sha256) {
          addIssue("HASH_MISMATCH", "error", `${jsonPath}/locator/sha256`, auth.id, "Authority file SHA256 does not match bytes.");
        } else {
          // Scan declarations
          const textContent = fileRes.buffer.toString("utf8");
          const { declaredIds: fileDeclared, hasDuplicates } = scanMarkdownDeclarations(textContent);
          if (hasDuplicates) {
            addIssue("BRIDGE_DECLARATION", "error", `${jsonPath}/declared_ids`, auth.id, "Authority file contains duplicate ID declarations.");
          }
          const expectedDeclared = new Set(auth.declared_ids || []);
          let mismatch = false;
          for (const id of expectedDeclared) {
            if (!fileDeclared.has(id)) mismatch = true;
          }
          if (mismatch) {
            addIssue("BRIDGE_DECLARATION", "error", `${jsonPath}/declared_ids`, auth.id, "Declared IDs mismatch actual declarations in local file.");
          }
        }
      }
    } else if (locator.kind === "external") {
      const uriSec = validateExternalUriSecurity(locator.uri);
      if (!uriSec.ok) {
        addIssue("UNSAFE_PATH", "error", `${jsonPath}/locator/uri`, auth.id, uriSec.message);
      }
      if (locator.snapshot_sha256 !== null) {
        if (typeof locator.snapshot_sha256 !== "string" || !SHA256_PATTERN.test(locator.snapshot_sha256)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/locator/snapshot_sha256`, auth.id, "snapshot_sha256 must be 64-hex lowercase or null.");
        }
      } else if (auth.access !== "unavailable") {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/locator/snapshot_sha256`, auth.id, "External snapshot hash can only be null when access is unavailable.");
      }
    } else {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/locator/kind`, auth.id, "Locator kind must be local or external.");
    }
  }

  for (let i = 0; i < authorities.length; i++) {
    validateAuthorityItem(authorities[i], `/authorities/${i}`);
  }
  for (let i = 0; i < authorityHistory.length; i++) {
    validateAuthorityItem(authorityHistory[i], `/authority_history/${i}`);
  }

  // Validate Records
  const ALLOWED_RECORD_KEYS = new Set([
    "id", "kind", "revision", "owner", "scope", "depends_on", "freshness", "data", "extensions"
  ]);

  const ALLOWED_DATA_KEYS = {
    SRC: new Set(["locator", "origin", "retrieved_at", "privacy", "license", "status", "limitations"]),
    CLM: new Set(["statement", "classification", "sources", "counterevidence", "rationale", "uncertainty", "status", "critical"]),
    OPP: new Set(["problem", "customer_job", "claims", "substitutes", "alternatives", "status", "rationale"]),
    HYP: new Set(["opportunity", "prediction", "mechanism", "claims", "primary_metric", "disconfirmation", "status"]),
    EXP: new Set(["hypothesis", "method", "eligibility", "sample_plan", "primary_metric", "guardrails", "rules", "bounds", "authorization", "status", "result"]),
    INV: new Set(["alternatives", "claims", "financial_input", "financial_result", "nonmonetary", "status", "accounting_rationale"]),
    DEC: new Set(["purpose", "status", "outcome", "consumes", "critical_claims", "authority_id", "authority_revision", "strategy_binding", "artifact_bindings", "decided_at", "rationale", "uncertainties", "revisit_triggers", "supersedes"]),
    MET: new Set(["definition", "unit", "denominator", "query", "query_revision", "baseline", "baseline_exception", "comparison_window", "eligibility", "target", "guardrail", "measurement_owner", "review_trigger", "status"]),
    REV: new Set(["decision", "hypotheses", "metrics", "observations", "actual_costs", "attribution", "recommendation", "limitations", "reviewed_at"]),
  };

  const REQUIRED_DATA_KEYS = {
    SRC: ["locator", "origin", "retrieved_at", "privacy", "license", "status", "limitations"],
    CLM: ["statement", "classification", "sources", "counterevidence", "rationale", "uncertainty", "status", "critical"],
    OPP: ["problem", "customer_job", "claims", "substitutes", "alternatives", "status", "rationale"],
    HYP: ["opportunity", "prediction", "mechanism", "claims", "primary_metric", "disconfirmation", "status"],
    EXP: ["hypothesis", "method", "eligibility", "sample_plan", "primary_metric", "guardrails", "rules", "bounds", "authorization", "status", "result"],
    INV: ["alternatives", "claims", "financial_input", "financial_result", "nonmonetary", "status", "accounting_rationale"],
    DEC: ["purpose", "status", "outcome", "consumes", "critical_claims", "authority_id", "authority_revision", "strategy_binding", "artifact_bindings", "decided_at", "rationale", "uncertainties", "revisit_triggers", "supersedes"],
    MET: ["definition", "unit", "denominator", "query", "query_revision", "baseline", "baseline_exception", "comparison_window", "eligibility", "target", "guardrail", "measurement_owner", "review_trigger", "status"],
    REV: ["decision", "hypotheses", "metrics", "observations", "actual_costs", "attribution", "recommendation", "limitations", "reviewed_at"],
  };

  function validateExactObject(value, allowedKeys, requiredKeys, jsonPath, recordId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      addIssue("INVALID_FIELD", "error", jsonPath, recordId, "Expected an object.");
      return false;
    }
    for (const key of Object.keys(value)) {
      if (!allowedKeys.includes(key)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/${escapeJsonPointer(key)}`, recordId, "Unknown object member.");
      }
    }
    for (const key of requiredKeys) {
      if (!Object.hasOwn(value, key)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/${key}`, recordId, "Missing required object member.");
      }
    }
    return true;
  }

  function validateExtensions(value, jsonPath, recordId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      addIssue("INVALID_FIELD", "error", jsonPath, recordId, "extensions must be an object if present.");
      return;
    }
    for (const key of Object.keys(value)) {
      if (!EXTENSION_KEY_PATTERN.test(key)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/${escapeJsonPointer(key)}`, recordId, "Extension key must be namespaced vendor.name.");
      }
    }
  }

  function validateRefShape(ref, jsonPath, recId, allowedPrefixes) {
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
      addIssue("INVALID_FIELD", "error", jsonPath, recId, "Reference must be an object.");
      return false;
    }
    validateExactObject(ref, ["id", "revision"], ["id", "revision"], jsonPath, recId);
    if (typeof ref.id !== "string" || typeof ref.revision !== "string" ||
        !REVISION_PATTERN.test(ref.revision) || !ID_PATTERN.test(ref.id) && !AUTH_ID_PATTERN.test(ref.id)) {
      addIssue("INVALID_FIELD", "error", jsonPath, recId, "Reference id or revision is invalid.");
      return false;
    }
    const prefix = ref.id.split("-")[0];
    if (allowedPrefixes && !allowedPrefixes.includes(prefix)) {
      addIssue("REFERENCE_KIND", "error", jsonPath, recId, "Reference target kind mismatch.");
      return false;
    }
    return true;
  }

  function validateRefArray(value, jsonPath, recId, allowedPrefixes, minItems = 0) {
    if (!Array.isArray(value) || value.length < minItems) {
      addIssue("INVALID_FIELD", "error", jsonPath, recId, "Reference list has invalid type or item count.");
      return;
    }
    const seen = new Set();
    for (let index = 0; index < value.length; index++) {
      const ref = value[index];
      if (validateRefShape(ref, `${jsonPath}/${index}`, recId, allowedPrefixes)) {
        const key = `${ref.id}@${ref.revision}`;
        if (seen.has(key)) addIssue("INVALID_FIELD", "error", `${jsonPath}/${index}`, recId, "Duplicate reference pair.");
        seen.add(key);
      }
    }
  }

  function validateStringArray(value, jsonPath, recId, minItems = 0) {
    if (!Array.isArray(value) || value.length < minItems) {
      addIssue("INVALID_FIELD", "error", jsonPath, recId, "String list has invalid type or item count.");
      return;
    }
    const seen = new Set();
    for (let index = 0; index < value.length; index++) {
      if (!isNonEmptyString(value[index])) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/${index}`, recId, "Expected a non-empty string.");
      } else if (seen.has(value[index])) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/${index}`, recId, "Duplicate string value.");
      }
      seen.add(value[index]);
    }
  }

  function validateRecordItem(rec, jsonPath) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) return;
    const recId = rec.id;

    for (const key of ["id", "kind", "revision", "owner", "scope", "depends_on", "freshness", "data"]) {
      if (!Object.hasOwn(rec, key)) addIssue("INVALID_FIELD", "error", `${jsonPath}/${key}`, null, "Missing required record field.");
    }

    for (const k of Object.keys(rec)) {
      if (!ALLOWED_RECORD_KEYS.has(k)) addIssue("INVALID_FIELD", "error", `${jsonPath}/${escapeJsonPointer(k)}`, null, "Unknown key in record.");
    }

    if ("extensions" in rec) validateExtensions(rec.extensions, `${jsonPath}/extensions`, recId);

    if (typeof recId !== "string" || !ID_PATTERN.test(recId)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/id`, null, "Record ID format invalid.");
    }
    const expectedKind = typeof recId === "string" ? recId.split("-")[0] : null;
    if (!VALID_RECORD_KINDS.has(rec.kind) || rec.kind !== expectedKind) {
      addIssue("REFERENCE_KIND", "error", `${jsonPath}/kind`, null, "Record kind does not match ID prefix.");
      return;
    }
    if (typeof rec.revision !== "string" || !REVISION_PATTERN.test(rec.revision)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/revision`, null, "Record revision invalid.");
    }
    if (!isNonEmptyString(rec.owner)) addIssue("INVALID_FIELD", "error", `${jsonPath}/owner`, null, "Record owner must be non-empty string.");
    validateScopeObject(rec.scope, `${jsonPath}/scope`, recId);
    validateFreshnessObject(rec.freshness, `${jsonPath}/freshness`, recId);
    validateRefArray(rec.depends_on, `${jsonPath}/depends_on`, recId, null);

    const data = rec.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      addIssue("INVALID_FIELD", "error", `${jsonPath}/data`, recId, "Record data must be an object.");
      return;
    }

    const allowedData = ALLOWED_DATA_KEYS[rec.kind];
    for (const key of Object.keys(data)) {
      if (!allowedData.has(key)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/${escapeJsonPointer(key)}`, recId, "Unknown key in record data.");
    }
    for (const key of REQUIRED_DATA_KEYS[rec.kind]) {
      if (!Object.hasOwn(data, key)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/${key}`, recId, "Missing required payload field.");
    }
    const validateStrings = (fields, target = data, basePath = `${jsonPath}/data`) => {
      if (!target || typeof target !== "object" || Array.isArray(target)) return;
      for (const field of fields) {
        if (!isNonEmptyString(target[field])) addIssue("INVALID_FIELD", "error", `${basePath}/${field}`, recId, "Expected a non-empty string.");
      }
    };
    const validateEnum = (field, values) => {
      if (!values.includes(data[field])) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/${field}`, recId, "Invalid enum value.");
    };
    switch (rec.kind) {
      case "SRC": {
        const loc = data.locator;
        if (loc?.kind === "local") validateExactObject(loc, ["kind", "path", "sha256"], ["kind", "path", "sha256"], `${jsonPath}/data/locator`, recId);
        else if (loc?.kind === "external") validateExactObject(loc, ["kind", "uri", "snapshot_sha256"], ["kind", "uri", "snapshot_sha256"], `${jsonPath}/data/locator`, recId);
        else addIssue("INVALID_FIELD", "error", `${jsonPath}/data/locator/kind`, recId, "Locator kind must be local or external.");
        if (loc?.kind === "external" && loc.snapshot_sha256 !== null && !SHA256_PATTERN.test(loc.snapshot_sha256)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/locator/snapshot_sha256`, recId, "snapshot_sha256 must be SHA256 or null.");
        }
        validateExactObject(data.origin, ["publisher", "origin_id", "classification", "revision", "observed_at", "scope"], ["publisher", "origin_id", "classification", "revision", "observed_at", "scope"], `${jsonPath}/data/origin`, recId);
        validateStrings(["publisher", "origin_id", "revision"], data.origin, `${jsonPath}/data/origin`);
        if (!["primary", "secondary", "first_party"].includes(data.origin?.classification)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/origin/classification`, recId, "Invalid source origin classification.");
        const validPrivacy = ["public", "internal", "restricted"].includes(data.privacy?.classification) &&
          ["none", "redacted", "pointer_only"].includes(data.privacy?.redaction) &&
          ["available", "protected", "unavailable"].includes(data.privacy?.access);
        if (!validPrivacy) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/privacy`, recId, "Invalid privacy classification, redaction, or access.");
        if (data.privacy?.classification === "restricted" &&
            (data.privacy.redaction !== "pointer_only" || !["protected", "unavailable"].includes(data.privacy.access))) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/privacy`, recId, "Restricted sources must be pointer-only and protected or unavailable.");
        }
        validateExactObject(data.license, ["identifier", "usage", "restrictions"], ["identifier", "usage", "restrictions"], `${jsonPath}/data/license`, recId);
        if (!isNonEmptyString(data.license?.identifier) || !["citation_only", "reuse_permitted", "unresolved"].includes(data.license?.usage)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/license`, recId, "Invalid license identifier or usage.");
        }
        validateStringArray(data.license?.restrictions, `${jsonPath}/data/license/restrictions`, recId);
        validateStringArray(data.limitations, `${jsonPath}/data/limitations`, recId);
        validateEnum("status", ["available", "unavailable", "withdrawn"]);
        break;
      }
      case "CLM":
        validateStrings(["statement", "rationale", "uncertainty"]);
        validateEnum("classification", ["confirmed", "inference", "assumption", "unknown"]);
        validateEnum("status", ["supported", "unresolved", "refuted", "disputed"]);
        validateRefArray(data.sources, `${jsonPath}/data/sources`, recId, ["SRC"]);
        validateRefArray(data.counterevidence, `${jsonPath}/data/counterevidence`, recId, ["SRC", "CLM"]);
        break;
      case "OPP":
        validateStrings(["problem", "customer_job", "rationale"]);
        validateEnum("status", ["candidate", "selected", "deferred", "rejected"]);
        validateStringArray(data.substitutes, `${jsonPath}/data/substitutes`, recId, 1);
        validateStringArray(data.alternatives, `${jsonPath}/data/alternatives`, recId, 1);
        validateRefArray(data.claims, `${jsonPath}/data/claims`, recId, ["CLM"]);
        break;
      case "HYP":
        validateStrings(["prediction", "mechanism", "disconfirmation"]);
        validateEnum("status", ["proposed", "testing", "supported", "refuted", "inconclusive"]);
        validateRefShape(data.opportunity, `${jsonPath}/data/opportunity`, recId, ["OPP"]);
        validateRefArray(data.claims, `${jsonPath}/data/claims`, recId, ["CLM"]);
        if (data.primary_metric !== null) validateRefShape(data.primary_metric, `${jsonPath}/data/primary_metric`, recId, ["MET"]);
        break;
      case "EXP": {
        validateStrings(["method", "eligibility", "sample_plan"]);
        validateEnum("status", ["proposed", "authorized", "running", "completed", "stopped"]);
        validateRefShape(data.hypothesis, `${jsonPath}/data/hypothesis`, recId, ["HYP"]);
        validateRefShape(data.primary_metric, `${jsonPath}/data/primary_metric`, recId, ["MET"]);
        validateRefArray(data.guardrails, `${jsonPath}/data/guardrails`, recId, ["MET"]);
        validateExactObject(data.rules, ["success", "failure", "inconclusive"], ["success", "failure", "inconclusive"], `${jsonPath}/data/rules`, recId);
        validateStrings(["success", "failure", "inconclusive"], data.rules, `${jsonPath}/data/rules`);
        const boundKeys = ["starts_at", "ends_at", "budget_cap", "currency", "exposure_cap", "stop_rules"];
        validateExactObject(data.bounds, boundKeys, boundKeys, `${jsonPath}/data/bounds`, recId);
        validateStringArray(data.bounds?.stop_rules, `${jsonPath}/data/bounds/stop_rules`, recId, 1);
        for (const field of ["starts_at", "ends_at"]) {
          if (data.bounds?.[field] !== null && !isValidGregorianDate(data.bounds?.[field])) {
            addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/${field}`, recId, "Experiment bound must be a valid UTC instant or null.");
          }
        }
        if (isValidGregorianDate(data.bounds?.starts_at) && isValidGregorianDate(data.bounds?.ends_at) &&
            compareInstants(data.bounds.starts_at, data.bounds.ends_at) >= 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/ends_at`, recId, "Experiment end must follow its start.");
        }
        if (data.bounds?.budget_cap !== null && !isSafeBudgetCap(data.bounds?.budget_cap)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/budget_cap`, recId, "Invalid budget cap.");
        if (data.bounds?.currency !== null && !/^[A-Z]{3}$/.test(data.bounds.currency)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/currency`, recId, "Invalid currency.");
        if (data.bounds?.exposure_cap !== null && (!isSafeInteger(data.bounds.exposure_cap) || data.bounds.exposure_cap < 0)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/exposure_cap`, recId, "Exposure cap must be non-negative safe integer or null.");
        if (data.bounds && ((data.bounds.budget_cap === null) !== (data.bounds.currency === null))) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/currency`, recId, "Currency must be null exactly when budget_cap is null.");
        }
        if (data.authorization !== null) validateRefShape(data.authorization, `${jsonPath}/data/authorization`, recId, ["DEC"]);
        if (data.result !== null) {
          validateExactObject(data.result, ["classification", "sources", "limitations"], ["classification", "sources", "limitations"], `${jsonPath}/data/result`, recId);
          if (!["supported", "refuted", "inconclusive"].includes(data.result?.classification)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/result/classification`, recId, "Invalid experiment result classification.");
          validateRefArray(data.result?.sources, `${jsonPath}/data/result/sources`, recId, ["SRC"]);
          validateStringArray(data.result?.limitations, `${jsonPath}/data/result/limitations`, recId);
        }
        break;
      }
      case "INV":
        validateEnum("status", ["proposal", "reviewed", "deferred", "rejected"]);
        validateStrings(["accounting_rationale"]);
        validateRefArray(data.claims, `${jsonPath}/data/claims`, recId, ["CLM"]);
        validateStringArray(data.nonmonetary, `${jsonPath}/data/nonmonetary`, recId);
        if (!Array.isArray(data.alternatives) || data.alternatives.length === 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/alternatives`, recId, "Investment alternatives must be a non-empty array.");
        } else {
          for (let index = 0; index < data.alternatives.length; index++) {
            const alternative = data.alternatives[index];
            validateExactObject(alternative, ["name", "rationale"], ["name", "rationale"], `${jsonPath}/data/alternatives/${index}`, recId);
            if (!isNonEmptyString(alternative?.name) || !isNonEmptyString(alternative?.rationale)) {
              addIssue("INVALID_FIELD", "error", `${jsonPath}/data/alternatives/${index}`, recId, "Investment alternative requires name and rationale.");
            }
          }
        }
        for (const field of ["financial_input", "financial_result"]) {
          const artifact = data[field];
          if (artifact !== null) {
            validateExactObject(artifact, ["path", "sha256"], ["path", "sha256"], `${jsonPath}/data/${field}`, recId);
            if (!isNonEmptyString(artifact?.path) || !SHA256_PATTERN.test(artifact?.sha256 || "")) {
              addIssue("INVALID_FIELD", "error", `${jsonPath}/data/${field}`, recId, "Financial artifact requires path and SHA256.");
            }
          }
        }
        break;
      case "DEC":
        validateEnum("purpose", ["learning", "experiment", "investment", "specification", "uat", "release", "retirement", "value_review"]);
        validateEnum("status", ["proposed", "recorded", "superseded", "revoked"]);
        validateEnum("outcome", ["propose", "authorize", "reject", "defer", "risk_accept", "scale", "iterate", "stop", "inconclusive"]);
        if (data.status !== "proposed" && (!Array.isArray(data.artifact_bindings) || data.artifact_bindings.length === 0)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/artifact_bindings`, recId, "Recorded DEC requires at least one artifact binding.");
        }
        if (data.status === "proposed" && ["authorize", "scale", "stop", "risk_accept"].includes(data.outcome)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/outcome`, recId, "Proposed DEC outcome is not permitted.");
        }
        if (["recorded", "superseded", "revoked"].includes(data.status) &&
            (!isValidGregorianDate(data.decided_at) || compareInstants(data.decided_at, asOf) > 0)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/decided_at`, recId, "Recorded/superseded/revoked DEC requires valid UTC decided_at no later than asOf.");
        }
        if (["recorded", "superseded", "revoked"].includes(data.status) && data.outcome === "propose") {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/outcome`, recId, "Recorded/superseded/revoked DEC cannot have outcome 'propose'.");
        }
        if (data.outcome === "authorize" &&
            !["learning", "experiment", "investment", "specification", "uat", "release", "retirement"].includes(data.purpose) ||
            data.outcome === "risk_accept" && !["investment", "release"].includes(data.purpose) ||
            ["scale", "iterate", "stop", "inconclusive"].includes(data.outcome) && data.purpose !== "value_review") {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/outcome`, recId, "DEC outcome is not valid for its purpose.");
        }
        if (!Array.isArray(data.artifact_bindings)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/artifact_bindings`, recId, "artifact_bindings must be an array.");
        } else {
          for (let index = 0; index < data.artifact_bindings.length; index++) {
            const binding = data.artifact_bindings[index];
            validateExactObject(binding, ["path", "sha256"], ["path", "sha256"], `${jsonPath}/data/artifact_bindings/${index}`, recId);
            if (!isNonEmptyString(binding?.path) || !SHA256_PATTERN.test(binding?.sha256 || "")) {
              addIssue("INVALID_FIELD", "error", `${jsonPath}/data/artifact_bindings/${index}`, recId, "Artifact binding requires a relative path and SHA256.");
            }
            const pathSecurity = validateLocalPathSecurity(binding?.path, canonicalRoot);
            if (!pathSecurity.ok) addIssue(pathSecurity.code, "error", `${jsonPath}/data/artifact_bindings/${index}/path`, recId, "Artifact binding path is not a safe relative path.");
          }
        }
        validateStrings(["rationale"]);
        validateRefArray(data.consumes, `${jsonPath}/data/consumes`, recId, ["CLM", "OPP", "HYP", "EXP", "INV", "MET", "REV"]);
        validateRefArray(data.critical_claims, `${jsonPath}/data/critical_claims`, recId, ["CLM"]);
        validateStringArray(data.uncertainties, `${jsonPath}/data/uncertainties`, recId);
        validateStringArray(data.revisit_triggers, `${jsonPath}/data/revisit_triggers`, recId, 1);
        if ((data.authority_id === null) !== (data.authority_revision === null)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/authority_id`, recId, "Authority ID and revision must both be null or both be present.");
        }
        if (data.authority_id !== null && (typeof data.authority_id !== "string" || !AUTH_ID_PATTERN.test(data.authority_id) || !isAuthorityRevision(data.authority_revision))) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/authority_id`, recId, "Invalid authority binding.");
        if (data.strategy_binding !== null) {
          validateExactObject(data.strategy_binding, ["authority_id", "revision"], ["authority_id", "revision"], `${jsonPath}/data/strategy_binding`, recId);
          if (!AUTH_ID_PATTERN.test(data.strategy_binding?.authority_id || "") || !isAuthorityRevision(data.strategy_binding?.revision)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/strategy_binding`, recId, "Invalid strategy binding.");
        }
        if (data.supersedes !== null) validateRefShape(data.supersedes, `${jsonPath}/data/supersedes`, recId, ["DEC"]);
        break;
      case "MET":
        validateStrings(["definition", "unit", "denominator", "eligibility", "target", "guardrail", "measurement_owner", "review_trigger"]);
        validateEnum("status", ["planned", "instrumented", "observed", "unavailable"]);
        if (data.query !== null) validateRefShape(data.query, `${jsonPath}/data/query`, recId, ["SRC"]);
        if (data.query_revision !== null && !isNonEmptyString(data.query_revision)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/query_revision`, recId, "query_revision must be non-empty or null.");
        if ((data.query === null) !== (data.query_revision === null)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/query_revision`, recId, "query and query_revision must both be null or both be present.");
        }
        if (data.baseline !== null) {
          validateExactObject(data.baseline, ["value", "source", "window"], ["value", "source", "window"], `${jsonPath}/data/baseline`, recId);
          if (typeof data.baseline?.value !== "string" || !/^-?(0|[1-9][0-9]*)(\.[0-9]{1,8})?$/.test(data.baseline.value)) {
            addIssue("INVALID_FIELD", "error", `${jsonPath}/data/baseline/value`, recId, "Invalid baseline value.");
          }
          validateRefShape(data.baseline?.source, `${jsonPath}/data/baseline/source`, recId, ["SRC"]);
          validateScopeObject({segment: "baseline", geography: "baseline", window: data.baseline?.window}, `${jsonPath}/data/baseline`, recId);
        }
        if (data.baseline_exception !== null) validateRefShape(data.baseline_exception, `${jsonPath}/data/baseline_exception`, recId, ["DEC"]);
        validateScopeObject({segment: "comparison", geography: "comparison", window: data.comparison_window}, `${jsonPath}/data/comparison_window`, recId);
        break;
      case "REV":
        validateRefShape(data.decision, `${jsonPath}/data/decision`, recId, ["DEC"]);
        validateRefArray(data.hypotheses, `${jsonPath}/data/hypotheses`, recId, ["HYP"]);
        validateRefArray(data.metrics, `${jsonPath}/data/metrics`, recId, ["MET"]);
        validateRefArray(data.observations, `${jsonPath}/data/observations`, recId, ["SRC"]);
        validateRefArray(data.actual_costs, `${jsonPath}/data/actual_costs`, recId, ["SRC"]);
        validateExactObject(data.attribution, ["classification", "rationale", "confounders"], ["classification", "rationale", "confounders"], `${jsonPath}/data/attribution`, recId);
        if (!["descriptive", "causal_supported", "unknown"].includes(data.attribution?.classification) || !isNonEmptyString(data.attribution?.rationale)) addIssue("INVALID_FIELD", "error", `${jsonPath}/data/attribution`, recId, "Invalid attribution classification or rationale.");
        validateStringArray(data.attribution?.confounders, `${jsonPath}/data/attribution/confounders`, recId);
        validateEnum("recommendation", ["scale", "iterate", "stop", "inconclusive"]);
        validateStringArray(data.limitations, `${jsonPath}/data/limitations`, recId);
        if (!isValidGregorianDate(data.reviewed_at) || compareInstants(data.reviewed_at, asOf) > 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/reviewed_at`, recId, "reviewed_at must be a valid UTC instant no later than asOf.");
        }
        break;
    }
    const dependencies = new Set(Array.isArray(rec.depends_on)
      ? rec.depends_on.filter((ref) => ref && typeof ref.id === "string" && typeof ref.revision === "string")
        .map((ref) => `${ref.id}@${ref.revision}`)
      : []);
    const requireDeclaredDependency = (ref, refPath) => {
      if (ref && typeof ref.id === "string" && typeof ref.revision === "string" &&
          !dependencies.has(`${ref.id}@${ref.revision}`)) {
        addIssue("INVALID_FIELD", "error", refPath, recId, "Typed support reference must also appear in depends_on.");
      }
    };
    if (rec.kind === "CLM") {
      if (Array.isArray(data.sources)) {
        for (let index = 0; index < data.sources.length; index++) {
          requireDeclaredDependency(data.sources[index], `${jsonPath}/data/sources/${index}`);
        }
      }
    } else if (rec.kind === "OPP") {
      if (Array.isArray(data.claims)) {
        for (let index = 0; index < data.claims.length; index++) {
          requireDeclaredDependency(data.claims[index], `${jsonPath}/data/claims/${index}`);
        }
      }
    } else if (rec.kind === "HYP") {
      requireDeclaredDependency(data.opportunity, `${jsonPath}/data/opportunity`);
      if (Array.isArray(data.claims)) {
        for (let index = 0; index < data.claims.length; index++) {
          requireDeclaredDependency(data.claims[index], `${jsonPath}/data/claims/${index}`);
        }
      }
    } else if (rec.kind === "EXP") {
      requireDeclaredDependency(data.hypothesis, `${jsonPath}/data/hypothesis`);
    } else if (rec.kind === "INV") {
      if (Array.isArray(data.claims)) {
        for (let index = 0; index < data.claims.length; index++) {
          requireDeclaredDependency(data.claims[index], `${jsonPath}/data/claims/${index}`);
        }
      }
    } else if (rec.kind === "DEC") {
      for (const field of ["consumes", "critical_claims"]) {
        if (Array.isArray(data[field])) {
          for (let index = 0; index < data[field].length; index++) {
            requireDeclaredDependency(data[field][index], `${jsonPath}/data/${field}/${index}`);
          }
        }
      }
    } else if (rec.kind === "REV") {
      for (const field of ["hypotheses", "metrics", "observations", "actual_costs"]) {
        if (Array.isArray(data[field])) {
          for (let index = 0; index < data[field].length; index++) {
            requireDeclaredDependency(data[field][index], `${jsonPath}/data/${field}/${index}`);
          }
        }
      }
    }
    if (rec.kind === "SRC") {
      const loc = data.locator;
      if (loc?.kind === "local") {
        if (typeof loc.sha256 !== "string" || !SHA256_PATTERN.test(loc.sha256)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/locator/sha256`, recId, "Local locator SHA256 must be 64 lowercase hex characters.");
        }
        const pathSec = validateLocalPathSecurity(loc.path, canonicalRoot);
        if (!pathSec.ok) {
          addIssue(pathSec.code, "error", `${jsonPath}/data/locator/path`, recId, pathSec.message);
        } else if (jsonPath.startsWith("/records/") && data.privacy?.classification !== "restricted" &&
            data.privacy?.redaction !== "pointer_only" && data.privacy?.access === "available" && data.status === "available") {
          const fileRes = readAssessmentFile(pathSec.targetPath);
          if (!fileRes.ok) {
            const code = fileRes.code === "ENOENT" ? "IO_ERROR" : fileRes.code;
            addIssue(code, "error", `${jsonPath}/data/locator/path`, recId, fileRes.message);
          } else if (fileRes.hash !== loc.sha256) {
            addIssue("HASH_MISMATCH", "error", `${jsonPath}/data/locator/sha256`, recId, "SRC file hash mismatch.");
          }
        }
      } else if (loc?.kind === "external") {
        const uriSec = validateExternalUriSecurity(loc.uri);
        if (!uriSec.ok) addIssue("UNSAFE_PATH", "error", `${jsonPath}/data/locator/uri`, recId, uriSec.message);
      }
      if (data.origin && typeof data.origin === "object" && !Array.isArray(data.origin)) {
        validateScopeObject(data.origin.scope, `${jsonPath}/data/origin/scope`, recId);
        if (data.origin.observed_at !== null && !isValidGregorianDate(data.origin.observed_at)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/origin/observed_at`, recId, "observed_at must be valid UTC instant or null.");
        } else if (data.origin.observed_at === null && (!Array.isArray(data.limitations) || data.limitations.length === 0)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/origin/observed_at`, recId, "Unknown observation time requires a limitation.");
        } else if (data.origin.observed_at !== null && compareInstants(data.origin.observed_at, asOf) > 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/origin/observed_at`, recId, "observed_at cannot be in the future.");
        }
      }
      if (!["available", "unavailable", "withdrawn"].includes(data.status)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/status`, recId, "SRC status must be available|unavailable|withdrawn.");
      }
      if (!isValidGregorianDate(data.retrieved_at)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/retrieved_at`, recId, "retrieved_at must be a valid UTC instant.");
      } else if (compareInstants(data.retrieved_at, asOf) > 0) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/retrieved_at`, recId, "retrieved_at cannot be in the future.");
      }
      if (isValidGregorianDate(data.origin?.observed_at) && isValidGregorianDate(data.retrieved_at) &&
          compareInstants(data.origin.observed_at, data.retrieved_at) > 0) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/origin/observed_at`, recId, "observed_at cannot be later than retrieved_at.");
      }
    } else if (rec.kind === "CLM") {
      if (typeof data.critical !== "boolean") {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/critical`, recId, "critical must be boolean.");
      }
      if (data.classification === "confirmed" && (!Array.isArray(data.sources) || data.sources.length === 0)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/sources`, recId, "Confirmed claim must have at least one source.");
      }
      if (data.classification === "inference" && (!Array.isArray(data.sources) || data.sources.length === 0 || !isNonEmptyString(data.rationale))) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/rationale`, recId, "Inference claim must have >=1 source and interpretation rationale.");
      }
      if (data.status === "supported" && (data.classification === "unknown" || data.classification === "assumption")) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/status`, recId, "Supported claim cannot have unknown or assumption classification.");
      }
    } else if (rec.kind === "EXP") {
      if (data.status === "completed") {
        if (!data.result || !["supported", "refuted", "inconclusive"].includes(data.result.classification)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/result`, recId, "Completed experiment must have result classification supported/refuted/inconclusive.");
        }
        if (!data.result || !Array.isArray(data.result.sources) || data.result.sources.length === 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/result/sources`, recId, "Completed experiment result must have non-empty sources.");
        }
      } else if (data.status === "proposed") {
        if (data.result !== null || data.authorization !== null) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/result`, recId, "Proposed experiment must have null result and authorization.");
        }
      } else {
        if (!data.authorization) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/authorization`, recId, "Authorized/running/completed/stopped experiment requires authorization DEC.");
        }
        if (!data.bounds || !isValidGregorianDate(data.bounds.starts_at) ||
            !isValidGregorianDate(data.bounds.ends_at) || data.bounds.budget_cap === null ||
            data.bounds.currency === null || data.bounds.exposure_cap === null ||
            !Array.isArray(data.bounds.stop_rules) || data.bounds.stop_rules.length === 0 ||
            data.guardrails.length === 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds`, recId, "Authorized experiment requires finite time, budget, exposure, guardrails, and stop rules.");
        }
      }
      if (!isValidGregorianDate(data.bounds?.starts_at)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/starts_at`, recId, "starts_at must be a valid UTC instant.");
      }
      if (!isValidGregorianDate(data.bounds?.ends_at)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/ends_at`, recId, "ends_at must be a valid UTC instant.");
      }
      if (data.bounds && isValidGregorianDate(data.bounds.starts_at) && isValidGregorianDate(data.bounds.ends_at) &&
          compareInstants(data.bounds.starts_at, data.bounds.ends_at) >= 0) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/ends_at`, recId, "Experiment bounds starts_at must be strictly before ends_at.");
      }
      if (data.bounds && data.bounds.exposure_cap !== null &&
          (!isSafeInteger(data.bounds.exposure_cap) || data.bounds.exposure_cap < 0)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/bounds/exposure_cap`, recId, "exposure_cap must be safe integer >= 0 or null.");
      }
    } else if (rec.kind === "INV") {
      const hasInput = data.financial_input !== null;
      const hasResult = data.financial_result !== null;
      if (hasInput !== hasResult) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/financial_result`, recId, "financial_input and financial_result must be both present or both null.");
      }
      const hasNonmonetary = Array.isArray(data.nonmonetary) && data.nonmonetary.length > 0;
      if (!hasNonmonetary && !hasInput) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/nonmonetary`, recId, "INV requires either nonmonetary rationale or both financial artifacts.");
      }
    } else if (rec.kind === "DEC") {

      if (data.supersedes) {
        const targetRec = recMap.get(data.supersedes.id);
        const targetSnapshot = targetRec?.current?.revision === data.supersedes.revision
          ? targetRec.current
          : targetRec?.history?.get(data.supersedes.revision);
        if (targetSnapshot) {
          if (targetSnapshot.data?.purpose !== data.purpose) {
            addIssue("INVALID_FIELD", "error", `${jsonPath}/data/supersedes`, recId, "Superseded DEC must have same purpose.");
          }
          if (!scopesEqual(targetSnapshot.scope, rec.scope)) {
            addIssue("SCOPE_MISMATCH", "error", `${jsonPath}/data/supersedes`, recId, "Superseded DEC must have same scope.");
          }
        }
      }
    } else if (rec.kind === "MET") {
      if (!isNonEmptyString(data.definition)) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/definition`, recId, "definition must be non-empty string.");
      }
      if (["observed", "instrumented"].includes(data.status)) {
        if (!data.query || !isNonEmptyString(data.query_revision)) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/query`, recId, "Observed/instrumented MET requires query ref and query_revision.");
        }
      }
      if (data.baseline !== null && data.baseline_exception !== null) {
        addIssue("INVALID_FIELD", "error", `${jsonPath}/data/baseline`, recId, "MET cannot specify both baseline source and baseline exception.");
      }
      if (data.baseline) {
        if (data.comparison_window && compareInstants(data.baseline.window?.end, data.comparison_window.start) > 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/baseline/window`, recId, "Baseline window must end <= comparison start.");
        }
      }
      if (data.comparison_window) {
        if (compareInstants(data.comparison_window.start, data.comparison_window.end) >= 0) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/comparison_window`, recId, "comparison_window start must be strictly before end.");
        }
      }
    }
  }

  for (let i = 0; i < records.length; i++) {
    validateRecordItem(records[i], `/records/${i}`);
  }
  for (let i = 0; i < recordHistory.length; i++) {
    validateRecordItem(recordHistory[i], `/record_history/${i}`);
  }
  if (issues.some((issue) => issue.severity === "error")) return finalizeEnvelope(true);

  // Validate Bridges
  for (let i = 0; i < bridges.length; i++) {
    const bridge = bridges[i];
    if (!bridge || typeof bridge !== "object" || Array.isArray(bridge)) {
      addIssue("INVALID_FIELD", "error", `/bridges/${i}`, null, "Bridge must be an object.");
      continue;
    }
    validateExactObject(bridge, ["record", "authority_id", "authority_revision", "ids", "extensions"], ["record", "authority_id", "authority_revision", "ids"], `/bridges/${i}`, null);
    if ("extensions" in bridge) validateExtensions(bridge.extensions, `/bridges/${i}/extensions`, null);
    if (typeof bridge.authority_id !== "string" || !AUTH_ID_PATTERN.test(bridge.authority_id) || !isAuthorityRevision(bridge.authority_revision)) {
      addIssue("INVALID_FIELD", "error", `/bridges/${i}/authority_id`, null, "Bridge authority binding is invalid.");
    }
    if (!Array.isArray(bridge.ids) || bridge.ids.length === 0) {
      addIssue("INVALID_FIELD", "error", `/bridges/${i}/ids`, null, "Bridge ids must be non-empty array.");
    } else {
      const seenBridgeIds = new Set();
      for (let idIndex = 0; idIndex < bridge.ids.length; idIndex++) {
        const declaredId = bridge.ids[idIndex];
        if (typeof declaredId !== "string" || !/^(BRD-OBJ|REQ|AC|SRS)-[0-9]{3,}$/.test(declaredId)) {
          addIssue("INVALID_FIELD", "error", `/bridges/${i}/ids/${idIndex}`, null, "Bridge ID grammar invalid.");
        } else if (seenBridgeIds.has(declaredId)) {
          addIssue("INVALID_FIELD", "error", `/bridges/${i}/ids/${idIndex}`, null, "Duplicate bridge ID.");
        }
        seenBridgeIds.add(declaredId);
      }
    }

    const recRef = bridge.record;
    const authId = bridge.authority_id;
    const authRev = bridge.authority_revision;

    const validRecordRef = validateRefShape(bridge.record, `/bridges/${i}/record`, null, null);
    if (validRecordRef) {
      const recRef = bridge.record;
      const rEntry = recMap.get(recRef.id);
      if (!rEntry) {
        addIssue("DANGLING_REFERENCE", "error", `/bridges/${i}/record`, null, "Bridge record pair does not exist.");
      } else if (rEntry.current?.revision !== recRef.revision && !rEntry.history.has(recRef.revision)) {
        addIssue("REFERENCE_REVISION", "error", `/bridges/${i}/record`, null, "Bridge record revision not found.");
      }
    }

    const authEntry = authMap.get(authId);
    let resolvedAuth = null;
    if (authEntry) {
      if (authEntry.current?.revision === authRev) resolvedAuth = authEntry.current;
      else if (authEntry.history.has(authRev)) resolvedAuth = authEntry.history.get(authRev);
    }

    if (!resolvedAuth) {
      if (!authEntry) {
        addIssue("DANGLING_REFERENCE", "error", `/bridges/${i}/authority_id`, null, "Bridge authority not found.");
      } else {
        addIssue("REFERENCE_REVISION", "error", `/bridges/${i}/authority_revision`, null, "Bridge authority revision not found.");
      }
    } else {
      const allowedId = {
        business: (id) => /^BRD-OBJ-[0-9]{3,}$/.test(id),
        requirements: (id) => /^(REQ|AC)-[0-9]{3,}$/.test(id),
        technical: (id) => /^SRS-[0-9]{3,}$/.test(id),
      }[resolvedAuth.domain];
      if (!allowedId) {
        addIssue("BRIDGE_DECLARATION", "error", `/bridges/${i}/authority_id`, null, "Authority domain is not valid for a bridge.");
      } else if (Array.isArray(bridge.ids)) {
        for (let idIndex = 0; idIndex < bridge.ids.length; idIndex++) {
          if (!allowedId(bridge.ids[idIndex])) {
            addIssue("BRIDGE_DECLARATION", "error", `/bridges/${i}/ids/${idIndex}`, null, "Bridge ID type does not match authority domain.");
          }
        }
      }
      if (!Array.isArray(bridge.ids) || bridge.ids.length === 0) {
        addIssue("INVALID_FIELD", "error", `/bridges/${i}/ids`, null, "Bridge ids must be non-empty array.");
      } else {
        const declared = new Set(resolvedAuth.declared_ids || []);
        for (const id of bridge.ids) {
          if (!declared.has(id)) {
            addIssue("BRIDGE_DECLARATION", "error", `/bridges/${i}/ids`, null, "Bridge ID is not in authority declared_ids.");
          }
        }
      }
    }
  }

  // Validate References across the entire ledger
  const missingPairsReported = new Map();

  function checkTypedRef(ref, jsonPath, expectedPrefixes, referringRowId, isHistoricalRow) {
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
      addIssue("INVALID_FIELD", "error", jsonPath, referringRowId, "Reference must be an object.");
      return;
    }
    validateExactObject(ref, ["id", "revision"], ["id", "revision"], jsonPath, referringRowId);
    if (typeof ref.id !== "string" || typeof ref.revision !== "string" ||
        !ID_PATTERN.test(ref.id) && !AUTH_ID_PATTERN.test(ref.id) ||
        !REVISION_PATTERN.test(ref.revision) && !isAuthorityRevision(ref.revision)) {
      addIssue("INVALID_FIELD", "error", jsonPath, referringRowId, "Reference id or revision is invalid.");
      return;
    }

    const actualPrefix = ref.id.split("-")[0];
    if (expectedPrefixes && !expectedPrefixes.includes(actualPrefix)) {
      addIssue("REFERENCE_KIND", "error", jsonPath, referringRowId, `Reference target kind mismatch.`);
      return;
    }

    if (actualPrefix === "AUTH") {
      const aEntry = authMap.get(ref.id);
      if (!aEntry) {
        addIssue("DANGLING_REFERENCE", "error", jsonPath, referringRowId, `Authority does not exist.`);
      } else if (aEntry.current?.revision !== ref.revision && !aEntry.history.has(ref.revision)) {
        addIssue("REFERENCE_REVISION", "error", jsonPath, referringRowId, `Authority revision does not exist.`);
      }
    } else {
      const rEntry = recMap.get(ref.id);
      if (!rEntry || (rEntry.current?.revision !== ref.revision && !rEntry.history.has(ref.revision))) {
        const rowPath = jsonPath.match(/^\/(?:records|record_history)\/\d+/)?.[0] || jsonPath;
        const rowKey = `${referringRowId || ""}::${rowPath}`;
        if (!missingPairsReported.has(rowKey)) missingPairsReported.set(rowKey, new Map());
        const seenInRow = missingPairsReported.get(rowKey);
        const pairKey = `${ref.id}@${ref.revision}`;
        const candidate = {
          code: rEntry ? "REFERENCE_REVISION" : "DANGLING_REFERENCE",
          path: jsonPath,
          rowId: referringRowId,
          message: rEntry ? "Referenced revision does not exist." : "Referenced record pair does not exist.",
        };
        const existing = seenInRow.get(pairKey);
        if (!existing || candidate.path < existing.path) seenInRow.set(pairKey, candidate);
      }
    }
  }

  // Walk and check refs in all records with expected kind mappings
  function validateRecordReferences(rec, jsonPath) {
    if (!rec || typeof rec !== "object") return;
    const recId = rec.id;
    const data = rec.data || {};
    const isHist = jsonPath.startsWith("/record_history");

    if (rec.kind === "CLM") {
      if (Array.isArray(data.sources)) {
        for (let i = 0; i < data.sources.length; i++) {
          checkTypedRef(data.sources[i], `${jsonPath}/data/sources/${i}`, ["SRC"], recId, isHist);
        }
      }
      if (Array.isArray(data.counterevidence)) {
        for (let i = 0; i < data.counterevidence.length; i++) {
          checkTypedRef(data.counterevidence[i], `${jsonPath}/data/counterevidence/${i}`, ["SRC", "CLM"], recId, isHist);
        }
      }
    } else if (rec.kind === "OPP") {
      if (Array.isArray(data.claims)) {
        for (let i = 0; i < data.claims.length; i++) {
          checkTypedRef(data.claims[i], `${jsonPath}/data/claims/${i}`, ["CLM"], recId, isHist);
        }
      }
    } else if (rec.kind === "HYP") {
      if (data.opportunity) checkTypedRef(data.opportunity, `${jsonPath}/data/opportunity`, ["OPP"], recId, isHist);
      if (Array.isArray(data.claims)) {
        for (let i = 0; i < data.claims.length; i++) {
          checkTypedRef(data.claims[i], `${jsonPath}/data/claims/${i}`, ["CLM"], recId, isHist);
        }
      }
      if (data.primary_metric) checkTypedRef(data.primary_metric, `${jsonPath}/data/primary_metric`, ["MET"], recId, isHist);
    } else if (rec.kind === "EXP") {
      if (data.hypothesis) checkTypedRef(data.hypothesis, `${jsonPath}/data/hypothesis`, ["HYP"], recId, isHist);
      if (data.primary_metric) checkTypedRef(data.primary_metric, `${jsonPath}/data/primary_metric`, ["MET"], recId, isHist);
      if (Array.isArray(data.guardrails)) {
        for (let i = 0; i < data.guardrails.length; i++) {
          checkTypedRef(data.guardrails[i], `${jsonPath}/data/guardrails/${i}`, ["MET"], recId, isHist);
        }
      }
      if (data.authorization) checkTypedRef(data.authorization, `${jsonPath}/data/authorization`, ["DEC"], recId, isHist);
      if (Array.isArray(data.result?.sources)) {
        for (let i = 0; i < data.result.sources.length; i++) {
          checkTypedRef(data.result.sources[i], `${jsonPath}/data/result/sources/${i}`, ["SRC"], recId, isHist);
        }
      }
    } else if (rec.kind === "INV") {
      if (Array.isArray(data.claims)) {
        for (let i = 0; i < data.claims.length; i++) {
          checkTypedRef(data.claims[i], `${jsonPath}/data/claims/${i}`, ["CLM"], recId, isHist);
        }
      }
    } else if (rec.kind === "DEC") {
      if (Array.isArray(data.consumes)) {
        for (let i = 0; i < data.consumes.length; i++) {
          checkTypedRef(data.consumes[i], `${jsonPath}/data/consumes/${i}`, ["CLM", "OPP", "HYP", "EXP", "INV", "MET", "REV"], recId, isHist);
        }
      }
      if (Array.isArray(data.critical_claims)) {
        for (let i = 0; i < data.critical_claims.length; i++) {
          checkTypedRef(data.critical_claims[i], `${jsonPath}/data/critical_claims/${i}`, ["CLM"], recId, isHist);
        }
      }
      if (data.authority_id && data.authority_revision) {
        checkTypedRef({ id: data.authority_id, revision: data.authority_revision }, `${jsonPath}/data/authority_id`, ["AUTH"], recId, isHist);
      }
      if (data.strategy_binding) {
        checkTypedRef({ id: data.strategy_binding.authority_id, revision: data.strategy_binding.revision }, `${jsonPath}/data/strategy_binding`, ["AUTH"], recId, isHist);
      }
      if (data.supersedes) {
        checkTypedRef(data.supersedes, `${jsonPath}/data/supersedes`, ["DEC"], recId, isHist);
      }
    } else if (rec.kind === "MET") {
      if (data.query) checkTypedRef(data.query, `${jsonPath}/data/query`, ["SRC"], recId, isHist);
      if (data.query) {
        const queryEntry = recMap.get(data.query.id);
        const querySource = queryEntry?.current?.revision === data.query.revision
          ? queryEntry.current
          : queryEntry?.history.get(data.query.revision);
        if (querySource && data.query_revision !== querySource.data?.origin?.revision) {
          addIssue("INVALID_FIELD", "error", `${jsonPath}/data/query_revision`, recId, "query_revision must equal the exact query source origin revision.");
        }
      }
      if (data.baseline?.source) checkTypedRef(data.baseline.source, `${jsonPath}/data/baseline/source`, ["SRC"], recId, isHist);
      if (data.baseline_exception) checkTypedRef(data.baseline_exception, `${jsonPath}/data/baseline_exception`, ["DEC"], recId, isHist);
    } else if (rec.kind === "REV") {
      if (data.decision) checkTypedRef(data.decision, `${jsonPath}/data/decision`, ["DEC"], recId, isHist);
      if (data.decision) {
        const decisionEntry = recMap.get(data.decision.id);
        const decision = decisionEntry?.current?.revision === data.decision.revision
          ? decisionEntry.current
          : decisionEntry?.history.get(data.decision.revision);
        if (decision && decision.data?.purpose !== "investment") {
          addIssue("REFERENCE_KIND", "error", `${jsonPath}/data/decision`, recId, "REV decision reference must target an investment DEC.");
        }
      }
      if (Array.isArray(data.hypotheses)) {
        for (let i = 0; i < data.hypotheses.length; i++) {
          checkTypedRef(data.hypotheses[i], `${jsonPath}/data/hypotheses/${i}`, ["HYP"], recId, isHist);
        }
      }
      if (Array.isArray(data.metrics)) {
        for (let i = 0; i < data.metrics.length; i++) {
          checkTypedRef(data.metrics[i], `${jsonPath}/data/metrics/${i}`, ["MET"], recId, isHist);
        }
      }
      if (Array.isArray(data.observations)) {
        for (let i = 0; i < data.observations.length; i++) {
          checkTypedRef(data.observations[i], `${jsonPath}/data/observations/${i}`, ["SRC"], recId, isHist);
        }
      }
      if (Array.isArray(data.actual_costs)) {
        for (let i = 0; i < data.actual_costs.length; i++) {
          checkTypedRef(data.actual_costs[i], `${jsonPath}/data/actual_costs/${i}`, ["SRC"], recId, isHist);
        }
      }
    }

    if (Array.isArray(rec.depends_on)) {
      for (let i = 0; i < rec.depends_on.length; i++) {
        checkTypedRef(rec.depends_on[i], `${jsonPath}/depends_on/${i}`, null, recId, isHist);
      }
    }
  }

  for (let i = 0; i < records.length; i++) {
    validateRecordReferences(records[i], `/records/${i}`);
  }
  for (let i = 0; i < recordHistory.length; i++) {
    validateRecordReferences(recordHistory[i], `/record_history/${i}`);
  }
  for (const row of missingPairsReported.values()) {
    for (const missing of row.values()) {
      addIssue(missing.code, "error", missing.path, missing.rowId, missing.message);
    }
  }

  // Validate State references
  if (state.decision) {
    checkTypedRef(state.decision, "/product_state/decision", ["DEC"], null, false);
  }
  if (Array.isArray(state.hypotheses)) {
    for (let i = 0; i < state.hypotheses.length; i++) {
      checkTypedRef(state.hypotheses[i], `/product_state/hypotheses/${i}`, ["HYP"], null, false);
    }
  }
  if (Array.isArray(state.history)) {
    for (let i = 0; i < state.history.length; i++) {
      if (state.history[i]?.decision) {
        checkTypedRef(state.history[i].decision, `/product_state/history/${i}/decision`, ["DEC"], null, false);
      }
    }
  }

  // DAG & Cycle Detection
  const dagAdj = new Map();
  for (const [list, isHistorical] of [[records, false], [recordHistory, true]]) {
    for (let index = 0; index < list.length; index++) {
      const rec = list[index];
      if (!rec || !rec.id || !rec.revision) continue;
      const source = `${rec.id}@${rec.revision}`;
      if (!dagAdj.has(source)) dagAdj.set(source, []);
      if (Array.isArray(rec.depends_on)) {
        for (let depIndex = 0; depIndex < rec.depends_on.length; depIndex++) {
          const dep = rec.depends_on[depIndex];
          if (!dep || !dep.id || !dep.revision) continue;
          const pointerPath = `/${isHistorical ? "record_history" : "records"}/${index}/depends_on/${depIndex}`;
          if (dep.id === rec.id) addIssue("DEPENDENCY_CYCLE", "error", pointerPath, rec.id, "Record cannot depend on itself.");
          dagAdj.get(source).push({ target: `${dep.id}@${dep.revision}`, pointerPath, recordId: rec.id });
        }
      }
    }
  }

  function detectCycles(adjacency, message) {
    const colors = new Map();
    for (const start of adjacency.keys()) {
      if (colors.has(start)) continue;
      colors.set(start, 1);
      const stack = [{ node: start, edges: adjacency.get(start) || [], index: 0 }];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (frame.index >= frame.edges.length) {
          colors.set(frame.node, 2);
          stack.pop();
          continue;
        }
        const edge = frame.edges[frame.index++];
        const color = colors.get(edge.target);
        if (color === 1) {
          addIssue("DEPENDENCY_CYCLE", "error", edge.pointerPath, edge.recordId || edge.target.split("@")[0], message);
        } else if (!color) {
          colors.set(edge.target, 1);
          stack.push({ node: edge.target, edges: adjacency.get(edge.target) || [], index: 0 });
        }
      }
    }
  }
  detectCycles(dagAdj, "Dependency cycle detected.");

  const supersedesAdj = new Map();
  for (const [list, isHistorical] of [[records, false], [recordHistory, true]]) {
    for (let index = 0; index < list.length; index++) {
      const rec = list[index];
      if (rec?.kind !== "DEC" || !rec.data?.supersedes || !rec.id || !rec.revision) continue;
      const source = `${rec.id}@${rec.revision}`;
      if (!supersedesAdj.has(source)) supersedesAdj.set(source, []);
      supersedesAdj.get(source).push({
        target: `${rec.data.supersedes.id}@${rec.data.supersedes.revision}`,
        pointerPath: `/${isHistorical ? "record_history" : "records"}/${index}/data/supersedes`,
        recordId: rec.id,
      });
    }
  }
  detectCycles(supersedesAdj, "Supersession cycle detected.");


  // State Machine Validation
  const validStateValues = new Set(["unvalidated", "validating", "validated_for_scope", "invalidated", "inconclusive", "not_applicable"]);
  if (!validStateValues.has(state.value)) {
    addIssue("INVALID_FIELD", "error", "/product_state/value", null, "Invalid product state value.");
  }
  validateScopeObject(state.scope, "/product_state/scope", null);

  const allowedTransitions = {
    unvalidated: new Set(["validating", "not_applicable"]),
    validating: new Set(["validated_for_scope", "invalidated", "inconclusive"]),
    validated_for_scope: new Set(["validating", "invalidated", "inconclusive"]),
    invalidated: new Set(["validating", "not_applicable"]),
    inconclusive: new Set(["validating", "not_applicable"]),
    not_applicable: new Set(["unvalidated"]),
  };

  if (stateHistory.length === 0) {
    if (state.value !== "unvalidated" && state.value !== "not_applicable") {
      addIssue("INVALID_TRANSITION", "error", "/product_state/history", null, "Initial state without history must be unvalidated or not_applicable.");
    }
  } else {
    let prevInstant = null;
    let prevTo = null;
    for (let i = 0; i < stateHistory.length; i++) {
      const entry = stateHistory[i];
      if (!isValidGregorianDate(entry.at)) {
        addIssue("INVALID_FIELD", "error", `/product_state/history/${i}/at`, null, "Invalid UTC instant in state history.");
      } else {
        if (compareInstants(entry.at, asOf) > 0) {
          addIssue("INVALID_FIELD", "error", `/product_state/history/${i}/at`, null, "State history instant cannot be in future.");
        }
        if (prevInstant && compareInstants(prevInstant, entry.at) >= 0) {
          addIssue("INVALID_TRANSITION", "error", `/product_state/history/${i}/at`, null, "State history timestamps must be strictly increasing.");
        }
        prevInstant = entry.at;
      }

      if (prevTo !== null && entry.from !== prevTo) {
        addIssue("INVALID_TRANSITION", "error", `/product_state/history/${i}/from`, null, "State history continuity gap.");
      }
      prevTo = entry.to;

      const allowedNext = allowedTransitions[entry.from];
      if (!allowedNext || !allowedNext.has(entry.to)) {
        addIssue("INVALID_TRANSITION", "error", `/product_state/history/${i}`, null, "Forbidden state transition.");
      }
    }
    if (prevTo !== state.value) {
      addIssue("INVALID_TRANSITION", "error", "/product_state/value", null, "Current state value does not match final history transition.");
    }
  }

  // Lineage Successors Tracking (F04: branching succession creates ambiguity on that lineage)
  const recordedSuccessors = new Map(); // oldDecId -> array of new DEC
  for (const rec of records) {
    if (rec.kind === "DEC" && rec.data?.status === "recorded" && rec.data?.supersedes) {
      const targetId = rec.data.supersedes.id;
      if (!recordedSuccessors.has(targetId)) recordedSuccessors.set(targetId, []);
      recordedSuccessors.get(targetId).push(rec);
    }
  }

  function isRetired(dec) {
    if (!dec || dec.kind !== "DEC") return false;
    if (dec.data?.status === "superseded" || dec.data?.status === "revoked") return true;
    if (recordedSuccessors.has(dec.id)) return true;
    return false;
  }
  function hasAmbiguousSelectedLineage(decision) {
    let cursor = decision;
    const seen = new Set();
    while (cursor?.kind === "DEC" && cursor.data?.supersedes) {
      if ((recordedSuccessors.get(cursor.data.supersedes.id) || []).length > 1) return true;
      const key = `${cursor.id}@${cursor.revision}`;
      if (seen.has(key)) return false;
      seen.add(key);
      cursor = resolveDecisionPair(cursor.data.supersedes);
    }
    return false;
  }

  function resolveDecisionPair(ref) {
    if (!ref) return null;
    const entry = recMap.get(ref.id);
    if (!entry) return null;
    if (entry.current?.revision === ref.revision) return entry.current;
    return entry.history.get(ref.revision) || null;
  }

  function validateStateDecision(ref, expectedPurposes, path, historical) {
    const decision = resolveDecisionPair(ref);
    const currentDecision = recMap.get(ref.id)?.current;
    if (!decision || decision.kind !== "DEC" || decision.data?.status !== "recorded" ||
        !expectedPurposes.includes(decision.data?.purpose) ||
        (expectedPurposes.length === 2 && expectedPurposes.includes("learning") &&
         expectedPurposes.includes("experiment") && decision.data?.outcome !== "authorize") ||
        (!historical && (currentDecision?.revision !== ref.revision || isRetired(decision))) ||
        !scopesEqual(decision.scope, state.scope)) {
      if (!historical) stateProofUnmet = true;
      addIssue(
        historical ? "INVALID_TRANSITION" : "AUTHORIZATION_REQUIRED",
        historical ? "error" : "warning",
        path,
        ref?.id || null,
        "Product state decision does not match a recorded scoped decision of the required purpose."
      );
      return null;
    }
    return decision;
  }

  for (let index = 0; index < stateHistory.length; index++) {
    const entry = stateHistory[index];
    let purposes = null;
    if (entry.to === "validating") purposes = ["learning", "experiment"];
    else if (entry.to === "validated_for_scope") purposes = ["investment"];
    else if (["invalidated", "inconclusive"].includes(entry.to)) purposes = ["learning", "experiment", "investment", "specification", "uat", "release", "retirement", "value_review"];
    else if (entry.to === "not_applicable" && entry.from !== null) purposes = ["investment", "specification", "uat", "release", "value_review"];
    if (purposes) {
      if (!entry.decision) {
        addIssue("INVALID_TRANSITION", "error", `/product_state/history/${index}/decision`, null, "Governed state transition requires a recorded decision.");
      } else {
        const decision = validateStateDecision(entry.decision, purposes, `/product_state/history/${index}/decision`, true);
        if (decision && entry.to === "validated_for_scope" && decision.data?.outcome !== "authorize") {
          addIssue("INVALID_TRANSITION", "error", `/product_state/history/${index}/decision`, decision.id, "Validated transition requires investment authorize, not risk acceptance.");
        }
        if (decision && isValidGregorianDate(decision.data?.decided_at) &&
            compareInstants(decision.data.decided_at, entry.at) > 0) {
          addIssue("INVALID_TRANSITION", "error", `/product_state/history/${index}/decision`, decision.id, "State transition cannot precede its recorded decision.");
        }
      }
    }
  }
  if (stateHistory.length > 0) {
    const latestTransition = stateHistory[stateHistory.length - 1];
    const latestDecision = latestTransition.decision;
    if (!refPairEqual(latestDecision, state.decision) ||
        compareInstants(state.assessed_at, latestTransition.at) < 0) {
      addIssue("INVALID_TRANSITION", "error", "/product_state/decision", latestDecision?.id || null, "Current state decision and assessment must match its final transition.");
    }
  }
  if (issues.some((issue) => issue.severity === "error")) return finalizeEnvelope(true);

  if (state.value === "validating") {
    if (state.hypotheses.length === 0) {
      addIssue("EVIDENCE_UNAVAILABLE", "warning", "/product_state/hypotheses", null, "Validating state requires at least one hypothesis.");
    }
    if (!state.decision) {
      addIssue("AUTHORIZATION_REQUIRED", "warning", "/product_state/decision", null, "Validating state requires a recorded learning or experiment decision.");
    } else {
      const decision = validateStateDecision(state.decision, ["learning", "experiment"], "/product_state/decision", false);
      if (decision && compareInstants(decision.data.decided_at, state.assessed_at) > 0) {
        addIssue("AUTHORIZATION_REQUIRED", "warning", "/product_state/assessed_at", decision.id, "State assessment cannot precede its decision.");
      }
    }
  } else if (state.value === "validated_for_scope") {
    if (state.hypotheses.length === 0) {
      addIssue("EVIDENCE_UNAVAILABLE", "warning", "/product_state/hypotheses", null, "Validated state requires at least one hypothesis.");
    }
    if (!state.decision) {
      addIssue("AUTHORIZATION_REQUIRED", "warning", "/product_state/decision", null, "Validated state requires a recorded investment authorize decision.");
    } else {
      const decision = validateStateDecision(state.decision, ["investment"], "/product_state/decision", false);
      if (decision && decision.data?.outcome !== "authorize") {
        addIssue("AUTHORIZATION_REQUIRED", "warning", "/product_state/decision", decision.id, "Risk acceptance cannot validate product state.");
      }
      if (decision && compareInstants(decision.data.decided_at, state.assessed_at) > 0) {
        addIssue("AUTHORIZATION_REQUIRED", "warning", "/product_state/assessed_at", decision.id, "State assessment cannot precede its decision.");
      }
    }
  } else if (["invalidated", "inconclusive"].includes(state.value) && !state.decision) {
    addIssue("AUTHORIZATION_REQUIRED", "warning", "/product_state/decision", null, "Invalidated or inconclusive state requires a recorded decision.");
  }

  if (["validating", "validated_for_scope"].includes(state.value)) {
    selectedStateDecisionForProof = state.decision ? resolveDecisionPair(state.decision) : null;
    for (let index = 0; index < state.hypotheses.length; index++) {
      const ref = state.hypotheses[index];
      const currentHypothesis = recMap.get(ref.id)?.current;
      const isCurrentPair = currentHypothesis?.kind === "HYP" && currentHypothesis.revision === ref.revision;
      const isSupportedPair = state.value !== "validated_for_scope" || currentHypothesis?.data?.status === "supported";
      if (!isCurrentPair || !isSupportedPair) {
        stateProofUnmet = true;
        pendingStateHypothesisWarnings.push({ index, ref, isCurrentPair, isSupportedPair });
      }
    }
  }
  if (["validating", "validated_for_scope"].includes(state.value) &&
      issues.some((issue) => issue.severity === "warning" && issue.path.startsWith("/product_state/"))) {
    stateProofUnmet = true;
  }
  // Emit State-currentness warnings only after the actual owning DEC proof is known.

  // Plan waivers are limited to frozen content and exact reference pairs.
  function refPairEqual(left, right) {
    return left === null || left === undefined
      ? right === null || right === undefined
      : Boolean(right && left.id === right.id && left.revision === right.revision);
  }

  function refPairSetEqual(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    const pairs = new Set(left.map((ref) => `${ref.id}@${ref.revision}`));
    return pairs.size === left.length && right.every((ref) => pairs.has(`${ref.id}@${ref.revision}`));
  }

  function stringSetEqual(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    const values = new Set(left);
    return values.size === left.length && right.every((value) => values.has(value));
  }

  function planRefProjectionEqual(oldRef, currentRef, compared = new Set()) {
    if (oldRef === null || oldRef === undefined) return currentRef === null || currentRef === undefined;
    if (!currentRef || oldRef.id !== currentRef.id) return false;
    if (oldRef.revision === currentRef.revision) return true;
    const entry = recMap.get(oldRef.id);
    const oldTarget = entry?.current?.revision === oldRef.revision ? entry.current : entry?.history.get(oldRef.revision);
    const currentTarget = entry?.current?.revision === currentRef.revision ? entry.current : null;
    return Boolean(oldTarget && currentTarget && ["EXP", "HYP", "MET"].includes(oldTarget.kind) &&
      arePlanProjectionsEqual(oldTarget, currentTarget, compared));
  }

  function planRefSetsEqual(oldRefs, currentRefs, compared = new Set()) {
    if (!Array.isArray(oldRefs) || !Array.isArray(currentRefs) || oldRefs.length !== currentRefs.length) return false;
    const currentById = new Map(currentRefs.map((ref) => [ref.id, ref]));
    return currentById.size === currentRefs.length &&
      oldRefs.every((oldRef) => planRefProjectionEqual(oldRef, currentById.get(oldRef.id), compared));
  }
  function planDependencySetsEqual(oldRefs, currentRefs, compared = new Set()) {
    return planRefSetsEqual(oldRefs, currentRefs, compared);
  }

  function arePlanProjectionsEqual(oldRec, curRec, compared = new Set()) {
    if (!oldRec || !curRec || oldRec.kind !== curRec.kind || !scopesEqual(oldRec.scope, curRec.scope)) return false;
    const pairKey = `${oldRec.id}@${oldRec.revision}=>${curRec.id}@${curRec.revision}`;
    if (compared.has(pairKey)) return true;
    compared.add(pairKey);
    if (!planDependencySetsEqual(oldRec.depends_on, curRec.depends_on, compared)) return false;

    const oldData = oldRec.data;
    const currentData = curRec.data;
    if (!oldData || !currentData) return false;
    if (oldRec.kind === "EXP") {
      return planRefProjectionEqual(oldData.hypothesis, currentData.hypothesis, compared) &&
        oldData.method === currentData.method && oldData.eligibility === currentData.eligibility &&
        oldData.sample_plan === currentData.sample_plan &&
        planRefProjectionEqual(oldData.primary_metric, currentData.primary_metric, compared) &&
        planRefSetsEqual(oldData.guardrails, currentData.guardrails, compared) &&
        oldData.rules?.success === currentData.rules?.success &&
        oldData.rules?.failure === currentData.rules?.failure &&
        oldData.rules?.inconclusive === currentData.rules?.inconclusive &&
        oldData.bounds?.starts_at === currentData.bounds?.starts_at &&
        oldData.bounds?.ends_at === currentData.bounds?.ends_at &&
        oldData.bounds?.budget_cap === currentData.bounds?.budget_cap &&
        oldData.bounds?.currency === currentData.bounds?.currency &&
        oldData.bounds?.exposure_cap === currentData.bounds?.exposure_cap &&
        stringSetEqual(oldData.bounds?.stop_rules, currentData.bounds?.stop_rules);
    }
    if (oldRec.kind === "HYP") {
      return refPairEqual(oldData.opportunity, currentData.opportunity) &&
        refPairSetEqual(oldData.claims, currentData.claims) &&
        oldData.prediction === currentData.prediction && oldData.mechanism === currentData.mechanism &&
        planRefProjectionEqual(oldData.primary_metric, currentData.primary_metric, compared) &&
        oldData.disconfirmation === currentData.disconfirmation;
    }
    if (oldRec.kind === "MET") {
      return oldData.definition === currentData.definition && oldData.unit === currentData.unit &&
        oldData.denominator === currentData.denominator &&
        refPairEqual(oldData.query, currentData.query) && oldData.query_revision === currentData.query_revision &&
        oldData.baseline?.value === currentData.baseline?.value &&
        refPairEqual(oldData.baseline?.source, currentData.baseline?.source) &&
        oldData.baseline?.window?.start === currentData.baseline?.window?.start &&
        oldData.baseline?.window?.end === currentData.baseline?.window?.end &&
        refPairEqual(oldData.baseline_exception, currentData.baseline_exception) &&
        oldData.comparison_window?.start === currentData.comparison_window?.start &&
        oldData.comparison_window?.end === currentData.comparison_window?.end &&
        oldData.eligibility === currentData.eligibility && oldData.target === currentData.target &&
        oldData.guardrail === currentData.guardrail &&
        oldData.measurement_owner === currentData.measurement_owner &&
        oldData.review_trigger === currentData.review_trigger;
    }
    return false;
  }
  function isExactCurrentMetricBinding(ref, metric) {
    return Boolean(ref && metric && metric.kind === "MET" && ref.id === metric.id &&
      ref.revision === metric.revision && recMap.get(ref.id)?.current?.revision === metric.revision);
  }

  let provenanceLimitExceeded = false;
  const dependencyDepth = new Map();
  const dependencyActive = new Set();
  for (const root of [...records, ...recordHistory]) {
    const rootKey = `${root.id}@${root.revision}`;
    if (dependencyDepth.has(rootKey)) continue;
    const stack = [{ record: root, exit: false }];
    while (stack.length > 0) {
      const frame = stack.pop();
      const key = `${frame.record.id}@${frame.record.revision}`;
      if (dependencyDepth.has(key)) continue;
      if (frame.exit) {
        dependencyActive.delete(key);
        let depth = 0;
        for (const ref of (Array.isArray(frame.record.depends_on) ? frame.record.depends_on : [])) {
          const entry = recMap.get(ref.id);
          const dependency = entry?.current?.revision === ref.revision
            ? entry.current
            : entry?.history.get(ref.revision);
          if (dependency) depth = Math.max(depth, 1 + (dependencyDepth.get(`${dependency.id}@${dependency.revision}`) || 0));
        }
        dependencyDepth.set(key, depth);
        if (depth > LIMITS.MAX_DEPTH) provenanceLimitExceeded = true;
        continue;
      }
      if (dependencyActive.has(key)) continue;
      dependencyActive.add(key);
      stack.push({ record: frame.record, exit: true });
      for (const ref of (Array.isArray(frame.record.depends_on) ? frame.record.depends_on : [])) {
        const entry = recMap.get(ref.id);
        const dependency = entry?.current?.revision === ref.revision
          ? entry.current
          : entry?.history.get(ref.revision);
        const dependencyKey = dependency && `${dependency.id}@${dependency.revision}`;
        if (dependency && !dependencyDepth.has(dependencyKey) && !dependencyActive.has(dependencyKey)) {
          stack.push({ record: dependency, exit: false });
        }
      }
    }
  }
  // Influence Traversal (F03, F04, F05, F06, F09, F11)
  function evaluateDecisionInfluence(decRoot) {
    const exceptionDecision = decRoot.data?.purpose === "release" && decRoot.data?.outcome === "risk_accept";
    const visited = new Set(); // pairKey + "::" + role
    const failureCodes = new Set();
    const visitedHelpers = new Set();
    const failureOwnerCodes = new Map();
    const failurePairCodes = new Map();
    let failureOwnerId = decRoot.id;

    function setFailure(code, failedRef = null) {
      failureCodes.add(code);
      if (failedRef?.id && failedRef?.revision) {
        const pairKey = `${failedRef.id}@${failedRef.revision}`;
        const codes = failurePairCodes.get(pairKey) || new Set();
        codes.add(code);
        failurePairCodes.set(pairKey, codes);
      }
      if (failureOwnerId !== decRoot.id) {
        const codes = failureOwnerCodes.get(failureOwnerId) || new Set();
        codes.add(code);
        failureOwnerCodes.set(failureOwnerId, codes);
      }
    }

    // 1. Evaluate decRoot's own freshness and bindings (F03)
    if (decRoot.freshness) {
      if (decRoot.freshness.expires_at && compareInstants(asOf, decRoot.freshness.expires_at) >= 0) {
        setFailure("STALE_EVIDENCE");
      } else if (decRoot.freshness.status === "stale" || decRoot.freshness.status === "unknown") {
        setFailure("STALE_EVIDENCE");
      } else if (decRoot.freshness.status === "disputed") {
        setFailure("DISPUTED_EVIDENCE");
      }
    }

    // Strategy binding
    if (decRoot.data?.strategy_binding) {
      const sb = decRoot.data.strategy_binding;
      const stratAuth = ledger.strategy_authority;
      if (!stratAuth) {
        setFailure("AUTHORITY_UNAVAILABLE");
      } else {
        const curStratAuth = authMap.get(stratAuth)?.current;
        if (!curStratAuth) {
          setFailure("AUTHORITY_UNAVAILABLE");
        } else if (curStratAuth.id !== sb.authority_id || curStratAuth.revision !== sb.revision) {
          setFailure("AUTHORITY_REVISION");
        } else if (curStratAuth.domain !== "strategy" || curStratAuth.access !== "available" || !scopesEqual(curStratAuth.scope, decRoot.scope)) {
          setFailure("AUTHORITY_UNAVAILABLE");
        }
      }
    } else if (["investment", "specification", "value_review"].includes(decRoot.data?.purpose)) {
      setFailure("AUTHORITY_UNAVAILABLE");
    }

    // Null authority pairs are structurally valid, but cannot prove a recorded action.
    if (!decRoot.data?.authority_id || !decRoot.data?.authority_revision) {
      setFailure("AUTHORITY_UNAVAILABLE");
    } else {
      const aId = decRoot.data.authority_id;
      const aRev = decRoot.data.authority_revision;
      const aEntry = authMap.get(aId);
      if (!aEntry?.current) {
        setFailure("AUTHORITY_UNAVAILABLE");
      } else if (aEntry.current.revision !== aRev) {
        setFailure("AUTHORITY_REVISION");
      } else if (aEntry.current.domain !== "authorization" || aEntry.current.access !== "available" || !scopesEqual(aEntry.current.scope, decRoot.scope)) {
        setFailure("AUTHORITY_UNAVAILABLE");
      }
    }

    if (exceptionDecision) {
      if (!(decRoot.data?.consumes || []).some((ref) => {
        const metric = recMap.get(ref.id)?.current;
        return metric?.kind === "MET" && metric.revision === ref.revision;
      })) {
        setFailure("OBSOLETE_BINDING");
      }
      if (!isNonEmptyString(decRoot.data?.rationale) ||
          !Array.isArray(decRoot.data?.uncertainties) || decRoot.data.uncertainties.length === 0) {
        setFailure("AUTHORIZATION_REQUIRED");
      }
    }

    // Check artifact bindings on DEC (F09: bounded read, hash check)
    for (let artifactIndex = 0; artifactIndex < (Array.isArray(decRoot.data?.artifact_bindings) ? decRoot.data.artifact_bindings.length : 0); artifactIndex++) {
      const binding = decRoot.data.artifact_bindings[artifactIndex];
      const artifactPath = `/records/${recordIndexMap.get(decRoot.id) ?? 0}/data/artifact_bindings/${artifactIndex}/path`;
      const pathSec = validateLocalPathSecurity(binding.path, canonicalRoot);
      if (!pathSec.ok) {
        setFailure(pathSec.code);
        addIssue(pathSec.code, "error", artifactPath, decRoot.id, "Artifact path is not a safe contained relative path.");
        continue;
      }
      const fileRes = readAssessmentFile(pathSec.targetPath);
      if (!fileRes.ok) {
        if (fileRes.code === "ENOENT") {
          setFailure("EVIDENCE_UNAVAILABLE");
        } else {
          setFailure(fileRes.code);
          addIssue(fileRes.code, "error", artifactPath, decRoot.id, fileRes.message);
        }
      } else if (fileRes.hash !== binding.sha256) {
        setFailure("HASH_MISMATCH");
      }
    }

    // Build an iterative, role-specific walk bounded by provenance depth.
    const worklist = [];
    let worklistIndex = 0;
    let currentDepth = -1;
    function enqueue(ref, role, sourceContext) {
      if (!ref || !ref.id || !ref.revision) return;
      const key = `${ref.id}@${ref.revision}::${role}`;
      if (visited.has(key)) return;
      const depth = currentDepth + 1;
      if (depth > LIMITS.MAX_DEPTH) {
        provenanceLimitExceeded = true;
        setFailure("LIMIT_EXCEEDED");
        return;
      }
      visited.add(key);
      worklist.push({ ref, role, sourceContext, depth });
    }

    const rootRole = exceptionDecision ? "exception" :
      (decRoot.data?.purpose === "learning" || decRoot.data?.purpose === "experiment") ? "plan" : "evidence";

    const riskAcceptance = decRoot.data?.outcome === "risk_accept" && !exceptionDecision;
    if (exceptionDecision) {
      const enqueueExceptionSupport = (ref) => {
        const metric = recMap.get(ref.id)?.current;
        const exactMetric = metric?.kind === "MET" && metric.revision === ref.revision;
        enqueue(ref, exactMetric ? "exception" : "evidence", exactMetric ? metric : decRoot);
      };
      for (const ref of (Array.isArray(decRoot.data?.consumes) ? decRoot.data.consumes : [])) enqueueExceptionSupport(ref);
      for (const ref of (Array.isArray(decRoot.data?.critical_claims) ? decRoot.data.critical_claims : [])) enqueue(ref, "evidence", decRoot);
      for (const ref of (Array.isArray(decRoot.depends_on) ? decRoot.depends_on : [])) enqueueExceptionSupport(ref);
    } else if (!riskAcceptance) {
      for (const c of (Array.isArray(decRoot.data?.consumes) ? decRoot.data.consumes : [])) enqueue(c, rootRole, decRoot);
      for (const c of (Array.isArray(decRoot.data?.critical_claims) ? decRoot.data.critical_claims : [])) enqueue(c, "evidence", decRoot);
      for (const dep of (Array.isArray(decRoot.depends_on) ? decRoot.depends_on : [])) enqueue(dep, rootRole, decRoot);
    }

    while (worklistIndex < worklist.length) {
      const item = worklist[worklistIndex++];
      currentDepth = item.depth;
      const { ref, role, sourceContext } = item;

      if (ref.id.startsWith("AUTH-")) {
        const aEntry = authMap.get(ref.id);
        if (!aEntry?.current) {
          setFailure("AUTHORITY_UNAVAILABLE");
        } else if (aEntry.current.revision !== ref.revision) {
          setFailure("AUTHORITY_REVISION");
        }
        continue;
      }

      const rEntry = recMap.get(ref.id);
      if (!rEntry) {
        setFailure("EVIDENCE_UNAVAILABLE");
        continue;
      }

      const isCur = rEntry.current?.revision === ref.revision;
      const snapshot = isCur ? rEntry.current : rEntry.history.get(ref.revision);
      if (!snapshot) {
        setFailure("EVIDENCE_UNAVAILABLE");
        continue;
      }
      failureOwnerId = snapshot.kind === "DEC" && isCur ? snapshot.id : decRoot.id;

      let activeSnapshotForFreshness = snapshot;

      // Check currentness (F05)
      if (!isCur) {
        if (role === "plan" && ["EXP", "HYP", "MET"].includes(snapshot.kind)) {
          if (rEntry.current && arePlanProjectionsEqual(snapshot, rEntry.current)) {
            activeSnapshotForFreshness = rEntry.current;
            // Plan projection matches current; check CURRENT freshness!
          } else {
            setFailure("OBSOLETE_BINDING");
            continue;
          }
        } else {
          setFailure("OBSOLETE_BINDING", ref);
          continue;
        }
      }

      // Check freshness of active snapshot
      const freshness = activeSnapshotForFreshness.freshness;
      if (freshness) {
        if (freshness.expires_at && compareInstants(asOf, freshness.expires_at) >= 0) {
          setFailure("STALE_EVIDENCE");
        } else if (freshness.status === "stale" || freshness.status === "unknown") {
          setFailure("STALE_EVIDENCE");
        } else if (freshness.status === "disputed") {
          setFailure("DISPUTED_EVIDENCE");
        }
      }

      // Scope equality (except SRC)
      if (snapshot.kind !== "SRC" && !scopesEqual(snapshot.scope, decRoot.scope)) {
        setFailure("SCOPE_MISMATCH");
      }

      const data = snapshot.data || {};

      // Kind-specific predicates & traversal
      if (snapshot.kind === "SRC") {
        if (data.status === "unavailable" || data.status === "withdrawn" || data.privacy?.access === "unavailable" || data.privacy?.access === "protected") {
          setFailure("EVIDENCE_UNAVAILABLE");
        }
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      } else if (snapshot.kind === "CLM") {
        if (role === "evidence") {
          if (data.status !== "supported") setFailure("EVIDENCE_UNAVAILABLE");
          if (data.classification === "unknown" || data.classification === "assumption") setFailure("EVIDENCE_UNAVAILABLE");
        }
        for (const source of (Array.isArray(data.sources) ? data.sources : [])) enqueue(source, "evidence", snapshot);
        for (const counterevidence of (Array.isArray(data.counterevidence) ? data.counterevidence : [])) {
          enqueue(counterevidence, "evidence", snapshot);
          const counterRecord = recMap.get(counterevidence.id)?.current;
          if (counterRecord && (counterRecord.data?.status === "refuted" || counterRecord.data?.status === "disputed")) {
            setFailure("DISPUTED_EVIDENCE");
          }
        }
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      } else if (snapshot.kind === "OPP") {
        if (role === "evidence" && data.status !== "selected") setFailure("EVIDENCE_UNAVAILABLE");
        for (const c of (Array.isArray(data.claims) ? data.claims : [])) enqueue(c, "evidence", snapshot);
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      } else if (snapshot.kind === "HYP") {
        if (role === "evidence" && data.status !== "supported" &&
            !(decRoot.data?.purpose === "investment" && decRoot.data?.outcome === "risk_accept")) {
          setFailure("EVIDENCE_UNAVAILABLE", { id: snapshot.id, revision: snapshot.revision });
        }
        if (role === "evidence" && data.status === "supported" && sourceContext?.kind === "DEC") {
          const linkedExperiment = records.some((experiment) =>
            experiment.kind === "EXP" && experiment.data?.status === "completed" &&
            experiment.data?.result?.classification === "supported" &&
            experiment.data?.hypothesis?.id === snapshot.id &&
            experiment.data?.hypothesis?.revision === snapshot.revision &&
            (sourceContext.data?.consumes || []).some((ref) =>
              ref.id === experiment.id && ref.revision === experiment.revision
            ) && scopesEqual(experiment.scope, snapshot.scope)
          );
          if (!linkedExperiment) setFailure("EVIDENCE_UNAVAILABLE");
        }
        if (data.opportunity) enqueue(data.opportunity, "evidence", snapshot);
        for (const c of (Array.isArray(data.claims) ? data.claims : [])) enqueue(c, "evidence", snapshot);
        if (data.primary_metric) {
          // In plan role, metrics continue in plan role! (F05)
          enqueue(data.primary_metric, role === "plan" ? "plan" : "evidence", snapshot);
        }
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      } else if (snapshot.kind === "EXP") {
        if (role === "evidence" &&
            !(decRoot.data?.purpose === "investment" && decRoot.data?.outcome === "risk_accept")) {
          if (data.status !== "completed") setFailure("EVIDENCE_UNAVAILABLE");
          if (!data.result || data.result.classification !== "supported") setFailure("EVIDENCE_UNAVAILABLE");
        }
        if (data.hypothesis) enqueue(data.hypothesis, role, snapshot);
        if (data.primary_metric) enqueue(data.primary_metric, role === "plan" ? "plan" : "evidence", snapshot);
        for (const g of (Array.isArray(data.guardrails) ? data.guardrails : [])) enqueue(g, role === "plan" ? "plan" : "evidence", snapshot);

        // In plan role, omit EXP result and authorization backedge! (F05)
        if (role !== "plan") {
          if (Array.isArray(data.result?.sources)) {
            for (const s of data.result.sources) enqueue(s, "evidence", snapshot);
          }
          if (["authorized", "running", "completed", "stopped"].includes(data.status)) {
            if (data.authorization) enqueue(data.authorization, "plan", snapshot);
            else setFailure("AUTHORIZATION_REQUIRED");
          }
        }
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      } else if (snapshot.kind === "INV") {
        if (role === "evidence" && data.status !== "reviewed") setFailure("EVIDENCE_UNAVAILABLE");
        if (data.financial_input && data.financial_result) {
          for (const field of ["financial_input", "financial_result"]) {
            const art = data[field];
            const artifactPath = `/records/${recordIndexMap.get(snapshot.id) ?? 0}/data/${field}`;
            const pSec = validateLocalPathSecurity(art.path, canonicalRoot);
            if (!pSec.ok) {
              setFailure(pSec.code);
              addIssue(pSec.code, "error", artifactPath, snapshot.id, "Financial artifact path is not a safe contained relative path.");
            } else {
              const fRes = readAssessmentFile(pSec.targetPath);
              if (!fRes.ok) {
                if (fRes.code === "ENOENT") {
                  setFailure("EVIDENCE_UNAVAILABLE");
                } else {
                  setFailure(fRes.code);
                  addIssue(fRes.code, "error", artifactPath, snapshot.id, fRes.message);
                }
              } else if (fRes.hash !== art.sha256) {
                setFailure("HASH_MISMATCH");
              }
            }
          }
        }
        for (const c of (Array.isArray(data.claims) ? data.claims : [])) enqueue(c, "evidence", snapshot);
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      } else if (snapshot.kind === "MET") {
        if (role === "plan" || role === "exception") {
          if (!["planned", "instrumented", "observed"].includes(data.status)) setFailure("EVIDENCE_UNAVAILABLE");
        } else if (data.status !== "observed") {
          setFailure("EVIDENCE_UNAVAILABLE");
        }
        if (data.query) {
          enqueue(data.query, "evidence", snapshot);
          const querySource = recMap.get(data.query.id);
          const queryRecord = querySource?.current;
          if (!queryRecord || queryRecord.revision !== data.query.revision || queryRecord.kind !== "SRC" ||
              data.query_revision !== queryRecord.data?.origin?.revision) {
            setFailure("OBSOLETE_BINDING");
          }
        } else if (role !== "plan") {
          setFailure("EVIDENCE_UNAVAILABLE");
        }

        const hasBaseline = !!data.baseline?.source;
        const hasException = !!data.baseline_exception;
        if (hasBaseline && hasException) {
          setFailure("EVIDENCE_UNAVAILABLE");
        } else if (hasBaseline) {
          enqueue(data.baseline.source, "evidence", snapshot);
          if (compareInstants(data.baseline.window.end, data.comparison_window.start) > 0) {
            setFailure("EVIDENCE_UNAVAILABLE");
          }
        } else if (hasException) {
          enqueue(data.baseline_exception, "exception", activeSnapshotForFreshness);
        } else if (role !== "plan" && decRoot.data?.purpose === "release") {
          setFailure("EVIDENCE_UNAVAILABLE");
        }
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      } else if (snapshot.kind === "DEC") {
        if (snapshot.id !== decRoot.id) {
          visitedHelpers.add(snapshot.id);
          // Helper verification (F06)
          if (snapshot.data?.status !== "recorded" || isRetired(snapshot)) {
            setFailure("AUTHORIZATION_REQUIRED");
          }
          const authority = authMap.get(snapshot.data?.authority_id)?.current;
          if (!authority) {
            setFailure("AUTHORITY_UNAVAILABLE");
          } else if (authority.revision !== snapshot.data?.authority_revision) {
            setFailure("AUTHORITY_REVISION");
          } else if (authority.domain !== "authorization" || authority.access !== "available" ||
              !scopesEqual(authority.scope, snapshot.scope)) {
            setFailure("AUTHORITY_UNAVAILABLE");
          }
          if (["investment", "specification", "value_review"].includes(snapshot.data?.purpose)) {
            const strategyBinding = snapshot.data?.strategy_binding;
            const strategy = ledger.strategy_authority ? authMap.get(ledger.strategy_authority)?.current : null;
            if (!strategyBinding || !strategy) {
              setFailure("AUTHORITY_UNAVAILABLE");
            } else if (strategy.id !== strategyBinding.authority_id || strategy.revision !== strategyBinding.revision ||
                strategy.domain !== "strategy" || strategy.access !== "available" ||
                !scopesEqual(strategy.scope, snapshot.scope)) {
              setFailure("AUTHORITY_REVISION");
            }
          }
          if (isCur && !isRetired(snapshot)) {
            for (let index = 0; index < (Array.isArray(snapshot.data?.artifact_bindings) ? snapshot.data.artifact_bindings.length : 0); index++) {
              const binding = snapshot.data.artifact_bindings[index];
              const artifactPath = `/records/${recordIndexMap.get(snapshot.id) ?? 0}/data/artifact_bindings/${index}/path`;
              const pathResult = validateLocalPathSecurity(binding.path, canonicalRoot);
              if (!pathResult.ok) {
                setFailure(pathResult.code);
                addIssue(pathResult.code, "error", artifactPath, snapshot.id, "Artifact path is not a safe contained relative path.");
                continue;
              }
              const artifactResult = readAssessmentFile(pathResult.targetPath);
              if (!artifactResult.ok) {
                if (artifactResult.code === "ENOENT") {
                  setFailure("EVIDENCE_UNAVAILABLE");
                } else {
                  setFailure(artifactResult.code);
                  addIssue(artifactResult.code, "error", artifactPath, snapshot.id, artifactResult.message);
                }
              } else if (artifactResult.hash !== binding.sha256) {
                setFailure("HASH_MISMATCH");
              }
            }
          }
          for (const bridge of bridges) {
            if (bridge.record?.id !== snapshot.id || bridge.record?.revision !== snapshot.revision) continue;
            const bridgeAuthority = authMap.get(bridge.authority_id)?.current;
            if (!bridgeAuthority || bridgeAuthority.revision !== bridge.authority_revision) {
              setFailure("AUTHORITY_REVISION");
            } else if (bridgeAuthority.access !== "available" ||
                !scopesEqual(bridgeAuthority.scope, snapshot.scope)) {
              setFailure("AUTHORITY_UNAVAILABLE");
            }
          }
          if (role === "plan") {
            if (snapshot.data?.purpose !== "learning" && snapshot.data?.purpose !== "experiment") {
              setFailure("AUTHORIZATION_REQUIRED");
            }
            if (snapshot.data?.outcome !== "authorize") setFailure("AUTHORIZATION_REQUIRED");
            if (sourceContext?.kind === "EXP") {
              const authorizedExp = (snapshot.data?.consumes || []).some((ref) => {
                if (ref.id !== sourceContext.id) return false;
                if (ref.revision === sourceContext.revision) return true;
                const approvedPlan = recMap.get(ref.id)?.history.get(ref.revision);
                return approvedPlan?.kind === "EXP" && arePlanProjectionsEqual(approvedPlan, sourceContext);
              });
              if (!authorizedExp || !scopesEqual(snapshot.scope, sourceContext.scope)) {
                setFailure("AUTHORIZATION_REQUIRED");
              }
            }
          } else if (role === "exception") {
            if (snapshot.data?.purpose !== "release" || snapshot.data?.outcome !== "risk_accept") {
              setFailure("AUTHORIZATION_REQUIRED");
            }
            if (!scopesEqual(snapshot.scope, sourceContext?.scope)) {
              setFailure("SCOPE_MISMATCH");
            }
            if (!isNonEmptyString(snapshot.data?.rationale) ||
                !Array.isArray(snapshot.data?.uncertainties) || snapshot.data.uncertainties.length === 0) {
              setFailure("AUTHORIZATION_REQUIRED");
            }
            const consumedMet = (snapshot.data?.consumes || []).find((ref) =>
              isExactCurrentMetricBinding(ref, sourceContext)
            );
            if (!consumedMet) setFailure("OBSOLETE_BINDING");
          }
        }
        for (const ref of (Array.isArray(data.consumes) ? data.consumes : [])) {
          const exceptionMetric = role === "exception" && isExactCurrentMetricBinding(ref, sourceContext);
          enqueue(ref, role === "exception" && !exceptionMetric ? "evidence" : role, exceptionMetric ? sourceContext : snapshot);
        }
        for (const ref of (Array.isArray(data.critical_claims) ? data.critical_claims : [])) enqueue(ref, "evidence", snapshot);
        for (const ref of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) {
          const exceptionMetric = role === "exception" && isExactCurrentMetricBinding(ref, sourceContext);
          enqueue(ref, role === "exception" && !exceptionMetric ? "evidence" : role, exceptionMetric ? sourceContext : snapshot);
        }
      } else if (snapshot.kind === "REV") {
        const needsObservedOutcome = data.recommendation === "scale" ||
          data.attribution?.classification === "causal_supported";
        if (needsObservedOutcome &&
            (!Array.isArray(data.metrics) || !data.metrics.length ||
             !Array.isArray(data.observations) || !data.observations.length ||
             !Array.isArray(data.actual_costs) || !data.actual_costs.length)) {
          setFailure("EVIDENCE_UNAVAILABLE");
        }
        for (const h of (Array.isArray(data.hypotheses) ? data.hypotheses : [])) enqueue(h, "evidence", snapshot);
        for (const m of (Array.isArray(data.metrics) ? data.metrics : [])) enqueue(m, "evidence", snapshot);
        for (const o of (Array.isArray(data.observations) ? data.observations : [])) enqueue(o, "evidence", snapshot);
        for (const c of (Array.isArray(data.actual_costs) ? data.actual_costs : [])) enqueue(c, "evidence", snapshot);
        for (const dep of (Array.isArray(snapshot.depends_on) ? snapshot.depends_on : [])) enqueue(dep, role, snapshot);
      }
    }

    return { failed: failureCodes.size > 0, failureCodes, failurePairCodes, visitedHelpers, failureOwnerCodes };
  }

  // Candidate DEC Roots (recorded non-retired)
  const candidateDecRoots = records.filter(
    (r) => r.kind === "DEC" && r.data?.status === "recorded" && !isRetired(r)
  );

  const decEvaluationResults = new Map();
  for (const dec of candidateDecRoots) {
    const res = evaluateDecisionInfluence(dec);
    decEvaluationResults.set(dec.id, res);
    if (res.failed) {
      affectedDecisions.add(dec.id);
    }
  }
  // Check every retained node; imported disconnected supersession chains are bounded too.
  const supersessionDepth = new Map();
  for (const decision of [...records, ...recordHistory]) {
    if (decision?.kind !== "DEC") continue;
    const path = [];
    const pathKeys = new Set();
    let cursor = decision;
    while (cursor?.kind === "DEC") {
      const key = `${cursor.id}@${cursor.revision}`;
      if (supersessionDepth.has(key) || pathKeys.has(key)) break;
      path.push(cursor);
      pathKeys.add(key);
      cursor = cursor.data?.supersedes ? resolveDecisionPair(cursor.data.supersedes) : null;
    }
    let depth = cursor?.kind === "DEC"
      ? supersessionDepth.get(`${cursor.id}@${cursor.revision}`) || 0
      : 0;
    while (path.length > 0) {
      const node = path.pop();
      depth += node.data?.supersedes ? 1 : 0;
      supersessionDepth.set(`${node.id}@${node.revision}`, depth);
      if (depth > LIMITS.MAX_DEPTH) provenanceLimitExceeded = true;
    }
  }

  // A helper's role-specific failure also marks that active helper root affected.
  for (const result of decEvaluationResults.values()) {
    for (const [helperId, codes] of result.failureOwnerCodes) {
      const helperResult = decEvaluationResults.get(helperId);
      if (!helperResult) continue;
      for (const code of codes) helperResult.failureCodes.add(code);
      helperResult.failed = helperResult.failureCodes.size > 0;
      affectedDecisions.add(helperId);
    }
  }
  if (provenanceLimitExceeded) {
    addIssue("LIMIT_EXCEEDED", "error", "/records", null, `Provenance depth exceeds the maximum of ${LIMITS.MAX_DEPTH}.`);
  }

  // Propagate every known helper failure code through the bounded DEC graph.
  const helperConsumers = new Map();
  for (const [consumerId, result] of decEvaluationResults) {
    for (const helperId of result.visitedHelpers) {
      const consumers = helperConsumers.get(helperId) || [];
      consumers.push(consumerId);
      helperConsumers.set(helperId, consumers);
    }
  }
  const propagationQueue = candidateDecRoots
    .filter((dec) => decEvaluationResults.get(dec.id)?.failed)
    .map((dec) => dec.id);
  const queuedFailures = new Set(propagationQueue);
  for (let index = 0; index < propagationQueue.length; index++) {
    const helperId = propagationQueue[index];
    const helperResult = decEvaluationResults.get(helperId);
    queuedFailures.delete(helperId);
    for (const consumerId of helperConsumers.get(helperId) || []) {
      const consumerResult = decEvaluationResults.get(consumerId);
      let changed = false;
      for (const code of helperResult.failureCodes) {
        if (!consumerResult.failureCodes.has(code)) {
          consumerResult.failureCodes.add(code);
          changed = true;
        }
      }
      if (changed) {
        consumerResult.failed = true;
        affectedDecisions.add(consumerId);
        if (!queuedFailures.has(consumerId)) {
          queuedFailures.add(consumerId);
          propagationQueue.push(consumerId);
        }
      }
    }
  }
  for (const pending of pendingStateHypothesisWarnings) {
    const pairKey = `${pending.ref.id}@${pending.ref.revision}`;
    const owningCodes = selectedStateDecisionForProof
      ? decEvaluationResults.get(selectedStateDecisionForProof.id)?.failurePairCodes.get(pairKey)
      : null;
    const issueCode = pending.isCurrentPair ? "EVIDENCE_UNAVAILABLE" : "OBSOLETE_BINDING";
    if (!owningCodes?.has(issueCode)) {
      addIssue(
        "EVIDENCE_UNAVAILABLE", "warning", `/product_state/hypotheses/${pending.index}`,
        pending.ref.id, "Product state hypothesis is not a current supported pair.",
      );
    }
  }

  // Gate Selection (F03, F04)
  let selectedRootDec = null;
  const selectedHelpers = new Set();

  if (gate === "commit") {
    const rootStateDecRef = state.decision;
    if (!rootStateDecRef) {
      addIssue("AUTHORIZATION_REQUIRED", "gap", "/product_state/decision", null, "Commit gate requires recorded investment decision in product state.");
    } else {
      const curRec = recMap.get(rootStateDecRef.id)?.current;
      if (!curRec || curRec.revision !== rootStateDecRef.revision) {
        addIssue("AUTHORIZATION_REQUIRED", "gap", "/product_state/decision", rootStateDecRef.id, "Product state decision revision mismatch.");
      } else if (curRec.kind !== "DEC" || curRec.data?.purpose !== "investment" || curRec.data?.status !== "recorded" ||
          !["authorize", "risk_accept"].includes(curRec.data?.outcome) || isRetired(curRec) ||
          !scopesEqual(curRec.scope, state.scope)) {
        addIssue("AUTHORIZATION_REQUIRED", "gap", "/product_state/decision", rootStateDecRef.id, "Commit requires a current, non-retired, scoped investment decision.");
      } else {
        selectedRootDec = curRec;
        if (curRec.data.outcome === "authorize" && state.value !== "validated_for_scope") {
          addIssue("AUTHORIZATION_REQUIRED", "gap", "/product_state/value", curRec.id, "Authorize requires validated_for_scope evidence.");
        }
        if (curRec.data.outcome === "risk_accept" &&
            (!Array.isArray(curRec.data.uncertainties) || curRec.data.uncertainties.length === 0 ||
             !isNonEmptyString(curRec.data.rationale))) {
          addIssue("AUTHORIZATION_REQUIRED", "gap", `/records/${recordIndexMap.get(curRec.id) ?? 0}/data/uncertainties`, curRec.id, "Risk acceptance requires explicit uncertainty and rationale.");
        }
        if (curRec.data.outcome === "risk_accept" && state.value === "validated_for_scope") {
          addIssue("AUTHORIZATION_REQUIRED", "gap", "/product_state/value", curRec.id, "Risk acceptance cannot upgrade or claim validated_for_scope.");
        }
        if (curRec.data.outcome === "authorize") {
          const consumedByKind = (kind) => (curRec.data.consumes || []).some((ref) => {
            const entry = recMap.get(ref.id);
            return ref.id.startsWith(`${kind}-`) && entry?.current?.revision === ref.revision &&
              entry.current.kind === kind && scopesEqual(entry.current.scope, curRec.scope);
          });
          const consumedPairs = new Set((curRec.data.consumes || []).map((ref) => `${ref.id}@${ref.revision}`));
          const selectedProof = decEvaluationResults.get(curRec.id);
          const staleProofExplainsBindings = selectedProof?.failureCodes.has("OBSOLETE_BINDING") &&
            !selectedProof.failureCodes.has("EVIDENCE_UNAVAILABLE");
          if ((!["INV", "OPP", "HYP", "EXP"].every(consumedByKind) ||
              state.hypotheses.length === 0 ||
              state.hypotheses.some((ref) => !consumedPairs.has(`${ref.id}@${ref.revision}`))) &&
              !staleProofExplainsBindings) {
            addIssue("EVIDENCE_UNAVAILABLE", "gap", `/records/${recordIndexMap.get(curRec.id) ?? 0}/data/consumes`, curRec.id, "Commit requires current scoped investment, opportunity, hypotheses, and linked completed experiment support.");
          }
        }
        // Verify business bridge
        let hasBusinessBridge = false;
        for (const b of bridges) {
          if (b.record?.id === curRec.id && b.record?.revision === curRec.revision) {
            const auth = authMap.get(b.authority_id)?.current;
            if (auth && auth.revision === b.authority_revision && auth.domain === "business" && auth.access === "available" && scopesEqual(auth.scope, curRec.scope) && (b.ids || []).some((id) => id.startsWith("BRD-OBJ-"))) {
              hasBusinessBridge = true;
              break;
            }
          }
        }
        if (!hasBusinessBridge) {
          addIssue("BRIDGE_DECLARATION", "gap", `/records/${recordIndexMap.get(curRec.id) ?? 0}`, curRec.id, "Commit gate requires valid business bridge to >=1 BRD objective.");
        }
      }
    }
  } else if (gate === "experiment") {
    if (state.value === "validating" && state.decision) {
      const curRec = recMap.get(state.decision.id)?.current;
      if (curRec && curRec.revision === state.decision.revision && curRec.kind === "DEC" &&
          (curRec.data?.purpose === "learning" || curRec.data?.purpose === "experiment") &&
          curRec.data?.status === "recorded" && curRec.data?.outcome === "authorize" &&
          !isRetired(curRec) && scopesEqual(curRec.scope, state.scope)) {
        selectedRootDec = curRec;
      } else {
        addIssue("AUTHORIZATION_REQUIRED", "gap", "/product_state/decision", state.decision.id, "Validating requires a current scoped experiment authorization decision.");
      }
    } else {
      const expDecs = records.filter(
        (r) => r.kind === "DEC" && (r.data?.purpose === "learning" || r.data?.purpose === "experiment") &&
          r.data?.status === "recorded" && r.data?.outcome === "authorize" && !isRetired(r) &&
          scopesEqual(r.scope, state.scope)
      );
      if (expDecs.length === 1) {
        selectedRootDec = expDecs[0];
      } else if (expDecs.length > 1) {
        addIssue("DECISION_SELECTION_REQUIRED", "gap", "/records", null, "Multiple candidate experiment decisions.");
      } else {
        const proposedExpRows = records.filter(
          (r) => ((r.kind === "DEC" && (r.data?.purpose === "learning" || r.data?.purpose === "experiment") &&
                  r.data?.status === "proposed" && r.data?.outcome === "propose") ||
                (r.kind === "EXP" && r.data?.status === "proposed")) &&
            scopesEqual(r.scope, state.scope)
        );
        readiness = "proposal_only";
        if (proposedExpRows.length > 0) {
          const proposed = proposedExpRows[0];
          addIssue("AUTHORIZATION_REQUIRED", "gap", `/records/${recordIndexMap.get(proposed.id) ?? 0}`, proposed.id, "Experiment has no recorded authorization decision.");
        } else {
          addIssue("AUTHORIZATION_REQUIRED", "gap", "/records", null, "No recorded experiment authorization decision.");
        }
      }
    }
    if (selectedRootDec) {
      const experimentRefs = selectedRootDec.data.consumes.filter((ref) => ref.id.startsWith("EXP-"));
      if (experimentRefs.length === 0) {
        addIssue("AUTHORIZATION_REQUIRED", "gap", `/records/${recordIndexMap.get(selectedRootDec.id) ?? 0}/data/consumes`, selectedRootDec.id, "Experiment authorization must bind a complete EXP proposal.");
      }
      for (const ref of experimentRefs) {
        const experimentEntry = recMap.get(ref.id);
        const experiment = experimentEntry?.current;
        const retainedPlan = experimentEntry?.history.get(ref.revision);
        const compatiblePlan = experiment?.revision === ref.revision ||
          (retainedPlan?.kind === "EXP" && experiment?.kind === "EXP" &&
            arePlanProjectionsEqual(retainedPlan, experiment));
        const bounds = experiment?.data?.bounds;
        if (!experiment || !compatiblePlan || experiment.kind !== "EXP" ||
            !scopesEqual(experiment.scope, selectedRootDec.scope) ||
            !["proposed", "authorized", "running", "completed"].includes(experiment.data?.status) ||
            !isValidGregorianDate(bounds?.starts_at) || !isValidGregorianDate(bounds?.ends_at) ||
            !isSafeBudgetCap(bounds?.budget_cap) || !/^[A-Z]{3}$/.test(bounds?.currency || "") ||
            !isSafeInteger(bounds?.exposure_cap) || bounds.exposure_cap < 0 ||
            !Array.isArray(experiment.data?.guardrails) || experiment.data.guardrails.length === 0 ||
            !Array.isArray(bounds?.stop_rules) || bounds.stop_rules.length === 0) {
          addIssue("AUTHORIZATION_REQUIRED", "gap", `/records/${recordIndexMap.get(ref.id) ?? 0}`, ref.id, "Experiment gate requires a current scoped plan with finite time, budget, exposure, guardrails, and stop rules.");
        } else if (experiment.data.status !== "proposed" &&
            (experiment.data.authorization?.id !== selectedRootDec.id ||
             experiment.data.authorization?.revision !== selectedRootDec.revision)) {
          addIssue("AUTHORIZATION_REQUIRED", "gap", `/records/${recordIndexMap.get(ref.id) ?? 0}/data/authorization`, ref.id, "Authorized experiment must bind the selected decision pair.");
        } else if (experiment.data.status === "proposed" && experiment.data.authorization !== null) {
          addIssue("AUTHORIZATION_REQUIRED", "gap", `/records/${recordIndexMap.get(ref.id) ?? 0}/data/authorization`, ref.id, "Proposed experiment cannot contain an authorization binding.");
        }
      }
      for (const ref of experimentRefs) {
        const experiment = recMap.get(ref.id)?.current;
        if (!experiment) continue;
        const metricRefs = [experiment.data?.primary_metric, ...(experiment.data?.guardrails || [])].filter(Boolean);
        for (const metricRef of metricRefs) {
          const metricEntry = recMap.get(metricRef.id);
          const metric = metricEntry?.current;
          const boundMetric = metricEntry?.history.get(metricRef.revision);
          const compatiblePlan = metric?.revision === metricRef.revision ||
            (boundMetric && arePlanProjectionsEqual(boundMetric, metric));
          if (!metric || !compatiblePlan || metric.kind !== "MET" ||
              !["instrumented", "observed"].includes(metric.data?.status) ||
              !metric.data?.query || !metric.data?.query_revision) {
            addIssue("EVIDENCE_UNAVAILABLE", "gap", `/records/${recordIndexMap.get(metricRef.id) ?? 0}`, metricRef.id, "Experiment authorization requires current compatible instrumented primary and guardrail metrics with query bindings.");
            continue;
          }
          const query = recMap.get(metric.data.query.id)?.current;
          if (!query || query.revision !== metric.data.query.revision || query.kind !== "SRC" ||
              query.data?.origin?.revision !== metric.data.query_revision) {
            addIssue("OBSOLETE_BINDING", "gap", `/records/${recordIndexMap.get(metric.id) ?? 0}/data/query`, metric.id, "Experiment metric query must bind its current source-origin revision.");
          }
        }
      }
    }
  } else if (gate === "release") {
    // Exclude helpers exclusively referenced as baseline exceptions (F06)
    const exceptionHelperIds = new Set();
    const otherDecisionUseIds = new Set();
    const collectDecisionUse = (ref) => {
      if (ref?.id?.startsWith("DEC-")) otherDecisionUseIds.add(ref.id);
    };
    for (const list of [records, recordHistory]) {
      for (const record of list) {
        for (const dep of (Array.isArray(record.depends_on) ? record.depends_on : [])) collectDecisionUse(dep);
        collectDecisionUse(record.data?.authorization);
        collectDecisionUse(record.data?.decision);
        collectDecisionUse(record.data?.supersedes);
        if (record.kind === "MET" && record.data?.baseline_exception?.id) {
          exceptionHelperIds.add(record.data.baseline_exception.id);
        }
      }
    }
    for (const bridge of bridges) collectDecisionUse(bridge.record);
    collectDecisionUse(state.decision);
    for (const entry of stateHistory) collectDecisionUse(entry.decision);
    const releaseDecs = records.filter(
      (r) => r.kind === "DEC" && r.data?.purpose === "release" && r.data?.status === "recorded" &&
        r.data?.outcome === "authorize" && !isRetired(r) &&
        scopesEqual(r.scope, state.scope) && !(exceptionHelperIds.has(r.id) && !otherDecisionUseIds.has(r.id))
    );
    if (releaseDecs.length === 1) {
      selectedRootDec = releaseDecs[0];
      const hasMeasurement = selectedRootDec.data.consumes.some((ref) => ref.id.startsWith("MET-"));
      const hasRequirements = selectedRootDec.data.critical_claims.length > 0 && bridges.some((bridge) => {
        if (bridge.record?.id !== selectedRootDec.id || bridge.record?.revision !== selectedRootDec.revision ||
            !bridge.ids.some((id) => id.startsWith("REQ-") || id.startsWith("AC-"))) return false;
        const authority = authMap.get(bridge.authority_id)?.current;
        return authority?.revision === bridge.authority_revision && authority.domain === "requirements" &&
          authority.access === "available" && scopesEqual(authority.scope, selectedRootDec.scope);
      });
      const hasUat = selectedRootDec.depends_on.some((ref) => {
        const decision = resolveDecisionPair(ref);
        return decision?.kind === "DEC" && decision.data?.purpose === "uat" &&
          decision.data?.status === "recorded" && decision.data.outcome === "authorize" &&
          !isRetired(decision) && scopesEqual(decision.scope, selectedRootDec.scope);
      });
      const releaseAuthority = authMap.get(selectedRootDec.data.authority_id)?.current;
      if (!hasMeasurement || !hasRequirements || !hasUat || !releaseAuthority ||
          releaseAuthority.revision !== selectedRootDec.data.authority_revision ||
          releaseAuthority.domain !== "authorization" || releaseAuthority.access !== "available" ||
          !scopesEqual(releaseAuthority.scope, selectedRootDec.scope)) {
        addIssue("EVIDENCE_UNAVAILABLE", "gap", `/records/${recordIndexMap.get(selectedRootDec.id) ?? 0}`, selectedRootDec.id, "Release requires scoped measurements, requirements, UAT, and current release authority.");
      }
    } else if (releaseDecs.length > 1) {
      addIssue("DECISION_SELECTION_REQUIRED", "gap", "/records", null, "Multiple candidate release decisions.");
    } else {
      addIssue("DECISION_SELECTION_REQUIRED", "gap", "/records", null, "No candidate release decision.");
    }
  }

  if (selectedRootDec && hasAmbiguousSelectedLineage(selectedRootDec)) {
    affectedDecisions.add(selectedRootDec.id);
    addIssue("DECISION_SELECTION_REQUIRED", "gap", `/records/${recordIndexMap.get(selectedRootDec.id) ?? 0}`, selectedRootDec.id, "Selected decision has a branched supersession lineage.");
  }
  // Populate selected helpers
  if (selectedRootDec) {
    const evalRes = decEvaluationResults.get(selectedRootDec.id);
    if (evalRes) {
      for (const h of evalRes.visitedHelpers) {
        if (affectedDecisions.has(h)) selectedHelpers.add(h);
      }
    }
  }

  // Synthetic check
  if (gate !== "structural" && ledger.synthetic === true) {
    addIssue("SYNTHETIC_EVIDENCE", "gap", "", null, "Synthetic ledger is not eligible for action gates.");
  }

  // Emit proof issues on candidate DECs
  for (const dec of candidateDecRoots) {
    const evalRes = decEvaluationResults.get(dec.id);
    if (evalRes && evalRes.failed) {
      const idx = recordIndexMap.get(dec.id) ?? 0;
      const isSelectedRoot = selectedRootDec && selectedRootDec.id === dec.id;
      const isSelectedHelper = selectedHelpers.has(dec.id);
      const isActionGate = gate !== "structural";

      let severity = "warning";
      if (isActionGate && (isSelectedRoot || isSelectedHelper)) {
        severity = "gap";
      }

      for (const code of evalRes.failureCodes) {
        addIssue(
          code,
          severity,
          `/records/${idx}`,
          dec.id,
          getProofMessage(code)
        );
      }
    }
  }

  // Effective Product State (F03)
  if (state.value === "validated_for_scope" || state.value === "validating") {
    if (stateProofUnmet || (state.decision && affectedDecisions.has(state.decision.id))) {
      effectiveProductState = "inconclusive";
    } else {
      effectiveProductState = state.value;
    }
  } else {
    effectiveProductState = state.value || null;
  }

  // Readiness computation
  const hasStructuralError = issues.some((iss) => iss.severity === "error");
  const hasGap = issues.some((iss) => iss.severity === "gap");

  if (hasStructuralError) {
    readiness = "blocked";
  } else if (gate === "structural") {
    readiness = "not_assessed";
  } else {
    if (readiness === "proposal_only") {
      // already proposal_only
    } else if (hasGap) {
      readiness = "blocked";
    } else {
      readiness = "eligible_for_host_check";
    }
  }

  return finalizeEnvelope(false);

  function finalizeEnvelope(earlyExit) {
    const isValid = !issues.some((iss) => iss.severity === "error");

    if (earlyExit) {
      readiness = "blocked";
      effectiveProductState = null;
    }

    const uniqueIssuesMap = new Map();
    for (const iss of issues) {
      const k = `${iss.path}::${iss.code}::${iss.record_id || ""}::${iss.severity}`;
      if (!uniqueIssuesMap.has(k)) {
        uniqueIssuesMap.set(k, iss);
      }
    }

    // ASCII Code-Point Sorting (F11: NOT localeCompare!)
    function asciiCompare(strA, strB) {
      if (strA === strB) return 0;
      return strA < strB ? -1 : 1;
    }

    const sortedIssues = [...uniqueIssuesMap.values()].sort((a, b) => {
      const cPath = asciiCompare(a.path, b.path);
      if (cPath !== 0) return cPath;
      const cCode = asciiCompare(a.code, b.code);
      if (cCode !== 0) return cCode;
      return asciiCompare(a.record_id || "", b.record_id || "");
    });

    const sortedAffected = [...affectedDecisions].sort(asciiCompare);

    // Return closed public envelope only (F10: NO _meta!)
    return {
      schema_version: SCHEMA_VERSION,
      tool: TOOL_NAME,
      valid: isValid,
      gate,
      readiness,
      effective_product_state: effectiveProductState,
      affected_decisions: sortedAffected,
      issues: sortedIssues,
      limitations,
    };
  }
}

// CLI Execution Helper
function printUsage() {
  process.stdout.write("Usage: node validate-product-evidence.mjs <ledger.json> --authority-root <absolute-root> --as-of <UTC-instant> [--gate structural|experiment|commit|release]\n");
}

function emitCliErrorEnvelope(code, message, exitCode) {
  const envelope = {
    schema_version: SCHEMA_VERSION,
    tool: TOOL_NAME,
    valid: false,
    gate: "structural",
    readiness: "blocked",
    effective_product_state: null,
    authority_verification: "failed",
    risk_acceptance: "none",
    accounting_integrity: "inconclusive",
    provenance_verified: false,
    affected_decisions: [],
    issues: [
      {
        code,
        severity: "error",
        path: code === "UNSUPPORTED_VERSION" ? "/schema_version" : "",
        record_id: null,
        message,
      },
    ],
    limitations: MANDATORY_LIMITATIONS,
  };
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
  process.exitCode = exitCode;
}

async function cliMain() {
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeMajor < 20) {
    emitCliErrorEnvelope("INVALID_ARGUMENT", "Node version must be >= 20.0.0", 2);
    return;
  }

  const rawArgs = process.argv.slice(2);

  // Standalone --help check (F10)
  if (rawArgs.includes("--help")) {
    if (rawArgs.length === 1) {
      printUsage();
      process.exitCode = 0;
      return;
    } else {
      emitCliErrorEnvelope("INVALID_ARGUMENT", "--help must be standalone.", 2);
      return;
    }
  }

  let ledgerFile = null;
  let authorityRoot = null;
  let asOf = null;
  let gate = "structural";
  const seenFlags = new Set();

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--authority-root") {
      if (seenFlags.has("--authority-root") || i + 1 >= rawArgs.length) {
        emitCliErrorEnvelope("INVALID_ARGUMENT", "Invalid or duplicate --authority-root argument.", 2);
        return;
      }
      seenFlags.add("--authority-root");
      authorityRoot = rawArgs[++i];
    } else if (arg === "--as-of") {
      if (seenFlags.has("--as-of") || i + 1 >= rawArgs.length) {
        emitCliErrorEnvelope("INVALID_ARGUMENT", "Invalid or duplicate --as-of argument.", 2);
        return;
      }
      seenFlags.add("--as-of");
      asOf = rawArgs[++i];
    } else if (arg === "--gate") {
      if (seenFlags.has("--gate") || i + 1 >= rawArgs.length) {
        emitCliErrorEnvelope("INVALID_ARGUMENT", "Invalid or duplicate --gate argument.", 2);
        return;
      }
      seenFlags.add("--gate");
      gate = rawArgs[++i];
    } else if (arg.startsWith("-")) {
      emitCliErrorEnvelope("INVALID_ARGUMENT", "Unknown option.", 2);
      return;
    } else {
      if (ledgerFile !== null) {
        emitCliErrorEnvelope("INVALID_ARGUMENT", "Extra positional argument.", 2);
        return;
      }
      ledgerFile = arg;
    }
  }

  if (!ledgerFile || !authorityRoot || !asOf) {
    emitCliErrorEnvelope("INVALID_ARGUMENT", "Missing required arguments.", 2);
    return;
  }

  if (!path.isAbsolute(authorityRoot)) {
    emitCliErrorEnvelope("INVALID_ARGUMENT", "Authority root must be an absolute path.", 2);
    return;
  }
  const resolvedRoot = path.resolve(authorityRoot);
  if (resolvedRoot === path.parse(resolvedRoot).root || resolvedRoot === path.resolve(os.homedir())) {
    emitCliErrorEnvelope("UNSAFE_PATH", "Authority root cannot be filesystem root or user home.", 2);
    return;
  }

  let canonicalRoot;
  try {
    const rootStat = fs.lstatSync(resolvedRoot);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      emitCliErrorEnvelope("UNSAFE_PATH", "Authority root must be a canonical existing directory.", 2);
      return;
    }
    canonicalRoot = fs.realpathSync(resolvedRoot);
  } catch {
    emitCliErrorEnvelope("IO_ERROR", "Authority root cannot be accessed.", 2);
    return;
  }
  if (canonicalRoot !== resolvedRoot || canonicalRoot === path.parse(canonicalRoot).root ||
      canonicalRoot === path.resolve(os.homedir())) {
    emitCliErrorEnvelope("UNSAFE_PATH", "Canonical authority root must be narrow and not an alias.", 2);
    return;
  }

  const resolvedLedger = path.isAbsolute(ledgerFile) ? path.resolve(ledgerFile) : path.resolve(process.cwd(), ledgerFile);
  const relativeLedger = path.relative(canonicalRoot, resolvedLedger);
  if (!relativeLedger || relativeLedger.startsWith(`..${path.sep}`) || relativeLedger === ".." ||
      path.isAbsolute(relativeLedger)) {
    emitCliErrorEnvelope("UNSAFE_PATH", "Ledger path must reside below the authority root.", 2);
    return;
  }

  const ledgerRead = readBoundedLocalFile(resolvedLedger, new Set(), canonicalRoot);
  if (!ledgerRead.ok) {
    const code = ledgerRead.code === "ENOENT" ? "IO_ERROR" : ledgerRead.code;
    emitCliErrorEnvelope(code, ledgerRead.message, 2);
    return;
  }
  const fileContent = ledgerRead.buffer.toString("utf8");

  let envelope;
  try {
    envelope = await validateProductEvidence(fileContent, {
      authorityRoot: canonicalRoot,
      ledgerPath: resolvedLedger,
      asOf,
      gate,
    });
  } catch (err) {
    emitCliErrorEnvelope("INTERNAL_ERROR", "Unexpected validator fault.", 4);
    return;
  }

  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");

  // Exit precedence: 4 > 2 > 1 > 3 > 0
  const issueCodes = new Set(envelope.issues.map((i) => i.code));
  if (issueCodes.has("UNSUPPORTED_VERSION") || issueCodes.has("INVALID_ARGUMENT") || issueCodes.has("INVALID_JSON") || issueCodes.has("IO_ERROR") || issueCodes.has("UNSAFE_PATH") || issueCodes.has("INPUT_CHANGED") || issueCodes.has("LIMIT_EXCEEDED")) {
    process.exitCode = 2;
    return;
  }
  if (!envelope.valid) {
    process.exitCode = 1;
    return;
  }
  if (envelope.readiness === "blocked" || envelope.readiness === "proposal_only") {
    process.exitCode = 3;
    return;
  }
  process.exitCode = 0;
}

let isEntry = false;
if (process.argv[1]) {
  try {
    isEntry = import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
  } catch {
    isEntry = false;
  }
}
if (isEntry) {
  cliMain().catch(() => emitCliErrorEnvelope("INTERNAL_ERROR", "Unexpected fatal CLI error.", 4));
}
