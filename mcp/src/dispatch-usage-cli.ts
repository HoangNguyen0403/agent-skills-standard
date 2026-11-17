#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  adapterForHost,
  appendDispatchEvents,
  lockTimeoutFromEnvironment,
  planDispatchUsage,
  type AppendResult,
  type DispatchUsagePlan,
  type ImportOptions,
} from "./services/DispatchUsage";

/**
 * `ags-mcp-dispatch-usage` (SRS-007 importer, SRS-009 lock, SRS-010 boundary).
 *
 * Exit codes: 0 ok (including a replay no-op), 1 validation/conflict/lock
 * failure, 2 usage error. Diagnostics carry fixed codes and event ids only: an
 * input path, title or prompt never reaches stdout or stderr.
 */

export class UsageError extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function utcBoundary(value: string, flag: string): string {
  if (!DATE.test(value))
    throw new UsageError(`${flag} must be a UTC date (YYYY-MM-DD)`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    !parsed.toISOString().startsWith(value)
  ) {
    throw new UsageError(`${flag} must be a real calendar date`);
  }
  return parsed.toISOString();
}

function parseLockTimeout(value: string | undefined): number {
  if (value === undefined) return lockTimeoutFromEnvironment();
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new UsageError(
      "--lock-timeout-ms must be a non-negative number of milliseconds",
    );
  }
  return parsed;
}

export interface CliResult {
  output: string;
  write?: AppendResult;
}

export async function runDispatchUsageCli(
  args: string[] = process.argv.slice(2),
  currentTime: string = new Date().toISOString(),
): Promise<CliResult> {
  let values: {
    observations?: string;
    from?: string;
    to?: string;
    host?: string;
    "paseo-home"?: string;
    write: boolean;
    "lock-timeout-ms"?: string;
  };
  try {
    ({ values } = parseArgs({
      args,
      options: {
        observations: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        host: { type: "string" },
        "paseo-home": { type: "string" },
        write: { type: "boolean", default: false },
        "lock-timeout-ms": { type: "string" },
      },
      allowPositionals: false,
      strict: true,
    }));
  } catch {
    throw new UsageError(
      "Usage: ags-mcp-dispatch-usage --observations <file> --from <date> --to <date> --host <adapter> [--paseo-home <dir>] [--write] [--lock-timeout-ms <ms>]",
    );
  }
  const missing = ["observations", "from", "to", "host"].filter(
    (key) => values[key as keyof typeof values] === undefined,
  );
  if (missing.length > 0) {
    throw new UsageError(
      `Missing required flag(s): ${missing.map((key) => `--${key}`).join(", ")}`,
    );
  }
  const from = utcBoundary(values.from ?? "", "--from");
  const to = utcBoundary(values.to ?? "", "--to");
  if (Date.parse(from) >= Date.parse(to)) {
    throw new UsageError("--from must be strictly before --to");
  }
  const observationsPath = values.observations ?? "";
  const host = values.host ?? "";
  const options: ImportOptions = {
    observationsPath,
    from,
    to,
    host,
    now: currentTime,
    adapter: adapterForHost(host, values["paseo-home"]),
    ...(values["paseo-home"] ? { paseoHome: values["paseo-home"] } : {}),
  };

  const plan: DispatchUsagePlan = await planDispatchUsage(options);
  const events = [...plan.events, ...plan.inventory];
  if (!values.write) {
    return {
      output: JSON.stringify(
        {
          mode: "dry-run",
          window: { from, to },
          events,
          unattributed: plan.unattributed,
          limitations: plan.limitations,
        },
        null,
        2,
      ),
    };
  }
  const write = await appendDispatchEvents(observationsPath, events, {
    lockTimeoutMs: parseLockTimeout(values["lock-timeout-ms"]),
  });
  return {
    output: JSON.stringify(
      {
        mode: "write",
        window: { from, to },
        written: write.written,
        skipped: write.skipped,
        unattributed: plan.unattributed,
        limitations: plan.limitations,
      },
      null,
      2,
    ),
    write,
  };
}

async function main(): Promise<void> {
  try {
    const { output } = await runDispatchUsageCli();
    process.stdout.write(`${output}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 2;
      return;
    }
    // Fixed codes only: a filesystem error can carry a path.
    const message = error instanceof Error ? error.message : "";
    process.stderr.write(
      `${/^[a-z-]+: [^\n]*$/.test(message) ? message : "dispatch-usage-failed: no diagnostic is available without exposing input contents"}\n`,
    );
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
