/**
 * scripts/evals/l3/test-fixtures.ts
 * Shared deterministic fixture generator for D1 manifest and contract tests.
 *
 * Timestamps are anchored to a fixed synthetic calendar (2030) so the suite
 * never starts failing when the wall clock advances; callers that exercise
 * expiry MUST inject the exported trusted clock value.
 */
import type { L3Manifest } from "./manifest";

export const FIXTURE_STARTS_AT = "2030-01-01T00:00:00.000Z";
export const FIXTURE_ENDS_AT = "2030-01-01T01:30:00.000Z";
export const FIXTURE_EXPIRY = "2030-01-02T00:00:00.000Z";

/** Trusted-clock reading to inject for every structure validation in tests. */
export const FIXTURE_NOW_MS = Date.parse(FIXTURE_STARTS_AT);

export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function createValidManifestFixture(overrides: Partial<L3Manifest> = {}): L3Manifest {
  return {
    schema_version: 1,
    protocol: "artifact-v1",
    run_id: "run-20300101-001",
    case_ids: ["payment", "tenant", "overload"],
    arm_sources: {
      A0: {
        artifact_ref: {
          path: "artifacts/A0/service.tar",
          sha256: EMPTY_SHA256,
          size: 0,
        },
      },
      A1: {
        artifact_ref: {
          path: "artifacts/A1/service.tar",
          sha256: EMPTY_SHA256,
          size: 0,
        },
      },
      A2: {
        artifact_ref: {
          path: "artifacts/A2/service.tar",
          sha256: EMPTY_SHA256,
          size: 0,
        },
      },
    },
    attempt_plan: {
      cases: ["payment", "tenant", "overload"],
      arms: ["A0", "A1", "A2"],
      repetitions: 1,
      seed: 42,
      max_attempts_per_arm_case: 1,
      starts_at: FIXTURE_STARTS_AT,
      ends_at: FIXTURE_ENDS_AT,
    },
    generation_contract: {
      prompts_ref: {
        path: "fixtures/prompts.json",
        sha256: EMPTY_SHA256,
        size: 0,
      },
      model: "test-model-v1",
      effort: "medium",
      context_delivery_mode: "frozen-bundle",
      tool_policy: "offline-only",
    },
    runtime_policy: {
      image_digest: "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      node_version: "20.18.0",
      runtime_adapter_version: "1.0.0",
      stage_limits: {
        build: {
          cpu: 1,
          memory_mib: 1024,
          max_processes: 128,
          workspace_disk_mib: 512,
          wall_time_seconds: 120,
          max_output_bytes: 4194304,
        },
        run: {
          cpu: 1,
          memory_mib: 512,
          max_processes: 64,
          attempt_state_disk_mib: 128,
          wall_time_seconds: 90,
          max_output_bytes: 4194304,
          max_frame_bytes: 65536,
        },
      },
      permissible_mounts: ["/workspace/attempt"],
      network_policy: "none",
      deadline_seconds: 120,
    },
    driver_bundle: {
      bundle_ref: {
        path: "fixtures/drivers.tar",
        sha256: EMPTY_SHA256,
        size: 0,
      },
      version: "1.0.0",
    },
    approval_binding: {
      grant_id: "grant-20300101-sse",
      authority: "requesting-maintainer",
      scope: "l3-eval-offline",
      expiry: FIXTURE_EXPIRY,
    },
    retention_policy: {
      custodian: "requesting-maintainer",
      access: "local-restricted",
      retention_days: 30,
      delete_requires_review: true,
    },
    ...overrides,
  };
}
