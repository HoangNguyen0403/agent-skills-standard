// scripts/skill-tests/testing-quality-improvement/playwright-fixture-runner.mjs
// Executes the delayed-text fixture in a real Chromium browser and uses Playwright's
// own retrying locator assertion (expect(locator).toHaveText). No hand-written polling
// substitutes for the assertion library: when the dependency is absent the run is
// reported BLOCKED, never replaced by a custom implementation.
//
// Cancellation is enforced rather than signalled: browser acquisition is bounded by the
// remaining absolute deadline (with disposal of a late acquisition), the scenario body is
// raced against the same deadline, caller cancellation is propagated, and teardown itself
// is bounded so an owned browser cannot outlive the run.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function resolveHostPlaywrightPackageDir() {
  if (process.env.PLAYWRIGHT_PACKAGE_DIR && fs.existsSync(process.env.PLAYWRIGHT_PACKAGE_DIR)) {
    return process.env.PLAYWRIGHT_PACKAGE_DIR;
  }
  const globalDirs = [
    path.join(os.homedir(), ".npm-global", "lib", "node_modules", "@playwright", "cli", "node_modules", "playwright"),
    path.join(os.homedir(), ".npm-global", "lib", "node_modules", "playwright"),
    "/usr/local/lib/node_modules/playwright",
    "/opt/homebrew/lib/node_modules/playwright"
  ];
  for (const candidate of globalDirs) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveHostChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE && fs.existsSync(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const cacheDirs = [
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), ".cache", "ms-playwright"),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "ms-playwright") : null
  ].filter(Boolean);

  for (const cacheDir of cacheDirs) {
    if (!fs.existsSync(cacheDir)) continue;
    try {
      const entries = fs.readdirSync(cacheDir);
      const chromDirs = entries.filter((e) => e.startsWith("chromium-")).sort().reverse();
      for (const cDir of chromDirs) {
        const candidates = [
          path.join(cacheDir, cDir, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          path.join(cacheDir, cDir, "chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          path.join(cacheDir, cDir, "chrome-linux", "chrome"),
          path.join(cacheDir, cDir, "chrome-win", "chrome.exe")
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) return cand;
        }
      }
    } catch {
      // cache dir unreadable, continue
    }
  }
  return null;
}
const ASSERTION_API = "expect(locator).toHaveText";
const TEARDOWN_BOUND_MS = 5000;

function fileSha256(filePath) {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

function envOverrides() {
  return {
    TQI_PLAYWRIGHT_TEST_MODULE: process.env.TQI_PLAYWRIGHT_TEST_MODULE ?? null,
    PLAYWRIGHT_PACKAGE_DIR: process.env.PLAYWRIGHT_PACKAGE_DIR ?? null,
    PLAYWRIGHT_CHROMIUM_EXECUTABLE: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? null,
    CHROME_BIN: process.env.CHROME_BIN ?? null
  };
}

function resolvePackageEntry(packageName, entryFile) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  const packageDir = path.dirname(packageJsonPath);
  const entryPath = path.join(packageDir, entryFile);
  const version = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version;
  return { entryPath, version, packageJsonPath };
}

// Resolution provenance is recorded from the resolver's own decision, never inferred from
// a hardcoded path: each candidate is labelled, the winner is labelled, and every identity
// (module entry, package manifest, browser executable, browser version) is captured.
export function resolvePlaywrightDependency() {
  const missing = [];
  const candidatesTried = [];
  const overrides = envOverrides();
  const hostPackageDir = resolveHostPlaywrightPackageDir();
  const candidates = [
    process.env.TQI_PLAYWRIGHT_TEST_MODULE
      ? { kind: "env-module-override", value: process.env.TQI_PLAYWRIGHT_TEST_MODULE }
      : null,
    process.env.PLAYWRIGHT_PACKAGE_DIR
      ? { kind: "env-package-dir-override", value: path.join(process.env.PLAYWRIGHT_PACKAGE_DIR, "test.mjs") }
      : null,
    { kind: "package", value: "@playwright/test" },
    { kind: "package", value: "playwright" },
    hostPackageDir && hostPackageDir !== process.env.PLAYWRIGHT_PACKAGE_DIR
      ? { kind: "host-package-file", value: path.join(hostPackageDir, "test.mjs") }
      : null
  ].filter(Boolean);

  for (const candidate of candidates) {
    const label = `${candidate.kind}:${candidate.value}`;
    candidatesTried.push(label);
    try {
      const resolved =
        candidate.kind === "package"
          ? resolvePackageEntry(candidate.value, "test.mjs")
          : { entryPath: candidate.value, version: null, packageJsonPath: null };
      if (!resolved.entryPath || !fs.existsSync(resolved.entryPath)) {
        missing.push(`${candidate.value} (entry not found)`);
        continue;
      }
      const packageJsonPath =
        resolved.packageJsonPath ??
        (() => {
          const candidatePath = path.join(path.dirname(candidate.value), "package.json");
          return fs.existsSync(candidatePath) ? candidatePath : null;
        })();
      const version =
        resolved.version ??
        (() => {
          try {
            return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version;
          } catch {
            return "unknown";
          }
        })();
      const hostExecutable = resolveHostChromiumExecutable();
      const browserExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || hostExecutable;
      const executableAvailable = Boolean(browserExecutable && fs.existsSync(browserExecutable));
      if (!executableAvailable) missing.push(`chromium executable ${browserExecutable ?? "none"}`);
      return {
        available: true,
        status: "READY",
        modulePath: resolved.entryPath,
        version,
        browserExecutable: executableAvailable ? browserExecutable : null,
        assertionApi: ASSERTION_API,
        missing,
        resolution: {
          candidateKind: candidate.kind,
          candidate: candidate.value,
          candidatesTried,
          envOverrides: overrides,
          nodePath: process.env.NODE_PATH ?? null,
          modulePath: resolved.entryPath,
          moduleEntrySha256: fileSha256(resolved.entryPath),
          packageJsonPath,
          packageJsonSha256: packageJsonPath ? fileSha256(packageJsonPath) : null,
          packageVersion: version,
          browserExecutableSource: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? "env-chromium-executable-override"
            : (process.env.CHROME_BIN
              ? "env-chrome-bin-override"
              : (hostExecutable ? "host-cache-fallback" : "none")),
          browserExecutable: executableAvailable ? browserExecutable : null,
          browserExecutableBytes: executableAvailable ? fs.statSync(browserExecutable).size : null
        }
      };
    } catch (error) {
      missing.push(`${candidate.value} (${error.code ?? error.message})`);
    }
  }
  return {
    available: false,
    status: "BLOCKED",
    missing,
    assertionApi: ASSERTION_API,
    resolution: {
      candidateKind: null,
      candidatesTried,
      envOverrides: overrides,
      nodePath: process.env.NODE_PATH ?? null
    }
  };
}

// Every acquisition and operation competes against one absolute deadline and caller abort.
async function raceWithinDeadline(promise, deadlineAt, signal) {
  let timer;
  let abortHandler;
  const completion = Promise.resolve(promise).then(
    (value) => ({ kind: "fulfilled", value }),
    (error) => ({ kind: "rejected", error })
  );
  const bounds = [
    completion,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve({ kind: "expired" }), Math.max(0, deadlineAt - Date.now()));
    })
  ];
  if (signal) {
    bounds.push(new Promise((resolve) => {
      if (signal.aborted) {
        resolve({ kind: "cancelled" });
        return;
      }
      abortHandler = () => resolve({ kind: "cancelled" });
      signal.addEventListener("abort", abortHandler, { once: true });
    }));
  }
  try {
    return await Promise.race(bounds);
  } finally {
    clearTimeout(timer);
    if (abortHandler) signal.removeEventListener("abort", abortHandler);
  }
}

export async function runPlaywrightDelayedTextFixture(baseUrl, options = {}) {
  const delayMs = options.delayMs ?? 800;
  const operationTimeoutMs = options.operationTimeoutMs ?? 5000;
  const scenarioDeadlineMs = options.scenarioDeadlineMs ?? 20000;
  const outerSignal = options.signal ?? null;
  const finalText = "Order #12345 Confirmed";
  const deadlineAt = Date.now() + scenarioDeadlineMs;
  const remaining = () => Math.max(0, deadlineAt - Date.now());
  if (outerSignal?.aborted) {
    return { status: "CANCELLED", reason: "Caller cancelled before acquisition.", cancelled: true, teardown: "NOT_STARTED" };
  }

  const dependency = (options.resolveDependency ?? resolvePlaywrightDependency)();
  if (!dependency.available) {
    return { status: "BLOCKED", reason: `Playwright assertion dependency unavailable: ${dependency.missing.join("; ")}`, dependency, teardown: "NOT_STARTED" };
  }

  let browser = null;
  let teardown = "NOT_STARTED";
  const finish = (result) => ({ ...result, teardown, deadline: { scenarioDeadlineMs, remainingMs: remaining() } });
  const closeBrowser = async () => {
    if (!browser) return "NO_BROWSER";
    const ownedBrowser = browser;
    browser = null;
    const closePromise = Promise.resolve().then(() => ownedBrowser.close());
    const cleanupDeadline = Math.min(deadlineAt, Date.now() + TEARDOWN_BOUND_MS);
    if (cleanupDeadline <= Date.now()) {
      closePromise.catch(() => {});
      teardown = "CLOSE_BOUND_EXCEEDED";
      return teardown;
    }
    const outcome = await raceWithinDeadline(closePromise, cleanupDeadline, null);
    teardown = outcome.kind === "fulfilled"
      ? "CLOSED"
      : outcome.kind === "rejected" ? "CLOSE_FAILED" : "CLOSE_BOUND_EXCEEDED";
    return teardown;
  };

  const importPromise = Promise.resolve().then(() => {
    if (remaining() <= 0) throw Object.assign(new Error("deadline exceeded"), { name: "TimeoutError" });
    return options.loadPlaywright
      ? options.loadPlaywright(dependency)
      : import(pathToFileURL(dependency.modulePath).href);
  });
  const imported = await raceWithinDeadline(importPromise, deadlineAt, outerSignal);
  if (imported.kind === "cancelled" || outerSignal?.aborted) {
    return finish({ status: "CANCELLED", reason: "Caller cancelled while loading Playwright.", cancelled: true, dependency });
  }
  if (imported.kind === "expired" || remaining() <= 0) {
    return finish({ status: "DEADLINE_EXCEEDED", reason: "Deadline expired while loading Playwright.", dependency });
  }
  if (imported.kind === "rejected") {
    const unavailable = ["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND", "ENOENT"].includes(imported.error?.code);
    return finish({
      status: unavailable ? "BLOCKED" : "FAILED",
      reason: `Playwright module import failed: ${imported.error.message}`,
      dependency
    });
  }
  const module = imported.value;

  const launchOptions = {
    ...(dependency.browserExecutable ? { executablePath: dependency.browserExecutable } : {}),
    headless: true,
    timeout: remaining()
  };
  const launchPromise = Promise.resolve().then(() => {
    if (remaining() <= 0) throw Object.assign(new Error("deadline exceeded"), { name: "TimeoutError" });
    return options.launchBrowser
      ? options.launchBrowser(module, launchOptions)
      : module.chromium.launch(launchOptions);
  });
  const acquisition = await raceWithinDeadline(launchPromise, deadlineAt, outerSignal);
  if (acquisition.kind !== "fulfilled") {
    if (acquisition.kind === "cancelled" || acquisition.kind === "expired") {
      teardown = "LATE_ACQUISITION_PENDING";
      launchPromise.then((lateBrowser) => {
        const lateClose = Promise.resolve().then(() => lateBrowser.close());
        return raceWithinDeadline(lateClose, Date.now() + TEARDOWN_BOUND_MS, null);
      }).catch(() => {});
    }
    if (acquisition.kind === "cancelled" || outerSignal?.aborted) {
      return finish({ status: "CANCELLED", reason: "Caller cancelled while launching the browser.", cancelled: true, dependency });
    }
    if (acquisition.kind === "expired" || remaining() <= 0 ||
      (acquisition.kind === "rejected" && acquisition.error?.name === "TimeoutError")) {
      return finish({ status: "DEADLINE_EXCEEDED", reason: "Browser acquisition exceeded the absolute deadline.", dependency });
    }
    const unavailable = acquisition.error?.code === "ENOENT" || acquisition.error?.code === "MODULE_NOT_FOUND";
    return finish({
      status: unavailable ? "BLOCKED" : "FAILED",
      reason: `Chromium launch failed: ${acquisition.error?.message ?? "unknown launch error"}`,
      dependency
    });
  }
  if (outerSignal?.aborted || remaining() <= 0) {
    browser = acquisition.value;
    await closeBrowser();
    return finish(outerSignal?.aborted
      ? { status: "CANCELLED", reason: "Caller cancelled as the browser became available.", cancelled: true, dependency }
      : { status: "DEADLINE_EXCEEDED", reason: "Deadline expired as the browser became available.", dependency });
  }
  browser = acquisition.value;
  // Provenance only: the version is read from the browser this run actually launched.
  // It does not influence any assertion or deadline.
  try {
    const reportedVersion = browser.version();
    dependency.browserVersion = reportedVersion ?? null;
    if (dependency.resolution) dependency.resolution.browserVersion = reportedVersion ?? null;
  } catch {
    dependency.browserVersion = null;
    if (dependency.resolution) dependency.resolution.browserVersion = null;
  }
  const scenario = async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(Math.max(1, Math.min(operationTimeoutMs, remaining())));

    // --- Scenario 1: negative snapshot captured before any mutation is scheduled ---
    await page.goto(`${baseUrl}/ui/delayed-banner?delay=${delayMs}`);
    const textLocator = page.getByTestId("status-banner");
    await textLocator.waitFor({ state: "visible" });
    const negativeSnapshot = (await textLocator.textContent())?.trim() ?? "";
    const negativeTriggerCount = await page.evaluate(() => window.__bannerTriggerCount);

    // --- Scenario 2 (fault): single sampled scalar read instead of a live expectation ---
    // The mutation is scheduled and the value sampled inside one synchronous evaluation,
    // so timer callbacks cannot run in between: the sampled state is deterministically stale.
    const sampledText = await page.evaluate(() => {
      window.__applyBannerUpdate();
      return document.getElementById("status-banner")?.textContent ?? "";
    });
    const sampledPass = sampledText.trim() === finalText;

    // --- Scenario 3 (control): the real retrying locator assertion waits for the update ---
    let locatorPass = true;
    let locatorFaultClass = null;
    try {
      await module.expect(textLocator).toHaveText(finalText);
    } catch {
      locatorPass = false;
      locatorFaultClass = "LOCATOR_EXPECTATION_TIMEOUT";
    }
    // Legitimate point-in-time extraction after settlement (AC-02).
    const orderIdSnapshot = (await textLocator.textContent())?.trim() ?? "";

    // --- Scenario 4 (control): DOM node replacement is re-resolved by the same assertion ---
    await page.goto(`${baseUrl}/ui/delayed-banner?delay=${delayMs}&mode=replacement`);
    const replacementLocator = page.getByTestId("status-banner");
    await replacementLocator.waitFor({ state: "visible" });
    const replacementNegativeSnapshot = (await replacementLocator.textContent())?.trim() ?? "";
    // The stale handle is captured before the replacement is scheduled, so it can never
    // point at the node installed by the timer.
    const replacementHandle = await replacementLocator.elementHandle();
    const replacementTriggerCount = await page.evaluate(() => {
      window.__applyBannerUpdate();
      return window.__bannerTriggerCount;
    });
    let replacementPass = true;
    let replacementFaultClass = null;
    try {
      await module.expect(page.getByTestId("status-banner")).toHaveText(finalText);
    } catch {
      replacementPass = false;
      replacementFaultClass = "DOM_REPLACEMENT_NOT_RE_RESOLVED";
    }
    const replacementObserved = (await page.getByTestId("status-banner").textContent())?.trim() ?? "";
    const replacementHandleDetached = await replacementHandle.evaluate((element) => !element.isConnected);

    return {
      status: "COMPLETED",
      dependency: {
        modulePath: dependency.modulePath,
        version: dependency.version,
        browserExecutable: dependency.browserExecutable,
        assertionApi: dependency.assertionApi
      },
      scenarios: {
        negativeSnapshot: {
          observedText: negativeSnapshot,
          triggerCount: negativeTriggerCount,
          preMutation: negativeSnapshot !== finalText && negativeTriggerCount === 0
        },
        sampledScalarFault: {
          pass: sampledPass,
          observedText: sampledText.trim(),
          faultClass: sampledPass ? null : "SAMPLED_STATE_RACE_CONDITION"
        },
        liveLocatorControl: {
          pass: locatorPass,
          observedText: orderIdSnapshot,
          orderIdSnapshot,
          faultClass: locatorFaultClass
        },
        domReplacementControl: {
          pass: replacementPass,
          observedText: replacementObserved,
          negativeSnapshot: replacementNegativeSnapshot,
          triggerCount: replacementTriggerCount,
          staleHandleDetached: replacementHandleDetached,
          faultClass: replacementFaultClass
        }
      }
    };
  };

  const scenarioPromise = options.executeScenario
    ? Promise.resolve().then(() => options.executeScenario(browser))
    : scenario();
  const run = await raceWithinDeadline(scenarioPromise, deadlineAt, outerSignal);
  if (run.kind !== "fulfilled") {
    await closeBrowser();
    if (run.kind === "cancelled" || outerSignal?.aborted) {
      return finish({ status: "CANCELLED", reason: "Caller cancelled during the scenario.", cancelled: true, dependency });
    }
    if (run.kind === "expired" || remaining() <= 0) {
      return finish({ status: "DEADLINE_EXCEEDED", reason: `Scenario exceeded its ${scenarioDeadlineMs}ms deadline.`, dependency });
    }
    return finish({ status: "FAILED", reason: run.error.message, dependency });
  }
  if (outerSignal?.aborted || remaining() <= 0) {
    await closeBrowser();
    return finish(outerSignal?.aborted
      ? { status: "CANCELLED", reason: "Caller cancelled as the scenario completed.", cancelled: true, dependency }
      : { status: "DEADLINE_EXCEEDED", reason: `Scenario completed after its ${scenarioDeadlineMs}ms deadline.`, dependency });
  }
  await closeBrowser();
  if (teardown !== "CLOSED") {
    return finish({ status: "TEARDOWN_FAILED", reason: `Browser cleanup ended as ${teardown}.`, dependency });
  }
  if (outerSignal?.aborted || remaining() <= 0) {
    return finish(outerSignal?.aborted
      ? { status: "CANCELLED", reason: "Caller cancelled during browser cleanup.", cancelled: true, dependency }
      : { status: "DEADLINE_EXCEEDED", reason: `Browser cleanup exceeded the ${scenarioDeadlineMs}ms deadline.`, dependency });
  }
  return finish({ ...run.value, cancelled: false, dependency });
}
