import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Checkpoint, NodeKey } from "../src/retrospective/contracts";
import {
  applyInvitationAction,
  readInvitation,
  recordCheckpoint,
  transition,
} from "../src/retrospective/checkpoint";
import { sessionToken } from "../src/retrospective/store";

const MAIN: NodeKey = { hostId: "host-main", sessionId: "main-session" };
const OWNER = "host-owner-1";
const roots: string[] = [];

async function privateFixtureRoot(): Promise<string> {
  const realTmp = await fs.realpath(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(realTmp, "ags-checkpoint-"));
  roots.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of roots.splice(0))
    await fs.rm(dir, { recursive: true, force: true });
});

function checkpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    main: { ...MAIN },
    checkpointId: "checkpoint-1",
    sequence: 1,
    mainAgent: true,
    diagnostic: false,
    substantive: true,
    intent: "completed",
    ready: true,
    ...overrides,
  };
}

function statePath(root: string): string {
  return path.join(root, "state", `${sessionToken(MAIN)}.json`);
}

describe("passive checkpoint disposition", () => {
  it(
    "collapses 1,000 identical checkpoints into one pending disposition and one write",
    async () => {
      const root = await privateFixtureRoot();
      const first = await recordCheckpoint(root, checkpoint(), OWNER);
      expect(first.announcement).toBe("announced");
      expect(first.written).toBe(true);
      expect(first.invitation).toEqual({
        state: "pending",
        checkpointId: "checkpoint-1",
        sequence: 1,
      });
      const bytes = await fs.readFile(statePath(root));
      const mtime = (await fs.lstat(statePath(root))).mtimeMs;
      for (let index = 0; index < 999; index += 1) {
        const replay = await recordCheckpoint(root, checkpoint(), OWNER);
        expect(replay.written).toBe(false);
        expect(replay.announcement).toBe("suppressed");
        expect(replay.invitation).toEqual(first.invitation);
      }
      expect((await fs.readFile(statePath(root))).equals(bytes)).toBe(true);
      expect((await fs.lstat(statePath(root))).mtimeMs).toBe(mtime);
      expect(
        (await fs.readdir(path.join(root, "state"))).filter((name) =>
          name.endsWith(".json"),
        ),
      ).toHaveLength(1);
      if (process.platform !== "win32")
        expect((await fs.lstat(statePath(root))).mode & 0o777).toBe(0o600);
      // Windows: 8 helper requests x ~9.5 ms x 1000 replays.
    },
    process.platform === "win32" ? 120_000 : 30_000,
  );

  it("ignores child, diagnostic, non-substantive, and idle-only events", async () => {
    const root = await privateFixtureRoot();
    for (const variant of [
      checkpoint({ mainAgent: false }),
      checkpoint({ diagnostic: true }),
      checkpoint({ substantive: false }),
      checkpoint({ ready: false }),
    ]) {
      const result = await recordCheckpoint(root, variant, OWNER);
      expect(result).toEqual({
        invitation: null,
        announcement: "ignored",
        written: false,
      });
    }
    await expect(fs.readdir(path.join(root, "state"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("suppresses Later and Skip replays for the same checkpoint", async () => {
    const root = await privateFixtureRoot();
    await recordCheckpoint(root, checkpoint(), OWNER);
    await applyInvitationAction(root, MAIN, "checkpoint-1", "later", OWNER);
    const laterReplay = await recordCheckpoint(root, checkpoint(), OWNER);
    expect(laterReplay.written).toBe(false);
    expect(laterReplay.invitation?.state).toBe("later");
    expect(await readInvitation(root, MAIN)).toMatchObject({ state: "later" });

    await applyInvitationAction(root, MAIN, "checkpoint-1", "skip", OWNER);
    const skipReplay = await recordCheckpoint(root, checkpoint(), OWNER);
    expect(skipReplay.written).toBe(false);
    expect(skipReplay.invitation?.state).toBe("skipped");
    expect(await readInvitation(root, MAIN)).toMatchObject({
      state: "skipped",
    });
  });

  it("updates the single pending invitation for meaningful newer work", async () => {
    const root = await privateFixtureRoot();
    await recordCheckpoint(root, checkpoint(), OWNER);
    const second = await recordCheckpoint(
      root,
      checkpoint({ checkpointId: "checkpoint-2", sequence: 2 }),
      OWNER,
    );
    expect(second.announcement).toBe("updated");
    expect(second.written).toBe(true);
    expect(second.invitation).toEqual({
      state: "pending",
      checkpointId: "checkpoint-2",
      sequence: 2,
    });
    const staleReplay = await recordCheckpoint(root, checkpoint(), OWNER);
    expect(staleReplay.written).toBe(false);
    expect(staleReplay.invitation?.checkpointId).toBe("checkpoint-2");
    const state = JSON.parse(await fs.readFile(statePath(root), "utf8")) as {
      disposition: { checkpointId: string };
    };
    expect(state.disposition.checkpointId).toBe("checkpoint-2");
  });

  it("transitions prepare, running, and reported, then permits a new checkpoint", async () => {
    const root = await privateFixtureRoot();
    await recordCheckpoint(root, checkpoint(), OWNER);
    expect(
      await applyInvitationAction(root, MAIN, "checkpoint-1", "prepare", OWNER),
    ).toMatchObject({ state: "running" });
    expect(await readInvitation(root, MAIN)).toMatchObject({
      state: "running",
    });
    expect(
      await applyInvitationAction(
        root,
        MAIN,
        "checkpoint-1",
        "reported",
        OWNER,
      ),
    ).toMatchObject({ state: "reported" });
    const next = await recordCheckpoint(
      root,
      checkpoint({ checkpointId: "checkpoint-2", sequence: 2 }),
      OWNER,
    );
    expect(next.announcement).toBe("announced");
    expect(next.invitation?.checkpointId).toBe("checkpoint-2");
  });

  it("enforces one explicit owner and rejects unknown checkpoints", async () => {
    const root = await privateFixtureRoot();
    await recordCheckpoint(root, checkpoint(), "owner-a");
    await expect(
      recordCheckpoint(
        root,
        checkpoint({ checkpointId: "checkpoint-2", sequence: 2 }),
        "owner-b",
      ),
    ).rejects.toMatchObject({ code: "STATE_OWNED_BY_OTHER" });
    await expect(
      applyInvitationAction(
        root,
        MAIN,
        "checkpoint-missing",
        "later",
        "owner-a",
      ),
    ).rejects.toMatchObject({ code: "CHECKPOINT_NOT_PENDING" });
    await expect(
      recordCheckpoint(
        root,
        { ...checkpoint(), extra: true } as unknown as Checkpoint,
        OWNER,
      ),
    ).rejects.toMatchObject({ code: "INVALID_CHECKPOINT" });
    await expect(
      recordCheckpoint(root, checkpoint({ sequence: -1 }), OWNER),
    ).rejects.toMatchObject({ code: "INVALID_CHECKPOINT" });
  });
});

describe("pure invitation transition", () => {
  it("derives pending, replay, newer, and action results without I/O", () => {
    const first = transition(null, checkpoint());
    expect(first).toEqual({
      state: "pending",
      checkpointId: "checkpoint-1",
      sequence: 1,
    });
    expect(transition(first, checkpoint())).toBe(first);
    expect(transition(first, checkpoint({ mainAgent: false }))).toBe(first);
    const newer = transition(
      first,
      checkpoint({ checkpointId: "checkpoint-2", sequence: 2 }),
    );
    expect(newer).toEqual({
      state: "pending",
      checkpointId: "checkpoint-2",
      sequence: 2,
    });
    const later = transition(first, {
      action: "later",
      checkpointId: "checkpoint-1",
    });
    expect(later).toEqual({
      state: "later",
      checkpointId: "checkpoint-1",
      sequence: 1,
    });
    expect(
      transition(later, { action: "prepare", checkpointId: "checkpoint-1" }),
    ).toEqual({
      state: "running",
      checkpointId: "checkpoint-1",
      sequence: 1,
    });
    expect(
      transition(later, { action: "skip", checkpointId: "checkpoint-2" }),
    ).toBe(later);
    expect(
      transition(null, { action: "later", checkpointId: "checkpoint-1" }),
    ).toBeNull();
  });
});
