// scripts/freshness/versions.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { compareVersions, parseVersion, significantPart } from "./versions";

test("parseVersion accepts 1-3 parts, strips v and +", () => {
  assert.deepEqual(parseVersion("15.3.0"), [15, 3, 0]);
  assert.deepEqual(parseVersion("v20"), [20]);
  assert.deepEqual(parseVersion("3.27+"), [3, 27]);
  assert.deepEqual(parseVersion("REL_17_2"), null);
  assert.deepEqual(parseVersion(""), null);
});

test("compareVersions pads missing parts with zero", () => {
  assert.equal(compareVersions([15], [15, 0, 0]), 0);
  assert.equal(compareVersions([15, 3], [16]), -1);
  assert.equal(compareVersions([21], [17, 9]), 1);
});

test("significantPart truncates to major or major.minor", () => {
  assert.deepEqual(significantPart([3, 27, 1], "minor"), [3, 27]);
  assert.deepEqual(significantPart([15, 3, 0], "major"), [15]);
  assert.deepEqual(significantPart([21], "minor"), [21, 0]);
});
