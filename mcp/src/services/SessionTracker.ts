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
      noMatchCalls: this.events.filter(
        (event) =>
          this.noMatchTools.has(event.via) && event.loaded.length === 0,
      ).length,
      callsByTool,
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
