import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readGitOutcome } from "../src/retrospective/outcome";

const execFileAsync = promisify(execFile);

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ags-retro-outcome-"));
  tempDirs.push(dir);
  return dir;
}

async function runGit(
  dir: string,
  args: string[],
  extraEnv?: Record<string, string>,
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(
    "git",
    ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args],
    {
      cwd: dir,
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: os.devNull,
        ...extraEnv,
      },
    },
  );
}

afterEach(async () => {
  for (const dir of tempDirs) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors in test teardown
    }
  }
  tempDirs.length = 0;
});

describe("readGitOutcome", () => {
  it("counts commits, merges, reverts, files, insertions, and deletions inside the window and excludes outside", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);
    await runGit(dir, ["checkout", "-b", "main"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    // Commit 1: outside window (before)
    await fs.writeFile(
      path.join(dir, "before.txt"),
      "before-line1\nbefore-line2\n",
      "utf8",
    );
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "commit outside before"], {
      GIT_AUTHOR_DATE: "2026-11-01T08:00:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T08:00:00Z",
    });

    // Commit 2: inside window - add file-a.txt (+3) and file-b.txt (+2)
    await fs.writeFile(
      path.join(dir, "file-a.txt"),
      "lineA1\nlineA2\nlineA3\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(dir, "file-b.txt"),
      "lineB1\nlineB2\n",
      "utf8",
    );
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "commit inside 1"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:15:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:15:00Z",
    });

    // Commit 3: inside window - update file-a.txt (+2, -1) and add file-c.txt (+2)
    await fs.writeFile(
      path.join(dir, "file-a.txt"),
      "lineA1\nlineA2_edited\nlineA3\nlineA4\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(dir, "file-c.txt"),
      "lineC1\nlineC2\n",
      "utf8",
    );
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "commit inside 2"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:30:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:30:00Z",
    });

    // Commit 4: inside window - revert commit 2 (subject starts with Revert ")
    await fs.rm(path.join(dir, "file-c.txt"));
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", 'Revert "commit inside 2"'], {
      GIT_AUTHOR_DATE: "2026-11-01T10:45:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:45:00Z",
    });

    // Commit 5 & 6: inside window - side branch and merge commit
    await runGit(dir, ["checkout", "-b", "feat-branch"]);
    await fs.writeFile(path.join(dir, "feat.txt"), "feat1\nfeat2\n", "utf8");
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "feature commit"], {
      GIT_AUTHOR_DATE: "2026-11-01T11:00:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T11:00:00Z",
    });

    await runGit(dir, ["checkout", "main"]);
    await runGit(
      dir,
      ["merge", "--no-ff", "-m", "Merge branch 'feat-branch'", "feat-branch"],
      {
        GIT_AUTHOR_DATE: "2026-11-01T11:15:00Z",
        GIT_COMMITTER_DATE: "2026-11-01T11:15:00Z",
      },
    );

    // Commit 7: outside window (after)
    await fs.writeFile(
      path.join(dir, "after.txt"),
      "after1\nafter2\nafter3\n",
      "utf8",
    );
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "commit outside after"], {
      GIT_AUTHOR_DATE: "2026-11-01T14:00:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T14:00:00Z",
    });

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    if (outcome.source !== "git") return;

    expect(outcome.branch).toBe("main");
    expect(outcome.windowFrom).toBe(from);
    expect(outcome.windowTo).toBe(to);
    expect(outcome.commits).toBe(5);
    expect(outcome.mergeCommits).toBe(1);
    expect(outcome.revertCommits).toBe(1);
    expect(outcome.filesChanged).toBe(4); // file-a.txt, file-b.txt, file-c.txt, feat.txt
    expect(outcome.insertions).toBe(11); // 5 (commit 2) + 4 (commit 3) + 0 (revert) + 2 (feat)
    expect(outcome.deletions).toBe(3); // 0 + 1 (commit 3) + 2 (revert) + 0 (feat)
  });

  it("counts revert commits when subject starts with 'Revert ' without quotes", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);
    await runGit(dir, ["checkout", "-b", "main"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    await fs.writeFile(path.join(dir, "f.txt"), "hello\n", "utf8");
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "initial"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:10:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:10:00Z",
    });

    await fs.writeFile(path.join(dir, "f.txt"), "world\n", "utf8");
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "Revert unquoted previous change"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:20:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:20:00Z",
    });

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    if (outcome.source !== "git") return;

    expect(outcome.revertCommits).toBe(1);
    expect(outcome.commits).toBe(2);
  });

  it("returns branch null when HEAD is detached", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);
    await runGit(dir, ["checkout", "-b", "main"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    await fs.writeFile(path.join(dir, "file.txt"), "content\n", "utf8");
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "test commit"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:30:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:30:00Z",
    });

    await runGit(dir, ["checkout", "--detach"]);

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    if (outcome.source !== "git") return;

    expect(outcome.branch).toBeNull();
  });

  it("sanitizes irregular branch names to branch-<sha256:8>", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    await fs.writeFile(path.join(dir, "f.txt"), "content\n", "utf8");
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "init"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:10:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:10:00Z",
    });

    const irregularBranch = "feat@special#name";
    await runGit(dir, ["checkout", "-b", irregularBranch]);

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    if (outcome.source !== "git") return;

    const expectedHash8 = crypto
      .createHash("sha256")
      .update(irregularBranch)
      .digest("hex")
      .slice(0, 8);
    expect(outcome.branch).toBe(`branch-${expectedHash8}`);
  });

  it("sanitizes branch names exceeding 100 characters to branch-<sha256:8>", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    await fs.writeFile(path.join(dir, "f.txt"), "content\n", "utf8");
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "init"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:10:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:10:00Z",
    });

    const longBranch = "b".repeat(101);
    await runGit(dir, ["checkout", "-b", longBranch]);

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    if (outcome.source !== "git") return;

    const expectedHash8 = crypto
      .createHash("sha256")
      .update(longBranch)
      .digest("hex")
      .slice(0, 8);
    expect(outcome.branch).toBe(`branch-${expectedHash8}`);
  });

  it("returns not-a-repo when the target directory is not a git repository", async () => {
    const dir = await createTempDir();
    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome).toEqual({ source: "unavailable", reason: "not-a-repo" });
  });

  it("returns folder-missing when directory does not exist or is a regular file", async () => {
    const dir = await createTempDir();
    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";
    const ac = new AbortController();

    const missingPath = path.join(dir, "non-existent-subfolder");
    const missingOutcome = await readGitOutcome(
      { cwd: missingPath, from, to },
      ac.signal,
    );
    expect(missingOutcome).toEqual({
      source: "unavailable",
      reason: "folder-missing",
    });

    const regularFile = path.join(dir, "regular-file.txt");
    await fs.writeFile(regularFile, "not a directory", "utf8");
    const fileOutcome = await readGitOutcome(
      { cwd: regularFile, from, to },
      ac.signal,
    );
    expect(fileOutcome).toEqual({
      source: "unavailable",
      reason: "folder-missing",
    });
  });

  it("returns not-measured for relative paths, non-strings, oversized paths, NUL characters, or invalid window timestamps", async () => {
    const validTime = "2026-11-01T10:00:00Z";
    const ac = new AbortController();

    // relative path
    const resRelative = await readGitOutcome(
      { cwd: "relative/path", from: validTime, to: validTime },
      ac.signal,
    );
    expect(resRelative).toEqual({
      source: "unavailable",
      reason: "not-measured",
    });

    // non-string / null cwd
    const resNull = await readGitOutcome(
      { cwd: null, from: validTime, to: validTime },
      ac.signal,
    );
    expect(resNull).toEqual({
      source: "unavailable",
      reason: "not-measured",
    });

    // oversized cwd (> 1024 characters)
    const longCwd = "/" + "a".repeat(1025);
    const resLong = await readGitOutcome(
      { cwd: longCwd, from: validTime, to: validTime },
      ac.signal,
    );
    expect(resLong).toEqual({
      source: "unavailable",
      reason: "not-measured",
    });

    // cwd containing NUL
    const resNul = await readGitOutcome(
      { cwd: "/tmp/test\0bad", from: validTime, to: validTime },
      ac.signal,
    );
    expect(resNul).toEqual({
      source: "unavailable",
      reason: "not-measured",
    });

    // invalid from timestamp format
    const resBadFrom = await readGitOutcome(
      { cwd: os.tmpdir(), from: "invalid-timestamp", to: validTime },
      ac.signal,
    );
    expect(resBadFrom).toEqual({
      source: "unavailable",
      reason: "not-measured",
    });

    // from timestamp without Z (offset)
    const resOffsetFrom = await readGitOutcome(
      {
        cwd: os.tmpdir(),
        from: "2026-11-01T10:00:00+00:00",
        to: validTime,
      },
      ac.signal,
    );
    expect(resOffsetFrom).toEqual({
      source: "unavailable",
      reason: "not-measured",
    });

    // invalid to timestamp format
    const resBadTo = await readGitOutcome(
      { cwd: os.tmpdir(), from: validTime, to: "2026-11-01" },
      ac.signal,
    );
    expect(resBadTo).toEqual({
      source: "unavailable",
      reason: "not-measured",
    });
  });

  it("never includes commit subjects, file paths, or commit hashes in returned output", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);
    await runGit(dir, ["checkout", "-b", "main"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    const secretSubject = "TOP_SECRET_PROD_DATABASE_KEY_REDACTED";
    const secretPath = "secrets/database_credentials_internal.key";

    await fs.mkdir(path.join(dir, "secrets"), { recursive: true });
    await fs.writeFile(
      path.join(dir, secretPath),
      "super_secret_payload\n",
      "utf8",
    );
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", secretSubject], {
      GIT_AUTHOR_DATE: "2026-11-01T10:30:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:30:00Z",
    });

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    const jsonString = JSON.stringify(outcome);

    expect(jsonString).not.toContain("TOP_SECRET");
    expect(jsonString).not.toContain("DATABASE_KEY");
    expect(jsonString).not.toContain("REDACTED");
    expect(jsonString).not.toContain("database_credentials_internal");
    expect(jsonString).not.toContain("secrets");

    const returnedKeys = Object.keys(outcome).sort();
    const expectedKeys = [
      "branch",
      "commits",
      "deletions",
      "filesChanged",
      "insertions",
      "mergeCommits",
      "revertCommits",
      "source",
      "windowFrom",
      "windowTo",
    ].sort();

    expect(returnedKeys).toEqual(expectedKeys);
  });

  it("SECURITY: hostile core.fsmonitor and core.hooksPath configuration must not execute marker scripts", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);
    await runGit(dir, ["checkout", "-b", "main"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    await fs.writeFile(path.join(dir, "code.txt"), "sample\n", "utf8");
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "initial commit"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:15:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:15:00Z",
    });

    const markerFsmonitor = path.join(dir, "hostile-marker-fsmonitor.txt");
    const markerHook = path.join(dir, "hostile-marker-hook.txt");

    // Configure hostile core.fsmonitor script
    const fsmonitorScriptPath = path.join(
      dir,
      process.platform === "win32" ? "fsmonitor.bat" : "fsmonitor.sh",
    );
    const fsmonitorScriptContent =
      process.platform === "win32"
        ? `@echo off\r\necho hostile > "${markerFsmonitor}"\r\n`
        : `#!/bin/sh\ntouch "${markerFsmonitor}"\n`;

    await fs.writeFile(fsmonitorScriptPath, fsmonitorScriptContent, "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(fsmonitorScriptPath, 0o755);
    }
    await runGit(dir, ["config", "core.fsmonitor", fsmonitorScriptPath]);

    // Configure hostile hook directory
    const hooksDir = path.join(dir, ".git", "hooks");
    await fs.mkdir(hooksDir, { recursive: true });
    const hookScriptPath = path.join(
      hooksDir,
      process.platform === "win32" ? "post-checkout.bat" : "post-checkout",
    );
    const hookScriptContent =
      process.platform === "win32"
        ? `@echo off\r\necho hook > "${markerHook}"\r\n`
        : `#!/bin/sh\ntouch "${markerHook}"\n`;

    await fs.writeFile(hookScriptPath, hookScriptContent, "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(hookScriptPath, 0o755);
    }
    await runGit(dir, ["config", "core.hooksPath", hooksDir]);

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    if (outcome.source !== "git") return;

    expect(outcome.commits).toBe(1);

    // Hostile commands must NOT have been executed
    let fsmonitorMarkerExists = false;
    try {
      await fs.access(markerFsmonitor);
      fsmonitorMarkerExists = true;
    } catch {
      fsmonitorMarkerExists = false;
    }
    expect(fsmonitorMarkerExists).toBe(false);

    let hookMarkerExists = false;
    try {
      await fs.access(markerHook);
      hookMarkerExists = true;
    } catch {
      hookMarkerExists = false;
    }
    expect(hookMarkerExists).toBe(false);
  });

  it("returns git-error when signal is aborted", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    const ac = new AbortController();
    ac.abort();

    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);
    expect(outcome).toEqual({ source: "unavailable", reason: "git-error" });
  });

  it.skipIf(process.platform === "win32")(
    "returns git-error when POSIX directory is not owned by current user",
    async () => {
      const dir = await createTempDir();
      await runGit(dir, ["init"]);

      const from = "2026-11-01T10:00:00Z";
      const to = "2026-11-01T12:00:00Z";

      const currentUid =
        typeof process.getuid === "function" ? process.getuid() : 1000;
      const spy = vi
        .spyOn(process, "getuid")
        .mockReturnValue(currentUid + 9999);

      try {
        const ac = new AbortController();
        const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);
        expect(outcome).toEqual({ source: "unavailable", reason: "git-error" });
      } finally {
        spy.mockRestore();
      }
    },
  );

  it("counts binary file changes in filesChanged without NaN in insertions or deletions", async () => {
    const dir = await createTempDir();
    await runGit(dir, ["init"]);
    await runGit(dir, ["checkout", "-b", "main"]);

    const from = "2026-11-01T10:00:00Z";
    const to = "2026-11-01T12:00:00Z";

    // Initial binary file
    const binaryBuffer1 = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    await fs.writeFile(path.join(dir, "binary.dat"), binaryBuffer1);
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "initial binary"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:10:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:10:00Z",
    });

    // Modify binary file
    const binaryBuffer2 = Buffer.from([0x00, 0x05, 0x06, 0x07, 0x08]);
    await fs.writeFile(path.join(dir, "binary.dat"), binaryBuffer2);
    await runGit(dir, ["add", "."]);
    await runGit(dir, ["commit", "-m", "modify binary"], {
      GIT_AUTHOR_DATE: "2026-11-01T10:20:00Z",
      GIT_COMMITTER_DATE: "2026-11-01T10:20:00Z",
    });

    const ac = new AbortController();
    const outcome = await readGitOutcome({ cwd: dir, from, to }, ac.signal);

    expect(outcome.source).toBe("git");
    if (outcome.source !== "git") return;

    expect(outcome.commits).toBe(2);
    expect(outcome.filesChanged).toBe(1);
    expect(Number.isNaN(outcome.insertions)).toBe(false);
    expect(Number.isNaN(outcome.deletions)).toBe(false);
  });
});
