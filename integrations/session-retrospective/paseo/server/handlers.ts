/**
 * Daemon-side RPC handlers.
 *
 * The data path is disabled in this build:
 *
 * - `prepare`, `consent`, `view` and `disposition` return the static
 *   `UNSUPPORTED` refusal. They take no core, store, root, host port or consent
 *   table, so there is nothing for them to read or mutate, and no environment
 *   value participates in the decision. Refusal happens before any host lookup,
 *   path resolution or file access because none of those exist here.
 * - `status` reports the capability statement plus in-memory identity
 *   observation. It performs no I/O and returns no path, id or content.
 *
 * Human admission cannot be verified from the released SDK — `PluginHandlerContext`
 * is `{ paseo }` with no caller identity, and `plugin.rpc.invoke.request` carries
 * no principal — so the collecting capability is not offered at all. The
 * supported manual route is the local CLI on the owning host; see the package
 * README.
 */
import type {
  AutomaticSupport,
  ConsentInput,
  DispositionInput,
  PrepareInput,
  Refusal,
  StatusInput,
  StatusOutput,
  ViewInput,
} from "../shared/contracts";
import type { IdentitySource } from "../shared/identity";

export type HandlerOptions = {
  automatic: AutomaticSupport;
  checkpointTool: boolean;
  /** In-memory host-supplied identity only; no store or host call is made. */
  identity: IdentitySource;
};

/** The single refusal every data-path RPC returns. */
const UNAVAILABLE: Refusal = { ok: false, code: "UNSUPPORTED" };

export type RetrospectiveHandlers = {
  status(input: StatusInput): StatusOutput;
  consent(input: ConsentInput): Refusal;
  prepare(input: PrepareInput): Refusal;
  view(input: ViewInput): Refusal;
  disposition(input: DispositionInput): Refusal;
};

export function createHandlers(options: HandlerOptions): RetrospectiveHandlers {
  return {
    status(input) {
      return {
        ok: true,
        capability: {
          state: "unavailable",
          reason: "human-admission-unverified",
        },
        automatic: options.automatic,
        checkpointTool: options.checkpointTool,
        identity: { state: options.identity.identity(input.agentId) },
      };
    },
    // The parsed input is accepted so the call shape stays stable, and never
    // inspected: the refusal must not depend on the request's paths, ids or
    // nonce, and no branch may begin work for any value.
    consent(_input) {
      return UNAVAILABLE;
    },
    prepare(_input) {
      return UNAVAILABLE;
    },
    view(_input) {
      return UNAVAILABLE;
    },
    disposition(_input) {
      return UNAVAILABLE;
    },
  };
}
