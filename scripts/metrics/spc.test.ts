// scripts/metrics/spc.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { detectWesternElectricBreach } from "./spc";

test("detectWesternElectricBreach returns undefined when history is too short for a baseline plus tail", () => {
  assert.equal(detectWesternElectricBreach([1, 2, 3], 5), undefined);
});

test("detectWesternElectricBreach returns undefined for an in-control series with real variance", () => {
  const baseline = [10, 11, 9, 10, 11, 9, 10, 11, 9, 10];
  const tail = [10, 11, 9, 10, 11, 9, 10, 11];
  assert.equal(detectWesternElectricBreach([...baseline, ...tail], baseline.length), undefined);
});

test("detectWesternElectricBreach fires 3sigma when the most recent point is beyond 3 sigma", () => {
  const baseline = [10, 11, 9, 10, 11, 9, 10, 11, 9, 10];
  const tail = [10, 10, 10, 10, 10, 10, 10, 1000];
  const result = detectWesternElectricBreach([...baseline, ...tail], baseline.length);
  assert.deepEqual(result, { tier: "3sigma", side: "above" });
});

test("detectWesternElectricBreach fires 1sigma when the last 8 points sit on the same side of the mean", () => {
  const baseline = [10, 9, 11, 10, 9, 11, 10, 9, 11, 10];
  const tail = [10.1, 10.2, 10.1, 10.3, 10.1, 10.2, 10.1, 10.2];
  const result = detectWesternElectricBreach([...baseline, ...tail], baseline.length);
  assert.equal(result?.tier, "1sigma");
});

test("detectWesternElectricBreach returns undefined when the baseline has zero variance and the tail matches it", () => {
  const baseline = [5, 5, 5, 5, 5];
  const tail = [5, 5, 5, 5, 5, 5, 5, 5];
  assert.equal(detectWesternElectricBreach([...baseline, ...tail], baseline.length), undefined);
});
