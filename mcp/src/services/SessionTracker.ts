import { createHash } from "node:crypto";

export interface LoadEvent {
  /** ISO timestamp when the load happened. */
  at: string;
  /** Tool that performed the load. */
  via:
    | "load_skills_for_files"
    | "load_skills_for_keywords"
    | "get_skill"
    | "get_category_guide"
    | "list_categories"
    | "list_workflows"
    | "get_workflow"
    | "get_session_cost";
  /** Input passed to the tool (files, keywords, or single id). */
  input: string[];
  /** IDs whose full bodies were returned by this call. */
  loaded: string[];
  /** IDs selected by routing/keyword matching, even when the body could not be read. */
  selected?: string[];
  /** SHA-256 of each raw skill body returned, keyed by `category/id`. */
  bodyDigests?: Record<string, string>;
  /** Catalog IDs enumerated by this call, not returned body content. */
  discovered?: string[];
  /** Category-guide bodies actually returned by this call. */
  loadedGuides?: string[];
  /** Estimated tokens (chars/4) of skill bodies returned IN FULL this call. */
  estimatedTokens?: number;
}

export interface SessionSummary {
  startedAt: string;
  elapsedSeconds: number;
  toolCalls: number;
  skillsLoaded: number;
  guidesLoaded: number;
  workflowsLoaded: number;
  noMatchCalls: number;
  callsByTool: Record<LoadEvent["via"], number>;
}

export interface SkillContextCost {
  /** Sum of estimated tokens for every full skill body returned this session. */
  totalEstimatedTokens: number;
  /** Total skill body returns, counting repeats (not unique skills). */
  bodyReturnCount: number;
}

/** One skill returned in full this session, aggregated across calls. */
export interface SkillUsageEntry {
  /** `category/skill`, sanitized to the safe-identifier form. */
  id: string;
  /** Body returns for this skill, counting repeats. */
  returns: number;
  /** Earliest recorded return of this skill. */
  firstAt: string;
  /** Distinct tools that returned this skill, sorted. */
  via: string[];
}

/**
 * Counts-only snapshot of skill lookups for the retrospective ledger.
 * Registry ids and counts only: the `input` the agent passed (files, keywords,
 * single ids) is never part of the snapshot.
 */
export interface SkillUsageSnapshot {
  /** Tracker start time (ISO). */
  since: string;
  /** Recorded events of any kind. */
  events: number;
  /** Lookup calls made through a skill-loading tool. */
  loadCalls: number;
  /** Lookup calls whose routing matched no skill. */
  noMatchCalls: number;
  /** Skill bodies returned in full, counting repeats. */
  bodyReturns: number;
  /** Returns served from context instead of resent. */
  dedupedReturns: number;
  /** Estimated tokens of skill bodies returned in full. */
  estimatedTokens: number;
  /** Selected ids whose body was not returned, summed over calls. */
  selectedNotLoaded: number;
  /** Unique workflows loaded. */
  workflows: number;
  /** Unique category guides loaded. */
  guides: number;
  /** Unique skills returned. */
  skillsTotal: number;
  /** Top skills by returns desc then id asc, capped. */
  skills: SkillUsageEntry[];
}

const LOAD_CALL_VIAS: Record<LoadEvent["via"], boolean> = {
  load_skills_for_files: true,
  load_skills_for_keywords: true,
  get_skill: true,
  get_category_guide: true,
  list_categories: false,
  list_workflows: false,
  get_workflow: true,
  get_session_cost: false,
};

/** Registry ids are printed into reports, so anything else becomes a stable placeholder. */
const SAFE_SKILL_ID_REGEX = /^[A-Za-z0-9._:/@+-]{1,96}$/;
const MAX_SKILL_USAGE_ENTRIES = 20;

function sanitizeSkillId(id: string): string {
  if (SAFE_SKILL_ID_REGEX.test(id)) return id;
  const hash = createHash("sha256")
    .update(id, "utf8")
    .digest("hex")
    .slice(0, 8);
  return `skill-${hash}`;
}

/**
 * In-memory record of which skills were loaded in the current MCP session.
 * Lives for the lifetime of the stdio process — one session per agent run.
 */
export class SessionTracker {
  private events: LoadEvent[] = [];
  private startedAt = new Date().toISOString();
  private costContext: CostContext = {};
  private readonly noMatchTools = new Set<LoadEvent["via"]>([
    "load_skills_for_files",
    "load_skills_for_keywords",
    "get_skill",
    "get_workflow",
  ]);

  record(event: Omit<LoadEvent, "at">): void {
    this.events.push({ at: new Date().toISOString(), ...event });
  }

  /**
   * Observed tool calls in order of recording.
   * Returns a copy so callers cannot mutate tracker state.
   */
  observedToolCalls(): Array<{ tool: string; at: string }> {
    return this.events.map((event) => ({ tool: event.via, at: event.at }));
  }

  /** Unique skill bodies returned so far, formatted as `category/id`. */
  loadedSkills(): string[] {
    return this.uniqueSkillKeys(this.events.flatMap((event) => event.loaded));
  }

  /** Unique skills selected by matching so far, whether or not their body was returned. */
  selectedSkills(): string[] {
    return this.uniqueSkillKeys(
      this.events.flatMap((event) => event.selected ?? []),
    );
  }

  /** Latest SHA-256 digest observed for each skill body returned this session. */
  bodyDigests(): Record<string, string> {
    const digests: Record<string, string> = {};
    for (const event of this.events) {
      Object.assign(digests, event.bodyDigests ?? {});
    }
    return digests;
  }

  /** Unique workflows loaded so far, formatted as `workflow/name`. */
  loadedWorkflows(): string[] {
    const set = new Set<string>();
    for (const e of this.events) {
      for (const s of e.loaded) {
        if (s.startsWith("workflow/")) set.add(s);
      }
    }
    return Array.from(set).sort();
  }

  /** Unique category-guide bodies returned so far, formatted as `category/name`. */
  loadedGuides(): string[] {
    const set = new Set<string>();
    for (const e of this.events) {
      for (const guide of e.loadedGuides ?? []) set.add(guide);
    }
    return Array.from(set).sort();
  }

  /** Unique files passed to load_skills_for_files so far this session. */
  loadedFiles(): string[] {
    const set = new Set<string>();
    for (const e of this.events) {
      if (e.via === "load_skills_for_files") {
        for (const f of e.input) {
          set.add(f);
        }
      }
    }
    return Array.from(set).sort();
  }

  summary(now = new Date()): SessionSummary {
    const started = new Date(this.startedAt);
    const elapsedSeconds = Math.max(
      0,
      Math.round((now.getTime() - started.getTime()) / 1000),
    );
    const callsByTool = this.emptyCallCounts();
    for (const event of this.events) {
      callsByTool[event.via] += 1;
    }

    return {
      startedAt: this.startedAt,
      elapsedSeconds,
      toolCalls: this.events.length,
      skillsLoaded: this.loadedSkills().length,
      guidesLoaded: this.loadedGuides().length,
      workflowsLoaded: this.loadedWorkflows().length,
      noMatchCalls: this.countNoMatchCalls(),
      callsByTool,
    };
  }

  /**
   * Counts-only view of skill lookups for the retrospective ledger.
   * Reads recorded events, never the `input` strings the agent passed.
   */
  skillUsage(): SkillUsageSnapshot {
    let loadCalls = 0;
    let selectedNotLoaded = 0;
    let dedupedReturns = 0;
    // Skill keys whose body was returned in full at least once.
    const returnedKeys = new Set<string>();
    const entries = new Map<
      string,
      { returns: number; firstAt: string; via: Set<string> }
    >();

    for (const event of this.events) {
      if (LOAD_CALL_VIAS[event.via]) loadCalls += 1;

      const loadedSkills = event.loaded.filter((key) => this.isSkillKey(key));
      const loadedUnique = new Set(loadedSkills);
      for (const key of new Set(event.selected ?? [])) {
        if (this.isSkillKey(key) && !loadedUnique.has(key)) {
          selectedNotLoaded += 1;
        }
      }

      for (const key of loadedSkills) {
        const existing = entries.get(key);
        if (existing) {
          existing.returns += 1;
          if (event.at < existing.firstAt) existing.firstAt = event.at;
          existing.via.add(event.via);
        } else {
          entries.set(key, {
            returns: 1,
            firstAt: event.at,
            via: new Set([event.via]),
          });
        }
        if (event.bodyDigests?.[key] === undefined) {
          // No body was read on this call: it was served from context only if
          // the body had already been returned in full earlier this session.
          if (returnedKeys.has(key)) dedupedReturns += 1;
        } else {
          returnedKeys.add(key);
        }
      }
    }

    const cost = this.skillContextCost();
    const skills = Array.from(entries, ([id, entry]) => ({
      id: sanitizeSkillId(id),
      returns: entry.returns,
      firstAt: entry.firstAt,
      via: Array.from(entry.via).sort(),
    }))
      .sort((a, b) => {
        if (b.returns !== a.returns) return b.returns - a.returns;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .slice(0, MAX_SKILL_USAGE_ENTRIES);

    return {
      since: this.startedAt,
      events: this.events.length,
      loadCalls,
      noMatchCalls: this.countNoMatchCalls(),
      bodyReturns: cost.bodyReturnCount,
      dedupedReturns,
      estimatedTokens: cost.totalEstimatedTokens,
      selectedNotLoaded,
      workflows: this.loadedWorkflows().length,
      guides: this.loadedGuides().length,
      skillsTotal: entries.size,
      skills,
    };
  }

  events_(): LoadEvent[] {
    return [...this.events];
  }

  /** Aggregate returned skill-body cost across the session. */
  skillContextCost(): SkillContextCost {
    let totalEstimatedTokens = 0;
    let bodyReturnCount = 0;
    for (const e of this.events) {
      totalEstimatedTokens += e.estimatedTokens ?? 0;
      bodyReturnCount += e.loaded.filter((key) => this.isSkillKey(key)).length;
    }
    return { totalEstimatedTokens, bodyReturnCount };
  }

  startedAt_(): string {
    return this.startedAt;
  }

  /** Records the most recently supplied workflow/slug/outcome for telemetry attribution. Only defined fields overwrite. */
  setCostContext(ctx: CostContext): void {
    if (ctx.workflow !== undefined) this.costContext.workflow = ctx.workflow;
    if (ctx.slug !== undefined) this.costContext.slug = ctx.slug;
    if (ctx.outcome !== undefined) this.costContext.outcome = ctx.outcome;
  }

  costContext_(): CostContext {
    return { ...this.costContext };
  }

  private isSkillKey(key: string): boolean {
    return !key.startsWith("workflow/") && !key.startsWith("category/");
  }

  private countNoMatchCalls(): number {
    return this.events.filter(
      (event) => this.noMatchTools.has(event.via) && event.loaded.length === 0,
    ).length;
  }

  private uniqueSkillKeys(keys: string[]): string[] {
    return Array.from(
      new Set(keys.filter((key) => this.isSkillKey(key))),
    ).sort();
  }

  private emptyCallCounts(): Record<LoadEvent["via"], number> {
    return {
      load_skills_for_files: 0,
      load_skills_for_keywords: 0,
      get_skill: 0,
      get_category_guide: 0,
      list_categories: 0,
      list_workflows: 0,
      get_workflow: 0,
      get_session_cost: 0,
    };
  }
}

/** Cost-attribution metadata carried across from `get_session_cost` to telemetry flush. */
export interface CostContext {
  workflow?: string;
  slug?: string;
  outcome?: string;
}
