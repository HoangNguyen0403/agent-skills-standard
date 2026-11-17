import { decisionInputIssues, decisionInputSchema } from "../retrospective/decision-contract";
import type { ToolResult } from "./index";

export const recordDecisionSchema = decisionInputSchema;

export const RECORD_DECISION_DESCRIPTION = `<use_case>Record an agent-declared decision for later review. This is not approval or proof that a consequential action is authorized.</use_case>

<important_notes>
- Use basis=rule with a ruleRef when following a named rule; use default-pending-review when an unresolved consequential choice is deferred.
- Set impact to high, medium or low; reversible describes whether the choice can be undone. Supply a concise label without secrets.
- The tool stores nothing and returns a fixed receipt. The host transcript may retain this call for a local retrospective.
</important_notes>`;

export async function recordDecision(args: unknown): Promise<ToolResult> {
  const issues = decisionInputIssues(args);
  if (issues.length > 0) {
    return {
      content: [{ type: "text", text: `Invalid decision fields: ${issues.join(", ")}.` }],
      isError: true,
    };
  }
  // Re-parse after the field-only error path to keep the public handler stateless
  // and independent of SDK-side validation.
  const parsed = recordDecisionSchema.parse(args);
  void parsed;
  return { content: [{ type: "text", text: "Decision recorded." }] };
}
