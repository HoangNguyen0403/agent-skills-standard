/**
 * Daemon-side entry for the manual package (Paseo 0.13.x).
 *
 * Registers the inert capability surface: `retrospective.status` plus four
 * refusal-only names (`consent`, `prepare`, `view`, `disposition`). It imports no
 * core package, opens no manifest, reads or writes no store entry and returns no
 * report content. Identity observation uses only the host-supplied
 * `agent.created` / `agent.turn_started` payloads and is not an authorization
 * for anything this build offers.
 *
 * The capability is unavailable because the released SDK exposes no verifiable
 * human-admission channel for plugin RPC; the supported manual route is the local
 * CLI on the owning host (see the package README).
 */
import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  consentContract,
  dispositionContract,
  prepareContract,
  statusContract,
  viewContract,
} from "./shared/contracts";
import { AUTOMATIC_SUPPORT, CHECKPOINT_TOOL } from "./server/checkpoint-hooks";
import { createHandlers } from "./server/handlers";
import {
  createIdentityRegistry,
  registerIdentityObservation,
} from "./server/identity";

export default function contribute(server: PluginServerContext) {
  const identity = createIdentityRegistry();
  const handlers = createHandlers({
    automatic: AUTOMATIC_SUPPORT,
    checkpointTool: CHECKPOINT_TOOL,
    identity,
  });

  server.handle(statusContract, (input) => handlers.status(input));
  server.handle(consentContract, (input) => handlers.consent(input));
  server.handle(prepareContract, (input) => handlers.prepare(input));
  server.handle(viewContract, (input) => handlers.view(input));
  server.handle(dispositionContract, (input) => handlers.disposition(input));

  const removeIdentity = registerIdentityObservation(server, identity);

  return () => {
    removeIdentity();
    identity.clear();
  };
}
