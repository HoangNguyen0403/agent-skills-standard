import type { Id, TenantDoc, TenantItem, TenantTrace } from "../contracts.js";
import {
  strictObject,
  validateId,
  validateStringBound,
  validateTenantPayload,
  validateTenantResult,
} from "../contracts.js";
import type {
  CandidateProcessController,
  CandidateSnapshotHandle,
  CandidateTransport,
  TenantCaseVerdict,
  TenantFrozenStage,
  TenantStageName,
  TenantStageObservation,
  TenantStageReader,
} from "./contracts.js";
import { TENANT_STAGE_NAMES } from "./contracts.js";
import { ExchangeFailure, StrictExchangeSession } from "./exchange.js";
import { boundReasons } from "./bounds.js";
import type { ExchangeResponse, PayloadValidator, ResultValidator } from "./exchange.js";
import {
  CANARY_A1,
  CANARY_B1,
  EXPECTED_ITEMS_A_POST_REVOKE,
  EXPECTED_ITEMS_A_PRE_REVOKE,
  EXPECTED_ITEMS_B,
  TENANT_A,
  TENANT_B,
  TENANT_UNAUTHORIZED,
  TRUSTED_DOCUMENTS,
} from "./fixtures.js";

/**
 * scripts/evals/l3/cases/tenant.ts
 *
 * Tenant fault driver and independent stage oracle.
 *
 * SRS: "Tenant operation schemas" and "Required intermediate observation".
 * The candidate owns authorization, cache behaviour and restore semantics; this
 * driver owns the trusted dataset, the mutation timeline and the comparison of
 * every observed item against source canaries and provenance. Candidate-provided
 * owner labels and counters are never treated as evidence.
 */

type TenantOperation = "ingest" | "query" | "reindex" | "revoke" | "export" | "restore";

const PAYLOAD_VALIDATOR: PayloadValidator = (operation, payload) => {
  validateTenantPayload(operation as TenantOperation, payload);
};

const RESULT_VALIDATOR: ResultValidator = (operation, result) => {
  validateTenantResult(operation as TenantOperation, result);
};

const MAX_STAGE_RECORDS = 256;

export interface TenantDriverOptions {
  readonly defaultTimeoutMs?: number;
}

interface TenantContext {
  readonly failures: string[];
  readonly unverified: string[];
  readonly observations: TenantStageObservation[];
  /** Documents the driver has revoked; no external result may return them. */
  readonly revoked: Set<Id>;
  crossTenantLeakage: boolean;
  revocationLinearized: boolean;
  snapshotRestoredCleanly: boolean;
  unauthorizedMutationDetected: boolean;
  unauthorizedRejected: number;
}

export class TenantCaseDriver {
  private readonly session: StrictExchangeSession;

  public constructor(
    transport: CandidateTransport,
    private readonly controller: CandidateProcessController,
    private readonly stageReader: TenantStageReader,
    options: TenantDriverOptions = {}
  ) {
    this.session = new StrictExchangeSession(transport, {
      defaultTimeoutMs: options.defaultTimeoutMs,
    });
  }

  public async runSchedule(): Promise<TenantCaseVerdict> {
    const ctx: TenantContext = {
      failures: [],
      unverified: [],
      observations: [],
      revoked: new Set<Id>(),
      crossTenantLeakage: false,
      revocationLinearized: false,
      snapshotRestoredCleanly: false,
      unauthorizedMutationDetected: false,
      unauthorizedRejected: 0,
    };

    try {
      await this.prepareFreshState();
      await this.execute(ctx);
    } catch (err) {
      if (err instanceof ExchangeFailure) {
        ctx.failures.push(`${err.kind} failure: ${err.message}`);
      } else {
        ctx.failures.push(`driver error: ${(err as Error).message}`);
      }
    }

    const complete =
      ctx.observations.length === TENANT_STAGE_NAMES.length + 1 &&
      ctx.observations.every((observation) => observation.available && observation.correspondence_verified);
    const failureReasons = boundReasons(ctx.failures);
    const unverifiedReasons = boundReasons(ctx.unverified);

    return {
      case_id: "tenant",
      passed: ctx.failures.length === 0 && ctx.unverified.length === 0,
      cross_tenant_leakage_detected: ctx.crossTenantLeakage,
      revocation_linearized: ctx.revocationLinearized,
      intermediate_stage_observations: ctx.observations,
      intermediate_observations_complete: complete,
      snapshot_restored_cleanly: ctx.snapshotRestoredCleanly,
      unauthorized_mutation_detected: ctx.unauthorizedMutationDetected,
      unauthorized_requests_rejected: ctx.unauthorizedRejected,
      failure_reasons: failureReasons.reasons,
      unverified_reasons: unverifiedReasons.reasons,
      failure_reason_count: failureReasons.count,
      unverified_reason_count: unverifiedReasons.count,
    };
  }

  private async execute(ctx: TenantContext): Promise<void> {
    await this.ingest(ctx, CANARY_A1);
    await this.ingest(ctx, CANARY_B1);

    const query1 = await this.query(ctx, TENANT_A, "TOKEN");
    if (query1 === null) {
      ctx.unverified.push("initial tenant query unavailable; retrieval coverage cannot be established");
    } else {
      if (!containsCanary(query1.items, CANARY_A1)) {
        ctx.failures.push(
          "legitimate pre-revocation A1 retrieval failed: the trusted canary was not returned to tenant A"
        );
      }
      if (containsCanary(query1.items, CANARY_B1)) {
        ctx.crossTenantLeakage = true;
        ctx.failures.push("cross-tenant leakage in the initial tenant A query");
      }
    }

    const reindex = await this.call("reindex", {
      document_id: CANARY_B1.document_id,
      derived_owner: TENANT_A,
    });
    if (!reindex.ok) {
      ctx.failures.push(`reindex request rejected: ${reindex.error.code}: ${reindex.error.message}`);
    } else {
      const result = validateTenantResult("reindex", reindex.result) as {
        document_id: Id;
        status: "applied" | "quarantined";
      };
      if (result.document_id !== CANARY_B1.document_id) {
        ctx.failures.push(
          `reindex answered for document '${result.document_id}', expected '${CANARY_B1.document_id}'`
        );
      }
    }

    const query2 = await this.query(ctx, TENANT_A, "TOKEN");
    if (query2 === null) {
      ctx.unverified.push("post-reindex query unavailable; stage correspondence cannot be established");
    } else if (containsCanary(query2.items, CANARY_B1)) {
      ctx.crossTenantLeakage = true;
      ctx.failures.push("cross-tenant leakage after the stale derived-owner reindex");
    }

    await this.observeFrozenStages(ctx, query2?.trace ?? null);

    let preRevocationSnapshotId: Id | null = null;
    const preExport = await this.export(ctx, TENANT_A);
    if (preExport !== null) {
      preRevocationSnapshotId = preExport.snapshot_id;
      this.expectExactItems(
        ctx,
        preExport.items,
        EXPECTED_ITEMS_A_PRE_REVOKE,
        "pre-revocation export for tenant A"
      );
    }

    const revoke = await this.call("revoke", {
      tenant: TENANT_A,
      document_id: CANARY_A1.document_id,
    });
    if (!revoke.ok) {
      ctx.failures.push(`revoke rejected: ${revoke.error.code}: ${revoke.error.message}`);
    } else {
      const result = validateTenantResult("revoke", revoke.result) as {
        document_id: Id;
        revocation_id: Id;
      };
      if (result.document_id !== CANARY_A1.document_id) {
        ctx.failures.push(
          `revoke answered for document '${result.document_id}', expected '${CANARY_A1.document_id}'`
        );
      } else {
        ctx.revoked.add(CANARY_A1.document_id);
      }
    }

    const postQuery = await this.query(ctx, TENANT_A, "TOKEN");
    if (postQuery === null) {
      ctx.unverified.push("post-revocation query unavailable; linearization cannot be confirmed");
    } else if (containsCanary(postQuery.items, CANARY_A1)) {
      ctx.failures.push("revocation linearization broken: revoked A1 returned by a post-revocation query");
    } else if (
      this.expectExactItems(
        ctx,
        postQuery.items,
        EXPECTED_ITEMS_A_POST_REVOKE,
        "post-revocation query for tenant A"
      )
    ) {
      ctx.revocationLinearized = true;
    }

    const postExport = await this.export(ctx, TENANT_A);
    if (postExport !== null) {
      if (containsCanary(postExport.items, CANARY_A1)) {
        ctx.failures.push(
          "revocation linearization broken: revoked A1 returned in a post-revocation export"
        );
      }
      this.expectExactItems(
        ctx,
        postExport.items,
        EXPECTED_ITEMS_A_POST_REVOKE,
        "post-revocation export for tenant A"
      );
    }

    if (preRevocationSnapshotId === null) {
      ctx.unverified.push("no pre-revocation snapshot was issued; restore/resurrection cannot be observed");
    } else {
      await this.restoreAndVerify(ctx, preRevocationSnapshotId);
    }

    await this.probeUnauthorizedTenants(ctx, preRevocationSnapshotId);
  }

  /**
   * Pause-freeze the SAME candidate process, read the declared intermediate
   * stages through the isolated reader, compare them with the public trace and
   * resume. Any missing, unreadable or unreviewed stage stays unverified; it is
   * never silently converted into a pass, and inspection never restarts the
   * process.
   */
  private async observeFrozenStages(ctx: TenantContext, publicTrace: TenantTrace | null): Promise<void> {
    let snapshot: CandidateSnapshotHandle | null = null;

    try {
      snapshot = await this.controller.freezeAndSnapshot();
      if (snapshot === null) {
        ctx.observations.push({
          stage: "snapshot",
          observed_at_step: "post-reindex",
          snapshot_id: null,
          record_count: 0,
          available: false,
          correspondence_verified: false,
          note: "controller could not freeze and snapshot the attempt state",
        });
        ctx.unverified.push("intermediate freeze/snapshot unavailable; whole-case pass prohibited");
        return;
      }

      const snapshotId = validateId(snapshot.snapshot_id, "snapshot_id");
      ctx.observations.push({
        stage: "snapshot",
        observed_at_step: "post-reindex",
        snapshot_id: snapshotId,
        record_count: 0,
        available: true,
        correspondence_verified: true,
        note: "frozen attempt-state snapshot taken by the controller",
      });

      let stages: readonly TenantFrozenStage[] | null;
      try {
        stages = await this.stageReader.readFrozenStages(snapshotId);
      } catch (err) {
        ctx.unverified.push(`stage reader failed: ${(err as Error).message}`);
        return;
      }
      if (stages === null) {
        ctx.unverified.push("stage reader returned no records for the frozen snapshot");
        return;
      }

      const seenStages = new Set<TenantStageName>();
      for (const [index, stage] of stages.entries()) {
        const name = stage.stage;
        if (!TENANT_STAGE_NAMES.includes(name)) {
          ctx.unverified.push(`stage reader returned an unknown stage '${String(name)}'`);
          continue;
        }
        if (seenStages.has(name)) {
          ctx.unverified.push(`stage reader returned duplicate stage '${name}'`);
          continue;
        }
        seenStages.add(name);
        if (stage.sequence !== index) {
          ctx.unverified.push(
            `stage '${name}' observation sequence ${stage.sequence} is not contiguous at index ${index}`
          );
        }
        this.checkFrozenStage(ctx, name, stage, publicTrace);
      }

      for (const name of TENANT_STAGE_NAMES) {
        if (!seenStages.has(name)) {
          ctx.unverified.push(`stage '${name}' had no independent observation`);
          ctx.observations.push({
            stage: name,
            observed_at_step: "post-reindex",
            snapshot_id: snapshotId,
            record_count: 0,
            available: false,
            correspondence_verified: false,
            note: "stage absent from the frozen observation",
          });
        }
      }
    } catch (err) {
      ctx.unverified.push(`intermediate observation failed: ${(err as Error).message}`);
    } finally {
      try {
        await this.controller.resume();
      } catch (err) {
        ctx.failures.push(`resuming the frozen candidate process failed: ${(err as Error).message}`);
      }
    }
  }

  private checkFrozenStage(
    ctx: TenantContext,
    stage: TenantStageName,
    frozen: TenantFrozenStage,
    publicTrace: TenantTrace | null
  ): void {
    const accepted = this.stageReader.isStageCorrespondenceAccepted(stage);
    const records = frozen.records;

    if (records.length > MAX_STAGE_RECORDS) {
      ctx.unverified.push(`stage '${stage}' exceeded the bounded record limit (${records.length})`);
    }

    let valid = true;
    for (const [index, record] of records.entries()) {
      const checked = this.checkItem(record, TENANT_A, `stage '${stage}' record ${index}`, ctx);
      if (checked === null) {
        valid = false;
      } else if (checked.owner !== TENANT_A) {
        ctx.crossTenantLeakage = true;
        ctx.failures.push(`stage '${stage}' record ${index} belongs to another tenant`);
        valid = false;
      }
    }

    const recordIds = new Set(records.map((record) => record.document_id));
    for (const sourceId of frozen.source_document_ids) {
      if (!TRUSTED_DOCUMENTS.has(sourceId)) {
        ctx.failures.push(`stage '${stage}' declares unknown provenance document '${sourceId}'`);
        valid = false;
      } else if (!recordIds.has(sourceId)) {
        ctx.unverified.push(
          `stage '${stage}' provenance '${sourceId}' has no corresponding record`
        );
      }
    }

    let correspondence = valid && accepted;
    if (!accepted) {
      ctx.unverified.push(
        `stage '${stage}' correspondence to the declared candidate artifact location is not independently accepted`
      );
    }

    if (publicTrace === null) {
      correspondence = false;
      ctx.unverified.push(`stage '${stage}' cannot be compared: no public trace was observed`);
    } else {
      const traceItems = traceStage(publicTrace, stage);
      const traceIds = new Set(traceItems.map((item) => item.document_id));
      if (!sameIdSet(traceIds, recordIds)) {
        correspondence = false;
        ctx.unverified.push(
          `stage '${stage}' record IDs do not correspond to the public trace stage`
        );
      }
      for (const [index, item] of traceItems.entries()) {
        if (this.checkItem(item, TENANT_A, `public trace '${stage}' item ${index}`, ctx) === null) {
          correspondence = false;
        }
      }
    }

    ctx.observations.push({
      stage,
      observed_at_step: "post-reindex",
      snapshot_id: null,
      record_count: records.length,
      available: valid,
      correspondence_verified: correspondence,
      note: correspondence
        ? "frozen stage matches the public trace and trusted canaries"
        : "frozen stage could not be independently matched",
    });
  }

  private async restoreAndVerify(ctx: TenantContext, snapshotId: Id): Promise<void> {
    const restore = await this.call("restore", { tenant: TENANT_A, snapshot_id: snapshotId });
    if (!restore.ok) {
      ctx.failures.push(`restore rejected: ${restore.error.code}: ${restore.error.message}`);
      return;
    }
    const restored = validateTenantResult("restore", restore.result) as {
      items: readonly TenantItem[];
      trace: TenantTrace;
    };

    // The restore response is external output too: its items AND every trace
    // stage must match the trusted dataset, the source owner and the current
    // revocation set before it can count as clean.
    for (const [index, item] of restored.items.entries()) {
      this.checkItem(item, TENANT_A, `restore item ${index}`, ctx);
    }
    for (const stage of TENANT_STAGE_NAMES) {
      for (const [index, item] of traceStage(restored.trace, stage).entries()) {
        this.checkItem(item, TENANT_A, `restore trace '${stage}' item ${index}`, ctx);
      }
    }
    if (containsCanary(restored.items, CANARY_A1)) {
      ctx.failures.push("restore resurrection violation: revoked A1 reappeared in the restored item set");
      return;
    }

    const query = await this.query(ctx, TENANT_A, "TOKEN");
    if (query === null) {
      ctx.unverified.push("post-restore query unavailable; resurrection cannot be confirmed");
      return;
    }
    if (containsCanary(query.items, CANARY_A1)) {
      ctx.failures.push("restore resurrection violation: revoked A1 reappeared after snapshot restore");
      return;
    }
    ctx.snapshotRestoredCleanly = true;
  }

  private async probeUnauthorizedTenants(ctx: TenantContext, snapshotId: Id | null): Promise<void> {
    const beforeB = await this.query(ctx, TENANT_B, "TOKEN");
    if (beforeB === null) {
      ctx.unverified.push("tenant B baseline query unavailable; no-mutation check cannot be established");
      return;
    }
    this.expectExactItems(ctx, beforeB.items, EXPECTED_ITEMS_B, "tenant B baseline");

    const exportProbe = await this.call("export", { tenant: TENANT_UNAUTHORIZED });
    this.expectRejected(ctx, exportProbe, "unauthorized export");

    const revokeProbe = await this.call("revoke", {
      tenant: TENANT_UNAUTHORIZED,
      document_id: CANARY_B1.document_id,
    });
    this.expectRejected(ctx, revokeProbe, "unauthorized revoke");

    if (snapshotId !== null) {
      const restoreProbe = await this.call("restore", {
        tenant: TENANT_UNAUTHORIZED,
        snapshot_id: snapshotId,
      });
      this.expectRejected(ctx, restoreProbe, "unauthorized restore");
    }

    const afterB = await this.query(ctx, TENANT_B, "TOKEN");
    if (afterB === null) {
      ctx.unverified.push("tenant B post-probe query unavailable; mutation cannot be excluded");
      return;
    }
    if (!sameItemSet(afterB.items, beforeB.items)) {
      ctx.unauthorizedMutationDetected = true;
      ctx.failures.push("unauthorized calls mutated tenant B state");
    }
    this.expectExactItems(ctx, afterB.items, EXPECTED_ITEMS_B, "tenant B after unauthorized probes");

    const afterA = await this.export(ctx, TENANT_A);
    if (afterA !== null) {
      if (afterA.items.length !== EXPECTED_ITEMS_A_POST_REVOKE.length) {
        ctx.unauthorizedMutationDetected = true;
        ctx.failures.push(
          `tenant A state changed after unauthorized probes: ${afterA.items.length} item(s), expected ${EXPECTED_ITEMS_A_POST_REVOKE.length}`
        );
      }
    }

  }

  private async ingest(ctx: TenantContext, document: TenantDoc): Promise<void> {
    const response = await this.call("ingest", { document });
    if (!response.ok) {
      ctx.failures.push(
        `ingest of '${document.document_id}' rejected: ${response.error.code}: ${response.error.message}`
      );
      return;
    }
    const result = validateTenantResult("ingest", response.result) as { document_id: Id };
    if (result.document_id !== document.document_id) {
      ctx.failures.push(
        `ingest answered for '${result.document_id}', expected '${document.document_id}'`
      );
    }
  }

  private async query(
    ctx: TenantContext,
    tenant: Id,
    text: string
  ): Promise<{ items: readonly TenantItem[]; trace: TenantTrace } | null> {
    const response = await this.call("query", { tenant, query: text });
    if (!response.ok) {
      ctx.failures.push(`query for tenant '${tenant}' rejected: ${response.error.code}: ${response.error.message}`);
      return null;
    }
    const result = validateTenantResult("query", response.result) as {
      items: readonly TenantItem[];
      trace: TenantTrace;
    };

    let valid = true;
    for (const [index, item] of result.items.entries()) {
      if (this.checkItem(item, tenant, `query item ${index}`, ctx) === null) valid = false;
    }
    for (const stage of TENANT_STAGE_NAMES) {
      for (const [index, item] of traceStage(result.trace, stage).entries()) {
        if (this.checkItem(item, tenant, `query trace '${stage}' item ${index}`, ctx) === null) {
          valid = false;
        }
      }
    }
    return valid ? result : null;
  }

  private async export(
    ctx: TenantContext,
    tenant: Id
  ): Promise<{ items: readonly TenantItem[]; snapshot_id: Id } | null> {
    const response = await this.call("export", { tenant });
    if (!response.ok) {
      ctx.failures.push(`export for tenant '${tenant}' rejected: ${response.error.code}: ${response.error.message}`);
      return null;
    }
    const result = validateTenantResult("export", response.result) as {
      items: readonly TenantItem[];
      snapshot_id: Id;
    };
    for (const [index, item] of result.items.entries()) {
      this.checkItem(item, tenant, `export item ${index}`, ctx);
    }
    return result;
  }

  /**
   * Compare one observed item against the trusted dataset (document identity,
   * content canary and source owner) and flag cross-tenant exposure.
   * Returns `null` when the item is not trustworthy.
   */
  private checkItem(
    raw: unknown,
    tenant: Id,
    context: string,
    ctx: TenantContext
  ): TenantItem | null {
    let item: TenantItem;
    try {
      const obj = strictObject(raw, context, ["document_id", "owner", "content"]);
      item = {
        document_id: validateId(obj.document_id, `${context}.document_id`),
        owner: validateId(obj.owner, `${context}.owner`),
        content: validateStringBound(obj.content, `${context}.content`),
      };
    } catch (err) {
      ctx.failures.push(`${context}: malformed item (${(err as Error).message})`);
      return null;
    }

    const trusted = TRUSTED_DOCUMENTS.get(item.document_id);
    if (trusted === undefined) {
      ctx.failures.push(`${context}: unknown document '${item.document_id}' is not in the trusted dataset`);
      return null;
    }
    if (item.content !== trusted.content) {
      ctx.failures.push(`${context}: content does not match the trusted canary for '${item.document_id}'`);
      return null;
    }
    if (item.owner !== trusted.owner) {
      ctx.failures.push(`${context}: owner label does not match the trusted source for '${item.document_id}'`);
      return null;
    }
    if (ctx.revoked.has(item.document_id)) {
      ctx.failures.push(`${context}: revoked document '${item.document_id}' was returned by the candidate`);
      return null;
    }
    if (trusted.owner !== tenant) {
      ctx.crossTenantLeakage = true;
      ctx.failures.push(`${context}: document '${item.document_id}' of tenant '${trusted.owner}' exposed to '${tenant}'`);
      return null;
    }
    return item;
  }

  private expectExactItems(
    ctx: TenantContext,
    items: readonly TenantItem[],
    expected: readonly TenantItem[],
    context: string
  ): boolean {
    if (!sameItemSet(items, expected)) {
      ctx.failures.push(
        `${context}: observed item set does not match the trusted expectation (${items.length} vs ${expected.length})`
      );
      return false;
    }
    return true;
  }

  private expectRejected(ctx: TenantContext, response: ExchangeResponse, context: string): void {
    if (response.ok) {
      ctx.failures.push(`${context}: request succeeded instead of being refused`);
      ctx.crossTenantLeakage = true;
      return;
    }
    if (response.error.code !== "FORBIDDEN" && response.error.code !== "NOT_FOUND") {
      ctx.failures.push(`${context}: expected FORBIDDEN/NOT_FOUND, got ${response.error.code}`);
      return;
    }
    ctx.unauthorizedRejected += 1;
  }

  private async prepareFreshState(): Promise<void> {
    await this.controller.resetState();
    this.session.beginProcessSession();
  }

  private call(operation: TenantOperation, payload: Record<string, unknown>): Promise<ExchangeResponse> {
    return this.session.call(operation, payload, {
      validatePayload: PAYLOAD_VALIDATOR,
      validateResult: RESULT_VALIDATOR,
    });
  }
}

function traceStage(trace: TenantTrace, stage: TenantStageName): readonly TenantItem[] {
  return stage === "retrieval" ? trace.retrieved : stage === "rerank" ? trace.reranked : trace.cached;
}

function containsCanary(items: readonly TenantItem[], canary: TenantDoc): boolean {
  return items.some(
    (item) => item.document_id === canary.document_id || item.content.includes(canary.content)
  );
}

function sameIdSet(a: ReadonlySet<Id>, b: ReadonlySet<Id>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

function sameItemSet(a: readonly TenantItem[], b: readonly TenantItem[]): boolean {
  if (a.length !== b.length) return false;
  const index = new Map(b.map((item) => [item.document_id, item]));
  for (const item of a) {
    const other = index.get(item.document_id);
    if (other === undefined) return false;
    if (other.owner !== item.owner || other.content !== item.content) return false;
  }
  return true;
}
