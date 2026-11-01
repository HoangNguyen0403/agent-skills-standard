import crypto from "node:crypto";
import path from "node:path";
import {
  aggregateSession,
  captureSnapshot,
  rollUp,
  type AggregateLimits,
  type SessionAggregate,
  type JointSeries,
} from "./aggregate";
import { readConsent } from "./consent";
import type { NodeKey } from "./contracts";
import { discoverSession, type DiscoveryLimits } from "./discovery";
import {
  buildLedger,
  verifyLedger,
  type Ledger,
  type LedgerInput,
} from "./ledger";
import { prepareV2 } from "./prepare";
import { RetrospectiveError } from "./rules";
import { resolveArtifact } from "./store";
import { renderSummary } from "./views/summary";
import type { SessionTracker } from "../services/SessionTracker";

export type RunDeps = {
  tracker: SessionTracker;
  workspace: string;
  consentPath?: string;
  clock?: () => Date;
  limits?: Partial<AggregateLimits>;
  discoveryLimits?: Partial<DiscoveryLimits>;
  afterSnapshot?: () => Promise<void>;
  platform?: NodeJS.Platform;
  /** TEST SEAM ONLY: applied immediately after buildLedger and before verifyLedger */
  tamperLedger?: (ledger: Ledger) => Ledger;
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
      viewPaths: { summary: string; ledger: string };
    }
  | {
      resultVersion: 1;
      state:
        | "disabled"
        | "not-substantive"
        | "ambiguous-session"
        | "child-session"
        | "failed";
      code?: string;
    };

const DEFAULT_AGGREGATE_LIMITS: Readonly<AggregateLimits> = Object.freeze({
  maxBytes: 512 * 1024 * 1024,
  maxMillis: 60_000,
});

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
  targetKind: "summary" | "ledger",
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

export async function runRetrospective(
  deps: RunDeps,
  signal: AbortSignal,
): Promise<RunResult> {
  try {
    if (signal.aborted) {
      return { resultVersion: 1, state: "failed", code: "ABORTED" };
    }

    // 1. Consent
    const consent = await readConsent(deps.consentPath);
    if (consent.state !== "enabled") {
      return { resultVersion: 1, state: "disabled" };
    }

    // 2. Substantive check
    const summary = deps.tracker.summary();
    if (summary.toolCalls === 0) {
      return { resultVersion: 1, state: "not-substantive" };
    }

    const clockFn = deps.clock ?? (() => new Date());
    const effectivePlatform = deps.platform ?? process.platform;

    // 3. Discovery
    const discovery = await discoverSession(
      consent.record,
      {
        workspace: deps.workspace,
        toolCalls: deps.tracker.observedToolCalls(),
      },
      clockFn,
      effectivePlatform,
      deps.discoveryLimits,
    );

    if (signal.aborted) {
      return { resultVersion: 1, state: "failed", code: "ABORTED" };
    }

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

    if (discovery.state === "no-evidence") {
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
        cutoff,
        evidenceMode: "tracker-only",
        rootVerification: "not-applicable",
        unlinkedAgents: 0,
        agentsCreated: 0,
        sessionsLinked: 0,
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

      if (signal.aborted) {
        return { resultVersion: 1, state: "failed", code: "ABORTED" };
      }

      const prep = await prepareV2(
        { root: consent.record.storeRoot, main, checkpointId },
        { summary: summaryText, ledger: ledgerText, status: "partial" },
        signal,
      );

      const resolvedSummary = await resolveArtifact(
        consent.record.storeRoot,
        prep.receipt.artifactId,
      );
      const ledgerPath = await resolveSiblingPath(
        consent.record.storeRoot,
        prep.receipt.artifactId,
        resolvedSummary.sessionToken,
        resolvedSummary.generationId,
        "ledger",
      );

      return {
        resultVersion: 1,
        state: prep.joined ? "already-prepared" : "prepared",
        evidenceMode: "tracker-only",
        artifactId: prep.receipt.artifactId,
        coverage: "partial",
        fullyRead: 0,
        sessions: 0,
        counts: {
          agentsCreated: 0,
          sessionsLinked: 0,
          failedToolCalls: 0,
          errorStops: 0,
          claims: ledger.claims.length,
          hypotheses: ledger.claims.filter((c) => c.type === "hypothesis")
            .length,
        },
        viewPaths: {
          summary: resolvedSummary.absolutePath,
          ledger: ledgerPath,
        },
      };
    }

    // Bound path
    const mainNode = discovery.manifest.nodes.find((n) => n.parent === null);
    if (!mainNode) {
      return { resultVersion: 1, state: "failed", code: "MAIN_NODE_MISSING" };
    }

    // 1) Capture snapshot for all nodes
    const nodeFiles: Array<{ node: NodeKey; absolutePath: string }> = [
      { node: mainNode.key, absolutePath: discovery.mainFile },
    ];
    for (const childPath of discovery.childFiles) {
      const childSessionId = path.basename(childPath, ".jsonl");
      const childNode = discovery.manifest.nodes.find(
        (n) => n.key.sessionId === childSessionId,
      );
      const nodeKey = childNode
        ? childNode.key
        : { hostId: "local", sessionId: childSessionId };
      nodeFiles.push({ node: nodeKey, absolutePath: childPath });
    }

    const snapshots = await Promise.all(
      nodeFiles.map((nf) => captureSnapshot(nf, effectiveLimits.maxBytes)),
    );

    // Test seam awaited once after all snapshots are captured
    if (deps.afterSnapshot) {
      await deps.afterSnapshot();
    }

    if (signal.aborted) {
      return { resultVersion: 1, state: "failed", code: "ABORTED" };
    }

    // 2) Aggregate each node
    const aggregates: Array<SessionAggregate & { series: JointSeries }> = [];
    for (let i = 0; i < nodeFiles.length; i += 1) {
      const nf = nodeFiles[i];
      const snap = snapshots[i];
      const agg = await aggregateSession(
        { node: nf.node, format: "omp", absolutePath: nf.absolutePath },
        snap,
        effectiveLimits,
        signal,
      );
      aggregates.push(agg);
    }

    const tree = rollUp(aggregates);
    const mainKey = discovery.manifest.main;
    const checkpointId = discovery.manifest.checkpointId;

    const ledgerInput: LedgerInput = {
      tree,
      cutoff: discovery.manifest.cutoff,
      evidenceMode: "native-files",
      rootVerification: "unverified-root",
      unlinkedAgents: discovery.unlinkedAgents,
      agentsCreated: discovery.childFiles.length + discovery.unlinkedAgents,
      sessionsLinked: discovery.childFiles.length + 1,
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

    if (signal.aborted) {
      return { resultVersion: 1, state: "failed", code: "ABORTED" };
    }

    const prep = await prepareV2(
      { root: consent.record.storeRoot, main: mainKey, checkpointId },
      { summary: summaryText, ledger: ledgerText, status: ledger.coverage },
      signal,
    );

    const resolvedSummary = await resolveArtifact(
      consent.record.storeRoot,
      prep.receipt.artifactId,
    );
    const ledgerPath = await resolveSiblingPath(
      consent.record.storeRoot,
      prep.receipt.artifactId,
      resolvedSummary.sessionToken,
      resolvedSummary.generationId,
      "ledger",
    );

    let totalFailedToolCalls = 0;
    for (const count of Object.values(tree.toolErrors)) {
      totalFailedToolCalls += count;
    }

    return {
      resultVersion: 1,
      state: prep.joined ? "already-prepared" : "prepared",
      evidenceMode: "native-files",
      artifactId: prep.receipt.artifactId,
      coverage: ledger.coverage,
      fullyRead: tree.fullyRead,
      sessions: tree.sessions,
      counts: {
        agentsCreated: ledgerInput.agentsCreated,
        sessionsLinked: ledgerInput.sessionsLinked,
        failedToolCalls: totalFailedToolCalls,
        errorStops: tree.stopReasons["error"] ?? 0,
        claims: ledger.claims.length,
        hypotheses: ledger.claims.filter((c) => c.type === "hypothesis").length,
      },
      viewPaths: {
        summary: resolvedSummary.absolutePath,
        ledger: ledgerPath,
      },
    };
  } catch (error) {
    if (signal.aborted) {
      return { resultVersion: 1, state: "failed", code: "ABORTED" };
    }
    if (error instanceof RetrospectiveError) {
      return { resultVersion: 1, state: "failed", code: error.code };
    }
    return { resultVersion: 1, state: "failed", code: "INTERNAL_ERROR" };
  }
}
