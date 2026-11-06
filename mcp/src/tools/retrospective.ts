import { z } from "zod";
import type { ToolContext, ToolResult } from "./index";
import { readConsent } from "../retrospective/consent";
import {
  collectIndex,
  parseIndexQuery,
  renderIndexHtml,
  writeIndex,
  type IndexQueryError,
} from "../retrospective/index-report";
import {
  runRetrospective,
  type RunDeps,
  type RunResult,
} from "../retrospective/run";
import type { CompletionReadiness } from "../services/WorkflowTelemetry";

export const prepareRetrospectiveSchema = z.object({
  title: z
    .string()
    .max(200)
    .optional()
    .describe(
      "One line saying what this session was for; it is shown as agent-supplied and unverified.",
    ),
});
export const getRetrospectiveStatusSchema = z.object({});
export const prepareRetrospectiveIndexSchema = z.object({
  since: z
    .string()
    .optional()
    .describe(
      "Start date (YYYY-MM-DD, UTC, inclusive). Defaults to 29 days before until.",
    ),
  until: z
    .string()
    .optional()
    .describe("End date (YYYY-MM-DD, UTC, inclusive). Defaults to today."),
  folder: z
    .string()
    .max(120)
    .optional()
    .describe("Filter by folder name or parent/name (max 120 characters)."),
});

export const DISABLED_RETROSPECTIVE_TEXT =
  "Retrospective preparation is disabled. Ask the user to run `ags retrospective enable` in an interactive terminal to enable local retrospective collection.";

export const RETROSPECTIVE_NUDGE_TEXT =
  "Retrospective pending. If you hold an assignment packet (you are a worker), ignore this section. Otherwise call `prepare_retrospective` now (pass `title` = one line saying what this session was for; it is shown as agent-supplied and unverified), then tell the user the coverage, the counts and the file paths (summary, ledger and HTML report) it returns, and that they can open either.";

export const AUTO_RETROSPECTIVE_WORKFLOW_SKIPPED_TEXT =
  "Automatic retrospective skipped: only an `implement-feature` completion with outcome `implemented` is eligible.";
export const AUTO_RETROSPECTIVE_WORKER_SKIPPED_TEXT =
  "Automatic retrospective skipped: workers holding an assignment packet never prepare retrospectives.";
export const AUTO_RETROSPECTIVE_TASKS_SKIPPED_TEXT =
  "Automatic retrospective skipped: the caller declared active or pending plan tasks.";
export const AUTO_RETROSPECTIVE_TRANSPORT_SKIPPED_TEXT =
  "Automatic retrospective skipped: automatic preparation is stdio-only.";

/**
 * Caller-declared completion readiness accepted by `get_session_cost`. This is a
 * claim, not host-authenticated proof that the plan actually finished.
 */
export type CompletionTriggerArgs = {
  workflow?: string;
  outcome?: string;
  completion?: CompletionReadiness;
};

/**
 * Progress that can justify asking for a retrospective: every recorded tool
 * call except `get_session_cost` itself. Cost reporting is the deliverable the
 * nudge asks for, so repeated reporting must not manufacture new work.
 */
function substantiveProgress(ctx: ToolContext): number {
  const summary = ctx.tracker.summary();
  const costCalls = summary.callsByTool.get_session_cost ?? 0;
  return Math.max(0, summary.toolCalls - costCalls);
}

function renderPrepared(
  result: Extract<RunResult, { state: "prepared" | "already-prepared" }>,
): string {
  const statusLine =
    result.state === "already-prepared"
      ? `Retrospective already prepared (artifact id: ${result.artifactId}, evidence mode: ${result.evidenceMode}).`
      : `Retrospective prepared (artifact id: ${result.artifactId}, evidence mode: ${result.evidenceMode}).`;
  const coverageLine = `Coverage: ${result.coverage} (${result.fullyRead}/${result.sessions} sessions fully read).`;
  const countsLine = `Counts: ${result.counts.agentsCreated} agents created, ${result.counts.sessionsLinked} sessions linked, ${result.counts.failedToolCalls} failed tool calls, ${result.counts.errorStops} error stops, ${result.counts.claims} claims, ${result.counts.hypotheses} hypotheses.`;
  const pathsLine = `View paths:\n- Summary: ${result.viewPaths.summary}\n- Ledger: ${result.viewPaths.ledger}\n- Report (HTML, open in a browser): ${result.viewPaths.reportHtml}`;
  const relayInstruction = `Relay to the user: the coverage (${result.coverage}), the counts line above, and the file paths (summary, ledger and HTML report). Inform the user that they can open either path.`;

  return [
    statusLine,
    coverageLine,
    countsLine,
    pathsLine,
    relayInstruction,
  ].join("\n\n");
}

export function renderRunResultText(result: RunResult): string {
  switch (result.state) {
    case "prepared":
    case "already-prepared":
      return renderPrepared(result);
    case "disabled":
      return DISABLED_RETROSPECTIVE_TEXT;
    case "not-substantive":
      return "Retrospective skipped: session is not substantive.";
    case "ambiguous-session":
      return "Retrospective aborted: candidate session binding is ambiguous.";
    case "child-session":
      return "Retrospective skipped: current session is a child or worker session.";
    case "no-native-evidence":
      return "Retrospective skipped: automatic preparation requires a positively bound native session.";
    case "failed":
      return "Retrospective preparation failed.";
  }
}

/** Runs the real preparation engine under the shared 60s deadline. */
async function executeRetrospective(
  ctx: ToolContext,
  options: { title?: string; requireNativeMain?: boolean },
): Promise<RunResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60_000);

  try {
    return await runRetrospective(
      {
        tracker: ctx.tracker,
        workspace: ctx.projectRoot,
        ...(ctx.consentPath ? { consentPath: ctx.consentPath } : {}),
        ...options,
      } as RunDeps,
      controller.signal,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function markPrepared(ctx: ToolContext): void {
  ctx.retrospectiveMark ??= { preparedAtProgress: 0 };
  ctx.retrospectiveMark.preparedAtProgress = substantiveProgress(ctx);
}

/**
 * Automatic preparation for an eligible `implement-feature` completion call.
 * Returns `null` when the caller supplied no completion object, so legacy cost
 * output stays byte-identical. Every other outcome returns an honest fixed
 * disposition: skip reason, refusal, or failure — never a delivery claim.
 */
export async function automaticRetrospectiveText(
  args: CompletionTriggerArgs,
  ctx: ToolContext,
): Promise<string | null> {
  const completion = args.completion;
  if (!completion) return null;

  const eligibility =
    args.workflow !== "implement-feature" || args.outcome !== "implemented"
      ? AUTO_RETROSPECTIVE_WORKFLOW_SKIPPED_TEXT
      : completion.role === "worker"
        ? AUTO_RETROSPECTIVE_WORKER_SKIPPED_TEXT
        : completion.activeTasks !== 0 || completion.pendingTasks !== 0
          ? AUTO_RETROSPECTIVE_TASKS_SKIPPED_TEXT
          : ctx.transport !== "stdio"
            ? AUTO_RETROSPECTIVE_TRANSPORT_SKIPPED_TEXT
            : null;
  if (eligibility) return eligibility;

  let result: RunResult;
  try {
    result = await executeRetrospective(ctx, { requireNativeMain: true });
  } catch {
    return "Automatic retrospective preparation failed.";
  }

  const header =
    "Automatic retrospective triggered by caller-declared completion (implement-feature, outcome implemented, zero active/pending tasks). The caller's claim is not host-authenticated proof of delivery.";

  if (result.state === "prepared" || result.state === "already-prepared") {
    markPrepared(ctx);
    return `${header}\n\n${renderPrepared(result)}`;
  }
  if (result.state === "failed") {
    const code = result.code ? ` (code: ${result.code})` : "";
    return `Automatic retrospective preparation failed${code}: no retrospective was published.`;
  }
  return `${header}\n\n${renderRunResultText(result)}`;
}

export async function prepareRetrospective(
  ctx: ToolContext,
): Promise<ToolResult>;
export async function prepareRetrospective(
  args: { title?: string },
  ctx: ToolContext,
): Promise<ToolResult>;
export async function prepareRetrospective(
  argsOrCtx: { title?: string } | ToolContext,
  maybeCtx?: ToolContext,
): Promise<ToolResult> {
  let title: string | undefined;
  let ctx: ToolContext;

  if (maybeCtx !== undefined) {
    ctx = maybeCtx;
    if ("title" in argsOrCtx && typeof argsOrCtx.title === "string") {
      title = argsOrCtx.title;
    }
  } else if ("projectRoot" in argsOrCtx) {
    ctx = argsOrCtx;
  } else {
    throw new Error("Invalid arguments: ToolContext required");
  }

  try {
    const result = await executeRetrospective(ctx, { title });

    if (result.state === "prepared" || result.state === "already-prepared") {
      markPrepared(ctx);
    }

    const text = renderRunResultText(result);
    return {
      content: [{ type: "text", text }],
      ...(result.state === "failed" ? { isError: true } : {}),
    };
  } catch {
    return {
      content: [{ type: "text", text: "Retrospective preparation failed." }],
      isError: true,
    };
  }
}

export async function getRetrospectiveStatus(
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const consent = await readConsent(ctx.consentPath);
    if (consent.state === "enabled") {
      return {
        content: [
          {
            type: "text",
            text: `Retrospective consent is enabled (version: ${consent.record.consentTextVersion}). Allowed source roots: ${consent.record.allowedSourceRoots.length}.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Retrospective consent is disabled (reason: ${consent.reason}). Ask the user to run \`ags retrospective enable\` in an interactive terminal to enable local retrospective collection.`,
        },
      ],
    };
  } catch {
    return {
      content: [
        {
          type: "text",
          text: "Retrospective consent check failed.",
        },
      ],
      isError: true,
    };
  }
}

export async function retrospectiveNudge(ctx: ToolContext): Promise<string> {
  try {
    if (ctx.transport !== "stdio") {
      return "";
    }
    const progress = substantiveProgress(ctx);
    if (progress <= 0) {
      return "";
    }
    const preparedAtProgress = ctx.retrospectiveMark?.preparedAtProgress ?? 0;
    if (progress - preparedAtProgress < 20) {
      return "";
    }
    const consent = await readConsent(ctx.consentPath);
    if (consent.state !== "enabled") {
      return "";
    }
    return RETROSPECTIVE_NUDGE_TEXT;
  } catch {
    return "";
  }
}

export function renderIndexQueryErrorText(code: IndexQueryError): string {
  return `Retrospective index query invalid: ${code}.`;
}

export async function prepareRetrospectiveIndex(
  ctx: ToolContext,
): Promise<ToolResult>;
export async function prepareRetrospectiveIndex(
  args: { since?: string; until?: string; folder?: string },
  ctx: ToolContext,
): Promise<ToolResult>;
export async function prepareRetrospectiveIndex(
  argsOrCtx: { since?: string; until?: string; folder?: string } | ToolContext,
  maybeCtx?: ToolContext,
): Promise<ToolResult> {
  let args: { since?: unknown; until?: unknown; folder?: unknown } = {};
  let ctx: ToolContext;

  if (maybeCtx !== undefined) {
    ctx = maybeCtx;
    if (
      typeof argsOrCtx === "object" &&
      argsOrCtx !== null &&
      !("projectRoot" in argsOrCtx)
    ) {
      args = argsOrCtx;
    }
  } else if (
    typeof argsOrCtx === "object" &&
    argsOrCtx !== null &&
    "projectRoot" in argsOrCtx
  ) {
    ctx = argsOrCtx as ToolContext;
  } else {
    throw new Error("Invalid arguments: ToolContext required");
  }

  const parsed = parseIndexQuery(args, new Date());
  if (!parsed.ok) {
    return {
      content: [
        {
          type: "text",
          text: renderIndexQueryErrorText(parsed.code),
        },
      ],
      isError: true,
    };
  }

  try {
    const consent = await readConsent(ctx.consentPath);
    if (consent.state !== "enabled") {
      return {
        content: [{ type: "text", text: DISABLED_RETROSPECTIVE_TEXT }],
      };
    }

    const result = await collectIndex(consent.record.storeRoot, parsed.query);
    const html = renderIndexHtml(result);
    const indexPath = await writeIndex(consent.record.storeRoot, html);

    const text = `Retrospective index written: ${result.rows.length} sessions (${result.omitted} older in range not shown), ${result.unreadable} unreadable, window ${result.query.since} to ${result.query.until}. Open: ${indexPath}`;
    return {
      content: [{ type: "text", text }],
    };
  } catch {
    return {
      content: [
        {
          type: "text",
          text: "Retrospective index preparation failed.",
        },
      ],
      isError: true,
    };
  }
}
