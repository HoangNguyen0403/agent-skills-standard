/**
 * Whether reasoning tokens are already contained in completion/output tokens
 * (`included-in-output`) or billed on top of them (`separate`). Absent means the
 * host did not declare the semantics; a cost that would have to guess an extra
 * reasoning charge is then reported unavailable instead of double-billed.
 */
export type ReasoningBilling = "separate" | "included-in-output";

export interface RuntimeUsageSnapshot {
  promptTokens?: number;
  cachedPromptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  reasoningBilling?: ReasoningBilling;
}

export interface RuntimePricingSnapshot {
  inputCostPer1M?: number;
  cachedInputCostPer1M?: number;
  outputCostPer1M?: number;
  reasoningCostPer1M?: number;
  otherCost?: number;
  currency?: string;
}

/**
 * Caller-declared source for token and cost numbers.
 * - `host`: caller declared the numbers were supplied by a host-level adapter (`buildSessionCostRequest`); host authenticity is unverified by cryptographic proof.
 * - `agent-estimate`: caller-typed values without host adapter assertion.
 * - `unavailable`: required token/pricing fields are missing.
 */
export type CostSource = "host" | "agent-estimate" | "unavailable";
export interface SessionCostRequest {
  workflow: string;
  model?: string;
  promptTokens?: number;
  cachedPromptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  reasoningBilling?: ReasoningBilling;
  inputCostPer1M?: number;
  cachedInputCostPer1M?: number;
  outputCostPer1M?: number;
  reasoningCostPer1M?: number;
  otherCost?: number;
  currency?: string;
  /**
   * Caller-declared source label for the token/pricing fields above. Only
   * `buildSessionCostRequest` should set this to `"host"`; host authenticity
   * remains unverified by this MCP server without an authenticated host boundary.
   */
  costSource?: "host" | "agent-estimate";
}

export interface SessionCostCoverage {
  estimatedCost: string | null;
  exactCostAvailable: boolean;
  missingHostFields: string[];
  /** Provenance of the token/USD values above; see `CostSource`. */
  costSource: CostSource;
}

export function summarizeSessionCostCoverage(
  args: Omit<SessionCostRequest, "workflow">,
): SessionCostCoverage {
  const missingHostFields: string[] = [];
  if (args.promptTokens === undefined) missingHostFields.push("promptTokens");
  if (args.completionTokens === undefined) {
    missingHostFields.push("completionTokens");
  }
  if (args.inputCostPer1M === undefined)
    missingHostFields.push("inputCostPer1M");
  if (args.outputCostPer1M === undefined) {
    missingHostFields.push("outputCostPer1M");
  }
  if (
    (args.cachedPromptTokens ?? 0) > 0 &&
    args.cachedInputCostPer1M === undefined
  ) {
    missingHostFields.push("cachedInputCostPer1M");
  }
  if (
    (args.reasoningTokens ?? 0) > 0 &&
    args.reasoningBilling !== "included-in-output" &&
    args.reasoningCostPer1M === undefined
  ) {
    missingHostFields.push("reasoningCostPer1M");
  }
  if (
    args.reasoningTokens !== undefined &&
    args.reasoningTokens > 0 &&
    args.reasoningCostPer1M !== undefined &&
    args.reasoningCostPer1M > 0 &&
    args.reasoningBilling === undefined
  ) {
    missingHostFields.push("reasoningBilling");
  }
  const costSource: CostSource =
    missingHostFields.length > 0
      ? "unavailable"
      : args.costSource === "host"
        ? "host"
        : "agent-estimate";

  return {
    estimatedCost:
      missingHostFields.length > 0 ? null : calculateEstimatedSessionCost(args),
    exactCostAvailable: missingHostFields.length === 0,
    missingHostFields,
    costSource,
  };
}

export function calculateEstimatedSessionCost(
  args: Omit<SessionCostRequest, "workflow">,
): string | null {
  const {
    promptTokens,
    cachedPromptTokens = 0,
    completionTokens,
    reasoningTokens = 0,
    reasoningBilling,
    inputCostPer1M,
    cachedInputCostPer1M,
    outputCostPer1M,
    reasoningCostPer1M,
    otherCost = 0,
    currency = "USD",
  } = args;
  const hasInputs =
    promptTokens !== undefined &&
    completionTokens !== undefined &&
    inputCostPer1M !== undefined &&
    outputCostPer1M !== undefined;
  if (!hasInputs) return null;
  if (cachedPromptTokens > 0 && cachedInputCostPer1M === undefined) {
    return null;
  }
  if (
    reasoningTokens > 0 &&
    reasoningCostPer1M !== undefined &&
    reasoningCostPer1M > 0 &&
    reasoningBilling === undefined
  ) {
    return null;
  }

  const inputCost = (promptTokens / 1_000_000) * inputCostPer1M;
  const cachedInputCost =
    cachedPromptTokens > 0 && cachedInputCostPer1M !== undefined
      ? (cachedPromptTokens / 1_000_000) * cachedInputCostPer1M
      : 0;
  const outputCost = (completionTokens / 1_000_000) * outputCostPer1M;
  const reasoningCost =
    reasoningTokens > 0 && reasoningCostPer1M !== undefined
      ? reasoningBilling === "included-in-output"
        ? 0
        : (reasoningTokens / 1_000_000) * reasoningCostPer1M
      : 0;
  return `${currency} ${(inputCost + cachedInputCost + outputCost + reasoningCost + otherCost).toFixed(6)}`;
}
export interface WorkflowTelemetryTrigger {
  activeWorkflow?: string | null;
  status: "running" | "completed" | "failed" | "blocked";
}

export interface FinalizeWorkflowTelemetryOptions<T> {
  trigger: WorkflowTelemetryTrigger;
  model?: string;
  usage?: RuntimeUsageSnapshot;
  pricing?: RuntimePricingSnapshot;
  invokeGetSessionCost: (args: SessionCostRequest) => Promise<T>;
}

export function shouldFinalizeWorkflowTelemetry(
  trigger: WorkflowTelemetryTrigger,
): boolean {
  return (
    Boolean(trigger.activeWorkflow) &&
    ["completed", "failed", "blocked"].includes(trigger.status)
  );
}

export function buildSessionCostRequest(args: {
  workflow: string;
  model?: string;
  usage?: RuntimeUsageSnapshot;
  pricing?: RuntimePricingSnapshot;
}): SessionCostRequest {
  const { workflow, model, usage, pricing } = args;
  return {
    workflow,
    model,
    promptTokens: usage?.promptTokens,
    cachedPromptTokens: usage?.cachedPromptTokens,
    completionTokens: usage?.completionTokens,
    reasoningTokens: usage?.reasoningTokens,
    reasoningBilling: usage?.reasoningBilling,
    inputCostPer1M: pricing?.inputCostPer1M,
    cachedInputCostPer1M: pricing?.cachedInputCostPer1M,
    outputCostPer1M: pricing?.outputCostPer1M,
    reasoningCostPer1M: pricing?.reasoningCostPer1M,
    otherCost: pricing?.otherCost,
    currency: pricing?.currency,
    // This is the documented host-adapter path: usage/pricing came from the
    // runtime's own telemetry, not from an agent typing numbers.
    costSource: "host",
  };
}

export async function finalizeWorkflowTelemetry<T>(
  options: FinalizeWorkflowTelemetryOptions<T>,
): Promise<T | null> {
  if (!shouldFinalizeWorkflowTelemetry(options.trigger)) return null;

  return await options.invokeGetSessionCost(
    buildSessionCostRequest({
      workflow: options.trigger.activeWorkflow!,
      model: options.model,
      usage: options.usage,
      pricing: options.pricing,
    }),
  );
}
