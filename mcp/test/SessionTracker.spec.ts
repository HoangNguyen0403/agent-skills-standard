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
