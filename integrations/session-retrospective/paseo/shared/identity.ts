/**
 * Identity vocabulary for the adapter runtime.
 *
 * `main` means the host reported a null parent for this agent, `child` means it
 * reported a parent, and `unknown` means this adapter cannot prove either. In this
 * build the value is informational only: it gates no capability, because every
 * data-path RPC refuses regardless of identity.
 */
export type IdentityKind = "main" | "child" | "unknown";

export type IdentitySource = {
  identity(agentId: string): IdentityKind;
};
