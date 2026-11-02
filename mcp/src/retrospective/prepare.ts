import path from "node:path";
import {
  DEFAULT_LIMITS,
  artifactReceiptSchema,
  type ArtifactReceipt,
  type NodeKey,
} from "./contracts";
import {
  acquirePreparation,
  cancelRun,
  publishRun,
  waitForPublishedPreparation,
  type PublishArtifact,
  type RunClaim,
} from "./store";

export type ReportStatus = "complete" | "partial" | "failed";

function artifactIdFor(runId: string, kind: string): string {
  return `${runId}.${kind}`;
}

/**
 * In-process single-flight per root + session + checkpoint. Concurrent callers
 * with the same checkpoint join the original in-flight run and receive its
 * receipt; none of them collects or analyzes twice.
 *
 * The store-side owner/join primitive supplies cross-process exclusion. This
 * local map only avoids duplicate waiters within this process.
 */
const inFlightPrepares = new Map<string, Promise<ArtifactReceipt>>();

export type V2Content = {
  summary: string;
  ledger: string;
  reportHtml: string;
  status: ReportStatus;
};

export async function prepareV2(
  request: { root: string; main: NodeKey; checkpointId: string },
  content: V2Content,
  signal: AbortSignal,
  options?: { labels?: { title?: string; project?: string } },
): Promise<{ receipt: ArtifactReceipt; joined: boolean }> {
  signal.throwIfAborted();
  const key = [
    path.resolve(request.root),
    request.main.hostId,
    request.main.sessionId,
    request.checkpointId,
    "v2",
  ].join("\u0000");
  const joined = inFlightPrepares.get(key);
  if (joined) {
    if (signal.aborted) throw signal.reason;
    const receipt = await new Promise<ArtifactReceipt>((resolve, reject) => {
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
    return { receipt, joined: true };
  }

  let joinedRole = false;
  const run = (async (): Promise<ArtifactReceipt> => {
    const access = await acquirePreparation(
      request.root,
      request.main,
      request.checkpointId,
      { layout: "v2" },
    );
    if (access.role === "join") {
      joinedRole = true;
      try {
        return await waitForPublishedPreparation(
          request.root,
          request.main,
          request.checkpointId,
          {
            signal,
            deadline: performance.now() + DEFAULT_LIMITS.elapsedMs,
            expectedRunId: access.runId,
            layout: "v2",
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
      const summaryId = artifactIdFor(claim.runId, "summary");
      const ledgerId = artifactIdFor(claim.runId, "ledger");
      const htmlId = artifactIdFor(claim.runId, "html");
      const artifacts: PublishArtifact[] = [
        { artifactId: summaryId, kind: "summary", content: content.summary },
        { artifactId: ledgerId, kind: "ledger", content: content.ledger },
        { artifactId: htmlId, kind: "html", content: content.reportHtml },
      ];
      const result = await publishRun(claim, artifacts, {
        status: content.status,
        layout: "v2",
        schemaVersion: 2,
        ...(options?.labels === undefined ? {} : { labels: options.labels }),
      });
      published = true;
      return artifactReceiptSchema.parse({
        schemaVersion: 1,
        artifactId: summaryId,
        runId: claim.runId,
        status: result.status,
        modelCalls: 0,
        outboundRequests: 0,
      });
    } finally {
      if (!published) await cancelRun(claim).catch(() => undefined);
    }
  })();

  inFlightPrepares.set(key, run);
  try {
    const receipt = await run;
    return { receipt, joined: joinedRole };
  } finally {
    if (inFlightPrepares.get(key) === run) inFlightPrepares.delete(key);
  }
}
