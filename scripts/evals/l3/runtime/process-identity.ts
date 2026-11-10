/**
 * scripts/evals/l3/runtime/process-identity.ts
 *
 * Classified, finite runner teardown for a guest reconstructed from its durable
 * ledger (no live capture).
 *
 * The rule this module exists to enforce: *absence of evidence is not evidence of
 * absence*. A probe that fails with `EPERM`, a `ps` that cannot be read, or a pid
 * whose start identity differs because the number was reused are three different
 * facts, and none of them means "the VM is gone". Only a kill that is confirmed by
 * a fresh identity check, or a probe that reports `ESRCH` for a pid we owned,
 * establishes teardown.
 */

export type ProcessIdentityClass =
  | "owned"
  | "already_gone"
  | "identity_reused"
  | "permission_denied"
  | "unknown";

export type TeardownClassification = "confirmed_teardown" | Exclude<ProcessIdentityClass, "owned">;

export interface IdentityProbe {
  /** `null` when the pid cannot be probed at all (permission, missing procfs, ...). */
  readonly signal: (pid: number, signal: NodeJS.Signals | 0) => { readonly code: string | null };
  /** The process start identity, or `null` when it cannot be read. */
  readonly startIdentity: (pid: number) => Promise<string | null>;
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly pollMs: number;
  readonly budgetMs: number;
}

/** One classification pass. Errors are named, never flattened to "gone". */
export async function classifyProcessIdentity(
  pid: number,
  startedAt: string,
  probe: IdentityProbe,
): Promise<ProcessIdentityClass> {
  const signalled = probe.signal(pid, 0);
  if (signalled.code === "ESRCH") return "already_gone";
  if (signalled.code === "EPERM") return "permission_denied";
  if (signalled.code !== null) return "unknown";
  const observed = await probe.startIdentity(pid);
  if (observed === null) return "unknown";
  return observed === startedAt ? "owned" : "identity_reused";
}

/**
 * Forces a reconstructed runner down and *confirms* the outcome within a bounded
 * wall-clock window. Returns `confirmed_teardown` only when a kill was issued for
 * a pid whose identity still matched and a later probe saw the pid disappear.
 */
export async function forceStopOwnedRunner(
  pid: number,
  startedAt: string,
  probe: IdentityProbe,
): Promise<TeardownClassification> {
  const first = await classifyProcessIdentity(pid, startedAt, probe);
  if (first !== "owned") return first;

  const killed = probe.signal(pid, "SIGKILL");
  if (killed.code === "ESRCH") return "already_gone";
  if (killed.code === "EPERM") return "permission_denied";
  if (killed.code !== null) return "unknown";

  const deadlineAtMs = probe.now() + probe.budgetMs;
  while (probe.now() < deadlineAtMs) {
    const observed = await classifyProcessIdentity(pid, startedAt, probe);
    if (observed === "already_gone") return "confirmed_teardown";
    if (observed !== "owned") return observed;
    await probe.sleep(probe.pollMs);
  }
  return "unknown";
}
