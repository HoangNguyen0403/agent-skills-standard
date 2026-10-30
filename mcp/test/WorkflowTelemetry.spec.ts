import { describe, expect, it, vi } from "vitest";
import {
  buildSessionCostRequest,
  calculateEstimatedSessionCost,
  finalizeWorkflowTelemetry,
  summarizeSessionCostCoverage,
  shouldFinalizeWorkflowTelemetry,
} from "../src/services/WorkflowTelemetry";

describe("WorkflowTelemetry", () => {
  it("calculates total estimated cost including cache, reasoning, and other cost", () => {
    const value = calculateEstimatedSessionCost({
      model: "example-model",
      promptTokens: 1_000_000,
      cachedPromptTokens: 500_000,
      completionTokens: 500_000,
      reasoningTokens: 250_000,
      reasoningBilling: "separate",
      inputCostPer1M: 2,
      cachedInputCostPer1M: 0.5,
      outputCostPer1M: 10,
      reasoningCostPer1M: 4,
      otherCost: 0.25,
      currency: "USD",
    });

    expect(value).toBe("USD 8.500000");
  });

  it("prices included reasoning once when the host reports it inside completion tokens", () => {
    const value = calculateEstimatedSessionCost({
      model: "example-model",
      promptTokens: 1_000_000,
      cachedPromptTokens: 500_000,
      completionTokens: 500_000,
      reasoningTokens: 250_000,
      reasoningBilling: "included-in-output",
      inputCostPer1M: 2,
      cachedInputCostPer1M: 0.5,
      outputCostPer1M: 10,
      reasoningCostPer1M: 4,
      otherCost: 0.25,
      currency: "USD",
    });

    expect(value).toBe("USD 7.500000");
  });

  it("reports cost unavailable when overlapping reasoning billing semantics are undeclared", () => {
    const args = {
      model: "example-model",
      promptTokens: 1_000_000,
      completionTokens: 500_000,
      reasoningTokens: 250_000,
      inputCostPer1M: 2,
      outputCostPer1M: 10,
      reasoningCostPer1M: 4,
      currency: "USD",
    };

    expect(calculateEstimatedSessionCost(args)).toBeNull();

    const coverage = summarizeSessionCostCoverage(args);
    expect(coverage.costSource).toBe("unavailable");
    expect(coverage.exactCostAvailable).toBe(false);
    expect(coverage.missingHostFields).toContain("reasoningBilling");

    expect(
      calculateEstimatedSessionCost({
        ...args,
        reasoningCostPer1M: undefined,
      }),
    ).toBe("USD 7.000000");
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

  it("reports exactness and missing fields for partial host telemetry", () => {
    expect(
      summarizeSessionCostCoverage({
        promptTokens: 1000,
        inputCostPer1M: 2,
        currency: "USD",
      }),
    ).toEqual({
      estimatedCost: null,
      exactCostAvailable: false,
      missingHostFields: ["completionTokens", "outputCostPer1M"],
      costSource: "unavailable",
    });
  });

  it("requires cachedInputCostPer1M when cachedPromptTokens is positive", () => {
    const summary = summarizeSessionCostCoverage({
      promptTokens: 1_000_000,
      cachedPromptTokens: 500_000,
      completionTokens: 500_000,
      inputCostPer1M: 2,
      outputCostPer1M: 10,
      currency: "USD",
    });
    expect(summary.exactCostAvailable).toBe(false);
    expect(summary.missingHostFields).toContain("cachedInputCostPer1M");
    expect(summary.estimatedCost).toBeNull();
    expect(summary.costSource).toBe("unavailable");
  });

  it("requires reasoningCostPer1M when reasoningTokens is positive", () => {
    const summary = summarizeSessionCostCoverage({
      promptTokens: 1_000_000,
      completionTokens: 500_000,
      reasoningTokens: 250_000,
      inputCostPer1M: 2,
      outputCostPer1M: 10,
      currency: "USD",
    });
    expect(summary.exactCostAvailable).toBe(false);
    expect(summary.missingHostFields).toContain("reasoningCostPer1M");
    expect(summary.estimatedCost).toBeNull();
  });

  it("keeps cost coverage exact for included-in-output reasoning without a separate rate", () => {
    const args = {
      promptTokens: 1_000_000,
      completionTokens: 500_000,
      reasoningTokens: 250_000,
      reasoningBilling: "included-in-output" as const,
      inputCostPer1M: 2,
      outputCostPer1M: 10,
      currency: "USD",
    };

    const summary = summarizeSessionCostCoverage(args);
    expect(summary.missingHostFields).toEqual([]);
    expect(summary.exactCostAvailable).toBe(true);
    expect(summary.costSource).toBe("agent-estimate");
    expect(summary.estimatedCost).toBe(calculateEstimatedSessionCost(args));
    expect(summary.estimatedCost).toBe("USD 7.000000");
  });

  it("does not demand rates for known zero cache or reasoning buckets", () => {
    const summary = summarizeSessionCostCoverage({
      promptTokens: 1_000_000,
      cachedPromptTokens: 0,
      completionTokens: 500_000,
      reasoningTokens: 0,
      inputCostPer1M: 2,
      outputCostPer1M: 10,
      currency: "USD",
      costSource: "host",
    });
    expect(summary.exactCostAvailable).toBe(true);
    expect(summary.missingHostFields).toEqual([]);
    expect(summary.estimatedCost).toBe("USD 7.000000");
    expect(summary.costSource).toBe("host");
  });

  it("computes exact cost when all required rates are present", () => {
    const summary = summarizeSessionCostCoverage({
      promptTokens: 1_000_000,
      cachedPromptTokens: 500_000,
      completionTokens: 500_000,
      reasoningTokens: 250_000,
      reasoningBilling: "separate",
      inputCostPer1M: 2,
      cachedInputCostPer1M: 0.5,
      outputCostPer1M: 10,
      reasoningCostPer1M: 4,
      currency: "USD",
      costSource: "host",
    });
    expect(summary.exactCostAvailable).toBe(true);
    expect(summary.missingHostFields).toEqual([]);
    expect(summary.estimatedCost).toBe("USD 8.250000");
    expect(summary.costSource).toBe("host");
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
      costSource: "host",
    });
    expect(result).toEqual({ ok: true, report: "telemetry" });
  });

  it("reports host provenance only when the host adapter supplied the request", () => {
    expect(
      summarizeSessionCostCoverage(
        buildSessionCostRequest({
          workflow: "verify-work",
          usage: { promptTokens: 100, completionTokens: 50 },
          pricing: { inputCostPer1M: 1, outputCostPer1M: 2 },
        }),
      ).costSource,
    ).toBe("host");
  });

  it("defaults to agent-estimate provenance when tokens are hand-supplied without costSource", () => {
    expect(
      summarizeSessionCostCoverage({
        promptTokens: 100,
        completionTokens: 50,
        inputCostPer1M: 1,
        outputCostPer1M: 2,
      }).costSource,
    ).toBe("agent-estimate");
  });
});
