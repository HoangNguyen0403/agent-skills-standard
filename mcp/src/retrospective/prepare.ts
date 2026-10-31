import path from "node:path";
import {
  DEFAULT_LIMITS,
  artifactReceiptSchema,
  prepareRequestSchema,
  type ArtifactReceipt,
  type Analysis,
  type EvidencePacket,
  type EvidenceSource,
  type PrepareRequest,
} from "./contracts";
import {
  acquirePreparation,
  cancelRun,
  publishRun,
  waitForPublishedPreparation,
  type PublishArtifact,
  type RunClaim,
} from "./store";
import { collectEvidence } from "./inventory";
import { RetrospectiveError, analyzeLocal } from "./rules";
import {
  OUTPUT_LIMIT_CODE,
  artifactIdFor,
  renderLimitedProposalList,
  renderLimitedSessionRecord,
  renderPartialSummary,
  renderProposalList,
  renderReport,
  renderSessionRecord,
  type ReportStatus,
} from "./render";

export { RetrospectiveError } from "./rules";

/** Only `local-only` exists. Other names are refused, never silently mapped. */
export type PrepareMode = "local-only" | "local-model" | "hosted";

export type PrepareOptions = {
  mode?: PrepareMode;
  /** Owner-local display labels; omitted by default so nothing is guessed. */
  labels?: { title?: string; project?: string };
  /**
   * Test seam for the output budget. It can only lower the production cap;
   * non-positive or non-finite values fall back to the production ceiling.
   */
  outputBytes?: number;
};

/** Production output budget; mirrors the shared fixed limits. */
export const PREPARE_LIMITS: Readonly<{ outputBytes: number }> = Object.freeze({
  outputBytes: DEFAULT_LIMITS.outputBytes,
});

const MINIMAL_PARTIAL_REPORT =
  "# Session retrospective (partial)\n\n- Output limit reached; report details are omitted.\n";

const MINIMAL_PARTIAL_PROPOSALS =
  "# Proposed changes (partial)\n\n- Proposal details are omitted by the output limit; no proposal is approved or adopted.\n";

/**
 * In-process single-flight per root + session + checkpoint. Concurrent callers
 * with the same checkpoint join the original in-flight run and receive its
 * receipt; none of them collects or analyzes twice.
 *
 * The store-side owner/join primitive supplies cross-process exclusion. This
 * local map only avoids duplicate waiters within this process.
 */
const inFlightPrepares = new Map<string, Promise<ArtifactReceipt>>();

function outputBudget(options: PrepareOptions): number {
  const requested = options.outputBytes;
  if (
    requested === undefined ||
    !Number.isFinite(requested) ||
    !Number.isInteger(requested) ||
    requested <= 0
  )
    return PREPARE_LIMITS.outputBytes;
  return Math.min(requested, PREPARE_LIMITS.outputBytes);
}

function generationStatus(packet: EvidencePacket): ReportStatus {
  const fullyLocal = packet.nodes.every(
    (node) =>
      node.disposition === "local-allowed" &&
      node.coverage === "structured-events",
  );
  return fullyLocal && packet.gaps.length === 0 ? "complete" : "partial";
}

type RenderedGeneration = {
  artifacts: PublishArtifact[];
  status: ReportStatus;
  reportArtifactId: string;
};

function receiptBody(
  packet: EvidencePacket,
  status: ReportStatus,
  artifactIds: readonly string[],
): string {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      runId: packet.runId,
      status,
      modelCalls: 0,
      outboundRequests: 0,
      artifactIds: [...artifactIds],
    },
    null,
    2,
  )}\n`;
}

/**
 * Render every artifact and enforce the aggregate output budget *before*
 * anything is written. When the full set would exceed the budget the report,
 * proposals and session record are replaced by bounded limited records — all
 * four artifacts are still published, and nothing claims completeness.
 */
function renderGeneration(
  packet: EvidencePacket,
  analysis: Analysis,
  checkpointId: string,
  budget: number,
): RenderedGeneration {
  const reportId = artifactIdFor(packet.runId, "report");
  const proposalsId = artifactIdFor(packet.runId, "proposals");
  const sessionId = artifactIdFor(packet.runId, "session");
  const receiptId = artifactIdFor(packet.runId, "receipt");
  const artifactIds = [reportId, proposalsId, sessionId, receiptId];

  let status = generationStatus(packet);
  let report = renderReport(packet, analysis, status);
  let proposals = renderProposalList(analysis);
  let session = renderSessionRecord(packet, analysis, {
    checkpointId,
    status,
    artifactIds,
  });

  const buildArtifacts = (): PublishArtifact[] => [
    { artifactId: reportId, kind: "report", content: report },
    { artifactId: proposalsId, kind: "proposals", content: proposals },
    { artifactId: sessionId, kind: "session", content: session },
    {
      artifactId: receiptId,
      kind: "receipt",
      content: receiptBody(packet, status, artifactIds),
    },
  ];

  const byteSize = (artifacts: readonly PublishArtifact[]): number =>
    artifacts.reduce(
      (total, artifact) =>
        total +
        (typeof artifact.content === "string"
          ? Buffer.byteLength(artifact.content, "utf8")
          : artifact.content.byteLength),
      0,
    );

  let artifacts = buildArtifacts();
  if (byteSize(artifacts) > budget) {
    status = "partial";
    report = renderPartialSummary(packet, analysis, OUTPUT_LIMIT_CODE);
    proposals = renderLimitedProposalList(analysis, OUTPUT_LIMIT_CODE);
    session = renderLimitedSessionRecord(
      packet,
      analysis,
      { checkpointId, status, artifactIds },
      OUTPUT_LIMIT_CODE,
    );
    artifacts = buildArtifacts();
  }
  if (byteSize(artifacts) > budget) {
    status = "partial";
    report = MINIMAL_PARTIAL_REPORT;
    proposals = `${MINIMAL_PARTIAL_PROPOSALS}- Proposal IDs: ${
      analysis.proposals.map((proposal) => proposal.id).join(", ") || "none"
    }.\n`;
    session = `${JSON.stringify({
      schemaVersion: 1,
      runId: packet.runId,
      checkpointId,
      status,
      limited: { code: OUTPUT_LIMIT_CODE },
    })}\n`;
    artifacts = buildArtifacts();
  }
  if (byteSize(artifacts) > budget)
    throw new RetrospectiveError(
      "OUTPUT_BUDGET_TOO_SMALL",
      "The configured output budget cannot hold the minimum honest four-artifact record.",
    );

  return {
    artifacts,
    status,
    reportArtifactId: reportId,
  };
}
async function runPrepare(
  request: PrepareRequest,
  source: EvidenceSource,
  signal: AbortSignal,
  options: PrepareOptions,
): Promise<ArtifactReceipt> {
  const budget = outputBudget(options);
  const access = await acquirePreparation(
    request.root,
    request.main,
    request.checkpointId,
  );
  if (access.role === "join") {
    try {
      return await waitForPublishedPreparation(
        request.root,
        request.main,
        request.checkpointId,
        {
          signal,
          deadline: performance.now() + DEFAULT_LIMITS.elapsedMs,
          // Bind observation to the run this caller actually acquired. Without
          // it, a canceled A replaced by B would silently hand back B's receipt.
          expectedRunId: access.runId,
        },
      );
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      throw error;
    }
  }
  const claim: RunClaim = access.claim;
  let published = false;
  try {
    const collected = await collectEvidence(request, source, signal);
    signal.throwIfAborted();
    // The claim owns the identity used by all published artifacts.
    const packet: EvidencePacket = { ...collected, runId: claim.runId };
    const analysis = await analyzeLocal(packet, signal);
    const rendered = renderGeneration(
      packet,
      analysis,
      request.checkpointId,
      budget,
    );
    const result = await publishRun(claim, rendered.artifacts, {
      status: rendered.status,
      ...(options.labels === undefined ? {} : { labels: options.labels }),
    });
    published = true;
    return artifactReceiptSchema.parse({
      schemaVersion: 1,
      artifactId: rendered.reportArtifactId,
      runId: packet.runId,
      status: result.status,
      modelCalls: 0,
      outboundRequests: 0,
    });
  } finally {
    if (!published) await cancelRun(claim).catch(() => undefined);
  }
}

/**
 * Bounded local pipeline: claim → collect → analyze → render → publish.
 *
 * Returns a neutral receipt only. Artifact paths, report text and excerpts stay
 * in the owner-private store and are resolved explicitly by the local CLI.
 */
export async function prepareLocal(
  request: PrepareRequest,
  source: EvidenceSource,
  signal: AbortSignal,
  options: PrepareOptions = {},
): Promise<ArtifactReceipt> {
  if (request?.storageRiskAcknowledged !== true)
    throw new RetrospectiveError(
      "STORAGE_RISK_NOT_ACKNOWLEDGED",
      "Storage-risk acknowledgement is required before preparation.",
    );
  if ((options.mode ?? "local-only") !== "local-only")
    throw new RetrospectiveError(
      "MODE_UNAVAILABLE",
      "Only local-only preparation is implemented.",
    );
  const parsedRequest = prepareRequestSchema.safeParse(request);
  if (!parsedRequest.success)
    throw new RetrospectiveError("INVALID_REQUEST", "Invalid prepare request.");
  const parsed = parsedRequest.data;
  signal.throwIfAborted();

  const key = [
    path.resolve(parsed.root),
    parsed.main.hostId,
    parsed.main.sessionId,
    parsed.checkpointId,
  ].join("\u0000");
  const joined = inFlightPrepares.get(key);
  if (joined) {
    if (signal.aborted) throw signal.reason;
    // The joiner observes the owner's run without owning it: its own abort
    // rejects promptly, while the owner's pipeline keeps running.
    // ES2022 target: `Promise.withResolvers` is not available.
    return await new Promise<ArtifactReceipt>((resolve, reject) => {
      const onAbort = (): void => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      joined.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  }

  const run = runPrepare(parsed, source, signal, options);
  inFlightPrepares.set(key, run);
  try {
    return await run;
  } finally {
    if (inFlightPrepares.get(key) === run) inFlightPrepares.delete(key);
  }
}
