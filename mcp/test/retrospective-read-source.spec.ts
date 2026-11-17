import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createReadSource, type ReadSource } from "../src/retrospective/read-source";

const open = promisify(fs.open);
const tempDirs: string[] = [];

async function createFile(contents: string): Promise<string> {
  const directory = await fsp.mkdtemp(
    path.join(await fsp.realpath(os.tmpdir()), "ags-read-source-"),
  );
  tempDirs.push(directory);
  const file = path.join(directory, "session.jsonl");
  await fsp.writeFile(file, contents);
  return file;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((directory) =>
      fsp.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("ReadSource", () => {
  it("reads a transferred descriptor positionally and drains reads before idempotent close", async () => {
    const file = await createFile("abcdef");
    const source = createReadSource(await open(file, "r"));
    const buffer = Buffer.alloc(3);
    const pendingRead = source.read(buffer, 0, buffer.length, 2);
    const closing = source.close();

    await expect(pendingRead).resolves.toMatchObject({ bytesRead: 3 });
    expect(buffer.toString()).toBe("cde");
    await expect(closing).resolves.toBeUndefined();
    await expect(source.close()).resolves.toBeUndefined();
    await expect(source.stat()).rejects.toThrow("Read source is closed");
  });

  it("accepts Node FileHandle structurally without descriptor adoption", async () => {
    const file = await createFile("session");
    const handle = await fsp.open(file, "r");
    const source: ReadSource = handle;

    expect((await source.stat()).isFile()).toBe(true);
    await source.close();
  });
});
