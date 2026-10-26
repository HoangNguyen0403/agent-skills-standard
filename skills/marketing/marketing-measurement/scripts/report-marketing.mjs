#!/usr/bin/env node
// skills/marketing/marketing-measurement/scripts/report-marketing.mjs
// Offline deterministic marketing measurement CLI (T02)
// Built-in Node >= 20.0.0 modules only.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MiB limit
const UTC_SECOND_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const HOURS_SCALE = 4; // capacity hours keep four fractional digits
const SYNTHETIC_LIMITATION = "Synthetic offline measurement contract verification only; not host authorization.";
const PUBLIC_IDENTITY_UNAVAILABLE = "public_identity_unavailable";
const MAX_SCHEMA_ISSUES = 25;

// Fixed Diagnostic Error Dictionary (never interpolate private user strings or paths)
const ERROR_MESSAGES = {
  INVALID_ARGUMENT: "Required CLI arguments missing or invalid.",
  INVALID_JSON: "Failed to parse input JSON.",
  IO_ERROR: "I/O error reading input file.",
  LIMIT_EXCEEDED: "Input file size exceeds 1 MiB limit.",
  SYMLINK_REJECTED: "Input file cannot be a symbolic link.",
  PATH_ESCAPE: "Resolved path escapes authority root.",
  INPUT_CHANGED: "Input file changed during read.",
  UNSUPPORTED_VERSION: "Unsupported schema version.",
  INVALID_TIMESTAMP: "Invalid UTC timestamp.",
  WINDOW_INVALID: "Window start must precede end.",
  WINDOW_MISMATCH: "Cost mapping window must match campaign cost window.",
  HASH_MISMATCH: "Content hash does not match declared SHA-256.",
  DUPLICATE_PARTICIPANT: "Duplicate participant declarations.",
  CONFLICTING_REPORT: "Conflicting duplicate report ID declarations.",
  REPORT_TIME_INVALID: "Report occurred_at cannot follow reported_at.",
  TASK_REF_MISSING: "Activation or repeat requires valid task evidence reference.",
  CONTRADICTORY_REPORTS: "Contradictory qualifying repeat and full-window no-return reports.",
  STARTER_AFTER_ACTIVATION: "Pilot starter cannot follow activation.",
  INVESTMENT_INVALID: "Investment analysis is invalid.",
  ITEM_NOT_FOUND: "Mapped item not found in base scenario.",
  ITEM_BASIS_MISMATCH: "Mapped item basis or side mismatch.",
  ITEM_OVERLAP: "Cash item IDs and consumed hour item IDs must not overlap or contain duplicates.",
  CAPABILITY_GAP: "Installed dependency capability gap.",
  LEDGER_INVALID: "Canonical product evidence ledger validation failed.",
  OBSOLETE_BINDING: "Metric binding or query origin revision mismatch.",
  UNKNOWN_PROPERTY: "Unrecognized property in input schema.",
  SCHEMA_ERROR: "Input fails closed schema validation.",
  INTERNAL_ERROR: "An internal error occurred."
};

function getExecutableHash() {
  try {
    const execPath = fileURLToPath(import.meta.url);
    const buf = fs.readFileSync(execPath);
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}

function formatRational(P, Q, decimalPlaces) {
  if (Q <= 0n) {
    throw new Error("Rational denominator Q must be positive BigInt");
  }
  let isNegative = false;
  let pAbs = P;
  if (pAbs < 0n) {
    isNegative = true;
    pAbs = -pAbs;
  }
  const mult = 10n ** BigInt(decimalPlaces);
  let div = (pAbs * mult) / Q;
  const rem = (pAbs * mult) % Q;
  if (rem * 2n >= Q) {
    div += 1n;
  }
  if (div === 0n) {
    isNegative = false;
  }
  const divStr = div.toString();
  let intPartStr;
  let fracPartStr;
  if (divStr.length <= decimalPlaces) {
    intPartStr = "0";
    fracPartStr = divStr.padStart(decimalPlaces, "0");
  } else {
    intPartStr = divStr.slice(0, divStr.length - decimalPlaces);
    fracPartStr = divStr.slice(divStr.length - decimalPlaces);
  }
  return (isNegative ? "-" : "") + intPartStr + "." + fracPartStr;
}

function parseDecimalToScale(decStr, scale = 2) {
  if (typeof decStr !== "string") return null;
  const match = decStr.trim().match(/^(-)?(0|[1-9][0-9]*)(\.[0-9]+)?$/);
  if (!match) return null;
  const isNeg = Boolean(match[1]);
  const intPart = match[2];
  const fracRaw = match[3] ? match[3].slice(1) : "";
  // Exactness: never silently truncate digits beyond the declared scale.
  if (fracRaw.length > scale) return null;
  const fracPadded = fracRaw.padEnd(scale, "0");
  const totalVal = BigInt(intPart) * (10n ** BigInt(scale)) + BigInt(fracPadded || "0");
  return isNeg ? -totalVal : totalVal;
}

function isValidUtcInstant(str) {
  if (typeof str !== "string" || !UTC_SECOND_REGEX.test(str)) return false;
  const d = new Date(str);
  return !Number.isNaN(d.getTime()) && d.toISOString().replace(/\.\d{3}Z$/, "Z") === str;
}

// --- Minimal draft-07 subset evaluator ---
// Applies the shipped JSON Schema documents directly (no npm dependency, no parallel hand-copy).
// Supported keywords cover exactly what measurement-input.schema.json and scorecard.schema.json use.
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
}

function jsonTypeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function schemaTypeMatches(value, expected) {
  const actual = jsonTypeOf(value);
  if (expected === "number") return actual === "number" || actual === "integer";
  return actual === expected;
}

function validateWithSchema(schemaRoot, value) {
  const errors = [];
  const push = (keyword, instancePath, schemaPath, detail = null) => {
    errors.push({ keyword, instancePath, schemaPath, detail });
  };

  function resolveRef(ref) {
    if (typeof ref !== "string" || !ref.startsWith("#/$defs/")) return null;
    const name = ref.slice("#/$defs/".length);
    return schemaRoot.$defs && Object.prototype.hasOwnProperty.call(schemaRoot.$defs, name)
      ? schemaRoot.$defs[name]
      : null;
  }

  function walk(schema, current, instancePath) {
    if (schema === true) return true;
    if (!schema || typeof schema !== "object") return true;
    if (schema.$ref) {
      const target = resolveRef(schema.$ref);
      if (!target) {
        push("schema", instancePath, schema.$ref);
        return false;
      }
      return walk(target, current, instancePath);
    }

    const startCount = errors.length;

    if (Object.prototype.hasOwnProperty.call(schema, "type")) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some(t => schemaTypeMatches(current, t))) {
        push("type", instancePath, "type", types.join("|"));
        return false;
      }
    }

    if (Object.prototype.hasOwnProperty.call(schema, "const")) {
      if (canonicalJson(current) !== canonicalJson(schema.const)) {
        push("const", instancePath, "const");
      }
    }

    if (Array.isArray(schema.enum)) {
      if (!schema.enum.some(item => canonicalJson(item) === canonicalJson(current))) {
        push("enum", instancePath, "enum");
      }
    }

    if (typeof current === "string") {
      if (typeof schema.minLength === "number" && current.length < schema.minLength) {
        push("minLength", instancePath, "minLength", String(schema.minLength));
      }
      if (typeof schema.pattern === "string") {
        let pattern = null;
        try { pattern = new RegExp(schema.pattern); } catch { pattern = null; }
        if (pattern && !pattern.test(current)) push("pattern", instancePath, "pattern");
      }
      if (schema.format === "date-time" && !isValidUtcInstant(current)) {
        push("format", instancePath, "format", "date-time");
      }
    }

    if (typeof current === "number") {
      if (typeof schema.minimum === "number" && current < schema.minimum) {
        push("minimum", instancePath, "minimum", String(schema.minimum));
      }
    }

    if (Array.isArray(current)) {
      if (typeof schema.minItems === "number" && current.length < schema.minItems) {
        push("minItems", instancePath, "minItems", String(schema.minItems));
      }
      if (schema.uniqueItems === true) {
        const seenItems = new Set();
        for (let i = 0; i < current.length; i++) {
          const encoded = canonicalJson(current[i]);
          if (seenItems.has(encoded)) {
            push("uniqueItems", `${instancePath}/${i}`, "uniqueItems");
          }
          seenItems.add(encoded);
        }
      }
      if (schema.items && typeof schema.items === "object") {
        for (let i = 0; i < current.length; i++) {
          walk(schema.items, current[i], `${instancePath}/${i}`);
        }
      }
    }

    if (current && typeof current === "object" && !Array.isArray(current)) {
      const properties = schema.properties || {};
      if (Array.isArray(schema.required)) {
        for (const reqKey of schema.required) {
          if (!Object.prototype.hasOwnProperty.call(current, reqKey)) {
            push("required", `${instancePath}/${reqKey}`, "required", reqKey);
          }
        }
      }
      for (const key of Object.keys(current)) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) {
          walk(properties[key], current[key], `${instancePath}/${key}`);
        } else if (schema.additionalProperties === false) {
          // Never echo the unrecognized key.
          push("additionalProperties", instancePath, "additionalProperties");
        }
      }
    }

    if (Array.isArray(schema.oneOf)) {
      const branchErrors = [];
      let validBranches = 0;
      for (const branch of schema.oneOf) {
        const saved = errors.length;
        walk(branch, current, instancePath);
        const produced = errors.splice(saved);
        if (produced.length === 0) {
          validBranches++;
        } else {
          branchErrors.push(produced);
        }
      }
      if (validBranches === 0) {
        // Surface the branch that matched the instance type (deepest useful diagnostics).
        const typedBranch = branchErrors.find(list =>
          !list.some(item => item.keyword === "type" && item.instancePath === instancePath)
        );
        const chosen = typedBranch || branchErrors[0] || [];
        if (chosen.length > 0) errors.push(...chosen);
        else push("oneOf", instancePath, "oneOf");
      } else if (validBranches > 1) {
        push("oneOf", instancePath, "oneOf", "ambiguous");
      }
    }

    return errors.length === startCount;
  }

  walk(schemaRoot, value, "");
  return errors;
}

function schemaErrorsToIssues(schemaErrors, addIssue) {
  for (const err of schemaErrors.slice(0, MAX_SCHEMA_ISSUES)) {
    const safePath = typeof err.instancePath === "string" ? err.instancePath : "/";
    switch (err.keyword) {
      case "additionalProperties":
        // Fixed path: unrecognized keys are never echoed.
        addIssue("UNKNOWN_PROPERTY", "/");
        break;
      case "format":
        addIssue("INVALID_TIMESTAMP", safePath);
        break;
      case "const":
        if (safePath === "/schema_version") addIssue("UNSUPPORTED_VERSION", "/schema_version");
        else addIssue("SCHEMA_ERROR", safePath);
        break;
      default:
        addIssue("SCHEMA_ERROR", safePath);
        break;
    }
  }
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function inspectContainedRegularFile(filePath, authorityRoot) {
  const normRoot = path.resolve(authorityRoot);
  const normFile = path.resolve(filePath);
  const relative = path.relative(normRoot, normFile);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    return { ok: false, code: "PATH_ESCAPE" };
  }

  let current = normRoot;
  const segments = relative.split(path.sep);
  try {
    for (let index = 0; index < segments.length; index++) {
      current = path.join(current, segments[index]);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || (index < segments.length - 1 ? !stat.isDirectory() : !stat.isFile())) {
        return { ok: false, code: "SYMLINK_REJECTED" };
      }
    }
    const canonical = fs.realpathSync(normFile);
    const canonicalRelative = path.relative(normRoot, canonical);
    if (canonicalRelative.startsWith(`..${path.sep}`) || canonicalRelative === ".." || path.isAbsolute(canonicalRelative)) {
      return { ok: false, code: "PATH_ESCAPE" };
    }
    return { ok: true, stat: fs.lstatSync(normFile), canonical };
  } catch (err) {
    const code = err?.code === "ENOENT" ? "IO_ERROR" : "IO_ERROR";
    return { ok: false, code };
  }
}

function readContainedFile(relPath, authorityRoot) {
  const normRoot = path.resolve(authorityRoot);
  const targetPath = path.resolve(normRoot, relPath);

  const inspected = inspectContainedRegularFile(targetPath, normRoot);
  if (!inspected.ok) return inspected;

  if (inspected.stat.size > MAX_FILE_SIZE) {
    return { ok: false, code: "LIMIT_EXCEEDED" };
  }

  let descriptor;
  try {
    const noFollow = fs.constants.O_NOFOLLOW ?? 0;
    descriptor = fs.openSync(targetPath, fs.constants.O_RDONLY | noFollow | fs.constants.O_NONBLOCK);
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || before.size > MAX_FILE_SIZE) {
      return { ok: false, code: before.isFile() ? "LIMIT_EXCEEDED" : "SYMLINK_REJECTED" };
    }

    const scratch = Buffer.allocUnsafe(Math.min(before.size, MAX_FILE_SIZE) + 1);
    let totalBytes = 0;
    while (totalBytes < scratch.length) {
      const bytesRead = fs.readSync(descriptor, scratch, totalBytes, scratch.length - totalBytes, null);
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
    }
    const buffer = scratch.subarray(0, totalBytes);
    const after = fs.fstatSync(descriptor);
    const current = inspectContainedRegularFile(targetPath, normRoot);

    if (
      !current.ok ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      current.stat.dev !== after.dev ||
      current.stat.ino !== after.ino ||
      buffer.length !== after.size
    ) {
      return { ok: false, code: "INPUT_CHANGED" };
    }
    if (totalBytes > MAX_FILE_SIZE) {
      return { ok: false, code: "LIMIT_EXCEEDED" };
    }
    return { ok: true, buffer, filePath: targetPath, size: totalBytes };
  } catch {
    return { ok: false, code: "IO_ERROR" };
  } finally {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
    }
  }
}

// Locate and preflight installed dependencies and their schemas.
// Only two reviewed layouts are considered: standard agent root ("skills/...") and
// flattened package root ("<root>/marketing-measurement"). No monorepo-parent fallback.
async function resolveDependencies() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const skillDir = path.resolve(__dirname, ".."); // marketing-measurement

  const layouts = [];
  const standardRoot = path.resolve(__dirname, "../../..");
  if (path.basename(standardRoot) === "skills") {
    layouts.push({
      label: "standard",
      evidenceRoot: path.resolve(standardRoot, "product-management/product-evidence"),
      investmentRoot: path.resolve(standardRoot, "product-management/product-investment")
    });
  }
  const flattenedRoot = path.resolve(__dirname, "../..");
  layouts.push({
    label: "flattened",
    evidenceRoot: path.resolve(flattenedRoot, "product-management-product-evidence"),
    investmentRoot: path.resolve(flattenedRoot, "product-management-product-investment")
  });

  function readSchemaFile(filePath) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return { ok: true, schema: JSON.parse(raw) };
    } catch {
      return { ok: false };
    }
  }

  let localInputSchema = null;
  let localScorecardSchema = null;
  const inputSchemaRead = readSchemaFile(path.resolve(skillDir, "assets/measurement-input.schema.json"));
  const scorecardSchemaRead = readSchemaFile(path.resolve(skillDir, "assets/scorecard.schema.json"));
  if (!inputSchemaRead.ok || !scorecardSchemaRead.ok) {
    return { ok: false, code: "CAPABILITY_GAP", missing: "schemas" };
  }
  localInputSchema = inputSchemaRead.schema;
  localScorecardSchema = scorecardSchemaRead.schema;

  let missingLabel = null;
  for (const layout of layouts) {
    const evidenceScript = path.resolve(layout.evidenceRoot, "scripts/validate-product-evidence.mjs");
    const evidenceSchemaPath = path.resolve(layout.evidenceRoot, "assets/product-evidence.schema.json");
    const investmentScript = path.resolve(layout.investmentRoot, "scripts/evaluate-investment.mjs");
    const investmentSchemaPath = path.resolve(layout.investmentRoot, "assets/investment.schema.json");

    if (
      !fs.existsSync(evidenceScript) ||
      !fs.existsSync(evidenceSchemaPath) ||
      !fs.existsSync(investmentScript) ||
      !fs.existsSync(investmentSchemaPath)
    ) {
      if (missingLabel === null) {
        missingLabel = !fs.existsSync(evidenceScript)
          ? "product-evidence"
          : (!fs.existsSync(evidenceSchemaPath) ? "product-evidence-schema"
            : (!fs.existsSync(investmentScript) ? "product-investment" : "product-investment-schema"));
      }
      continue;
    }

    // Explicit schema preflight: parsing proves the shipped resource is valid JSON.
    const evidenceSchemaRead = readSchemaFile(evidenceSchemaPath);
    const investmentSchemaRead = readSchemaFile(investmentSchemaPath);
    if (!evidenceSchemaRead.ok || !investmentSchemaRead.ok) {
      if (missingLabel === null) {
        missingLabel = !evidenceSchemaRead.ok ? "product-evidence-schema" : "product-investment-schema";
      }
      continue;
    }

    try {
      const evidenceMod = await import(evidenceScript);
      const investmentMod = await import(investmentScript);
      if (
        typeof evidenceMod.validateProductEvidence !== "function" ||
        typeof investmentMod.evaluateInvestment !== "function"
      ) {
        if (missingLabel === null) missingLabel = "import_failure";
        continue;
      }
      return {
        ok: true,
        layout: layout.label,
        inputSchema: localInputSchema,
        scorecardSchema: localScorecardSchema,
        productEvidenceSchema: evidenceSchemaRead.schema,
        productInvestmentSchema: investmentSchemaRead.schema,
        validateProductEvidence: evidenceMod.validateProductEvidence,
        evaluateInvestment: investmentMod.evaluateInvestment
      };
    } catch {
      if (missingLabel === null) missingLabel = "import_failure";
    }
  }

  return { ok: false, code: "CAPABILITY_GAP", missing: missingLabel || "product-evidence" };
}

// Deep closed-schema validation for measurement input
function validateClosedInputSchema(input, addIssue, schemaRoot) {
  if (!schemaRoot) {
    addIssue("CAPABILITY_GAP", "/");
    return false;
  }

  // Apply the shipped closed JSON Schema document itself; no parallel key walk.
  const schemaErrors = validateWithSchema(schemaRoot, input);
  if (schemaErrors.length > 0) {
    schemaErrorsToIssues(schemaErrors, addIssue);
    return false;
  }

  // Cross-field constraints that JSON Schema cannot express.
  function checkWindowOrder(win, pName) {
    if (new Date(win.start) >= new Date(win.end)) {
      addIssue("WINDOW_INVALID", pName);
      return false;
    }
    return true;
  }

  if (!checkWindowOrder(input.campaign.acquisition_window, "/campaign/acquisition_window")) return false;
  if (!checkWindowOrder(input.campaign.cost_window, "/campaign/cost_window")) return false;
  if (input.cost_mapping && !checkWindowOrder(input.cost_mapping.window, "/cost_mapping/window")) return false;

  return true;
}


export async function runMarketingScorecard(inputPath, options = {}) {
  const {
    authorityRoot,
    asOf,
    format = "json"
  } = options;

  const issues = [];
  function addIssue(code, path = "/", customMsg = null) {
    const message = customMsg || ERROR_MESSAGES[code] || "Validation issue";
    issues.push({ code, path, message });
  }

  // Preflight Node runtime
  const nodeVerMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeVerMajor < 20) {
    addIssue("CAPABILITY_GAP", "/", "Node.js runtime >= 20.0.0 required.");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf: null }) };
  }

  // Check required parameters
  if (!inputPath || !authorityRoot || !asOf) {
    addIssue("INVALID_ARGUMENT", "/");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf: null }) };
  }

  // Canonicalize authorityRoot to absolute path
  const canonicalAuthorityRoot = path.resolve(process.cwd(), authorityRoot);
  try {
    const rootStat = fs.statSync(canonicalAuthorityRoot);
    if (!rootStat.isDirectory()) {
      addIssue("INVALID_ARGUMENT", "/authority_root");
      return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf: null }) };
    }
  } catch {
    addIssue("IO_ERROR", "/authority_root");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf: null }) };
  }

  const parsedRoot = path.parse(canonicalAuthorityRoot).root;
  if (canonicalAuthorityRoot === parsedRoot || canonicalAuthorityRoot === path.resolve(os.homedir())) {
    addIssue("PATH_ESCAPE", "/authority_root");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf: null }) };
  }

  // Validate as-of timestamp
  if (!isValidUtcInstant(asOf)) {
    addIssue("INVALID_TIMESTAMP", "/as_of");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf: null }) };
  }

  // Preflight dependencies & local schemas
  const deps = await resolveDependencies();
  if (!deps.ok) {
    addIssue("CAPABILITY_GAP", "/");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf }) };
  }

  const internalErrorEnvelope = makeEnvelope(false, null, null, null, [{
    code: "INTERNAL_ERROR",
    path: "/",
    message: ERROR_MESSAGES.INTERNAL_ERROR
  }], { asOf: null });

  // Every emitted envelope must conform to the shipped scorecard schema.
  function emit(exitCode, envelope) {
    const outputErrors = validateWithSchema(deps.scorecardSchema, envelope);
    if (outputErrors.length === 0) return { exitCode, envelope };
    return { exitCode: 4, envelope: internalErrorEnvelope };
  }

  // Resolve input path and verify containment within canonicalAuthorityRoot
  let inputAbs;
  if (path.isAbsolute(inputPath)) {
    inputAbs = path.normalize(inputPath);
  } else {
    const fromCwd = path.resolve(process.cwd(), inputPath);
    if (fs.existsSync(fromCwd)) {
      inputAbs = fromCwd;
    } else {
      inputAbs = path.resolve(canonicalAuthorityRoot, inputPath);
    }
  }

  const inputRel = path.relative(canonicalAuthorityRoot, inputAbs);
  const inputRead = readContainedFile(inputRel, canonicalAuthorityRoot);
  if (!inputRead.ok) {
    addIssue(inputRead.code, "/");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf }) };
  }

  let input;
  try {
    input = JSON.parse(inputRead.buffer.toString("utf-8"));
  } catch {
    addIssue("INVALID_JSON", "/");
    return { exitCode: 2, envelope: makeEnvelope(false, null, null, null, issues, { asOf }) };
  }

  // Full closed schema conformance: the shipped schema document is applied, not merely parsed.
  const schemaValid = validateClosedInputSchema(input, addIssue, deps.inputSchema);
  if (!schemaValid || issues.length > 0) {
    const hasExit2 = issues.some(iss => ["UNSUPPORTED_VERSION", "INVALID_JSON"].includes(iss.code));
    return emit(hasExit2 ? 2 : 1, makeEnvelope(false, null, null, null, issues, { asOf }));
  }

  const campaign = input.campaign;

  // Read and verify ledger file
  const ledgerRead = readContainedFile(input.ledger.path, canonicalAuthorityRoot);
  if (!ledgerRead.ok) {
    addIssue(ledgerRead.code, "/ledger/path");
    return emit(2, makeEnvelope(false, null, null, null, issues, { asOf }));
  }
  const actualLedgerHash = sha256Hex(ledgerRead.buffer);
  if (actualLedgerHash !== input.ledger.sha256) {
    addIssue("HASH_MISMATCH", "/ledger/sha256");
    return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
  }

  let ledgerData;
  try {
    ledgerData = JSON.parse(ledgerRead.buffer.toString("utf-8"));
  } catch {
    addIssue("INVALID_JSON", "/ledger/path");
    return emit(2, makeEnvelope(false, null, null, null, issues, { asOf }));
  }

  // Invoke structural product-evidence validation
  try {
    const valRes = await deps.validateProductEvidence(ledgerData, {
      authorityRoot: canonicalAuthorityRoot,
      ledgerPath: ledgerRead.filePath,
      asOf,
      gate: "structural"
    });
    if (!valRes.valid) {
      addIssue("LEDGER_INVALID", "/ledger");
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }
  } catch {
    addIssue("LEDGER_INVALID", "/ledger");
    return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
  }

  // Exact current-record index. Lookup is current-only on purpose: a revision that exists
  // solely in record_history is history, is never current, and is rejected with no fallback.
  const currentRecords = new Map();
  for (const rec of (ledgerData.records || [])) {
    if (rec && typeof rec.id === "string" && typeof rec.revision === "string") {
      currentRecords.set(`${rec.id}:${rec.revision}`, rec);
    }
  }

  // Verify supplied sources: contained, hash-bound, unique by exact ref.
  const verifiedSourcesMap = new Map();
  for (let i = 0; i < input.sources.length; i++) {
    const src = input.sources[i];
    const srcKey = `${src.ref.id}:${src.ref.revision}`;
    if (verifiedSourcesMap.has(srcKey)) {
      addIssue("SCHEMA_ERROR", `/sources/${i}`);
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }
    const srcRead = readContainedFile(src.path, canonicalAuthorityRoot);
    if (!srcRead.ok) {
      addIssue(srcRead.code, `/sources/${i}/path`);
      return emit(2, makeEnvelope(false, null, null, null, issues, { asOf }));
    }
    const hash = sha256Hex(srcRead.buffer);
    if (hash !== src.sha256) {
      addIssue("HASH_MISMATCH", `/sources/${i}/sha256`);
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }
    verifiedSourcesMap.set(srcKey, {
      ref: src.ref,
      path: path.posix.normalize(src.path),
      sha256: hash,
      buffer: srcRead.buffer
    });
  }

  // Bind an exact ledger-available SRC id+revision to a verified source with matching locator SHA.
  // Historical-only revisions are explicitly rejected; there is no id-only fallback.
  function bindSourceRef(ref) {
    if (!ref || typeof ref.id !== "string" || typeof ref.revision !== "string") return null;
    const key = `${ref.id}:${ref.revision}`;
    const verified = verifiedSourcesMap.get(key);
    if (!verified) return null;
    const current = currentRecords.get(key);
    if (!current) return null;
    if (current.kind !== "SRC") return null;
    if (!current.data || current.data.status !== "available") return null;
    const locator = current.data.locator;
    if (!locator || typeof locator.path !== "string" || typeof locator.sha256 !== "string") return null;
    if (locator.sha256 !== verified.sha256) return null;
    if (path.posix.normalize(locator.path) !== verified.path) return null;
    return { record: current, source: verified };
  }

  // Validate metric bindings: exact current MET revision, exact current query SRC,
  // query_revision equal to that SRC's data.origin.revision, and locator-bound source.
  const mb = input.metric_bindings;
  const REQUIRED_BINDINGS = ["activation", "repeat_rate", "cash_per_activation", "cash_per_repeat", "hours_per_repeat"];
  for (const reqB of REQUIRED_BINDINGS) {
    const binding = mb[reqB];
    const rec = currentRecords.get(`${binding.id}:${binding.revision}`);
    if (!rec || rec.kind !== "MET") {
      addIssue("OBSOLETE_BINDING", `/metric_bindings/${reqB}`);
      continue;
    }
    const query = rec.data?.query;
    if (!query || typeof query.id !== "string" || typeof query.revision !== "string") {
      addIssue("OBSOLETE_BINDING", `/metric_bindings/${reqB}`);
      continue;
    }
    const queryRec = currentRecords.get(`${query.id}:${query.revision}`);
    if (!queryRec || queryRec.kind !== "SRC") {
      addIssue("OBSOLETE_BINDING", `/metric_bindings/${reqB}`);
      continue;
    }
    if (rec.data.query_revision !== queryRec.data?.origin?.revision) {
      addIssue("OBSOLETE_BINDING", `/metric_bindings/${reqB}`);
      continue;
    }
    if (!bindSourceRef(query)) {
      addIssue("OBSOLETE_BINDING", `/metric_bindings/${reqB}`);
    }
  }

  if (issues.length > 0) {
    return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
  }

  // Validate investment file and cost_mapping if present
  let investmentBaseScenario = null;
  let investmentCurrency = "USD";
  let investmentScale = 2;
  let investmentBaseResult = null;
  let verifiedInvestmentHash = null;

  if (input.investment) {
    const invRead = readContainedFile(input.investment.path, canonicalAuthorityRoot);
    if (!invRead.ok) {
      addIssue(invRead.code, "/investment/path");
      return emit(2, makeEnvelope(false, null, null, null, issues, { asOf }));
    }
    const invHash = sha256Hex(invRead.buffer);
    if (invHash !== input.investment.sha256) {
      addIssue("HASH_MISMATCH", "/investment/sha256");
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }
    verifiedInvestmentHash = invHash;

    let invData;
    try {
      invData = JSON.parse(invRead.buffer.toString("utf-8"));
    } catch {
      addIssue("INVALID_JSON", "/investment/path");
      return emit(2, makeEnvelope(false, null, null, null, issues, { asOf }));
    }

    investmentCurrency = typeof invData.currency === "string" && invData.currency.length > 0 ? invData.currency : "USD";
    if (Number.isInteger(invData.money_scale) && invData.money_scale >= 0 && invData.money_scale <= 4) {
      investmentScale = invData.money_scale;
    }

    try {
      const invOutput = deps.evaluateInvestment(invData);
      if (invOutput.issues && invOutput.issues.length > 0) {
        addIssue("INVESTMENT_INVALID", "/investment");
        return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
      }
      investmentBaseResult = (invOutput.results || []).find(r => r.scenario_id === "base") || null;
    } catch {
      addIssue("INVESTMENT_INVALID", "/investment");
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }

    investmentBaseScenario = (invData.scenarios || []).find(s => s.id === "base") || null;
  }

  if (input.cost_mapping) {
    const cm = input.cost_mapping;
    if (cm.window.start !== campaign.cost_window.start || cm.window.end !== campaign.cost_window.end) {
      addIssue("WINDOW_MISMATCH", "/cost_mapping/window");
    }

    // cost_mapping.source must be an exact, available, locator-bound SRC revision.
    if (!bindSourceRef(cm.source)) {
      addIssue("OBSOLETE_BINDING", "/cost_mapping/source");
    }

    // Check unique item IDs and non-overlapping sets
    const cashIdSet = new Set();
    for (const cId of cm.cash_item_ids || []) {
      if (cashIdSet.has(cId)) {
        addIssue("ITEM_OVERLAP", "/cost_mapping/cash_item_ids");
        break;
      }
      cashIdSet.add(cId);
    }

    const hourIdSet = new Set();
    for (const hId of cm.consumed_hour_item_ids || []) {
      if (hourIdSet.has(hId) || cashIdSet.has(hId)) {
        addIssue("ITEM_OVERLAP", "/cost_mapping/consumed_hour_item_ids");
        break;
      }
      hourIdSet.add(hId);
    }

    if (!investmentBaseScenario) {
      addIssue("INVESTMENT_INVALID", "/cost_mapping");
    } else {
      const itemMap = new Map((investmentBaseScenario.items || []).map(it => [it.id, it]));
      for (const cId of cashIdSet) {
        const it = itemMap.get(cId);
        if (!it) {
          addIssue("ITEM_NOT_FOUND", "/cost_mapping/cash_item_ids");
        } else if (it.side !== "cost" || it.basis !== "cash_cost") {
          addIssue("ITEM_BASIS_MISMATCH", "/cost_mapping/cash_item_ids");
        }
      }
      for (const hId of hourIdSet) {
        const it = itemMap.get(hId);
        if (!it) {
          addIssue("ITEM_NOT_FOUND", "/cost_mapping/consumed_hour_item_ids");
        } else if ((it.side !== "cost" && it.side !== "capacity") || it.basis !== "capacity_hours") {
          addIssue("ITEM_BASIS_MISMATCH", "/cost_mapping/consumed_hour_item_ids");
        }
      }
    }
  }

  if (issues.length > 0) {
    return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
  }

  // Cohort validation and calculation
  let counts = null;
  let measures = null;
  let attribution = "unknown";

  if (input.cohort === null) {
    attribution = "unknown";
    counts = {
      eligible_starters: null,
      activated: null,
      immature_activated: null,
      mature_activated: null,
      confirmed_repeat_all: null,
      mature_confirmed_repeat: null,
      mature_confirmed_no_return: null,
      mature_unknown: null,
      excluded_participants: null,
      duplicate_reports: null
    };
  } else {
    attribution = "descriptive";
    const cohort = input.cohort;

    // cohort.source must be an exact, available, locator-bound SRC revision.
    if (!bindSourceRef(cohort.source)) {
      addIssue("OBSOLETE_BINDING", "/cohort/source");
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }

    // Participants: check uniqueness and consent
    const participantKeys = new Set();
    const eligibleParticipants = new Set();
    let excludedCount = 0;

    for (let i = 0; i < (cohort.participants || []).length; i++) {
      const p = cohort.participants[i];
      if (participantKeys.has(p.participant_key)) {
        addIssue("DUPLICATE_PARTICIPANT", `/cohort/participants/${i}`);
      }
      participantKeys.add(p.participant_key);

      if (p.role === "external" && p.consent === "granted") {
        eligibleParticipants.add(p.participant_key);
      } else {
        excludedCount++;
      }
    }

    if (issues.length > 0) {
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }

    // Step: Exclude non-eligible participants BEFORE deduplication & conflict checking
    const rawReports = cohort.reports || [];
    const eligibleReports = [];
    for (const r of rawReports) {
      if (eligibleParticipants.has(r.participant_key)) {
        eligibleReports.push(r);
      }
    }

    // Deduplicate and validate eligible reports
    const reportIdMap = new Map();
    let duplicateReportsCount = 0;
    const collapsedReports = [];

    for (let i = 0; i < eligibleReports.length; i++) {
      const r = eligibleReports[i];
      if (new Date(r.occurred_at) > new Date(r.reported_at)) {
        addIssue("REPORT_TIME_INVALID", `/cohort/reports/${i}`);
        continue;
      }

      // Check task_ref for activation and repeat
      if (r.kind === "activation" || r.kind === "repeat") {
        if (!r.task_ref || !bindSourceRef(r.task_ref)) {
          addIssue("TASK_REF_MISSING", `/cohort/reports/${i}`);
          continue;
        }
      }

      if (reportIdMap.has(r.report_id)) {
        const existing = reportIdMap.get(r.report_id);
        const taskRefMatch = (r.task_ref === null && existing.task_ref === null) ||
          (r.task_ref?.id === existing.task_ref?.id && r.task_ref?.revision === existing.task_ref?.revision);

        if (
          existing.participant_key === r.participant_key &&
          existing.kind === r.kind &&
          existing.occurred_at === r.occurred_at &&
          existing.reported_at === r.reported_at &&
          taskRefMatch
        ) {
          duplicateReportsCount++;
          continue; // Identical duplicate collapses
        } else {
          addIssue("CONFLICTING_REPORT", `/cohort/reports/${i}`);
          continue;
        }
      }

      reportIdMap.set(r.report_id, r);
      collapsedReports.push(r);
    }

    if (issues.length > 0) {
      return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
    }

    // Filter reports to effective cutoff
    const asOfTime = new Date(asOf).getTime();
    const coverageEndTime = new Date(cohort.coverage_end).getTime();
    const effectiveCutoffTime = Math.min(asOfTime, coverageEndTime);

    const acqStart = new Date(campaign.acquisition_window.start).getTime();
    const acqEnd = new Date(campaign.acquisition_window.end).getTime();

    // Group reports by participant
    const reportsByParticipant = new Map();
    for (const pKey of eligibleParticipants) {
      reportsByParticipant.set(pKey, []);
    }

    for (const r of collapsedReports) {
      const occTime = new Date(r.occurred_at).getTime();
      const repTime = new Date(r.reported_at).getTime();
      if (repTime > asOfTime) continue; // late reported
      if (occTime > effectiveCutoffTime) continue; // occurred after cutoff

      reportsByParticipant.get(r.participant_key).push({
        ...r,
        occTime
      });
    }

    // Compute participant metrics
    let eligibleStartersCount = 0;
    let activatedCount = 0;
    let matureActivatedCount = 0;
    let immatureActivatedCount = 0;
    let confirmedRepeatAllCount = 0;
    let matureConfirmedRepeatCount = 0;
    let matureConfirmedNoReturnCount = 0;
    let matureUnknownCount = 0;

    for (const [pKey, pReports] of reportsByParticipant.entries()) {
      // Find starters in acquisition window
      const starters = pReports
        .filter(r => r.kind === "starter" && r.occTime >= acqStart && r.occTime < acqEnd)
        .sort((a, b) => a.occTime - b.occTime);

      if (starters.length > 0) {
        eligibleStartersCount++;
      }

      // Find qualifying activations
      const activations = pReports
        .filter(r => r.kind === "activation" && r.occTime >= acqStart && r.occTime < acqEnd)
        .sort((a, b) => a.occTime - b.occTime);

      let earliestQualifyingActivation = null;
      for (const act of activations) {
        // Starter must not follow activation
        const earlierStarters = starters.filter(s => s.occTime <= act.occTime);
        if (earlierStarters.length > 0) {
          earliestQualifyingActivation = act;
          break;
        }
      }

      if (!earliestQualifyingActivation) continue;
      activatedCount++;

      const aTime = earliestQualifyingActivation.occTime;
      const aDateUtc = earliestQualifyingActivation.occurred_at.slice(0, 10);
      const maturityTime = aTime + 14 * 24 * 3600 * 1000;
      const isMature = effectiveCutoffTime >= maturityTime;

      if (isMature) {
        matureActivatedCount++;
      } else {
        immatureActivatedCount++;
      }

      // Check repeats
      const repeats = pReports.filter(r => {
        if (r.kind !== "repeat") return false;
        if (r.occTime <= aTime || r.occTime > aTime + 14 * 24 * 3600 * 1000) return false;
        const repDateUtc = r.occurred_at.slice(0, 10);
        return repDateUtc !== aDateUtc;
      });

      const hasQualifyingRepeat = repeats.length > 0;
      if (hasQualifyingRepeat) {
        confirmedRepeatAllCount++;
        if (isMature) {
          matureConfirmedRepeatCount++;
        }
      }

      // Check full-window no-return
      const noReturns = pReports.filter(r => {
        if (r.kind !== "no_return") return false;
        return r.occTime >= maturityTime;
      });
      const hasFullWindowNoReturn = noReturns.length > 0;

      if (isMature) {
        if (hasQualifyingRepeat && hasFullWindowNoReturn) {
          addIssue("CONTRADICTORY_REPORTS", "/");
          return emit(1, makeEnvelope(false, null, null, null, issues, { asOf }));
        }
        if (!hasQualifyingRepeat) {
          if (hasFullWindowNoReturn) {
            matureConfirmedNoReturnCount++;
          } else {
            matureUnknownCount++;
          }
        }
      }
    }

    counts = {
      eligible_starters: eligibleStartersCount,
      activated: activatedCount,
      immature_activated: immatureActivatedCount,
      mature_activated: matureActivatedCount,
      confirmed_repeat_all: confirmedRepeatAllCount,
      mature_confirmed_repeat: matureConfirmedRepeatCount,
      mature_confirmed_no_return: matureConfirmedNoReturnCount,
      mature_unknown: matureUnknownCount,
      excluded_participants: excludedCount,
      duplicate_reports: duplicateReportsCount
    };
  }

  // Compute measures
  measures = computeMeasures(counts, input, investmentBaseScenario, investmentScale, investmentCurrency, investmentBaseResult);

  // Clean context without copying untrusted nested keys
  const context = {
    scenario: "base",
    acquisition_window: {
      start: campaign.acquisition_window.start,
      end: campaign.acquisition_window.end
    },
    cost_window: {
      start: campaign.cost_window.start,
      end: campaign.cost_window.end
    },
    observation_cutoff: input.cohort
      ? new Date(Math.min(new Date(asOf).getTime(), new Date(input.cohort.coverage_end).getTime())).toISOString().replace(/\.\d{3}Z$/, "Z")
      : asOf,
    follow_up_days: 14,
    baseline_status: "unknown"
  };

  // Public projection is generated only from validated designations and verified artifact hashes.
  const aliasMap = new Map();
  if (input.public_projection) {
    for (const aliasEntry of input.public_projection.source_aliases) {
      aliasMap.set(`${aliasEntry.ref.id}:${aliasEntry.ref.revision}`, aliasEntry.alias);
    }
  }
  const provenance = [
    { alias: "ledger", sha256: actualLedgerHash }
  ];
  if (verifiedInvestmentHash) {
    provenance.push({ alias: "investment", sha256: verifiedInvestmentHash });
  }
  for (const [sourceKey, verified] of verifiedSourcesMap) {
    const alias = aliasMap.get(sourceKey) || "unavailable";
    provenance.push({ alias, sha256: verified.sha256 });
  }

  const publicData = {
    synthetic: input.synthetic,
    campaign_id: input.public_projection ? input.public_projection.campaign_id : null,
    input_revision: input.public_projection ? input.public_projection.input_revision : null,
    provenance
  };

  return emit(0, makeEnvelope(true, context, counts, measures, issues, { asOf }, publicData, attribution));
}

function computeMeasures(counts, input, investmentBaseScenario, investmentScale, investmentCurrency, investmentBaseResult) {
  // Activation Rate
  let activationRate;
  if (!counts || counts.eligible_starters === null) {
    activationRate = { status: "unavailable", value: null, unit: "ratio", reason: "cohort_unavailable" };
  } else if (counts.eligible_starters === 0) {
    activationRate = { status: "unavailable", value: null, unit: "ratio", reason: "zero_starter_denominator" };
  } else {
    activationRate = {
      status: "available",
      value: formatRational(BigInt(counts.activated), BigInt(counts.eligible_starters), 6),
      unit: "ratio",
      reason: null
    };
  }

  // Repeat Rate
  let repeatRate;
  if (!counts || counts.mature_activated === null) {
    repeatRate = { status: "unavailable", value: null, unit: "ratio", reason: "cohort_unavailable" };
  } else if (counts.mature_activated === 0) {
    repeatRate = { status: "unavailable", value: null, unit: "ratio", reason: "zero_mature_denominator" };
  } else {
    repeatRate = {
      status: "available",
      value: formatRational(BigInt(counts.mature_confirmed_repeat), BigInt(counts.mature_activated), 6),
      unit: "ratio",
      reason: null
    };
  }

  // Financial costs mapping using exact investment scale and currency
  const costMapping = input.cost_mapping;
  let cashTotalMinor = null;
  let hoursTotalMinor = null;
  const scaleDivisor = 10n ** BigInt(investmentScale);

  if (costMapping && investmentBaseScenario) {
    const itemMap = new Map((investmentBaseScenario.items || []).map(it => [it.id, it]));

    if (costMapping.cash_complete) {
      let sum = 0n;
      let valid = true;
      for (const id of costMapping.cash_item_ids) {
        const it = itemMap.get(id);
        if (!it || it.amount === null) {
          valid = false;
          break;
        }
        const minor = parseDecimalToScale(it.amount, investmentScale);
        if (minor === null) {
          valid = false;
          break;
        }
        sum += minor;
      }
      if (valid && costMapping.cash_item_ids.length > 0) {
        cashTotalMinor = sum;
      }
    }

    if (costMapping.hours_complete) {
      let sum = 0n;
      let valid = true;
      for (const id of costMapping.consumed_hour_item_ids) {
        const it = itemMap.get(id);
        if (!it || it.amount === null) {
          valid = false;
          break;
        }
        const minor = parseDecimalToScale(it.amount, HOURS_SCALE);
        if (minor === null) {
          valid = false;
          break;
        }
        sum += minor;
      }
      if (valid && costMapping.consumed_hour_item_ids.length > 0) {
        hoursTotalMinor = sum;
      }
    }
  }

  // Cash total measure
  let cashTotal;
  if (cashTotalMinor !== null) {
    cashTotal = {
      status: "available",
      value: formatRational(cashTotalMinor, scaleDivisor, 6),
      unit: investmentCurrency,
      reason: null
    };
  } else {
    cashTotal = {
      status: "unavailable",
      value: null,
      unit: investmentCurrency,
      reason: "unknown_cost"
    };
  }

  // Hours total measure
  let hoursTotal;
  if (hoursTotalMinor !== null) {
    hoursTotal = {
      status: "available",
      value: formatRational(hoursTotalMinor, 10n ** BigInt(HOURS_SCALE), 6),
      unit: "hours",
      reason: null
    };
  } else {
    hoursTotal = {
      status: "unavailable",
      value: null,
      unit: "hours",
      reason: "unknown_cost"
    };
  }

  // Cash per activation
  let cashPerActivation;
  if (cashTotal.status === "unavailable") {
    cashPerActivation = { status: "unavailable", value: null, unit: `${investmentCurrency}/activation`, reason: "unknown_cost" };
  } else if (!counts || counts.activated === null) {
    cashPerActivation = { status: "unavailable", value: null, unit: `${investmentCurrency}/activation`, reason: "cohort_unavailable" };
  } else if (counts.activated === 0) {
    cashPerActivation = { status: "unavailable", value: null, unit: `${investmentCurrency}/activation`, reason: "zero_activation_denominator" };
  } else {
    cashPerActivation = {
      status: "available",
      value: formatRational(cashTotalMinor, BigInt(counts.activated) * scaleDivisor, 6),
      unit: `${investmentCurrency}/activation`,
      reason: null
    };
  }

  // Cash per repeat
  let cashPerRepeat;
  if (cashTotal.status === "unavailable") {
    cashPerRepeat = { status: "unavailable", value: null, unit: `${investmentCurrency}/repeat`, reason: "unknown_cost" };
  } else if (!counts || counts.mature_confirmed_repeat === null) {
    cashPerRepeat = { status: "unavailable", value: null, unit: `${investmentCurrency}/repeat`, reason: "cohort_unavailable" };
  } else if (counts.mature_confirmed_repeat === 0) {
    cashPerRepeat = { status: "unavailable", value: null, unit: `${investmentCurrency}/repeat`, reason: "zero_repeat_denominator" };
  } else {
    cashPerRepeat = {
      status: "available",
      value: formatRational(cashTotalMinor, BigInt(counts.mature_confirmed_repeat) * scaleDivisor, 6),
      unit: `${investmentCurrency}/repeat`,
      reason: null
    };
  }

  // Hours per repeat
  let hoursPerRepeat;
  if (hoursTotal.status === "unavailable") {
    hoursPerRepeat = { status: "unavailable", value: null, unit: "hours/repeat", reason: "unknown_cost" };
  } else if (!counts || counts.mature_confirmed_repeat === null) {
    hoursPerRepeat = { status: "unavailable", value: null, unit: "hours/repeat", reason: "cohort_unavailable" };
  } else if (counts.mature_confirmed_repeat === 0) {
    hoursPerRepeat = { status: "unavailable", value: null, unit: "hours/repeat", reason: "zero_repeat_denominator" };
  } else {
    hoursPerRepeat = {
      status: "available",
      value: formatRational(hoursTotalMinor, BigInt(counts.mature_confirmed_repeat) * (10n ** BigInt(HOURS_SCALE)), 6),
      unit: "hours/repeat",
      reason: null
    };
  }

  // Financial ROI: reuse canonical investment calculator result directly
  let financialRoi;
  if (investmentBaseResult && investmentBaseResult.roi) {
    financialRoi = {
      status: investmentBaseResult.roi.status,
      value: investmentBaseResult.roi.value,
      unit: "ratio",
      reason: investmentBaseResult.roi.reason
    };
  } else if (cashTotal.status === "unavailable") {
    financialRoi = { status: "unavailable", value: null, unit: "ratio", reason: "unknown_cost" };
  } else if (cashTotalMinor === 0n) {
    financialRoi = { status: "undefined", value: null, unit: "ratio", reason: "zero_cost" };
  } else {
    financialRoi = { status: "unavailable", value: null, unit: "ratio", reason: "unknown_benefit" };
  }

  // Baseline
  const baseline = {
    status: "unavailable",
    value: null,
    unit: "ratio",
    reason: "baseline_unknown"
  };

  return {
    activation_rate: activationRate,
    repeat_rate: repeatRate,
    cash_total: cashTotal,
    hours_total: hoursTotal,
    cash_per_activation: cashPerActivation,
    cash_per_repeat: cashPerRepeat,
    hours_per_repeat: hoursPerRepeat,
    financial_roi: financialRoi,
    baseline
  };
}

function makeEnvelope(valid, context, counts, measures, issues, options, publicData = null, attribution = "unknown") {
  // Never echo tainted invalid asOf into public envelope
  const safeAsOf = isValidUtcInstant(options?.asOf) ? options.asOf : null;

  // Identity and provenance are only accepted from the validated public projection.
  const campaignId = typeof publicData?.campaign_id === "string" ? publicData.campaign_id : null;
  const inputRevision = typeof publicData?.input_revision === "string" ? publicData.input_revision : null;
  const provenance = Array.isArray(publicData?.provenance) ? publicData.provenance : [];
  const limitations = [SYNTHETIC_LIMITATION];
  if (campaignId === null || inputRevision === null) limitations.push(PUBLIC_IDENTITY_UNAVAILABLE);

  return {
    schema_version: 1,
    tool: "marketing-scorecard",
    synthetic: publicData ? Boolean(publicData.synthetic) : true,
    valid,
    as_of: safeAsOf,
    campaign_id: campaignId,
    input_revision: inputRevision,
    provenance,
    calculation: {
      revision: "1.0.0",
      sha256: getExecutableHash()
    },
    context,
    counts,
    measures,
    attribution,
    recommendation: "inconclusive",
    limitations,
    issues
  };
}

function renderMarkdown(envelope) {
  let md = "# Marketing Scorecard\n\n";
  const asOfStr = envelope.as_of ? ` (as of ${envelope.as_of})` : "";
  md += `> Synthetic offline contract scorecard${asOfStr}\n\n`;

  if (!envelope.valid) {
    md += "## Status: INVALID\n\n";
    md += "The provided input failed validation.\n\n### Issues\n";
    for (const iss of envelope.issues) {
      md += `- **${iss.code}** at \`${iss.path}\`: ${iss.message}\n`;
    }
    return md;
  }

  md += `**Campaign ID:** ${envelope.campaign_id || "null"}\n`;
  md += `**Input Revision:** ${envelope.input_revision || "null"}\n`;
  md += `**Attribution:** ${envelope.attribution}\n`;
  md += `**Recommendation:** ${envelope.recommendation}\n\n`;

  if (envelope.context) {
    md += "## Context\n";
    md += `- Scenario: ${envelope.context.scenario}\n`;
    md += `- Acquisition Window: ${envelope.context.acquisition_window.start} to ${envelope.context.acquisition_window.end}\n`;
    md += `- Cost Window: ${envelope.context.cost_window.start} to ${envelope.context.cost_window.end}\n`;
    md += `- Observation Cutoff: ${envelope.context.observation_cutoff}\n`;
    md += `- Follow-Up Days: ${envelope.context.follow_up_days}\n\n`;
  }

  if (envelope.counts) {
    md += "## Cohort Counts\n";
    md += `- Eligible Starters: ${envelope.counts.eligible_starters}\n`;
    md += `- Activated: ${envelope.counts.activated}\n`;
    md += `- Immature Activated: ${envelope.counts.immature_activated}\n`;
    md += `- Mature Activated: ${envelope.counts.mature_activated}\n`;
    md += `- Confirmed Repeat (All): ${envelope.counts.confirmed_repeat_all}\n`;
    md += `- Mature Confirmed Repeat: ${envelope.counts.mature_confirmed_repeat}\n`;
    md += `- Mature Confirmed No-Return: ${envelope.counts.mature_confirmed_no_return}\n`;
    md += `- Mature Unknown: ${envelope.counts.mature_unknown}\n`;
    md += `- Excluded Participants: ${envelope.counts.excluded_participants}\n`;
    md += `- Duplicate Reports (Collapsed): ${envelope.counts.duplicate_reports}\n\n`;
  }

  if (envelope.measures) {
    md += "## Measures\n";
    for (const [key, m] of Object.entries(envelope.measures)) {
      const valStr = m.status === "available" ? `${m.value} ${m.unit}` : `[${m.status}: ${m.reason}]`;
      md += `- **${key}**: ${valStr}\n`;
    }
    md += "\n";
  }

  if (envelope.provenance && envelope.provenance.length > 0) {
    md += "## Public Provenance\n";
    for (const p of envelope.provenance) {
      md += `- Alias: \`${p.alias}\`, SHA-256: \`${p.sha256}\`\n`;
    }
    md += "\n";
  }

  md += "## Limitations\n";
  for (const lim of envelope.limitations) {
    md += `- ${lim}\n`;
  }
  md += "\n";

  return md;
}

// CLI runner
async function main() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let authorityRoot = null;
  let asOf = null;
  let format = "json";

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--authority-root" && i + 1 < args.length) {
      authorityRoot = args[++i];
    } else if (a === "--as-of" && i + 1 < args.length) {
      asOf = args[++i];
    } else if (a === "--format" && i + 1 < args.length) {
      format = args[++i];
    } else if (!a.startsWith("-") && inputPath === null) {
      inputPath = a;
    }
  }

  const result = await runMarketingScorecard(inputPath, {
    authorityRoot,
    asOf,
    format
  });

  if (format === "markdown") {
    process.stdout.write(renderMarkdown(result.envelope));
  } else {
    process.stdout.write(JSON.stringify(result.envelope, null, 2) + "\n");
  }

  process.exit(result.exitCode);
}

let isDirectRun = false;
try {
  if (process.argv[1]) {
    isDirectRun = fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  }
} catch {
  isDirectRun = false;
}
if (isDirectRun) {
  main().catch(() => {
    const errEnvelope = makeEnvelope(false, null, null, null, [{
      code: "INTERNAL_ERROR",
      path: "/",
      message: ERROR_MESSAGES.INTERNAL_ERROR
    }], { asOf: null });
    process.stdout.write(JSON.stringify(errEnvelope, null, 2) + "\n");
    process.exit(4);
  });
}
