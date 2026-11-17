import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readAgentRecords } from "../src/retrospective/agent-records";
import {
  loadNativeIngress,
  type NativeIngressApi,
} from "../src/retrospective/native-ingress";
const temporaryRoots: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const base = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(base, "ags-agent-records-"));
  temporaryRoots.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.map((directory) =>
      fs.rm(directory, { recursive: true, force: true }).catch(() => undefined),
    ),
  );
  temporaryRoots.length = 0;
});

async function writeRecord(directory: string, id: string, extra = {}) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, `${id}.json`),
    JSON.stringify({
      id,
      provider: "omp",
      persistence: { sessionId: "sessionid-0001", secret: "not retained" },
      labels: { "paseo.parent-agent-id": "parentid-0001", private: "not retained" },
      ...extra,
    }),
  );
}

describe("readAgentRecords", () => {
  it("reads two directory levels and returns only the four approved fields", async () => {
    const root = await temporaryDirectory();
    const id = "agentid-0001";
    await writeRecord(path.join(root, "bucket"), id, {
      credential: "never returned",
    });

    const result = await readAgentRecords([root]);

    expect(result.records).toEqual([
      {
        id,
        provider: "omp",
        sessionId: "sessionid-0001",
        parentAgentId: "parentid-0001",
      },
    ]);
    expect(result.recordsRead).toBe(1);
    expect(result.gaps).toBe(0);
  });

  it("drops malformed records and rejects path-shaped or mismatched identifiers", async () => {
    const root = await temporaryDirectory();
    const bucket = path.join(root, "bucket");
    await fs.mkdir(bucket);
    await fs.writeFile(path.join(bucket, "agentid-0001.json"), "{");
    await fs.writeFile(path.join(bucket, "../escape.json"), "{}");
    await fs.writeFile(
      path.join(bucket, "agentid-0002.json"),
      JSON.stringify({
        id: "different-id-0001",
        provider: "provider",
        persistence: { sessionId: "sessionid-0001" },
        labels: {},
      }),
    );

    const result = await readAgentRecords([root]);

    expect(result.records).toEqual([]);
    expect(result.gaps).toBeGreaterThanOrEqual(2);
  });

  it("marks capped scans truncated and does not read beyond configured bounds", async () => {
    const root = await temporaryDirectory();
    await writeRecord(path.join(root, "a"), "agentid-0001");
    await writeRecord(path.join(root, "b"), "agentid-0002");

    const result = await readAgentRecords([root], { maxDirectories: 1 });

    expect(result.truncated).toBe(true);
    expect(result.directoriesRead).toBe(1);
  });
  it("does not follow a symlinked child directory to outside records", async () => {
    const root = await temporaryDirectory();
    const outside = await temporaryDirectory();
    await writeRecord(outside, "agentid-0001");
    await fs.symlink(outside, path.join(root, "linked-bucket"), "dir");

    const result = await readAgentRecords([root]);

    expect(result.records).toEqual([]);
    expect(result.gaps).toBeGreaterThan(0);
  });

  it("keeps record reads pinned when the allowed root path is replaced", async () => {
    const root = await temporaryDirectory();
    const movedRoot = `${root}-moved`;
    const id = "agentid-0001";
    await writeRecord(path.join(root, "bucket"), id);
    const loaded = await loadNativeIngress();
    if (loaded.state !== "available") {
      throw new Error("Native ingress is required for this capability test");
    }
    const nativeOpenRoot = loaded.api.openRoot.bind(loaded.api);
    let swapped = false;
    const nativeIngress = {
      ...loaded.api,
      openRoot: async (target: string) => {
        const capability = await nativeOpenRoot(target);
        if (!swapped) {
          swapped = true;
          await fs.rename(root, movedRoot);
          temporaryRoots.push(movedRoot);
          await writeRecord(path.join(root, "bucket"), id, {
            persistence: { sessionId: "outside-session-0001" },
          });
        }
        return capability;
      },
    };

    const result = await readAgentRecords([root], { nativeIngress });

    expect(swapped).toBe(true);
    expect(result.records).toEqual([
      {
        id,
        provider: "omp",
        sessionId: "sessionid-0001",
        parentAgentId: "parentid-0001",
      },
    ]);
  });

  it("treats only an absent root as optional and reports a linked root as a gap", async () => {
    const parent = await temporaryDirectory();
    const missingRoot = path.join(parent, "missing");
    const outside = await temporaryDirectory();
    await writeRecord(outside, "agentid-0001");
    const linkedRoot = path.join(parent, "linked-root");
    await fs.symlink(outside, linkedRoot, "dir");

    const missing = await readAgentRecords([missingRoot]);
    const linked = await readAgentRecords([linkedRoot]);

    expect(missing).toMatchObject({ records: [], gaps: 0, truncated: false });
    expect(linked.records).toEqual([]);
    expect(linked.gaps).toBeGreaterThan(0);
  });

  it("bounds directory-entry iteration, including irrelevant and duplicate names", async () => {
    const root = await temporaryDirectory();
    const bucket = path.join(root, "bucket");
    await fs.mkdir(bucket);
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        fs.writeFile(path.join(bucket, `irrelevant-${index}.txt`), "x"),
      ),
    );

    const result = await readAgentRecords([root], { maxEntries: 2 });

    expect(result.truncated).toBe(true);
    expect(result.entriesVisited).toBeLessThanOrEqual(3);
    expect(result.recordsRead).toBe(0);
  });

  it.each([false, true])(
    "quarantines conflicting duplicate projections independent of enumeration order (reverse=%s)",
    async (reverse) => {
      const root = await temporaryDirectory();
      const agentId = "agentid-duplicate-0001";
      await writeRecord(path.join(root, "first"), agentId, {
        persistence: { sessionId: "sessionid-first-0001" },
      });
      await writeRecord(path.join(root, "second"), agentId, {
        persistence: { sessionId: "sessionid-second-0001" },
      });
      const loaded = await loadNativeIngress();
      if (loaded.state !== "available") {
        throw new Error("Native ingress is required for this capability test");
      }
      const base = loaded.api;
      const nativeIngress: NativeIngressApi = {
        ...base,
        readDirectoryBatch: async (cursor, maxEntries) => {
          const batch = await base.readDirectoryBatch(cursor, maxEntries);
          return {
            ...batch,
            entries: reverse ? [...batch.entries].reverse() : batch.entries,
          };
        },
      };

      const result = await readAgentRecords([root], { nativeIngress });

      expect(result.records).toEqual([]);
      expect(result.recordsRead).toBe(2);
      expect(result.gaps).toBeGreaterThan(0);
    },
  );

  it("deduplicates identical projected records without retaining duplicate payload", async () => {
    const root = await temporaryDirectory();
    const agentId = "agentid-identical-0001";
    await writeRecord(path.join(root, "first"), agentId, {
      credential: "first-secret",
    });
    await writeRecord(path.join(root, "second"), agentId, {
      credential: "second-secret",
    });

    const result = await readAgentRecords([root]);

    expect(result.records).toEqual([
      {
        id: agentId,
        provider: "omp",
        sessionId: "sessionid-0001",
        parentAgentId: "parentid-0001",
      },
    ]);
    expect(result.recordsRead).toBe(2);
    expect(result.gaps).toBe(0);
  });
});
