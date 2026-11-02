#!/usr/bin/env node
/**
 * Local, human-invoked retrospective CLI.
 * Boundary rules enforced here:
 * - stdout carries only a minimal machine receipt;
 *   it never carries report text, titles, excerpts or diagnostics.
 * - Consent is interactive and typed in a terminal. It is not
 *   authentication: an agent must never supply it on your behalf.
 * - Failures print a stable code only — never a filesystem message,
 *   a stack trace or file content.
 */
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { parseArgs } from "node:util";
import {
  CONSENT_TEXT,
  CONSENT_TEXT_VERSION,
  consentFilePath,
  readConsent,
  removeConsent,
  writeConsent,
  type ConsentRecord,
} from "./retrospective/consent";
import { RetrospectiveError } from "./retrospective/errors";
import { StoreError } from "./retrospective/store";
import { lstatOrNull } from "./retrospective/platform-private";
import {
  collectIndex,
  parseIndexQuery,
  renderIndexHtml,
  writeIndex,
} from "./retrospective/index-report";

const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_USAGE = 2;

const MAX_ARGV = 24;
const MAX_ARG_CHARS = 4_096;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

export const USAGE = [
  "agent-skills-standard-mcp retrospective — local session retrospective (no model calls, no outbound requests).",
  "",
  "Usage:",
  "  agent-skills-standard-mcp retrospective enable [--store-root <absolute>] [--source-root <absolute>]...",
  "  agent-skills-standard-mcp retrospective disable",
  "  agent-skills-standard-mcp retrospective index [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--folder NAME]",
  "  agent-skills-standard-mcp retrospective consent-status",
  "",
  "Invoking `ags retrospective <cmd>` runs the same commands through the CLI.",
  "This tool is for a human at a terminal. Consent flags are attestations, not",
  "authentication: an agent must never supply them on your behalf. This tool is",
  "human-facing and must not be invoked automatically from a hosted tool result.",
  "",
  "Exit codes: 0 complete or explicitly partial publication, 1 failure or refusal,",
  "2 usage error.",
].join("\n");

type Command = "enable" | "disable" | "consent-status" | "index";

const COMMANDS: readonly Command[] = [
  "enable",
  "disable",
  "consent-status",
  "index",
];

const OPTIONS = {
  help: { type: "boolean", short: "h" },
  "store-root": { type: "string" },
  "source-root": { type: "string", multiple: true },
  since: { type: "string" },
  until: { type: "string" },
  folder: { type: "string" },
} as const;

type ValueKey = keyof typeof OPTIONS;
type Values = { [K in ValueKey]?: string | boolean | string[] };

/** A flag is accepted only by the command that documents it. */
const ALLOWED: Record<Command, readonly ValueKey[]> = {
  enable: ["store-root", "source-root", "help"],
  disable: ["help"],
  "consent-status": ["help"],
  index: ["since", "until", "folder", "help"],
};

class UsageError extends Error {}

class Refusal extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "Refusal";
  }
}

type Invocation = { command: Command | null; values: Values };

export type CliOutcome = { code: number; stdout: string; stderr: string };
export type CliIo = {
  isTTY: boolean;
  ask: (question: string) => Promise<string>;
  write: (text: string) => void;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  home?: string;
};

function parseInvocation(argv: readonly string[]): Invocation {
  if (argv.length > MAX_ARGV) throw new UsageError("Too many arguments.");
  for (const arg of argv) {
    if (arg.length > MAX_ARG_CHARS)
      throw new UsageError("An argument is too long.");
    if (arg.includes("\0")) throw new UsageError("An argument is not valid.");
  }
  let parsed: { values: unknown; positionals: string[] };
  try {
    parsed = parseArgs({
      args: [...argv],
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });
  } catch {
    // The parser's own message may quote caller-supplied text, so it is dropped.
    throw new UsageError("Invalid arguments.");
  }
  const values = parsed.values as Values;
  if (values.help === true) return { command: null, values: {} };
  const [command, ...rest] = parsed.positionals;
  if (command === undefined) throw new UsageError("A command is required.");
  if (rest.length > 0) throw new UsageError("Unexpected extra arguments.");
  if (!COMMANDS.includes(command as Command))
    throw new UsageError("Unknown command.");
  const allowed = ALLOWED[command as Command];
  for (const key of Object.keys(values) as ValueKey[]) {
    if (key === "help") continue;
    if (!allowed.includes(key))
      throw new UsageError(`Option --${key} is not valid for ${command}.`);
  }
  return { command: command as Command, values };
}

async function runEnable(
  values: Values,
  io: CliIo,
): Promise<{ schemaVersion: 1; enabled: true }> {
  if (!io.isTTY) throw new Refusal("TTY_REQUIRED");

  const home = io.home ?? os.homedir();

  let storeRoot: string;
  const rawStoreRoot = values["store-root"];
  if (rawStoreRoot !== undefined) {
    if (typeof rawStoreRoot !== "string" || !path.isAbsolute(rawStoreRoot)) {
      throw new UsageError("--store-root must be an absolute path.");
    }
    storeRoot = path.normalize(rawStoreRoot);
  } else {
    storeRoot = path.normalize(path.join(home, "ags", "diagnostics"));
  }

  let allowedSourceRoots: string[];
  const rawSourceRoots = values["source-root"];
  if (rawSourceRoots !== undefined) {
    if (!Array.isArray(rawSourceRoots) || rawSourceRoots.length === 0) {
      throw new UsageError("--source-root requires at least one path.");
    }
    for (const root of rawSourceRoots) {
      if (typeof root !== "string" || !path.isAbsolute(root)) {
        throw new UsageError(`--source-root must be an absolute path: ${root}`);
      }
      const stats = await lstatOrNull(root);
      if (!stats) {
        throw new UsageError(`Source root does not exist: ${root}`);
      }
    }
    allowedSourceRoots = Array.from(
      new Set(rawSourceRoots.map((r) => path.normalize(r))),
    );
    if (allowedSourceRoots.length === 0) {
      throw new Refusal("NO_SOURCE_ROOTS");
    }
  } else {
    const candidateRoots = [
      path.join(home, ".omp", "agent", "sessions"),
      path.join(home, ".codex", "sessions"),
    ];
    const existingRoots: string[] = [];
    for (const cand of candidateRoots) {
      const stats = await lstatOrNull(cand);
      if (stats) {
        existingRoots.push(path.normalize(cand));
      }
    }
    if (existingRoots.length === 0) {
      throw new Refusal("NO_SOURCE_ROOTS");
    }
    allowedSourceRoots = Array.from(new Set(existingRoots));
  }

  const promptText = [
    CONSENT_TEXT,
    "",
    `Store root: ${storeRoot}`,
    "Allowed source roots:",
    ...allowedSourceRoots.map((root) => `  - ${root}`),
    "",
    'Type "yes" to enable: ',
  ].join("\n");

  io.write(promptText);
  const answer = await io.ask('Type "yes" to enable: ');
  if (answer.trim() !== "yes") {
    throw new Refusal("CONSENT_DECLINED");
  }

  const record: ConsentRecord = {
    schemaVersion: 1,
    consentTextVersion: CONSENT_TEXT_VERSION,
    grantedAt: new Date().toISOString(),
    storeRoot,
    allowedSourceRoots,
    storageRiskAcknowledged: true,
  };

  const targetPath = consentFilePath(io.env, io.platform, io.home);
  await writeConsent(record, targetPath);
  return { schemaVersion: 1, enabled: true };
}

async function runDisable(
  io: CliIo,
): Promise<{ schemaVersion: 1; enabled: false; removed: boolean }> {
  const targetPath = consentFilePath(io.env, io.platform, io.home);
  const removed = await removeConsent(targetPath);
  return { schemaVersion: 1, enabled: false, removed };
}

async function runConsentStatus(io: CliIo): Promise<
  | {
      schemaVersion: 1;
      state: "enabled";
      storeRoot: string;
      allowedSourceRoots: string[];
    }
  | {
      schemaVersion: 1;
      state: "disabled";
      reason?: string;
    }
> {
  const targetPath = consentFilePath(io.env, io.platform, io.home);
  const consent = await readConsent(targetPath);
  if (consent.state === "enabled") {
    return {
      schemaVersion: 1,
      state: "enabled",
      storeRoot: consent.record.storeRoot,
      allowedSourceRoots: consent.record.allowedSourceRoots,
    };
  }
  return {
    schemaVersion: 1,
    state: "disabled",
    reason: consent.reason,
  };
}

async function runIndex(values: Values, io: CliIo): Promise<unknown> {
  const parsed = parseIndexQuery(
    {
      since: values.since,
      until: values.until,
      folder: values.folder,
    },
    new Date(),
  );
  if (!parsed.ok) {
    throw new Refusal(parsed.code);
  }

  const targetPath = consentFilePath(io.env, io.platform, io.home);
  const consent = await readConsent(targetPath);
  if (consent.state !== "enabled") {
    return {
      schemaVersion: 1,
      state: "disabled",
      reason: consent.reason,
    };
  }

  const result = await collectIndex(consent.record.storeRoot, parsed.query);
  const html = renderIndexHtml(result);
  const absolutePath = await writeIndex(consent.record.storeRoot, html);

  return {
    schemaVersion: 1,
    state: "written",
    path: absolutePath,
    sessions: result.rows.length,
    omitted: result.omitted,
    unreadable: result.unreadable,
    since: result.query.since,
    until: result.query.until,
  };
}

async function dispatch(invocation: Invocation, io: CliIo): Promise<unknown> {
  switch (invocation.command) {
    case "enable":
      return runEnable(invocation.values, io);
    case "disable":
      return runDisable(io);
    case "consent-status":
      return runConsentStatus(io);
    case "index":
      return runIndex(invocation.values, io);
    default:
      throw new UsageError("A command is required.");
  }
}

function refusalCode(error: unknown): string {
  const code =
    error instanceof Refusal ||
    error instanceof StoreError ||
    error instanceof RetrospectiveError
      ? error.code
      : null;
  return code !== null && SAFE_CODE.test(code) ? code : "FAILED";
}

function usageOutcome(message?: string): CliOutcome {
  const prefix = message === undefined ? "" : `${message}\n\n`;
  return { code: EXIT_USAGE, stdout: "", stderr: `${prefix}${USAGE}\n` };
}

/**
 * Pure-ish entry: returns the intended streams and exit code instead of
 * writing them, so a parent process can assert exact output.
 */
export async function runRetrospectiveCli(
  argv: readonly string[] = process.argv.slice(2),
  io?: CliIo,
): Promise<CliOutcome> {
  const effectiveIo: CliIo = {
    isTTY: io?.isTTY ?? Boolean(process.stdin.isTTY && process.stdout.isTTY),
    ask: io?.ask ?? (async () => ""),
    write: io?.write ?? (() => {}),
    env: io?.env ?? process.env,
    platform: io?.platform ?? process.platform,
    home: io?.home ?? os.homedir(),
  };
  let invocation: Invocation;
  try {
    invocation = parseInvocation(argv);
  } catch (error) {
    return usageOutcome(
      error instanceof UsageError ? error.message : "Invalid arguments.",
    );
  }
  if (invocation.command === null)
    return { code: EXIT_OK, stdout: `${USAGE}\n`, stderr: "" };
  try {
    const payload = await dispatch(invocation, effectiveIo);
    return {
      code: EXIT_OK,
      stdout: `${JSON.stringify(payload)}\n`,
      stderr: "",
    };
  } catch (error) {
    if (error instanceof UsageError) return usageOutcome(error.message);
    return {
      code: EXIT_REFUSED,
      stdout: "",
      stderr: `${JSON.stringify({
        schemaVersion: 1,
        error: { code: refusalCode(error) },
      })}\n`,
    };
  }
}

export function isRetrospectiveInvocation(argv: readonly string[]): boolean {
  return argv[2] === "retrospective";
}

export async function runRetrospectiveCliFromProcess(
  argv: readonly string[] = process.argv.slice(3),
): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
  });
  const io: CliIo = {
    isTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    ask: (question: string) =>
      new Promise<string>((resolve, reject) => {
        let answered = false;
        rl.question(question, (answer) => {
          answered = true;
          resolve(answer);
        });
        rl.once("close", () => {
          if (!answered) {
            reject(new Refusal("CONSENT_DECLINED"));
          }
        });
      }),
    write: (text: string) => {
      process.stderr.write(text);
    },
    env: process.env,
    platform: process.platform,
    home: os.homedir(),
  };
  try {
    const outcome = await runRetrospectiveCli(argv, io);
    if (outcome.stdout !== "") process.stdout.write(outcome.stdout);
    if (outcome.stderr !== "") process.stderr.write(outcome.stderr);
    process.exitCode = outcome.code;
    return outcome.code;
  } finally {
    rl.close();
  }
}
