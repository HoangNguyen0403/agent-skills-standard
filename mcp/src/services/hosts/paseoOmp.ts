import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { HostAdapter, HostBinding } from "../DispatchUsage";

/**
 * Paseo and OMP host adapter (SRS-007 "Host-specific code").
 *
 * Paseo persists one record per agent under `<paseoHome>/agents/<agentId>/*.json`.
 * A record names the agent's transcript (`persistence.nativeHandle`) and the
 * native session identity that transcript must report
 * (`persistence.sessionId`). `createdAt` orders records so the newest record for
 * an agent wins when several exist.
 *
 * Nothing here reads a record's title, prompt or any other free text: resolution
 * returns two reference strings and a path, and a path never reaches output.
 */

interface AgentRecord {
  id: string;
  createdAt: string;
  transcriptPath: string;
  sessionId: string;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordFrom(raw: unknown): AgentRecord | null {
  if (!object(raw) || typeof raw.id !== "string" || !raw.id) return null;
  const persistence = object(raw.persistence) ? raw.persistence : null;
  const transcriptPath = persistence?.nativeHandle;
  const sessionId = persistence?.sessionId;
  if (typeof transcriptPath !== "string" || !transcriptPath) return null;
  if (typeof sessionId !== "string" || !sessionId) return null;
  return {
    id: raw.id,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    transcriptPath,
    sessionId,
  };
}

/** Reads every agent record once; unreadable or incomplete records are skipped. */
function readAgentRecords(paseoHome: string): AgentRecord[] {
  const agentsRoot = path.join(paseoHome, "agents");
  let agentDirectories: string[];
  try {
    agentDirectories = readdirSync(agentsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  const records: AgentRecord[] = [];
  for (const directory of agentDirectories) {
    let files: string[];
    try {
      files = readdirSync(path.join(agentsRoot, directory)).filter((file) =>
        file.endsWith(".json"),
      );
    } catch {
      continue;
    }
    for (const file of files) {
      try {
        const record = recordFrom(
          JSON.parse(
            readFileSync(path.join(agentsRoot, directory, file), "utf8"),
          ),
        );
        if (record) records.push(record);
      } catch {
        continue;
      }
    }
  }
  return records;
}

function newest(records: readonly AgentRecord[]): AgentRecord | null {
  let best: AgentRecord | null = null;
  for (const record of records) {
    if (!best || Date.parse(record.createdAt) >= Date.parse(best.createdAt))
      best = record;
  }
  return best;
}

export function createPaseoOmpAdapter(paseoHome: string): HostAdapter {
  let cached: {
    byId: Map<string, AgentRecord>;
    bySession: Map<string, AgentRecord>;
  } | null = null;
  const load = (): {
    byId: Map<string, AgentRecord>;
    bySession: Map<string, AgentRecord>;
  } => {
    if (cached) return cached;
    const byId = new Map<string, AgentRecord[]>();
    for (const record of readAgentRecords(paseoHome)) {
      byId.set(record.id, [...(byId.get(record.id) ?? []), record]);
    }
    const resolvedById = new Map<string, AgentRecord>();
    for (const [id, records] of byId) {
      const record = newest(records);
      if (record) resolvedById.set(id, record);
    }
    const bySession = new Map<string, AgentRecord>();
    for (const record of resolvedById.values()) {
      if (!bySession.has(record.sessionId))
        bySession.set(record.sessionId, record);
    }
    cached = { byId: resolvedById, bySession };
    return cached;
  };
  return {
    name: "paseo-omp",
    async resolveWorker(dispatchId: string): Promise<HostBinding | null> {
      const record = load().byId.get(dispatchId);
      return record
        ? {
            transcriptPath: record.transcriptPath,
            expectedSessionId: record.sessionId,
          }
        : null;
    },
    async resolveOrchestrator(
      orchestratorRef: string,
    ): Promise<HostBinding | null> {
      // `orchestrator_ref` is the orchestrator's host session id (SRS-001); an
      // agent id is accepted as well, so one registry answers both spellings.
      const loaded = load();
      const record =
        loaded.bySession.get(orchestratorRef) ??
        loaded.byId.get(orchestratorRef);
      return record
        ? {
            transcriptPath: record.transcriptPath,
            expectedSessionId: record.sessionId,
          }
        : null;
    },
  };
}
