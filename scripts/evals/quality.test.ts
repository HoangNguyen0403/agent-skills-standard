import assert from "node:assert/strict";
import test from "node:test";
import { isAssertionTaskAnchored, isCompromisedRunArm } from "./quality";

test("preflight requires outcome assertions to be grounded in the task contract", () => {
  assert.equal(
    isAssertionTaskAnchored(
      { type: "contains", value: "session-cost.md" },
      "Which artifact records session cost?",
      "Write metrics to session-cost.md.",
    ),
    true,
  );
  assert.equal(
    isAssertionTaskAnchored(
      { type: "contains", value: "Telemetry & Cost Reporting" },
      "Which artifact records session cost?",
      "Write metrics to session-cost.md.",
    ),
    false,
  );
  assert.equal(
    isAssertionTaskAnchored(
      { type: "contains", value: "Principal Engineer" },
      "Can you critique this code? I want a senior engineer's perspective.",
      "Review using Principal Engineer persona.",
    ),
    true,
  );
});

test("remediation queue uses the current run's compromised arms", () => {
  const manifest = {
    schemaVersion: 2 as const,
    compromisedSkills: [
      {
        category: "common",
        skillName: "common-telemetry",
        arm: "baseline" as const,
        reason: "baseline-compromised" as const,
      },
    ],
  };

  assert.equal(
    isCompromisedRunArm(manifest, "common", "common-telemetry", "baseline"),
    true,
  );
  assert.equal(
    isCompromisedRunArm(manifest, "common", "common-telemetry", "with-skill"),
    false,
  );
  assert.equal(
    isCompromisedRunArm(
      { schemaVersion: 2, compromisedSkills: [] },
      "common",
      "common-telemetry",
      "baseline",
    ),
    false,
  );
});
