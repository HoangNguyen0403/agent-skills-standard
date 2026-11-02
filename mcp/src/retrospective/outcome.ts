import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { LedgerOutcome } from "./ledger";

const execFileAsync = promisify(execFile);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const BRANCH_CLEAN_REGEX = /^[A-Za-z0-9._/-]{1,100}$/;
const MAX_CWD_LENGTH = 1024;
const MAX_CHANGED_PATHS = 100000;

function getErrorCode(err: unknown): string | number | null {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = Reflect.get(err, "code");
    if (typeof code === "string" || typeof code === "number") {
      return code;
    }
  }
  return null;
}

function isAbortError(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    if ("name" in err && Reflect.get(err, "name") === "AbortError") {
      return true;
    }
    if ("code" in err && Reflect.get(err, "code") === "ABORT_ERR") {
      return true;
    }
  }
  return false;
}

function isTimeoutOrKilled(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    if ("killed" in err && Reflect.get(err, "killed") === true) {
      return true;
    }
    const code = getErrorCode(err);
    if (code === "ETIMEDOUT" || code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
      return true;
    }
  }
  return false;
}

function buildGitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: os.devNull,
    LC_ALL: "C",
  };
  const pathVal = process.env.PATH ?? process.env.Path;
  if (typeof pathVal === "string") {
    env.PATH = pathVal;
  }
  if (
    process.platform === "win32" &&
    typeof process.env.SystemRoot === "string"
  ) {
    env.SystemRoot = process.env.SystemRoot;
  }
  return env;
}

/**
 * Reads git outcome metrics for the given working folder and time window.
 *
 * Commits are counted across ALL branches of the repository in the session window
 * and may include other work; the branch is the CURRENT branch at report time,
 * not necessarily the session's.
 */
export async function readGitOutcome(
  input: { cwd: string | null; from: string; to: string },
  signal: AbortSignal,
): Promise<LedgerOutcome> {
  try {
    if (
      !input ||
      typeof input !== "object" ||
      typeof input.cwd !== "string" ||
      !path.isAbsolute(input.cwd) ||
      input.cwd.length > MAX_CWD_LENGTH ||
      input.cwd.includes("\0") ||
      typeof input.from !== "string" ||
      typeof input.to !== "string" ||
      !ISO_DATE_REGEX.test(input.from) ||
      !ISO_DATE_REGEX.test(input.to)
    ) {
      return { source: "unavailable", reason: "not-measured" };
    }

    if (signal.aborted) {
      return { source: "unavailable", reason: "git-error" };
    }

    let realCwd: string;
    let isDir = false;
    let fileUid: number | null = null;

    try {
      realCwd = await fsPromises.realpath(input.cwd);
      const st = await fsPromises.stat(realCwd);
      isDir = st.isDirectory();
      fileUid = st.uid;
    } catch {
      if (signal.aborted) {
        return { source: "unavailable", reason: "git-error" };
      }
      return { source: "unavailable", reason: "folder-missing" };
    }

    if (signal.aborted) {
      return { source: "unavailable", reason: "git-error" };
    }

    if (!isDir) {
      return { source: "unavailable", reason: "folder-missing" };
    }

    if (
      process.platform !== "win32" &&
      typeof process.getuid === "function" &&
      fileUid !== null
    ) {
      if (fileUid !== process.getuid()) {
        return { source: "unavailable", reason: "git-error" };
      }
    }

    const baseArgs = [
      "-c",
      "core.fsmonitor=false",
      "-c",
      `core.hooksPath=${os.devNull}`,
      "-c",
      "core.pager=cat",
      "-c",
      "diff.external=",
      "-c",
      "core.untrackedCache=false",
      "-C",
      realCwd,
    ];

    const execOptions = {
      env: buildGitEnv(),
      timeout: 5000,
      maxBuffer: 1048576,
      windowsHide: true,
      signal,
    };

    // Step 1: verify work tree
    let revParseStdout = "";
    try {
      const result = await execFileAsync(
        "git",
        [...baseArgs, "rev-parse", "--is-inside-work-tree"],
        execOptions,
      );
      revParseStdout = result.stdout;
    } catch (err: unknown) {
      if (signal.aborted || isAbortError(err)) {
        return { source: "unavailable", reason: "git-error" };
      }
      if (getErrorCode(err) === "ENOENT" || isTimeoutOrKilled(err)) {
        return { source: "unavailable", reason: "git-error" };
      }
      return { source: "unavailable", reason: "not-a-repo" };
    }

    if (revParseStdout.trim() !== "true") {
      return { source: "unavailable", reason: "not-a-repo" };
    }

    // Step 2: get current branch
    let branch: string | null = null;
    try {
      const result = await execFileAsync(
        "git",
        [...baseArgs, "symbolic-ref", "--short", "-q", "HEAD"],
        execOptions,
      );
      const rawBranch = result.stdout.trim();
      if (BRANCH_CLEAN_REGEX.test(rawBranch)) {
        branch = rawBranch;
      } else {
        const hash8 = createHash("sha256")
          .update(rawBranch)
          .digest("hex")
          .slice(0, 8);
        branch = `branch-${hash8}`;
      }
    } catch (err: unknown) {
      if (signal.aborted || isAbortError(err)) {
        return { source: "unavailable", reason: "git-error" };
      }
      if (getErrorCode(err) === "ENOENT" || isTimeoutOrKilled(err)) {
        return { source: "unavailable", reason: "git-error" };
      }
      const code = getErrorCode(err);
      if (code === 1) {
        branch = null;
      } else {
        return { source: "unavailable", reason: "git-error" };
      }
    }

    // Step 3: log commits and numstat
    let logStdout = "";
    try {
      const result = await execFileAsync(
        "git",
        [
          ...baseArgs,
          "log",
          "--all",
          "--no-ext-diff",
          "--no-textconv",
          "--no-color",
          "--no-renames",
          "--max-count=5000",
          `--since=${input.from}`,
          `--until=${input.to}`,
          "--pretty=format:%x01%H%x09%P%x09%s",
          "--numstat",
        ],
        execOptions,
      );
      logStdout = result.stdout;
    } catch {
      return { source: "unavailable", reason: "git-error" };
    }

    let commits = 0;
    let revertCommits = 0;
    let mergeCommits = 0;
    let insertions = 0;
    let deletions = 0;
    const changedPaths = new Set<string>();

    const lines = logStdout.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("\x01")) {
        commits += 1;
        const tab1 = line.indexOf("\t", 1);
        if (tab1 !== -1) {
          const tab2 = line.indexOf("\t", tab1 + 1);
          const parentsStr =
            tab2 !== -1 ? line.slice(tab1 + 1, tab2) : line.slice(tab1 + 1);
          const subject = tab2 !== -1 ? line.slice(tab2 + 1) : "";

          const trimmedParents = parentsStr.trim();
          if (trimmedParents.length > 0) {
            const parents = trimmedParents.split(/\s+/);
            if (parents.length > 1) {
              mergeCommits += 1;
            }
          }

          if (subject.startsWith('Revert "') || subject.startsWith("Revert ")) {
            revertCommits += 1;
          }
        }
      } else if (line.length > 0) {
        const firstTab = line.indexOf("\t");
        if (firstTab !== -1) {
          const secondTab = line.indexOf("\t", firstTab + 1);
          if (secondTab !== -1) {
            const insStr = line.slice(0, firstTab);
            const delStr = line.slice(firstTab + 1, secondTab);
            const filePath = line.slice(secondTab + 1);

            const ins = insStr === "-" ? 0 : parseInt(insStr, 10);
            const del = delStr === "-" ? 0 : parseInt(delStr, 10);

            if (!Number.isNaN(ins)) {
              insertions += ins;
            }
            if (!Number.isNaN(del)) {
              deletions += del;
            }
            if (filePath.length > 0 && changedPaths.size < MAX_CHANGED_PATHS) {
              changedPaths.add(filePath);
            }
          }
        }
      }
    }

    const filesChanged = changedPaths.size;
    changedPaths.clear();

    return {
      source: "git",
      branch,
      commits,
      revertCommits,
      mergeCommits,
      filesChanged,
      insertions,
      deletions,
      windowFrom: input.from,
      windowTo: input.to,
    };
  } catch {
    return { source: "unavailable", reason: "git-error" };
  }
}
