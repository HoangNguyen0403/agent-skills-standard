import { z } from "zod";

export type TreeCoverage = {
  state: "complete" | "partial" | "not-measured";
  agentsCreated: number;
  agentsRead: number;
  unlinked: number;
  task: { created: number; read: number };
  hostAgents: {
    created: number;
    read: number;
    source: "agent-records" | "call-count";
    truncated: boolean;
  };
};

export type LedgerActivity = {
  userRows: {
    total: number;
    steering: number;
    permissionNotifications: number;
    byAttribution: Array<{ key: string; count: number }>;
  };
  userRowsPer100TurnsTenths: number | null;
  stopReasons: Array<{ reason: string; count: number }>;
};

export type LedgerFailureRuns = {
  minLength: number;
  runs: number;
  longest: { length: number; tool: string; agent: string } | null;
  tools: Array<{ tool: string; runs: number; longest: number }>;
  truncated: boolean;
};

export type LedgerTime = {
  wallSeconds: number | null;
  main: {
    idleGapMinSeconds: number;
    idleGaps: number;
    longestGapSeconds: number;
    idleSeconds: number;
  } | null;
  permissionLatency: {
    timed: number;
    medianSeconds: number;
    maxSeconds: number;
  } | null;
};

export type LedgerDecisionItem = {
  at: string;
  agent: string;
  basis: "rule" | "default-pending-review";
  impact: "high" | "medium" | "low";
  reversible: boolean;
  ruleRef: string | null;
  label: string;
};

export type LedgerDecisions = {
  total: number;
  byBasis: { rule: number; defaultPendingReview: number };
  byImpact: Record<
    "high" | "medium" | "low",
    { rule: number; defaultPendingReview: number }
  >;
  irreversible: number;
  rejected: number;
  unconfirmed: number;
  ruleRefs: Array<{ ref: string; count: number }>;
  otherRuleRefs: number;
  items: LedgerDecisionItem[];
  itemsOmitted: number;
};

const count = z.number().int().nonnegative();

const storedTreeCoverageSchema = z.strictObject({
  state: z.enum(["complete", "partial", "not-measured"]),
  agentsCreated: count,
  agentsRead: count,
  unlinked: count,
  task: z.strictObject({ created: count, read: count }),
  hostAgents: z.strictObject({
    created: count,
    read: count,
    source: z.enum(["agent-records", "call-count"]),
    truncated: z.boolean(),
  }),
});

const storedActivitySchema = z
  .strictObject({
    userRows: z.strictObject({
      total: count,
      steering: count,
      permissionNotifications: count,
      byAttribution: z
        .array(z.strictObject({ key: z.string().min(1).max(32), count }))
        .max(256),
    }),
    userRowsPer100TurnsTenths: count.nullable(),
    stopReasons: z
      .array(z.strictObject({ reason: z.string().min(1).max(48), count }))
      .max(9),
  })
  .nullable();

const storedFailureRunsSchema = z
  .strictObject({
    minLength: count,
    runs: count,
    longest: z
      .strictObject({
        length: count,
        tool: z.string().min(1).max(48),
        agent: z.string().min(1),
      })
      .nullable(),
    tools: z
      .array(
        z.strictObject({
          tool: z.string().min(1).max(48),
          runs: count,
          longest: count,
        }),
      )
      .max(5),
    truncated: z.boolean(),
  })
  .nullable();

const storedTimeSchema = z
  .strictObject({
    wallSeconds: count.nullable(),
    main: z
      .strictObject({
        idleGapMinSeconds: count,
        idleGaps: count,
        longestGapSeconds: count,
        idleSeconds: count,
      })
      .nullable(),
    permissionLatency: z
      .strictObject({
        timed: count,
        medianSeconds: count,
        maxSeconds: count,
      })
      .nullable(),
  })
  .nullable();

const safeRuleRef = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,95}$/;
const storedDecisionItemSchema = z.strictObject({
  at: z.string().min(1),
  agent: z.string().min(1),
  basis: z.enum(["rule", "default-pending-review"]),
  impact: z.enum(["high", "medium", "low"]),
  reversible: z.boolean(),
  ruleRef: z.string().regex(safeRuleRef).nullable(),
  label: z.string().min(1).max(120),
});

const storedDecisionsSchema = z
  .strictObject({
    total: count,
    byBasis: z.strictObject({ rule: count, defaultPendingReview: count }),
    byImpact: z.strictObject({
      high: z.strictObject({ rule: count, defaultPendingReview: count }),
      medium: z.strictObject({ rule: count, defaultPendingReview: count }),
      low: z.strictObject({ rule: count, defaultPendingReview: count }),
    }),
    irreversible: count,
    rejected: count,
    unconfirmed: count,
    ruleRefs: z
      .array(z.strictObject({ ref: z.string().regex(safeRuleRef), count }))
      .max(20),
    otherRuleRefs: count,
    items: z.array(storedDecisionItemSchema).max(200),
    itemsOmitted: count,
  })
  .nullable();

/** Strict version-2 fields shared by every stored-ledger reader. */
export const storedLedgerV2FieldsSchema = z.strictObject({
  treeCoverage: storedTreeCoverageSchema,
  activity: storedActivitySchema,
  failureRuns: storedFailureRunsSchema,
  time: storedTimeSchema,
  decisions: storedDecisionsSchema,
});
