#!/usr/bin/env node
/**
 * Trusted Verifier for Pagination Boundary Task.
 *
 * This verifier runs OUTSIDE the mutable workspace and exercises
 * consumer-visible behavior, boundary conditions, and error invariants.
 *
 * Usage:
 *   node verify-pagination.js <workspacePath>
 */

const path = require("node:path");
const assert = require("node:assert/strict");

const workspacePath = process.argv[2];
if (!workspacePath) {
  console.error("Usage: node verify-pagination.js <workspacePath>");
  process.exit(1);
}

const modulePath = path.resolve(workspacePath, "src", "paginate.js");

let paginate;
try {
  const mod = require(modulePath);
  paginate = mod.paginate;
  assert.equal(
    typeof paginate,
    "function",
    "Module must export a 'paginate' function.",
  );
} catch (err) {
  console.error(`FAILED: Failed to load paginate module: ${err.message}`);
  process.exit(1);
}

const testCases = [
  {
    name: "Input validation: throws TypeError for non-array items",
    run: () => {
      assert.throws(
        () => paginate(null),
        { name: "TypeError" },
        "paginate(null) must throw TypeError",
      );
      assert.throws(
        () => paginate(undefined),
        { name: "TypeError" },
        "paginate(undefined) must throw TypeError",
      );
      assert.throws(
        () => paginate("string"),
        { name: "TypeError" },
        "paginate(string) must throw TypeError",
      );
      assert.throws(
        () => paginate({}),
        { name: "TypeError" },
        "paginate(object) must throw TypeError",
      );
    },
  },
  {
    name: "Empty collection boundary: [] returns totalPages: 0 and hasNext/hasPrev: false",
    run: () => {
      const res = paginate([]);
      assert.deepEqual(res.data, [], "data must be []");
      assert.equal(res.pagination.totalItems, 0, "totalItems must be 0");
      assert.equal(res.pagination.totalPages, 0, "totalPages must be 0");
      assert.equal(res.pagination.hasNextPage, false, "hasNextPage must be false");
      assert.equal(res.pagination.hasPrevPage, false, "hasPrevPage must be false");
    },
  },
  {
    name: "Normal pagination: multi-page progression",
    run: () => {
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      // Page 1
      const p1 = paginate(items, { page: 1, pageSize: 10 });
      assert.equal(p1.data.length, 10);
      assert.equal(p1.data[0], 1);
      assert.equal(p1.data[9], 10);
      assert.equal(p1.pagination.page, 1);
      assert.equal(p1.pagination.pageSize, 10);
      assert.equal(p1.pagination.totalItems, 25);
      assert.equal(p1.pagination.totalPages, 3);
      assert.equal(p1.pagination.hasNextPage, true);
      assert.equal(p1.pagination.hasPrevPage, false);

      // Page 2
      const p2 = paginate(items, { page: 2, pageSize: 10 });
      assert.equal(p2.data.length, 10);
      assert.equal(p2.data[0], 11);
      assert.equal(p2.data[9], 20);
      assert.equal(p2.pagination.page, 2);
      assert.equal(p2.pagination.hasNextPage, true);
      assert.equal(p2.pagination.hasPrevPage, true);

      // Page 3 (final partial page)
      const p3 = paginate(items, { page: 3, pageSize: 10 });
      assert.equal(p3.data.length, 5);
      assert.equal(p3.data[0], 21);
      assert.equal(p3.data[4], 25);
      assert.equal(p3.pagination.page, 3);
      assert.equal(p3.pagination.hasNextPage, false);
      assert.equal(p3.pagination.hasPrevPage, true);
    },
  },
  {
    name: "Boundary: exact multiple of pageSize",
    run: () => {
      const items = Array.from({ length: 20 }, (_, i) => i + 1);
      const res = paginate(items, { page: 2, pageSize: 10 });
      assert.equal(res.data.length, 10);
      assert.equal(res.pagination.totalPages, 2);
      assert.equal(res.pagination.hasNextPage, false);
      assert.equal(res.pagination.hasPrevPage, true);
    },
  },
  {
    name: "Boundary: single page collection (totalPages === 1)",
    run: () => {
      const items = [1, 2, 3];
      const res = paginate(items, { page: 1, pageSize: 10 });
      assert.equal(res.data.length, 3);
      assert.equal(res.pagination.totalPages, 1);
      assert.equal(res.pagination.hasNextPage, false);
      assert.equal(res.pagination.hasPrevPage, false);
    },
  },
  {
    name: "Boundary: page beyond totalPages returns empty data with hasPrevPage: true",
    run: () => {
      const items = [1, 2, 3, 4, 5];
      const res = paginate(items, { page: 5, pageSize: 2 });
      assert.deepEqual(res.data, []);
      assert.equal(res.pagination.totalItems, 5);
      assert.equal(res.pagination.totalPages, 3);
      assert.equal(res.pagination.hasNextPage, false);
      assert.equal(res.pagination.hasPrevPage, true);
    },
  },
  {
    name: "Input normalization: non-positive or non-integer page normalized to 1",
    run: () => {
      const items = [1, 2, 3];
      const pZero = paginate(items, { page: 0 });
      assert.equal(pZero.pagination.page, 1, "page 0 should normalize to 1");
      assert.equal(pZero.data.length, 3);

      const pNeg = paginate(items, { page: -10 });
      assert.equal(pNeg.pagination.page, 1, "page -10 should normalize to 1");

      const pNaN = paginate(items, { page: NaN });
      assert.equal(pNaN.pagination.page, 1, "page NaN should normalize to 1");
    },
  },
  {
    name: "Page size clamping: pageSize capped at maxPageSize and bounded below by 1",
    run: () => {
      const items = Array.from({ length: 150 }, (_, i) => i + 1);

      // Default maxPageSize is 100
      const resDefault = paginate(items, { pageSize: 500 });
      assert.equal(
        resDefault.pagination.pageSize,
        100,
        "pageSize 500 should be capped at default maxPageSize 100",
      );
      assert.equal(resDefault.data.length, 100);

      // Custom maxPageSize
      const resCustom = paginate(items, { pageSize: 200, maxPageSize: 50 });
      assert.equal(
        resCustom.pagination.pageSize,
        50,
        "pageSize 200 should be capped at custom maxPageSize 50",
      );
      assert.equal(resCustom.data.length, 50);

      // Non-positive pageSize clamped to 1
      const resZero = paginate(items, { pageSize: 0 });
      assert.equal(
        resZero.pagination.pageSize,
        1,
        "pageSize 0 should clamp to 1",
      );
      assert.equal(resZero.data.length, 1);
    },
  },
];

let failed = 0;
for (const tc of testCases) {
  try {
    tc.run();
    console.log(`[PASS] ${tc.name}`);
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${tc.name}: ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\nVerifier failed with ${failed} failed check(s).`);
  process.exit(1);
} else {
  console.log(`\nVerifier succeeded: All ${testCases.length} checks passed.`);
  process.exit(0);
}
