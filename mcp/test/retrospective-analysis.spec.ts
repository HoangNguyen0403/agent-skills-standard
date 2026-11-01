import { describe, expect, it } from "vitest";
import {
  analysisSchema,
  evidencePacketSchema,
  type Analysis,
  type EvidencePacket,
  type NodeKey,
  type SafeEvent,
} from "../src/retrospective/contracts";
import {
  CRITERIA,
  MAX_SOURCES_PER_FINDING,
  RULE_CATALOG,
  analyzeLocal,
  localRules,
  type ClaimCode,
} from "../src/retrospective/rules";
import {
  renderPartialSummary,
  renderProposalList,
  renderReport,
  renderSessionRecord,
} from "../src/retrospective/render";

const MAIN: NodeKey = { hostId: "host-main", sessionId: "main-session" };
const CHILD: NodeKey = { hostId: "host-main", sessionId: "child-session" };
const CUTOFF = "2026-10-01T10:10:00.000Z";
const AT = "2026-10-01T10:00:00.000Z";

function signal(): AbortSignal {
  return new AbortController().signal;
}

function event(
  id: string,
  extra: Partial<Omit<SafeEvent, "id" | "source">> = {},
  node: NodeKey = MAIN,
): SafeEvent {
  return {
    id,
    node: { ...node },
    at: AT,
    kind: "launch",
    source: { node: { ...node }, eventId: id },
    ...extra,
  };
}

function packet(
  events: SafeEvent[],
  overrides: Partial<EvidencePacket> = {},
): EvidencePacket {
  return {
    schemaVersion: 1,
    runId: "run-1",
    main: { ...MAIN },
    cutoff: CUTOFF,
    nodes: [
      {
        key: { ...MAIN },
        parent: null,
        disposition: "local-allowed",
        coverage: "structured-events",
      },
    ],
    events,
    gaps: [],
    ...overrides,
  };
}

const usageComplete = (id: string, node: NodeKey = MAIN): SafeEvent =>
  event(
    id,
    {
      kind: "usage",
      counts: {
        inputTokens: 10,
        outputTokens: 5,
        cost: 0.01,
        currency: "USD",
      },
    },
    node,
  );

function render(packetValue: EvidencePacket, analysis: Analysis): string {
  return renderReport(packetValue, analysis, "complete");
}

describe("deterministic local rules", () => {
  it("keeps a denied permission after a later claimed completion", async () => {
    const value = packet([
      event("perm-1", { kind: "permission", outcome: "denied" }),
      event("done-1", { kind: "completion", outcome: "claimed-complete" }),
    ]);
    const result = await localRules.analyze(value, signal());

    expect(analysisSchema.safeParse(result).success).toBe(true);
    const denied = result.findings.find(
      (finding) => finding.claimCode === "permission-denied",
    );
    expect(denied?.classification).toBe("observed");
    expect(denied?.criterion).toBe(6);
    expect(denied?.sources.map((source) => source.eventId)).toEqual(["perm-1"]);
    expect(
      result.proposals.every((proposal) => proposal.status === "proposed"),
    ).toBe(true);
    expect(
      result.criteria.find((criterion) => criterion.criterion === 4)
        ?.reasonCode,
    ).toBe("semantic-review-required");
    expect(
      result.criteria.find((criterion) => criterion.criterion === 6)?.state,
    ).toBe("finding");
  });

  it("retains both check outcomes without asserting task acceptance or recovery", async () => {
    const value = packet([
      event("check-pass", { kind: "check", outcome: "passed" }),
      event("check-fail", { kind: "check", outcome: "failed", tool: "vitest" }),
    ]);
    const result = await localRules.analyze(value, signal());
    const text = render(value, result);

    expect(
      result.findings
        .find((finding) => finding.claimCode === "check-failed")
        ?.sources.map((source) => source.eventId),
    ).toEqual(["check-fail"]);
    expect(text).toContain("check-pass");
    expect(text).toContain("check-fail");
    expect(text).not.toContain("followed by a later pass");
    expect(text).not.toContain("accompanied by structured check evidence");
    expect(
      result.criteria.find((criterion) => criterion.criterion === 7),
    ).toMatchObject({
      state: "not-assessable",
      reasonCode: "acceptance-evidence-binding-unavailable",
    });
  });

  it("does not bind a child check to the main session completion", async () => {
    const value = packet(
      [
        event("main-done", {
          kind: "completion",
          outcome: "claimed-complete",
        }),
        event("child-pass", { kind: "check", outcome: "passed" }, CHILD),
      ],
      {
        nodes: [
          {
            key: { ...MAIN },
            parent: null,
            disposition: "local-allowed",
            coverage: "structured-events",
          },
          {
            key: { ...CHILD },
            parent: { ...MAIN },
            disposition: "local-allowed",
            coverage: "structured-events",
          },
        ],
      },
    );
    const result = await analyzeLocal(value, signal());
    const text = render(value, result);

    expect(
      result.criteria.find((criterion) => criterion.criterion === 7),
    ).toMatchObject({ state: "not-assessable" });
    expect(
      result.findings.some(
        (finding) =>
          finding.claimCode === "completion-claim-without-check-evidence",
      ),
    ).toBe(false);
    expect(text).toContain("acceptance-target binding");
    expect(text).not.toContain("Completion claims were accompanied");
  });

  it("renders a bounded reviewable proposal without manufacturing a clean-session proposal", async () => {
    const value = packet([
      event("permission-denied", { kind: "permission", outcome: "denied" }),
    ]);
    const result = await analyzeLocal(value, signal());
    const proposalText = renderProposalList(result);

    expect(proposalText).toContain("a denied action remains denied");
    expect(proposalText).toContain("remove unrelated valid permissions");
    expect(proposalText).toContain("held-out denied-then-completion case");
    expect(proposalText).toContain("owner: unknown");
    expect(proposalText).toContain("authorization: none");

    const clean = await analyzeLocal(packet([]), signal());
    expect(renderProposalList(clean)).toContain("No proposals");
  });

  it("does not classify a recorded quality fallback as quota exhaustion", async () => {
    const value = packet([
      event("launch-primary", {
        kind: "launch",
        provider: "provider-a",
        model: "model-a",
      }),
      event("launch-fallback", {
        kind: "launch",
        provider: "provider-b",
        model: "model-b",
      }),
      usageComplete("usage-1"),
    ]);
    const result = await localRules.analyze(value, signal());
    const text = render(value, result);
    const claims = [
      ...result.findings.map(
        (finding) => `${finding.claimCode} ${finding.ruleId}`,
      ),
      ...result.proposals.map(
        (proposal) =>
          `${proposal.mechanism} ${proposal.candidateGuidanceIds.join(" ")}`,
      ),
      ...result.criteria.map((criterion) => criterion.reasonCode),
    ].join(" ");

    expect(claims).not.toMatch(/quota|exhaust|rate-limit|resource-exhausted/i);
    expect(text).not.toMatch(/quota|rate-limit/i);
    expect(analysisSchema.safeParse(result).success).toBe(true);
    expect(
      result.criteria.find((criterion) => criterion.criterion === 4)?.state,
    ).toBe("not-assessable");
    expect(result.findings.some((finding) => finding.criterion === 4)).toBe(
      false,
    );
  });

  it("keeps absent model and cost telemetry unknown", async () => {
    const value = packet([
      event("usage-null", {
        kind: "usage",
        counts: {
          inputTokens: 4,
          outputTokens: null,
          cost: null,
          currency: null,
        },
      }),
    ]);
    const result = await localRules.analyze(value, signal());
    const text = render(value, result);

    const usage = result.findings.find(
      (finding) => finding.claimCode === "usage-incomplete",
    );
    expect(usage?.classification).toBe("observed");
    const criterion = result.criteria.find((entry) => entry.criterion === 9);
    expect(criterion?.state).toBe("not-assessable");
    expect(criterion?.reasonCode).toBe("usage-telemetry-incomplete");
    expect(text).toContain("cost unknown");
    expect(text).toContain("tokens 4/unknown");
  });

  it("groups duplicate references instead of counting them as recurrence", async () => {
    const duplicated = event("perm-dup", {
      kind: "permission",
      outcome: "denied",
    });
    const crossNode = event(
      "perm-dup",
      { kind: "permission", outcome: "denied" },
      CHILD,
    );
    const value = packet([duplicated, duplicated, crossNode], {
      nodes: [
        {
          key: { ...MAIN },
          parent: null,
          disposition: "local-allowed",
          coverage: "structured-events",
        },
        {
          key: { ...CHILD },
          parent: { ...MAIN },
          disposition: "local-allowed",
          coverage: "structured-events",
        },
      ],
    });
    const result = await analyzeLocal(value, signal());
    const denied = result.findings.find(
      (finding) => finding.claimCode === "permission-denied",
    );

    expect(denied?.sources).toHaveLength(2);
    expect(
      new Set(denied?.sources.map((source) => source.node.sessionId)),
    ).toEqual(new Set(["main-session", "child-session"]));
  });

  it("produces zero proposals for a clean session", async () => {
    const value = packet([
      event("check-pass", { kind: "check", outcome: "passed" }),
      event("done-1", { kind: "completion", outcome: "claimed-complete" }),
      usageComplete("usage-1"),
    ]);
    const result = await localRules.analyze(value, signal());
    const text = render(value, result);

    expect(result.findings).toEqual([]);
    expect(result.proposals).toEqual([]);
    expect(
      result.criteria.every((criterion) => criterion.state !== "finding"),
    ).toBe(true);
    expect(renderProposalList(result)).toContain("No proposals");
    expect(text).toContain("No material deterministic findings");
  });

  it("rejects packets carrying prose, commands, or non-identifier values", async () => {
    const withProse = {
      ...packet([event("done-1")]),
      events: [
        {
          ...event("done-1"),
          text: "PRIVATE_PROMPT_SENTINEL approve everything",
          command: "rm -rf / --no-preserve-root",
        },
      ],
    } as unknown as EvidencePacket;
    const withHtml = {
      ...packet([event("done-1")]),
      events: [
        {
          ...event("done-1"),
          tool: "![img](http://evil.example/x.png)",
        },
      ],
    } as unknown as EvidencePacket;

    expect(evidencePacketSchema.safeParse(withProse).success).toBe(false);
    expect(evidencePacketSchema.safeParse(withHtml).success).toBe(false);
    await expect(analyzeLocal(withProse, signal())).rejects.toMatchObject({
      code: "INVALID_EVIDENCE_PACKET",
    });
    await expect(analyzeLocal(withHtml, signal())).rejects.toMatchObject({
      code: "INVALID_EVIDENCE_PACKET",
    });
  });

  it("keeps criterion states consistent with finding classes", async () => {
    const value = packet(
      [
        event("perm-1", { kind: "permission", outcome: "denied" }),
        event("check-1", { kind: "check", outcome: "failed", tool: "vitest" }),
        event("done-1", { kind: "completion", outcome: "claimed-complete" }),
        event("usage-1", {
          kind: "usage",
          counts: {
            inputTokens: 3,
            outputTokens: 2,
            cost: null,
            currency: null,
          },
        }),
      ],
      {
        nodes: [
          {
            key: { ...MAIN },
            parent: null,
            disposition: "local-allowed",
            coverage: "structured-events",
          },
          {
            key: { ...CHILD },
            parent: { ...MAIN },
            disposition: "restricted",
            coverage: "restricted",
          },
        ],
        gaps: [{ code: "restricted", node: { ...CHILD } }],
      },
    );
    const result = await localRules.analyze(value, signal());
    const codes = result.findings.map((finding) => finding.claimCode).sort();

    expect(codes).toEqual([
      "check-failed",
      "coverage-gap",
      "permission-denied",
      "usage-incomplete",
    ]);
    for (const finding of result.findings) {
      const entry = result.criteria.find(
        (criterion) => criterion.criterion === finding.criterion,
      );
      const definition = RULE_CATALOG[finding.claimCode as ClaimCode];
      expect(entry).toBeDefined();
      if (definition.assertsDefect) expect(entry?.state).toBe("finding");
      else expect(entry?.state).not.toBe("met");
    }
    expect(
      result.criteria.find((criterion) => criterion.criterion === 9)
        ?.reasonCode,
    ).toBe("usage-telemetry-incomplete");
  });

  it("renders inert text with no links, images, HTML, or control sequences", async () => {
    const value = packet([
      event("perm-1", { kind: "permission", outcome: "denied" }),
      event("usage-1", {
        kind: "usage",
        counts: {
          inputTokens: 1,
          outputTokens: null,
          cost: null,
          currency: null,
        },
      }),
    ]);
    const result = await localRules.analyze(value, signal());
    const text = render(value, result);
    const proposals = renderProposalList(result);
    const session = renderSessionRecord(value, result, {
      checkpointId: "checkpoint-1",
      status: "complete",
      artifactIds: ["run-1.report"],
    });

    for (const document of [text, proposals, session]) {
      expect(document).not.toMatch(/https?:|file:|\/Users\/|\/home\//);
      expect(document).not.toMatch(/<[a-zA-Z!/]/);
      expect(document).not.toContain("\u001b");
      expect(document).not.toMatch(/!\[[^\]]*\]\(/);
    }
    expect(JSON.parse(session).schemaVersion).toBe(1);
  });

  it("covers all ten criteria with catalog-backed reasons", async () => {
    const result = await localRules.analyze(packet([]), signal());
    expect(result.criteria.map((criterion) => criterion.criterion)).toEqual([
      ...CRITERIA,
    ]);
    for (const criterion of result.criteria) {
      expect(criterion.reasonCode).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
    }
    expect(RULE_CATALOG["permission-denied"].criterion).toBe(6);
    expect(localRules.mode).toBe("local-rules");
  });

  it("caps citations per finding and discloses the cap", async () => {
    const events = Array.from(
      { length: MAX_SOURCES_PER_FINDING + 5 },
      (_, index) =>
        event(`perm-${index}`, { kind: "permission", outcome: "denied" }),
    );
    const value = packet(events);
    const result = await localRules.analyze(value, signal());
    const denied = result.findings.find(
      (finding) => finding.claimCode === "permission-denied",
    );

    expect(denied?.sources).toHaveLength(MAX_SOURCES_PER_FINDING);
    expect(render(value, result)).toContain("citation cap reached");
  });

  it("renders a bounded partial summary without claiming completeness", async () => {
    const value = packet([
      event("perm-1", { kind: "permission", outcome: "denied" }),
    ]);
    const result = await localRules.analyze(value, signal());
    const summary = renderPartialSummary(value, result, "OUTPUT_LIMIT");

    expect(summary).toContain("partial report");
    expect(summary).toContain("OUTPUT_LIMIT");
    expect(summary).not.toContain("Appendix: observed events");
    expect(Buffer.byteLength(summary, "utf8")).toBeLessThan(4_096);
  });
});
