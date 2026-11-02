import * as fsp from "node:fs/promises";
import { z } from "zod";
import type { Ledger, LedgerFolder } from "./ledger";
import { listPublished, resolveArtifact, type PublishedEntry } from "./store";

export type SessionRates = {
  session: string | null;
  to: string;
  turns: number;
  costCentsPer100Turns: number | null;
  permissionAnswersPer100TurnsTenths: number | null;
  errorStopsPer100TurnsTenths: number | null;
  toolErrorsPer100CallsTenths: number | null;
  lookupMissPercent: number | null;
  compactionsPer100TurnsTenths: number | null;
  unguardedEditPercent: number | null;
};

export type ReportContext = {
  previous: SessionRates[];
};

export type ComputableLedger = {
  session: string | null;
  claims: ReadonlyArray<{
    template: string;
    values: Record<string, number | string>;
    scope?: { to?: string };
  }>;
  agents: ReadonlyArray<{
    turns?: number;
  }>;
};

const MAX_LEDGER_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB

const looseClaimSchema = z
  .object({
    template: z.string(),
    values: z.record(z.string(), z.union([z.number(), z.string()])),
    scope: z
      .object({
        to: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const looseAgentSchema = z
  .object({
    turns: z.number().optional(),
  })
  .passthrough();

const looseLedgerSchema = z
  .object({
    schemaVersion: z.number(),
    session: z.string().nullable(),
    folder: z
      .object({
        name: z.string(),
        parent: z.string().nullable(),
      })
      .nullable(),
    claims: z.array(looseClaimSchema),
    agents: z.array(looseAgentSchema),
  })
  .passthrough();

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function computeRates(
  ledger: Pick<Ledger, "session" | "claims" | "agents"> | ComputableLedger,
): SessionRates {
  const session = ledger.session ?? null;
  const claims = Array.isArray(ledger.claims) ? ledger.claims : [];
  const claimsByTemplate = new Map(claims.map((c) => [c.template, c]));

  const coverageClaim = claimsByTemplate.get("coverage");
  const to =
    typeof coverageClaim?.scope?.to === "string" ? coverageClaim.scope.to : "";

  const costDriversClaim = claimsByTemplate.get("cost-drivers");
  let turns: number | null = null;
  if (costDriversClaim && costDriversClaim.values) {
    const tm = asNumber(costDriversClaim.values.turnsMain);
    const toth = asNumber(costDriversClaim.values.turnsOthers);
    if (tm !== null && toth !== null) {
      turns = tm + toth;
    }
  }

  if (turns === null) {
    const agents = Array.isArray(ledger.agents) ? ledger.agents : [];
    turns = agents.reduce((sum, a) => {
      const t = asNumber(a.turns);
      return sum + (t !== null ? t : 0);
    }, 0);
  }

  const effectiveTurns = Number.isFinite(turns) && turns > 0 ? turns : 0;
  if (effectiveTurns === 0) {
    return {
      session,
      to,
      turns: 0,
      costCentsPer100Turns: null,
      permissionAnswersPer100TurnsTenths: null,
      errorStopsPer100TurnsTenths: null,
      toolErrorsPer100CallsTenths: null,
      lookupMissPercent: null,
      compactionsPer100TurnsTenths: null,
      unguardedEditPercent: null,
    };
  }

  let costCentsPer100Turns: number | null = null;
  if (costDriversClaim && costDriversClaim.values) {
    const costMain = asNumber(costDriversClaim.values.costCentsMain);
    const costOthers = asNumber(costDriversClaim.values.costCentsOthers);
    if (costMain !== null && costOthers !== null) {
      costCentsPer100Turns = Math.round(
        ((costMain + costOthers) * 100) / effectiveTurns,
      );
    }
  }

  let permissionAnswersPer100TurnsTenths: number | null = null;
  const permClaim = claimsByTemplate.get("permission-answers");
  if (permClaim && permClaim.values) {
    const answers = asNumber(permClaim.values.answers);
    if (answers !== null) {
      permissionAnswersPer100TurnsTenths = Math.round(
        (answers * 1000) / effectiveTurns,
      );
    }
  }

  let errorStopsPer100TurnsTenths: number | null = null;
  const errorStopClaim = claimsByTemplate.get("error-stop-exposure");
  if (errorStopClaim && errorStopClaim.values) {
    const errorStops = asNumber(errorStopClaim.values.errorStops);
    if (errorStops !== null) {
      errorStopsPer100TurnsTenths = Math.round(
        (errorStops * 1000) / effectiveTurns,
      );
    }
  }

  let toolErrorsPer100CallsTenths: number | null = null;
  const toolErrorsClaim = claimsByTemplate.get("tool-errors");
  if (toolErrorsClaim && toolErrorsClaim.values) {
    const failed = asNumber(toolErrorsClaim.values.failedToolCalls);
    const calls = asNumber(toolErrorsClaim.values.toolCalls);
    if (failed !== null && calls !== null && calls > 0) {
      toolErrorsPer100CallsTenths = Math.round((failed * 1000) / calls);
    }
  }

  let lookupMissPercent: number | null = null;
  const agsLookupsClaim = claimsByTemplate.get("ags-lookups");
  if (agsLookupsClaim && agsLookupsClaim.values) {
    const noMatch = asNumber(agsLookupsClaim.values.noMatchCalls);
    const calls = asNumber(agsLookupsClaim.values.calls);
    if (noMatch !== null && calls !== null && calls > 0) {
      lookupMissPercent = Math.round((noMatch * 100) / calls);
    }
  }

  let compactionsPer100TurnsTenths: number | null = null;
  if (costDriversClaim && costDriversClaim.values) {
    const compactionsMain = asNumber(costDriversClaim.values.compactionsMain);
    if (compactionsMain !== null) {
      compactionsPer100TurnsTenths = Math.round(
        (compactionsMain * 1000) / effectiveTurns,
      );
    }
  }

  let unguardedEditPercent: number | null = null;
  const routingClaim = claimsByTemplate.get("routing-order");
  if (routingClaim && routingClaim.values) {
    const v = routingClaim.values;
    const directEpisodes = asNumber(v.editEpisodes);
    const editEpisodes =
      directEpisodes !== null
        ? directEpisodes
        : (asNumber(v.editEpisodesMain) ?? 0) +
          (asNumber(v.editEpisodesOthers) ?? 0);

    const directUnguarded = asNumber(v.unguarded) ?? asNumber(v.unguardedEdits);
    const unguarded =
      directUnguarded !== null
        ? directUnguarded
        : (asNumber(v.unguardedEditsMain) ?? 0) +
          (asNumber(v.unguardedEditsOthers) ?? 0);

    if (editEpisodes > 0) {
      unguardedEditPercent = Math.round((unguarded * 100) / editEpisodes);
    }
  }

  return {
    session,
    to,
    turns: effectiveTurns,
    costCentsPer100Turns,
    permissionAnswersPer100TurnsTenths,
    errorStopsPer100TurnsTenths,
    toolErrorsPer100CallsTenths,
    lookupMissPercent,
    compactionsPer100TurnsTenths,
    unguardedEditPercent,
  };
}

export async function loadPreviousReports(
  root: string,
  folder: LedgerFolder | null,
  currentSession: string | null,
  limit: number,
): Promise<SessionRates[]> {
  if (
    !folder ||
    typeof folder.name !== "string" ||
    limit <= 0 ||
    !Number.isFinite(limit)
  ) {
    return [];
  }

  try {
    let cursor: string | undefined = undefined;
    const ledgerEntries: PublishedEntry[] = [];
    while (true) {
      const page = await listPublished(
        root,
        cursor !== undefined ? { cursor } : {},
      );
      for (const entry of page.entries) {
        if (entry.kind === "ledger") {
          ledgerEntries.push(entry);
        }
      }
      if (!page.nextCursor) {
        break;
      }
      cursor = page.nextCursor;
    }

    const candidates: SessionRates[] = [];
    for (const entry of ledgerEntries) {
      try {
        if (entry.bytes > MAX_LEDGER_FILE_BYTES) {
          continue;
        }
        const resolved = await resolveArtifact(root, entry.artifactId);
        if (resolved.kind !== "ledger") {
          continue;
        }
        if (resolved.bytes > MAX_LEDGER_FILE_BYTES) {
          continue;
        }
        const stats = await fsp.stat(resolved.absolutePath);
        if (stats.size > MAX_LEDGER_FILE_BYTES) {
          continue;
        }
        const text = await fsp.readFile(resolved.absolutePath, "utf8");
        const rawJson: unknown = JSON.parse(text);
        const parsed = looseLedgerSchema.safeParse(rawJson);
        if (!parsed.success) {
          continue;
        }
        const data = parsed.data;
        if (
          !data.folder ||
          data.folder.name !== folder.name ||
          data.folder.parent !== folder.parent
        ) {
          continue;
        }
        if (data.session === currentSession) {
          continue;
        }

        candidates.push(computeRates(data));
      } catch {
        continue;
      }
    }

    candidates.sort((a, b) => {
      if (b.to < a.to) return -1;
      if (b.to > a.to) return 1;
      return 0;
    });

    const seenSessions = new Set<string | null>();
    const results: SessionRates[] = [];
    for (const rate of candidates) {
      if (seenSessions.has(rate.session)) {
        continue;
      }
      seenSessions.add(rate.session);
      results.push(rate);
      if (results.length >= limit) {
        break;
      }
    }

    return results;
  } catch {
    return [];
  }
}
