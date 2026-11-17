// scripts/metrics/delivery.ts
//
// Design contract D: direct delivery observations are an authorized local export
// (`artifacts/metrics/delivery-observations.json`), separate from RunRecord
// discovery. Nothing here reads the network, infers a human cost from elapsed
// time, or treats missing coverage as zero.
//
// Corrective round 1 (M1-M8):
// - cohort totals are bounded by the accepted change's submission/attempt/revision
//   lifecycle and end at acceptance; later work and later revisions never enter it;
// - a metric is `complete` only when declared kind+revision coverage spans the whole
//   linked lifecycle (merged intervals), never a point around an observed event;
// - events are canonicalized by domain identity before aggregation, so equivalent
//   replays collapse and conflicting duplicates reject the export deterministically;
// - measured DORA populations use domain dates and are defined before coverage
//   filtering; incomplete applicable coverage yields a partial observation count or
//   unavailable, never a complete rate.

import fs from "fs";
import path from "path";
import {
  DISPATCH_KINDS,
  canonicalizeDispatchEvent,
  dispatchDomainIdentity,
  isDispatchEvent,
  isDispatchKind,
  validateDispatchEvent,
  validateDispatchInvariants,
} from "./dispatch";
import type { GitPeriod } from "./git";
import type {
  AcceptanceEvent,
  AvailableMetric,
  CorrectionEvent,
  CostEvent,
  DecisionWaitEvent,
  DefectEvent,
  DeliveryCoverage,
  DeliveryEvent,
  DeliveryEventKind,
  DeliveryHealthRow,
  DeliveryIndicators,
  DeliveryObservationFile,
  DeliveryObservationSet,
  DeploymentEvent,
  ReviewEvent,
  StageIndicatorRow,
  SubmissionEvent,
  TrustClass,
  TrustCoverage,
  TrustCoverageKind,
  TrustObservationBlock,
  TrustPopulation,
  TrustPopulationKind,
  TrustRecord,
  ReviewerConfiguration,
  UnavailableMetric,
} from "./types";

export const DELIVERY_OBSERVATIONS_PATH = path.posix.join("artifacts", "metrics", "delivery-observations.json");

const OBS_SOURCE = DELIVERY_OBSERVATIONS_PATH;
const TREND = "unavailable (no comparable previous-period cohort coverage in the export)";
const MS_PER_HOUR = 3_600_000;

const EVENT_KINDS: DeliveryEventKind[] = [
  "review",
  "decision-wait",
  "submission",
  "correction",
  "acceptance",
  "deployment",
  "defect",
  "cost",
  ...DISPATCH_KINDS,
];

/** Kinds whose observations describe the pre-acceptance work lifecycle. */
const LIFECYCLE_KINDS: DeliveryEventKind[] = [
  "review",
  "decision-wait",
  "correction",
  "cost",
  "submission",
  "acceptance",
];

// ---------------------------------------------------------------------------
// Parsing and validation
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const UTC_ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|\+00:00)$/;

/** Strict UTC ISO-8601 calendar validation; rejects normalized impossibilities like `2026-02-30`. */
function utcDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const match = UTC_ISO_RE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millis = match[7] ? Number(match[7].padEnd(3, "0")) : 0;
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return undefined;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millis));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Order-independent serialization used to compare equivalent domain payloads. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled delivery event kind: ${String(value)}`);
}

/** Domain identity of an event: distinct IDs must not double-count the same real observation. */
function domainIdentity(event: DeliveryEvent): { key: string; label: string } {
  if (isDispatchEvent(event)) return dispatchDomainIdentity(event);
  switch (event.kind) {
    case "review":
      return { key: `review|${event.session_id}`, label: `review session "${event.session_id}"` };
    case "decision-wait":
      return { key: `decision-wait|${event.decision_id}`, label: `decision "${event.decision_id}"` };
    case "submission":
      return {
        key: `submission|${event.change_id}|${event.attempt}`,
        label: `submission attempt ${event.attempt} of change "${event.change_id}"`,
      };
    case "correction":
      return {
        key: `correction|${event.change_id}|${event.round_id}`,
        label: `correction round "${event.round_id}" of change "${event.change_id}"`,
      };
    case "acceptance":
      return {
        key: `acceptance|${event.change_id}|${event.attempt}|${event.revision}`,
        label: `acceptance tuple ${event.change_id}/${event.attempt}/${event.revision}`,
      };
    case "deployment":
      return { key: `deployment|${event.deployment_id}`, label: `deployment "${event.deployment_id}"` };
    case "defect":
      return {
        key: `defect|${event.deployment_id}|${event.detected_at}`,
        label: `defect of deployment "${event.deployment_id}" detected at ${event.detected_at}`,
      };
    case "cost":
      return { key: `cost|${event.charge_id}`, label: `charge "${event.charge_id}"` };
    default:
      return assertNever(event);
  }
}

function validateCoverage(raw: unknown): string | undefined {
  if (!isRecord(raw)) return "must be an object";
  if (!nonEmptyString(raw.change_id)) return "change_id must be a non-empty string";
  if (!Array.isArray(raw.revisions) || raw.revisions.length === 0 || !raw.revisions.every(nonEmptyString)) {
    return "revisions must be a non-empty array of non-empty strings";
  }
  const from = utcDate(raw.from);
  const through = utcDate(raw.through);
  if (!from) return "from must be a UTC ISO timestamp";
  if (!through) return "through must be a UTC ISO timestamp";
  if (from.getTime() > through.getTime()) return "from must not be after through";
  if (
    !Array.isArray(raw.kinds) ||
    raw.kinds.length === 0 ||
    !raw.kinds.every((kind) => EVENT_KINDS.includes(kind as DeliveryEventKind))
  ) {
    return `kinds must be a non-empty array of: ${EVENT_KINDS.join(", ")}`;
  }
  if (typeof raw.complete !== "boolean") return "complete must be a boolean";
  return undefined;
}

function validateEvent(raw: unknown): string[] {
  if (!isRecord(raw)) return ["must be an object"];
  const dispatchProblems = validateDispatchEvent(raw, utcDate);
  if (dispatchProblems) return dispatchProblems;
  const problems: string[] = [];
  for (const field of ["id", "change_id", "revision", "source_ref"]) {
    if (!nonEmptyString(raw[field])) problems.push(`${field} must be a non-empty string`);
  }
  if (!utcDate(raw.observed_at)) problems.push("observed_at must be a valid UTC ISO timestamp");
  if (problems.length > 0) return problems;

  const datePair = (startField: string, endField: string): void => {
    const start = utcDate(raw[startField]);
    const end = utcDate(raw[endField]);
    if (!start) problems.push(`${startField} must be a valid UTC ISO timestamp`);
    if (!end) problems.push(`${endField} must be a valid UTC ISO timestamp`);
    if (start && end && start.getTime() > end.getTime()) problems.push(`${startField} must not be after ${endField}`);
  };

  switch (raw.kind) {
    case "review":
      if (!nonEmptyString(raw.session_id)) problems.push("session_id must be a non-empty string");
      if (!finiteNonNegative(raw.active_seconds)) problems.push("active_seconds must be a finite non-negative number");
      break;
    case "decision-wait": {
      if (!nonEmptyString(raw.decision_id)) problems.push("decision_id must be a non-empty string");
      const opened = utcDate(raw.opened_at);
      if (!opened) problems.push("opened_at must be a valid UTC ISO timestamp");
      if (raw.resolved_at === null) break;
      const resolved = utcDate(raw.resolved_at);
      if (!resolved) {
        problems.push("resolved_at must be a valid UTC ISO timestamp or null");
        break;
      }
      if (opened && resolved.getTime() < opened.getTime()) problems.push("resolved_at must not precede opened_at");
      break;
    }
    case "submission":
    case "acceptance": {
      if (!positiveInteger(raw.attempt)) problems.push("attempt must be a positive integer");
      if (raw.kind === "acceptance") {
        if (raw.decision !== "accepted" && raw.decision !== "rejected") {
          problems.push('decision must be "accepted" or "rejected"');
        }
        if (!nonEmptyString(raw.authority_ref)) problems.push("authority_ref must be a non-empty string");
      }
      break;
    }
    case "correction":
      if (!nonEmptyString(raw.round_id)) problems.push("round_id must be a non-empty string");
      break;
    case "deployment":
      if (!nonEmptyString(raw.deployment_id)) problems.push("deployment_id must be a non-empty string");
      if (raw.environment !== "production") problems.push('environment must be "production"');
      datePair("first_change_at", "deployed_at");
      break;
    case "defect": {
      if (!nonEmptyString(raw.deployment_id)) problems.push("deployment_id must be a non-empty string");
      if (raw.remediation !== "hotfix" && raw.remediation !== "rollback" && raw.remediation !== "none") {
        problems.push('remediation must be "hotfix", "rollback", or "none"');
      }
      const detected = utcDate(raw.detected_at);
      if (!detected) problems.push("detected_at must be a valid UTC ISO timestamp");
      if (raw.restored_at !== null) {
        const restored = utcDate(raw.restored_at);
        if (!restored) problems.push("restored_at must be a valid UTC ISO timestamp or null");
        else if (detected && restored.getTime() < detected.getTime()) {
          problems.push("restored_at must not precede detected_at");
        }
      }
      break;
    }
    case "cost":
      if (!nonEmptyString(raw.charge_id)) problems.push("charge_id must be a non-empty string");
      if (typeof raw.currency !== "string" || !/^[A-Z]{3}$/.test(raw.currency)) {
        problems.push("currency must be a three-letter uppercase code");
      }
      if (!finiteNonNegative(raw.amount)) problems.push("amount must be a finite non-negative number");
      if (raw.component !== "agent" && raw.component !== "human" && raw.component !== "tooling") {
        problems.push('component must be "agent", "human", or "tooling"');
      }
      break;
    default:
      problems.push(`kind must be one of: ${EVENT_KINDS.join(", ")}`);
  }
  return problems;
}

function withoutId(raw: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...raw };
  delete copy.id;
  return copy;
}

const TRUST_RECORD_KINDS: TrustRecord["kind"][] = ["revision-class", "agent-review", "human-finding", "seed-assignment", "seed-result", "grant-reference"];
const TRUST_POPULATION_KINDS: TrustPopulationKind[] = ["agent-review", "seed-assignment", "production-deployment"];
const TRUST_COVERAGE_KINDS: TrustCoverageKind[] = [...TRUST_RECORD_KINDS, "deployment", "defect"];
const TRUST_CLASSES: TrustClass[] = ["trunk", "shared", "leaf", "unknown"];
const TRUST_SEVERITIES = ["Blocker", "Major", "Nit"] as const;
const DIGEST_RE = /^[a-f0-9]{64}$/i;
function isTrustLiteral<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isTrustConfiguration(raw: unknown): raw is ReviewerConfiguration {
  if (!isRecord(raw) || !hasExactKeys(raw, ["provider", "model", "effort", "mode", "features"]) || !isRecord(raw.features)) return false;
  return ["provider", "model", "effort", "mode"].every((key) => nonEmptyString(raw[key])) &&
    Object.values(raw.features).every(nonEmptyString);
}
function hasExactKeys(record: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => Object.hasOwn(record, field)) && Object.keys(record).every((field) => fields.includes(field));
}


function validateTrustRecord(raw: unknown): string | undefined {
  if (!isRecord(raw)) return "record must be an object";
  if (!nonEmptyString(raw.id) || !nonEmptyString(raw.source_ref)) return "id and source_ref must be non-empty strings";
  if (!utcDate(raw.observed_at)) return "observed_at must be a valid UTC ISO timestamp";
  if (!isTrustLiteral(raw.kind, TRUST_RECORD_KINDS)) return "kind is not a supported trust record kind";
  const fieldsByKind: Record<TrustRecord["kind"], string[]> = {
    "revision-class": ["id", "kind", "observed_at", "source_ref", "change_id", "revision", "change_class", "policy_ref", "policy_digest"],
    "agent-review": ["id", "kind", "observed_at", "source_ref", "review_id", "change_id", "revision", "completed_at", "verdict", "reviewer_configuration", "evidence_ref", "evidence_digest"],
    "human-finding": ["id", "kind", "observed_at", "source_ref", "finding_id", "approval_review_id", "change_id", "revision", "detected_at", "severity", "evidence_ref", "evidence_digest"],
    "seed-assignment": ["id", "kind", "observed_at", "source_ref", "seed_run_id", "package_ref", "package_digest", "change_class", "assigned_at", "evaluation_cutoff", "expected_defects", "evidence_ref", "evidence_digest"],
    "seed-result": ["id", "kind", "observed_at", "source_ref", "seed_run_id", "completed_at", "detected_seed_ids", "reviewer_configuration", "review_output_ref", "review_output_digest"],
    "grant-reference": ["id", "kind", "observed_at", "source_ref", "grant_id", "change_class", "scope", "evidence_cutoff", "effective_from", "effective_until", "revoked_at", "suspended_at", "independent_validation_ref"],
  };
  if (!hasExactKeys(raw, fieldsByKind[raw.kind as TrustRecord["kind"]])) return `${raw.kind} record has missing or unknown fields`;
  const strings = (fields: string[]): boolean => fields.every((field) => nonEmptyString(raw[field]));
  const dates = (fields: string[]): boolean => fields.every((field) => utcDate(raw[field]) !== undefined);
  const digest = (field: string): boolean => typeof raw[field] === "string" && DIGEST_RE.test(raw[field] as string);
  const validClass = (): boolean => isTrustLiteral(raw.change_class, TRUST_CLASSES);
  switch (raw.kind) {
    case "revision-class":
      if (!strings(["change_id", "revision", "policy_ref"]) || !validClass() || !digest("policy_digest")) return "revision-class record fields are invalid";
      return undefined;
    case "agent-review":
      if (!strings(["review_id", "change_id", "revision", "evidence_ref"]) || !dates(["completed_at"]) ||
          !digest("evidence_digest") || !isTrustLiteral(raw.verdict, ["approved", "changes-requested", "blocked"]) ||
          !isTrustConfiguration(raw.reviewer_configuration)) return "agent-review record fields are invalid";
      return undefined;
    case "human-finding":
      if (!strings(["finding_id", "approval_review_id", "change_id", "revision", "evidence_ref"]) ||
          !dates(["detected_at"]) || !digest("evidence_digest") ||
          !isTrustLiteral(raw.severity, TRUST_SEVERITIES)) return "human-finding record fields are invalid";
      return undefined;
    case "seed-assignment": {
      if (!strings(["seed_run_id", "package_ref", "evidence_ref"]) || !dates(["assigned_at", "evaluation_cutoff"]) ||
          !digest("package_digest") || !digest("evidence_digest") || !validClass()) return "seed-assignment record fields are invalid";
      if (Date.parse(raw.assigned_at as string) > Date.parse(raw.evaluation_cutoff as string)) return "assigned_at must not follow evaluation_cutoff";
      if (!Array.isArray(raw.expected_defects) || !raw.expected_defects.every((item) =>
        isRecord(item) && hasExactKeys(item, ["id", "severity"]) && nonEmptyString(item.id) &&
        isTrustLiteral(item.severity, TRUST_SEVERITIES))) {
        return "expected_defects must contain id/severity pairs";
      }
      const ids = (raw.expected_defects as { id: string }[]).map((item) => item.id);
      return new Set(ids).size === ids.length ? undefined : "expected_defects ids must be unique";
    }
    case "seed-result":
      if (!strings(["seed_run_id", "review_output_ref"]) || !dates(["completed_at"]) ||
          !digest("review_output_digest") || !Array.isArray(raw.detected_seed_ids) ||
          !raw.detected_seed_ids.every(nonEmptyString) || !isTrustConfiguration(raw.reviewer_configuration)) return "seed-result record fields are invalid";
      return new Set(raw.detected_seed_ids as string[]).size === (raw.detected_seed_ids as string[]).length
        ? undefined : "detected_seed_ids must be unique";
    case "grant-reference":
      if (!strings(["grant_id"]) || !isRecord(raw.scope) || !hasExactKeys(raw.scope, ["change_id", "revision"]) ||
          !nonEmptyString(raw.scope.change_id) || !nonEmptyString(raw.scope.revision) ||
          (raw.independent_validation_ref !== null && !nonEmptyString(raw.independent_validation_ref)) ||
          !dates(["evidence_cutoff", "effective_from"]) || !validClass()) return "grant-reference record fields are invalid";
      for (const field of ["effective_until", "revoked_at", "suspended_at"]) {
        if (raw[field] !== null && !utcDate(raw[field])) return `${field} must be a UTC timestamp or null`;
      }
      for (const field of ["revoked_at", "suspended_at"]) {
        if (raw[field] !== null && Date.parse(raw[field] as string) < Date.parse(raw.effective_from as string)) {
          return `${field} must not precede effective_from`;
        }
      }
      if (raw.effective_until !== null && Date.parse(raw.effective_from as string) >= Date.parse(raw.effective_until as string)) {
        return "effective_from must precede effective_until";
      }
      return undefined;
    default:
      return "kind is not a supported trust record kind";
  }
}

function validateTrustPopulation(raw: unknown): string | undefined {
  if (!isRecord(raw)) return "population must be an object";
  if (!isTrustLiteral(raw.population_kind, TRUST_POPULATION_KINDS)) return "population_kind is invalid";
  if (!["population_id", "scope_ref", "source_ref"].every((field) => nonEmptyString(raw[field]))) return "population_id, scope_ref, and source_ref must be non-empty";
  const fields = ["population_kind", "population_id", "scope_ref", "inventory_digest", "from", "through", "member_ids", "complete", "source_ref"];
  if (raw.population_kind === "agent-review" && Object.hasOwn(raw, "first_approval_history_complete")) {
    fields.push("first_approval_history_complete");
    if (typeof raw.first_approval_history_complete !== "boolean") return "first_approval_history_complete must be a boolean";
  }
  if (!hasExactKeys(raw, fields)) return "population has missing or unknown fields";
  if (typeof raw.inventory_digest !== "string" || !DIGEST_RE.test(raw.inventory_digest)) return "inventory_digest must be a SHA-256 digest";
  const from = utcDate(raw.from);
  const through = utcDate(raw.through);
  if (!from || !through || from.getTime() >= through.getTime()) return "from/through must be valid increasing UTC timestamps";
  if (!Array.isArray(raw.member_ids) || !raw.member_ids.every(nonEmptyString)) return "member_ids must be non-empty identities";
  if (new Set(raw.member_ids as string[]).size !== (raw.member_ids as string[]).length) return "member_ids must be unique";
  return typeof raw.complete === "boolean" ? undefined : "complete must be a boolean";
}

function validateTrustCoverage(raw: unknown): string | undefined {
  if (!isRecord(raw)) return "coverage entry must be an object";
  if (!hasExactKeys(raw, ["kind", "scope_ref", "from", "through", "complete", "source_ref"])) return "coverage entry has missing or unknown fields";
  if (!nonEmptyString(raw.scope_ref) || !nonEmptyString(raw.source_ref)) return "scope_ref and source_ref must be non-empty strings";
  if (!isTrustLiteral(raw.kind, TRUST_COVERAGE_KINDS)) return "kind is not a supported trust coverage kind";
  const from = utcDate(raw.from);
  const through = utcDate(raw.through);
  if (!from || !through || from.getTime() >= through.getTime()) return "from/through must be valid increasing UTC timestamps";
  return typeof raw.complete === "boolean" ? undefined : "complete must be a boolean";
}

function validateTrust(raw: unknown, events: DeliveryEvent[]): { trust?: TrustObservationBlock; problems: string[] } {
  if (!isRecord(raw)) return { problems: ["trust must be an object"] };
  const problems: string[] = [];
  if (!hasExactKeys(raw, ["schema_version", "records", "populations", "coverage"])) problems.push("trust block has missing or unknown fields");
  if (raw.schema_version !== 1) problems.push("trust.schema_version must be 1");
  for (const field of ["records", "populations", "coverage"]) {
    if (!Array.isArray(raw[field])) problems.push(`trust.${field} must be an array`);
  }
  if (problems.length > 0) return { problems };
  const records: TrustRecord[] = [];
  const populations: TrustPopulation[] = [];
  const coverage: TrustCoverage[] = [];
  (raw.records as unknown[]).forEach((item, index) => {
    const problem = validateTrustRecord(item);
    if (problem) problems.push(`trust.records[${index}]: ${problem}`);
    else records.push(item as TrustRecord);
  });
  (raw.populations as unknown[]).forEach((item, index) => {
    const problem = validateTrustPopulation(item);
    if (problem) problems.push(`trust.populations[${index}]: ${problem}`);
    else populations.push(item as TrustPopulation);
  });
  (raw.coverage as unknown[]).forEach((item, index) => {
    const problem = validateTrustCoverage(item);
    if (problem) problems.push(`trust.coverage[${index}]: ${problem}`);
    else coverage.push(item as TrustCoverage);
  });
  const populationIds = new Map<string, string>();
  for (const population of populations) {
    const key = canonicalJson([population.population_kind, population.population_id]);
    const payload = canonicalJson(population);
    const previous = populationIds.get(key);
    if (previous !== undefined && previous !== payload) problems.push(`trust population ${population.population_id} has a conflicting payload`);
    populationIds.set(key, payload);
  }
  const ids = new Map<string, string>();
  const domains = new Map<string, string>();
  const canonical: TrustRecord[] = [];
  for (const record of records) {
    const payload = canonicalJson(withoutId(record as unknown as Record<string, unknown>));
    const priorId = ids.get(record.id);
    if (priorId !== undefined) {
      if (priorId !== payload) problems.push(`trust record id ${record.id} has a conflicting payload`);
      continue;
    }
    ids.set(record.id, payload);
    const identity = (() => {
      switch (record.kind) {
        case "revision-class": return canonicalJson([record.kind, record.change_id, record.revision]);
        case "agent-review": return canonicalJson([record.kind, record.review_id]);
        case "human-finding": return canonicalJson([record.kind, record.finding_id]);
        case "seed-assignment":
        case "seed-result": return canonicalJson([record.kind, record.seed_run_id]);
        case "grant-reference": return canonicalJson([record.kind, record.grant_id]);
        default: return assertNever(record);
      }
    })();
    const priorDomain = domains.get(identity);
    if (priorDomain !== undefined) {
      if (priorDomain !== payload) problems.push(`trust domain identity ${identity} has a conflicting payload`);
      continue;
    }
    domains.set(identity, payload);
    canonical.push(record);
  }
  const approvals = new Map(canonical.filter((record): record is Extract<TrustRecord, { kind: "agent-review" }> => record.kind === "agent-review").map((record) => [record.review_id, record]));
  const assignments = new Map(canonical.filter((record): record is Extract<TrustRecord, { kind: "seed-assignment" }> => record.kind === "seed-assignment").map((record) => [record.seed_run_id, record]));
  for (const record of canonical) {
    if (record.kind === "human-finding") {
      const approval = approvals.get(record.approval_review_id);
      if (!approval || approval.verdict !== "approved" || approval.change_id !== record.change_id || approval.revision !== record.revision) {
        problems.push(`trust finding ${record.finding_id} must reference an approval of the same exact revision`);
      } else if (Date.parse(record.detected_at) < Date.parse(approval.completed_at)) problems.push(`trust finding ${record.finding_id} predates its approval`);
    }
    if (record.kind === "seed-result") {
      const assignment = assignments.get(record.seed_run_id);
      if (!assignment) problems.push(`trust seed result ${record.seed_run_id} has no assignment`);
      else {
        if (Date.parse(record.completed_at) < Date.parse(assignment.assigned_at)) {
          problems.push(`trust seed result ${record.seed_run_id} predates its assignment`);
        }
        const expected = new Set(assignment.expected_defects.map((defect) => defect.id));
        if (record.detected_seed_ids.some((id) => !expected.has(id))) problems.push(`trust seed result ${record.seed_run_id} contains unexpected detection ids`);
      }
    }
  }
  for (const population of populations) {
    if (population.population_kind === "agent-review") {
      const actual = canonical.filter((record): record is Extract<TrustRecord, { kind: "agent-review" }> =>
        record.kind === "agent-review" && Date.parse(record.completed_at) >= Date.parse(population.from) && Date.parse(record.completed_at) < Date.parse(population.through))
        .map((record) => record.review_id).sort();
      if (canonicalJson([...population.member_ids].sort()) !== canonicalJson(actual)) problems.push(`trust population ${population.population_id} review inventory conflicts with records`);
    }
    if (population.population_kind === "seed-assignment") {
      const actual = canonical.filter((record): record is Extract<TrustRecord, { kind: "seed-assignment" }> =>
        record.kind === "seed-assignment" && Date.parse(record.evaluation_cutoff) >= Date.parse(population.from) && Date.parse(record.evaluation_cutoff) < Date.parse(population.through))
        .map((record) => record.seed_run_id).sort();
      if (canonicalJson([...population.member_ids].sort()) !== canonicalJson(actual)) problems.push(`trust population ${population.population_id} seed inventory conflicts with records`);
    }
    if (population.population_kind === "production-deployment") {
      const actual = events.filter((event): event is DeploymentEvent => event.kind === "deployment" &&
        Date.parse(event.deployed_at) >= Date.parse(population.from) && Date.parse(event.deployed_at) < Date.parse(population.through))
        .map((event) => event.deployment_id).sort();
      if (canonicalJson([...population.member_ids].sort()) !== canonicalJson(actual)) problems.push(`trust population ${population.population_id} deployment inventory conflicts with deployment records`);
    }
  }
  if (problems.length > 0) return { problems };
  return { trust: { schema_version: 1, records: canonical, populations, coverage }, problems };
}

function validateObservationFile(parsed: unknown): { file?: DeliveryObservationFile; problems: string[] } {
  if (!isRecord(parsed)) return { problems: ["root value must be a JSON object"] };
  const problems: string[] = [];
  if (parsed.schema_version !== 1) problems.push("schema_version must be 1");
  if (parsed.source_kind !== "host-export" && parsed.source_kind !== "operator-recorded") {
    problems.push('source_kind must be "host-export" or "operator-recorded"');
  }
  if (!Array.isArray(parsed.coverage)) problems.push("coverage must be an array");
  if (!Array.isArray(parsed.events)) problems.push("events must be an array");
  if (problems.length > 0) return { problems };

  const coverage: DeliveryCoverage[] = [];
  (parsed.coverage as unknown[]).forEach((raw, index) => {
    const problem = validateCoverage(raw);
    if (problem) problems.push(`coverage[${index}]: ${problem}`);
    else coverage.push(raw as unknown as DeliveryCoverage);
  });

  const events: DeliveryEvent[] = [];
  const byId = new Map<string, string>();
  const byDomain = new Map<string, string>();
  (parsed.events as unknown[]).forEach((raw, index) => {
    const eventProblems = validateEvent(raw);
    if (eventProblems.length > 0) {
      // A rejected raw id may carry a path or secret: dispatch-scoped diagnostics use a fixed code.
      const dispatchScoped = isRecord(raw) && typeof raw.kind === "string" && isDispatchKind(raw.kind);
      const label = dispatchScoped
        ? " (dispatch-scoped)"
        : isRecord(raw) && typeof raw.id === "string"
          ? ` (id ${raw.id})`
          : "";
      problems.push(`events[${index}]${label}: ${eventProblems.join("; ")}`);
      return;
    }
    // Dispatch-scoped windows are canonicalized before identity and replay comparison (SRS-007).
    const event = canonicalizeDispatchEvent(raw as unknown as DeliveryEvent);
    const payload = canonicalJson(withoutId({ ...event } as unknown as Record<string, unknown>));

    const previousPayload = byId.get(event.id);
    if (previousPayload !== undefined) {
      if (previousPayload !== payload) {
        problems.push(`events[${index}] (id ${event.id}): duplicate id with a conflicting payload`);
      }
      return;
    }
    byId.set(event.id, payload);

    const identity = domainIdentity(event);
    const previousDomain = byDomain.get(identity.key);
    if (previousDomain !== undefined) {
      if (previousDomain !== payload) {
        problems.push(`events[${index}] (id ${event.id}): conflicting payload for ${identity.label}`);
      }
      return; // equivalent domain replay: counted once
    }
    byDomain.set(identity.key, payload);
    events.push(event);
  });
  if (problems.length > 0) return { problems };

  const trustResult = parsed.trust === undefined ? undefined : validateTrust(parsed.trust, events);
  if (trustResult) problems.push(...trustResult.problems.map((problem) => `trust: ${problem}`));
  if (problems.length > 0) return { problems };
  // Cross-event references and chronology (M6).
  const submissions = new Map<string, SubmissionEvent>();
  for (const event of events) {
    if (event.kind === "submission") submissions.set(`${event.change_id}\n${event.attempt}\n${event.revision}`, event);
  }
  const deployments = new Map<string, DeploymentEvent>();
  for (const event of events) {
    if (event.kind === "deployment") deployments.set(event.deployment_id, event);
  }
  for (const event of events) {
    if (event.kind === "acceptance") {
      const submission = submissions.get(`${event.change_id}\n${event.attempt}\n${event.revision}`);
      if (!submission) {
        problems.push(
          `event ${event.id}: acceptance (attempt ${event.attempt}, revision ${event.revision}) has no matching submission`,
        );
        continue;
      }
      if (Date.parse(event.observed_at) < Date.parse(submission.observed_at)) {
        problems.push(
          `event ${event.id}: acceptance at ${event.observed_at} precedes its submission at ${submission.observed_at}`,
        );
      }
    }
    if (event.kind === "defect") {
      const deployment = deployments.get(event.deployment_id);
      if (!deployment) {
        problems.push(`event ${event.id}: defect references unknown deployment_id ${event.deployment_id}`);
      } else if (deployment.change_id !== event.change_id || deployment.revision !== event.revision) {
        problems.push(
          `event ${event.id}: defect deployment ${event.deployment_id} does not belong to change ${event.change_id} at revision ${event.revision}`,
        );
      } else if (Date.parse(event.detected_at) < Date.parse(deployment.deployed_at)) {
        problems.push(
          `event ${event.id}: defect detected_at ${event.detected_at} precedes deployment ${deployment.deployment_id} at ${deployment.deployed_at}`,
        );
      }
    }
  }
  if (problems.length > 0) return { problems };

  problems.push(...validateDispatchInvariants(events));
  if (problems.length > 0) return { problems };

  return {
    file: {
      schema_version: 1,
      source_kind: parsed.source_kind as DeliveryObservationFile["source_kind"],
      coverage,
      events,
      ...(trustResult?.trust ? { trust: trustResult.trust } : {}),
    },
    problems,
  };
}

/** Reads `<root>/artifacts/metrics/delivery-observations.json`. Absent file is not an error. */
export function readDeliveryObservations(root: string): DeliveryObservationSet {
  const filePath = path.join(root, DELIVERY_OBSERVATIONS_PATH);
  if (!fs.existsSync(filePath)) return { observations: null, issues: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      observations: null,
      issues: [{ file: DELIVERY_OBSERVATIONS_PATH, message: `failed to parse JSON: ${(error as Error).message}` }],
    };
  }
  const { file, problems } = validateObservationFile(parsed);
  if (!file || problems.length > 0) {
    return {
      observations: null,
      issues: problems.map((message) => ({ file: DELIVERY_OBSERVATIONS_PATH, message })),
    };
  }
  return { observations: file, issues: [] };
}

function trustCoverageComplete(trust: TrustObservationBlock, kind: TrustCoverageKind, start: number, end: number, scopeRef = "all"): boolean {
  const intervals = trust.coverage.filter((row) => row.kind === kind && row.scope_ref === scopeRef && row.complete)
    .map((row) => [Date.parse(row.from), Date.parse(row.through)] as const)
    .sort((left, right) => left[0] - right[0]);
  let cursor = start;
  for (const [from, through] of intervals) {
    if (from > cursor) return false;
    if (through > cursor) cursor = through;
    if (cursor >= end) return true;
  }
  return cursor >= end;
}

function trustPopulationComplete(trust: TrustObservationBlock, kind: TrustPopulationKind, start: number, end: number, scopeRef?: string): boolean {
  return trust.populations.some((population) => population.population_kind === kind && population.complete &&
    (scopeRef === undefined || population.scope_ref === scopeRef) &&
    Date.parse(population.from) <= start && Date.parse(population.through) >= end);
}

function trustMetric(
  value: string,
  source: string,
  sampleSize: number,
  coverage: AvailableMetric["coverage"],
  limitations: string[],
  metadata: NonNullable<AvailableMetric["trust"]>,
): AvailableMetric {
  return {
    available: true,
    value,
    trend: TREND,
    source,
    basis: "measured",
    sampleSize,
    coverage,
    limitations,
    trust: { ...metadata, sampleSize, coverage, source, limitations },
  };
}

function trustCount(
  value: string,
  source: string,
  sampleSize: number,
  coverage: AvailableMetric["coverage"],
  limitations: string[],
  metadata: NonNullable<AvailableMetric["trust"]>,
): StageIndicatorRow["metric_result"] {
  if (sampleSize === 0 && coverage !== "complete") {
    return trustUnavailable("an observed zero count is not established by incomplete coverage", {
      ...metadata,
      sampleSize: null,
      coverage,
      source,
      limitations,
      diagnostics: ["No observed events do not establish zero when inventory coverage is incomplete."],
    });
  }
  return trustMetric(value, source, sampleSize, coverage, limitations, metadata);
}

function trustUnavailable(reason: string, metadata: NonNullable<UnavailableMetric["trust"]>): UnavailableMetric {
  const source = metadata.source ?? OBS_SOURCE;
  const limitations = metadata.limitations ?? [reason];
  return {
    available: false,
    reason,
    source,
    trust: {
      ...metadata,
      sampleSize: metadata.sampleSize ?? null,
      coverage: metadata.coverage ?? "unknown",
      source,
      limitations,
    },
  };
}

function trustRow(indicator: string, metric_result: StageIndicatorRow["metric_result"]): StageIndicatorRow {
  return { stage: "Trust", indicator, metric_result };
}

function configurationStrata(configurations: ReviewerConfiguration[]): string {
  const counts = new Map<string, number>();
  for (const config of configurations) {
    const label = `${config.provider}/${config.model}/${config.effort}/${config.mode};features=${canonicalJson(config.features)}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `${label} (${count})`).join("; ") || "unknown: no observed execution";
}

function buildTrustIndicators(obs: DeliveryObservationFile | null, period: GitPeriod): StageIndicatorRow[] {
  const since = period.currentSince.getTime();
  const until = period.currentUntil.getTime();
  const cohort = `[${period.currentSince.toISOString()}, ${period.currentUntil.toISOString()})`;
  const horizon = period.currentUntil.toISOString();
  const classes: TrustClass[] = ["trunk", "shared", "leaf", "unknown"];
  if (!obs?.trust) {
    const missing = obs === null
      ? "no artifacts/metrics/delivery-observations.json supplied"
      : "trust block is missing from the authorized local delivery-observation export";
    return [
      ...classes.map((changeClass) => trustRow(`agent-review approval escape rate for ${changeClass}`,
        trustUnavailable(missing, { cohort, asOfHorizon: horizon, diagnostics: [missing] }))),
      ...classes.map((changeClass) => trustRow(`seeded-review recall for ${changeClass}`,
        trustUnavailable(missing, { cohort, asOfHorizon: horizon, diagnostics: [missing] }))),
      ...classes.map((changeClass) => trustRow(`production deployment affected share for ${changeClass}`,
        trustUnavailable(missing, { cohort, asOfHorizon: horizon, diagnostics: [missing] }))),
      trustRow("post-grant escape assessment", trustUnavailable(obs === null ? missing : "grant-reference inventory is missing; no escape conclusion is available",
        { cohort, asOfHorizon: horizon, diagnostics: [obs === null ? missing : "grant-reference inventory is missing"] })),
    ];
  }
  const trust = obs.trust;
  const records = trust.records;
  const classByRevision = new Map(records.filter((record): record is Extract<TrustRecord, { kind: "revision-class" }> =>
    record.kind === "revision-class").map((record) => [canonicalJson([record.change_id, record.revision]), record.change_class]));
  const klass = (changeId: string, revision: string): TrustClass =>
    classByRevision.get(canonicalJson([changeId, revision])) ?? "unknown";
  const source = `${OBS_SOURCE}#trust`;
  const sharedLimitations = [
    `Declared observation labels are attribution, not authenticated origin; cohort is ${cohort}.`,
    "Trust records, population inventories, source references, and reviewer configuration remain unauthenticated declarations.",
  ];
  const rows: StageIndicatorRow[] = [];

  const firstApprovals = new Map<string, Extract<TrustRecord, { kind: "agent-review" }>>();
  for (const review of records) {
    if (review.kind !== "agent-review" || review.verdict !== "approved") continue;
    const key = canonicalJson([review.change_id, review.revision]);
    const existing = firstApprovals.get(key);
    if (!existing || Date.parse(review.completed_at) < Date.parse(existing.completed_at)) firstApprovals.set(key, review);
  }
  const approvalCohort = [...firstApprovals.values()].filter((review) =>
    Date.parse(review.completed_at) >= since && Date.parse(review.completed_at) < until);
  const findings = records.filter((record): record is Extract<TrustRecord, { kind: "human-finding" }> =>
    record.kind === "human-finding" && (record.severity === "Blocker" || record.severity === "Major"));
  const reviewPopulation = trust.populations.find((population) => population.population_kind === "agent-review" && population.complete &&
    Date.parse(population.from) <= since && Date.parse(population.through) >= until);
  const reviewHistoryCovered = reviewPopulation !== undefined &&
    reviewPopulation.first_approval_history_complete === true &&
    trustCoverageComplete(trust, "agent-review", Date.parse(reviewPopulation.from), until, reviewPopulation.scope_ref) &&
    trustCoverageComplete(trust, "revision-class", Date.parse(reviewPopulation.from), until, reviewPopulation.scope_ref) &&
    trustCoverageComplete(trust, "human-finding", since, until, reviewPopulation.scope_ref);
  for (const changeClass of classes) {
    const members = approvalCohort.filter((review) => klass(review.change_id, review.revision) === changeClass);
    const numerator = members.filter((review) => findings.some((finding) =>
      finding.change_id === review.change_id && finding.revision === review.revision &&
      Date.parse(finding.detected_at) > Date.parse(review.completed_at) && Date.parse(finding.detected_at) < until)).length;
    const configSummary = configurationStrata(members.map((review) => review.reviewer_configuration));
    const historyCovered = reviewHistoryCovered;
    const denominator = members.length;
    const metadata = { ...(historyCovered ? { numerator, denominator, sampleSize: denominator } : {}),
      coverage: historyCovered ? "complete" as const : "unknown" as const,
      cohort, asOfHorizon: horizon,
      diagnostics: [`Actual first-approval reviewer configuration strata: ${configSummary}.`,
        "First technical approval per exact change revision; later reapproval does not reset cohort membership."] };
    const metric = !historyCovered || denominator === 0
      ? trustUnavailable(!historyCovered ? "complete first-approval history, review/finding inventory, and continuous per-kind coverage are required" : "no first-approved revision in this class and period", metadata)
      : trustMetric(`${numerator}/${denominator} revisions with a post-approval Blocker/Major finding (${(numerator / denominator * 100).toFixed(1)}%)`,
        source, denominator, "complete", [...sharedLimitations, "This is an as-of observed escape share, not lifetime defect probability."], metadata);
    rows.push(trustRow(`agent-review approval escape rate for ${changeClass}`, metric));
  }

  const assignments = records.filter((record): record is Extract<TrustRecord, { kind: "seed-assignment" }> =>
    record.kind === "seed-assignment" && Date.parse(record.evaluation_cutoff) >= since && Date.parse(record.evaluation_cutoff) < until);
  const seedResults = new Map(records.filter((record): record is Extract<TrustRecord, { kind: "seed-result" }> =>
    record.kind === "seed-result").map((record) => [record.seed_run_id, record]));
  const seedPopulation = trust.populations.find((population) => population.population_kind === "seed-assignment" && population.complete &&
    Date.parse(population.from) <= since && Date.parse(population.through) >= until);
  for (const changeClass of classes) {
    const members = assignments.filter((assignment) => assignment.change_class === changeClass);
    const relevant = members.flatMap((assignment) => assignment.expected_defects
      .filter((defect) => defect.severity === "Blocker" || defect.severity === "Major")
      .map((defect) => ({ assignment, defect })));
    const results = members.map((assignment) => ({ assignment, result: seedResults.get(assignment.seed_run_id) }));
    const incomplete = results.filter(({ assignment, result }) =>
      !result || Date.parse(result.completed_at) > Date.parse(assignment.evaluation_cutoff));
    const numerator = relevant.filter(({ assignment, defect }) =>
      seedResults.get(assignment.seed_run_id)?.detected_seed_ids.includes(defect.id)).length;
    const configSummary = configurationStrata(results.flatMap(({ result }) =>
      result ? [result.reviewer_configuration] : []));
    const assignmentCovered = seedPopulation !== undefined &&
      trustPopulationComplete(trust, "seed-assignment", since, until, seedPopulation.scope_ref);
    const memberEvidenceCovered = seedPopulation !== undefined && members.every((assignment) =>
      trustCoverageComplete(trust, "seed-assignment", Date.parse(assignment.assigned_at), Date.parse(assignment.evaluation_cutoff), seedPopulation.scope_ref) &&
      trustCoverageComplete(trust, "seed-result", Date.parse(assignment.assigned_at), Date.parse(assignment.evaluation_cutoff), seedPopulation.scope_ref));
    const covered = assignmentCovered && memberEvidenceCovered;
    const denominator = relevant.length;
    rows.push(trustRow(`seeded-review packages for ${changeClass}`, trustCount(
      `${members.length} assigned package(s)`, source, members.length, assignmentCovered ? "complete" : "partial",
      [...sharedLimitations, "Packages are counted by evaluation_cutoff, independently of acceptance or merge."],
      { cohort, asOfHorizon: horizon, diagnostics: [`${members.length} assigned package(s).`] },
    )));
    rows.push(trustRow(`seeded-review expected defects for ${changeClass}`, trustCount(
      `${denominator} expected Blocker/Major defect(s)`, source, denominator, assignmentCovered ? "complete" : "partial",
      [...sharedLimitations, "The recall denominator excludes Nit findings and is unavailable when empty."],
      { cohort, asOfHorizon: horizon, diagnostics: [`${denominator} expected Blocker/Major defect(s).`] },
    )));
    const metadata = { ...(assignmentCovered
      ? { ...(incomplete.length === 0 ? { numerator } : {}), denominator, sampleSize: denominator }
      : {}),
      coverage: covered ? "complete" as const : "partial" as const, cohort, asOfHorizon: horizon,
      diagnostics: [`Actual reviewer configuration strata: ${configSummary}.`, "Assignments enter by evaluation_cutoff; acceptance and merge are not required."] };
    const metric = !covered || incomplete.length > 0 || denominator === 0
      ? trustUnavailable(!covered ? "complete seed assignment inventory and continuous assignment/result coverage are required"
        : incomplete.length > 0 ? `${incomplete.length} planned seed assignment(s) lack a result completed by cutoff`
        : "no expected Blocker/Major seed defects; recall denominator is empty, not 100%", metadata)
      : trustMetric(`${numerator}/${denominator} expected Blocker/Major defects detected (${(numerator / denominator * 100).toFixed(1)}%)`,
        source, denominator, "complete", [...sharedLimitations, "A completed empty detection list is a miss; independent ground-truth confirmation is outside this script."], metadata);
    rows.push(trustRow(`seeded-review recall for ${changeClass}`, metric));
  }

  const deployments = obs.events.filter((event): event is DeploymentEvent => event.kind === "deployment" &&
    event.environment === "production" && Date.parse(event.deployed_at) >= since && Date.parse(event.deployed_at) < until);
  const deploymentIds = new Set(deployments.map((deployment) => deployment.deployment_id));
  const allDefects = obs.events.filter((event): event is DefectEvent => {
    if (event.kind !== "defect" || Date.parse(event.detected_at) >= until) return false;
    const deployment = obs.events.find((candidate): candidate is DeploymentEvent =>
      candidate.kind === "deployment" && candidate.deployment_id === event.deployment_id);
    return deployment !== undefined && Date.parse(event.detected_at) >= Date.parse(deployment.deployed_at);
  });
  const defects = allDefects.filter((event) => deploymentIds.has(event.deployment_id));
  const deploymentPopulation = trust.populations.find((population) => population.population_kind === "production-deployment" && population.complete &&
    Date.parse(population.from) <= since && Date.parse(population.through) >= until);
  for (const changeClass of classes) {
    const members = deployments.filter((deployment) => klass(deployment.change_id, deployment.revision) === changeClass);
    const memberIds = new Set(members.map((deployment) => deployment.deployment_id));
    const memberDefects = defects.filter((defect) => memberIds.has(defect.deployment_id));
    const affected = new Set(memberDefects.map((defect) => defect.deployment_id)).size;
    const deploymentCovered = deploymentPopulation !== undefined &&
      trustCoverageComplete(trust, "deployment", since, until, deploymentPopulation.scope_ref) &&
      trustCoverageComplete(trust, "revision-class", since, until, deploymentPopulation.scope_ref) &&
      trustPopulationComplete(trust, "production-deployment", since, until, deploymentPopulation.scope_ref);
    const covered = deploymentCovered &&
      trustCoverageComplete(trust, "defect", since, until, deploymentPopulation.scope_ref);
    const metadata = { ...(covered ? { numerator: affected, denominator: members.length, sampleSize: members.length } : {}),
      coverage: covered ? "complete" as const : "partial" as const, cohort, asOfHorizon: horizon,
      diagnostics: ["Deployment class joins the exact deployed change revision; remediation none remains an escape."] };
    const rateMetric = !covered || members.length === 0
      ? trustUnavailable(!covered ? "complete production-deployment inventory and continuous deployment/defect coverage are required" : "no production deployments in this class and period", metadata)
      : trustMetric(`${affected}/${members.length} affected deployment(s) (${(affected / members.length * 100).toFixed(1)}%)`,
        source, members.length, "complete", [...sharedLimitations, "The denominator includes every production deployment in this period, regardless of acceptance or review."], metadata);
    const countCoverage: AvailableMetric["coverage"] = covered ? "complete" : "partial";
    rows.push(trustRow(`production deployment affected share for ${changeClass}`, rateMetric));
    rows.push(trustRow(`production deployment escaped defects for ${changeClass}`, trustCount(
      `${memberDefects.length} defect observation(s)`, source, memberDefects.length, countCoverage,
      [...sharedLimitations, "Observed count is partial unless declared deployment and incident populations are complete."],
      { cohort, asOfHorizon: horizon, diagnostics: [`${memberDefects.length} defect observation(s).`] },
    )));
    rows.push(trustRow(`production deployment affected count for ${changeClass}`, trustCount(
      `${affected} affected deployment(s)`, source, affected, countCoverage, sharedLimitations,
      { cohort, asOfHorizon: horizon, diagnostics: [`${affected} affected deployment(s).`] },
    )));
    rows.push(trustRow(`production deployment eligible count for ${changeClass}`, trustCount(
      `${members.length} eligible production deployment(s)`, source, members.length,
      deploymentCovered ? "complete" : "partial", sharedLimitations,
      { cohort, asOfHorizon: horizon, diagnostics: [`${members.length} eligible deployment(s).`] },
    )));
    const failedDeploymentCount = new Set(memberDefects.filter((defect) => defect.remediation !== "none").map((defect) => defect.deployment_id)).size;
    const rollbackDeploymentCount = new Set(memberDefects.filter((defect) => defect.remediation === "rollback").map((defect) => defect.deployment_id)).size;
    rows.push(trustRow(`production deployment hotfix/rollback count for ${changeClass}`, trustCount(
      `${failedDeploymentCount} deployment(s)`, source, failedDeploymentCount, countCoverage,
      [...sharedLimitations, "Count is by distinct deployment."],
      { cohort, asOfHorizon: horizon, diagnostics: ["Only hotfix/rollback remediation qualifies."] },
    )));
    rows.push(trustRow(`production deployment rollback-only count for ${changeClass}`, trustCount(
      `${rollbackDeploymentCount} deployment(s)`, source, rollbackDeploymentCount, countCoverage,
      sharedLimitations, { cohort, asOfHorizon: horizon, diagnostics: ["Count is by distinct rollback deployment."] },
    )));
  }

  const grants = records.filter((record): record is Extract<TrustRecord, { kind: "grant-reference" }> => record.kind === "grant-reference");
  const allDeployments = obs.events.filter((event): event is DeploymentEvent => event.kind === "deployment");
  const freshEscapes = allDefects.flatMap((defect) => {
    const deployment = allDeployments.find((item) => item.deployment_id === defect.deployment_id);
    if (!deployment) return [];
    const detected = Date.parse(defect.detected_at);
    return grants.filter((grant) => grant.independent_validation_ref !== null &&
      grant.change_class !== "unknown" && klass(deployment.change_id, deployment.revision) !== "unknown" &&
      grant.change_class === klass(deployment.change_id, deployment.revision) &&
      grant.scope.change_id === deployment.change_id && grant.scope.revision === deployment.revision &&
      detected > Date.parse(grant.evidence_cutoff) &&
      detected >= Date.parse(grant.effective_from) &&
      (grant.effective_until === null || detected < Date.parse(grant.effective_until)) &&
      (grant.revoked_at === null || detected < Date.parse(grant.revoked_at)) &&
      (grant.suspended_at === null || detected < Date.parse(grant.suspended_at))
    ).map((grant) => `SUSPENSION_REQUIRED grant=${grant.grant_id} defect=${defect.id} evidence=${grant.independent_validation_ref}/${defect.id}`);
  });
  const earliestGrantCutoff = grants.reduce((earliest, grant) =>
    Math.min(earliest, Date.parse(grant.evidence_cutoff)), until);
  const potentiallyApplicableDeployments = allDeployments.filter((deployment) =>
    Date.parse(deployment.deployed_at) < until &&
    (Date.parse(deployment.deployed_at) >= earliestGrantCutoff ||
      allDefects.some((defect) => defect.deployment_id === deployment.deployment_id &&
        Date.parse(defect.detected_at) > earliestGrantCutoff)));
  const applicabilityResolved = grants.every((grant) =>
    grant.independent_validation_ref !== null && grant.change_class !== "unknown" &&
    klass(grant.scope.change_id, grant.scope.revision) === grant.change_class) &&
    potentiallyApplicableDeployments.every((deployment) =>
      klass(deployment.change_id, deployment.revision) !== "unknown");
  const grantHistory = grants.length > 0 && applicabilityResolved &&
    trustCoverageComplete(trust, "grant-reference", earliestGrantCutoff, until) &&
    trustCoverageComplete(trust, "deployment", earliestGrantCutoff, until) &&
    trustCoverageComplete(trust, "defect", earliestGrantCutoff, until) &&
    trustCoverageComplete(trust, "revision-class", earliestGrantCutoff, until);
  const grantMetric = freshEscapes.length > 0
    ? trustMetric(freshEscapes.join("; "), source, freshEscapes.length, grantHistory ? "complete" : "partial",
      [...sharedLimitations, "Declaration-only diagnostic; no grant is created, authenticated, activated, or revoked."],
      { numerator: freshEscapes.length, denominator: grants.length, cohort, asOfHorizon: horizon, diagnostics: freshEscapes })
    : !grantHistory
      ? trustUnavailable("grant-reference inventory, validation evidence, exact class/scope, or continuous applicability history is missing; no no-escape conclusion is available",
        { ...(grants.length > 0 ? { sampleSize: grants.length } : {}),
          cohort, asOfHorizon: horizon,
          diagnostics: ["Historical grant declarations do not authorize report-only behavior."] })
      : trustMetric("No post-evidence-cutoff active-grant escape observed", source, 0, "complete",
        [...sharedLimitations, "Complete declared history yielded no qualifying active-grant escape; declarations remain unauthenticated and non-authoritative."],
        { numerator: 0, denominator: grants.length, cohort, asOfHorizon: horizon,
          diagnostics: ["No automatic grant change or activation occurs."] });
  rows.push(trustRow("post-grant escape assessment", grantMetric));
  return rows;
}

// ---------------------------------------------------------------------------
// Coverage and lifecycle helpers
// ---------------------------------------------------------------------------

function measured(
  value: string,
  sampleSize: number | null,
  coverage: AvailableMetric["coverage"],
  limitations: string[],
): AvailableMetric {
  return {
    available: true,
    value,
    trend: TREND,
    source: OBS_SOURCE,
    basis: "measured",
    sampleSize,
    coverage,
    limitations,
  };
}

function unavailable(reason: string): UnavailableMetric {
  return { available: false, reason, source: OBS_SOURCE };
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function sourceLimitation(obs: DeliveryObservationFile): string {
  return `Source label "${obs.source_kind}" is attribution, not an authenticated origin.`;
}

/** Coverage of one event's own observation point (kind + revision + interval). */
function pointCovered(obs: DeliveryObservationFile, event: DeliveryEvent): boolean {
  const at = Date.parse(event.observed_at);
  return obs.coverage.some(
    (coverage) =>
      coverage.change_id === event.change_id &&
      coverage.complete &&
      coverage.kinds.includes(event.kind) &&
      coverage.revisions.includes(event.revision) &&
      Date.parse(coverage.from) <= at &&
      at <= Date.parse(coverage.through),
  );
}

/** True when merged complete coverage intervals for one kind+revision span `[startMs, endMs]`. */
export function intervalCovered(
  obs: DeliveryObservationFile,
  changeId: string,
  kind: DeliveryEventKind,
  revision: string,
  startMs: number,
  endMs: number,
): boolean {
  if (startMs > endMs) return false;
  const intervals = obs.coverage
    .filter(
      (coverage) =>
        coverage.change_id === changeId &&
        coverage.complete &&
        coverage.kinds.includes(kind) &&
        coverage.revisions.includes(revision),
    )
    .map((coverage) => [Date.parse(coverage.from), Date.parse(coverage.through)] as const)
    .sort((a, b) => a[0] - b[0]);
  if (startMs === endMs) {
    return intervals.some(([from, through]) => from <= startMs && startMs <= through);
  }
  let cursor = startMs;
  for (const [from, through] of intervals) {
    if (through < cursor) continue;
    if (from > cursor) return false;
    cursor = through;
    if (cursor >= endMs) return true;
  }
  return cursor >= endMs;
}

interface CohortMember {
  acceptance: AcceptanceEvent;
  revisions: string[];
  start: number;
  end: number;
}

function buildMember(
  events: DeliveryEvent[],
  submissions: SubmissionEvent[],
  acceptance: AcceptanceEvent,
): CohortMember {
  const end = Date.parse(acceptance.observed_at);
  const linked = submissions.filter(
    (event) =>
      event.change_id === acceptance.change_id &&
      event.attempt <= acceptance.attempt &&
      Date.parse(event.observed_at) <= end,
  );
  const revisions = [...new Set([...linked.map((event) => event.revision), acceptance.revision])];
  const bounds = events
    .filter(
      (event) =>
        event.change_id === acceptance.change_id &&
        revisions.includes(event.revision) &&
        LIFECYCLE_KINDS.includes(event.kind) &&
        Date.parse(event.observed_at) <= end,
    )
    .map((event) => Date.parse(event.observed_at));
  return { acceptance, revisions, start: Math.min(end, ...bounds), end };
}

function memberEvents(member: CohortMember, events: DeliveryEvent[], kind: DeliveryEventKind): DeliveryEvent[] {
  return events.filter(
    (event) =>
      event.change_id === member.acceptance.change_id &&
      member.revisions.includes(event.revision) &&
      event.kind === kind &&
      Date.parse(event.observed_at) <= member.end,
  );
}

/** Complete kind+revision interval coverage across the member's linked lifecycle. */
function memberCovered(obs: DeliveryObservationFile, member: CohortMember, kind: DeliveryEventKind): boolean {
  return member.revisions.every((revision) =>
    intervalCovered(obs, member.acceptance.change_id, kind, revision, member.start, member.end),
  );
}

function isDeploymentEvent(event: DeliveryEvent): event is DeploymentEvent {
  return event.kind === "deployment";
}

function isDefectEvent(event: DeliveryEvent): event is DefectEvent {
  return event.kind === "defect";
}

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------

/** Builds the measured delivery indicators for `period` from validated observations. */
export function buildDeliveryIndicators(input: DeliveryObservationSet, period: GitPeriod): DeliveryIndicators {
  if (!input.observations) {
    const reason =
      input.issues.length > 0
        ? `delivery observations rejected: ${input.issues.map((issue) => issue.message).join("; ")}`
        : `no ${DELIVERY_OBSERVATIONS_PATH} supplied`;
    const deliveryHealth: DeliveryHealthRow[] = [
      { metric: "Deployment frequency (observed)", metric_result: unavailable(reason) },
      { metric: "Lead time for changes (observed)", metric_result: unavailable(reason) },
      { metric: "Change failure rate (observed)", metric_result: unavailable(reason) },
      { metric: "Time to restore (observed)", metric_result: unavailable(reason) },
    ];
    const stageIndicators: StageIndicatorRow[] = [
      { stage: "Review", indicator: "human review effort per accepted change (measured)", metric_result: unavailable(reason) },
      { stage: "Review", indicator: "decision wait (measured)", metric_result: unavailable(reason) },
      { stage: "Review", indicator: "correction rounds per accepted change (measured)", metric_result: unavailable(reason) },
      { stage: "Review", indicator: "first-pass acceptance (measured)", metric_result: unavailable(reason) },
      { stage: "Maintain", indicator: "escaped defects and rollbacks (measured)", metric_result: unavailable(reason) },
      { stage: "Delivery", indicator: "cost per accepted change (measured)", metric_result: unavailable(reason) },
      ...buildTrustIndicators(null, period),
    ];
    return { deliveryHealth, stageIndicators, unavailable: collectUnavailable(deliveryHealth, stageIndicators) };
  }

  const obs = input.observations;
  const sinceMs = period.currentSince.getTime();
  const untilMs = period.currentUntil.getTime();
  const events = obs.events;
  const submissions = events.filter((event): event is SubmissionEvent => event.kind === "submission");

  // Cohort: accepted in the half-open period, acceptance point observed, lifecycle built.
  const cohortByChange = new Map<string, AcceptanceEvent>();
  let uncoveredAcceptances = 0;
  for (const event of events) {
    if (event.kind !== "acceptance" || event.decision !== "accepted") continue;
    const at = Date.parse(event.observed_at);
    if (at < sinceMs || at >= untilMs) continue;
    if (!pointCovered(obs, event)) {
      uncoveredAcceptances += 1;
      continue;
    }
    const previous = cohortByChange.get(event.change_id);
    if (!previous || at < Date.parse(previous.observed_at)) cohortByChange.set(event.change_id, event);
  }
  const cohort: CohortMember[] = [...cohortByChange.values()].map((acceptance) =>
    buildMember(events, submissions, acceptance),
  );
  const cohortLimitations = [
    sourceLimitation(obs),
    ...(uncoveredAcceptances > 0
      ? [`${uncoveredAcceptances} accepted acceptance event(s) had no point coverage and were excluded.`]
      : []),
  ];
  // --- Review effort -------------------------------------------------------
  const reviewTotals: number[] = [];
  let reviewExcluded = 0;
  for (const member of cohort) {
    if (!memberCovered(obs, member, "review")) {
      reviewExcluded += 1;
      continue;
    }
    const reviews = memberEvents(member, events, "review") as ReviewEvent[];
    if (reviews.length === 0) {
      reviewExcluded += 1;
      continue;
    }
    const perSession = new Map<string, number>();
    for (const event of reviews) {
      if (!perSession.has(event.session_id)) perSession.set(event.session_id, event.active_seconds);
    }
    reviewTotals.push([...perSession.values()].reduce((sum, seconds) => sum + seconds, 0));
  }
  const reviewMedian = median(reviewTotals);
  const reviewRow: StageIndicatorRow = {
    stage: "Review",
    indicator: "human review effort per accepted change (measured)",
    metric_result:
      reviewMedian === undefined
        ? unavailable(
            `no accepted change in ${period.label} has complete review lifecycle coverage and a review observation`,
          )
        : measured(
            `median ${(reviewMedian / 60).toFixed(1)} min/accepted change`,
            reviewTotals.length,
            reviewExcluded === 0 ? "complete" : "partial",
            [
              ...cohortLimitations,
              ...(reviewExcluded > 0
                ? [`${reviewExcluded} accepted change(s) lacked lifecycle review coverage or review observations and were excluded.`]
                : []),
            ],
          ),
  };

  // --- Decision wait -------------------------------------------------------
  const completedWaits: number[] = [];
  let pendingWaits = 0;
  let censoredWaits = 0;
  let waitExcluded = 0;
  for (const member of cohort) {
    if (!memberCovered(obs, member, "decision-wait")) {
      waitExcluded += 1;
      continue;
    }
    for (const event of memberEvents(member, events, "decision-wait") as DecisionWaitEvent[]) {
      const opened = Date.parse(event.opened_at);
      if (opened > member.end) {
        censoredWaits += 1;
        continue;
      }
      if (event.resolved_at === null) {
        pendingWaits += 1;
        continue;
      }
      const resolved = Date.parse(event.resolved_at);
      if (resolved > member.end) {
        pendingWaits += 1;
        continue;
      }
      if (!intervalCovered(obs, event.change_id, "decision-wait", event.revision, opened, resolved)) {
        censoredWaits += 1;
        continue;
      }
      completedWaits.push((resolved - opened) / MS_PER_HOUR);
    }
  }
  const waitMedian = median(completedWaits);
  const decisionRow: StageIndicatorRow = {
    stage: "Review",
    indicator: "decision wait (measured)",
    metric_result:
      cohort.length === 0
        ? unavailable(`no accepted change with complete coverage in ${period.label}`)
        : waitExcluded === cohort.length
          ? unavailable(
              `no accepted change in ${period.label} has lifecycle decision-wait coverage; waits are not zero`,
            )
          : measured(
            waitMedian === undefined
              ? `no completed decision wait; ${pendingWaits} pending and ${censoredWaits} censored`
              : `median ${waitMedian.toFixed(1)}h completed across ${completedWaits.length} decision(s); ${pendingWaits} pending and ${censoredWaits} censored`,
            completedWaits.length,
            waitExcluded > 0 || pendingWaits > 0 || censoredWaits > 0 ? "partial" : "complete",
            [
              ...cohortLimitations,
              ...(waitExcluded > 0
                ? [`${waitExcluded} accepted change(s) lacked lifecycle decision-wait coverage and were excluded.`]
                : []),
              ...(pendingWaits > 0 || censoredWaits > 0
                ? ["Unresolved and censored waits are reported separately, never as zero or as completed."]
                : []),
            ],
          ),
  };

  // --- Correction rounds ---------------------------------------------------
  const roundsPerChange: number[] = [];
  let correctionExcluded = 0;
  for (const member of cohort) {
    if (!memberCovered(obs, member, "correction")) {
      correctionExcluded += 1;
      continue;
    }
    const rounds = new Set(
      (memberEvents(member, events, "correction") as CorrectionEvent[]).map((event) => event.round_id),
    );
    roundsPerChange.push(rounds.size);
  }
  const roundsMedian = median(roundsPerChange);
  const correctionRow: StageIndicatorRow = {
    stage: "Review",
    indicator: "correction rounds per accepted change (measured)",
    metric_result:
      roundsMedian === undefined
        ? unavailable(`no accepted change in ${period.label} has complete lifecycle correction coverage`)
        : measured(
            `median ${roundsMedian.toFixed(1)} correction round(s)/accepted change`,
            roundsPerChange.length,
            correctionExcluded === 0 ? "complete" : "partial",
            [
              ...cohortLimitations,
              ...(correctionExcluded > 0
                ? [`${correctionExcluded} accepted change(s) lacked lifecycle correction coverage and were excluded.`]
                : []),
            ],
          ),
  };

  // --- First-pass acceptance ----------------------------------------------
  const firstPassCount = cohort.filter((member) => member.acceptance.attempt === 1).length;
  const firstPassRow: StageIndicatorRow = {
    stage: "Review",
    indicator: "first-pass acceptance (measured)",
    metric_result:
      cohort.length === 0
        ? unavailable(`no accepted change with complete coverage in ${period.label}`)
        : measured(
            `${firstPassCount}/${cohort.length} accepted on attempt 1`,
            cohort.length,
            uncoveredAcceptances > 0 ? "partial" : "complete",
            cohortLimitations,
          ),
  };

  // --- Escaped defects and rollbacks --------------------------------------
  const cohortDeployments: DeploymentEvent[] = [];
  const cohortDefects: DefectEvent[] = [];
  const escapeCoverageProblems: string[] = [];
  let membersWithoutDeployments = 0;
  for (const member of cohort) {
    const deployments = events.filter(
      (event): event is DeploymentEvent =>
        isDeploymentEvent(event) &&
        event.change_id === member.acceptance.change_id &&
        member.revisions.includes(event.revision) &&
        Date.parse(event.deployed_at) < untilMs,
    );
    const deploymentIds = new Set(deployments.map((deployment) => deployment.deployment_id));
    const defects = events.filter(
      (event): event is DefectEvent =>
        isDefectEvent(event) &&
        deploymentIds.has(event.deployment_id) &&
        Date.parse(event.detected_at) < untilMs,
    );
    if (deployments.length === 0) membersWithoutDeployments += 1;
    for (const deployment of deployments) {
      if (
        !intervalCovered(
          obs,
          deployment.change_id,
          "deployment",
          deployment.revision,
          Date.parse(deployment.first_change_at),
          Date.parse(deployment.deployed_at),
        )
      ) {
        escapeCoverageProblems.push(
          `deployment ${deployment.deployment_id} (${deployment.change_id}/${deployment.revision}) lacks spanning deployment coverage from first_change_at to deployed_at`,
        );
      }
      if (
        !intervalCovered(
          obs,
          deployment.change_id,
          "defect",
          deployment.revision,
          Date.parse(deployment.deployed_at),
          Date.parse(period.currentUntil.toISOString()),
        )
      ) {
        escapeCoverageProblems.push(
          `deployment ${deployment.deployment_id} lacks incident coverage from deployment through the report horizon`,
        );
      }
      cohortDeployments.push(deployment);
    }
    for (const defect of defects) {
      const detected = Date.parse(defect.detected_at);
      const restored = defect.restored_at === null ? detected : Date.parse(defect.restored_at);
      if (!intervalCovered(obs, defect.change_id, "defect", defect.revision, detected, Math.min(restored, untilMs))) {
        escapeCoverageProblems.push(
          `defect of deployment ${defect.deployment_id} lacks spanning defect coverage from detected_at to its restoration endpoint`,
        );
      }
      cohortDefects.push(defect);
    }
  }
  const cohortDeploymentIds = new Set(cohortDeployments.map((deployment) => deployment.deployment_id));
  const affectedDeployments = new Set(cohortDefects.map((defect) => defect.deployment_id));
  const failedDeployments = new Set(
    cohortDefects
      .filter((defect) => defect.remediation !== "none")
      .map((defect) => defect.deployment_id),
  );
  const rolledBackDeployments = new Set(
    cohortDefects.filter((defect) => defect.remediation === "rollback").map((defect) => defect.deployment_id),
  );
  const escapedDefects = new Set(cohortDefects.map((defect) => `${defect.deployment_id}|${defect.detected_at}`));
  const defectRow: StageIndicatorRow = {
    stage: "Maintain",
    indicator: "escaped defects and rollbacks (measured)",
    metric_result:
      cohort.length === 0
        ? unavailable(`no accepted change with complete coverage in ${period.label}`)
        : escapeCoverageProblems.length > 0
          ? unavailable(
              `deployment/incident coverage is missing for cohort members: ${escapeCoverageProblems[0]}${
                escapeCoverageProblems.length > 1 ? ` (+${escapeCoverageProblems.length - 1} more)` : ""
              }`,
            )
          : membersWithoutDeployments === cohort.length
            ? unavailable(
                `no deployment observation for accepted changes in ${period.label}; escape risk is not assessed`,
              )
            : measured(
                `${escapedDefects.size} escaped defect observation(s) across ${affectedDeployments.size} deployment(s); ${
                  failedDeployments.size
                }/${cohortDeploymentIds.size} deployment(s) with hotfix/rollback; ${rolledBackDeployments.size} rollback(s)`,
                escapedDefects.size,
                membersWithoutDeployments > 0 ? "partial" : "complete",
                [
                  ...cohortLimitations,
                  "Escaped defects include remediation 'none'; hotfix/rollback counts use distinct deployments.",
                  ...(membersWithoutDeployments > 0
                    ? [`${membersWithoutDeployments} accepted change(s) have no deployment observation.`]
                    : []),
                ],
              ),
  };

  // --- Cost per accepted change (currency-specific) ------------------------
  const seenCharges = new Set<string>();
  interface MemberCost {
    covered: boolean;
    uncovered: number;
    byCurrency: Map<string, Map<CostEvent["component"], number>>;
  }
  const memberCosts = new Map<CohortMember, MemberCost>();
  let uncoveredCostEvents = 0;
  let membersMissingCostCoverage = 0;
  for (const member of cohort) {
    const covered = memberCovered(obs, member, "cost");
    if (!covered) membersMissingCostCoverage += 1;
    const costs = memberEvents(member, events, "cost") as CostEvent[];
    const byCurrency = new Map<string, Map<CostEvent["component"], number>>();
    let uncovered = 0;
    for (const event of costs) {
      if (!pointCovered(obs, event)) {
        uncovered += 1;
        uncoveredCostEvents += 1;
        continue;
      }
      if (seenCharges.has(event.charge_id)) continue;
      seenCharges.add(event.charge_id);
      const components = byCurrency.get(event.currency) ?? new Map<CostEvent["component"], number>();
      components.set(event.component, (components.get(event.component) ?? 0) + event.amount);
      byCurrency.set(event.currency, components);
    }
    memberCosts.set(member, { covered, uncovered, byCurrency });
  }
  const currencies = [...new Set([...memberCosts.values()].flatMap((cost) => [...cost.byCurrency.keys()]))].sort();
  const costRows: StageIndicatorRow[] = [];
  const costComponents: CostEvent["component"][] = ["agent", "human", "tooling"];
  if (cohort.length === 0) {
    costRows.push({
      stage: "Delivery",
      indicator: "cost per accepted change (measured)",
      metric_result: unavailable(`no accepted change with complete coverage in ${period.label}`),
    });
  } else if (currencies.length === 0) {
    costRows.push({
      stage: "Delivery",
      indicator: "cost per accepted change (measured)",
      metric_result: unavailable(
        uncoveredCostEvents > 0
          ? `${uncoveredCostEvents} cost observation(s) fall outside declared coverage; cost is never inferred from elapsed time`
          : "no explicit cost observation for accepted changes; cost is never inferred from elapsed time",
      ),
    });
  } else {
    const multiCurrency = currencies.length > 1;
    for (const currency of currencies) {
      const perComponent = new Map<CostEvent["component"], number>();
      const componentSamples = new Map<CostEvent["component"], number>();
      let complete = uncoveredCostEvents === 0;
      for (const member of cohort) {
        const cost = memberCosts.get(member);
        if (!cost?.covered) complete = false;
        const components = cost?.byCurrency.get(currency);
        for (const component of costComponents) {
          const amount = components?.get(component);
          if (amount === undefined) {
            complete = false;
            continue;
          }
          perComponent.set(component, (perComponent.get(component) ?? 0) + amount);
          componentSamples.set(component, (componentSamples.get(component) ?? 0) + 1);
        }
      }
      const limitations = [
        ...cohortLimitations,
        ...(multiCurrency ? ["Cost is reported per currency; currencies are never combined."] : []),
        "Total cost requires complete lifecycle cost coverage and explicitly observed agent, human, and tooling components for every accepted change.",
        ...(membersMissingCostCoverage > 0
          ? [`${membersMissingCostCoverage} accepted change(s) lack lifecycle cost coverage.`]
          : []),
        ...(uncoveredCostEvents > 0
          ? [`${uncoveredCostEvents} cost observation(s) fall outside declared coverage.`]
          : []),
      ];
      if (complete) {
        const total = [...perComponent.values()].reduce((sum, amount) => sum + amount, 0);
        costRows.push({
          stage: "Delivery",
          indicator: `cost per accepted change (${currency}) (measured)`,
          metric_result: measured(
            `${currency} ${formatMoney(total / cohort.length)}/accepted change`,
            cohort.length,
            "complete",
            limitations,
          ),
        });
      } else {
        costRows.push({
          stage: "Delivery",
          indicator: `cost per accepted change (${currency}) (measured)`,
          metric_result: unavailable(
            `total cost per accepted change is unavailable for ${currency}: ${membersMissingCostCoverage} change(s) lack lifecycle cost coverage and ${uncoveredCostEvents} cost observation(s) are uncovered`,
          ),
        });
        const partial = costComponents
          .filter((component) => componentSamples.has(component))
          .map(
            (component) =>
              `${component} ${currency} ${formatMoney(
                (perComponent.get(component) ?? 0) / (componentSamples.get(component) ?? 1),
              )} (n=${componentSamples.get(component) ?? 0})`,
          )
          .join(", ");
        if (partial.length > 0) {
          const missing = costComponents.filter((component) => !componentSamples.has(component));
          costRows.push({
            stage: "Delivery",
            indicator: `cost per accepted change (${currency}, partial components) (measured)`,
            metric_result: measured(
              `${partial}/accepted change`,
              cohort.length,
              "partial",
              [...limitations, `Unobserved component(s): ${missing.length > 0 ? missing.join(", ") : "none"}.`],
            ),
          });
        }
      }
    }
  }

  // --- DORA rows from observed domain times -------------------------------
  const allDeployments = events.filter(isDeploymentEvent);
  const periodDeployments = allDeployments.filter((deployment) => {
    const at = Date.parse(deployment.deployed_at);
    return at >= sinceMs && at < untilMs;
  });
  const deploymentCovered = (deployment: DeploymentEvent): boolean =>
    intervalCovered(obs, deployment.change_id, "deployment", deployment.revision, sinceMs, untilMs);
  const coveredDeployments = periodDeployments.filter(deploymentCovered);
  const uncoveredDeployments = periodDeployments.filter((deployment) => !deploymentCovered(deployment));

  const deploymentFrequency: DeliveryHealthRow = {
    metric: "Deployment frequency (observed)",
    metric_result:
      periodDeployments.length === 0
        ? unavailable(`no deployment event has a deployed_at inside ${period.label}; a zero frequency is not inferred`)
        : uncoveredDeployments.length === 0
          ? measured(
              `${periodDeployments.length} observed production deployment(s) in ${period.label}`,
              periodDeployments.length,
              "complete",
              [sourceLimitation(obs)],
            )
          : measured(
              `${coveredDeployments.length} of ${periodDeployments.length} observed deployment(s) lie inside complete period coverage; coverage is incomplete`,
              coveredDeployments.length,
              "partial",
              [
                sourceLimitation(obs),
                `${uncoveredDeployments.length} deployment(s) lack complete deployment coverage for their change/revision over the period.`,
              ],
            ),
  };

  const leadTimesHours = coveredDeployments.map(
    (deployment) => (Date.parse(deployment.deployed_at) - Date.parse(deployment.first_change_at)) / MS_PER_HOUR,
  );
  const leadTimeMedian = median(leadTimesHours);
  const leadTime: DeliveryHealthRow = {
    metric: "Lead time for changes (observed)",
    metric_result:
      leadTimeMedian === undefined
        ? unavailable(`no observed deployment in ${period.label} inside complete deployment coverage`)
        : measured(
            `median ${leadTimeMedian.toFixed(1)}h`,
            leadTimesHours.length,
            uncoveredDeployments.length === 0 ? "complete" : "partial",
            [
              sourceLimitation(obs),
              "first_change_at is operator-supplied; the first commit is not inferred from git.",
              ...(uncoveredDeployments.length > 0
                ? [`${uncoveredDeployments.length} deployment(s) outside complete coverage were excluded from the median.`]
                : []),
            ],
          ),
  };

  const cfrCoverageProblems: string[] = [];
  for (const deployment of periodDeployments) {
    if (!deploymentCovered(deployment)) {
      cfrCoverageProblems.push(
        `deployment ${deployment.deployment_id} lacks period deployment coverage for ${deployment.change_id}/${deployment.revision}`,
      );
    }
    if (!intervalCovered(obs, deployment.change_id, "defect", deployment.revision, sinceMs, untilMs)) {
      cfrCoverageProblems.push(
        `deployment ${deployment.deployment_id} lacks period incident coverage for ${deployment.change_id}/${deployment.revision}`,
      );
    }
  }
  const periodDeploymentIds = new Set(periodDeployments.map((deployment) => deployment.deployment_id));
  const uncoveredDefects = events.filter(
    (event): event is DefectEvent =>
      isDefectEvent(event) &&
      periodDeploymentIds.has(event.deployment_id) &&
      Date.parse(event.detected_at) < untilMs &&
      !pointCovered(obs, event),
  );
  for (const defect of uncoveredDefects) {
    cfrCoverageProblems.push(`defect of deployment ${defect.deployment_id} falls outside declared coverage`);
  }
  const failedDeploymentIds = new Set(
    events
      .filter(
        (event): event is DefectEvent =>
          isDefectEvent(event) &&
          periodDeploymentIds.has(event.deployment_id) &&
          Date.parse(event.detected_at) < untilMs &&
          periodDeployments.some(
            (deployment) =>
              deployment.deployment_id === event.deployment_id &&
              deployment.change_id === event.change_id &&
              deployment.revision === event.revision,
          ) &&
          event.remediation !== "none",
      )
      .map((event) => event.deployment_id),
  );
  const changeFailureRate: DeliveryHealthRow = {
    metric: "Change failure rate (observed)",
    metric_result:
      periodDeployments.length === 0
        ? unavailable(`no observed deployment in ${period.label} to classify`)
        : cfrCoverageProblems.length > 0
          ? unavailable(
              `complete deployment and incident coverage is required for every deployment in ${period.label}: ${cfrCoverageProblems[0]}${
                cfrCoverageProblems.length > 1 ? ` (+${cfrCoverageProblems.length - 1} more)` : ""
              }`,
            )
          : measured(
              `${failedDeploymentIds.size}/${periodDeployments.length} deployment(s) with a hotfix/rollback defect`,
              periodDeployments.length,
              "complete",
              [
                sourceLimitation(obs),
                "A deployment without a recorded defect counts as failure-free only inside complete incident coverage for its revision.",
              ],
            ),
  };

  const periodDefects = events.filter((event): event is DefectEvent => {
    if (!isDefectEvent(event)) return false;
    const detected = Date.parse(event.detected_at);
    return detected >= sinceMs && detected < untilMs;
  });
  const restoreHours: number[] = [];
  let pendingRestores = 0;
  let censoredRestores = 0;
  for (const defect of periodDefects) {
    const detected = Date.parse(defect.detected_at);
    if (defect.restored_at === null) {
      pendingRestores += 1;
      continue;
    }
    const restored = Date.parse(defect.restored_at);
    if (restored >= untilMs) {
      censoredRestores += 1;
      continue;
    }
    if (!intervalCovered(obs, defect.change_id, "defect", defect.revision, detected, restored)) {
      censoredRestores += 1;
      continue;
    }
    restoreHours.push((restored - detected) / MS_PER_HOUR);
  }
  const restoreMedian = median(restoreHours);
  const timeToRestore: DeliveryHealthRow = {
    metric: "Time to restore (observed)",
    metric_result:
      periodDefects.length === 0
        ? unavailable(`no incident has a detected_at inside ${period.label}`)
        : restoreMedian === undefined
          ? unavailable(
              `no restored incident inside complete coverage and the selected evidence horizon; ${pendingRestores} pending and ${censoredRestores} censored`,
            )
          : measured(
              `median ${restoreMedian.toFixed(1)}h (${restoreHours.length} restored incident(s))`,
              restoreHours.length,
              pendingRestores > 0 || censoredRestores > 0 ? "partial" : "complete",
              [
                sourceLimitation(obs),
                "Restoration beyond coverage or beyond the report horizon is censored, never counted as a completed duration.",
                ...(pendingRestores + censoredRestores > 0
                  ? [`${pendingRestores} pending and ${censoredRestores} censored incident(s) are excluded from the median.`]
                  : []),
              ],
            ),
  };

  const deliveryHealth: DeliveryHealthRow[] = [deploymentFrequency, leadTime, changeFailureRate, timeToRestore];
  const stageIndicators: StageIndicatorRow[] = [
    reviewRow,
    decisionRow,
    correctionRow,
    firstPassRow,
    defectRow,
    ...costRows,
    ...buildTrustIndicators(obs, period),
  ];
  return { deliveryHealth, stageIndicators, unavailable: collectUnavailable(deliveryHealth, stageIndicators) };
}

function collectUnavailable(
  deliveryHealth: DeliveryHealthRow[],
  stageIndicators: StageIndicatorRow[],
): { metric: string; reason: string }[] {
  const rows: { metric: string; reason: string }[] = [];
  for (const row of deliveryHealth) {
    if (!row.metric_result.available) rows.push({ metric: row.metric, reason: row.metric_result.reason });
  }
  for (const row of stageIndicators) {
    if (!row.metric_result.available) {
      rows.push({ metric: `${row.stage}: ${row.indicator}`, reason: row.metric_result.reason });
    }
  }
  return rows;
}
