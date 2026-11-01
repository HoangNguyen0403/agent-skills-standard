import path from "node:path";
import { z } from "zod";

export type NodeKey = { hostId: string; sessionId: string };
export type Disposition =
  "local-allowed" | "restricted" | "unavailable" | "remote-not-authorized";
export type Coverage =
  | "structured-events"
  | "partial"
  | "summary-only"
  | "restricted"
  | "unavailable";
export type CriterionState =
  "met" | "finding" | "not-applicable" | "not-assessable";
export type EventKind =
  "launch" | "permission" | "check" | "completion" | "usage" | "gap";
export type EventOutcome =
  "claimed-complete" | "passed" | "failed" | "denied" | "canceled" | "unknown";

export type SourceRef = { node: NodeKey; eventId: string; line?: number };

export type SafeEvent = {
  id: string;
  node: NodeKey;
  at: string;
  kind: EventKind;
  outcome?: EventOutcome;
  provider?: string;
  model?: string;
  tool?: string;
  counts?: {
    inputTokens: number | null;
    outputTokens: number | null;
    cost: number | null;
    currency: string | null;
  };
  source: SourceRef;
};

export type EvidencePacket = {
  schemaVersion: 1;
  runId: string;
  main: NodeKey;
  cutoff: string;
  nodes: Array<{
    key: NodeKey;
    parent: NodeKey | null;
    disposition: Disposition;
    coverage: Coverage;
  }>;
  events: SafeEvent[];
  gaps: Array<{ code: string; node?: NodeKey }>;
};

export type Finding = {
  id: string;
  criterion: number;
  classification: "observed" | "candidate";
  ruleId: string;
  sources: SourceRef[];
  claimCode: string;
};

export type Proposal = {
  id: string;
  revision: string;
  status: "proposed";
  findingIds: string[];
  mechanism: string;
  candidateGuidanceIds: string[];
  verificationCodes: string[];
  semanticReviewRequired: boolean;
};

export type Analysis = {
  schemaVersion: 1;
  findings: Finding[];
  proposals: Proposal[];
  criteria: Array<{
    criterion: number;
    state: CriterionState;
    reasonCode: string;
  }>;
};

export interface Analyzer {
  readonly mode: "local-rules";
  analyze(packet: EvidencePacket, signal: AbortSignal): Promise<Analysis>;
}

export type ArtifactReceipt = {
  schemaVersion: 1;
  artifactId: string;
  runId: string;
  status: "complete" | "partial" | "failed";
  modelCalls: 0;
  outboundRequests: 0;
};

export interface EvidenceSource {
  inventory(
    main: NodeKey,
    cutoff: string,
    signal: AbortSignal,
  ): AsyncIterable<{
    key: NodeKey;
    parent: NodeKey | null;
    disposition: Disposition;
  }>;
  read(node: NodeKey, signal: AbortSignal): AsyncIterable<SafeEvent>;
}

export type PrepareRequest = {
  main: NodeKey;
  checkpointId: string;
  cutoff: string;
  root: string;
  consent: "local-only";
  /** Required human attestation; adapters must capture a real user action. */
  storageRiskAcknowledged: true;
};

export type Checkpoint = {
  main: NodeKey;
  checkpointId: string;
  sequence: number;
  mainAgent: boolean;
  diagnostic: boolean;
  substantive: boolean;
  intent: "completed" | "closed-partial";
  ready: boolean;
};

export type Invitation = {
  state: "absent" | "pending" | "later" | "skipped" | "running" | "reported";
  checkpointId: string;
  sequence: number;
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
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/+@-]{0,127}$/;
const CURRENCY = /^[A-Z]{3}$/;

export const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(IDENTIFIER, "Expected a bounded identifier");

const modelSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(MODEL, "Expected a bounded model identifier");

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

export const coverageSchema = z.enum([
  "structured-events",
  "partial",
  "summary-only",
  "restricted",
  "unavailable",
]);

export const criterionStateSchema = z.enum([
  "met",
  "finding",
  "not-applicable",
  "not-assessable",
]);

export const sourceRefSchema = z.strictObject({
  node: nodeKeySchema,
  eventId: identifierSchema,
  line: z.number().int().nonnegative().optional(),
});

const countsSchema = z.strictObject({
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  cost: z.number().finite().nonnegative().nullable(),
  currency: z.string().regex(CURRENCY).nullable(),
});

export const safeEventSchema = z.strictObject({
  id: identifierSchema,
  node: nodeKeySchema,
  at: timestampSchema,
  kind: z.enum(["launch", "permission", "check", "completion", "usage", "gap"]),
  outcome: z
    .enum([
      "claimed-complete",
      "passed",
      "failed",
      "denied",
      "canceled",
      "unknown",
    ])
    .optional(),
  provider: modelSchema.optional(),
  model: modelSchema.optional(),
  tool: identifierSchema.optional(),
  counts: countsSchema.optional(),
  source: sourceRefSchema,
});

const packetNodeSchema = z.strictObject({
  key: nodeKeySchema,
  parent: nodeKeySchema.nullable(),
  disposition: dispositionSchema,
  coverage: coverageSchema,
});

const gapSchema = z.strictObject({
  code: z.string().min(1).max(128),
  node: nodeKeySchema.optional(),
});

export const evidencePacketSchema = z.strictObject({
  schemaVersion: z.literal(1),
  runId: identifierSchema,
  main: nodeKeySchema,
  cutoff: timestampSchema,
  nodes: z.array(packetNodeSchema),
  events: z.array(safeEventSchema),
  gaps: z.array(gapSchema),
});

export const prepareRequestSchema = z.strictObject({
  main: nodeKeySchema,
  checkpointId: identifierSchema,
  cutoff: timestampSchema,
  root: z.string().min(1).max(4_096),
  consent: z.literal("local-only"),
  storageRiskAcknowledged: z.literal(true),
});

export const checkpointSchema = z.strictObject({
  main: nodeKeySchema,
  checkpointId: identifierSchema,
  sequence: z.number().int().nonnegative(),
  mainAgent: z.boolean(),
  diagnostic: z.boolean(),
  substantive: z.boolean(),
  intent: z.enum(["completed", "closed-partial"]),
  ready: z.boolean(),
});

export const invitationSchema = z.strictObject({
  state: z.enum([
    "absent",
    "pending",
    "later",
    "skipped",
    "running",
    "reported",
  ]),
  checkpointId: identifierSchema,
  sequence: z.number().int().nonnegative(),
});

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

const findingSchema = z.strictObject({
  id: identifierSchema,
  criterion: z.number().int().positive(),
  classification: z.enum(["observed", "candidate"]),
  ruleId: identifierSchema,
  sources: z.array(sourceRefSchema),
  claimCode: identifierSchema,
});

const proposalSchema = z.strictObject({
  id: identifierSchema,
  revision: identifierSchema,
  status: z.literal("proposed"),
  findingIds: z.array(identifierSchema),
  mechanism: identifierSchema,
  candidateGuidanceIds: z.array(identifierSchema),
  verificationCodes: z.array(identifierSchema),
  semanticReviewRequired: z.boolean(),
});

export const analysisSchema = z.strictObject({
  schemaVersion: z.literal(1),
  findings: z.array(findingSchema),
  proposals: z.array(proposalSchema),
  criteria: z.array(
    z.strictObject({
      criterion: z.number().int().positive(),
      state: criterionStateSchema,
      reasonCode: identifierSchema,
    }),
  ),
});

export const artifactReceiptSchema = z.strictObject({
  schemaVersion: z.literal(1),
  artifactId: identifierSchema,
  runId: identifierSchema,
  status: z.enum(["complete", "partial", "failed"]),
  modelCalls: z.literal(0),
  outboundRequests: z.literal(0),
});

export const inventoryEntrySchema = z.strictObject({
  key: nodeKeySchema,
  parent: nodeKeySchema.nullable(),
  disposition: dispositionSchema,
});

export function sameNodeKey(left: NodeKey, right: NodeKey): boolean {
  return left.hostId === right.hostId && left.sessionId === right.sessionId;
}

export function nodeKeyId(key: NodeKey): string {
  return `${key.hostId}\u0000${key.sessionId}`;
}
