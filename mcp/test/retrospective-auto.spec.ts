import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AUTO_RETROSPECTIVE_TASKS_SKIPPED_TEXT,
  AUTO_RETROSPECTIVE_TRANSPORT_SKIPPED_TEXT,
  AUTO_RETROSPECTIVE_WORKER_SKIPPED_TEXT,
  AUTO_RETROSPECTIVE_WORKFLOW_SKIPPED_TEXT,
  DISABLED_RETROSPECTIVE_TEXT,
  getSessionCost,
  getSessionCostSchema,
  prepareRetrospective,
  RETROSPECTIVE_NUDGE_TEXT,
  type ToolContext,
} from "../src/tools";
import { finalizeWorkflowTelemetry } from "../src/services/WorkflowTelemetry";
import {
  CONSENT_TEXT_VERSION,
  writeConsent,
  type ConsentRecord,
} from "../src/retrospective/consent";
import { SessionTracker } from "../src/services/SessionTracker";
import { SkillIndex } from "../src/services/SkillIndex";
import { loadPolicyView } from "../src/services/PolicyIndex";

const temporaryRoots: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const base = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(base, "ags-retro-auto-"));
  temporaryRoots.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.map((dir) =>
      fs.rm(dir, { recursive: true, force: true }).catch(() => undefined),
    ),
  );
  temporaryRoots.length = 0;
});

async function createSkillsFixture(root: string): Promise<string> {
  const skills = path.join(root, "skills");
  await fs.mkdir(skills, { recursive: true });
  await fs.writeFile(
    path.join(skills, "metadata.json"),
    JSON.stringify({
      file_routing: { ts: ["typescript"] },
      broad_globs: ["**/*.ts"],
      base_language_skills: { typescript: "typescript-language" },
    }),
  );
  const skillDir = path.join(skills, "typescript", "typescript-language");
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: typescript-language\ndescription: typescript rules\nmetadata:\n  triggers:\n    files: ["**/*.ts"]\n    keywords: ["typescript"]\n---\n# typescript\n`,
  );
  return skills;
}

function createConsentRecord(
  storeRoot: string,
  allowedSourceRoots: string[],
): ConsentRecord {
  return {
    schemaVersion: 1,
    consentTextVersion: CONSENT_TEXT_VERSION,
    grantedAt: new Date().toISOString(),
    storeRoot,
    allowedSourceRoots,
    storageRiskAcknowledged: true,
  };
}

async function writeMainSession(options: {
  tracker: SessionTracker;
  sessionsDir: string;
  sessionId: string;
  cwd: string;
}): Promise<string> {
  options.tracker.record({
    via: "load_skills_for_files",
    input: ["src/index.ts"],
    loaded: ["typescript-language"],
  });
  const observed = options.tracker.observedToolCalls();
  const atMs = Date.parse(observed[observed.length - 1].at);
  const callTs = new Date(atMs - 50).toISOString();
  const resTs = new Date(atMs + 50).toISOString();
  const callId = "call-1";
  const filePath = path.join(options.sessionsDir, `${options.sessionId}.jsonl`);
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const lines = [
    JSON.stringify({
      type: "session",
      version: 3,
      id: options.sessionId,
      timestamp: new Date(atMs).toISOString(),
      cwd: options.cwd,
    }),
    JSON.stringify({
      type: "message",
      id: "msg-1",
      timestamp: callTs,
      message: {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: callId,
            name: "write",
            arguments: {
              path: "xd://mcp__agent_skills_standard_load_skills_for_files",
              files: ["src/index.ts"],
            },
          },
        ],
      },
    }),
    JSON.stringify({
      type: "message",
      id: "res-1",
      timestamp: resTs,
      message: {
        role: "toolResult",
        toolCallId: callId,
        toolName: "write",
        content: [{ type: "text", text: "ok" }],
      },
    }),
  ];
  await fs.writeFile(filePath, lines.join("\n") + "\n", { mode: 0o600 });
  return filePath;
}

async function appendSubstantiveCall(
  tracker: SessionTracker,
  mainFile: string,
): Promise<void> {
  tracker.record({
    via: "load_skills_for_files",
    input: ["src/next.ts"],
    loaded: ["typescript-language"],
  });
  const observed = tracker.observedToolCalls();
  const atMs = Date.parse(observed[observed.length - 1].at);
  const callId = `call-${observed.length}`;
  const lines = [
    JSON.stringify({
      type: "message",
      id: `msg-${callId}`,
      timestamp: new Date(atMs - 50).toISOString(),
      message: {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: callId,
            name: "write",
            arguments: {
              path: "xd://mcp__agent_skills_standard_load_skills_for_files",
              files: ["src/next.ts"],
            },
          },
        ],
      },
    }),
    JSON.stringify({
      type: "message",
      id: `res-${callId}`,
      timestamp: new Date(atMs + 50).toISOString(),
      message: {
        role: "toolResult",
        toolCallId: callId,
        toolName: "write",
        content: [{ type: "text", text: "ok" }],
      },
    }),
  ];
  await fs.appendFile(mainFile, lines.join("\n") + "\n");
}

type Fixture = {
  root: string;
  projectRoot: string;
  storeRoot: string;
  consentPath: string;
  sessionsDir: string;
  mainFile: string;
  ctx: ToolContext;
};

async function setupFixture(
  prefix: string,
  options: { consent: boolean },
): Promise<Fixture> {
  const root = await temporaryDirectory();
  const projectRoot = path.join(root, "workspace");
  const storeRoot = path.join(root, "store");
  const sessionsDir = path.join(root, "sessions");
  const consentPath = path.join(root, "consent.json");
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.mkdir(sessionsDir, { recursive: true, mode: 0o700 });

  if (options.consent) {
    await writeConsent(
      createConsentRecord(storeRoot, [sessionsDir]),
      consentPath,
    );
  }

  const skillsDir = await createSkillsFixture(root);
  const index = new SkillIndex(
    skillsDir,
    path.join(skillsDir, "metadata.json"),
  );
  await index.load();

  const tracker = new SessionTracker();
  const mainFile = await writeMainSession({
    tracker,
    sessionsDir,
    sessionId: "sess-main-auto",
    cwd: projectRoot,
  });

  const ctx: ToolContext = {
    projectRoot,
    index,
    tracker,
    setup: { kind: "ready" },
    policy: loadPolicyView(projectRoot),
    transport: "stdio",
    retrospectiveMark: { preparedAtProgress: 0 },
    consentPath,
  };

  return {
    root,
    projectRoot,
    storeRoot,
    consentPath,
    sessionsDir,
    mainFile,
    ctx,
  };
}

async function listStoreFiles(storeRoot: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else found.push(entry.name);
    }
  }
  try {
    await walk(storeRoot);
  } catch {
    return found;
  }
  return found;
}

const eligibleCompletion = {
  role: "orchestrator" as const,
  activeTasks: 0,
  pendingTasks: 0,
};

describe("automatic retrospective on eligible completion", () => {
  it("publishes summary, ledger and report for a bound native session and reports fixed paths", async () => {
    const fixture = await setupFixture("auto-eligible-", { consent: true });

    const cost = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: eligibleCompletion,
      },
      fixture.ctx,
    );
    const text = cost.content[0].text;

    expect(cost.isError).toBeUndefined();
    expect(text).toContain("caller-declared completion");
    expect(text).toContain("Retrospective prepared");
    expect(text).toContain("Coverage:");
    expect(text).toContain("View paths:");

    const files = await listStoreFiles(fixture.storeRoot);
    expect(files).toContain("summary.md");
    expect(files).toContain("ledger.json");
    expect(files).toContain("report.html");

    const summaryPath = /- Summary: (.*)/.exec(text)?.[1]?.trim();
    const ledgerPath = /- Ledger: (.*)/.exec(text)?.[1]?.trim();
    const reportPath = /- Report \(HTML, open in a browser\): (.*)/
      .exec(text)?.[1]
      ?.trim();
    expect(summaryPath).toBeTruthy();
    expect(ledgerPath).toBeTruthy();
    expect(reportPath).toBeTruthy();

    const summary = await fs.readFile(summaryPath!, "utf8");
    expect(summary.split("\n")[0]).toContain("Coverage:");
    const ledger = JSON.parse(await fs.readFile(ledgerPath!, "utf8"));
    expect(ledger.evidenceMode).toBe("native-files");
    const html = await fs.readFile(reportPath!, "utf8");
    expect(html.length).toBeGreaterThan(0);
  });

  it("repeats the same checkpoint as already-prepared without a second generation", async () => {
    const fixture = await setupFixture("auto-dedupe-", { consent: true });
    const args = {
      workflow: "implement-feature",
      outcome: "implemented",
      completion: eligibleCompletion,
    };

    const first = await getSessionCost(args, fixture.ctx);
    expect(first.content[0].text).toContain("Retrospective prepared");

    const second = await getSessionCost(args, fixture.ctx);
    const text = second.content[0].text;
    expect(text).toContain("Retrospective already prepared");
    expect(text).not.toContain("Retrospective prepared (artifact id:");

    const files = await listStoreFiles(fixture.storeRoot);
    expect(files.filter((name) => name === "summary.md")).toHaveLength(1);
    expect(files.filter((name) => name === "ledger.json")).toHaveLength(1);
    expect(files.filter((name) => name === "report.html")).toHaveLength(1);
  });

  it("publishes the next report after meaningful native work at a new checkpoint", async () => {
    const fixture = await setupFixture("auto-next-checkpoint-", {
      consent: true,
    });
    const args = {
      workflow: "implement-feature",
      outcome: "implemented",
      completion: eligibleCompletion,
    };

    const first = await getSessionCost(args, fixture.ctx);
    expect(first.content[0].text).toContain(
      "Retrospective prepared (artifact id:",
    );
    const firstArtifact = /artifact id: ([^,)]+)/.exec(
      first.content[0].text,
    )?.[1];
    expect(firstArtifact).toBeTruthy();

    await appendSubstantiveCall(fixture.ctx.tracker, fixture.mainFile);

    const next = await getSessionCost(args, fixture.ctx);
    const text = next.content[0].text;
    expect(text).toContain("Retrospective prepared (artifact id:");
    const nextArtifact = /artifact id: ([^,)]+)/.exec(text)?.[1];
    expect(nextArtifact).toBeTruthy();
    expect(nextArtifact).not.toBe(firstArtifact);

    const files = await listStoreFiles(fixture.storeRoot);
    expect(files.filter((name) => name === "summary.md")).toHaveLength(2);
  });

  it("persists artifacts when the typed adapter finalizes with explicit outcome and completion", async () => {
    const fixture = await setupFixture("auto-adapter-", { consent: true });

    const result = await finalizeWorkflowTelemetry({
      trigger: { activeWorkflow: "implement-feature", status: "completed" },
      outcome: "implemented",
      completion: eligibleCompletion,
      invokeGetSessionCost: (request) => getSessionCost(request, fixture.ctx),
    });

    expect(result).not.toBeNull();
    const text = result!.content[0].text;
    expect(text).toContain("Retrospective prepared (artifact id:");
    expect(text).toContain("caller-declared completion");

    const files = await listStoreFiles(fixture.storeRoot);
    expect(files).toContain("summary.md");
    expect(files).toContain("ledger.json");
    expect(files).toContain("report.html");
  });

  it("never pairs a completion call with the manual-prepare nudge, at or past the nudge threshold", async () => {
    const success = await setupFixture("auto-threshold-success-", {
      consent: true,
    });
    for (let i = 0; i < 20; i += 1) {
      success.ctx.tracker.record({
        via: "load_skills_for_files",
        input: [`src/file_${i}.ts`],
        loaded: ["typescript-language"],
      });
    }
    expect(success.ctx.tracker.summary().toolCalls).toBeGreaterThanOrEqual(20);

    const prepared = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: eligibleCompletion,
      },
      success.ctx,
    );
    const preparedText = prepared.content[0].text;
    expect(preparedText).not.toContain(RETROSPECTIVE_NUDGE_TEXT);
    expect(preparedText).toContain("Retrospective prepared (artifact id:");

    const refused = await setupFixture("auto-threshold-refusal-", {
      consent: true,
    });
    for (let i = 0; i < 20; i += 1) {
      refused.ctx.tracker.record({
        via: "load_skills_for_files",
        input: [`src/file_${i}.ts`],
        loaded: ["typescript-language"],
      });
    }

    const skipped = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: { role: "orchestrator", activeTasks: 1, pendingTasks: 0 },
      },
      refused.ctx,
    );
    const skippedText = skipped.content[0].text;
    expect(skippedText).not.toContain(RETROSPECTIVE_NUDGE_TEXT);
    expect(skippedText).toContain(AUTO_RETROSPECTIVE_TASKS_SKIPPED_TEXT);
    expect(await listStoreFiles(refused.storeRoot)).toHaveLength(0);
  });

  it("leaves cost output unchanged when no completion object is supplied", async () => {
    const fixture = await setupFixture("auto-legacy-", { consent: true });

    const cost = await getSessionCost(
      { workflow: "implement-feature", outcome: "implemented" },
      fixture.ctx,
    );
    const text = cost.content[0].text;

    expect(text).not.toContain("Automatic retrospective");
    expect(text).not.toContain("Retrospective prepared");
    expect(await listStoreFiles(fixture.storeRoot)).toHaveLength(0);
  });

  it("does not publish without consent and surfaces the fixed disabled text", async () => {
    const fixture = await setupFixture("auto-no-consent-", { consent: false });

    const cost = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: eligibleCompletion,
      },
      fixture.ctx,
    );
    const text = cost.content[0].text;

    expect(text).toContain("Automatic retrospective triggered");
    expect(text).toContain(DISABLED_RETROSPECTIVE_TEXT);
    expect(await listStoreFiles(fixture.storeRoot)).toHaveLength(0);
  });

  it("refuses tracker-only fallback when no native session is bound", async () => {
    const fixture = await setupFixture("auto-no-binding-", { consent: true });
    await fs.rm(fixture.mainFile, { force: true });

    const cost = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: eligibleCompletion,
      },
      fixture.ctx,
    );
    const text = cost.content[0].text;

    expect(text).toContain(
      "Retrospective skipped: automatic preparation requires a positively bound native session.",
    );
    expect(text).not.toContain("Retrospective prepared");
    expect(await listStoreFiles(fixture.storeRoot)).toHaveLength(0);
  });

  it("skips for workers, unsettled plans, other workflows and non-stdio transport", async () => {
    const fixture = await setupFixture("auto-ineligible-", { consent: true });

    const worker = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: { role: "worker", activeTasks: 0, pendingTasks: 0 },
      },
      fixture.ctx,
    );
    expect(worker.content[0].text).toContain(
      AUTO_RETROSPECTIVE_WORKER_SKIPPED_TEXT,
    );

    const active = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: { role: "orchestrator", activeTasks: 1, pendingTasks: 0 },
      },
      fixture.ctx,
    );
    expect(active.content[0].text).toContain(
      AUTO_RETROSPECTIVE_TASKS_SKIPPED_TEXT,
    );

    const pending = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: { role: "orchestrator", activeTasks: 0, pendingTasks: 2 },
      },
      fixture.ctx,
    );
    expect(pending.content[0].text).toContain(
      AUTO_RETROSPECTIVE_TASKS_SKIPPED_TEXT,
    );

    const otherWorkflow = await getSessionCost(
      {
        workflow: "code-review",
        outcome: "implemented",
        completion: eligibleCompletion,
      },
      fixture.ctx,
    );
    expect(otherWorkflow.content[0].text).toContain(
      AUTO_RETROSPECTIVE_WORKFLOW_SKIPPED_TEXT,
    );

    const otherOutcome = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "blocked",
        completion: eligibleCompletion,
      },
      fixture.ctx,
    );
    expect(otherOutcome.content[0].text).toContain(
      AUTO_RETROSPECTIVE_WORKFLOW_SKIPPED_TEXT,
    );

    const sseFixture = await setupFixture("auto-sse-", { consent: true });
    const sse = await getSessionCost(
      {
        workflow: "implement-feature",
        outcome: "implemented",
        completion: eligibleCompletion,
      },
      { ...sseFixture.ctx, transport: "sse" },
    );
    expect(sse.content[0].text).toContain(
      AUTO_RETROSPECTIVE_TRANSPORT_SKIPPED_TEXT,
    );

    expect(await listStoreFiles(fixture.storeRoot)).toHaveLength(0);
    expect(await listStoreFiles(sseFixture.storeRoot)).toHaveLength(0);
  });

  it("rejects an invalid completion object at the tool schema boundary", () => {
    expect(
      getSessionCostSchema.safeParse({
        completion: { role: "orchestrator", activeTasks: 0 },
      }).success,
    ).toBe(false);
    expect(
      getSessionCostSchema.safeParse({
        completion: { role: "reviewer", activeTasks: 0, pendingTasks: 0 },
      }).success,
    ).toBe(false);
    expect(
      getSessionCostSchema.safeParse({
        completion: { role: "orchestrator", activeTasks: -1, pendingTasks: 0 },
      }).success,
    ).toBe(false);
    expect(
      getSessionCostSchema.safeParse({
        completion: {
          role: "orchestrator",
          activeTasks: 0,
          pendingTasks: 0,
          extra: true,
        },
      }).success,
    ).toBe(false);
    expect(
      getSessionCostSchema.safeParse({ completion: eligibleCompletion })
        .success,
    ).toBe(true);
  });

  it("keeps standalone prepare_retrospective working without any workflow or completion payload", async () => {
    const fixture = await setupFixture("auto-standalone-", { consent: true });

    const prepared = await prepareRetrospective(
      { title: "standalone session" },
      fixture.ctx,
    );
    const text = prepared.content[0].text;

    expect(text).toContain("Retrospective prepared");
    expect(text).toContain("Retrospective prepared (artifact id:");

    const files = await listStoreFiles(fixture.storeRoot);
    expect(files).toContain("summary.md");
    expect(files).toContain("ledger.json");
    expect(files).toContain("report.html");
  });
});
