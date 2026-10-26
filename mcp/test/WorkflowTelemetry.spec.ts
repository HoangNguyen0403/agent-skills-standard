import { describe, expect, it } from "vitest";
import {
  buildSessionCostRequest,
  calculateEstimatedSessionCost,
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
