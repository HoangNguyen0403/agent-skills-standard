import { z } from "zod";
import type { ToolContext, ToolResult } from "./index";
import { readConsent } from "../retrospective/consent";
import { runRetrospective, type RunResult } from "../retrospective/run";

export const prepareRetrospectiveSchema = z.object({});
export const getRetrospectiveStatusSchema = z.object({});

export const DISABLED_RETROSPECTIVE_TEXT =
  "Retrospective preparation is disabled. Ask the user to run `ags-retrospective enable` in an interactive terminal to enable local retrospective collection.";

export const RETROSPECTIVE_NUDGE_TEXT =
  "Retrospective pending. If you hold an assignment packet (you are a worker), ignore this section. Otherwise call `prepare_retrospective` now, then tell the user the coverage, the counts and the file paths (summary and ledger) it returns, and that they can open either.";

function renderPrepared(
  result: Extract<RunResult, { state: "prepared" | "already-prepared" }>,
): string {
  const statusLine =
    result.state === "already-prepared"
      ? `Retrospective already prepared (artifact id: ${result.artifactId}, evidence mode: ${result.evidenceMode}).`
      : `Retrospective prepared (artifact id: ${result.artifactId}, evidence mode: ${result.evidenceMode}).`;
  const coverageLine = `Coverage: ${result.coverage} (${result.fullyRead}/${result.sessions} sessions fully read).`;
  const countsLine = `Counts: ${result.counts.agentsCreated} agents created, ${result.counts.sessionsLinked} sessions linked, ${result.counts.failedToolCalls} failed tool calls, ${result.counts.errorStops} error stops, ${result.counts.claims} claims, ${result.counts.hypotheses} hypotheses.`;
  const pathsLine = `View paths:\n- Summary: ${result.viewPaths.summary}\n- Ledger: ${result.viewPaths.ledger}`;
  const relayInstruction = `Relay to the user: the coverage (${result.coverage}), the counts line above, and the file paths (summary and ledger). Inform the user that they can open either path.`;

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
    case "failed":
      return "Retrospective preparation failed.";
  }
}

export async function prepareRetrospective(
  ctx: ToolContext,
): Promise<ToolResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60_000);

  try {
    const result = await runRetrospective(
      {
        tracker: ctx.tracker,
        workspace: ctx.projectRoot,
        ...(ctx.consentPath ? { consentPath: ctx.consentPath } : {}),
      },
      controller.signal,
    );

    if (result.state === "prepared" || result.state === "already-prepared") {
      ctx.retrospectiveMark ??= { preparedAtProgress: 0 };
      ctx.retrospectiveMark.preparedAtProgress =
        ctx.tracker.summary().toolCalls;
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
  } finally {
    clearTimeout(timeoutId);
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
          text: `Retrospective consent is disabled (reason: ${consent.reason}). Ask the user to run \`ags-retrospective enable\` in an interactive terminal to enable local retrospective collection.`,
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
    const toolCalls = ctx.tracker?.summary().toolCalls ?? 0;
    if (toolCalls <= 0) {
      return "";
    }
    const preparedAtProgress = ctx.retrospectiveMark?.preparedAtProgress ?? 0;
    if (toolCalls - preparedAtProgress < 20) {
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
