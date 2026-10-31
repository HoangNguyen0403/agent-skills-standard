/**
 * Session identity from host signals only.
 *
 * The released plugin SDK gives an RPC handler no caller identity and no focus
 * record, and agent snapshots carry no `parentAgentId`. The one host-authenticated
 * source of parentage available to a plugin backend is the lifecycle payload
 * (`PluginHookAgent.parentAgentId`), which the daemon supplies — a client cannot
 * forge it.
 *
 * So the manual adapter observes only `agent.created` and `agent.turn_started`
 * and remembers the parent link per agent id. In this build the observation is
 * informational only: every data-path RPC refuses regardless of identity, so
 * `unknown` does not gate anything — it is simply reported by `status`.
 *
 * This package observes identity only. It never subscribes to completion events
 * and never records a checkpoint; invitations stay unsupported there.
 */
import type {
  PluginHookAgent,
  PluginLifecycleRegistration,
} from "@getpaseo/plugin/server";
import { ADAPTER_LIMITS } from "../shared/contracts";
import type { IdentityKind, IdentitySource } from "../shared/identity";

/** Only the host-supplied fields this adapter needs. */
export type AgentIdentityEvent = Pick<PluginHookAgent, "id" | "parentAgentId">;

export type IdentityRegistry = IdentitySource & {
  observe(agent: AgentIdentityEvent): void;
  size(): number;
  clear(): void;
};

export function identityOf(parentAgentId: string | null): IdentityKind {
  return parentAgentId === null ? "main" : "child";
}

/**
 * Bounded per-agent identity memory. Entries are evicted oldest-first once the
 * cap is reached; an evicted session simply becomes `unknown` again, which fails
 * closed rather than guessing.
 */
export function createIdentityRegistry(
  maxEntries: number = ADAPTER_LIMITS.maxObservedAgents,
): IdentityRegistry {
  const observed = new Map<string, IdentityKind>();
  const cap = Math.max(1, maxEntries);

  return {
    observe(agent) {
      if (agent.id.length === 0) return;
      observed.delete(agent.id);
      while (observed.size >= cap) {
        const oldest = observed.keys().next();
        if (oldest.done === true) break;
        observed.delete(oldest.value);
      }
      observed.set(agent.id, identityOf(agent.parentAgentId));
    },
    identity(agentId) {
      return observed.get(agentId) ?? "unknown";
    },
    size() {
      return observed.size;
    },
    clear() {
      observed.clear();
    },
  };
}

/** Only the notification registration surface is used. */
export type IdentityLifecycle = Pick<PluginLifecycleRegistration, "on">;

/** Returns idempotent removers so unloading drops every subscription. */
export function registerIdentityObservation(
  server: IdentityLifecycle,
  registry: IdentityRegistry,
): () => void {
  const removers = [
    server.on("agent.created", (event) => {
      registry.observe(event.agent);
    }),
    server.on("agent.turn_started", (event) => {
      registry.observe(event.agent);
    }),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
