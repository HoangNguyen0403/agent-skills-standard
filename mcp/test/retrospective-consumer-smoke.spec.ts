import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_TEXT_VERSION,
  writeConsent,
  type ConsentRecord,
} from "../src/retrospective/consent";
import { collectIndex, renderIndexHtml, writeIndex } from "../src/retrospective/index-report";
import { runRetrospective } from "../src/retrospective/run";
import { SessionTracker } from "../src/services/SessionTracker";

const temporaryRoots: string[] = [];

function line(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function at(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function paseoWriteCall(id: string, tool: string, args: Record<string, unknown>, timestamp: string) {
  return line({
    type: "message",
    id: `call-${id}`,
    timestamp,
    message: {
      role: "assistant",
      content: [{
        type: "toolCall",
        id,
        name: "write",
        arguments: {
          path: `xd://mcp__agent_skills_standard_${tool}`,
          ...args,
        },
      }],
    },
  });
}

function toolResult(id: string, tool: string, timestamp: string, isError = false) {
  return line({
    type: "message",
    id: `result-${id}`,
    timestamp,
    message: {
      role: "toolResult",
      toolCallId: id,
      toolName: "write",
      isError,
      content: [{ type: "text", text: isError ? "synthetic failure" : "ok" }],
    },
  });
}

function assistantCalls(
  id: string,
  timestamp: string,
  calls: Array<{ id: string; name: string; arguments?: Record<string, unknown> }>,
) {
  return line({
    type: "message",
    id,
    timestamp,
    message: {
      role: "assistant",
      model: "synthetic/model",
      content: calls.map((call) => ({
        type: "toolCall",
        id: call.id,
        name: call.name,
        arguments: call.arguments ?? {},
      })),
    },
  });
}

function simpleToolResult(id: string, name: string, timestamp: string, isError = false) {
  return line({
    type: "message",
    id: `result-${id}`,
    timestamp,
    message: {
      role: "toolResult",
      toolCallId: id,
      toolName: name,
      isError,
      content: [{ type: "text", text: isError ? "synthetic failure" : "ok" }],
    },
  });
}

async function makeFixture() {
  const root = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), "ags-consumer-smoke-"));
  temporaryRoots.push(root);
  const storeRoot = path.join(root, "store");
  const sessionsRoot = path.join(root, "sessions");
  const workspace = path.join(root, "workspace");
  const consentPath = path.join(root, "consent.json");
  await fs.mkdir(sessionsRoot, { recursive: true, mode: 0o700 });
  await fs.mkdir(workspace, { recursive: true, mode: 0o700 });
  const consent: ConsentRecord = {
    schemaVersion: 1,
    consentTextVersion: CONSENT_TEXT_VERSION,
    grantedAt: new Date().toISOString(),
    storeRoot,
    allowedSourceRoots: [sessionsRoot],
    storageRiskAcknowledged: true,
  };
  await writeConsent(consent, consentPath);

  const tracker = new SessionTracker();
  tracker.record({
    via: "load_skills_for_files",
    input: ["src/synthetic.ts"],
    loaded: ["typescript/typescript-language"],
  });
  const observed = tracker.observedToolCalls()[0];
  const center = Date.parse(observed.at);
  const ts = (delta: number) => new Date(center + delta).toISOString();
  const sessionId = "synthetic-main-session";
  const sessionPath = path.join(sessionsRoot, `${sessionId}.jsonl`);
  const permissionText = `<paseo-system version="1" kind="agent-notification" event="permission-required"><permission-request>{"agentId":"agent-synthetic-001","requestId":"permission-synthetic-001","request":{"name":"bash","description":"Command: synthetic harmless fixture"}}</permission-request></paseo-system>`;
  const rows = [
    line({ type: "session", version: 3, id: sessionId, timestamp: ts(-1000), cwd: workspace }),
    paseoWriteCall(
      "tracker-skill-load",
      "load_skills_for_files",
      { files: ["src/synthetic.ts"] },
      ts(-50),
    ),
    toolResult("tracker-skill-load", "load_skills_for_files", ts(50)),
    line({
      type: "message",
      id: "synthetic-user-row",
      timestamp: ts(1000),
      message: {
        role: "user",
        timestamp: ts(1000),
        attribution: "human",
        steering: true,
        content: [{ type: "text", text: "Pause before applying the change." }],
      },
    }),
    line({
      type: "message",
      id: "synthetic-permission-request",
      timestamp: ts(2000),
      message: { role: "user", timestamp: ts(2000), content: [{ type: "text", text: permissionText }] },
    }),
    paseoWriteCall(
      "decision-synthetic-001",
      "record_decision",
      {
        content: JSON.stringify({
          basis: "default-pending-review",
          impact: "high",
          reversible: false,
          label: "Defer the irreversible synthetic change",
        }),
      },
      ts(3000),
    ),
    assistantCalls("synthetic-create-agent", ts(4000), [
      {
        id: "create-agent-synthetic-001",
        name: "create_agent",
        arguments: { task: "synthetic child" },
      },
    ]),
    simpleToolResult(
      "create-agent-synthetic-001",
      "create_agent",
      ts(4500),
    ),
    assistantCalls("synthetic-tool-failures", ts(5000), [
      { id: "failed-bash-1", name: "bash" },
      { id: "failed-bash-2", name: "bash" },
      { id: "failed-bash-3", name: "bash" },
    ]),
    assistantCalls("synthetic-permission-answer", ts(17000), [
      {
        id: "permission-answer-synthetic-001",
        name: "respond_to_permission",
        arguments: {
          agentId: "agent-synthetic-001",
          requestId: "permission-synthetic-001",
          response: { behavior: "deny" },
        },
      },
    ]),
    toolResult("decision-synthetic-001", "record_decision", ts(6000)),
    toolResult("create-agent-synthetic-001", "create_agent", ts(7000)),
    simpleToolResult("failed-bash-1", "bash", ts(8000), true),
    simpleToolResult("failed-bash-2", "bash", ts(9000), true),
    simpleToolResult("failed-bash-3", "bash", ts(10000), true),
    simpleToolResult("permission-answer-synthetic-001", "respond_to_permission", ts(17000)),
  ];
  await fs.writeFile(sessionPath, rows.join(""), { mode: 0o600 });
  if (process.platform !== "win32") await fs.chmod(sessionPath, 0o600);
  return { root, storeRoot, workspace, consentPath, tracker, sessionPath, sessionId, center };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("synthetic retrospective consumer smoke", () => {
  it("replays an OMP fixture through publication and renders a linked report/index", async () => {
    const fixture = await makeFixture();
    const result = await runRetrospective(
      {
        tracker: fixture.tracker,
        workspace: fixture.workspace,
        consentPath: fixture.consentPath,
        clock: () => new Date(fixture.center + 30_000),
        limits: { maxBytes: 1_000_000, maxMillis: 10_000 },
      },
      new AbortController().signal,
    );
    expect(result.state).toBe("prepared");
    if (result.state !== "prepared") return;

    const ledger = JSON.parse(await fs.readFile(result.viewPaths.ledger, "utf8")) as {
      decisions: { total: number; byImpact: { high: { defaultPendingReview: number } } };
      failureRuns: { runs: number; longest: { length: number } | null };
      time: { permissionLatency: { timed: number; maxSeconds: number } | null };
      treeCoverage: {
        task: { created: number; read: number };
        hostAgents: { created: number; read: number };
        unlinked: number;
      };
    };
    expect(ledger.decisions.total).toBe(1);
    expect(ledger.decisions.byImpact.high.defaultPendingReview).toBe(1);
    expect(ledger.failureRuns.runs).toBe(1);
    expect(ledger.failureRuns.longest?.length).toBe(3);
    expect(ledger.time.permissionLatency).toMatchObject({ timed: 1, maxSeconds: 15 });
    expect(ledger.treeCoverage).toMatchObject({
      task: { created: 0, read: 0 },
      hostAgents: { created: 1, read: 0 },
      unlinked: 1,
    });

    const index = await collectIndex(fixture.storeRoot, {
      since: new Date(fixture.center).toISOString().slice(0, 10),
      until: new Date(fixture.center).toISOString().slice(0, 10),
      folder: null,
    });
    expect(index.rows).toHaveLength(1);
    expect(index.rows[0].decisionsHighPending).toBe(1);
    const indexPath = await writeIndex(fixture.storeRoot, renderIndexHtml(index));
    expect(await fs.readFile(result.viewPaths.reportHtml, "utf8")).toContain("Decisions");
    expect(await fs.readFile(indexPath, "utf8")).toContain("High-impact default pending review");

    const outputDir = process.env.AGS_RETRO_SMOKE_OUTPUT_DIR;
    if (outputDir) {
      await fs.mkdir(path.dirname(outputDir), { recursive: true });
      await fs.cp(fixture.storeRoot, outputDir, { recursive: true, force: false, errorOnExist: true });
    }
  });
});
