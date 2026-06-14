export interface LoadEvent {
  /** ISO timestamp when the load happened. */
  at: string;
  /** Tool that performed the load. */
  via:
    | "load_skills_for_files"
    | "load_skills_for_keywords"
    | "get_skill"
    | "list_categories"
    | "list_workflows"
    | "get_workflow"
    | "get_session_cost";
  /** Input passed to the tool (files, keywords, or single id). */
  input: string[];
  /** Skills returned to the agent, formatted as `category/id`. */
  loaded: string[];
}

export interface SessionSummary {
  startedAt: string;
  elapsedSeconds: number;
  toolCalls: number;
  skillsLoaded: number;
  workflowsLoaded: number;
  noMatchCalls: number;
  callsByTool: Record<LoadEvent["via"], number>;
}

/**
 * In-memory record of which skills were loaded in the current MCP session.
 * Lives for the lifetime of the stdio process — one session per agent run.
 */
export class SessionTracker {
  private events: LoadEvent[] = [];
  private startedAt = new Date().toISOString();

  record(event: Omit<LoadEvent, "at">): void {
    this.events.push({ at: new Date().toISOString(), ...event });
  }

  /** Unique skills loaded so far, formatted as `category/id`. */
  loadedSkills(): string[] {
    const set = new Set<string>();
    for (const e of this.events) {
      for (const s of e.loaded) {
        if (!s.startsWith("workflow/")) set.add(s);
      }
    }
    return Array.from(set).sort();
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
      workflowsLoaded: this.loadedWorkflows().length,
      noMatchCalls: this.events.filter((event) => event.loaded.length === 0)
        .length,
      callsByTool,
    };
  }

  events_(): LoadEvent[] {
    return [...this.events];
  }

  startedAt_(): string {
    return this.startedAt;
  }

  private emptyCallCounts(): Record<LoadEvent["via"], number> {
    return {
      load_skills_for_files: 0,
      load_skills_for_keywords: 0,
      get_skill: 0,
      list_categories: 0,
      list_workflows: 0,
      get_workflow: 0,
      get_session_cost: 0,
    };
  }
}
