import { describe, expect, it } from "vitest";
import {
  createEmptyLookupStats,
  createEmptyPermissionRequestStats,
  type NodeUsage,
  type PermissionRequestEvent,
  type TreeAggregate,
} from "../src/retrospective/aggregate";
import { buildPermissionFriction } from "../src/retrospective/permission-friction";

function event(
  overrides: Partial<PermissionRequestEvent> & { requestKey: string },
): PermissionRequestEvent {
  return {
    actorKey: "id-aaaaaaaaaaaaaaaa",
    observedRequest: true,
    tool: "bash",
    program: null,
    kind: "command",
    requestedAtMs: null,
    answeredAtMs: null,
    verdict: null,
    ...overrides,
  };
}

function nodeWith(options: {
  asked: number;
  events?: PermissionRequestEvent[];
  answeredWithoutRequest?: number;
  capture?: "captured" | "unsupported" | null;
}): NodeUsage {
  const stats = createEmptyPermissionRequestStats();
  stats.asked = options.asked;
  stats.answeredWithoutRequest = options.answeredWithoutRequest ?? 0;
  const capture = options.capture === undefined ? "captured" : options.capture;
  return {
    ordinal: 0,
    turns: 0,
    cost: 0,
    costKnownTurns: 0,
    compactions: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    errorStops: 0,
    abortedStops: 0,
    toolCalls: 0,
    toolErrors: 0,
    toolCallsByName: {},
    serverToolCalls: {},
    models: {},
    permissionAnswers: {
      allow: 0,
      deny: 0,
      other: 0,
      byTarget: {},
      untrackedTargets: 0,
    },
    permissionRequests: stats,
    ...(options.events !== undefined
      ? { permissionRequestEvents: options.events }
      : {}),
    ...(capture !== null ? { permissionCapture: capture } : {}),
    context: {
      maxCacheRead: 0,
      postCompactionTurns: 0,
      postCompactionCacheReadSum: 0,
    },
    routing: { editEpisodes: 0, unguardedEditEpisodes: 0 },
    lookups: createEmptyLookupStats(),
    skillLoadCalls: 0,
    first: null,
    last: null,
  };
}

function treeOf(
  nodes: NodeUsage[],
  overrides: Partial<TreeAggregate> = {},
): TreeAggregate {
  return {
    sessions: nodes.length,
    fullyRead: nodes.length,
    coverage: "complete",
    first: null,
    last: null,
    assistantTurns: 0,
    userMessages: 0,
    compactions: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    cost: 0,
    costKnownTurns: 0,
    costUnknownTurns: 0,
    models: {},
    stopReasons: {},
    toolCalls: {},
    toolErrors: {},
    serverToolCalls: {},
    hostSkillReads: {},
    skillLoad: { nodes: [], omittedNodes: 0 },
    nodes,
    folder: null,
    skippedLines: 0,
    metricCompleteness: {},
    series: { byDayModel: {} },
    ...overrides,
  };
}

describe("buildPermissionFriction", () => {
  it("returns null when there is no aggregate tree", () => {
    expect(buildPermissionFriction(null)).toBeNull();
  });

  it("counts one identity once across parent and child observations", () => {
    const parent = nodeWith({
      asked: 1,
      events: [
        event({
          requestKey: "key-1",
          actorKey: "id-1111111111111111",
          requestedAtMs: 1_000,
          answeredAtMs: 5_000,
          verdict: "allow",
        }),
      ],
    });
    const child = nodeWith({
      asked: 1,
      events: [
        event({
          requestKey: "key-1",
          actorKey: "id-1111111111111111",
          requestedAtMs: 1_200,
          answeredAtMs: 5_000,
          verdict: "allow",
        }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([parent, child]));

    expect(friction).not.toBeNull();
    expect(friction?.requests).toBe(1);
    expect(friction?.answered).toBe(1);
    expect(friction?.unanswered).toBe(0);
    expect(friction?.waitMs).toBe(4_000);
    expect(friction?.waitMeasuredRequests).toBe(1);
    expect(friction?.byAgent).toHaveLength(1);
  });

  it("joins an answer-only observation to a request observed elsewhere", () => {
    const requestNode = nodeWith({
      asked: 1,
      events: [
        event({
          requestKey: "joined",
          actorKey: "id-2222222222222222",
          requestedAtMs: 2_000,
        }),
      ],
    });
    const answerNode = nodeWith({
      asked: 0,
      answeredWithoutRequest: 1,
      events: [
        event({
          requestKey: "joined",
          actorKey: "id-2222222222222222",
          observedRequest: false,
          answeredAtMs: 8_000,
          verdict: "deny",
        }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([requestNode, answerNode]));

    expect(friction?.requests).toBe(1);
    expect(friction?.answered).toBe(1);
    expect(friction?.waitMs).toBe(6_000);
    expect(friction?.byTool).toEqual([
      { tool: "bash", requests: 1, repeatedRequests: 0 },
    ]);
  });

  it("never turns an unmatched answer into a request", () => {
    const answerOnly = nodeWith({
      asked: 0,
      answeredWithoutRequest: 1,
      events: [
        event({
          requestKey: "orphan",
          observedRequest: false,
          answeredAtMs: 4_000,
          verdict: "allow",
        }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([answerOnly]));

    expect(friction?.requests).toBe(0);
    expect(friction?.answered).toBe(0);
    expect(friction?.limitations.join(" ")).toContain(
      "did not match any observed request",
    );
  });

  it("keeps distinct actor keys and distinct request identities distinct", () => {
    const node = nodeWith({
      asked: 2,
      events: [
        event({ requestKey: "key-a", actorKey: "id-1111111111111111" }),
        event({ requestKey: "key-b", actorKey: "id-2222222222222222" }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([node]));

    expect(friction?.requests).toBe(2);
    expect(friction?.repeatedRequests).toBe(0);
    expect(friction?.byAgent).toHaveLength(2);
    expect(friction?.byAgent.reduce((sum, row) => sum + row.requests, 0)).toBe(
      2,
    );
  });

  it("counts repeats only within one actor's tool category", () => {
    const node = nodeWith({
      asked: 4,
      events: [
        event({ requestKey: "r1", actorKey: "id-aaaaaaaaaaaaaaaa" }),
        event({ requestKey: "r2", actorKey: "id-aaaaaaaaaaaaaaaa" }),
        event({ requestKey: "r3", actorKey: "id-aaaaaaaaaaaaaaaa" }),
        event({ requestKey: "r4", actorKey: "id-bbbbbbbbbbbbbbbb" }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([node]));

    expect(friction?.requests).toBe(4);
    expect(friction?.repeatedRequests).toBe(2);
    expect(friction?.byTool).toEqual([
      { tool: "bash", requests: 4, repeatedRequests: 2 },
    ]);
    expect(
      friction?.byAgent.find(
        (row) => row.requests === 3 && row.repeatedRequests === 2,
      ),
    ).toBeDefined();
  });

  it("uses the earliest valid answer observation when records repeat", () => {
    const node = nodeWith({
      asked: 1,
      events: [
        event({
          requestKey: "repeat-answer",
          requestedAtMs: 1_000,
          answeredAtMs: 9_000,
          verdict: "deny",
        }),
        event({
          requestKey: "repeat-answer",
          requestedAtMs: null,
          answeredAtMs: 3_000,
          verdict: "allow",
        }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([node]));

    expect(friction?.requests).toBe(1);
    expect(friction?.answered).toBe(1);
    expect(friction?.waitMs).toBe(2_000);
  });

  it("leaves wait time and provenance null when evidence is absent", () => {
    const node = nodeWith({
      asked: 1,
      events: [event({ requestKey: "key-no-ts", verdict: "allow" })],
    });

    const friction = buildPermissionFriction(treeOf([node]));

    expect(friction?.answered).toBe(1);
    expect(friction?.waitMs).toBeNull();
    expect(friction?.waitMeasuredRequests).toBe(0);
    expect(friction?.humanAnswers).toBeNull();
    expect(friction?.orchestratorAnswers).toBeNull();
    expect(friction?.limitations.join(" ")).toContain(
      "Wait time is measured for 0 of 1 answered requests",
    );
    expect(friction?.limitations.join(" ")).toContain(
      "no structured provenance identifies the approving agent or a human",
    );
    expect(friction?.limitations.join(" ")).toContain(
      "humanAnswers is null rather than zero",
    );
  });

  it("excludes non-monotonic answer timestamps from wait time", () => {
    const node = nodeWith({
      asked: 1,
      events: [
        event({
          requestKey: "key-backwards",
          requestedAtMs: 9_000,
          answeredAtMs: 1_000,
          verdict: "deny",
        }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([node]));

    expect(friction?.waitMs).toBeNull();
    expect(friction?.waitMeasuredRequests).toBe(0);
    expect(friction?.limitations.join(" ")).toContain(
      "non-monotonic timestamps",
    );
  });

  it("reports partial coverage when nodes, records or events are missing", () => {
    const truncated = nodeWith({
      asked: 3,
      events: [event({ requestKey: "only-one" })],
    });
    const friction = buildPermissionFriction(
      treeOf([truncated], { sessions: 2, coverage: "partial" }),
    );

    expect(friction?.coverage).toBe("partial");
    const limitations = friction?.limitations.join(" ") ?? "";
    expect(limitations).toContain("counts are lower bounds");
    expect(limitations).toContain("omitted 1 session node");
    expect(limitations).toContain("exceeded the event record cap");
  });

  it("reports partial coverage for nodes captured before event recording", () => {
    const legacy = nodeWith({ asked: 2 });

    const friction = buildPermissionFriction(treeOf([legacy], { sessions: 0 }));

    expect(friction?.coverage).toBe("partial");
    expect(friction?.requests).toBe(0);
    expect(friction?.limitations.join(" ")).toContain(
      "had no event-level records",
    );
  });

  it("never certifies a zero count when permission capture is unsupported", () => {
    const codex = nodeWith({ asked: 0, capture: "unsupported" });

    const friction = buildPermissionFriction(treeOf([codex]));

    expect(friction?.coverage).toBe("partial");
    expect(friction?.requests).toBe(0);
    expect(friction?.limitations.join(" ")).toContain("unknown, not zero");
  });

  it("treats a missing capture marker as unknown, not complete", () => {
    const unknown = nodeWith({ asked: 0, capture: null });

    const friction = buildPermissionFriction(treeOf([unknown]));

    expect(friction?.coverage).toBe("partial");
    expect(friction?.limitations.join(" ")).toContain(
      "predate permission capture support",
    );
  });

  it("flags requests whose actor identity is observation-scoped", () => {
    const node = nodeWith({
      asked: 1,
      events: [event({ requestKey: "anonymous", actorKey: "unknown-1234" })],
    });

    const friction = buildPermissionFriction(treeOf([node]));

    expect(friction?.requests).toBe(1);
    expect(friction?.limitations.join(" ")).toContain("no resolvable agent id");
  });

  it("emits generated aliases instead of internal actor keys", () => {
    const node = nodeWith({
      asked: 1,
      events: [
        event({ requestKey: "key-alias", actorKey: "id-secretvalue1234" }),
      ],
    });

    const friction = buildPermissionFriction(treeOf([node]));
    const label = friction?.byAgent[0]?.label ?? "";

    expect(label).toMatch(/^actor-[0-9a-f]{8}$/);
    expect(JSON.stringify(friction)).not.toContain("id-secretvalue1234");
  });

  it("bounds the actor breakdown and says so", () => {
    const events: PermissionRequestEvent[] = [];
    for (let index = 0; index < 25; index += 1) {
      events.push(
        event({
          requestKey: `key-${index}`,
          actorKey: `id-${String(index).padStart(16, "0")}`,
        }),
      );
    }
    const node = nodeWith({ asked: events.length, events });

    const friction = buildPermissionFriction(treeOf([node]));

    expect(friction?.requests).toBe(25);
    expect(friction?.byAgent).toHaveLength(20);
    expect(friction?.limitations.join(" ")).toContain("lists 20 of 25 actors");
  });

  it("is deterministic and JSON-safe", () => {
    const node = nodeWith({
      asked: 2,
      events: [
        event({ requestKey: "k1", actorKey: "id-1111111111111111" }),
        event({
          requestKey: "k2",
          actorKey: "id-2222222222222222",
          tool: "read",
        }),
      ],
    });
    const tree = treeOf([node]);

    const first = buildPermissionFriction(tree);
    const second = buildPermissionFriction(tree);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});
