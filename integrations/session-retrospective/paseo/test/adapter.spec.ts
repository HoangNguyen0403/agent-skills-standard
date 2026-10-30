/**
 * Manual package tests.
 *
 * This build offers no data-collecting or report-reading capability, so these
 * tests assert the *absence* of a working data path: every collecting, reading
 * and disposition RPC returns the static `UNSUPPORTED` refusal for any parseable
 * input, no environment value changes that, and `status` reports the capability
 * statement plus in-memory identity without any filesystem or store access.
 *
 * Verification status: authored for the orchestrator. No command was run by the
 * adapter worker, so this file carries no RED/GREEN claim.
 */
import { describe, expect, it } from "vitest";
import {
  consentContract,
  dispositionContract,
  isAbsoluteBoundedPath,
  prepareContract,
  refusalCodeSchema,
  statusContract,
  viewContract,
} from "../shared/contracts";
import { AUTOMATIC_SUPPORT, CHECKPOINT_TOOL } from "../server/checkpoint-hooks";
import { createHandlers, type RetrospectiveHandlers } from "../server/handlers";
import {
  createIdentityRegistry,
  identityOf,
  type IdentityRegistry,
} from "../server/identity";

const MAIN_SESSION = "main-session";
const CLICK = "2026-10-29T11:00:00.000Z";
const UNAVAILABLE = { ok: false as const, code: "UNSUPPORTED" as const };

function newHandlers(
  identity: IdentityRegistry = createIdentityRegistry(),
): RetrospectiveHandlers {
  return createHandlers({
    automatic: AUTOMATIC_SUPPORT,
    checkpointTool: CHECKPOINT_TOOL,
    identity,
  });
}

function seededIdentity(...agents: Array<[string, string | null]>) {
  const registry = createIdentityRegistry();
  for (const [id, parentAgentId] of agents)
    registry.observe({ id, parentAgentId });
  return registry;
}

describe("contracts", () => {
  it("keeps status input strict and accepts any data-path input shape", () => {
    expect(
      statusContract.input.safeParse({ agentId: "agent-1", extra: true })
        .success,
    ).toBe(false);
    expect(
      statusContract.input.safeParse({ agentId: "agent-1" }).success,
    ).toBe(true);

    // Any shape parses, so an older or newer client always reaches the refusal
    // instead of a schema error. Nothing in these inputs is honored.
    for (const input of [
      {},
      { agentId: "agent-1" },
      {
        agentId: "agent-1",
        manifestPath: "/tmp/manifest.json",
        cutoff: CLICK,
        nonce: "nabc",
        storageRiskAcknowledged: true,
      },
      {
        agentId: "agent-1",
        manifestPath: "relative/manifest.json",
        cutoff: "not-an-instant",
        nonce: "nabc",
        requestId: "run-1",
        storageRiskAcknowledged: false,
        callerIsHuman: true,
      },
      { action: "prepare", extra: 1 },
      { delivery: "content", agentId: "agent-1", artifactId: "art-1" },
      { delivery: "path-only", agentId: "agent-1", artifactId: "art-1" },
      { anything: [1, 2, 3] },
    ]) {
      expect(prepareContract.input.safeParse(input).success).toBe(true);
      expect(consentContract.input.safeParse(input).success).toBe(true);
      expect(viewContract.input.safeParse(input).success).toBe(true);
      expect(dispositionContract.input.safeParse(input).success).toBe(true);
    }
  });

  it("still validates absolute bounded paths for the store root", () => {
    expect(isAbsoluteBoundedPath("/tmp/manifest.json")).toBe(true);
    expect(isAbsoluteBoundedPath("C:\\Users\\me\\manifest.json")).toBe(true);
    expect(isAbsoluteBoundedPath("tmp/manifest.json")).toBe(false);
    expect(isAbsoluteBoundedPath("/tmp/../../etc/passwd")).toBe(false);
    expect(isAbsoluteBoundedPath("/tmp/manifest\0.json")).toBe(false);
  });

  it("exposes exactly one closed refusal code", () => {
    expect(refusalCodeSchema.options).toEqual(["UNSUPPORTED"]);
    expect(refusalCodeSchema.safeParse("SOMETHING_FREE_FORM").success).toBe(
      false,
    );
  });
});

const LEGACY_PREPARE: Record<string, unknown> = {
  agentId: MAIN_SESSION,
  manifestPath: "/tmp/manifest.json",
  cutoff: CLICK,
  nonce: "nabc",
  requestId: "run-1",
  storageRiskAcknowledged: true,
  callerIsHuman: true,
};

describe("static refusal surface", () => {
  it("refuses every data-path RPC without a host, store or core", () => {
    const handlers = newHandlers(seededIdentity([MAIN_SESSION, null]));

    expect(
      handlers.consent({
        action: "prepare",
        agentId: MAIN_SESSION,
        manifestPath: "/tmp/manifest.json",
        cutoff: CLICK,
      }),
    ).toEqual(UNAVAILABLE);
    expect(handlers.prepare(LEGACY_PREPARE)).toEqual(UNAVAILABLE);
    expect(
      handlers.view({
        delivery: "path-only",
        agentId: MAIN_SESSION,
        artifactId: "art-1",
      }),
    ).toEqual(UNAVAILABLE);
    expect(
      handlers.view({
        delivery: "content",
        agentId: MAIN_SESSION,
        artifactId: "art-1",
        nonce: "nabc",
      }),
    ).toEqual(UNAVAILABLE);
    expect(
      handlers.disposition({
        agentId: MAIN_SESSION,
        checkpointId: "ck-1",
        action: "later",
        nonce: "nabc",
      }),
    ).toEqual(UNAVAILABLE);
  });

  it("refuses identically for unknown and child identities", () => {
    const handlers = newHandlers(createIdentityRegistry());
    expect(handlers.prepare(LEGACY_PREPARE)).toEqual(UNAVAILABLE);

    const childHandlers = newHandlers(
      seededIdentity([MAIN_SESSION, "agent-parent"]),
    );
    expect(
      childHandlers.view({
        delivery: "content",
        agentId: MAIN_SESSION,
        artifactId: "art-1",
        nonce: "nabc",
      }),
    ).toEqual(UNAVAILABLE);
  });

  it("cannot be enabled by any environment value", () => {
    const handlers = newHandlers(seededIdentity([MAIN_SESSION, null]));
    const previous = process.env.AGS_RETROSPECTIVE_MANUAL_UI;
    process.env.AGS_RETROSPECTIVE_MANUAL_UI = "1";
    try {
      expect(handlers.prepare(LEGACY_PREPARE)).toEqual(UNAVAILABLE);
      const status = handlers.status({ agentId: MAIN_SESSION });
      expect(status.capability).toEqual({
        state: "unavailable",
        reason: "human-admission-unverified",
      });
    } finally {
      if (previous === undefined)
        delete process.env.AGS_RETROSPECTIVE_MANUAL_UI;
      else process.env.AGS_RETROSPECTIVE_MANUAL_UI = previous;
    }
  });
});

describe("status", () => {
  it("reports the capability statement and no path, store or artifact data", () => {
    const handlers = newHandlers(seededIdentity([MAIN_SESSION, null]));
    const status = handlers.status({ agentId: MAIN_SESSION });

    expect(status).toEqual({
      ok: true,
      capability: {
        state: "unavailable",
        reason: "human-admission-unverified",
      },
      automatic: AUTOMATIC_SUPPORT,
      checkpointTool: false,
      identity: { state: "main" },
    });
    expect(Object.keys(status).sort()).toEqual([
      "automatic",
      "capability",
      "checkpointTool",
      "identity",
      "ok",
    ]);
    // No absolute path, artifact id, report text or store field can leak here.
    expect(JSON.stringify(status)).not.toContain("/");
    expect(JSON.stringify(status)).not.toContain("art-");
    expect(JSON.stringify(status)).not.toContain("store");
    expect(JSON.stringify(status)).not.toContain("root");
  });

  it("reports child and unknown identity without gating anything", () => {
    const child = newHandlers(
      seededIdentity([MAIN_SESSION, "agent-parent"]),
    ).status({ agentId: MAIN_SESSION });
    expect(child.identity).toEqual({ state: "child" });

    const unknown = newHandlers().status({ agentId: MAIN_SESSION });
    expect(unknown.identity).toEqual({ state: "unknown" });
    expect(unknown.capability.state).toBe("unavailable");
  });
});

describe("identity registry", () => {
  it("distinguishes main, child and unknown sessions", () => {
    expect(identityOf(null)).toBe("main");
    expect(identityOf("parent")).toBe("child");
    const registry = seededIdentity(
      ["agent-main", null],
      ["agent-child", "agent-main"],
    );
    expect(registry.identity("agent-main")).toBe("main");
    expect(registry.identity("agent-child")).toBe("child");
    expect(registry.identity("agent-seen-nowhere")).toBe("unknown");
  });

  it("updates when the host reports a different parent and stays bounded", () => {
    const registry = createIdentityRegistry(2);
    registry.observe({ id: "a", parentAgentId: null });
    registry.observe({ id: "a", parentAgentId: "parent" });
    expect(registry.identity("a")).toBe("child");
    registry.observe({ id: "b", parentAgentId: null });
    registry.observe({ id: "c", parentAgentId: null });
    expect(registry.size()).toBeLessThanOrEqual(2);
    // Evicted sessions fail closed.
    expect(registry.identity("a")).toBe("unknown");
  });
});

describe("manual capability declaration", () => {
  it("declares automatic invitations unsupported without an agent tool", () => {
    expect(AUTOMATIC_SUPPORT).toEqual({
      state: "unsupported",
      reason: "agent-tool-unavailable",
    });
    expect(CHECKPOINT_TOOL).toBe(false);
  });
});
