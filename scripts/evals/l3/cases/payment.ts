import type { Id, PaymentView } from "../contracts.js";
import { validatePaymentPayload, validatePaymentResult } from "../contracts.js";
import type {
  CandidateProcessController,
  CandidateTransport,
  PaymentCaseVerdict,
  PaymentEvidenceCheck,
  ProviderLedgerEntry,
} from "./contracts.js";
import { ExchangeFailure, StrictExchangeSession } from "./exchange.js";
import { boundReason, boundReasons } from "./bounds.js";
import type { ExchangeResponse, PayloadValidator, ResultValidator } from "./exchange.js";
import { ProviderStub } from "./stubs.js";

/**
 * scripts/evals/l3/cases/payment.ts
 *
 * Payment fault driver and independent oracle.
 *
 * SRS: "Payment operation schemas" and the base / adverse / changed-constraint
 * fault schedules. The candidate owns deduplication, recovery and persistence;
 * this driver never supplies an idempotency key, never guesses an operation
 * reference, and never treats a candidate-returned label as evidence.
 */

type PaymentOperation = "submit" | "inspect" | "recover";

export type PaymentSchedule = "base" | "adverse" | "changed_constraint" | "negative_outcome_control";

interface ScheduleContext {
  readonly instructionId: Id;
  readonly failures: string[];
  readonly unverified: string[];
  readonly evidenceChecks: PaymentEvidenceCheck[];
  unknownViews: number;
  restartOccurred: boolean;
  finalNegativeObserved: boolean;
  committedDebits: number;
  duplicateAttempts: number;
}

const PAYLOAD_VALIDATOR: PayloadValidator = (operation, payload) => {
  validatePaymentPayload(operation as PaymentOperation, payload);
};

const RESULT_VALIDATOR: ResultValidator = (operation, result) => {
  validatePaymentResult(operation as PaymentOperation, result);
};

export interface PaymentDriverOptions {
  readonly defaultTimeoutMs?: number;
}

export class PaymentCaseDriver {
  private readonly session: StrictExchangeSession;

  public constructor(
    transport: CandidateTransport,
    private readonly controller: CandidateProcessController,
    private readonly providerStub: ProviderStub,
    options: PaymentDriverOptions = {}
  ) {
    this.session = new StrictExchangeSession(transport, {
      defaultTimeoutMs: options.defaultTimeoutMs,
    });
  }

  /**
   * Base schedule: submit, inspect, recover. Exactly one committed debit and
   * every evidence ID bound to the exact instruction.
   */
  public async runBaseSchedule(instructionId: Id = "payment-base-p1"): Promise<PaymentCaseVerdict> {
    return this.runSchedule("base", instructionId, async (ctx) => {
      const amountMinor = 1000;

      const submit = await this.call("submit", {
        instruction_id: instructionId,
        amount_minor: amountMinor,
        currency: "USD",
      });
      const submitView = this.readFinalView("submit", submit, ctx, instructionId, "succeeded", {
        requireFinal: false,
        amountMinor,
      });

      const inspect = await this.call("inspect", { instruction_id: instructionId });
      this.readFinalView("inspect", inspect, ctx, instructionId, "succeeded", {
        requireFinal: false,
        amountMinor,
      });

      const recover = await this.call("recover", { instruction_id: instructionId });
      this.readFinalView("recover", recover, ctx, instructionId, "succeeded", {
        requireFinal: false,
        amountMinor,
      });

      if (submitView === null) {
        ctx.failures.push("submit did not expose a payment view");
      }

      this.expectCommittedDebits(ctx, "base", 1);
      this.expectNoUnknownViews(ctx, "base");
    });
  }

  /**
   * Adverse schedule: provider commits the first debit and drops the reply; the
   * candidate must expose `unknown`, be restarted with its state volume, then
   * replay submit and recover while the lookup is pending without fabricating
   * finality. After the final positive settlement is published, recover must
   * produce final positive evidence, with exactly one committed debit.
   */
  public async runAdverseSchedule(instructionId: Id = "payment-adv-p1"): Promise<PaymentCaseVerdict> {
    return this.runSchedule("adverse", instructionId, async (ctx) => {
      const amountMinor = 2500;
      this.providerStub.dropNextDebitReply = true;

      await this.submitExpectingUnknown(ctx, instructionId, amountMinor, "dropped reply");

      const committed = this.providerStub.getCommittedDebits(instructionId);
      if (committed.length !== 1) {
        ctx.failures.push(
          `adverse: expected exactly 1 committed debit after the dropped reply, found ${committed.length}`
        );
        return;
      }
      const operationRef = this.operationRefOf(committed[0]);
      if (operationRef === null) {
        ctx.failures.push("adverse: committed debit entry carries no valid operation reference");
        return;
      }

      await this.restartProcess(ctx);
      this.providerStub.setPendingLookup(operationRef, true);

      const replaySubmit = await this.call("submit", {
        instruction_id: instructionId,
        amount_minor: amountMinor,
        currency: "USD",
      });
      this.readUnknownView("adverse replay submit (pending lookup)", replaySubmit, ctx, instructionId);
      this.expectCommittedDebits(ctx, "adverse replay submit", 1);

      const pendingRecover = await this.call("recover", { instruction_id: instructionId });
      this.readUnknownView("adverse recover (pending lookup)", pendingRecover, ctx, instructionId);
      this.expectCommittedDebits(ctx, "adverse recover while pending", 1);

      this.providerStub.setPendingLookup(operationRef, false);
      this.providerStub.setSettlement(instructionId, {
        evidence_id: "ev-settlement-final-positive",
        final: true,
        outcome: "succeeded",
      });

      const finalRecover = await this.call("recover", { instruction_id: instructionId });
      this.readFinalView("recover", finalRecover, ctx, instructionId, "succeeded", {
        requireFinal: true,
        amountMinor,
      });

      if (ctx.unknownViews < 2) {
        ctx.failures.push(
          `adverse: expected at least 2 unknown exposures (submit and recover while pending), saw ${ctx.unknownViews}`
        );
      }
      this.expectCommittedDebits(ctx, "adverse final", 1);
    });
  }

  /**
   * Changed-constraint schedule: provider deduplication disabled and lookup
   * unavailable. A commit/drop/replay must not produce a second debit, a
   * non-final absent settlement must remain `unknown`, and a final positive
   * settlement must then be exposed with bound evidence.
   */
  public async runChangedConstraintSchedule(
    instructionId: Id = "payment-cc-p1"
  ): Promise<PaymentCaseVerdict> {
    return this.runSchedule("changed_constraint", instructionId, async (ctx) => {
      const amountMinor = 5000;
      this.providerStub.deduplicationDisabled = true;
      this.providerStub.lookupUnavailable = true;
      this.providerStub.dropNextDebitReply = true;
      this.providerStub.setSettlement(instructionId, {
        evidence_id: "ev-settlement-absent-nonfinal",
        final: false,
        outcome: "absent",
      });

      await this.submitExpectingUnknown(ctx, instructionId, amountMinor, "dropped reply");

      await this.restartProcess(ctx);

      const replaySubmit = await this.call("submit", {
        instruction_id: instructionId,
        amount_minor: amountMinor,
        currency: "USD",
      });
      this.readUnknownView("changed-constraint replay submit", replaySubmit, ctx, instructionId);
      this.expectCommittedDebits(ctx, "changed-constraint replay submit", 1);

      const recover = await this.call("recover", { instruction_id: instructionId });
      this.readUnknownView("changed-constraint recover (non-final absent)", recover, ctx, instructionId);
      this.expectCommittedDebits(ctx, "changed-constraint recover while absent", 1);

      this.providerStub.setSettlement(instructionId, {
        evidence_id: "ev-settlement-final-positive-cc",
        final: true,
        outcome: "succeeded",
      });

      const finalRecover = await this.call("recover", { instruction_id: instructionId });
      this.readFinalView("recover", finalRecover, ctx, instructionId, "succeeded", {
        requireFinal: true,
        amountMinor,
      });

      this.expectCommittedDebits(ctx, "changed-constraint final", 1);
    });
  }

  /**
   * Separate fresh negative-outcome control: a final negative settlement must be
   * reported as `failed` with bound final evidence, and must not block a
   * subsequent instruction from committing exactly one debit.
   */
  public async runNegativeOutcomeControl(
    instructionId: Id = "payment-neg-ctrl",
    subsequentInstructionId: Id = "payment-neg-ctrl-subsequent"
  ): Promise<PaymentCaseVerdict> {
    return this.runSchedule("negative_outcome_control", instructionId, async (ctx) => {
      this.providerStub.setSettlement(instructionId, {
        evidence_id: "ev-settlement-final-negative",
        final: true,
        outcome: "failed",
      });

      const inspect = await this.call("inspect", { instruction_id: instructionId });
      const view = this.readFinalView("inspect", inspect, ctx, instructionId, "failed", {
        requireFinal: true,
      });
      if (view !== null && view.state === "failed") {
        ctx.finalNegativeObserved = true;
      }

      this.expectCommittedDebits(ctx, "negative-outcome control", 0);

      const subsequentAmount = 1200;
      const submit = await this.call("submit", {
        instruction_id: subsequentInstructionId,
        amount_minor: subsequentAmount,
        currency: "USD",
      });
      this.readFinalView("submit", submit, ctx, subsequentInstructionId, "succeeded", {
        requireFinal: false,
        amountMinor: subsequentAmount,
      });

      const subsequentCommitted = this.providerStub.getCommittedDebits(subsequentInstructionId);
      if (subsequentCommitted.length !== 1) {
        ctx.failures.push(
          `negative-outcome control: expected exactly 1 committed debit for the subsequent instruction, found ${subsequentCommitted.length}`
        );
      }
      if (this.providerStub.getCommittedDebits(instructionId).length !== 0) {
        ctx.failures.push("negative-outcome control: the failed instruction must not commit a debit");
      }
    });
  }

  private async runSchedule(
    schedule: PaymentSchedule,
    instructionId: Id,
    body: (ctx: ScheduleContext) => Promise<void>
  ): Promise<PaymentCaseVerdict> {
    const ctx: ScheduleContext = {
      instructionId,
      failures: [],
      unverified: [],
      evidenceChecks: [],
      unknownViews: 0,
      restartOccurred: false,
      finalNegativeObserved: false,
      committedDebits: 0,
      duplicateAttempts: 0,
    };

    try {
      await this.prepareFreshState();
      await body(ctx);
    } catch (err) {
      if (err instanceof ExchangeFailure) {
        ctx.failures.push(`${err.kind} failure: ${err.message}`);
      } else {
        ctx.failures.push(`driver error: ${(err as Error).message}`);
      }
    }

    if (this.providerStub.isExhausted) {
      ctx.unverified.push(
        "trusted provider stub exhausted its bounded observation ledger; coverage is incomplete"
      );
    }

    ctx.committedDebits = this.providerStub.getCommittedDebits(instructionId).length;
    ctx.duplicateAttempts = this.providerStub
      .getDebitAttempts(instructionId)
      .filter((entry) => entry.duplicate).length;

    const failureReasons = boundReasons(ctx.failures);
    const unverifiedReasons = boundReasons(ctx.unverified);

    return {
      case_id: "payment",
      schedule,
      passed: ctx.failures.length === 0 && ctx.unverified.length === 0,
      instruction_id: instructionId,
      committed_debits: ctx.committedDebits,
      duplicate_debit_attempts: ctx.duplicateAttempts,
      unknown_views_observed: ctx.unknownViews,
      final_negative_observed: ctx.finalNegativeObserved,
      restart_occurred: ctx.restartOccurred,
      evidence_checks: ctx.evidenceChecks.map((check) => ({
        ...check,
        reason: boundReason(check.reason),
      })),
      failure_reasons: failureReasons.reasons,
      unverified_reasons: unverifiedReasons.reasons,
      failure_reason_count: failureReasons.count,
      unverified_reason_count: unverifiedReasons.count,
    };
  }

  private async prepareFreshState(): Promise<void> {
    this.providerStub.reset();
    await this.controller.resetState();
    this.session.beginProcessSession();
  }

  private async restartProcess(ctx: ScheduleContext): Promise<void> {
    await this.controller.restartRetainingState();
    this.session.beginProcessSession();
    ctx.restartOccurred = true;
    if (this.session.expectedSeq !== 1) {
      ctx.failures.push("restart did not reopen the candidate session at seq 1");
    }
  }

  private async submitExpectingUnknown(
    ctx: ScheduleContext,
    instructionId: Id,
    amountMinor: number,
    condition: string
  ): Promise<void> {
    const submit = await this.call("submit", {
      instruction_id: instructionId,
      amount_minor: amountMinor,
      currency: "USD",
    });
    this.readUnknownView(`submit after ${condition}`, submit, ctx, instructionId);
  }

  /**
   * A final state claim requires at least one evidence ID, and every claimed ID
   * must be bound in the trusted ledger to this instruction, this outcome and
   * (where required) final settlement.
   */
  private readFinalView(
    operation: PaymentOperation,
    envelope: ExchangeResponse,
    ctx: ScheduleContext,
    instructionId: Id,
    expectedState: "succeeded" | "failed",
    options: { readonly requireFinal: boolean; readonly amountMinor?: number }
  ): PaymentView | null {
    if (!envelope.ok) {
      ctx.failures.push(`${operation} rejected: ${envelope.error.code}: ${envelope.error.message}`);
      return null;
    }
    const view = validatePaymentResult(operation, envelope.result);
    if (view.instruction_id !== instructionId) {
      ctx.failures.push(
        `${operation} answered for instruction '${view.instruction_id}', expected '${instructionId}'`
      );
      return null;
    }
    if (view.state !== expectedState) {
      ctx.failures.push(`${operation} state '${view.state}', expected '${expectedState}'`);
    }
    this.recordEvidence(view, ctx, instructionId, expectedState, {
      requireFinal: options.requireFinal,
      amountMinor: options.amountMinor,
    });
    return view;
  }

  private readUnknownView(
    context: string,
    envelope: ExchangeResponse,
    ctx: ScheduleContext,
    instructionId: Id
  ): void {
    if (!envelope.ok) {
      ctx.failures.push(`${context}: candidate returned error ${envelope.error.code} instead of an unknown view`);
      return;
    }
    const view = validatePaymentResult("recover", envelope.result);
    if (view.instruction_id !== instructionId) {
      ctx.failures.push(`${context}: answered for instruction '${view.instruction_id}'`);
      return;
    }
    if (view.state === "unknown") {
      ctx.unknownViews += 1;
    } else {
      ctx.failures.push(`${context}: state '${view.state}', expected 'unknown'`);
    }
    // No claimed evidence may already certify finality while the outcome is unknown.
    for (const evidenceId of view.evidence_ids) {
      const verdict = this.providerStub.verifyEvidence({
        evidence_id: evidenceId,
        instruction_id: instructionId,
        expected_outcome: view.state === "failed" ? "failed" : "succeeded",
        require_final: true,
      });
      if (verdict.accepted) {
        ctx.failures.push(
          `${context}: evidence '${evidenceId}' already certifies a final outcome while state is unknown (${verdict.reason})`
        );
      }
    }
  }

  private recordEvidence(
    view: PaymentView,
    ctx: ScheduleContext,
    instructionId: Id,
    expectedOutcome: "succeeded" | "failed",
    options: { readonly requireFinal: boolean; readonly amountMinor?: number }
  ): void {
    if (view.evidence_ids.length === 0) {
      ctx.failures.push(
        `state '${view.state}' for instruction '${instructionId}' was claimed without evidence_ids`
      );
      return;
    }
    for (const evidenceId of view.evidence_ids) {
      const verdict = this.providerStub.verifyEvidence({
        evidence_id: evidenceId,
        instruction_id: instructionId,
        expected_outcome: expectedOutcome,
        require_final: options.requireFinal,
        amount_minor: options.amountMinor,
        currency: "USD",
      });
      ctx.evidenceChecks.push({
        evidence_id: evidenceId,
        instruction_id: instructionId,
        expected_outcome: expectedOutcome,
        accepted: verdict.accepted,
        reason: verdict.reason,
      });
      if (!verdict.accepted) {
        ctx.failures.push(`evidence '${evidenceId}' rejected: ${verdict.reason}`);
      }
    }
  }

  private expectCommittedDebits(ctx: ScheduleContext, phase: string, expected: number): void {
    const committed = this.providerStub.getCommittedDebits(ctx.instructionId);
    if (committed.length !== expected) {
      ctx.failures.push(
        `${phase}: expected ${expected} committed debit(s) for instruction '${ctx.instructionId}', found ${committed.length}`
      );
    }
  }

  private expectNoUnknownViews(ctx: ScheduleContext, phase: string): void {
    if (ctx.unknownViews !== 0) {
      ctx.failures.push(`${phase}: unexpected unknown exposures (${ctx.unknownViews})`);
    }
  }

  private operationRefOf(entry: ProviderLedgerEntry): Id | null {
    const payload = entry.payload;
    if (payload === null || !("operation_ref" in payload)) return null;
    const operationRef = payload.operation_ref;
    return typeof operationRef === "string" ? operationRef : null;
  }

  private call(
    operation: PaymentOperation,
    payload: Record<string, unknown>
  ): Promise<ExchangeResponse> {
    return this.session.call(operation, payload, {
      validatePayload: PAYLOAD_VALIDATOR,
      validateResult: RESULT_VALIDATOR,
    });
  }
}
