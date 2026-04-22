export interface LoadEvent {
  /** ISO timestamp when the load happened. */
  at: string;
  /** Tool that performed the load. */
  via: "load_skills_for_files" | "load_skills_for_keywords" | "get_skill";
  /** Input passed to the tool (files, keywords, or single id). */
  input: string[];
  /** Skills returned to the agent, formatted as `category/id`. */
  loaded: string[];
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
    for (const e of this.events) for (const s of e.loaded) set.add(s);
    return Array.from(set).sort();
  }

  events_(): LoadEvent[] {
    return [...this.events];
  }

  startedAt_(): string {
    return this.startedAt;
  }
}
