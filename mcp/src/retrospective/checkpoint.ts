import path from "node:path";
import { z } from "zod";
import {
  checkpointSchema,
  identifierSchema,
  nodeKeySchema,
  sameNodeKey,
  timestampSchema,
  type Checkpoint,
  type Invitation,
  type NodeKey,
} from "./contracts";
import {
  StoreError,
  readPrivateFileOptional,
  writePrivateFileAtomicIfChanged,
} from "./platform-private";
import {
  assertStoreCapacity,
  sessionToken,
  withSessionLock,
  type StoreLayout,
} from "./store";

const MAX_STATE_BYTES = 65_536;

export type InvitationAction = "later" | "skip" | "prepare" | "reported";

/** Shared pure invitation event: a structured checkpoint or an explicit action. */
export type InvitationEvent =
  | Checkpoint
  | {
      action: "later" | "skip" | "prepare";
      checkpointId: string;
    };

export type CheckpointDispositionResult = {
  invitation: Invitation | null;
  announcement: "announced" | "updated" | "suppressed" | "ignored";
  written: boolean;
};

const sessionStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  main: nodeKeySchema,
  ownerId: identifierSchema,
  updatedAt: timestampSchema,
  last: z
    .strictObject({
      checkpointId: identifierSchema,
      sequence: z.number().int().nonnegative(),
      intent: z.enum(["completed", "closed-partial"]),
    })
    .nullable(),
  disposition: z
    .strictObject({
      state: z.enum(["pending", "later", "skipped", "running", "reported"]),
      checkpointId: identifierSchema,
      sequence: z.number().int().nonnegative(),
    })
    .nullable(),
});

type SessionState = z.infer<typeof sessionStateSchema>;
type DispositionState = NonNullable<SessionState["disposition"]>["state"];

const ACTION_STATES: Record<InvitationAction, DispositionState> = {
  later: "later",
  skip: "skipped",
  prepare: "running",
  reported: "reported",
};

const PURE_ACTION_STATES = {
  later: "later",
  skip: "skipped",
  prepare: "running",
} as const;

/**
 * Shared pure invitation transition. No filesystem, clock, or global state:
 * the caller supplies the current invitation and one structured event.
 *
 * - Ineligible checkpoints (child/diagnostic/non-substantive/not ready) leave
 *   the current invitation untouched.
 * - A checkpoint at or below the current sequence is a replay: unchanged object.
 * - A newer checkpoint replaces the single outstanding invitation with pending.
 * - later/skip/prepare apply only to the matching outstanding checkpoint;
 *   otherwise the current invitation (or null) is returned unchanged.
 */
export function transition(
  current: Invitation | null,
  event: InvitationEvent,
): Invitation | null {
  if ("action" in event) {
    if (!current || current.checkpointId !== event.checkpointId) return current;
    return {
      state: PURE_ACTION_STATES[event.action],
      checkpointId: current.checkpointId,
      sequence: current.sequence,
    };
  }
  if (
    !event.mainAgent ||
    event.diagnostic ||
    !event.substantive ||
    !event.ready
  )
    return current;
  if (current && event.sequence <= current.sequence) return current;
  return {
    state: "pending",
    checkpointId: event.checkpointId,
    sequence: event.sequence,
  };
}

function parseOwner(value: unknown): string {
  const parsed = identifierSchema.safeParse(value);
  if (!parsed.success) throw new StoreError("INVALID_OWNER_ID");
  return parsed.data;
}

async function readState(
  layout: StoreLayout,
  token: string,
): Promise<SessionState | null> {
  const buffer = await readPrivateFileOptional(
    path.join(layout.stateDir, `${token}.json`),
    MAX_STATE_BYTES,
  );
  if (!buffer) return null;
  let value: unknown;
  try {
    value = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new StoreError("INVALID_INVITATION_STATE");
  }
  const parsed = sessionStateSchema.safeParse(value);
  if (!parsed.success) throw new StoreError("INVALID_INVITATION_STATE");
  return parsed.data;
}

function invitationOf(state: SessionState | null): Invitation | null {
  return state?.disposition
    ? {
        state: state.disposition.state,
        checkpointId: state.disposition.checkpointId,
        sequence: state.disposition.sequence,
      }
    : null;
}

/**
 * Record one structured completion checkpoint for a main session.
 *
 * Eligibility is gated on main-agent, non-diagnostic, substantive, ready
 * metadata; idle-only or child/diagnostic events write nothing. Replays of a
 * sequence at or below the last recorded sequence are no-ops, so 1,000
 * identical events produce one pending disposition and one write. Later and
 * Skip keep suppressing their checkpoint until meaningful newer work arrives.
 * A newer sequence updates the single outstanding invitation in place.
 */
export async function recordCheckpoint(
  root: string,
  checkpoint: Checkpoint,
  ownerId: string,
): Promise<CheckpointDispositionResult> {
  const parsed = checkpointSchema.safeParse(checkpoint);
  if (!parsed.success) throw new StoreError("INVALID_CHECKPOINT");
  const owner = parseOwner(ownerId);
  const value = parsed.data;
  if (
    !value.mainAgent ||
    value.diagnostic ||
    !value.substantive ||
    !value.ready
  )
    return { invitation: null, announcement: "ignored", written: false };
  const main: NodeKey = value.main;
  return await withSessionLock(root, main, async (layout, token) => {
    const state = await readState(layout, token);
    if (state && state.ownerId !== owner)
      throw new StoreError("STATE_OWNED_BY_OTHER");
    if (state && !sameNodeKey(state.main, main))
      throw new StoreError("SESSION_MISMATCH");
    const current = invitationOf(state);
    const nextInvitation = transition(current, value);
    if (nextInvitation === null)
      return { invitation: null, announcement: "ignored", written: false };
    if (current !== null && nextInvitation === current)
      return {
        invitation: current,
        announcement: "suppressed",
        written: false,
      };
    if (nextInvitation.state === "absent")
      return { invitation: null, announcement: "ignored", written: false };
    const previous = current?.state ?? null;
    const announcement =
      previous === null || previous === "reported" ? "announced" : "updated";
    const next: SessionState = {
      schemaVersion: 1,
      main: { ...main },
      ownerId: owner,
      updatedAt: new Date().toISOString(),
      last: {
        checkpointId: value.checkpointId,
        sequence: value.sequence,
        intent: value.intent,
      },
      disposition: {
        state: nextInvitation.state,
        checkpointId: nextInvitation.checkpointId,
        sequence: nextInvitation.sequence,
      },
    };
    await assertStoreCapacity(layout.root, MAX_STATE_BYTES);
    const written = await writePrivateFileAtomicIfChanged(
      path.join(layout.stateDir, `${token}.json`),
      JSON.stringify(next),
      MAX_STATE_BYTES,
    );
    return { invitation: invitationOf(next), announcement, written };
  });
}

/**
 * Persist one explicit user/adapter disposition for the outstanding
 * invitation. This is the store effect; the shared pure decision function is
 * `transition(current, event)`. Mismatched or absent invitations are refused.
 */
export async function applyInvitationAction(
  root: string,
  main: NodeKey,
  checkpointId: string,
  action: InvitationAction,
  ownerId: string,
): Promise<Invitation> {
  const key = nodeKeySchema.safeParse(main);
  if (!key.success) throw new StoreError("INVALID_NODE_KEY");
  const checkpoint = identifierSchema.safeParse(checkpointId);
  if (!checkpoint.success) throw new StoreError("INVALID_CHECKPOINT_ID");
  const owner = parseOwner(ownerId);
  if (!Object.prototype.hasOwnProperty.call(ACTION_STATES, action))
    throw new StoreError("INVALID_ACTION");
  return await withSessionLock(root, key.data, async (layout, token) => {
    const state = await readState(layout, token);
    if (!state || !state.disposition)
      throw new StoreError("CHECKPOINT_NOT_PENDING");
    if (state.ownerId !== owner) throw new StoreError("STATE_OWNED_BY_OTHER");
    if (!sameNodeKey(state.main, key.data))
      throw new StoreError("SESSION_MISMATCH");
    if (state.disposition.checkpointId !== checkpoint.data)
      throw new StoreError("CHECKPOINT_NOT_PENDING");
    const current = invitationOf(state);
    const nextInvitation =
      action === "reported"
        ? {
            state: "reported" as const,
            checkpointId: checkpoint.data,
            sequence: state.disposition.sequence,
          }
        : transition(current, { action, checkpointId: checkpoint.data });
    if (!nextInvitation || nextInvitation.state === "absent")
      return {
        state: state.disposition.state,
        checkpointId: state.disposition.checkpointId,
        sequence: state.disposition.sequence,
      };
    if (!current || nextInvitation.state === current.state)
      return nextInvitation;
    const next: SessionState = {
      ...state,
      updatedAt: new Date().toISOString(),
      disposition: {
        checkpointId: nextInvitation.checkpointId,
        sequence: nextInvitation.sequence,
        state: nextInvitation.state,
      },
    };
    await assertStoreCapacity(layout.root, MAX_STATE_BYTES);
    await writePrivateFileAtomicIfChanged(
      path.join(layout.stateDir, `${token}.json`),
      JSON.stringify(next),
      MAX_STATE_BYTES,
    );
    return nextInvitation;
  });
}

export async function readInvitation(
  root: string,
  main: NodeKey,
): Promise<Invitation | null> {
  const key = nodeKeySchema.safeParse(main);
  if (!key.success) throw new StoreError("INVALID_NODE_KEY");
  const token = sessionToken(key.data);
  return await withSessionLock(root, key.data, async (layout) =>
    invitationOf(await readState(layout, token)),
  );
}
