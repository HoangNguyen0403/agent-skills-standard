import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import { verifyPrivateRoot, writePrivateFileAtomic } from "./platform-private";
import { listPublished, resolveArtifact, type PublishedEntry } from "./store";
import { computeRates } from "./trend";
import { escapeHtml, formatMoney, plural } from "./views/format";
import { REPORT_CSS } from "./views/report-html";

export const INDEX_DEFAULT_DAYS = 30; // default window length (days, inclusive)
export const INDEX_MAX_WINDOW_DAYS = 366; // longest allowed window
export const INDEX_MAX_ROWS = 200; // rows shown (newest first)

export type IndexQuery = {
  since: string;
  until: string;
  folder: string | null;
};

export type IndexQueryError =
  "INVALID_DATE" | "INVALID_RANGE" | "INVALID_FOLDER";

export type IndexRow = {
  session: string | null;
  sessionShort: string; // first 8 chars of the session id, or "unknown"
  day: string;
  from: string;
  to: string; // day = YYYY-MM-DD of the ledger `to`
  folderName: string | null;
  folderParent: string | null;
  branch: string | null;
  title: string | null; // agent-supplied, unverified; already sanitised by the ledger
  outcome: string; // short fixed text, e.g. "3 commits", "not a git repository", "folder missing", "not measured"
  turns: number;
  costCents: number;
  act: number;
  watch: number;
  denied: number;
  generations: number; // how many reports exist for this session (latest is shown)
  reportHref: string | null; // relative URL from the index file to that generation's report.html, null when missing
};

export type IndexRecurring = {
  rule: string;
  destination: string;
  sessions: number;
  actSessions: number;
};

export type IndexResult = {
  query: IndexQuery;
  rows: IndexRow[]; // at most INDEX_MAX_ROWS, newest `to` first, then session asc
  matched: number; // sessions in the window (and folder) before the row cap
  omitted: number; // matched - rows.length
  storeSessions: number; // distinct sessions with a readable report in the whole store
  newestDay: string | null; // newest `to` day in the whole store
  unreadable: number; // stored ledgers that could not be read (older format, damaged, oversized)
  totals: {
    sessions: number;
    turns: number;
    costCents: number;
    act: number;
    denied: number;
  }; // over ALL matched sessions
  recurring: IndexRecurring[]; // over ALL matched sessions, sorted sessions desc, actSessions desc, rule asc
};

const MAX_LEDGER_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB

const RULE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "guardrail-answers": "Permission answers",
  "cost-concentration": "Main agent carries most of the cost",
  "unguarded-edits": "Edits without a file lookup",
  "lookup-misses": "Lookups that matched nothing",
  "human-intervention": "Human interventions",
  "agent-error-concentration": "Agents ending in errors",
  "coverage-gap": "Delegation not observable",
  "tracker-not-measured": "Tracker numbers not measured",
});

const DESTINATION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "permission-setup": "permission setup",
  "orchestration-config": "orchestration config",
  "agent-routing": "agent routing",
  "provider-route-monitoring": "provider route monitoring",
  "session-linkage": "session linkage",
  "tracker-binding": "tracker binding",
});

const RULE_DESTINATIONS: Readonly<Record<string, string>> = Object.freeze({
  "guardrail-answers": "permission-setup",
  "cost-concentration": "orchestration-config",
  "unguarded-edits": "agent-routing",
  "lookup-misses": "agent-routing",
  "human-intervention": "orchestration-config",
  "agent-error-concentration": "provider-route-monitoring",
  "coverage-gap": "session-linkage",
  "tracker-not-measured": "tracker-binding",
});

function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addUtcDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return formatUtcDate(date);
}

function isValidCalendarDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [year, month, day] = str.split("-").map(Number);
  if (
    year < 1000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      return true;
    }
  }
  return false;
}

export function parseIndexQuery(
  input: { since?: unknown; until?: unknown; folder?: unknown },
  now: Date,
): { ok: true; query: IndexQuery } | { ok: false; code: IndexQueryError } {
  const todayStr = formatUtcDate(now);

  let sinceStr: string | undefined;
  if (input.since !== undefined && input.since !== null && input.since !== "") {
    if (typeof input.since !== "string" || !isValidCalendarDate(input.since)) {
      return { ok: false, code: "INVALID_DATE" };
    }
    sinceStr = input.since;
  }

  let untilStr: string | undefined;
  if (input.until !== undefined && input.until !== null && input.until !== "") {
    if (typeof input.until !== "string" || !isValidCalendarDate(input.until)) {
      return { ok: false, code: "INVALID_DATE" };
    }
    untilStr = input.until;
  }

  const resolvedUntil = untilStr ?? todayStr;
  const resolvedSince =
    sinceStr ?? addUtcDays(resolvedUntil, -(INDEX_DEFAULT_DAYS - 1));

  if (resolvedSince > resolvedUntil) {
    return { ok: false, code: "INVALID_RANGE" };
  }

  const [yS, mS, dS] = resolvedSince.split("-").map(Number);
  const [yU, mU, dU] = resolvedUntil.split("-").map(Number);
  const utcS = Date.UTC(yS, mS - 1, dS);
  const utcU = Date.UTC(yU, mU - 1, dU);
  const windowDays = Math.round((utcU - utcS) / 86_400_000) + 1;

  if (windowDays > INDEX_MAX_WINDOW_DAYS) {
    return { ok: false, code: "INVALID_RANGE" };
  }

  let folder: string | null = null;
  if (
    input.folder !== undefined &&
    input.folder !== null &&
    input.folder !== ""
  ) {
    if (typeof input.folder !== "string") {
      return { ok: false, code: "INVALID_FOLDER" };
    }
    const trimmed = input.folder.trim();
    if (
      trimmed.length < 1 ||
      trimmed.length > 120 ||
      hasControlCharacters(trimmed)
    ) {
      return { ok: false, code: "INVALID_FOLDER" };
    }
    folder = trimmed;
  }

  return {
    ok: true,
    query: {
      since: resolvedSince,
      until: resolvedUntil,
      folder,
    },
  };
}

const looseClaimSchema = z
  .object({
    template: z.string(),
    values: z.record(z.string(), z.union([z.number(), z.string()])),
    scope: z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const looseAgentSchema = z
  .object({
    turns: z.number().optional(),
    costCents: z.number().optional(),
  })
  .passthrough();

const looseImprovementSchema = z
  .object({
    rule: z.string(),
    level: z.string(),
    destination: z.string().optional(),
    audience: z.string().optional(),
  })
  .passthrough();

const looseOutcomeSchema = z
  .union([
    z
      .object({
        source: z.literal("git"),
        branch: z.string().nullable().optional(),
        commits: z.number(),
      })
      .passthrough(),
    z
      .object({
        source: z.literal("unavailable"),
        reason: z.string(),
      })
      .passthrough(),
  ])
  .optional();

const looseLedgerSchema = z
  .object({
    schemaVersion: z.number(),
    session: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    cutoff: z.string().optional(),
    folder: z
      .object({
        name: z.string(),
        parent: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    claims: z.array(looseClaimSchema).optional(),
    agents: z.array(looseAgentSchema).optional(),
    otherAgents: z
      .object({
        count: z.number().optional(),
        turns: z.number().optional(),
        costCents: z.number().optional(),
      })
      .nullable()
      .optional(),
    improvements: z.array(looseImprovementSchema).optional(),
    outcome: looseOutcomeSchema,
  })
  .passthrough();

type ParsedLedger = z.infer<typeof looseLedgerSchema>;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function extractCostCents(ledger: ParsedLedger): number {
  const costDriversClaim = (ledger.claims ?? []).find(
    (c) => c.template === "cost-drivers",
  );
  if (costDriversClaim && costDriversClaim.values) {
    const costMain = asNumber(costDriversClaim.values.costCentsMain) ?? 0;
    const costOthers = asNumber(costDriversClaim.values.costCentsOthers) ?? 0;
    return costMain + costOthers;
  }
  if (Array.isArray(ledger.agents)) {
    let sum = 0;
    for (const a of ledger.agents) {
      sum += asNumber(a.costCents) ?? 0;
    }
    if (ledger.otherAgents && typeof ledger.otherAgents === "object") {
      sum += asNumber(ledger.otherAgents.costCents) ?? 0;
    }
    return sum;
  }
  return 0;
}

function extractDenied(ledger: ParsedLedger): number {
  const permClaim = (ledger.claims ?? []).find(
    (c) => c.template === "permission-answers",
  );
  if (permClaim && permClaim.values) {
    const deny = asNumber(permClaim.values.deny);
    if (deny !== null) return deny;
  }
  return 0;
}

function formatOutcome(outcome: ParsedLedger["outcome"]): {
  outcome: string;
  branch: string | null;
} {
  if (!outcome) {
    return { outcome: "not measured", branch: null };
  }
  if (outcome.source === "git") {
    return {
      outcome: plural(outcome.commits, "commit"),
      branch: outcome.branch ?? null,
    };
  }
  if (outcome.source === "unavailable") {
    let text: string;
    switch (outcome.reason) {
      case "folder-missing":
        text = "folder missing";
        break;
      case "not-a-repo":
        text = "not a git repository";
        break;
      case "git-error":
        text = "git unreadable";
        break;
      case "not-measured":
      default:
        text = "not measured";
        break;
    }
    return { outcome: text, branch: null };
  }
  return { outcome: "not measured", branch: null };
}

function extractDay(toStr: string): string {
  const parsed = new Date(toStr);
  if (!Number.isNaN(parsed.getTime())) {
    return formatUtcDate(parsed);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(toStr)) {
    return toStr.slice(0, 10);
  }
  return "";
}

function matchesFolder(
  folderFilter: string | null,
  folderName: string | null,
  folderParent: string | null,
): boolean {
  if (folderFilter === null) return true;
  if (folderName === null) return false;
  if (folderFilter === folderName) return true;
  if (
    folderParent !== null &&
    folderFilter === `${folderParent}/${folderName}`
  ) {
    return true;
  }
  return false;
}

type ScannedReport = {
  sessionId: string | null;
  artifactId: string;
  to: string;
  from: string;
  day: string;
  data: ParsedLedger;
  htmlPath: string;
};

export async function collectIndex(
  root: string,
  query: IndexQuery,
  options: { maxRows?: number } = {},
): Promise<IndexResult> {
  const emptyResult: IndexResult = {
    query,
    rows: [],
    matched: 0,
    omitted: 0,
    storeSessions: 0,
    newestDay: null,
    unreadable: 0,
    totals: { sessions: 0, turns: 0, costCents: 0, act: 0, denied: 0 },
    recurring: [],
  };

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

    let unreadable = 0;
    const readableReports: ScannedReport[] = [];

    for (const entry of ledgerEntries) {
      try {
        if (entry.bytes > MAX_LEDGER_FILE_BYTES) {
          unreadable++;
          continue;
        }
        const resolved = await resolveArtifact(root, entry.artifactId);
        if (
          resolved.kind !== "ledger" ||
          resolved.bytes > MAX_LEDGER_FILE_BYTES
        ) {
          unreadable++;
          continue;
        }
        const stats = await fsp.stat(resolved.absolutePath);
        if (!stats.isFile() || Number(stats.size) > MAX_LEDGER_FILE_BYTES) {
          unreadable++;
          continue;
        }
        const text = await fsp.readFile(resolved.absolutePath, "utf8");
        const rawJson: unknown = JSON.parse(text);
        const parsed = looseLedgerSchema.safeParse(rawJson);
        if (!parsed.success) {
          unreadable++;
          continue;
        }
        const data = parsed.data;
        if (data.schemaVersion !== 1) {
          unreadable++;
          continue;
        }

        const coverageClaim = (data.claims ?? []).find(
          (c) => c.template === "coverage",
        );
        let to =
          typeof coverageClaim?.scope?.to === "string"
            ? coverageClaim.scope.to
            : "";
        let from =
          typeof coverageClaim?.scope?.from === "string"
            ? coverageClaim.scope.from
            : "";

        if (to.length === 0) {
          for (const c of data.claims ?? []) {
            if (typeof c.scope?.to === "string" && c.scope.to.length > 0) {
              to = c.scope.to;
              if (from.length === 0 && typeof c.scope?.from === "string") {
                from = c.scope.from;
              }
              break;
            }
          }
        }
        if (to.length === 0 && typeof data.cutoff === "string") {
          to = data.cutoff;
        }

        const day = extractDay(to);
        if (day.length === 0) {
          unreadable++;
          continue;
        }
        const sessionId = data.session ?? null;
        const htmlPath = path.join(
          path.dirname(resolved.absolutePath),
          "report.html",
        );

        readableReports.push({
          sessionId,
          artifactId: entry.artifactId,
          to,
          from,
          day,
          data,
          htmlPath,
        });
      } catch {
        unreadable++;
      }
    }

    const distinctSessions = new Set<string>();
    let nullSessionCount = 0;
    let newestDay: string | null = null;

    for (const report of readableReports) {
      if (report.sessionId !== null) {
        distinctSessions.add(report.sessionId);
      } else {
        nullSessionCount++;
      }
      if (report.day.length > 0) {
        if (newestDay === null || report.day > newestDay) {
          newestDay = report.day;
        }
      }
    }
    const storeSessions = distinctSessions.size + nullSessionCount;

    type SessionCandidate = {
      bestReport: ScannedReport;
      generations: number;
    };

    const sessionGroups = new Map<string, SessionCandidate>();
    const nullSessionCandidates: SessionCandidate[] = [];

    for (const report of readableReports) {
      if (report.sessionId === null) {
        nullSessionCandidates.push({
          bestReport: report,
          generations: 1,
        });
      } else {
        const existing = sessionGroups.get(report.sessionId);
        if (!existing) {
          sessionGroups.set(report.sessionId, {
            bestReport: report,
            generations: 1,
          });
        } else {
          existing.generations++;
          const currentBest = existing.bestReport;
          let isNewer = false;
          if (report.to > currentBest.to) {
            isNewer = true;
          } else if (report.to === currentBest.to) {
            if (report.artifactId > currentBest.artifactId) {
              isNewer = true;
            }
          }
          if (isNewer) {
            existing.bestReport = report;
          }
        }
      }
    }

    const allCandidates = [...sessionGroups.values(), ...nullSessionCandidates];

    const matchedRows: IndexRow[] = [];
    const matchedLedgers: ParsedLedger[] = [];

    for (const candidate of allCandidates) {
      const report = candidate.bestReport;
      const data = report.data;

      if (report.day < query.since || report.day > query.until) {
        continue;
      }

      const folderName = data.folder?.name ?? null;
      const folderParent = data.folder?.parent ?? null;
      if (!matchesFolder(query.folder, folderName, folderParent)) {
        continue;
      }

      let reportHref: string | null = null;
      try {
        const htmlStats = await fsp.stat(report.htmlPath);
        if (htmlStats.isFile()) {
          const rel = path.relative(root, report.htmlPath);
          const segments = rel.split(path.sep);
          if (!segments.includes("..") && !path.isAbsolute(rel)) {
            reportHref = segments.map(encodeURIComponent).join("/");
          }
        }
      } catch {
        reportHref = null;
      }

      const rates = computeRates({
        session: data.session ?? null,
        claims: data.claims ?? [],
        agents: data.agents ?? [],
      });
      const turns = rates.turns;
      const costCents = extractCostCents(data);
      const denied = extractDenied(data);

      let act = 0;
      let watch = 0;
      for (const imp of data.improvements ?? []) {
        if (imp.level === "act") act++;
        else if (imp.level === "watch") watch++;
      }

      const outcomeData = formatOutcome(data.outcome);

      const row: IndexRow = {
        session: report.sessionId,
        sessionShort:
          report.sessionId !== null && report.sessionId.length > 0
            ? report.sessionId.slice(0, 8)
            : "unknown",
        day: report.day,
        from: report.from,
        to: report.to,
        folderName,
        folderParent,
        branch: outcomeData.branch,
        title: data.label ?? null,
        outcome: outcomeData.outcome,
        turns,
        costCents,
        act,
        watch,
        denied,
        generations: candidate.generations,
        reportHref,
      };

      matchedRows.push(row);
      matchedLedgers.push(data);
    }

    let totalTurns = 0;
    let totalCostCents = 0;
    let totalAct = 0;
    let totalDenied = 0;

    for (const row of matchedRows) {
      totalTurns += row.turns;
      totalCostCents += row.costCents;
      totalAct += row.act;
      totalDenied += row.denied;
    }

    const totals = {
      sessions: matchedRows.length,
      turns: totalTurns,
      costCents: totalCostCents,
      act: totalAct,
      denied: totalDenied,
    };

    type RecurringStat = {
      rule: string;
      destination: string;
      sessions: number;
      actSessions: number;
    };
    const recurringMap = new Map<string, RecurringStat>();

    for (const data of matchedLedgers) {
      const sessionRules = new Map<
        string,
        { destination: string; hasAct: boolean }
      >();
      for (const imp of data.improvements ?? []) {
        if (typeof imp.rule !== "string" || imp.rule.length === 0) continue;
        const prev = sessionRules.get(imp.rule);
        const hasAct = imp.level === "act" || (prev?.hasAct ?? false);
        const dest =
          imp.destination ??
          prev?.destination ??
          RULE_DESTINATIONS[imp.rule] ??
          "other";
        sessionRules.set(imp.rule, { destination: dest, hasAct });
      }

      for (const [rule, { destination, hasAct }] of sessionRules) {
        let stat = recurringMap.get(rule);
        if (!stat) {
          stat = { rule, destination, sessions: 0, actSessions: 0 };
          recurringMap.set(rule, stat);
        }
        stat.sessions++;
        if (hasAct) {
          stat.actSessions++;
        }
      }
    }

    const recurring = Array.from(recurringMap.values()).sort((a, b) => {
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      if (b.actSessions !== a.actSessions) return b.actSessions - a.actSessions;
      return a.rule.localeCompare(b.rule);
    });

    matchedRows.sort((a, b) => {
      if (b.to < a.to) return -1;
      if (b.to > a.to) return 1;
      const sessA = a.session ?? "";
      const sessB = b.session ?? "";
      return sessA.localeCompare(sessB);
    });

    const matched = matchedRows.length;
    const rowCap = Math.min(
      INDEX_MAX_ROWS,
      Math.max(1, options.maxRows ?? INDEX_MAX_ROWS),
    );
    const rows = matchedRows.slice(0, rowCap);
    const omitted = matched - rows.length;

    return {
      query,
      rows,
      matched,
      omitted,
      storeSessions,
      newestDay,
      unreadable,
      totals,
      recurring,
    };
  } catch {
    return emptyResult;
  }
}

export function renderIndexHtml(result: IndexResult): string {
  const parts: string[] = [];

  const headerHtml = `<h1>Agent retrospectives</h1>
<p class="meta">${escapeHtml(result.query.since)} to ${escapeHtml(result.query.until)} &middot; Folder: ${escapeHtml(result.query.folder ?? "all")}</p>`;
  parts.push(headerHtml);

  const costFormatted = `${escapeHtml(formatMoney(result.totals.costCents))} est.`;
  const actClass = result.totals.act > 0 ? " red" : "";
  const deniedClass = result.totals.denied > 0 ? " red" : "";
  const tilesHtml = `<div class="tiles">
<div class="tile"><span>Sessions</span><b>${result.totals.sessions}</b></div>
<div class="tile"><span>Estimated cost</span><b>${costFormatted}</b></div>
<div class="tile${actClass}"><span>ACT items</span><b>${result.totals.act}</b></div>
<div class="tile${deniedClass}"><span>Permission denials</span><b>${result.totals.denied}</b></div>
</div>`;
  parts.push(tilesHtml);

  if (result.recurring.length > 0) {
    let rowsHtml = "";
    for (const item of result.recurring) {
      const ruleLabel = RULE_LABELS[item.rule] ?? "other";
      const destLabel = DESTINATION_LABELS[item.destination] ?? "other";
      rowsHtml += `<tr><td>${escapeHtml(ruleLabel)}</td><td>${escapeHtml(destLabel)}</td><td>${item.sessions} of ${result.totals.sessions}</td><td>${escapeHtml(plural(item.actSessions, "session"))}</td></tr>\n`;
    }
    const recurringHtml = `<h2>Recurring problems</h2>
<table>
<thead>
<tr><th>Rule</th><th>Owner</th><th>Sessions</th><th>ACT in</th></tr>
</thead>
<tbody>
${rowsHtml}</tbody>
</table>`;
    parts.push(recurringHtml);
  }

  if (result.rows.length === 0) {
    const storeInfo =
      result.storeSessions > 0
        ? ` The store holds ${plural(result.storeSessions, "session")}; the newest ended on ${escapeHtml(result.newestDay ?? "")}.`
        : "";
    parts.push(`<p class="hint">No reports in this range.${storeInfo}</p>`);
  } else {
    const monthsMap = new Map<string, IndexRow[]>();
    for (const row of result.rows) {
      const month = row.day.slice(0, 7);
      const list = monthsMap.get(month);
      if (list) {
        list.push(row);
      } else {
        monthsMap.set(month, [row]);
      }
    }

    let monthIndex = 0;
    for (const [month, monthRows] of monthsMap) {
      const isOpen = monthIndex === 0;
      monthIndex++;

      const monthCost = monthRows.reduce((sum, r) => sum + r.costCents, 0);
      const monthAct = monthRows.reduce((sum, r) => sum + r.act, 0);
      const summaryText = `${plural(monthRows.length, "session")}, ${formatMoney(monthCost)} est., ${monthAct} ACT`;

      let tableRows = "";
      for (const row of monthRows) {
        let sessionContent: string;
        if (row.title !== null && row.title.length > 0) {
          sessionContent = `<i>${escapeHtml(row.title)}</i>`;
        } else {
          sessionContent = escapeHtml(row.sessionShort);
        }
        if (row.generations > 1) {
          sessionContent += ` (+${row.generations - 1} earlier)`;
        }

        const folderContent = row.folderParent
          ? `${escapeHtml(row.folderParent)}/${escapeHtml(row.folderName ?? "")}`
          : row.folderName
            ? escapeHtml(row.folderName)
            : "-";

        const branchContent =
          row.branch !== null ? escapeHtml(row.branch) : "-";

        const reportContent =
          row.reportHref !== null
            ? `<a href="${escapeHtml(row.reportHref)}">open</a>`
            : "missing";

        tableRows += `<tr><td>${escapeHtml(row.day)}</td><td>${sessionContent}</td><td>${folderContent}</td><td>${branchContent}</td><td>${escapeHtml(row.outcome)}</td><td>${escapeHtml(formatMoney(row.costCents))} est.</td><td>${row.act}</td><td>${row.watch}</td><td>${row.denied}</td><td>${reportContent}</td></tr>\n`;
      }

      const monthHtml = `<details class="sec"${isOpen ? " open" : ""}>
<summary><h3>${escapeHtml(month)}</h3><span class="sum">${escapeHtml(summaryText)}</span></summary>
<table>
<thead>
<tr><th>Date</th><th>Session (agent-supplied)</th><th>Folder</th><th>Branch</th><th>Outcome</th><th>Cost</th><th>ACT</th><th>WATCH</th><th>Denied</th><th>Report</th></tr>
</thead>
<tbody>
${tableRows}</tbody>
</table>
</details>`;
      parts.push(monthHtml);
    }
  }

  let notesHtml = "";
  if (result.omitted > 0) {
    notesHtml += `<p class="hint">Showing ${result.rows.length} of ${result.matched} sessions in this range, newest first. Narrow the range to see the rest.</p>\n`;
  }
  if (result.unreadable > 0) {
    notesHtml += `<p class="hint">${plural(result.unreadable, "stored report")} could not be read (older format or damaged).</p>\n`;
  }
  notesHtml += `<p class="hint">Narrow or widen with: ags retrospective index --since YYYY-MM-DD --until YYYY-MM-DD --folder NAME</p>`;
  parts.push(notesHtml);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Agent retrospectives</title>
<style>
${REPORT_CSS}
a{color:#0969da;text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="wrap">
${parts.join("\n")}
</div>
</body>
</html>\n`;
}

export async function writeIndex(root: string, html: string): Promise<string> {
  const verifiedRoot = await verifyPrivateRoot(root);
  const target = path.join(verifiedRoot, "index.html");
  await writePrivateFileAtomic(target, html);
  return target;
}
