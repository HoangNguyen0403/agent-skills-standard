import path from "node:path";
import { z } from "zod";

export type NodeKey = { hostId: string; sessionId: string };
export type Disposition =
  "local-allowed" | "restricted" | "unavailable" | "remote-not-authorized";
export type GenerationLayout = "v1" | "v2";
export type ArtifactKind =
  | "report"
  | "proposals"
  | "session"
  | "receipt"
  | "summary"
  | "ledger"
  | "html";
export const ARTIFACT_KINDS = [
  "report",
  "proposals",
  "session",
  "receipt",
  "summary",
  "ledger",
  "html",
] as const;
export const artifactKindSchema = z.enum(ARTIFACT_KINDS);

export type ArtifactReceipt = {
  schemaVersion: 1;
  artifactId: string;
  runId: string;
  status: "complete" | "partial" | "failed";
  modelCalls: 0;
  outboundRequests: 0;
};

export type LocalManifest = {
  schemaVersion: 1;
  provenance: "user-supplied" | "host-local";
  main: NodeKey;
  checkpointId: string;
  cutoff: string;
  nodes: Array<{
    key: NodeKey;
    parent: NodeKey | null;
    disposition: Disposition;
    source: { format: "omp" | "codex"; absolutePath: string } | null;
  }>;
};

export type EvidenceLimits = {
  sourceBytes: number;
  lineBytes: number;
  events: number;
  nodes: number;
  depth: number;
  elapsedMs: number;
  outputBytes: number;
  manifestBytes: number;
  localPages: number;
  remoteRequests: number;
  automaticRetries: number;
  concurrentRunsPerSession: number;
};

export const DEFAULT_LIMITS: Readonly<EvidenceLimits> = Object.freeze({
  sourceBytes: 33_554_432,
  lineBytes: 1_048_576,
  events: 100_000,
  nodes: 128,
  depth: 16,
  elapsedMs: 30_000,
  outputBytes: 4_194_304,
  manifestBytes: 262_144,
  localPages: 128,
  remoteRequests: 0,
  automaticRetries: 0,
  concurrentRunsPerSession: 1,
});

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(IDENTIFIER, "Expected a bounded identifier");

export const timestampSchema = z.string().refine(
  (value) => {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(
        value,
      );
    if (!match) return false;
    const [, year, month, day, hour, minute, second, , zone] = match;
    const instant = Date.parse(value);
    if (!Number.isFinite(instant) || zone === undefined) return false;
    const calendar = new Date(0);
    calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
    calendar.setUTCHours(Number(hour), Number(minute), Number(second), 0);
    if (
      calendar.getUTCFullYear() !== Number(year) ||
      calendar.getUTCMonth() !== Number(month) - 1 ||
      calendar.getUTCDate() !== Number(day) ||
      Number(hour) > 23 ||
      Number(minute) > 59 ||
      Number(second) > 59
    )
      return false;
    if (zone !== "Z") {
      const [offsetHour, offsetMinute] = zone.slice(1).split(":").map(Number);
      if (
        offsetHour > 14 ||
        (offsetHour === 14 && offsetMinute !== 0) ||
        offsetMinute > 59
      )
        return false;
    }
    return true;
  },
  { message: "Expected a valid ISO 8601 timestamp with timezone" },
);

export const nodeKeySchema = z.strictObject({
  hostId: identifierSchema,
  sessionId: identifierSchema,
});

export const dispositionSchema = z.enum([
  "local-allowed",
  "restricted",
  "unavailable",
  "remote-not-authorized",
]);

const manifestNodeSchema = z.strictObject({
  key: nodeKeySchema,
  parent: nodeKeySchema.nullable(),
  disposition: dispositionSchema,
  source: z
    .strictObject({
      format: z.enum(["omp", "codex"]),
      absolutePath: z
        .string()
        .min(1)
        .max(4_096)
        .refine((value) => path.isAbsolute(value) && !value.includes("\0"), {
          message: "Expected an absolute source path",
        }),
    })
    .nullable(),
});

export const localManifestSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    provenance: z.enum(["user-supplied", "host-local"]),
    main: nodeKeySchema,
    checkpointId: identifierSchema,
    cutoff: timestampSchema,
    nodes: z.array(manifestNodeSchema),
  })
  .superRefine((manifest, context) => {
    const seen = new Set<string>();
    let roots = 0;
    let mainSeen = false;
    for (const node of manifest.nodes) {
      const key = `${node.key.hostId}\u0000${node.key.sessionId}`;
      if (seen.has(key))
        context.addIssue({
          code: "custom",
          message: "Duplicate manifest session keys are not allowed.",
        });
      seen.add(key);
      if (node.parent === null) roots += 1;
      if (
        node.key.hostId === manifest.main.hostId &&
        node.key.sessionId === manifest.main.sessionId
      )
        mainSeen = true;
      if (node.disposition === "local-allowed" && node.source === null)
        context.addIssue({
          code: "custom",
          message: "Local-allowed nodes require an authorized source.",
        });
      if (node.disposition !== "local-allowed" && node.source !== null)
        context.addIssue({
          code: "custom",
          message: "Restricted or unavailable nodes must not name a source.",
        });
      if (
        node.parent !== null &&
        node.parent.hostId === node.key.hostId &&
        node.parent.sessionId === node.key.sessionId
      )
        context.addIssue({
          code: "custom",
          message: "A manifest node cannot be its own parent.",
        });
    }
    if (!mainSeen)
      context.addIssue({
        code: "custom",
        message: "The main session must be present in the manifest.",
      });
    if (roots !== 1)
      context.addIssue({
        code: "custom",
        message: "The manifest must contain exactly one null-parent root.",
      });
    const root = manifest.nodes.find((node) => node.parent === null);
    if (
      root &&
      (root.key.hostId !== manifest.main.hostId ||
        root.key.sessionId !== manifest.main.sessionId)
    )
      context.addIssue({
        code: "custom",
        message: "The single null-parent root must be the main session.",
      });
  });

export const artifactReceiptSchema = z.strictObject({
  schemaVersion: z.literal(1),
  artifactId: identifierSchema,
  runId: identifierSchema,
  status: z.enum(["complete", "partial", "failed"]),
  modelCalls: z.literal(0),
  outboundRequests: z.literal(0),
});

export function sameNodeKey(left: NodeKey, right: NodeKey): boolean {
  return left.hostId === right.hostId && left.sessionId === right.sessionId;
}
