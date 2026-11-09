import assert from "node:assert/strict";
import test from "node:test";

import {
  ERROR_CODES,
  OVERLOAD_LIMIT_CEILINGS,
  JsonlFrameCodec,
  SingleFlightSessionTracker,
  parseProviderRequestEnvelope,
  parseProviderResponseEnvelope,
  parseRequestEnvelope,
  parseResponseEnvelope,
  validateOverloadLimits,
  validateOverloadPayload,
  validateOverloadResult,
  validatePaymentPayload,
  validatePaymentResult,
  validateProviderPayload,
  validateProviderResult,
  validateSummarizerPayload,
  validateSummarizerResult,
  validateTenantPayload,
  validateTenantResult,
  isProtocolArmId,
} from "./contracts";

// ---------------------------------------------------------------------------
// Protocol / arm separation
// ---------------------------------------------------------------------------

test("SRS-006: arm IDs are artifact-v1 only; legacy transcript arms are not admitted", () => {
  assert.equal(isProtocolArmId("A0"), true);
  assert.equal(isProtocolArmId("A2"), true);
  for (const legacy of ["baseline", "with-skill", "A3", "a0", "", "A0 ", null, 0]) {
    assert.equal(isProtocolArmId(legacy), false);
  }
});

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

test("SRS-003: request envelope rejects wrong version, seq, operation and unknown fields", () => {
  const parsed = parseRequestEnvelope({
    version: 1,
    seq: 1,
    operation: "submit",
    payload: { instruction_id: "inst-1", amount_minor: 100, currency: "USD" },
  });
  assert.equal(parsed.seq, 1);
  assert.equal(parsed.operation, "submit");

  assert.throws(
    () => parseRequestEnvelope({ version: 2, seq: 1, operation: "submit", payload: {} }),
    /version/i
  );
  for (const badSeq of [0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => parseRequestEnvelope({ version: 1, seq: badSeq, operation: "submit", payload: {} }),
      /seq/i
    );
  }
  assert.throws(
    () => parseRequestEnvelope({ version: 1, seq: 1, operation: "_invalid", payload: {} }),
    /operation/i
  );
  assert.throws(
    () =>
      parseRequestEnvelope({
        version: 1,
        seq: 1,
        operation: "submit",
        payload: {},
        unexpected: "field",
      }),
    /Unknown extra field/i
  );
  assert.throws(
    () => parseRequestEnvelope({ version: 1, seq: 1, operation: "submit" }),
    /Missing required own field 'payload'/i
  );
  assert.throws(
    () => parseRequestEnvelope({ version: 1, seq: 1, operation: "submit", payload: [] }),
    /must be a plain object/i
  );

  // A prototype-provided member must never satisfy a required field.
  const inherited = Object.create({ version: 1, seq: 1, operation: "open", payload: {} });
  assert.throws(() => parseRequestEnvelope(inherited), /plain object/i);
});

test("SRS-003: response envelope rejects unknown error codes and unknown/duplicate fields", () => {
  const ok = parseResponseEnvelope({
    version: 1,
    seq: 3,
    ok: true,
    result: { instruction_id: "inst-1", state: "succeeded", evidence_ids: ["ev-1"] },
  });
  assert.equal(ok.ok, true);

  const failed = parseResponseEnvelope({
    version: 1,
    seq: 3,
    ok: false,
    error: { code: "INVALID_REQUEST", message: "Malformed payload" },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.ok === false ? failed.error.code : null, "INVALID_REQUEST");

  assert.throws(
    () => parseResponseEnvelope({ version: 1, seq: 1, ok: false, error: { code: "CUSTOM_ERROR", message: "x" } }),
    /Invalid error code/i
  );
  assert.throws(
    () => parseResponseEnvelope({ version: 1, seq: 1, ok: false, error: { code: "CONFLICT" } }),
    /Missing required own field 'message'/i
  );
  assert.throws(
    () =>
      parseResponseEnvelope({
        version: 1,
        seq: 1,
        ok: false,
        error: { code: "CONFLICT", message: "x" },
        result: {},
      }),
    /Unknown extra field/i
  );
  assert.throws(
    () =>
      parseResponseEnvelope({
        version: 1,
        seq: 1,
        ok: true,
        result: {},
        error: { code: "CONFLICT", message: "x" },
      }),
    /Unknown extra field/i
  );

  // Every advertised error code is accepted; nothing invented is.
  for (const code of ERROR_CODES) {
    assert.equal(
      parseResponseEnvelope({ version: 1, seq: 1, ok: false, error: { code, message: "ok" } }).ok,
      false
    );
  }
});

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

test("SRS-003: payment payload/result rejects missing, unknown, out-of-range and duplicate fields", () => {
  assert.equal(
    validatePaymentPayload("submit", { instruction_id: "pay_01", amount_minor: 5000, currency: "USD" })
      .instruction_id,
    "pay_01"
  );

  assert.throws(
    () => validatePaymentPayload("submit", { instruction_id: "pay_01", amount_minor: 5000, currency: "EUR" }),
    /currency/i
  );
  assert.throws(
    () => validatePaymentPayload("submit", { instruction_id: "pay_01", amount_minor: 50.5, currency: "USD" }),
    /amount_minor/i
  );
  assert.throws(
    () => validatePaymentPayload("submit", { instruction_id: "pay_01", currency: "USD" }),
    /amount_minor/i
  );
  assert.throws(
    () => validatePaymentPayload("submit", { amount_minor: 5000, currency: "USD" }),
    /instruction_id/i
  );
  assert.throws(
    () =>
      validatePaymentPayload("submit", {
        instruction_id: "pay_01",
        amount_minor: 5000,
        currency: "USD",
        dedupe: true,
      }),
    /Unknown extra field/i
  );
  assert.throws(() => validatePaymentPayload("inspect", {}), /instruction_id/i);

  const view = validatePaymentResult("submit", {
    instruction_id: "pay_01",
    state: "succeeded",
    evidence_ids: ["ev_1", "ev_2"],
  });
  assert.equal(view.state, "succeeded");

  assert.throws(
    () => validatePaymentResult("submit", { instruction_id: "pay_01", state: "succeeded", evidence_ids: ["ev_1", "ev_1"] }),
    /Duplicate evidence_id/i
  );
  assert.throws(
    () => validatePaymentResult("submit", { instruction_id: "pay_01", state: "pending", evidence_ids: [] }),
    /state/i
  );
  assert.throws(
    () => validatePaymentResult("submit", { instruction_id: "pay_01", state: "succeeded" }),
    /evidence_ids/i
  );
  assert.throws(
    () =>
      validatePaymentResult("submit", {
        instruction_id: "pay_01",
        state: "succeeded",
        evidence_ids: [],
        fabricated: 1,
      }),
    /Unknown extra field/i
  );
});

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

test("SRS-003: tenant payload/result rejects nested extras, oversize content and duplicate documents", () => {
  const ingest = validateTenantPayload("ingest", {
    document: { document_id: "doc-1", owner: "tenant-A", content: "classified content" },
  });
  assert.equal("document" in ingest ? ingest.document.document_id : null, "doc-1");

  assert.throws(
    () =>
      validateTenantPayload("ingest", {
        document: { document_id: "doc-1", owner: "tenant-A", content: "c", acl: "public" },
      }),
    /Unknown extra field/i
  );
  assert.throws(
    () =>
      validateTenantPayload("ingest", {
        document: { document_id: "doc-1", owner: "tenant-A", content: "A".repeat(4097) },
      }),
    /exceeds maximum bound/i
  );
  assert.throws(
    () => validateTenantPayload("restore", { tenant: "tenant-A" }),
    /snapshot_id/i
  );

  assert.throws(
    () =>
      validateTenantResult("query", {
        items: [
          { document_id: "doc-1", owner: "tenant-A", content: "c1" },
          { document_id: "doc-1", owner: "tenant-A", content: "c1 duplicate" },
        ],
        trace: { retrieved: [], reranked: [], cached: [] },
      }),
    /Duplicate document_id/i
  );
  assert.throws(
    () =>
      validateTenantResult("query", {
        items: [],
        trace: { retrieved: [], reranked: [], cached: [], cold: [] },
      }),
    /Unknown extra field/i
  );
  assert.throws(
    () => validateTenantResult("revoke", { document_id: "doc-1" }),
    /revocation_id/i
  );
});

// ---------------------------------------------------------------------------
// Overload
// ---------------------------------------------------------------------------

test("SRS-003: overload payload/result rejects oversize byte counts and duplicate deliveries", () => {
  assert.equal(validateOverloadPayload("open", { connection_id: "conn-1" }).connection_id, "conn-1");

  assert.throws(
    () => validateOverloadPayload("send", { connection_id: "c1", message_id: "m1", bytes: 65537 }),
    /exceeds maximum allowed/i
  );
  assert.throws(
    () => validateOverloadPayload("read", { connection_id: "c1", max_bytes: 65537 }),
    /exceeds maximum allowed/i
  );
  assert.throws(() => validateOverloadPayload("send", { connection_id: "c1", message_id: "m1", bytes: 0 }), /bytes/i);
  assert.throws(() => validateOverloadPayload("drain", { force: true }), /Unknown extra field/i);
  assert.throws(() => validateOverloadPayload("status", { connection_id: "c1" }), /Unknown extra field/i);

  assert.throws(
    () =>
      validateOverloadResult("read", {
        delivered: [
          { message_id: "m1", bytes: 100 },
          { message_id: "m1", bytes: 100 },
        ],
        closed: false,
      }),
    /Duplicate message_id/i
  );
  assert.throws(
    () =>
      validateOverloadResult("read", {
        delivered: [{ message_id: "m1", bytes: 100, body: "x" }],
        closed: false,
      }),
    /Unknown extra field/i
  );
  assert.throws(
    () => validateOverloadResult("read", { delivered: [{ message_id: "m1", bytes: 65537 }], closed: false }),
    /exceeds maximum frame size/i
  );
  assert.throws(
    () =>
      validateOverloadResult("read", {
        delivered: Array.from({ length: 257 }, (_, i) => ({ message_id: `m${i}`, bytes: 1 })),
        closed: false,
      }),
    /exceed limit/i
  );
  assert.throws(() => validateOverloadResult("open", { connection_id: "c1", admitted: "yes", limits: validLimits() }), /admitted/i);
  assert.throws(() => validateOverloadResult("close", { connection_id: "c1", closed: false }), /closed/i);
  assert.throws(() => validateOverloadResult("status", { limits: validLimits(), active_connections: 0, buffered_bytes: 0, dropped_count: 0 }), /capacity_rps/i);
});

test("SRS-003: declared overload limits may not exceed the accepted diagnostic policy", () => {
  const accepted = validateOverloadLimits(validLimits());
  assert.equal(accepted.max_connections, 32);

  const overLimit: [string, Record<string, unknown>][] = [
    ["max_connections", { ...validLimits(), max_connections: OVERLOAD_LIMIT_CEILINGS.max_connections + 1 }],
    [
      "max_buffer_bytes_per_connection",
      { ...validLimits(), max_buffer_bytes_per_connection: OVERLOAD_LIMIT_CEILINGS.max_buffer_bytes_per_connection + 1 },
    ],
    ["drain_deadline_ms", { ...validLimits(), drain_deadline_ms: OVERLOAD_LIMIT_CEILINGS.drain_deadline_ms + 1 }],
    [
      "max_retries_per_request",
      { ...validLimits(), max_retries_per_request: OVERLOAD_LIMIT_CEILINGS.max_retries_per_request + 1 },
    ],
  ];
  for (const [field, limits] of overLimit) {
    assert.throws(() => validateOverloadLimits(limits), /policy ceiling/i, `expected ${field} to exceed policy`);
  }

  assert.throws(() => validateOverloadLimits({ ...validLimits(), max_retries_per_request: -1 }), /max_retries_per_request/i);
  assert.throws(() => validateOverloadLimits({ ...validLimits(), extra: 1 }), /Unknown extra field/i);
});

// ---------------------------------------------------------------------------
// Provider and summarizer stubs
// ---------------------------------------------------------------------------

test("SRS-003: provider debit/lookup/settlement validators reject malformed effects", () => {
  assert.equal(
    validateProviderPayload("debit", {
      instruction_id: "inst-1",
      operation_ref: "op-1",
      amount_minor: 1000,
      currency: "USD",
    }).operation_ref,
    "op-1"
  );
  assert.equal(validateProviderPayload("lookup", { operation_ref: "op-1" }).operation_ref, "op-1");
  assert.equal(validateProviderPayload("settlement", { instruction_id: "inst-1" }).instruction_id, "inst-1");

  assert.throws(
    () =>
      validateProviderPayload("debit", {
        instruction_id: "inst-1",
        amount_minor: 1000,
        currency: "USD",
      }),
    /operation_ref/i
  );
  assert.throws(
    () =>
      validateProviderPayload("debit", {
        instruction_id: "inst-1",
        operation_ref: "op-1",
        amount_minor: 1000,
        currency: "EUR",
      }),
    /currency/i
  );
  assert.throws(
    () =>
      validateProviderPayload("debit", {
        instruction_id: "inst-1",
        operation_ref: "op-1",
        amount_minor: 1000,
        currency: "USD",
        idempotency_key: "k",
      }),
    /Unknown extra field/i
  );
  assert.throws(() => validateProviderPayload("lookup", {}), /operation_ref/i);

  assert.equal(
    validateProviderResult("settlement", { evidence_id: "ev-1", final: false, outcome: "absent" }).final,
    false
  );
  assert.throws(
    () => validateProviderResult("debit", { evidence_id: "ev-1", outcome: "pending" }),
    /Invalid debit outcome/i
  );
  assert.throws(
    () => validateProviderResult("lookup", { evidence_id: "ev-1", outcome: "absent" }),
    /Invalid lookup outcome/i
  );
  assert.throws(
    () => validateProviderResult("settlement", { evidence_id: "ev-1", final: true, outcome: "pending" }),
    /Invalid settlement outcome/i
  );
  assert.throws(
    () => validateProviderResult("settlement", { evidence_id: "ev-1", outcome: "succeeded" }),
    /final/i
  );
  assert.throws(() => validateProviderResult("debit", { outcome: "succeeded" }), /evidence_id/i);

  // Provider framing is the common strict envelope, not a laxer parser.
  assert.equal(
    parseProviderRequestEnvelope({ version: 1, seq: 1, operation: "debit", payload: { instruction_id: "i" } })
      .operation,
    "debit"
  );
  assert.throws(
    () => parseProviderRequestEnvelope({ version: 1, seq: 1, operation: "debit", payload: {}, extra: 1 }),
    /Unknown extra field/i
  );
  assert.equal(
    parseProviderResponseEnvelope({ version: 1, seq: 1, ok: true, result: { evidence_id: "ev-1" } }).ok,
    true
  );
});

test("SRS-003: summarizer validator rejects duplicates, invalid ids and non-completed results", () => {
  const summary = validateSummarizerPayload("summarize", {
    request_id: "req-1",
    connection_id: "conn-1",
    message_ids: ["msg-1", "msg-2"],
  });
  assert.equal(summary.message_ids.length, 2);

  assert.throws(
    () => validateSummarizerPayload("summarize", { request_id: "req-1", message_ids: [] }),
    /connection_id/i
  );
  assert.throws(
    () =>
      validateSummarizerPayload("summarize", {
        request_id: "req-1",
        connection_id: "conn-1",
        message_ids: ["msg-1", "msg-1"],
      }),
    /Duplicate message_id/i
  );
  assert.throws(
    () =>
      validateSummarizerPayload("summarize", {
        request_id: "req-1",
        connection_id: "conn-1",
        message_ids: Array.from({ length: 257 }, (_, i) => `m${i}`),
      }),
    /exceeds limit/i
  );
  assert.throws(
    () => validateSummarizerPayload("summarize", { request_id: "req-1", connection_id: "conn-1", message_ids: "m1" }),
    /must be an array/i
  );
  assert.equal(validateSummarizerResult("summarize", { request_id: "req-1", status: "completed" }).status, "completed");
  assert.throws(
    () => validateSummarizerResult("summarize", { request_id: "req-1", status: "failed" }),
    /status/i
  );
  assert.throws(() => validateSummarizerResult("summarize", { request_id: "req-1" }), /status/i);
});

// ---------------------------------------------------------------------------
// JSONL codec
// ---------------------------------------------------------------------------

test("SRS-003: JSONL codec emits every frame in a chunk and preserves split multibyte text", () => {
  const codec = new JsonlFrameCodec({ maxFrameBytes: 16 });
  // Two bounded frames inside one chunk whose total size exceeds one frame.
  assert.deepEqual(codec.feed(Buffer.from("aaaa\nbbbb\n")), ["aaaa", "bbbb"]);
  assert.equal(codec.bufferedBytes(), 0);
  codec.finish();

  const multibyte = Buffer.from('{"k":"é"}\n', "utf8");
  const splitCodec = new JsonlFrameCodec();
  const firstHalf = splitCodec.feed(multibyte.subarray(0, 7));
  assert.deepEqual(firstHalf, []);
  const secondHalf = splitCodec.feed(multibyte.subarray(7));
  assert.deepEqual(secondHalf, ['{"k":"é"}']);
  splitCodec.finish();
});

test("SRS-003: JSONL codec fails closed on oversize, blank, malformed and unterminated input", () => {
  const tiny = new JsonlFrameCodec({ maxFrameBytes: 8 });
  assert.throws(() => tiny.feed(Buffer.from("123456789\n")), /exceeds maximum limit/i);
  assert.throws(() => tiny.feed(Buffer.from("123456789")), /exceeds maximum limit/i);

  assert.throws(() => new JsonlFrameCodec().feed(Buffer.from("\n")), /Blank frame/i);
  assert.throws(() => new JsonlFrameCodec().feed(Buffer.from("   \n")), /Blank frame/i);
  assert.throws(
    () => new JsonlFrameCodec().feed(Buffer.from([0x7b, 0xff, 0x7d, 0x0a])),
    /malformed UTF-8/i
  );

  const partial = new JsonlFrameCodec();
  assert.deepEqual(partial.feed(Buffer.from('{"seq":1}')), []);
  assert.throws(() => partial.finish(), /Unterminated frame/i);

  const complete = new JsonlFrameCodec();
  complete.feed(Buffer.from('{"seq":1}\n'));
  complete.finish();
});

test("SRS-003: JSONL codec rejects invalid size caps instead of defaulting", () => {
  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 65537]) {
    assert.throws(() => new JsonlFrameCodec({ maxFrameBytes: bad }), /Invalid maxFrameBytes/i);
  }
  assert.equal(new JsonlFrameCodec({ maxFrameBytes: 65536 }).maxFrameSize, 65536);
  assert.equal(new JsonlFrameCodec().maxFrameSize, 65536);
});

// ---------------------------------------------------------------------------
// Session tracking
// ---------------------------------------------------------------------------

test("SRS-003: single-flight session tracker rejects gaps, overlaps and mismatches without corrupting state", () => {
  const session = new SingleFlightSessionTracker();
  session.recordRequest({ version: 1, seq: 1, operation: "open", payload: { connection_id: "c1" } });

  // Overlapping request is rejected and does not consume a sequence number.
  assert.throws(
    () => session.recordRequest({ version: 1, seq: 2, operation: "open", payload: { connection_id: "c2" } }),
    /in-flight/i
  );
  assert.equal(session.hasInFlight(), true);
  assert.equal(session.getExpectedSeq(), 1);

  // Mismatched response keeps the request in flight and the expectation intact.
  assert.throws(
    () => session.recordResponse({ version: 1, seq: 2, ok: true, result: {} }),
    /mismatch/i
  );
  assert.equal(session.hasInFlight(), true);

  session.recordResponse({ version: 1, seq: 1, ok: true, result: {} });
  assert.equal(session.hasInFlight(), false);
  assert.equal(session.getExpectedSeq(), 2);

  // A skipped sequence is rejected without advancing the expectation.
  assert.throws(
    () => session.recordRequest({ version: 1, seq: 4, operation: "close", payload: { connection_id: "c1" } }),
    /sequence/i
  );
  assert.equal(session.getExpectedSeq(), 2);

  session.recordRequest({ version: 1, seq: 2, operation: "close", payload: { connection_id: "c1" } });
  session.recordResponse({ version: 1, seq: 2, ok: true, result: {} });
  assert.equal(session.getExpectedSeq(), 3);

  // Only an explicit new-process session resets to seq 1.
  session.resetSession();
  assert.equal(session.getExpectedSeq(), 1);
  assert.equal(session.hasInFlight(), false);
});

test("SRS-003: inherited Object.prototype substitutes never satisfy a required own field", () => {
  const proto = Object.prototype as unknown as Record<string, unknown>;
  const substituteKeys = [
    "instruction_id",
    "amount_minor",
    "currency",
    "operation_ref",
    "evidence_id",
    "outcome",
    "final",
    "state",
    "evidence_ids",
    "document_id",
    "owner",
    "content",
    "document",
    "tenant",
    "query",
    "derived_owner",
    "snapshot_id",
    "items",
    "trace",
    "retrieved",
    "reranked",
    "cached",
    "status",
    "request_id",
    "connection_id",
    "message_ids",
    "message_id",
    "bytes",
    "max_bytes",
    "limits",
    "admitted",
    "delivered",
    "closed",
    "terminated",
    "undelivered_count",
    "active_connections",
    "buffered_bytes",
    "dropped_count",
    "capacity_rps",
    "max_connections",
    "max_buffer_bytes_per_connection",
    "drain_deadline_ms",
    "max_retries_per_request",
    "revocation_id",
  ];
  // Saved before pollution so the finally block restores the exact prior state.
  const saved = new Map<string, PropertyDescriptor | undefined>();

  try {
    for (const key of substituteKeys) {
      saved.set(key, Object.getOwnPropertyDescriptor(proto, key));
      // Non-enumerable so only property lookup sees the substitute; for..in,
      // Object.keys and JSON serialisation stay unaffected for other tests.
      Object.defineProperty(proto, key, {
        value: "inherited",
        configurable: true,
        writable: true,
        enumerable: false,
      });
    }

    // Each case is a realistic complete plain object missing exactly one own field.
    const paymentMissingCurrency = { instruction_id: "pay_01", amount_minor: 500 };
    assert.throws(() => validatePaymentPayload("submit", paymentMissingCurrency), /currency|own field/i);

    const paymentViewMissingState = { instruction_id: "pay_01", evidence_ids: [] };
    assert.throws(() => validatePaymentResult("submit", paymentViewMissingState), /state|own field/i);

    const providerDebitMissingCurrency = { instruction_id: "i", operation_ref: "o", amount_minor: 1 };
    assert.throws(() => validateProviderPayload("debit", providerDebitMissingCurrency), /currency|own field/i);

    const settlementMissingFinal = { evidence_id: "ev-1", outcome: "succeeded" };
    assert.throws(() => validateProviderResult("settlement", settlementMissingFinal), /final|own field/i);

    const summarizerMissingConnection = { request_id: "r", message_ids: ["m1"] };
    assert.throws(
      () => validateSummarizerPayload("summarize", summarizerMissingConnection),
      /connection_id|own field/i
    );

    // Nested record inside a tenant ingest payload.
    const tenantIngestMissingOwner = { document: { document_id: "doc-1", content: "c" } };
    assert.throws(() => validateTenantPayload("ingest", tenantIngestMissingOwner), /owner|own field/i);

    const overloadSendMissingBytes = { connection_id: "c1", message_id: "m1" };
    assert.throws(() => validateOverloadPayload("send", overloadSendMissingBytes), /bytes|own field/i);

    const overloadLimitsMissingDrain = {
      max_connections: 1,
      max_buffer_bytes_per_connection: 1,
      max_retries_per_request: 0,
    };
    assert.throws(() => validateOverloadLimits(overloadLimitsMissingDrain), /drain_deadline_ms|own field/i);

    const overloadReadMissingClosed = { delivered: [] };
    assert.throws(() => validateOverloadResult("read", overloadReadMissingClosed), /closed|own field/i);

    // Nested delivery record missing its own bytes field.
    const overloadReadMissingEntryBytes = { delivered: [{ message_id: "m1" }], closed: false };
    assert.throws(
      () => validateOverloadResult("read", overloadReadMissingEntryBytes),
      /bytes|own field/i
    );

    // Pollution must not break legitimate complete payloads.
    const validSubmit = validatePaymentPayload("submit", {
      instruction_id: "pay_01",
      amount_minor: 500,
      currency: "USD",
    });
    assert.equal(validSubmit.currency, "USD");
    assert.equal(
      validateOverloadResult("read", { delivered: [{ message_id: "m1", bytes: 10 }], closed: true }).delivered
        .length,
      1
    );
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor === undefined) {
        delete proto[key];
      } else {
        Object.defineProperty(proto, key, descriptor);
      }
    }
  }

  assert.equal(Object.hasOwn(proto, "currency"), false);
  assert.equal(Object.hasOwn(proto, "drain_deadline_ms"), false);
});

function validLimits(): Record<string, unknown> {
  return {
    max_connections: 32,
    max_buffer_bytes_per_connection: 65536,
    drain_deadline_ms: 5000,
    max_retries_per_request: 1,
  };
}
