import type {
  Coverage,
  Disposition,
  EvidenceSource,
  NodeKey,
  SafeEvent,
} from "./contracts";
import type { SessionTracker } from "../services/SessionTracker";

export type InventoryItem = {
  key: NodeKey;
  parent: NodeKey | null;
  disposition: Disposition;
  coverage: Coverage;
};

export function createTrackerEvidenceSource(
  tracker: SessionTracker,
  workspace: string,
): EvidenceSource {
  void workspace; // Intentionally unused; tracker evidence source never touches disk.

  return {
    async *inventory(
      main: NodeKey,
      cutoff: string,
      signal: AbortSignal,
    ): AsyncIterable<InventoryItem> {
      signal.throwIfAborted();
      void cutoff;
      yield {
        key: { hostId: main.hostId, sessionId: main.sessionId },
        parent: null,
        disposition: "local-allowed",
        coverage: "summary-only",
      };
    },

    async *read(node: NodeKey, signal: AbortSignal): AsyncIterable<SafeEvent> {
      signal.throwIfAborted();

      type RawEvent = {
        at?: string;
        via?: string;
        loaded?: string[];
      };

      let events: RawEvent[] = [];
      if ("events_" in tracker && typeof tracker.events_ === "function") {
        events = tracker.events_();
      }

      const summary = tracker.summary();
      const defaultAt = summary.startedAt || new Date().toISOString();

      if (events.length === 0) {
        const workflows = tracker.loadedWorkflows();
        const skills = tracker.loadedSkills();
        for (const wf of workflows) {
          events.push({
            at: defaultAt,
            via: "get_workflow",
            loaded: [wf],
          });
        }
        for (const sk of skills) {
          events.push({
            at: defaultAt,
            via: "get_skill",
            loaded: [sk],
          });
        }
      }

      let ordinal = 1;
      for (const ev of events) {
        signal.throwIfAborted();

        const at = typeof ev.at === "string" ? ev.at : defaultAt;
        const via =
          typeof ev.via === "string" ? ev.via : "load_skills_for_files";
        const loaded = Array.isArray(ev.loaded) ? ev.loaded : [];

        const isWorkflow =
          via === "get_workflow" ||
          loaded.some(
            (item) => typeof item === "string" && item.startsWith("workflow/"),
          );

        const eventId = `load-${ordinal}`;
        const event: SafeEvent = {
          id: eventId,
          node: { hostId: node.hostId, sessionId: node.sessionId },
          at,
          kind: isWorkflow ? "launch" : "check",
          outcome: "passed",
          tool: via,
          source: {
            node: { hostId: node.hostId, sessionId: node.sessionId },
            eventId,
            line: ordinal,
          },
        };

        ordinal += 1;
        yield event;
      }
    },
  };
}
