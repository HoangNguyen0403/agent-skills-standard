import { describe, expect, it, vi } from "vitest";
import {
  buildSessionCostRequest,
  calculateEstimatedSessionCost,
  finalizeWorkflowTelemetry,
  shouldFinalizeWorkflowTelemetry,
} from "../src/services/WorkflowTelemetry";

describe("WorkflowTelemetry", () => {
  it("builds a session cost payload from runtime usage and pricing", () => {
    const payload = buildSessionCostRequest({
      workflow: "implement-feature",
      model: "gpt-5",
      usage: {
        promptTokens: 120000,
        cachedPromptTokens: 80000,
        completionTokens: 18000,
        reasoningTokens: 5000,
      },
      pricing: {
        inputCostPer1M: 5,
        cachedInputCostPer1M: 0.5,
        outputCostPer1M: 15,
        reasoningCostPer1M: 15,
        otherCost: 0.02,
        currency: "USD",
      },
    });

    expect(payload).toEqual({
      workflow: "implement-feature",
      model: "gpt-5",
      promptTokens: 120000,
      cachedPromptTokens: 80000,
      completionTokens: 18000,
      reasoningTokens: 5000,
      inputCostPer1M: 5,
      cachedInputCostPer1M: 0.5,
      outputCostPer1M: 15,
      reasoningCostPer1M: 15,
      otherCost: 0.02,
      currency: "USD",
    });
  });

  it("calculates total estimated cost including cache, reasoning, and other cost", () => {
    const value = calculateEstimatedSessionCost({
      model: "example-model",
      promptTokens: 1_000_000,
      cachedPromptTokens: 500_000,
      completionTokens: 500_000,
      reasoningTokens: 250_000,
      inputCostPer1M: 2,
      cachedInputCostPer1M: 0.5,
      outputCostPer1M: 10,
      reasoningCostPer1M: 4,
      otherCost: 0.25,
      currency: "USD",
    });

    expect(value).toBe("USD 8.500000");
  });

  it("returns null cost when host usage is incomplete", () => {
    expect(
      calculateEstimatedSessionCost({
        promptTokens: 1000,
        inputCostPer1M: 2,
        currency: "USD",
      }),
    ).toBeNull();
  });

  it("triggers only for terminal workflow states", () => {
    expect(
      shouldFinalizeWorkflowTelemetry({
        activeWorkflow: "plan-feature",
        status: "running",
      }),
    ).toBe(false);
    expect(
      shouldFinalizeWorkflowTelemetry({
        activeWorkflow: "plan-feature",
        status: "completed",
      }),
    ).toBe(true);
    expect(
      shouldFinalizeWorkflowTelemetry({
        activeWorkflow: null,
        status: "completed",
      }),
    ).toBe(false);
  });

  it("finalizes workflow telemetry by calling the host invoker once", async () => {
    const invokeGetSessionCost = vi
      .fn()
      .mockResolvedValue({ ok: true, report: "telemetry" });

    const result = await finalizeWorkflowTelemetry({
      trigger: {
        activeWorkflow: "verify-work",
        status: "completed",
      },
      model: "gpt-5",
      usage: {
        promptTokens: 100,
        completionTokens: 50,
      },
      pricing: {
        inputCostPer1M: 1,
        outputCostPer1M: 2,
        currency: "USD",
      },
      invokeGetSessionCost,
    });

    expect(invokeGetSessionCost).toHaveBeenCalledTimes(1);
    expect(invokeGetSessionCost).toHaveBeenCalledWith({
      workflow: "verify-work",
      model: "gpt-5",
      promptTokens: 100,
      cachedPromptTokens: undefined,
      completionTokens: 50,
      reasoningTokens: undefined,
      inputCostPer1M: 1,
      cachedInputCostPer1M: undefined,
      outputCostPer1M: 2,
      reasoningCostPer1M: undefined,
      otherCost: undefined,
      currency: "USD",
    });
    expect(result).toEqual({ ok: true, report: "telemetry" });
  });
});
