/**
 * Lifecycle capability declaration for the manual package.
 *
 * Verified against the released `@getpaseo/plugin@0.13.2` typings:
 * `PluginServerContext` exposes `registerSettings`, `handle`, `registerProvider`,
 * `registerUsageSource`, `on` and `before` — no agent-tool registration (no
 * `defineAgentTool` export) and no `AgentToolContext`.
 *
 * This package therefore registers no agent tool and can never record a
 * structured checkpoint. It does subscribe to `agent.created` and
 * `agent.turn_started` — in `server/identity.ts` — for host-supplied parentage
 * only. A lifecycle completion is not a checkpoint, and identity observation is
 * not an invitation, so automatic invitations stay unsupported instead of being
 * inferred from lifecycle text.
 */
import type { AutomaticSupport } from "../shared/contracts";

export const AUTOMATIC_SUPPORT: AutomaticSupport = Object.freeze({
  state: "unsupported",
  reason: "agent-tool-unavailable",
});

export const CHECKPOINT_TOOL = false;
