import { z } from "zod";
import { redactCommand } from "./permission-requests";

const RULE_REF = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,95}$/;

export const decisionInputSchema = z
  .strictObject({
    basis: z.enum(["rule", "default-pending-review"]),
    impact: z.enum(["high", "medium", "low"]),
    reversible: z.boolean(),
    label: z.string().trim().min(1).max(120),
    ruleRef: z.string().regex(RULE_REF).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.basis === "rule" && value.ruleRef === undefined) {
      ctx.addIssue({ code: "custom", path: ["ruleRef"], message: "Required" });
    }
    if (
      value.basis === "default-pending-review" &&
      value.ruleRef !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ruleRef"],
        message: "Not allowed",
      });
    }
  });

export type DecisionInput = z.infer<typeof decisionInputSchema>;

export function decisionInputIssues(value: unknown): string[] {
  const result = decisionInputSchema.safeParse(value);
  if (result.success) return [];
  return [
    ...new Set(
      result.error.issues.map((issue) =>
        issue.path.length > 0 ? String(issue.path[0]) : "input",
      ),
    ),
  ].sort();
}

export function sanitizeDecisionLabel(raw: string): string {
  return redactCommand(raw)
    .replace(/[`<>]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .trim();
}
