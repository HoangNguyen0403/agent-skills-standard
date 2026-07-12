import assert from "node:assert/strict";
import test from "node:test";
import { isCompromisedRunArm } from "./quality";

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
