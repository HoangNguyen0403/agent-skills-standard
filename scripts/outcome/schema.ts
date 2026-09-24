// scripts/outcome/schema.ts
import fs from "fs-extra";
import path from "path";

const ROOT = path.join(__dirname, "..", "..");
const WORKFLOWS_DIR = path.join(ROOT, ".agents", "workflows");

/**
 * `feature_status` enum accepted by run records.
 *
 * These are the values the workflows themselves already author (verified by
 * grepping `^feature_status:` across `.agents/workflows/`), plus the two
 * terminal states the newly persisted post-verification workflows need.
 * Do not invent values here — the workflow markdown is the source of truth.
 */
export const FEATURE_STATUS_VALUES = [
  "not_started",
  "requirements_ready",
  "design_ready",
  "partially_implemented",
  "implemented",
  "verified",
  "released",
  "blocked",
] as const;
export type FeatureStatus = (typeof FEATURE_STATUS_VALUES)[number];

/** `cost.source` enum accepted by run records. */
export const COST_SOURCE_VALUES = ["host", "agent-estimate", "unavailable"] as const;
export type CostSource = (typeof COST_SOURCE_VALUES)[number];

export interface RequirementTrace {
  brd_objectives: string[];
  requirements: string[];
  acceptance_criteria: string[];
  srs: string[];
}

export interface RunCost {
  source: CostSource;
  prompt_tokens?: number;
  completion_tokens?: number;
  estimated_usd?: number;
}

export interface RunAgent {
  identity: string;
  model: string;
}

/** Canonical run-record shape (schema_version 1). See `artifacts/runs/<slug>/<compactISO>-<workflow>.json`. */
export interface RunRecord {
  schema_version: 1;
  run_id: string;
  slug: string;
  workflow: string;
  feature_status: FeatureStatus;
  started_at: string;
  completed_at: string;
  requirement_trace: RequirementTrace;
  completed_evidence: string[];
  missing_evidence: string[];
  decision_needed: string[];
  recommended_next_workflow: string | null;
  cost: RunCost;
  agent: RunAgent;
}

/** The required top-level keys every run record (and Outcome Report template) must declare. */
export const REQUIRED_TOP_LEVEL_KEYS: (keyof RunRecord)[] = [
  "schema_version",
  "run_id",
  "slug",
  "workflow",
  "feature_status",
  "started_at",
  "completed_at",
  "requirement_trace",
  "completed_evidence",
  "missing_evidence",
  "decision_needed",
  "recommended_next_workflow",
  "cost",
  "agent",
];

const REQUIRED_TRACE_KEYS: (keyof RequirementTrace)[] = [
  "brd_objectives",
  "requirements",
  "acceptance_criteria",
  "srs",
];

/** One validation problem found in a run record or template. */
export interface ValidationIssue {
  severity: "error" | "warn";
  file: string;
  message: string;
}

const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const PLACEHOLDER_PATTERNS = [/\*/, /<.*>/, /\[.*\]/, /\bTODO\b/i, /\bTBD\b/i];

const TRACE_ID_PATTERNS: Record<keyof RequirementTrace, RegExp> = {
  brd_objectives: /^BRD-OBJ-\d{3,}$/,
  requirements: /^REQ-\d{3,}$/,
  acceptance_criteria: /^AC-\d{3,}$/,
  srs: /^SRS-\d{3,}$/,
};

function isPlaceholder(value: string): boolean {
  if (value.trim() === "") return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateTraceIdArray(
  field: keyof RequirementTrace,
  value: unknown,
  sourcePath: string,
  issues: ValidationIssue[],
): void {
  if (!isStringArray(value)) {
    issues.push({
      severity: "error",
      file: sourcePath,
      message: `requirement_trace.${field} must be a string array`,
    });
    return;
  }
  const pattern = TRACE_ID_PATTERNS[field];
  for (const id of value) {
    if (isPlaceholder(id)) {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `requirement_trace.${field} contains an unfilled placeholder: "${id}"`,
      });
      continue;
    }
    if (!pattern.test(id)) {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `requirement_trace.${field} id "${id}" does not match ${pattern}`,
      });
    }
  }
}

function validateRequirementTrace(
  value: unknown,
  sourcePath: string,
  issues: ValidationIssue[],
): void {
  if (!isPlainObject(value)) {
    issues.push({ severity: "error", file: sourcePath, message: "requirement_trace must be an object" });
    return;
  }
  for (const key of REQUIRED_TRACE_KEYS) {
    if (!(key in value)) {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `requirement_trace missing required field "${key}"`,
      });
      continue;
    }
    validateTraceIdArray(key, value[key], sourcePath, issues);
  }
}

function validateCost(value: unknown, sourcePath: string, issues: ValidationIssue[]): void {
  if (!isPlainObject(value)) {
    issues.push({ severity: "error", file: sourcePath, message: "cost must be an object" });
    return;
  }
  const source = value.source;
  if (typeof source !== "string" || !COST_SOURCE_VALUES.includes(source as CostSource)) {
    issues.push({
      severity: "error",
      file: sourcePath,
      message: `cost.source must be one of ${COST_SOURCE_VALUES.join(", ")}, got ${JSON.stringify(source)}`,
    });
    return;
  }

  if (source === "unavailable") {
    for (const field of ["prompt_tokens", "completion_tokens", "estimated_usd"] as const) {
      if (value[field] !== undefined) {
        issues.push({
          severity: "error",
          file: sourcePath,
          message: `cost.${field} must be absent when cost.source is "unavailable" (report unavailable, never estimate)`,
        });
      }
    }
    return;
  }

  // source is "host" or "agent-estimate": prompt_tokens/completion_tokens are required.
  for (const field of ["prompt_tokens", "completion_tokens"] as const) {
    if (typeof value[field] !== "number") {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `cost.${field} is required and must be a number when cost.source is "${source}"`,
      });
    }
  }
  if (value.estimated_usd !== undefined && typeof value.estimated_usd !== "number") {
    issues.push({ severity: "error", file: sourcePath, message: "cost.estimated_usd must be a number" });
  }
}

function validateAgent(value: unknown, sourcePath: string, issues: ValidationIssue[]): void {
  if (!isPlainObject(value)) {
    issues.push({ severity: "error", file: sourcePath, message: "agent must be an object" });
    return;
  }
  for (const field of ["identity", "model"] as const) {
    if (typeof value[field] !== "string" || value[field] === "") {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `agent.${field} is required and must be a non-empty string`,
      });
    }
  }
}

/**
 * Validates a parsed run-record JSON value against the canonical schema
 * (schema_version 1). Returns every problem found; an empty array means
 * the record is valid.
 */
export function validateRunRecord(value: unknown, sourcePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(value)) {
    return [{ severity: "error", file: sourcePath, message: "run record must be a JSON object" }];
  }

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in value)) {
      issues.push({ severity: "error", file: sourcePath, message: `missing required field "${key}"` });
    }
  }

  if ("schema_version" in value && value.schema_version !== 1) {
    issues.push({
      severity: "error",
      file: sourcePath,
      message: `schema_version must be 1, got ${JSON.stringify(value.schema_version)}`,
    });
  }

  for (const field of ["run_id", "slug", "workflow"] as const) {
    if (field in value && (typeof value[field] !== "string" || isPlaceholder(value[field] as string))) {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `${field} must be a non-empty, non-placeholder string`,
      });
    }
  }

  if ("feature_status" in value) {
    const status = value.feature_status;
    if (typeof status !== "string" || !FEATURE_STATUS_VALUES.includes(status as FeatureStatus)) {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `feature_status must be one of ${FEATURE_STATUS_VALUES.join(", ")}, got ${JSON.stringify(status)}`,
      });
    }
  }

  let startedAt: Date | null = null;
  let completedAt: Date | null = null;
  for (const [field, setter] of [
    ["started_at", (d: Date) => (startedAt = d)],
    ["completed_at", (d: Date) => (completedAt = d)],
  ] as const) {
    if (!(field in value)) continue;
    const raw = value[field];
    if (typeof raw !== "string" || !ISO_8601_RE.test(raw)) {
      issues.push({
        severity: "error",
        file: sourcePath,
        message: `${field} must be an ISO-8601 UTC timestamp (e.g. 2026-09-22T10:41:00Z), got ${JSON.stringify(raw)}`,
      });
      continue;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      issues.push({ severity: "error", file: sourcePath, message: `${field} is not a valid timestamp` });
      continue;
    }
    setter(parsed);
  }
  if (startedAt && completedAt && (completedAt as Date) < (startedAt as Date)) {
    issues.push({
      severity: "error",
      file: sourcePath,
      message: "completed_at must be greater than or equal to started_at",
    });
  }

  if ("requirement_trace" in value) {
    validateRequirementTrace(value.requirement_trace, sourcePath, issues);
  }

  for (const field of ["completed_evidence", "missing_evidence", "decision_needed"] as const) {
    if (field in value && !isStringArray(value[field])) {
      issues.push({ severity: "error", file: sourcePath, message: `${field} must be a string array` });
    }
  }

  if ("recommended_next_workflow" in value) {
    const next = value.recommended_next_workflow;
    if (next !== null) {
      if (typeof next !== "string" || next === "") {
        issues.push({
          severity: "error",
          file: sourcePath,
          message: "recommended_next_workflow must be null or a non-empty string",
        });
      } else if (!fs.existsSync(path.join(WORKFLOWS_DIR, `${next}.md`))) {
        issues.push({
          severity: "error",
          file: sourcePath,
          message: `recommended_next_workflow "${next}" does not name a file in .agents/workflows/`,
        });
      }
    }
  }

  if ("cost" in value) {
    validateCost(value.cost, sourcePath, issues);
  }

  if ("agent" in value) {
    validateAgent(value.agent, sourcePath, issues);
  }

  return issues;
}
