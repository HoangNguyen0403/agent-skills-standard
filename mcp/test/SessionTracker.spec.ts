import { describe, expect, it } from "vitest";
import { SessionTracker } from "../src/services/SessionTracker";

describe("SessionTracker.observedToolCalls", () => {
  it("returns observed tool calls in exact order with copied data", () => {
    const tracker = new SessionTracker();
    expect(tracker.observedToolCalls()).toEqual([]);

    tracker.record({
      via: "load_skills_for_files",
      input: ["src/a.ts"],
      loaded: ["skill-a"],
    });

    tracker.record({
      via: "get_skill",
      input: ["skill-b"],
      loaded: ["skill-b"],
    });

    const calls = tracker.observedToolCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("load_skills_for_files");
    expect(typeof calls[0].at).toBe("string");
    expect(calls[1].tool).toBe("get_skill");
    expect(typeof calls[1].at).toBe("string");

    // Mutating returned array does not mutate tracker events
    calls.pop();
    expect(tracker.observedToolCalls()).toHaveLength(2);
  });
});

describe("SessionTracker.skillUsage", () => {
  it("reports exact counts and per-skill attribution for a hand-recorded sequence", () => {
    const tracker = new SessionTracker();
    tracker.record({
      via: "load_skills_for_files",
      input: ["src/a.ts"],
      selected: ["nextjs/app-router", "typescript/strict"],
      loaded: ["nextjs/app-router", "typescript/strict"],
      bodyDigests: {
        "nextjs/app-router": "digest-1",
        "typescript/strict": "digest-2",
      },
      estimatedTokens: 10,
    });
    tracker.record({
      via: "load_skills_for_files",
      input: ["src/b.ts"],
      selected: ["typescript/strict", "react/hooks"],
      loaded: ["typescript/strict"],
      bodyDigests: { "typescript/strict": "digest-2" },
      estimatedTokens: 5,
    });
    tracker.record({
      via: "get_skill",
      input: ["react/hooks"],
      selected: ["react/hooks"],
      loaded: ["react/hooks"],
      bodyDigests: { "react/hooks": "digest-3" },
      estimatedTokens: 3,
    });
    tracker.record({
      via: "get_skill",
      input: ["react/no-such-skill"],
      selected: [],
      loaded: [],
    });
    tracker.record({
      via: "get_workflow",
      input: ["dev-fix"],
      selected: [],
      loaded: ["workflow/dev-fix"],
    });
    tracker.record({
      via: "get_category_guide",
      input: ["nextjs"],
      selected: [],
      loaded: [],
      loadedGuides: ["nextjs/guide"],
    });

    const calls = tracker.observedToolCalls();
    const usage = tracker.skillUsage();

    expect(usage.since).toBe(tracker.startedAt_());
    expect(usage.events).toBe(6);
    expect(usage.loadCalls).toBe(6);
    expect(usage.noMatchCalls).toBe(1);
    expect(usage.bodyReturns).toBe(4);
    expect(usage.dedupedReturns).toBe(0);
    expect(usage.estimatedTokens).toBe(18);
    expect(usage.selectedNotLoaded).toBe(1);
    expect(usage.workflows).toBe(1);
    expect(usage.guides).toBe(1);
    expect(usage.skillsTotal).toBe(3);
    expect(usage.skills).toEqual([
      {
        id: "typescript/strict",
        returns: 2,
        firstAt: calls[0].at,
        via: ["load_skills_for_files"],
      },
      {
        id: "nextjs/app-router",
        returns: 1,
        firstAt: calls[0].at,
        via: ["load_skills_for_files"],
      },
      {
        id: "react/hooks",
        returns: 1,
        firstAt: calls[2].at,
        via: ["get_skill"],
      },
    ]);
  });

  it("counts a return served from context only when no body was read and the body was already returned", () => {
    const tracker = new SessionTracker();
    tracker.record({
      via: "load_skills_for_files",
      input: ["src/a.ts"],
      loaded: ["x/one"],
      bodyDigests: { "x/one": "digest-1" },
      estimatedTokens: 4,
    });
    tracker.record({
      via: "load_skills_for_keywords",
      input: ["one"],
      loaded: ["x/one"],
      bodyDigests: {},
      estimatedTokens: 0,
    });
    tracker.record({
      via: "load_skills_for_keywords",
      input: ["two"],
      loaded: ["x/two"],
      bodyDigests: {},
      estimatedTokens: 0,
    });

    const usage = tracker.skillUsage();
    expect(usage.loadCalls).toBe(3);
    expect(usage.bodyReturns).toBe(3);
    expect(usage.dedupedReturns).toBe(1);
    expect(usage.skillsTotal).toBe(2);
    expect(usage.skills).toEqual([
      {
        id: "x/one",
        returns: 2,
        firstAt: expect.any(String),
        via: ["load_skills_for_files", "load_skills_for_keywords"],
      },
      {
        id: "x/two",
        returns: 1,
        firstAt: expect.any(String),
        via: ["load_skills_for_keywords"],
      },
    ]);
  });

  it("caps the skill list at 20 entries ordered by returns desc then id asc", () => {
    const tracker = new SessionTracker();
    for (let i = 0; i < 25; i += 1) {
      tracker.record({
        via: "get_skill",
        input: [`cat/s${i}`],
        selected: [`cat/s${i}`],
        loaded: [`cat/s${i}`],
      });
    }
    tracker.record({
      via: "get_skill",
      input: ["cat/s24"],
      selected: ["cat/s24"],
      loaded: ["cat/s24"],
    });

    const usage = tracker.skillUsage();
    expect(usage.skillsTotal).toBe(25);
    expect(usage.skills).toHaveLength(20);
    expect(usage.skills[0]).toMatchObject({ id: "cat/s24", returns: 2 });
    expect(usage.skills.slice(1).map((skill) => skill.id)).toEqual([
      "cat/s0",
      "cat/s1",
      "cat/s10",
      "cat/s11",
      "cat/s12",
      "cat/s13",
      "cat/s14",
      "cat/s15",
      "cat/s16",
      "cat/s17",
      "cat/s18",
      "cat/s19",
      "cat/s2",
      "cat/s20",
      "cat/s21",
      "cat/s22",
      "cat/s23",
      "cat/s3",
      "cat/s4",
    ]);
  });

  it("replaces ids that fail the safe-identifier check with a hashed placeholder", () => {
    const tracker = new SessionTracker();
    tracker.record({
      via: "get_skill",
      input: ["cat/with spaces"],
      loaded: ["cat/with spaces", "a".repeat(97)],
    });

    const usage = tracker.skillUsage();
    expect(usage.skillsTotal).toBe(2);
    expect(usage.skills).toHaveLength(2);
    for (const skill of usage.skills) {
      expect(skill.id).toMatch(/^skill-[0-9a-f]{8}$/);
    }
    expect(JSON.stringify(usage)).not.toContain("with spaces");
  });

  it("never exposes the input strings the agent passed", () => {
    const tracker = new SessionTracker();
    tracker.record({
      via: "load_skills_for_files",
      input: ["src/SECRET-SENTINEL.ts"],
      selected: ["cat/ok"],
      loaded: ["cat/ok"],
    });
    tracker.record({
      via: "load_skills_for_keywords",
      input: ["SECRET-SENTINEL keyword"],
      selected: [],
      loaded: [],
    });

    expect(JSON.stringify(tracker.skillUsage())).not.toContain(
      "SECRET-SENTINEL",
    );
  });

  it("returns copies so mutating the snapshot cannot change the tracker", () => {
    const tracker = new SessionTracker();
    tracker.record({
      via: "get_skill",
      input: ["cat/one"],
      selected: ["cat/one"],
      loaded: ["cat/one"],
    });

    const first = tracker.skillUsage();
    first.loadCalls = 999;
    first.skills[0].id = "cat/mutated";
    first.skills.push({
      id: "cat/two",
      returns: 5,
      firstAt: "1970-01-01T00:00:00.000Z",
      via: [],
    });

    const second = tracker.skillUsage();
    expect(second.loadCalls).toBe(1);
    expect(second.skillsTotal).toBe(1);
    expect(second.skills).toEqual([
      {
        id: "cat/one",
        returns: 1,
        firstAt: expect.any(String),
        via: ["get_skill"],
      },
    ]);
  });
});
