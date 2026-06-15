export interface RuntimeUsageSnapshot {
  promptTokens?: number;
  cachedPromptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
}

export interface RuntimePricingSnapshot {
  inputCostPer1M?: number;
  cachedInputCostPer1M?: number;
  outputCostPer1M?: number;
  reasoningCostPer1M?: number;
  otherCost?: number;
  currency?: string;
}

export interface SessionCostRequest {
  workflow: string;
  model?: string;
  promptTokens?: number;
  cachedPromptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  inputCostPer1M?: number;
  cachedInputCostPer1M?: number;
  outputCostPer1M?: number;
  reasoningCostPer1M?: number;
  otherCost?: number;
  currency?: string;
}

export function calculateEstimatedSessionCost(
  args: Omit<SessionCostRequest, "workflow">,
): string | null {
  const {
    promptTokens,
    cachedPromptTokens = 0,
    completionTokens,
    reasoningTokens = 0,
    inputCostPer1M,
    cachedInputCostPer1M = 0,
    outputCostPer1M,
    reasoningCostPer1M = 0,
    otherCost = 0,
    currency = "USD",
  } = args;
  const hasInputs =
    promptTokens !== undefined &&
    completionTokens !== undefined &&
    inputCostPer1M !== undefined &&
    outputCostPer1M !== undefined;
  if (!hasInputs) return null;

  const inputCost = (promptTokens / 1_000_000) * inputCostPer1M;
  const cachedInputCost =
    (cachedPromptTokens / 1_000_000) * cachedInputCostPer1M;
  const outputCost = (completionTokens / 1_000_000) * outputCostPer1M;
  const reasoningCost = (reasoningTokens / 1_000_000) * reasoningCostPer1M;
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
    inputCostPer1M: pricing?.inputCostPer1M,
    cachedInputCostPer1M: pricing?.cachedInputCostPer1M,
    outputCostPer1M: pricing?.outputCostPer1M,
    reasoningCostPer1M: pricing?.reasoningCostPer1M,
    otherCost: pricing?.otherCost,
    currency: pricing?.currency,
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
