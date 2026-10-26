// scripts/skill-tests/testing-quality-improvement/http-fixture-server.mjs
// Zero-dependency loopback HTTP fixture server for the testing-quality-improvement
// behaviour checks. Deliberately vulnerable modes exist only to seed faults for the
// local oracles; nothing here models production policy.
//
// Bounds enforced by construction:
// - request bodies are counted while streaming and never fully buffered past the limit;
// - load work occupies a finite in-flight slot for a real service interval, so overload
//   and recovery are observed instead of asserted;
// - hanging responses and open sockets are tracked and destroyed on stop().

import http from "node:http";
import { URL } from "node:url";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Declared trigger token for the conditional crash fixture; the value is fixture data.
export const TRIGGER_TOKEN = "fuzz-crash";

export class TestFixtureServer {
  constructor(options = {}) {
    this.bodyLimitBytes = options.bodyLimitBytes ?? 32768;
    this.workCapacity = options.workCapacity ?? 5;
    this.workServiceMs = options.workServiceMs ?? 120;
    this.workShedMs = options.workShedMs ?? 20;
    this.workDegradedMs = options.workDegradedMs ?? 400;

    this.port = options.port ?? 0;
    this.server = null;
    this.modeOverrides = new Map();

    this.charges = new Map();
    this.localLedger = [];
    this.gatewayLedger = [];
    this.lostResponseKeys = new Set();

    this.inFlight = 0;
    this.acceptedInFlight = 0;
    this.peakInFlight = 0;
    this.peakAcceptedInFlight = 0;
    this.shedCount = 0;
    this.completedCount = 0;
    this.overloadLatch = false;

    this.sequence = { nextPhase: 1, attempts: [] };

    this.protectedState = this.defaultProtectedState();
    this.hangingResponses = new Set();
    this.sockets = new Set();
  }

  defaultProtectedState() {
    return {
      maintenance: { enabled: false, updatedBy: null },
      profile: { name: "Alice", role: "USER", tenantId: "tenant-a" },
      counters: { fuzzRejectedWrites: 0 }
    };
  }

  setMode(pathname, mode) {
    this.modeOverrides.set(this.familyKey(pathname), mode);
  }

  getMode(pathname, req) {
    // Modes register against a stable family key so "/api/tenants" also matches
    // "/api/tenants/:tenant/records/:id".
    return (
      req.headers["x-fixture-mode"] ||
      this.modeOverrides.get(this.familyKey(pathname)) ||
      this.modeOverrides.get(pathname) ||
      "normal"
    );
  }

  familyKey(pathname) {
    if (pathname.startsWith("/api/v1/orders/")) return "/api/v1/orders";
    if (pathname.startsWith("/api/tenants/")) return "/api/tenants";
    return pathname;
  }

  getLocalLedger() {
    return this.localLedger.map((row) => ({ ...row }));
  }

  getGatewayLedger() {
    return this.gatewayLedger.map((row) => ({ ...row }));
  }

  snapshotProtectedState() {
    return structuredClone(this.protectedState);
  }

  getMetrics() {
    return {
      inFlight: this.inFlight,
      acceptedInFlight: this.acceptedInFlight,
      peakInFlight: this.peakInFlight,
      peakAcceptedInFlight: this.peakAcceptedInFlight,
      shedCount: this.shedCount,
      completedCount: this.completedCount,
      capacity: this.workCapacity
    };
  }

  reset() {
    this.modeOverrides.clear();
    this.charges.clear();
    this.localLedger = [];
    this.gatewayLedger = [];
    this.lostResponseKeys.clear();
    this.inFlight = 0;
    this.acceptedInFlight = 0;
    this.peakInFlight = 0;
    this.peakAcceptedInFlight = 0;
    this.shedCount = 0;
    this.completedCount = 0;
    this.overloadLatch = false;
    this.sequence = { nextPhase: 1, attempts: [] };
    this.protectedState = this.defaultProtectedState();
  }

  async start() {
    if (this.server) return `http://127.0.0.1:${this.port}`;
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(() => {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "FIXTURE_HANDLER_FAILURE" }));
        } else if (!res.writableEnded) {
          res.end();
        }
      });
    });
    this.server.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.on("close", () => this.sockets.delete(socket));
    });
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, "127.0.0.1", () => {
        this.port = this.server.address().port;
        resolve();
      });
    });
    return `http://127.0.0.1:${this.port}`;
  }

  async stop() {
    if (!this.server) return;
    for (const response of this.hangingResponses) {
      response.destroy();
    }
    this.hangingResponses.clear();
    const closed = new Promise((resolve) => this.server.close(() => resolve()));
    this.server.closeIdleConnections?.();
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    await closed;
    this.server = null;
  }

  respond(res, status, body, contentType = "application/json") {
    if (res.writableEnded || res.destroyed) return;
    res.writeHead(status, { "Content-Type": contentType });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  }

  // Streams the body, aborting accumulation once the limit is crossed so a large
  // payload can never be buffered in full.
  readBody(req, limitBytes) {
    return new Promise((resolve) => {
      let bytes = 0;
      let exceeded = false;
      const chunks = [];
      req.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > limitBytes) {
          exceeded = true;
          chunks.length = 0;
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolve({ bytes, exceeded, text: exceeded ? "" : Buffer.concat(chunks).toString("utf8") }));
      req.on("aborted", () => resolve({ bytes, exceeded: true, aborted: true, text: "" }));
      req.on("error", () => resolve({ bytes, exceeded: true, aborted: true, text: "" }));
    });
  }

  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    const { pathname } = url;
    const method = req.method;
    const mode = this.getMode(pathname, req);

    const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
    const limit = mode === "fault-accepts-oversized" ? this.bodyLimitBytes * 4 : this.bodyLimitBytes;
    const body = hasBody ? await this.readBody(req, limit) : { bytes: 0, exceeded: false, text: "" };
    if (body.aborted) return;

    const route = `${method} ${this.routeKey(pathname)}`;
    switch (route) {
      case "GET /health":
        return this.respond(res, 200, { status: "UP" });
      case "POST /api/orders":
        return this.handleCreateOrder(res, mode);
      case "POST /api/orders/calculate":
        return this.handleCalculate(res, mode, body);
      case "GET /api/v1/orders/:id":
        return this.handleOrderRead(res, mode);
      case "POST /api/payments/charge":
        return this.handleCharge(req, res, mode);
      case "POST /api/admin/system-settings":
        return this.handleAdminSettings(req, res, mode, body);
      case "PATCH /api/users/profile":
        return this.handleProfilePatch(req, res, mode, body);
      case "GET /api/tenants/:tenant/records/:id":
        return this.handleTenantRead(req, res, mode, pathname);
      case "POST /api/fuzz/parse":
        return this.handleFuzzParse(res, mode, body);
      case "POST /api/fuzz/sequence":
        return this.handleFuzzSequence(res, mode, body);
      case "GET /api/perf/workload":
        return this.handleWorkload(res, mode);
      case "GET /ui/delayed-banner":
        return this.handleBanner(res, url);
      default:
        return this.respond(res, 404, { error: "NOT_FOUND" });
    }
  }

  routeKey(pathname) {
    if (pathname.startsWith("/api/v1/orders/")) return "/api/v1/orders/:id";
    if (pathname.startsWith("/api/tenants/")) return "/api/tenants/:tenant/records/:id";
    return pathname;
  }

  handleCreateOrder(res, mode) {
    if (mode === "fault-broken-op") {
      return this.respond(res, 500, { error: "DatabaseConnectionTimeout", message: "Write pool exhausted; order not committed." });
    }
    return this.respond(res, 201, { orderId: "ord_101", status: "created" });
  }

  handleCalculate(res, mode, body) {
    let payload;
    try {
      payload = JSON.parse(body.text);
    } catch {
      return this.respond(res, 400, { error: "INVALID_JSON" });
    }
    const { subtotal = 100, discount = 20, tax = 8 } = payload ?? {};
    const total = mode === "fault-business-total" ? 108.0 : Number((subtotal - discount + tax).toFixed(2));
    return this.respond(res, 200, { subtotal, discount, tax, total, items_count: 2, currency: "USD" });
  }

  handleOrderRead(res, mode) {
    if (mode === "fault-breaking-schema") {
      return this.respond(res, 200, { id: "ord_101", customer: "cust_99", amount: "88.00" });
    }
    return this.respond(res, 200, {
      order_id: "ord_101",
      customer_id: "cust_99",
      amount: 88.0,
      currency: "USD",
      items: [
        { sku: "SKU-A", quantity: 1, unit_price: 60.0 },
        { sku: "SKU-B", quantity: 1, unit_price: 40.0 }
      ]
    });
  }

  handleCharge(req, res, mode) {
    const idempotencyKey = req.headers["idempotency-key"];
    const gatewayFault = req.headers["x-gateway-fault"];
    if (!idempotencyKey) {
      return this.respond(res, 400, { error: "MISSING_IDEMPOTENCY_KEY" });
    }
    const commit = (chargeId, gatewayChargeId) => {
      this.localLedger.push({ chargeId, gatewayChargeId, idempotencyKey, amount: 88.0 });
      this.gatewayLedger.push({ gatewayChargeId, idempotencyKey, amount: 88.0 });
      this.charges.set(idempotencyKey, { chargeId, gatewayChargeId, amount: 88.0 });
    };

    if (gatewayFault === "lost-response" || gatewayFault === "lost-response-duplicate") {
      if (!this.lostResponseKeys.has(`${gatewayFault}:${idempotencyKey}`)) {
        this.lostResponseKeys.add(`${gatewayFault}:${idempotencyKey}`);
        if (gatewayFault === "lost-response-duplicate") {
          // Post-effect drop: local commit and one gateway debit are already durable,
          // but the caller never sees a response.
          commit("ch_ok_001", "gw_sim_fault_01");
        } else {
          commit("ch_ok_001", "gw_sim_001");
        }
        req.socket.destroy();
        return undefined;
      }
      const cached = this.charges.get(idempotencyKey);
      if (gatewayFault === "lost-response-duplicate") {
        // Fault: the gateway fails to deduplicate, so although the local replay looks
        // correct (one row, replayed charge id) a second downstream debit exists.
        const duplicateGatewayChargeId = "gw_sim_fault_02";
        this.gatewayLedger.push({ gatewayChargeId: duplicateGatewayChargeId, idempotencyKey, amount: 88.0 });
        return this.respond(res, 200, {
          chargeId: cached.chargeId,
          gatewayChargeId: duplicateGatewayChargeId,
          amount: cached.amount,
          status: "succeeded",
          isDuplicate: true
        });
      }
      return this.respond(res, 200, {
        chargeId: cached.chargeId,
        gatewayChargeId: cached.gatewayChargeId,
        amount: cached.amount,
        status: "succeeded",
        isDuplicate: true
      });
    }

    if (mode === "fault-duplicate-effects") {
      const suffix = this.localLedger.length + 1;
      const chargeId = `ch_fault_${suffix}`;
      const gatewayChargeId = `gw_fault_${suffix}`;
      commit(chargeId, gatewayChargeId);
      return this.respond(res, 201, { chargeId, gatewayChargeId, amount: 88.0, status: "succeeded", isDuplicate: false });
    }

    const cached = this.charges.get(idempotencyKey);
    if (cached) {
      return this.respond(res, 200, {
        chargeId: cached.chargeId,
        gatewayChargeId: cached.gatewayChargeId,
        amount: cached.amount,
        status: "succeeded",
        isDuplicate: true
      });
    }
    commit("ch_ok_001", "gw_sim_001");
    return this.respond(res, 201, { chargeId: "ch_ok_001", gatewayChargeId: "gw_sim_001", amount: 88.0, status: "succeeded", isDuplicate: false });
  }

  handleAdminSettings(req, res, mode, body) {
    const auth = req.headers["authorization"] || "";
    if (!auth.startsWith("Bearer ")) {
      return this.respond(res, 401, { error: "UNAUTHENTICATED" });
    }
    const principal = auth === "Bearer token-admin" ? "admin" : auth === "Bearer token-user" ? "user" : null;
    if (!principal) {
      return this.respond(res, 401, { error: "INVALID_CREDENTIALS" });
    }
    if (mode === "fault-mutate-before-deny") {
      // Fault: the guard mutates protected state before returning its denial.
      this.protectedState.profile.role = "ADMIN";
      return this.respond(res, 403, { error: "INSUFFICIENT_ROLE", requiredRole: "ADMIN" });
    }
    if (mode === "fault-privilege-escalation") {
      // Fault: the role guard is bypassed for a low-privilege caller. State mutation
      // is a separate seed (fault-mutate-before-deny) so the two detections stay distinct.
      return this.respond(res, 200, { status: "UPDATED", maintenance: { enabled: true, updatedBy: principal } });
    }
    if (principal !== "admin") {
      return this.respond(res, 403, { error: "INSUFFICIENT_ROLE", requiredRole: "ADMIN" });
    }
    let enabled = true;
    try {
      enabled = JSON.parse(body.text || "{}").maintenanceMode ?? true;
    } catch {
      return this.respond(res, 400, { error: "MALFORMED_JSON" });
    }
    this.protectedState.maintenance = { enabled, updatedBy: principal };
    return this.respond(res, 200, { status: "UPDATED", maintenance: this.protectedState.maintenance });
  }

  handleProfilePatch(req, res, mode, body) {
    const auth = req.headers["authorization"] || "";
    if (!auth.startsWith("Bearer ")) {
      return this.respond(res, 401, { error: "UNAUTHENTICATED" });
    }
    let payload;
    try {
      payload = JSON.parse(body.text || "{}");
    } catch {
      return this.respond(res, 400, { error: "MALFORMED_JSON" });
    }
    const touchesProtected = "role" in payload || "tenant_id" in payload || "tenantId" in payload;
    if (touchesProtected) {
      if (mode === "fault-mutate-before-deny") {
        // Fault: protected fields are applied before the 403 is produced.
        if ("role" in payload) this.protectedState.profile.role = payload.role;
        if ("tenant_id" in payload) this.protectedState.profile.tenantId = payload.tenant_id;
      }
      return this.respond(res, 403, { error: "PROTECTED_FIELD_MUTATION" });
    }
    if (mode === "fault-privilege-escalation") {
      this.protectedState.profile.role = "ADMIN";
      return this.respond(res, 200, { status: "PROFILE_UPDATED" });
    }
    if (typeof payload.name === "string") this.protectedState.profile.name = payload.name;
    return this.respond(res, 200, { status: "PROFILE_UPDATED", profile: this.protectedState.profile });
  }

  handleTenantRead(req, res, mode, pathname) {
    const auth = req.headers["authorization"] || "";
    const targetTenant = pathname.split("/")[3];
    const authenticatedTenant =
      auth === "Bearer token-tenant-a" ? "tenant-a" : auth === "Bearer token-tenant-b" ? "tenant-b" : null;
    if (!authenticatedTenant) {
      return this.respond(res, 401, { error: "UNAUTHORIZED" });
    }
    if (mode === "fault-cross-tenant-leak") {
      return this.respond(res, 200, {
        recordId: "rec_secret_999",
        tenantId: targetTenant,
        confidentialData: `Confidential data belonging to ${targetTenant}`
      });
    }
    if (authenticatedTenant !== targetTenant) {
      return this.respond(res, 404, { error: "NOT_FOUND" });
    }
    return this.respond(res, 200, {
      recordId: "rec_own_123",
      tenantId: authenticatedTenant,
      confidentialData: `Confidential data belonging to ${authenticatedTenant}`
    });
  }

  handleFuzzParse(res, mode, body) {
    if (mode === "fault-fuzz-crash") {
      return this.respond(res, 500, "FatalError: NullPointerException at parseInput()\n  at Service.java:142\n  at Controller.java:44", "text/plain");
    }
    if (mode === "fault-crash-on-trigger") {
      // Real fixture predicate: only inputs carrying the declared trigger token reach
      // the crash path, so minimization can shrink against the observed failure.
      if (body.text.includes(TRIGGER_TOKEN)) {
        return this.respond(res, 500, "FatalError: NullPointerException at parseInput()\n  at Service.java:142\n  at Controller.java:44", "text/plain");
      }
      return this.respond(res, 400, { error: "MALFORMED_JSON", message: "Invalid JSON syntax" });
    }
    if (mode === "fault-hang") {
      // Fault: the endpoint never responds; the client deadline has to catch it.
      this.hangingResponses.add(res);
      res.on("close", () => this.hangingResponses.delete(res));
      return undefined;
    }
    if (body.exceeded && mode !== "fault-accepts-oversized") {
      return this.respond(res, 413, { error: "PAYLOAD_TOO_LARGE", maxBytes: this.bodyLimitBytes });
    }
    if (mode === "fault-accepts-oversized" && body.bytes > this.bodyLimitBytes) {
      return this.respond(res, 200, { status: "ACCEPTED", parsedFields: 0 });
    }

    let parsed;
    try {
      parsed = JSON.parse(body.text);
    } catch {
      this.protectedState.counters.fuzzRejectedWrites += mode === "fault-state-mutation-on-invalid" ? 1 : 0;
      return this.respond(res, 400, { error: "MALFORMED_JSON", message: "Invalid JSON syntax" });
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      if (mode === "fault-schema-accept") {
        return this.respond(res, 200, { status: "ACCEPTED", parsedFields: 0 });
      }
      this.protectedState.counters.fuzzRejectedWrites += mode === "fault-state-mutation-on-invalid" ? 1 : 0;
      return this.respond(res, 400, { error: "SCHEMA_VALIDATION_ERROR", message: "Top level must be a JSON object" });
    }
    if (mode === "fault-resource-unbounded") {
      return this.respond(res, 200, { status: "ACCEPTED", parsedFields: Object.keys(parsed).length, echo: body.text });
    }
    return this.respond(res, 200, { status: "ACCEPTED", parsedFields: Object.keys(parsed).length });
  }

  // Minimal ordered-state endpoint: phase N is only accepted once phases 1..N-1 have
  // completed against the same fixture instance, so a sequence test observes a real
  // transition rather than a field named like one.
  handleFuzzSequence(res, mode, body) {
    let payload;
    try {
      payload = JSON.parse(body.text || "{}");
    } catch {
      return this.respond(res, 400, { error: "MALFORMED_JSON" });
    }
    const phase = payload?.phase;
    if (typeof phase !== "number") {
      return this.respond(res, 400, { error: "SCHEMA_VALIDATION_ERROR", message: "phase must be a number" });
    }
    const expectedPhase = this.sequence.nextPhase;
    this.sequence.attempts.push({ phase, expectedPhase });
    if (mode === "fault-sequence-ignores-precondition") {
      this.sequence.nextPhase = Math.max(this.sequence.nextPhase, phase + 1);
      return this.respond(res, 200, { status: "ACCEPTED", phase, preconditionEnforced: false });
    }
    if (phase !== expectedPhase) {
      return this.respond(res, 409, { error: "PRECONDITION_VIOLATION", expectedPhase, receivedPhase: phase });
    }
    this.sequence.nextPhase = phase + 1;
    return this.respond(res, 200, { status: "ACCEPTED", phase, preconditionEnforced: true });
  }

  async handleWorkload(res, mode) {
    if (mode === "fault-burst-500") {
      return this.respond(res, 500, { error: "INTERNAL_TRIPWIRE_ERROR" });
    }
    this.inFlight += 1;
    this.peakInFlight = Math.max(this.peakInFlight, this.inFlight);
    try {
      if (mode === "fault-recovery-failure" && this.overloadLatch) {
        // Fault: stays degraded after load subsides; the latency is a real wait.
        await sleep(this.workDegradedMs);
        return this.respond(res, 503, { error: "SYSTEM_DEGRADED_UNRECOVERABLE" });
      }
      if (this.inFlight > this.workCapacity) {
        this.overloadLatch = true;
        this.shedCount += 1;
        await sleep(this.workShedMs);
        return this.respond(res, 503, { error: "SERVICE_OVERLOADED_TRY_AGAIN" });
      }
      // Accepted occupancy is tracked separately from total phase completions.
      this.acceptedInFlight += 1;
      this.peakAcceptedInFlight = Math.max(this.peakAcceptedInFlight, this.acceptedInFlight);
      try {
        await sleep(this.workServiceMs);
        this.completedCount += 1;
        return this.respond(res, 200, { status: "OK" });
      } finally {
        this.acceptedInFlight -= 1;
      }
    } finally {
      this.inFlight -= 1;
    }
  }

  handleBanner(res, url) {
    const delayMs = Number.parseInt(url.searchParams.get("delay") ?? "800", 10);
    const replacement = url.searchParams.get("mode") === "replacement";
    const initial = "Processing Order...";
    const final = "Order #12345 Confirmed";
    const update = replacement
      ? `var old = document.getElementById('status-banner');
         if (old) old.remove();
         var next = document.createElement('div');
         next.id = 'status-banner';
         next.setAttribute('data-testid', 'status-banner');
         next.textContent = ${JSON.stringify(final)};
         document.body.appendChild(next);`
      : `document.getElementById('status-banner').textContent = ${JSON.stringify(final)};`;
    const html = `<!DOCTYPE html>
<html>
<head><title>Order Confirmation</title></head>
<body>
  <h1>Checkout</h1>
  <div id="status-banner" data-testid="status-banner">${initial}</div>
  <script>
    window.__bannerTriggerCount = 0;
    window.__bannerUpdateApplied = false;
    // The mutation is only scheduled when the page asks for it, so a negative
    // snapshot is captured before any timer exists.
    window.__applyBannerUpdate = function () {
      window.__bannerTriggerCount += 1;
      setTimeout(function () { ${update} window.__bannerUpdateApplied = true; }, ${delayMs});
    };
  </script>
</body>
</html>`;
    return this.respond(res, 200, html, "text/html; charset=utf-8");
  }
}
