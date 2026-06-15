import {
  FinalizeWorkflowTelemetryOptions,
  RuntimePricingSnapshot,
  RuntimeUsageSnapshot,
  SessionCostRequest,
  finalizeWorkflowTelemetry,
} from "../src/services/WorkflowTelemetry";

type WorkflowStatus = "running" | "completed" | "failed" | "blocked";

interface McpClientLike {
  callTool(name: "get_session_cost", args: SessionCostRequest): Promise<string>;
}

interface WorkflowSessionState {
  activeWorkflow: string | null;
  model?: string;
  usage: RuntimeUsageSnapshot;
  pricing: RuntimePricingSnapshot;
}

/**
 * Example host-side adapter for runtimes such as Codex wrappers, OpenClaw, or
 * GoClaw orchestrators. Skills define the contract, but the host is responsible
 * for deciding when a workflow is active and when it has reached a terminal
 * state that should emit telemetry.
 */
export class WorkflowTelemetryAdapter {
  private session: WorkflowSessionState = {
    activeWorkflow: null,
    usage: {},
    pricing: {},
  };

  constructor(private readonly mcp: McpClientLike) {}

  startWorkflow(workflow: string, model?: string): void {
    this.session = {
      activeWorkflow: workflow,
      model,
      usage: {},
      pricing: {},
    };
  }

  mergeUsage(next: Partial<RuntimeUsageSnapshot>): void {
    this.session.usage = {
      ...this.session.usage,
      ...next,
    };
  }

  mergePricing(next: Partial<RuntimePricingSnapshot>): void {
    this.session.pricing = {
      ...this.session.pricing,
      ...next,
    };
  }

  async finalize(status: WorkflowStatus): Promise<string | null> {
    const options: FinalizeWorkflowTelemetryOptions<string> = {
      trigger: {
        activeWorkflow: this.session.activeWorkflow,
        status,
      },
      model: this.session.model,
      usage: this.session.usage,
      pricing: this.session.pricing,
      invokeGetSessionCost: async (args) =>
        await this.mcp.callTool("get_session_cost", args),
    };

    const report = await finalizeWorkflowTelemetry(options);
    this.session.activeWorkflow = null;
    return report;
  }
}

/**
 * Example integration sketch:
 *
 * const adapter = new WorkflowTelemetryAdapter(mcpClient);
 * adapter.startWorkflow("implement-feature", "gpt-5");
 *
 * // During the run, merge host/runtime usage metadata as it becomes available.
 * adapter.mergeUsage({
 *   promptTokens: 120000,
 *   cachedPromptTokens: 80000,
 *   completionTokens: 18000,
 *   reasoningTokens: 5000,
 * });
 * adapter.mergePricing({
 *   inputCostPer1M: 5,
 *   cachedInputCostPer1M: 0.5,
 *   outputCostPer1M: 15,
 *   reasoningCostPer1M: 15,
 *   otherCost: 0.02,
 *   currency: "USD",
 * });
 *
 * // When the host marks the workflow complete/failed/blocked:
 * const markdownReport = await adapter.finalize("completed");
 */

