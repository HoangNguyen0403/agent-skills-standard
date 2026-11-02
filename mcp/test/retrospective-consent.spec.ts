import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_TEXT_VERSION,
  consentFilePath,
  readConsent,
  removeConsent,
  writeConsent,
  type ConsentRecord,
} from "../src/retrospective/consent";

const temporaryRoots: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const base = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(base, "ags-retro-consent-"));
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

function createSampleRecord(dir: string): ConsentRecord {
  return {
    schemaVersion: 1,
    consentTextVersion: CONSENT_TEXT_VERSION,
    grantedAt: "2026-11-01T12:00:00.000Z",
    storeRoot: path.resolve(dir, "diagnostics"),
    allowedSourceRoots: [path.resolve(dir, "sessions", "omp")],
    storageRiskAcknowledged: true,
  };
}

async function writePrivateFile(
  filePath: string,
  content: string,
): Promise<void> {
  await fs.writeFile(filePath, content, { mode: 0o600 });
  if (process.platform !== "win32") {
    await fs.chmod(filePath, 0o600);
  }
}

describe("retrospective consentFilePath resolution", () => {
  it("resolves XDG absolute path on POSIX", () => {
    const resolved = consentFilePath(
      { XDG_CONFIG_HOME: "/custom/xdg" },
      "linux",
      "/home/test",
    );
    expect(resolved).toBe(
      "/custom/xdg/agent-skills-standard/retrospective-consent.json",
    );
  });

  it("ignores XDG relative path and falls back to home on POSIX", () => {
    const resolved = consentFilePath(
      { XDG_CONFIG_HOME: "relative/xdg" },
      "linux",
      "/home/test",
    );
    expect(resolved).toBe(
      "/home/test/.config/agent-skills-standard/retrospective-consent.json",
    );
  });

  it("resolves default home config when XDG_CONFIG_HOME is unset on POSIX", () => {
    const resolved = consentFilePath({}, "linux", "/home/test");
    expect(resolved).toBe(
      "/home/test/.config/agent-skills-standard/retrospective-consent.json",
    );
  });

  it("resolves APPDATA on win32", () => {
    const resolved = consentFilePath(
      { APPDATA: "C:\\Users\\test\\AppData\\Roaming" },
      "win32",
      "C:\\Users\\test",
    );
    expect(resolved).toBe(
      "C:\\Users\\test\\AppData\\Roaming\\agent-skills-standard\\retrospective-consent.json",
    );
  });

  it("falls back to AppData Roaming when APPDATA is unset on win32", () => {
    const resolved = consentFilePath({}, "win32", "C:\\Users\\test");
    expect(resolved).toBe(
      "C:\\Users\\test\\AppData\\Roaming\\agent-skills-standard\\retrospective-consent.json",
    );
  });
});

describe("retrospective readConsent fail-closed behavior", () => {
  it("returns missing for a nonexistent file", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "nonexistent.json");
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "missing",
    });
  });

  it("returns invalid for an empty file", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "empty.json");
    await writePrivateFile(filePath, "");
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "invalid",
    });
  });

  it("returns invalid for truncated JSON", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "truncated.json");
    await writePrivateFile(filePath, '{"schemaVersion": 1,');
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "invalid",
    });
  });

  it("returns invalid for wrong schemaVersion", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "wrong-schema.json");
    const record = { ...createSampleRecord(dir), schemaVersion: 2 };
    await writePrivateFile(filePath, JSON.stringify(record));
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "invalid",
    });
  });

  it("returns invalid for unknown extra key", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "unknown-key.json");
    const record = {
      ...createSampleRecord(dir),
      unexpectedKey: "disallowed-value",
    };
    await writePrivateFile(filePath, JSON.stringify(record));
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "invalid",
    });
  });

  it("returns invalid for relative storeRoot", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "relative-root.json");
    const record = { ...createSampleRecord(dir), storeRoot: "relative/path" };
    await writePrivateFile(filePath, JSON.stringify(record));
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "invalid",
    });
  });

  it("returns version for wrong consentTextVersion", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "wrong-version.json");
    const record = { ...createSampleRecord(dir), consentTextVersion: "1" };
    await writePrivateFile(filePath, JSON.stringify(record));
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "version",
    });
  });

  it.skipIf(process.platform === "win32")(
    "returns permissive for mode 644 on POSIX",
    async () => {
      const dir = await temporaryDirectory();
      const filePath = path.join(dir, "mode644.json");
      const record = createSampleRecord(dir);
      await fs.writeFile(filePath, JSON.stringify(record));
      await fs.chmod(filePath, 0o644);
      expect(await readConsent(filePath)).toEqual({
        state: "disabled",
        reason: "permissive",
      });
    },
  );

  it.skipIf(process.platform === "win32")(
    "deliberate check order: valid content with mode 644 returns permissive, not enabled",
    async () => {
      const dir = await temporaryDirectory();
      const filePath = path.join(dir, "valid-but-644.json");
      const record = createSampleRecord(dir);
      await fs.writeFile(filePath, JSON.stringify(record), { mode: 0o644 });
      await fs.chmod(filePath, 0o644);
      expect(await readConsent(filePath)).toEqual({
        state: "disabled",
        reason: "permissive",
      });
    },
  );

  it.skipIf(process.platform === "win32")(
    "returns symlink for symlinked file on POSIX",
    async () => {
      const dir = await temporaryDirectory();
      const realPath = path.join(dir, "real.json");
      const record = createSampleRecord(dir);
      await writeConsent(record, realPath);
      const linkPath = path.join(dir, "symlink.json");
      await fs.symlink(realPath, linkPath);
      expect(await readConsent(linkPath)).toEqual({
        state: "disabled",
        reason: "symlink",
      });
    },
  );

  it("returns invalid for a consent file larger than the read cap", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "oversized.json");
    const record = createSampleRecord(dir);
    const oversized = JSON.stringify(record) + " ".repeat(70_000);
    expect(oversized.length).toBeGreaterThan(65_536);
    await writePrivateFile(filePath, oversized);
    expect(await readConsent(filePath)).toEqual({
      state: "disabled",
      reason: "invalid",
    });
  });

  it.skipIf(process.platform === "win32")(
    "returns invalid for a directory at the consent path without hanging",
    async () => {
      const dir = await temporaryDirectory();
      const filePath = path.join(dir, "consent-as-directory");
      await fs.mkdir(filePath, { mode: 0o700 });
      expect(await readConsent(filePath)).toEqual({
        state: "disabled",
        reason: "invalid",
      });
    },
  );
});

describe("retrospective writeConsent and removeConsent", () => {
  it("creates owner-only directory and 0600 file on POSIX and round-trips readConsent", async () => {
    const dir = await temporaryDirectory();
    const targetDir = path.join(dir, "sub", "config");
    const filePath = path.join(targetDir, "retrospective-consent.json");
    const record = createSampleRecord(dir);
    await writeConsent(record, filePath);

    if (process.platform !== "win32") {
      const fileStat = await fs.lstat(filePath);
      expect(fileStat.mode & 0o777).toBe(0o600);
      const dirStat = await fs.lstat(targetDir);
      expect(dirStat.mode & 0o077).toBe(0);
    }

    const read = await readConsent(filePath);
    expect(read).toEqual({ state: "enabled", record });
  });

  it("rejects writing an invalid record and leaves no file", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "invalid-write.json");
    const record = {
      ...createSampleRecord(dir),
      storeRoot: "relative/not/allowed",
    } as unknown as ConsentRecord;
    await expect(writeConsent(record, filePath)).rejects.toThrow();
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it("removes consent returning true then false", async () => {
    const dir = await temporaryDirectory();
    const filePath = path.join(dir, "remove-target.json");
    const record = createSampleRecord(dir);
    await writeConsent(record, filePath);
    expect(await removeConsent(filePath)).toBe(true);
    expect(await removeConsent(filePath)).toBe(false);
  });
});
