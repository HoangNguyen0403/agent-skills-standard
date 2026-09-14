import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SessionTracker } from "./SessionTracker";

/** One session, one line in the local telemetry log. Contains counts only. */
export interface TelemetryRecord {
  at: string;
  mcpVersion: string;
  sessionStartedAt: string;
  durationSeconds: number;
  /** sha256(projectRoot) first 12 hex chars; lets one log cover many projects without naming them. */
  projectHash: string;
  /** Loads per `category/id`, deduped stub returns included. */
  skills: Record<string, number>;
  /** Loads per `workflow/name`. */
  workflows: Record<string, number>;
  callsByTool: Record<string, number>;
  noMatchCalls: number;
}

interface RecordMeta {
  mcpVersion: string;
  projectRoot: string;
  now?: Date;
}

/** Folds a session's load events into counts. Never includes inputs or paths. */
export function buildTelemetryRecord(
  tracker: SessionTracker,
  meta: RecordMeta,
): TelemetryRecord {
  const now = meta.now ?? new Date();
  const skills: Record<string, number> = {};
  const workflows: Record<string, number> = {};
  for (const event of tracker.events_()) {
    for (const key of event.loaded) {
      const bucket = key.startsWith("workflow/") ? workflows : skills;
      bucket[key] = (bucket[key] ?? 0) + 1;
    }
  }
  const summary = tracker.summary(now);
  return {
    at: now.toISOString(),
    mcpVersion: meta.mcpVersion,
    sessionStartedAt: summary.startedAt,
    durationSeconds: summary.elapsedSeconds,
    projectHash: createHash("sha256")
      .update(meta.projectRoot)
      .digest("hex")
      .slice(0, 12),
    skills,
    workflows,
    callsByTool: { ...summary.callsByTool },
    noMatchCalls: summary.noMatchCalls,
  };
}

interface WriterOptions {
  enabled: boolean;
  filePath: string;
  /** Print failures to stderr; default false. */
  debug?: boolean;
}

/** Appends telemetry records to a local JSONL file. Synchronous so it works from process exit hooks. */
export class TelemetryWriter {
  private readonly enabled: boolean;
  private readonly filePath: string;
  private readonly debug: boolean;

  constructor(options: WriterOptions) {
    this.enabled = options.enabled;
    this.filePath = options.filePath;
    this.debug = options.debug ?? false;
  }

  /** Writes one line. Returns false (never throws) when disabled or on any I/O error. */
  flush(record: TelemetryRecord): boolean {
    if (!this.enabled) return false;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
      return true;
    } catch (error) {
      if (this.debug) {
        process.stderr.write(
          `[ags-mcp] telemetry write failed: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }
      return false;
    }
  }
}
