import { constants } from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  aggregateSession,
  captureSnapshot,
  rollUp,
  type AggregateLimits,
  type AggregatedSession,
  type SourceSnapshot,
} from "./aggregate";
import { readConsent, type ConsentRecord } from "./consent";
import type { ArtifactReceipt, NodeKey } from "./contracts";
import { discoverSession, type DiscoveryLimits } from "./discovery";
import {
  buildLedger,
  sanitizeLabel,
  verifyLedger,
  type Ledger,
  type LedgerCounts,
  type LedgerInput,
} from "./ledger";
import { readGitOutcome } from "./outcome";
import { loadPreviousReports, type SessionRates } from "./trend";
import { prepareV2 } from "./prepare";
import { RetrospectiveError } from "./errors";
import { resolveArtifact, StoreError } from "./store";
import { renderSummary } from "./views/summary";
import { renderReportHtml } from "./views/report-html";
import type { SessionTracker } from "../services/SessionTracker";

export type RunDeps = {
  tracker: SessionTracker;
  workspace: string;
  consentPath?: string;
  clock?: () => Date;
  limits?: Partial<AggregateLimits>;
  discoveryLimits?: Partial<DiscoveryLimits>;
  afterSnapshot?: () => Promise<void>;
  /**
   * TEST SEAM ONLY: awaited immediately before the final consent re-check and
   * publication, on both the native and the tracker-only paths.
   */
  beforePublish?: () => Promise<void>;
  platform?: NodeJS.Platform;
  /** TEST SEAM ONLY: applied immediately after buildLedger and before verifyLedger */
  tamperLedger?: (ledger: Ledger) => Ledger;
  /** Optional title from tool / agent */
  title?: string;
  /** When true (e.g. automatic trigger), require positively bound native main; refuse tracker-only */
  requireNativeMain?: boolean;
};

export type RunResult =
  | {
      resultVersion: 1;
      state: "prepared" | "already-prepared";
      evidenceMode: "native-files" | "tracker-only";
      artifactId: string;
      coverage: "complete" | "partial";
      fullyRead: number;
      sessions: number;
      counts: {
        agentsCreated: number;
        sessionsLinked: number;
        failedToolCalls: number;
        errorStops: number;
        claims: number;
        hypotheses: number;
      };
      viewPaths: { summary: string; ledger: string; reportHtml: string };
    }
  | {
      resultVersion: 1;
      state:
        | "disabled"
        | "not-substantive"
        | "ambiguous-session"
        | "child-session"
        | "no-native-evidence"
        | "failed";
      code?: string;
    };

type PublishedRunResult = Extract<
  RunResult,
  { state: "prepared" | "already-prepared" }
>;

const DEFAULT_AGGREGATE_LIMITS: Readonly<AggregateLimits> = Object.freeze({
  maxBytes: 512 * 1024 * 1024,
  maxMillis: 60_000,
});

/** Never aggregate more than this many child session files; the rest stay unlinked. */
const MAX_AGGREGATED_CHILD_FILES = 256;
/** Snapshot captures in flight at once. */
const SNAPSHOT_CONCURRENCY = 4;
/** Upper bound for a stored ledger we are willing to parse back. */
const MAX_STORED_LEDGER_BYTES = 1024 * 1024;

const STORED_LEDGER_READ_FLAGS =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;

/** Upper-case snake case codes that are safe to surface as a failure reason. */
const SAFE_ERROR_CODE_REGEX = /^[A-Z][A-Z0-9_]{2,63}$/;

const storedClaimSchema = z.strictObject({
  id: z.string().min(1),
  type: z.enum(["observation", "hypothesis", "recommendation"]),
  template: z.enum([
    "correction-concentration",
    "approval-friction",
    "error-stop-exposure",
    "delegation-accounting",
    "coordination-wait",
    "skill-usage",
    "skill-trigger-timing",
    "host-skill-reads",
    "tool-errors",
    "coverage",
    "permission-answers",
    "cost-drivers",
    "routing-order",
    "ags-lookups",
    "session-outcome",
    "permission-requests",
  ]),
  values: z.record(z.string(), z.union([z.number(), z.string()])),
  scope: z.strictObject({
    nodes: z.array(
      z.strictObject({
        hostId: z.string().min(1),
        sessionId: z.string().min(1),
      }),
    ),
    from: z.string().min(1),
    to: z.string().min(1),
  }),
  denominator: z
    .strictObject({ count: z.number(), unit: z.string().min(1) })
    .optional(),
  coverage: z.enum(["complete", "partial"]),
  supporting: z.array(z.string()),
  contradicting: z.array(z.string()),
  basedOn: z.array(z.string()),
});

const storedSkillUsageSchema = z.strictObject({
  since: z.string().min(1),
  events: z.number().int().nonnegative(),
  loadCalls: z.number().int().nonnegative(),
  noMatchCalls: z.number().int().nonnegative(),
  bodyReturns: z.number().int().nonnegative(),
  dedupedReturns: z.number().int().nonnegative(),
  estimatedTokens: z.number().int().nonnegative(),
  selectedNotLoaded: z.number().int().nonnegative(),
  workflows: z.number().int().nonnegative(),
  guides: z.number().int().nonnegative(),
  skillsTotal: z.number().int().nonnegative(),
  skills: z.array(
    z.strictObject({
      id: z.string().min(1),
      returns: z.number().int().nonnegative(),
      firstAt: z.string().min(1),
      via: z.array(z.string().min(1)),
    }),
  ),
});

const storedHostSkillsSchema = z.strictObject({
  total: z.number().int().nonnegative(),
  unique: z.number().int().nonnegative(),
  top: z.array(
    z.strictObject({
      id: z.string().min(1),
      reads: z.number().int().nonnegative(),
    }),
  ),
});

const storedCellSchema = z.strictObject({
  key: z.string().min(1),
  turns: z.number().int().nonnegative(),
  errorStops: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
});

const storedModelSchema = z.strictObject({
  model: z.string().min(1),
  turns: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  errorStops: z.number().int().nonnegative(),
});

const storedDaySchema = z.strictObject({
  day: z.string().min(1),
  turns: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  errorStops: z.number().int().nonnegative(),
});

const storedToolRowSchema = z.strictObject({
  tool: z.string().min(1),
  calls: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
});

const storedOutcomeSchema = z.discriminatedUnion("source", [
  z.strictObject({
    source: z.literal("git"),
    branch: z.string().min(1).nullable(),
    commits: z.number().int().nonnegative(),
    revertCommits: z.number().int().nonnegative(),
    mergeCommits: z.number().int().nonnegative(),
    filesChanged: z.number().int().nonnegative(),
    insertions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    windowFrom: z.string().min(1),
    windowTo: z.string().min(1),
  }),
  z.strictObject({
    source: z.literal("unavailable"),
    reason: z.enum([
      "folder-missing",
      "not-a-repo",
      "git-error",
      "not-measured",
    ]),
  }),
]);

const storedPermissionRowSchema = z.strictObject({
  name: z.string().min(1),
  asked: z.number().int().nonnegative(),
  allow: z.number().int().nonnegative(),
  deny: z.number().int().nonnegative(),
  other: z.number().int().nonnegative(),
  unanswered: z.number().int().nonnegative(),
});

const storedPermissionCommandSchema = z.strictObject({
  text: z.string(),
  tool: z.string().min(1),
  kind: z.string().min(1),
  asked: z.number().int().nonnegative(),
  allow: z.number().int().nonnegative(),
  deny: z.number().int().nonnegative(),
  other: z.number().int().nonnegative(),
  unanswered: z.number().int().nonnegative(),
});

const storedPermissionRequestsSchema = z
  .strictObject({
    asked: z.number().int().nonnegative(),
    answered: z.number().int().nonnegative(),
    unanswered: z.number().int().nonnegative(),
    answeredWithoutRequest: z.number().int().nonnegative(),
    agentsAsked: z.number().int().nonnegative(),
    tools: z.array(storedPermissionRowSchema).max(10),
    programs: z.array(storedPermissionRowSchema).max(15),
    distinctPrograms: z.number().int().nonnegative(),
    commands: z.array(storedPermissionCommandSchema).max(50),
    distinctCommands: z.number().int().nonnegative(),
    commandsOmitted: z.number().int().nonnegative(),
  })
  .nullable();
const storedAgentSchema = z.strictObject({
  label: z.string().min(1),
  kind: z.enum(["read-only", "editing"]),
  turns: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  compactions: z.number().int().nonnegative(),
  cacheReadPerTurn: z.number().int().nonnegative(),
  errorStops: z.number().int().nonnegative(),
  toolCalls: z.number().int().nonnegative(),
  toolErrors: z.number().int().nonnegative(),
  editCalls: z.number().int().nonnegative(),
  bashCalls: z.number().int().nonnegative(),
  readCalls: z.number().int().nonnegative(),
  agsLookups: z.number().int().nonnegative(),
  permissionAnswers: z.number().int().nonnegative(),
  model: z.string().min(1),
});

const storedOtherAgentsSchema = z
  .strictObject({
    count: z.number().int().nonnegative(),
    turns: z.number().int().nonnegative(),
    costCents: z.number().int().nonnegative(),
  })
  .nullable();

const storedImprovementSchema = z.strictObject({
  rule: z.enum([
    "guardrail-answers",
    "cost-concentration",
    "unguarded-edits",
    "lookup-misses",
    "human-intervention",
    "agent-error-concentration",
    "coverage-gap",
    "tracker-not-measured",
  ]),
  level: z.enum(["act", "watch"]),
  destination: z.enum([
    "permission-setup",
    "orchestration-config",
    "agent-routing",
    "provider-route-monitoring",
    "session-linkage",
    "tracker-binding",
  ]),
  audience: z.enum(["manager", "maintainer"]),
  claimIds: z.array(z.string()),
  evidence: z.array(z.string()),
  values: z.record(z.string(), z.number().int()),
});

const storedFolderSchema = z
  .strictObject({
    name: z.string().min(1),
    parent: z.string().min(1).nullable(),
  })
  .nullable();

const storedLookupToolSchema = z.strictObject({
  tool: z.enum([
    "load_skills_for_files",
    "load_skills_for_keywords",
    "get_skill",
    "get_workflow",
    "get_category_guide",
  ]),
  calls: z.number().int().nonnegative(),
  noMatchCalls: z.number().int().nonnegative(),
  errorCalls: z.number().int().nonnegative(),
  bodiesReturned: z.number().int().nonnegative(),
  reusedBodies: z.number().int().nonnegative(),
  mainCalls: z.number().int().nonnegative(),
  workerCalls: z.number().int().nonnegative(),
});

const storedLookupSkillSchema = z.strictObject({
  id: z.string().min(1),
  returns: z.number().int().nonnegative(),
  mainReturns: z.number().int().nonnegative(),
  workerReturns: z.number().int().nonnegative(),
});

const storedLookupsSchema = z
  .strictObject({
    tools: z.array(storedLookupToolSchema).length(5),
    skills: z.array(storedLookupSkillSchema).max(30),
    distinctSkills: z.number().int().nonnegative(),
    otherSkillReturns: z.number().int().nonnegative(),
    unvalidatedReturns: z.number().int().nonnegative(),
    capped: z.boolean(),
  })
  .nullable();

const storedLedgerSchema = z.strictObject({
  schemaVersion: z.literal(1),
  cutoff: z.string().min(1),
  session: z.string().min(1).nullable(),
  evidenceMode: z.enum(["native-files", "tracker-only"]),
  rootVerification: z.enum(["unverified-root", "not-applicable"]),
  coverage: z.enum(["complete", "partial"]),
  counts: z.strictObject({
    agentsCreated: z.number().int().nonnegative(),
    sessionsLinked: z.number().int().nonnegative(),
    failedToolCalls: z.number().int().nonnegative(),
    errorStops: z.number().int().nonnegative(),
    claims: z.number().int().nonnegative(),
    hypotheses: z.number().int().nonnegative(),
  }),
  label: z.string().min(1).max(120).nullable(),
  folder: storedFolderSchema,
  lookups: storedLookupsSchema,
  skillUsage: storedSkillUsageSchema.nullable(),
  hostSkills: storedHostSkillsSchema.nullable(),
  cells: z.array(storedCellSchema),
  models: z.array(storedModelSchema),
  days: z.array(storedDaySchema),
  toolRows: z.array(storedToolRowSchema),
  outcome: storedOutcomeSchema,
  permissionRequests: storedPermissionRequestsSchema,
  agents: z.array(storedAgentSchema),
  otherAgents: storedOtherAgentsSchema,
  improvements: z.array(storedImprovementSchema),
  claims: z.array(storedClaimSchema).min(1),
  evidence: z.record(
    z.string(),
    z.strictObject({
      kind: z.literal("aggregate"),
      value: z.union([z.number(), z.string()]),
    }),
  ),
});

type CommittedLedgerSummary = {
  coverage: "complete" | "partial";
  fullyRead: number;
  sessions: number;
  counts: LedgerCounts;
};

function runIdFromArtifact(artifactId: string, kind: string): string {
  const suffix = `.${kind}`;
  if (!artifactId.endsWith(suffix)) {
    throw new RetrospectiveError(
      "INVALID_ARTIFACT_ID",
      "Artifact ID has invalid suffix",
    );
  }
  const runId = artifactId.slice(0, -suffix.length);
  if (runId.length === 0) {
    throw new RetrospectiveError(
      "INVALID_ARTIFACT_ID",
      "Artifact ID has empty runId",
    );
  }
  return runId;
}

async function resolveSiblingPath(
  root: string,
  baseArtifactId: string,
  baseSessionToken: string,
  baseGenerationId: string,
  targetKind: "summary" | "ledger" | "html",
): Promise<string> {
  const runId = runIdFromArtifact(baseArtifactId, "summary");
  const siblingId = `${runId}.${targetKind}`;
  const resolved = await resolveArtifact(root, siblingId);
  if (
    resolved.sessionToken !== baseSessionToken ||
    resolved.generationId !== baseGenerationId
  ) {
    throw new RetrospectiveError(
      "ARTIFACT_NOT_FOUND",
      "Artifact generation mismatch",
    );
  }
  if (!path.isAbsolute(resolved.absolutePath)) {
    throw new RetrospectiveError(
      "UNSAFE_PATH",
      "Artifact path is not absolute",
    );
  }
  return resolved.absolutePath;
}

/** Reads a stored ledger with an O_NOFOLLOW handle and a hard byte ceiling. */
async function readStoredLedgerText(ledgerPath: string): Promise<string> {
  const handle = await fsp.open(ledgerPath, STORED_LEDGER_READ_FLAGS);
  try {
    const stats = await handle.stat();
    if (stats.size > MAX_STORED_LEDGER_BYTES) {
      throw new RetrospectiveError(
        "STORED_LEDGER_INVALID",
        "Stored ledger exceeds the size limit",
      );
    }
    return await handle.readFile("utf8");
  } finally {
    await handle.close().catch(() => undefined);
  }
}

/**
 * Reads the committed ledger of an already-published generation and returns the
 * numbers that generation published. Any read, parse or shape problem fails
 * closed: never fall back to freshly recomputed numbers.
 */
async function loadCommittedLedger(
  ledgerPath: string,
): Promise<CommittedLedgerSummary> {
  let raw: string;
  try {
    raw = await readStoredLedgerText(ledgerPath);
  } catch (error) {
    if (error instanceof RetrospectiveError) throw error;
    throw new RetrospectiveError(
      "STORED_LEDGER_INVALID",
      "Stored ledger is unreadable",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RetrospectiveError(
      "STORED_LEDGER_INVALID",
      "Stored ledger is not valid JSON",
    );
  }

  const result = storedLedgerSchema.safeParse(parsed);
  if (!result.success) {
    throw new RetrospectiveError(
      "STORED_LEDGER_INVALID",
      "Stored ledger does not match the ledger shape",
    );
  }
  const stored = result.data;

  const coverageClaim = stored.claims.find(
    (claim) => claim.template === "coverage",
  );
  const sessions = coverageClaim?.values.sessions;
  const fullyRead = coverageClaim?.values.fullyRead;
  if (typeof sessions !== "number" || typeof fullyRead !== "number") {
    throw new RetrospectiveError(
      "STORED_LEDGER_INVALID",
      "Stored ledger coverage claim is invalid",
    );
  }

  return {
    coverage: stored.coverage,
    fullyRead,
    sessions,
    counts: stored.counts,
  };
}

/**
 * Re-reads consent and requires it to still be enabled with an identical record,
 * so a revoked or re-scoped consent stops reads and publication mid-run.
 */
async function consentStillValid(
  consentPath: string | undefined,
  original: ConsentRecord,
): Promise<boolean> {
  const again = await readConsent(consentPath);
  if (again.state !== "enabled") return false;
  const next = again.record;
  if (
    next.grantedAt !== original.grantedAt ||
    next.storeRoot !== original.storeRoot ||
    next.allowedSourceRoots.length !== original.allowedSourceRoots.length
  ) {
    return false;
  }
  return next.allowedSourceRoots.every(
    (root, index) => root === original.allowedSourceRoots[index],
  );
}

async function captureSnapshots(
  nodeFiles: Array<{ node: NodeKey; absolutePath: string }>,
  maxBytes: number,
  signal: AbortSignal,
): Promise<SourceSnapshot[]> {
  const snapshots: SourceSnapshot[] = [];
  for (let index = 0; index < nodeFiles.length; index += SNAPSHOT_CONCURRENCY) {
    signal.throwIfAborted();
    const batch = nodeFiles.slice(index, index + SNAPSHOT_CONCURRENCY);
    const captured = await Promise.all(
      batch.map((nodeFile) => captureSnapshot(nodeFile, maxBytes)),
    );
    snapshots.push(...captured);
  }
  return snapshots;
}

async function publishResult(args: {
  storeRoot: string;
  prep: { receipt: ArtifactReceipt; joined: boolean };
  evidenceMode: "native-files" | "tracker-only";
  computed: CommittedLedgerSummary;
}): Promise<PublishedRunResult> {
  const resolvedSummary = await resolveArtifact(
    args.storeRoot,
    args.prep.receipt.artifactId,
  );
  const ledgerPath = await resolveSiblingPath(
    args.storeRoot,
    args.prep.receipt.artifactId,
    resolvedSummary.sessionToken,
    resolvedSummary.generationId,
    "ledger",
  );
  const htmlPath = await resolveSiblingPath(
    args.storeRoot,
    args.prep.receipt.artifactId,
    resolvedSummary.sessionToken,
    resolvedSummary.generationId,
    "html",
  );

  // A joined run observed someone else's committed generation: report its numbers,
  // never the ones recomputed from a source that moved on since.
  const reported = args.prep.joined
    ? await loadCommittedLedger(ledgerPath)
    : args.computed;

  return {
    resultVersion: 1,
    state: args.prep.joined ? "already-prepared" : "prepared",
    evidenceMode: args.evidenceMode,
    artifactId: args.prep.receipt.artifactId,
    coverage: reported.coverage,
    fullyRead: reported.fullyRead,
    sessions: reported.sessions,
    counts: reported.counts,
    viewPaths: {
      summary: resolvedSummary.absolutePath,
      ledger: ledgerPath,
      reportHtml: htmlPath,
    },
  };
}

export async function runRetrospective(
  deps: RunDeps,
  signal: AbortSignal,
): Promise<RunResult> {
  try {
    // 1. Consent
    signal.throwIfAborted();
    const consent = await readConsent(deps.consentPath);
    if (consent.state !== "enabled") {
      return { resultVersion: 1, state: "disabled" };
    }
    const originalConsent = consent.record;

    // 2. Substantive check
    const summary = deps.tracker.summary();
    if (summary.toolCalls === 0) {
      return { resultVersion: 1, state: "not-substantive" };
    }
    const skillUsageSnapshot = deps.tracker.skillUsage();
    const skillUsage =
      skillUsageSnapshot.events === 0 ? null : skillUsageSnapshot;

    const clockFn = deps.clock ?? (() => new Date());
    const effectivePlatform = deps.platform ?? process.platform;

    // 3. Discovery
    const discovery = await discoverSession(
      originalConsent,
      {
        workspace: deps.workspace,
        toolCalls: deps.tracker.observedToolCalls(),
      },
      clockFn,
      effectivePlatform,
      deps.discoveryLimits,
      signal,
    );

    signal.throwIfAborted();

    if (discovery.state === "ambiguous-session") {
      return { resultVersion: 1, state: "ambiguous-session" };
    }
    if (discovery.state === "child-session") {
      return { resultVersion: 1, state: "child-session" };
    }

    const effectiveLimits: AggregateLimits = {
      maxBytes: deps.limits?.maxBytes ?? DEFAULT_AGGREGATE_LIMITS.maxBytes,
      maxMillis: deps.limits?.maxMillis ?? DEFAULT_AGGREGATE_LIMITS.maxMillis,
    };
    // One run-wide deadline; every aggregate gets only what is left of it.
    const deadline = Date.now() + effectiveLimits.maxMillis;

    if (discovery.state === "no-evidence") {
      if (deps.requireNativeMain) {
        return { resultVersion: 1, state: "no-native-evidence" };
      }
      // Tracker-only path
      const startedAt = summary.startedAt;
      const eventCount = summary.toolCalls;
      const checkpointId = crypto
        .createHash("sha256")
        .update(`tracker-only:${deps.workspace}:${startedAt}:${eventCount}`)
        .digest("hex")
        .slice(0, 32);

      const syntheticWorkspaceHash = crypto
        .createHash("sha256")
        .update(deps.workspace)
        .digest("hex")
        .slice(0, 16);
      const main: NodeKey = {
        hostId: "local",
        sessionId: `tracker-${syntheticWorkspaceHash}`,
      };

      const cutoff = clockFn().toISOString();
      const ledgerInput: LedgerInput = {
        tree: null,
        mainSessionId: null,
        cutoff,
        evidenceMode: "tracker-only",
        rootVerification: "not-applicable",
        unlinkedAgents: 0,
        agentsCreated: 0,
        sessionsLinked: 0,
        skillUsage,
        trackerSince: skillUsage !== null ? skillUsageSnapshot.since : null,
        label: sanitizeLabel(deps.title),
        outcome: { source: "unavailable", reason: "not-measured" },
      };

      let ledger = buildLedger(ledgerInput);
      if (deps.tamperLedger) {
        ledger = deps.tamperLedger(ledger);
      }
      const verifyResult = verifyLedger(ledger, ledgerInput);
      if (!verifyResult.ok) {
        return { resultVersion: 1, state: "failed", code: "LEDGER_INVALID" };
      }

      const summaryText = renderSummary(ledger);
      const ledgerText = `${JSON.stringify(ledger)}\n`;
      const htmlText = renderReportHtml(ledger, { previous: [] });
      if (deps.beforePublish) {
        await deps.beforePublish();
      }
      signal.throwIfAborted();
      if (!(await consentStillValid(deps.consentPath, originalConsent))) {
        return { resultVersion: 1, state: "disabled" };
      }

      const prep = await prepareV2(
        { root: originalConsent.storeRoot, main, checkpointId },
        {
          summary: summaryText,
          ledger: ledgerText,
          reportHtml: htmlText,
          status: "partial",
        },
        signal,
      );

      return await publishResult({
        storeRoot: originalConsent.storeRoot,
        prep,
        evidenceMode: "tracker-only",
        computed: {
          coverage: ledger.coverage,
          fullyRead: 0,
          sessions: 0,
          counts: ledger.counts,
        },
      });
    }

    // Bound path
    const mainNode = discovery.manifest.nodes.find((n) => n.parent === null);
    if (!mainNode) {
      return { resultVersion: 1, state: "failed", code: "MAIN_NODE_MISSING" };
    }

    const childFiles = discovery.childFiles.slice(
      0,
      MAX_AGGREGATED_CHILD_FILES,
    );
    const omittedChildFiles = discovery.childFiles.length - childFiles.length;
    const unlinkedAgents = discovery.unlinkedAgents + omittedChildFiles;

    // 1) Capture snapshot for all nodes
    const nodeFiles: Array<{ node: NodeKey; absolutePath: string }> = [
      { node: mainNode.key, absolutePath: discovery.mainFile },
    ];
    for (const childPath of childFiles) {
      const childSessionId = path.basename(childPath, ".jsonl");
      const childNode = discovery.manifest.nodes.find(
        (n) => n.key.sessionId === childSessionId,
      );
      const nodeKey = childNode
        ? childNode.key
        : { hostId: "local", sessionId: childSessionId };
      nodeFiles.push({ node: nodeKey, absolutePath: childPath });
    }

    // Consent can be revoked or re-scoped while discovery runs: re-check before
    // the first byte of session content is read.
    if (!(await consentStillValid(deps.consentPath, originalConsent))) {
      return { resultVersion: 1, state: "disabled" };
    }
    signal.throwIfAborted();

    const snapshots = await captureSnapshots(
      nodeFiles,
      effectiveLimits.maxBytes,
      signal,
    );

    // Test seam awaited once after all snapshots are captured
    if (deps.afterSnapshot) {
      await deps.afterSnapshot();
    }

    signal.throwIfAborted();

    // 2) Aggregate each node within the shared deadline
    const aggregates: AggregatedSession[] = [];
    for (let i = 0; i < nodeFiles.length; i += 1) {
      signal.throwIfAborted();
      const remainingMillis = Math.max(0, deadline - Date.now());
      const nf = nodeFiles[i];
      const snap = snapshots[i];
      const agg = await aggregateSession(
        { node: nf.node, format: "omp", absolutePath: nf.absolutePath },
        snap,
        {
          maxBytes: effectiveLimits.maxBytes,
          maxMillis: Math.min(remainingMillis, effectiveLimits.maxMillis),
        },
        signal,
      );
      aggregates.push(agg);
    }

    const tree = rollUp(aggregates);
    const mainKey = discovery.manifest.main;
    const checkpointId = discovery.manifest.checkpointId;

    const firstAgg = aggregates[0];
    const cwdRaw =
      firstAgg !== undefined &&
      "cwdRaw" in firstAgg &&
      typeof firstAgg.cwdRaw === "string"
        ? firstAgg.cwdRaw
        : null;

    const cutoff = discovery.manifest.cutoff;
    const outcome = await readGitOutcome(
      { cwd: cwdRaw, from: tree.first ?? cutoff, to: tree.last ?? cutoff },
      signal,
    );

    const ledgerInput: LedgerInput = {
      tree,
      mainSessionId: mainKey.sessionId,
      cutoff: discovery.manifest.cutoff,
      evidenceMode: "native-files",
      rootVerification: "unverified-root",
      unlinkedAgents,
      agentsCreated: discovery.childFiles.length + discovery.unlinkedAgents,
      sessionsLinked: childFiles.length + 1,
      skillUsage,
      trackerSince: skillUsage !== null ? skillUsageSnapshot.since : null,
      label: sanitizeLabel(deps.title),
      outcome,
    };
    let ledger = buildLedger(ledgerInput);
    if (deps.tamperLedger) {
      ledger = deps.tamperLedger(ledger);
    }
    const verifyResult = verifyLedger(ledger, ledgerInput);
    if (!verifyResult.ok) {
      return { resultVersion: 1, state: "failed", code: "LEDGER_INVALID" };
    }

    const summaryText = renderSummary(ledger);
    const ledgerText = `${JSON.stringify(ledger)}\n`;

    let previous: SessionRates[] = [];
    try {
      previous = await loadPreviousReports(
        originalConsent.storeRoot,
        ledger.folder,
        ledger.session,
        5,
      );
    } catch {
      previous = [];
    }
    const htmlText = renderReportHtml(ledger, { previous });
    if (deps.beforePublish) {
      await deps.beforePublish();
    }
    signal.throwIfAborted();
    if (!(await consentStillValid(deps.consentPath, originalConsent))) {
      return { resultVersion: 1, state: "disabled" };
    }

    const prep = await prepareV2(
      { root: originalConsent.storeRoot, main: mainKey, checkpointId },
      {
        summary: summaryText,
        ledger: ledgerText,
        reportHtml: htmlText,
        status: ledger.coverage,
      },
      signal,
    );

    return await publishResult({
      storeRoot: originalConsent.storeRoot,
      prep,
      evidenceMode: "native-files",
      computed: {
        coverage: ledger.coverage,
        fullyRead: tree.fullyRead,
        sessions: tree.sessions,
        counts: ledger.counts,
      },
    });
  } catch (error) {
    if (
      signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      return { resultVersion: 1, state: "failed", code: "ABORTED" };
    }
    if (error instanceof RetrospectiveError) {
      return { resultVersion: 1, state: "failed", code: error.code };
    }
    if (error instanceof StoreError) {
      // Surface the store's own integrity code when it is a safe identifier,
      // so a tampered or unreadable generation stays diagnosable.
      return {
        resultVersion: 1,
        state: "failed",
        code: SAFE_ERROR_CODE_REGEX.test(error.code)
          ? error.code
          : "INTERNAL_ERROR",
      };
    }
    return { resultVersion: 1, state: "failed", code: "INTERNAL_ERROR" };
  }
}
