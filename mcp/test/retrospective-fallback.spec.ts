import { describe, expect, it } from "vitest";
import { safeEventSchema, type NodeKey } from "../src/retrospective/contracts";
import { createTrackerEvidenceSource } from "../src/retrospective/fallback-source";
import { SessionTracker } from "../src/services/SessionTracker";

describe("retrospective fallback evidence source", () => {
  const mainNode: NodeKey = {
    hostId: "host-fallback",
    sessionId: "sess-fallback-main",
  };
  const cutoff = "2026-11-01T14:00:00.000Z";

  it("yields node coverage summary-only and exactly the recorded events without touching files", async () => {
    const tracker = new SessionTracker();
    tracker.record({
      via: "get_workflow",
      input: ["dev-fix"],
      loaded: ["workflow/dev-fix"],
    });
    tracker.record({
      via: "load_skills_for_files",
      input: ["src/app.ts"],
      loaded: ["typescript/typescript-language"],
    });
    tracker.record({
      via: "get_skill",
      input: ["common/common-best-practices"],
      loaded: ["common/common-best-practices"],
    });

    const nonexistentWorkspace = "/nonexistent/path/outside/any/root/123456789";
    const source = createTrackerEvidenceSource(tracker, nonexistentWorkspace);

    const controller = new AbortController();
    const inventoryItems = [];
    for await (const item of source.inventory(
      mainNode,
      cutoff,
      controller.signal,
    )) {
      inventoryItems.push(item);
    }

    expect(inventoryItems).toHaveLength(1);
    expect(inventoryItems[0]).toEqual({
      key: { hostId: mainNode.hostId, sessionId: mainNode.sessionId },
      parent: null,
      disposition: "local-allowed",
      coverage: "summary-only",
    });

    const events = [];
    for await (const ev of source.read(mainNode, controller.signal)) {
      events.push(ev);
    }

    expect(events).toHaveLength(3);

    expect(events[0]).toMatchObject({
      id: "load-1",
      node: mainNode,
      kind: "launch",
      tool: "get_workflow",
      outcome: "passed",
      source: {
        node: mainNode,
        eventId: "load-1",
        line: 1,
      },
    });

    expect(events[1]).toMatchObject({
      id: "load-2",
      node: mainNode,
      kind: "check",
      tool: "load_skills_for_files",
      outcome: "passed",
      source: {
        node: mainNode,
        eventId: "load-2",
        line: 2,
      },
    });

    expect(events[2]).toMatchObject({
      id: "load-3",
      node: mainNode,
      kind: "check",
      tool: "get_skill",
      outcome: "passed",
      source: {
        node: mainNode,
        eventId: "load-3",
        line: 3,
      },
    });

    for (const ev of events) {
      expect(() => safeEventSchema.parse(ev)).not.toThrow();
    }
  });

  it("respects abort signals during inventory and read", async () => {
    const tracker = new SessionTracker();
    tracker.record({
      via: "get_skill",
      input: ["typescript/typescript-language"],
      loaded: ["typescript/typescript-language"],
    });

    const source = createTrackerEvidenceSource(tracker, "/nonexistent");
    const controller = new AbortController();
    controller.abort();

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of source.inventory(
        mainNode,
        cutoff,
        controller.signal,
      )) {
        // empty
      }
    }).rejects.toThrow();

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of source.read(mainNode, controller.signal)) {
        // empty
      }
    }).rejects.toThrow();
  });

  it("functions when tracker provides summary and loadedWorkflows/loadedSkills without events_", async () => {
    const mockTracker = {
      summary: () => ({
        startedAt: "2026-11-01T12:00:00.000Z",
        elapsedSeconds: 10,
        toolCalls: 2,
        skillsLoaded: 1,
        guidesLoaded: 0,
        workflowsLoaded: 1,
        noMatchCalls: 0,
        callsByTool: {
          load_skills_for_files: 0,
          load_skills_for_keywords: 0,
          get_skill: 1,
          get_category_guide: 0,
          list_categories: 0,
          list_workflows: 0,
          get_workflow: 1,
          get_session_cost: 0,
        },
      }),
      loadedWorkflows: () => ["workflow/implement-feature"],
      loadedSkills: () => ["react/react-architecture"],
    } as unknown as SessionTracker;

    const source = createTrackerEvidenceSource(mockTracker, "/nonexistent");
    const controller = new AbortController();

    const events = [];
    for await (const ev of source.read(mainNode, controller.signal)) {
      events.push(ev);
    }

    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe("launch");
    expect(events[0].tool).toBe("get_workflow");
    expect(events[1].kind).toBe("check");
    expect(events[1].tool).toBe("get_skill");
  });
});
