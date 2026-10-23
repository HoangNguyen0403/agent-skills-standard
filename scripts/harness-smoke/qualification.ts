import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  AGENT_CAPABILITIES,
  DELEGATION_OPERATIONS,
  type DelegationOperation,
  type RuntimeEvidence,
  type SupportStatus,
} from "../../cli/src/capabilities/agentCapabilities";
import type { CheckResult } from "./checks";

export type EvidenceLayer = RuntimeEvidence["layer"];
export type EvidenceExecutor = RuntimeEvidence["executor"];

/**
 * One recorded conformance observation. Extends the shared delegation
 * vocabulary with the artifact binding required to promote a claim:
 * `trace` is a project-relative evidence path and `digest` is the SHA-256 of
 * that artifact's bytes at recording time.
 */
export interface ConformanceRecord extends RuntimeEvidence {
  digest: string;
  scenario: string;
  taskId?: string;
  attemptId?: string;
  authority?: string;
  actor?: string;
  reviewer?: string;
  reason?: string;
}

export interface SupportClaim {
  host: string;
  surface: string;
  version: string;
  revision: string;
  operation: DelegationOperation;
  controls: readonly string[];
  records: readonly ConformanceRecord[];
  evidenceRoot: string;
}

export interface SupportAssessment {
  status: SupportStatus;
  provenance: "native" | "fixture";
  evidenceLayers: EvidenceLayer[];
  missingEvidence: string[];
  reasons: string[];
  limitations: string[];
}

export interface LifecycleSummary {
  taskId: string;
  attemptId: string;
  authority: string;
  status: "running" | "completed" | "cancelled" | "timed_out" | "not_verified";
  completed: boolean;
  collected: boolean;
  verified: boolean;
  limitations: string[];
}

const LAYERS: readonly EvidenceLayer[] = [
  "serialization",
  "discovery",
  "execution",
  "denial",
];
const EXECUTORS: readonly EvidenceExecutor[] = ["live", "synthetic"];
const OUTCOMES: ReadonlyArray<RuntimeEvidence["outcome"]> = [
  "observed_pass",
  "observed_fail",
];
const LIFECYCLE_OPERATIONS: readonly DelegationOperation[] = [
  "dispatch",
  "resume",
  "receive_completion",
  "cancel",
  "collect_receipt",
  "verify_acceptance",
];
const DIGEST = /^[a-f0-9]{64}$/;
const LABEL = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/**
 * Resolve the declared native surface for a host. Records must use the shared
 * surface identifier, never the surface kind (e.g. `native-agent`).
 */
function declaredSurface(host: string): string | null | undefined {
  const definition = (
    AGENT_CAPABILITIES as unknown as Record<
      string,
      { delegation?: { surface: string | null } } | undefined
    >
  )[host];
  return definition?.delegation?.surface;
}

function assertHostSurface(host: string, surface: string, label: string): void {
  const declared = declaredSurface(host);
  if (declared === undefined)
    throw new Error(`${label} declares an unknown host ${host}.`);
  if (!declared || surface !== declared)
    throw new Error(
      `${label} must use the declared host surface ${declared ?? "none"} for ${host}, not ${surface}.`,
    );
}

interface ArtifactCheck {
  ok: boolean;
  reason?: string;
}

function canonicalRoot(root: string): string {
  const absolute = path.resolve(root);
  try {
    return fs.realpathSync(absolute);
  } catch {
    return absolute;
  }
}

/**
 * Resolve a reference against the real evidence root and the real target.
 * A lexical-only check would let a symlink inside the root point at an
 * outside file whose digest then matches; containment is verified on real
 * paths before any read.
 */
function resolveInside(
  root: string,
  reference: string,
): { path: string } | { reason: string } {
  if (!reference || path.isAbsolute(reference))
    return {
      reason: `evidence reference ${reference} must be a relative path inside the evidence root`,
    };
  if (reference.split(/[\\/]/).includes(".."))
    return {
      reason: `evidence reference ${reference} escapes the evidence root`,
    };
  const realRoot = canonicalRoot(root);
  const lexical = path.resolve(realRoot, reference);
  let realTarget: string;
  try {
    realTarget = fs.realpathSync(lexical);
  } catch {
    return { reason: `missing evidence artifact ${reference}` };
  }
  const relative = path.relative(realRoot, realTarget);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    return {
      reason: `evidence reference ${reference} resolves outside the evidence root`,
    };
  return { path: realTarget };
}

function verifyArtifact(
  record: ConformanceRecord,
  root: string,
): ArtifactCheck {
  const resolved = resolveInside(root, record.trace);
  if ("reason" in resolved) return { ok: false, reason: resolved.reason };
  let bytes: Buffer;
  try {
    bytes = fs.readFileSync(resolved.path);
  } catch {
    return { ok: false, reason: `missing evidence artifact ${record.trace}` };
  }
  if (bytes.length === 0)
    return { ok: false, reason: `empty evidence artifact ${record.trace}` };
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (record.digest !== digest)
    return {
      ok: false,
      reason: `digest mismatch for evidence artifact ${record.trace}`,
    };
  return { ok: true };
}

function readRecord(value: unknown, line: number): ConformanceRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`Evidence record ${line} is not a JSON object.`);
  const entry = value as Record<string, unknown>;
  const text = (field: string): string => {
    const candidate = entry[field];
    if (typeof candidate !== "string" || !candidate)
      throw new Error(`Evidence record ${line} requires a string ${field}.`);
    return candidate;
  };
  const operation = text("operation") as DelegationOperation;
  if (!DELEGATION_OPERATIONS.includes(operation))
    throw new Error(
      `Evidence record ${line} declares an unknown operation ${operation}.`,
    );
  const layer = text("layer") as EvidenceLayer;
  if (!LAYERS.includes(layer))
    throw new Error(`Evidence record ${line} declares an unknown layer.`);
  const executor = text("executor") as EvidenceExecutor;
  if (!EXECUTORS.includes(executor))
    throw new Error(`Evidence record ${line} declares an unknown executor.`);
  const outcome = text("outcome") as RuntimeEvidence["outcome"];
  if (!OUTCOMES.includes(outcome))
    throw new Error(`Evidence record ${line} declares an unknown outcome.`);
  const controls = entry.controls;
  if (
    !Array.isArray(controls) ||
    controls.some((control) => typeof control !== "string" || !control)
  )
    throw new Error(`Evidence record ${line} requires string controls.`);
  const digest = text("digest");
  if (!DIGEST.test(digest))
    throw new Error(`Evidence record ${line} requires a SHA-256 digest.`);
  assertHostSurface(text("host"), text("surface"), `Evidence record ${line}`);
  const record: ConformanceRecord = {
    host: text("host"),
    surface: text("surface"),
    version: text("version"),
    revision: text("revision"),
    operation,
    layer,
    executor,
    outcome,
    trace: text("trace"),
    digest,
    controls: controls as string[],
    scenario: text("scenario"),
  };
  for (const field of [
    "taskId",
    "attemptId",
    "authority",
    "actor",
    "reviewer",
  ] as const) {
    const candidate = entry[field];
    if (candidate === undefined) continue;
    if (typeof candidate !== "string" || !LABEL.test(candidate))
      throw new Error(
        `Evidence record ${line} declares an unsafe ${field} label.`,
      );
    record[field] = candidate;
  }
  if (entry.reason !== undefined) {
    if (typeof entry.reason !== "string" || !LABEL.test(entry.reason))
      throw new Error(`Evidence record ${line} declares an unsafe reason.`);
    record.reason = entry.reason;
  }
  return record;
}

/**
 * Read a recorded conformance index and verify every referenced artifact is
 * retained, inside the evidence root, and content-addressed by its digest.
 * Corrupt evidence throws; no support claim is implied by parsing alone.
 */
export function loadConformanceRecords(
  indexPath: string,
  evidenceRoot: string,
): ConformanceRecord[] {
  let text: string;
  try {
    text = fs.readFileSync(indexPath, "utf8");
  } catch {
    throw new Error("Conformance record index could not be opened.");
  }
  const root = path.resolve(evidenceRoot);
  const records: ConformanceRecord[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(
        `Conformance record index is not valid JSON at line ${index + 1}.`,
      );
    }
    const record = readRecord(value, index + 1);
    const check = verifyArtifact(record, root);
    if (!check.ok) throw new Error(check.reason);
    records.push(record);
  }
  return records;
}

function passes(record: ConformanceRecord, root: string): boolean {
  return (
    record.executor === "live" &&
    record.outcome === "observed_pass" &&
    verifyArtifact(record, root).ok
  );
}

/**
 * Resolve one operation's support status from recorded evidence. Promotion to
 * `supported` requires retained, digest-matching live discovery, live
 * execution, and one successful denial observation per required control.
 */
export function assessSupport(claim: SupportClaim): SupportAssessment {
  const scoped = claim.records.filter(
    (record) =>
      record.host === claim.host &&
      record.surface === claim.surface &&
      record.version === claim.version,
  );
  const matched = scoped.filter(
    (record) =>
      record.revision === claim.revision &&
      record.operation === claim.operation,
  );
  const missingEvidence: string[] = [];
  const reasons: string[] = [];
  const layers = new Set<EvidenceLayer>();

  for (const record of scoped) {
    if (record.revision !== claim.revision)
      missingEvidence.push(
        `evidence revision ${record.revision} does not match claim revision ${claim.revision}`,
      );
    if (record.operation === claim.operation) layers.add(record.layer);
  }

  const artifactOk = (record: ConformanceRecord): boolean => {
    const check = verifyArtifact(record, claim.evidenceRoot);
    if (check.ok) return true;
    missingEvidence.push(check.reason ?? "unverified evidence artifact");
    return false;
  };

  const failedControls = new Set(
    matched
      .filter(
        (record) =>
          record.layer === "denial" &&
          record.outcome === "observed_fail" &&
          record.controls.some((control) => claim.controls.includes(control)) &&
          artifactOk(record),
      )
      .flatMap((record) =>
        record.controls.filter((control) => claim.controls.includes(control)),
      ),
  );
  for (const control of failedControls)
    reasons.push(
      `required control ${control} was not enforced in its denial scenario`,
    );

  const discovery = matched.some(
    (record) =>
      record.layer === "discovery" && passes(record, claim.evidenceRoot),
  );
  const execution = matched.some(
    (record) =>
      record.layer === "execution" && passes(record, claim.evidenceRoot),
  );
  if (!discovery)
    missingEvidence.push(
      `live discovery evidence for ${claim.operation} at revision ${claim.revision}`,
    );
  if (!execution)
    missingEvidence.push(
      `live execution evidence for ${claim.operation} at revision ${claim.revision}`,
    );

  const enforcedControls = new Set<string>();
  for (const control of claim.controls) {
    const enforced = matched.some(
      (record) =>
        record.layer === "denial" &&
        record.controls.includes(control) &&
        passes(record, claim.evidenceRoot),
    );
    if (enforced) enforcedControls.add(control);
    else if (!failedControls.has(control))
      missingEvidence.push(`denial evidence for control ${control}`);
  }

  for (const record of matched) artifactOk(record);
  if (matched.length === 0)
    missingEvidence.push(
      `no conformance record for ${claim.operation} at revision ${claim.revision}`,
    );

  const status: SupportStatus =
    failedControls.size > 0
      ? "unsupported"
      : discovery &&
          execution &&
          enforcedControls.size === claim.controls.length
        ? "supported"
        : "not_verified";
  const liveMatched = matched.some((record) => record.executor === "live");

  return {
    status,
    provenance: liveMatched ? "native" : "fixture",
    evidenceLayers: [...layers],
    missingEvidence: [...new Set(missingEvidence)],
    reasons,
    limitations: [
      "Recorded traces are caller-supplied; live provenance and host enforcement are not authenticated by this report.",
      ...(liveMatched
        ? []
        : [
            "Synthetic or fixture observations are assessment mechanics, not native evidence.",
          ]),
    ],
  };
}

/**
 * Derive lifecycle truth from recorded operations. Cancellation and timeout
 * are never reported as completion, resume must keep the same task authority,
 * and acceptance requires a reviewer distinct from the dispatching actor.
 */
export function summarizeLifecycle(
  records: readonly ConformanceRecord[],
): LifecycleSummary {
  const dispatch =
    records.find(
      (record) =>
        record.operation === "dispatch" && record.layer === "execution",
    ) ?? records.find((record) => record.operation === "dispatch");
  if (!dispatch)
    throw new Error("Lifecycle evidence requires a dispatch record.");
  const notVerified = (limitation: string): LifecycleSummary => ({
    taskId: dispatch.taskId ?? "",
    attemptId: dispatch.attemptId ?? "",
    authority: dispatch.authority ?? "",
    status: "not_verified",
    completed: false,
    collected: false,
    verified: false,
    limitations: [limitation],
  });
  if (
    typeof dispatch.taskId !== "string" ||
    dispatch.taskId.length === 0 ||
    typeof dispatch.attemptId !== "string" ||
    dispatch.attemptId.length === 0 ||
    typeof dispatch.authority !== "string" ||
    dispatch.authority.length === 0 ||
    dispatch.layer !== "execution" ||
    dispatch.outcome !== "observed_pass"
  )
    return notVerified(
      "Lifecycle truth requires a successful execution-layer dispatch with nonempty task, attempt, and authority boundary fields.",
    );
  const sameTask = (record: ConformanceRecord): boolean =>
    record.taskId === dispatch.taskId && record.revision === dispatch.revision;
  for (const record of records) {
    if (record.operation !== "resume") continue;
    if (
      !sameTask(record) ||
      (record.authority ?? "") !== (dispatch.authority ?? "")
    )
      throw new Error(
        "Resume must keep the same task boundary and authority as its dispatch.",
      );
  }
  const invalidSuccessfulResume = records.some(
    (record) =>
      record.operation === "resume" &&
      sameTask(record) &&
      record.outcome === "observed_pass" &&
      (record.layer !== "execution" ||
        typeof record.attemptId !== "string" ||
        record.attemptId.length === 0),
  );
  if (invalidSuccessfulResume)
    return notVerified(
      "A successful resume requires an execution layer and a nonempty attempt boundary.",
    );
  const resumes = records.filter(
    (record) =>
      record.operation === "resume" &&
      sameTask(record) &&
      record.layer === "execution" &&
      record.attemptId !== undefined &&
      record.attemptId.length > 0 &&
      record.outcome === "observed_pass",
  );
  const active = resumes[resumes.length - 1] ?? dispatch;
  const scoped = records.filter(
    (record) => sameTask(record) && record.attemptId === active.attemptId,
  );
  const attemptId = active.attemptId ?? "";

  const cancels = scoped.filter(
    (record) =>
      record.operation === "cancel" && record.outcome === "observed_pass",
  );
  const timedOut = cancels.some((record) => record.reason === "timeout");
  const completedRecord = scoped.some(
    (record) =>
      record.operation === "receive_completion" &&
      record.outcome === "observed_pass",
  );
  const status: LifecycleSummary["status"] = timedOut
    ? "timed_out"
    : cancels.length > 0
      ? "cancelled"
      : completedRecord
        ? "completed"
        : "running";
  const completed = status === "completed";
  const collected = scoped.some(
    (record) =>
      record.operation === "collect_receipt" &&
      record.outcome === "observed_pass",
  );
  const acceptance = scoped
    .filter(
      (record) =>
        record.operation === "verify_acceptance" &&
        record.outcome === "observed_pass",
    )
    .pop();
  const actorKnown =
    typeof dispatch.actor === "string" && dispatch.actor.length > 0;
  const independent =
    actorKnown &&
    acceptance !== undefined &&
    acceptance.reviewer !== undefined &&
    acceptance.reviewer !== dispatch.actor;
  const limitations: string[] = [];
  if (!independent && acceptance !== undefined)
    limitations.push(
      actorKnown
        ? "Acceptance requires an independent reviewer; the implementer verdict is not acceptance."
        : "Independent acceptance cannot be established because the dispatching actor identity is missing.",
    );
  if (completed && !collected)
    limitations.push(
      "Completed receipt was not collected; required handoff evidence remains unverified.",
    );
  if (status === "cancelled" || status === "timed_out")
    limitations.push(
      "Cancellation or timeout is not successful completion or verification.",
    );

  return {
    taskId: dispatch.taskId ?? "",
    attemptId,
    authority: dispatch.authority ?? "",
    status,
    completed,
    collected,
    verified: completed && collected && independent,
    limitations,
  };
}

interface ClaimFile {
  host: string;
  surface: string;
  version: string;
  revision: string;
  operation: DelegationOperation;
  controls: readonly string[];
  records: readonly string[];
}

function readClaim(claimPath: string): ClaimFile {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(claimPath, "utf8"));
  } catch {
    throw new Error("Delegation support claim is not readable JSON.");
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error("Delegation support claim must be a JSON object.");
  const claim = raw as Record<string, unknown>;
  const text = (field: string): string => {
    const candidate = claim[field];
    if (typeof candidate !== "string" || !candidate)
      throw new Error(`Delegation support claim requires a string ${field}.`);
    return candidate;
  };
  const operation = text("operation") as DelegationOperation;
  if (!DELEGATION_OPERATIONS.includes(operation))
    throw new Error(
      `Delegation support claim declares unknown operation ${operation}.`,
    );
  assertHostSurface(text("host"), text("surface"), "Delegation support claim");
  const controls = claim.controls ?? [];
  if (
    !Array.isArray(controls) ||
    controls.some((control) => typeof control !== "string" || !control)
  )
    throw new Error("Delegation support claim requires string controls.");
  const records = claim.records;
  if (!Array.isArray(records) || records.length === 0)
    throw new Error(
      "Delegation support claim requires recorded evidence paths.",
    );
  for (const record of records)
    if (typeof record !== "string" || !record)
      throw new Error(
        "Delegation support claim evidence paths must be strings.",
      );
  return {
    host: text("host"),
    surface: text("surface"),
    version: text("version"),
    revision: text("revision"),
    operation,
    controls: controls as string[],
    records: records as string[],
  };
}

interface LoadedClaim {
  claim: ClaimFile;
  records: ConformanceRecord[];
}

function loadClaim(repoRoot: string, claimPath: string): LoadedClaim | string {
  try {
    const claim = readClaim(claimPath);
    const root = path.resolve(repoRoot);
    const records: ConformanceRecord[] = [];
    for (const reference of claim.records) {
      const resolved = resolveInside(root, reference);
      if ("reason" in resolved) throw new Error(resolved.reason);
      records.push(...loadConformanceRecords(resolved.path, root));
    }
    return { claim, records };
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Harness/report entry point: validate recorded traces for one claim and
 * report the shared support status. No host process is spawned.
 */
export function checkDelegationQualification(
  repoRoot: string,
  claimPath: string | null,
): CheckResult {
  const name = "delegation-qualification";
  if (!claimPath)
    return {
      name,
      status: "not_verified",
      evidence:
        "no support claim registered; native delegation support is not claimed (pass --claim <path> to validate recorded traces)",
    };
  const loaded = loadClaim(repoRoot, claimPath);
  if (typeof loaded === "string")
    return {
      name,
      status: "not_verified",
      evidence: `evidence unreadable: ${loaded}`,
    };
  const { claim } = loaded;
  const assessment = assessSupport({
    ...claim,
    records: loaded.records,
    evidenceRoot: path.resolve(repoRoot),
  });
  let lifecycle = "";
  let lifecycleError: string | null = null;
  if (
    loaded.records.some((record) =>
      LIFECYCLE_OPERATIONS.includes(record.operation),
    )
  ) {
    try {
      lifecycle = ` lifecycle=${summarizeLifecycle(loaded.records).status}`;
    } catch (error) {
      lifecycleError = error instanceof Error ? error.message : String(error);
      lifecycle = " lifecycle=invalid";
    }
  }
  const detail =
    assessment.status === "supported"
      ? `host=${claim.host} surface=${claim.surface} version=${claim.version} operation=${claim.operation} revision=${claim.revision}`
      : [...assessment.missingEvidence, ...assessment.reasons].join("; ");
  if (lifecycleError)
    return {
      name,
      status: "fail",
      evidence: `support=${assessment.status} provenance=${assessment.provenance}${lifecycle} | ${lifecycleError}${detail ? ` | ${detail}` : ""}`,
      tool: "recorded-traces",
      version: claim.version,
    };
  return {
    name,
    status: assessment.status === "supported" ? "pass" : assessment.status,
    evidence: `support=${assessment.status} provenance=${assessment.provenance}${lifecycle}${detail ? ` | ${detail}` : ""}`,
    tool: "recorded-traces",
    version: claim.version,
  };
}
