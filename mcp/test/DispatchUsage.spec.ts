import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendDispatchEvents,
  eventId,
  inventoryIdentity,
  planDispatchUsage,
  usageIdentity,
  type DispatchUsageEvent,
  type EmittedEvent,
  type ImportOptions,
} from "../src/services/DispatchUsage";
import { runDispatchUsageCli } from "../src/dispatch-usage-cli";
import { readDeliveryObservations } from "../../scripts/metrics/delivery";
import {
  buildDispatchFixture,
  FIXTURE,
  type DispatchFixture,
} from "./fixtures/dispatch-usage/build";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

async function fixture(
  options: { swapWorkerRecords?: boolean } = {},
): Promise<DispatchFixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-dispatch-usage-"));
  roots.push(root);
  return buildDispatchFixture(root, options);
}

function optionsFor(
  tree: DispatchFixture,
  overrides: Partial<ImportOptions> = {},
): ImportOptions {
  return {
    observationsPath: tree.observationsPath,
    from: FIXTURE.windowFrom,
    to: FIXTURE.windowTo,
    host: "paseo-omp",
    paseoHome: tree.paseoHome,
    now: "2026-11-16T00:00:00.000Z",
    ...overrides,
  };
}

function usageEventId(dispatchId: string, actor: "worker" | "supervision") {
  return eventId(
    "dispatch-usage",
    usageIdentity(dispatchId, actor, FIXTURE.windowFrom, FIXTURE.windowTo),
  );
}

function find(
  tree: DispatchFixture,
  dispatchId: string,
  actor: "worker" | "supervision",
) {
  return async (): Promise<DispatchUsageEvent & { id: string }> => {
    const plan = await planDispatchUsage(optionsFor(tree));
    const event = plan.events.find(
      (candidate) =>
        candidate.dispatch_id === dispatchId && candidate.actor === actor,
    );
    if (!event) throw new Error(`missing ${dispatchId}/${actor}`);
    return event;
  };
}

describe("planDispatchUsage", () => {
  it("counts usage only inside the window and attributes supervision turn by turn (AC-011)", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));

    // One event per dispatch and actor; unattributed supervision is never an event.
    expect(plan.events).toHaveLength(4);
    expect(plan.events.map((event) => event.id).sort()).toEqual(
      [
        usageEventId(FIXTURE.dispatchA, "worker"),
        usageEventId(FIXTURE.dispatchA, "supervision"),
        usageEventId(FIXTURE.dispatchB, "worker"),
        usageEventId(FIXTURE.dispatchB, "supervision"),
      ].sort(),
    );

    // Worker A spans the window start: the pre-window message is not counted.
    expect(await find(tree, FIXTURE.dispatchA, "worker")()).toMatchObject({
      change_id: FIXTURE.changeA,
      revision: "rev-1",
      window_from: FIXTURE.windowFrom,
      window_to: FIXTURE.windowTo,
      turns: 2,
      input_tokens: 300,
      cached_input_tokens: 40,
      cache_write_tokens: 10,
      output_tokens: 50,
      recorded_cost: 0.0105,
      cost_basis: "host-recorded-estimate",
      coverage_complete: true,
      method_ref: "journal-window-v1",
    });

    // Worker B reported no cache counters: unknown, never zero.
    expect(await find(tree, FIXTURE.dispatchB, "worker")()).toMatchObject({
      turns: 1,
      input_tokens: 50,
      cached_input_tokens: null,
      cache_write_tokens: null,
      output_tokens: 5,
      recorded_cost: 0.001,
      coverage_complete: true,
    });

    // Supervision: o-4 and o-5 are charged to agent-a; the notification aims o-6
    // at agent-b; o-3 has no pointer and is reported unattributed instead.
    expect(await find(tree, FIXTURE.dispatchA, "supervision")()).toMatchObject({
      turns: 2,
      input_tokens: 1500,
      cached_input_tokens: 5000,
      cache_write_tokens: 0,
      output_tokens: 700,
      recorded_cost: 0.55,
      coverage_complete: true,
      method_ref: "last-addressed-v1",
    });
    expect(await find(tree, FIXTURE.dispatchB, "supervision")()).toMatchObject({
      turns: 1,
      input_tokens: 300,
      cached_input_tokens: 0,
      cache_write_tokens: 0,
      output_tokens: 60,
      recorded_cost: 0.05,
    });
    expect(plan.unattributed).toEqual({
      orchestrators: 1,
      turns: { known: 1, unknown: 0 },
      inputTokens: { known: 200, unknown: 0 },
      cachedInputTokens: { known: 0, unknown: 0 },
      cacheWriteTokens: { known: 0, unknown: 0 },
      outputTokens: { known: 50, unknown: 0 },
      recordedCost: { known: 0.2, unknown: 0 },
    });
  });

  it("writes one inventory event per change served with one identical count (SRS-008)", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));

    expect(plan.inventory).toHaveLength(2);
    expect(plan.inventory.map((event) => event.change_id).sort()).toEqual([
      FIXTURE.changeA,
      FIXTURE.changeB,
    ]);
    // Three agents were created inside the window; agent-b has a dispatch event.
    for (const event of plan.inventory) {
      expect(event.unrecorded_count).toBe(2);
      expect(event.orchestrator_ref).toBe(FIXTURE.orchestratorRef);
      expect(event.id).toBe(
        eventId(
          "dispatch-inventory",
          inventoryIdentity(
            event.change_id,
            FIXTURE.orchestratorRef,
            FIXTURE.windowFrom,
            FIXTURE.windowTo,
          ),
        ),
      );
    }
  });

  it("records every pair as no-adapter for a host without an adapter (AC-012)", async () => {
    const tree = await fixture();
    for (const host of ["none", "unknown-host"]) {
      const plan = await planDispatchUsage(
        optionsFor(tree, { host, adapter: undefined }),
      );
      expect(plan.events).toHaveLength(4);
      expect(plan.inventory).toHaveLength(0);
      for (const event of plan.events) {
        expect(event.unavailable_code).toBe("no-adapter");
        expect(event.coverage_complete).toBe(false);
        expect(event.turns).toBeNull();
        expect(event.input_tokens).toBeNull();
        expect(event.cached_input_tokens).toBeNull();
        expect(event.cache_write_tokens).toBeNull();
        expect(event.output_tokens).toBeNull();
        expect(event.recorded_cost).toBeNull();
      }
    }
  });

  it("reports an identity mismatch for swapped records and charges no worker usage", async () => {
    const tree = await fixture({ swapWorkerRecords: true });
    const plan = await planDispatchUsage(optionsFor(tree));

    for (const dispatchId of [FIXTURE.dispatchA, FIXTURE.dispatchB]) {
      const event = plan.events.find(
        (candidate) =>
          candidate.dispatch_id === dispatchId && candidate.actor === "worker",
      );
      expect(event).toMatchObject({
        unavailable_code: "identity-mismatch",
        coverage_complete: false,
        turns: null,
        recorded_cost: null,
      });
    }
    // The orchestrator is untouched by a worker swap, so supervision still measures.
    expect(
      plan.events.filter((event) => event.actor === "supervision"),
    ).toHaveLength(2);
    expect(
      plan.events.find((event) => event.actor === "supervision")
        ?.unavailable_code,
    ).toBeUndefined();
  });

  it("reports an unresolved worker when the host has no record for it", async () => {
    const tree = await fixture();
    await fs.rm(path.join(tree.paseoHome, "agents", FIXTURE.dispatchA), {
      recursive: true,
    });
    const plan = await planDispatchUsage(optionsFor(tree));
    const event = plan.events.find(
      (candidate) =>
        candidate.dispatch_id === FIXTURE.dispatchA &&
        candidate.actor === "worker",
    );
    expect(event).toMatchObject({
      unavailable_code: "unresolved",
      turns: null,
    });
  });

  it("never emits a title, prompt or path (AC-015)", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));
    const dryRun = JSON.stringify(plan.events) + JSON.stringify(plan.inventory);
    const forbidden = [
      ...FIXTURE.titles,
      ...FIXTURE.prompts,
      ...tree.hiddenPaths,
      tree.root,
      "transcripts",
    ];
    for (const haystack of [dryRun]) {
      for (const needle of forbidden) expect(haystack).not.toContain(needle);
    }

    const { output } = await runDispatchUsageCli(
      [
        "--observations",
        tree.observationsPath,
        "--from",
        "2026-10-02",
        "--to",
        "2026-10-03",
        "--host",
        "paseo-omp",
        "--paseo-home",
        tree.paseoHome,
      ],
      "2026-11-16T00:00:00.000Z",
    );
    for (const needle of forbidden) expect(output).not.toContain(needle);

    await appendDispatchEvents(
      tree.observationsPath,
      [...plan.events, ...plan.inventory],
      {
        lockTimeoutMs: 2_000,
      },
    );
    const written = await fs.readFile(tree.observationsPath, "utf8");
    for (const needle of forbidden) expect(written).not.toContain(needle);
  });
});

describe("writer and reader parity", () => {
  const rejected = [
    ["negative turns", { turns: -1 }],
    ["negative cost", { recorded_cost: -0.5 }],
    ["unknown actor", { actor: "manager" }],
    [
      "unavailable code with a counter",
      { unavailable_code: "no-adapter", turns: 5 },
    ],
  ] as const;

  async function readerIssues(
    root: string,
    events: Array<Record<string, unknown>>,
  ): Promise<string[]> {
    const readerRoot = path.join(root, "reader-root");
    const directory = path.join(readerRoot, "artifacts", "metrics");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, "delivery-observations.json"),
      JSON.stringify({
        schema_version: 1,
        source_kind: "operator-recorded",
        coverage: [],
        events,
      }),
    );
    return readDeliveryObservations(readerRoot).issues.map(
      (issue) => issue.message,
    );
  }

  it.each(rejected)(
    "refuses %s and so does the reader",
    async (_label, patch) => {
      const tree = await fixture();
      const plan = await planDispatchUsage(optionsFor(tree));
      const original = plan.events[0];
      const malformed = { ...original, ...patch } as unknown as EmittedEvent;

      await expect(
        appendDispatchEvents(tree.observationsPath, [malformed], {
          lockTimeoutMs: 2_000,
        }),
      ).rejects.toThrow(/event-invalid/);

      const file = JSON.parse(
        await fs.readFile(tree.observationsPath, "utf8"),
      ) as {
        events: Array<Record<string, unknown>>;
      };
      const dispatch = file.events.find((event) => event.kind === "dispatch");
      expect(
        await readerIssues(tree.root, [
          dispatch as Record<string, unknown>,
          { ...malformed },
        ]),
      ).not.toHaveLength(0);
    },
  );
});

describe("plan totals and resolution states", () => {
  it("keeps unknown per field in the unattributed totals", async () => {
    const tree = await fixture();
    const loaded = await buildDispatchFixture(path.join(tree.root, "sparse"), {
      sparseUsageTurnIds: ["o-3", "o-6"],
    });
    const plan = await planDispatchUsage(
      optionsFor(tree, {
        observationsPath: loaded.observationsPath,
        paseoHome: loaded.paseoHome,
      }),
    );
    // o-3 is the unattributed turn and o-6 is the agent-b turn: both lost cost and
    // cache counters, so each field is a known subtotal plus an unknown count.
    expect(plan.unattributed).toMatchObject({
      orchestrators: 1,
      turns: { known: 1, unknown: 0 },
      inputTokens: { known: 200, unknown: 0 },
      outputTokens: { known: 50, unknown: 0 },
      cachedInputTokens: { known: 0, unknown: 1 },
      cacheWriteTokens: { known: 0, unknown: 1 },
      recordedCost: { known: 0, unknown: 1 },
    });
    const agentB = plan.events.find(
      (event) =>
        event.dispatch_id === FIXTURE.dispatchB &&
        event.actor === "supervision",
    );
    expect(agentB).toMatchObject({
      turns: 1,
      recorded_cost: null,
      cached_input_tokens: null,
      cache_write_tokens: null,
    });
  });

  it("treats a resolved session with no in-window rows as measured zero", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(
      optionsFor(tree, {
        from: "2026-10-02T06:00:00.000Z",
        to: "2026-10-02T07:00:00.000Z",
      }),
    );
    const workerA = plan.events.find(
      (event) =>
        event.dispatch_id === FIXTURE.dispatchA && event.actor === "worker",
    );
    expect(workerA).toMatchObject({
      turns: 0,
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_tokens: 0,
      output_tokens: 0,
      recorded_cost: 0,
      coverage_complete: false,
    });
    expect(workerA?.unavailable_code).toBeUndefined();
  });

  it("reports inventory-unavailable with the safe orchestrator reference", async () => {
    const tree = await fixture();
    await fs.rm(
      path.join(tree.paseoHome, "agents", FIXTURE.orchestratorAgent),
      {
        recursive: true,
      },
    );
    const plan = await planDispatchUsage(optionsFor(tree));
    expect(plan.inventory).toHaveLength(0);
    expect(plan.limitations).toContain(
      `inventory-unavailable: ${FIXTURE.orchestratorRef}`,
    );
    for (const limitation of plan.limitations) {
      expect(limitation).not.toContain(tree.root);
    }
  });
});

describe("appendDispatchEvents", () => {
  it("treats an identical rerun as a no-op and rejects an overlapping window", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));
    const events: EmittedEvent[] = [...plan.events, ...plan.inventory];

    const first = await appendDispatchEvents(tree.observationsPath, events, {
      lockTimeoutMs: 2_000,
    });
    expect(first).toEqual({ written: 6, skipped: 0 });
    const afterFirst = await fs.readFile(tree.observationsPath, "utf8");

    const replay = await appendDispatchEvents(tree.observationsPath, events, {
      lockTimeoutMs: 2_000,
    });
    expect(replay).toEqual({ written: 0, skipped: 6 });
    expect(await fs.readFile(tree.observationsPath, "utf8")).toBe(afterFirst);

    const overlapping = await runDispatchUsageCli(
      [
        "--observations",
        tree.observationsPath,
        "--from",
        "2026-10-02",
        "--to",
        "2026-10-04",
        "--host",
        "paseo-omp",
        "--paseo-home",
        tree.paseoHome,
        "--write",
      ],
      "2026-11-16T00:00:00.000Z",
    ).then(
      () => null,
      (error: unknown) => error as Error,
    );
    expect(overlapping?.message).toMatch(/window-overlap/);
    expect(await fs.readFile(tree.observationsPath, "utf8")).toBe(afterFirst);
  });

  it("rejects a reference string with a trailing newline instead of writing it", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));
    const tampered = { ...plan.events[0], method_ref: "journal-window-v1\n" };
    await expect(
      appendDispatchEvents(tree.observationsPath, [tampered], {
        lockTimeoutMs: 2_000,
      }),
    ).rejects.toThrow(/event-invalid/);
  });

  it("rejects an id that already belongs to a different identity", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));
    const [victim, other] = [plan.events[0], plan.events[1]];
    // Seed the file with the victim's id on another identity's payload, the way a
    // hand-edited or foreign writer could.
    const file = JSON.parse(
      await fs.readFile(tree.observationsPath, "utf8"),
    ) as {
      events: Array<Record<string, unknown>>;
    };
    file.events.push({ ...other, id: victim.id });
    await fs.writeFile(tree.observationsPath, JSON.stringify(file));

    await expect(
      appendDispatchEvents(tree.observationsPath, [victim], {
        lockTimeoutMs: 2_000,
      }),
    ).rejects.toThrow(/event-conflict/);
  });
  it("detects replays by domain identity even when the stored id differs", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));
    const original = plan.events[0];
    if (!original) throw new Error("missing planned dispatch usage event");
    const file = JSON.parse(
      await fs.readFile(tree.observationsPath, "utf8"),
    ) as {
      events: Array<Record<string, unknown>>;
    };
    file.events.push({ ...original, id: "foreign-valid-id" });
    await fs.writeFile(tree.observationsPath, JSON.stringify(file));
    const seeded = await fs.readFile(tree.observationsPath, "utf8");

    await expect(
      appendDispatchEvents(
        tree.observationsPath,
        [{ ...original, turns: original.turns + 1 }],
        { lockTimeoutMs: 2_000 },
      ),
    ).rejects.toThrow(/event-conflict/);
    expect(await fs.readFile(tree.observationsPath, "utf8")).toBe(seeded);

    expect(
      await appendDispatchEvents(tree.observationsPath, [original], {
        lockTimeoutMs: 2_000,
      }),
    ).toEqual({ written: 0, skipped: 1 });
    expect((await readDeliveryObservations(tree.root)).issues).toEqual([]);
  });

  it.each([
    ["dispatch-usage", "usage"],
    ["dispatch-inventory", "inventory"],
  ] as const)(
    "treats equivalent %s windows as the same replay",
    async (kind, collection) => {
      const tree = await fixture();
      const plan = await planDispatchUsage(optionsFor(tree));
      const original =
        collection === "usage" ? plan.events[0] : plan.inventory[0];
      if (!original || original.kind !== kind)
        throw new Error(`missing ${kind} event`);
      const stored = {
        ...original,
        id: "foreign-valid-id",
        window_from: original.window_from.replace(".000Z", "Z"),
        window_to: original.window_to.replace(".000Z", "Z"),
      };
      const file = JSON.parse(
        await fs.readFile(tree.observationsPath, "utf8"),
      ) as {
        events: Array<Record<string, unknown>>;
      };
      file.events.push(stored);
      await fs.writeFile(tree.observationsPath, JSON.stringify(file));

      expect(
        await appendDispatchEvents(tree.observationsPath, [original], {
          lockTimeoutMs: 2_000,
        }),
      ).toEqual({ written: 0, skipped: 1 });
      expect((await readDeliveryObservations(tree.root)).issues).toEqual([]);
    },
  );

  it("writes nothing and reports the lock age when the lock is held", async () => {
    const tree = await fixture();
    const plan = await planDispatchUsage(optionsFor(tree));
    const before = await fs.readFile(tree.observationsPath, "utf8");
    await fs.writeFile(
      `${tree.observationsPath}.lock`,
      JSON.stringify({ pid: 1 }),
    );
    await expect(
      appendDispatchEvents(tree.observationsPath, plan.events, {
        lockTimeoutMs: 150,
      }),
    ).rejects.toThrow(
      /lock-timeout: an existing lock is \d+s old; nothing was written/,
    );
    expect(await fs.readFile(tree.observationsPath, "utf8")).toBe(before);
    expect(await fs.readFile(`${tree.observationsPath}.lock`, "utf8")).toBe(
      JSON.stringify({ pid: 1 }),
    );
  });
});
