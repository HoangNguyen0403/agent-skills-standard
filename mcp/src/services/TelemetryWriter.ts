import fs from "node:fs";
import path from "node:path";
import type { SessionTracker } from "./SessionTracker";

/** One session, one line in the local telemetry log. Contains counts only. */
export interface TelemetryRecord {
  /** ISO timestamp when the record was built (flush time). */
  at: string;
  /** MCP server version that produced this record. */
  mcpVersion: string;
  /** ISO timestamp when the session started. */
  sessionStartedAt: string;
  /** Session length in seconds, measured from `sessionStartedAt` to `at`. */
  durationSeconds: number;
  /** Loads per `category/id`, deduped stub returns included. */
  skills: Record<string, number>;
  /** Loads per `workflow/name`. */
  workflows: Record<string, number>;
  /** Loads of category guides / listings per `category/<name>`. */
  categories: Record<string, number>;
  /** Tool call counts, keyed by tool name. */
  callsByTool: Record<string, number>;
  /** Count of tool calls that matched no skill, workflow, or category. */
  noMatchCalls: number;
}

interface RecordMeta {
  mcpVersion: string;
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
  const categories: Record<string, number> = {};
  for (const event of tracker.events_()) {
    for (const key of event.loaded) {
      const bucket = key.startsWith("workflow/")
        ? workflows
        : key.startsWith("category/")
          ? categories
          : skills;
      bucket[key] = (bucket[key] ?? 0) + 1;
    }
  }
  const summary = tracker.summary(now);
  return {
    at: now.toISOString(),
    mcpVersion: meta.mcpVersion,
    sessionStartedAt: summary.startedAt,
    durationSeconds: summary.elapsedSeconds,
    skills,
    workflows,
    categories,
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
