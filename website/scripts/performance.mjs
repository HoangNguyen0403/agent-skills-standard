#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_URL = process.env.TARGET_URL || 'http://127.0.0.1:4321';
const RUNS_COUNT = 3;
const CHROME_FLAGS = ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
const THRESHOLDS = { minPerformanceScore: 90, maxLcpMs: 2500, maxCls: 0.1 };
const CONFIG = {
  logLevel: 'error',
  output: 'json',
  onlyCategories: ['performance'],
  disableFullPageScreenshot: true,
  formFactor: 'mobile',
  screenEmulation: { mobile: true, width: 375, height: 667, deviceScaleFactor: 2, disabled: false },
  throttling: {
    rttMs: 150,
    throughputKbps: 1638.4,
    cpuSlowdownMultiplier: 4,
    requestLatencyMs: 150,
    downloadThroughputKbps: 1638.4,
    uploadThroughputKbps: 750,
  },
};

function auditFailure(message, lhr) {
  const error = new Error(message);
  error.lhr = lhr;
  return error;
}

function errorReceipt(error) {
  return {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}

async function runSingleAudit(url, chromePath) {
  let chrome;
  let lhr;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS, chromePath: chromePath || undefined });
    const runnerResult = await lighthouse(url, { ...CONFIG, port: chrome.port });
    if (!runnerResult?.lhr) throw new Error(`Lighthouse returned no LHR for ${url}`);

    lhr = runnerResult.lhr;
    if (lhr.runtimeError) {
      throw auditFailure(`Lighthouse runtime error: ${lhr.runtimeError.code} - ${lhr.runtimeError.message}`, lhr);
    }
    const score = lhr.categories?.performance?.score;
    const lcp = lhr.audits?.['largest-contentful-paint']?.numericValue;
    const cls = lhr.audits?.['cumulative-layout-shift']?.numericValue;
    if (typeof score !== 'number' || !Number.isFinite(score)) throw auditFailure(`Missing/non-finite performance score: ${score}`, lhr);
    if (typeof lcp !== 'number' || !Number.isFinite(lcp)) throw auditFailure(`Missing/non-finite LCP numericValue: ${lcp}`, lhr);
    if (typeof cls !== 'number' || !Number.isFinite(cls)) throw auditFailure(`Missing/non-finite CLS numericValue: ${cls}`, lhr);

    return { score: score * 100, lcp, cls, requestedUrl: url, lhr };
  } catch (error) {
    if (lhr && error instanceof Error && !('lhr' in error)) Object.assign(error, { lhr });
    throw error;
  } finally {
    if (chrome) await chrome.kill();
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  const chromePath = process.env.CHROME_PATH || null;
  const runs = [];
  for (let index = 0; index < RUNS_COUNT; index += 1) {
    try {
      runs.push({
        index: index + 1,
        ...await runSingleAudit(TARGET_URL, chromePath),
        error: null,
      });
    } catch (error) {
      runs.push({
        index: index + 1,
        lhr: error instanceof Error && 'lhr' in error ? error.lhr : null,
        error: errorReceipt(error),
      });
    }
  }

  const completed = runs.filter((run) => run.error === null && run.lhr);
  const first = completed[0]?.lhr;
  const lighthouseVersionsMatch = completed.length === RUNS_COUNT &&
    completed.every(({ lhr }) => lhr.lighthouseVersion === first?.lighthouseVersion);
  const userAgentsMatch = completed.length === RUNS_COUNT &&
    completed.every(({ lhr }) => lhr.userAgent === first?.userAgent);
  const requestedAndFinalUrlsMatch = completed.length === RUNS_COUNT &&
    completed.every(({ lhr }) =>
      lhr.requestedUrl === first?.requestedUrl && lhr.finalUrl === first?.finalUrl
    );
  const configSettingsMatch = completed.length === RUNS_COUNT &&
    completed.every(({ lhr }) => JSON.stringify(lhr.configSettings) === JSON.stringify(first?.configSettings));
  const metrics = completed.length === RUNS_COUNT
    ? { score: median(completed.map(({ score }) => score)), lcp: median(completed.map(({ lcp }) => lcp)), cls: median(completed.map(({ cls }) => cls)) }
    : null;
  const thresholdsPassed = metrics !== null &&
    metrics.score >= THRESHOLDS.minPerformanceScore &&
    metrics.lcp <= THRESHOLDS.maxLcpMs &&
    metrics.cls <= THRESHOLDS.maxCls;
  const noRunErrors = runs.every((run) => run.error === null);
  const passed = noRunErrors && lighthouseVersionsMatch && userAgentsMatch && requestedAndFinalUrlsMatch && configSettingsMatch && thresholdsPassed;
  const summary = {
    targetUrl: TARGET_URL,
    timestamp: new Date().toISOString(),
    requestedRuns: RUNS_COUNT,
    environment: {
      chromePath,
      chromeFlags: CHROME_FLAGS,
      lighthouseConfig: CONFIG,
      nodeVersion: process.version,
    },
    conditions: {
      device: 'Mobile (375x667 @ 2x)',
      networkThrottling: '150ms RTT, 1638.4Kbps down, 750Kbps up',
      cpuThrottling: '4x slowdown',
      labOnly: true,
      fieldInpInferred: false,
    },
    thresholds: THRESHOLDS,
    consistency: {
      allThreeCompleted: completed.length === RUNS_COUNT,
      noRunErrors,
      lighthouseVersionsMatch,
      userAgentsMatch,
      requestedAndFinalUrlsMatch,
      configSettingsMatch,
    },
    individualRuns: runs,
    median: metrics,
    passed,
  };
  const outputDir = path.resolve(__dirname, '../test-results');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'lighthouse-summary.json');
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`Complete Lighthouse receipts written to: ${outputPath}`);

  if (!passed) throw new Error('Lighthouse run failed: incomplete/error results, inconsistent versions/configuration, or median thresholds breached.');
  console.log(`Median performance ${metrics.score}/100; LCP ${metrics.lcp}ms; CLS ${metrics.cls}.`);
}

main().catch((error) => {
  console.error('Fatal Lighthouse audit execution error:', error);
  process.exit(1);
});
