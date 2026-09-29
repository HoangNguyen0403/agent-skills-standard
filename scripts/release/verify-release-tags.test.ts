import assert from "node:assert/strict";
import test from "node:test";
import { validateReleaseEntry } from "../verify-release-tags";

test("validateReleaseEntry flags missing trigger in publish.yml", () => {
  const failures = validateReleaseEntry(
    "workflows",
    { version: "1.0.0", tag_prefix: "workflows-v" },
    ["typescript-v*", "common-v*"],
  );

  assert.equal(failures.length, 1);
  assert.match(failures[0], /has no trigger for "workflows-v\*"/);
});

test("validateReleaseEntry passes when trigger is present", () => {
  const failures = validateReleaseEntry(
    "workflows",
    { version: "1.0.0", tag_prefix: "workflows-v" },
    ["workflows-v*", "typescript-v*"],
  );

  assert.deepEqual(failures, []);
});

test("validateReleaseEntry catches missing version or tag_prefix", () => {
  assert.deepEqual(
    validateReleaseEntry("bad-ver", { tag_prefix: "bad-v" }, []),
    ["bad-ver: missing version"],
  );
  assert.deepEqual(
    validateReleaseEntry("bad-prefix", { version: "1.0.0" }, []),
    ["bad-prefix: missing tag_prefix"],
  );
});
