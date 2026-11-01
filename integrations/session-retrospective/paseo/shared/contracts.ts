/**
 * Strict, versioned RPC contracts shared by the Paseo app bundle and the daemon
 * subprocess.
 *
 * This build advertises **no** data-collecting or report-reading capability:
 *
 * - `retrospective.prepare`, `.consent`, `.view` and `.disposition` exist only to
 *   refuse. Their handlers read no transcript, no manifest, no store entry and no
 *   report text, and no environment value can enable them. Their inputs are loose
 *   on purpose: any shape a stale or future client sends — including the removed
 *   `requestId` or a `callerIsHuman` claim — parses, so the caller receives the
 *   explicit `UNSUPPORTED` refusal instead of a schema error. Nothing is read from
 *   the parsed value, and no field is ever honored.
 * - `retrospective.status` reports the static capability statement plus the
 *   in-memory identity observation for this session. It performs no filesystem,
 *   store or host access and returns no root path, artifact id or content.
 *
 * Why the capability is unavailable, from released surfaces rather than
 * assumption: `@getpaseo/plugin` 0.13.2 and 0.14.0 give an RPC handler
 * `PluginHandlerContext = { paseo }` with no caller identity, capability or
 * human-action proof; the client protocol's `plugin.rpc.invoke.request` carries
 * `pluginId`, `method` and `input` with no principal; and the published plugin
 * reference documents schema validation on both sides but no human-only caller
 * guarantee. Collecting local transcripts or returning report text over an
 * unverified admission boundary is not something this adapter will do, so the
 * capability stays unavailable until a host exposes a verifiable channel.
 *
 * The supported manual route is the local CLI on the owning host; see the package
 * README. It is not packaged into this repository's install yet.
 *
 * This module is shared code: it must stay runtime-neutral (no Node, no React).
 */
import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/**
 * Host namespace the adapter uses for sessions owned by the local Paseo daemon.
 * The released plugin SDK exposes no daemon identifier, so this is a documented
 * namespace rather than a host-issued identity.
 */
export const PASEO_HOST_ID = "paseo";

/** Single store owner id for the manual package's stored state. */
export const OWNER_ID = "paseo-session-retrospective";

export const ADAPTER_LIMITS = Object.freeze({
  /** Observed agents retained for identity; oldest are evicted first. */
  maxObservedAgents: 512,
});

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(IDENTIFIER, "Expected a bounded identifier");

/** Absolute POSIX or Windows path, bounded, without NUL or `..` segments. */
export function isAbsoluteBoundedPath(value: string): boolean {
  if (value.length === 0 || value.length > 4_096) return false;
  if (value.includes("\0")) return false;
  if (value.split(/[\\/]/).some((segment) => segment === "..")) return false;
  const posix = value.startsWith("/") && !value.startsWith("//");
  const windows = /^[A-Za-z]:[\\/]/.test(value);
  return posix || windows;
}

/** Host-supplied session identity, as observed by this adapter. */
export const identityStateSchema = z.enum(["main", "child", "unknown"]);

/**
 * Stable refusal codes. The set is closed on purpose: this build has exactly one
 * reason to refuse a data-path RPC — the capability is unavailable — and a new
 * failure mode must be named here instead of forwarding a free-form message.
 */
export const refusalCodeSchema = z.enum(["UNSUPPORTED"]);

export type RefusalCode = z.infer<typeof refusalCodeSchema>;

export const refusalSchema = z.strictObject({
  ok: z.literal(false),
  code: refusalCodeSchema,
});

export type Refusal = z.infer<typeof refusalSchema>;

export const automaticSupportSchema = z.strictObject({
  state: z.enum(["supported", "unsupported"]),
  /** Closed reason code; never prose. */
  reason: identifierSchema,
});

export type AutomaticSupport = z.infer<typeof automaticSupportSchema>;

/**
 * Static capability statement. `unavailable` is not a transient error and no
 * setting changes it; it means this build performs no collection and returns no
 * report content through plugin RPC.
 */
export const capabilitySchema = z.strictObject({
  state: z.literal("unavailable"),
  reason: z.enum(["human-admission-unverified"]),
});

export type Capability = z.infer<typeof capabilitySchema>;

/**
 * Input for the four refusal-only names: any object, any keys. Accepting an
 * unknown legacy shape is what turns every caller into `UNSUPPORTED` instead of a
 * validation error, and the handler never inspects the parsed value.
 */
export const refusalOnlyInputSchema = z.looseObject({});

/* ---------------------------------------------------------------- status --- */

export const statusContract = defineRpc({
  name: "retrospective.status",
  input: z.strictObject({ agentId: identifierSchema }),
  output: z.strictObject({
    ok: z.literal(true),
    capability: capabilitySchema,
    automatic: automaticSupportSchema,
    checkpointTool: z.boolean(),
    /**
     * Identity observed from host payloads in this plugin lifetime. `unknown`
     * means no parentage was reported yet. It is informational only in this
     * build: it gates nothing, because no capability is offered.
     */
    identity: z.strictObject({ state: identityStateSchema }),
  }),
});

export type StatusInput = z.infer<(typeof statusContract)["input"]>;
export type StatusOutput = z.infer<(typeof statusContract)["output"]>;

/* --------------------------------------------------------------- consent --- */

/** No-op name: nothing is minted and no authorization is established. */
export const consentContract = defineRpc({
  name: "retrospective.consent",
  input: refusalOnlyInputSchema,
  output: refusalSchema,
});

export type ConsentInput = z.infer<(typeof consentContract)["input"]>;

/* --------------------------------------------------------------- prepare --- */

/** Refusal-only name: no manifest is opened, no evidence is collected. */
export const prepareContract = defineRpc({
  name: "retrospective.prepare",
  input: refusalOnlyInputSchema,
  output: refusalSchema,
});

export type PrepareInput = z.infer<(typeof prepareContract)["input"]>;

/* ------------------------------------------------------------------ view --- */

/** Refusal-only name: no artifact is resolved, no file is opened. */
export const viewContract = defineRpc({
  name: "retrospective.view",
  input: refusalOnlyInputSchema,
  output: refusalSchema,
});

export type ViewInput = z.infer<(typeof viewContract)["input"]>;

/* ----------------------------------------------------------- disposition --- */

/** Refusal-only name: no invitation is created, read or changed. */
export const dispositionContract = defineRpc({
  name: "retrospective.disposition",
  input: refusalOnlyInputSchema,
  output: refusalSchema,
});

export type DispositionInput = z.infer<(typeof dispositionContract)["input"]>;
