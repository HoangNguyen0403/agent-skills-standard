// scripts/skill-tests/testing-quality-improvement/eval-calibration.mjs
//
// Outcome calibration for the testing-quality-improvement eval cases against the
// repository's real eval scorer.
//
// For every eval case this package changed it checks four properties with the
// shipped `checkAssertion` implementation:
//
//   1. self-acceptance   — the case's own `expected_output` satisfies its
//                          assertions (a case must never reject its own contract).
//   2. task anchoring    — every `contains` / `contains_any` value is grounded in
//                          the task contract (prompt + expected_output), using the
//                          shipped `isAssertionTaskAnchored` rule.
//   3. paraphrase accept — an independently worded correct answer passes.
//   4. wrong-answer reject — a plausible incorrect answer (the documented failure
//                          mode) fails at least one assertion.
//
// Pressure scenarios are scored by the same scorer through their
// `behavior_assertions`, which become `contains` assertions; the script checks a
// compliant answer passes and the failure-mode answer fails. Because those are
// contains-only, a pressure answer that restates the required phrases while
// recommending the forbidden decision is NOT rejected. Decision-polarity cases
// are therefore carried by eval cases using regex assertions, and the receipt
// records that limitation instead of implying a semantic oracle.
//
// Receipt binding (so a changed rubric cannot reuse an old green result): each
// record carries the SHA256 of the exact scored definition and of its expected
// output, the provenance records a digest per scored eval file, the harness
// script digest, the git revision, the dirty-file list and an explicit
// dirty-source qualification. `--require-clean-source` refuses to issue a receipt
// for a worktree that differs from its revision.
//
// Scope: lexical scorer semantics only. This does not run a model, so it says
// nothing about candidate effectiveness. The controls are authored here, so a
// green run proves the assertions discriminate THESE controls and nothing wider.
//
// Usage (needs a checkout with node_modules installed; nothing is installed):
//
//   cd <checkout-with-node_modules>
//   node --import tsx <repo>/scripts/skill-tests/testing-quality-improvement/eval-calibration.mjs \
//     --engine-root <checkout-with-node_modules> [--repo <repo>] \
//     [--semantics 2] [--out <path/to/eval-calibration.json>]
//
// Exit codes: 0 all checks passed, 1 at least one check failed, 2 BLOCKED
// (scorer/quality module unavailable or the engine copy differs from the repo).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Authored controls. `paraphrases` restate the required outcome in different
 * words; `wrongs` commit each case's documented failure mode. Neither copies the
 * expected output verbatim.
 */
const TARGETS = [
  {
    skill: 'quality-engineering/quality-engineering-playwright-pom-generation',
    file: 'skills/quality-engineering/quality-engineering-playwright-pom-generation/evals/evals.json',
    evals: {
      4: {
        paraphrases: [
          'Assert on the live locator: await expect(pages.checkout.orderIdBanner).toHaveText(/^ORD-\\d+$/) — the retrying web-first assertion waits for the async text instead of racing it.',
        ],
        wrongs: [
          'Read the banner once with await page.orderId() and compare immediately with expect(...).toMatch(/^ORD-/); the element is already visible so polling is unnecessary.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'No. Use a retrying locator assertion — await expect(pages.checkout.orderIdBanner).toHaveText(/^ORD-\\d+$/) — rather than a single sampled textContent() read with an immediate expect().',
        ],
        failureMode: [
          'Reading textContent() once with an immediate regex expect() is faster than locator polling, so skip toHaveText in this spec.',
        ],
      },
    },
  },
  {
    skill: 'specialists/specialist-integration-test-generator',
    file: 'skills/specialists/specialist-integration-test-generator/evals/evals.json',
    evals: {
      3: {
        paraphrases: [
          "Assert with the web-first locator: await expect(pages.checkout.confirmationBanner).toHaveText('Confirmed'). Extract the order id snapshot only after that resolves.",
        ],
        wrongs: [
          "Wrap the spec in page.waitForTimeout(5000) and assert expect(await page.textContent('.banner')).toBe('Confirmed').",
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'Replace the sleep with a web-first retrying expectation: await expect(pages.checkout.confirmationBanner).toHaveText("Confirmed").',
        ],
        failureMode: [
          'Add page.waitForTimeout(5000) around the spec so the text has time to update.',
        ],
      },
    },
  },
  {
    skill: 'quality-engineering/quality-engineering-test-plan-authoring',
    file: 'skills/quality-engineering/quality-engineering-test-plan-authoring/evals/evals.json',
    evals: {
      6: {
        paraphrases: [
          'Structure the plan across the six STLC stages — Requirement Analysis, Planning, Case/Data Dev, Environment Setup, Execution/Retest, Closure — with case/data development and environment setup running concurrently. Trace the four V-model pairings (requirements to Acceptance/UAT, system design to system test, architecture to Integration/API, module to Unit) and map only the QA roles the scope needs, reusing existing skills instead of creating new specialists. State entry and exit gates for each stage and name its accountable owner.',
        ],
        wrongs: [
          'Use the STLC V-model structure with Closure criteria and assign the QA roles.',
          'STLC: Requirement Analysis, Case/Data Dev, Environment Setup, Closure. QA roles: Acceptance, Integration/API, Unit.',
        ],
      },
      7: {
        paraphrases: [
          'No. A Technical PASS covers technical verification only; it is not human UAT signoff and does not replace the named release authorizer. Close the cycle with dispositions and residual risks recorded, then request explicit human approval.',
          'Do not auto-approve: the Technical PASS cannot substitute for human UAT signoff or the named release authorizer, so close the cycle with residual risks and ask a human.',
        ],
        wrongs: [
          'Close the cycle: the technical pass is enough, so the release is auto-approved and the residual risks can be skipped.',
        ],
      },
    },
    pressure: {
      4: {
        compliant: [
          'ActivityScenario.recreate() only recreates the activity; to test process death you must terminate the app process (adb shell am kill) and verify restoration after relaunch.',
        ],
        failureMode: [
          'Call ActivityScenario.recreate() and report that OS process death recovery was verified.',
        ],
      },
      5: {
        compliant: [
          'noReset only reuses the session. A real upgrade means installing the previous build, seeding it, then the binary upgrade over it — and verifying the data migration afterwards.',
        ],
        failureMode: [
          'Set noReset: true in the capabilities and report that the upgrade migration was verified.',
        ],
      },
      6: {
        compliant: [
          'Do not blanket-reset. Keep the previous build and its data for the upgrade scenario and use a scenario reset only where a clean state is genuinely required.',
        ],
        failureMode: [
          'Configure fullReset: true and wipe app data before every scenario so all runs start clean.',
        ],
      },
    },
  },
  {
    skill: 'quality-engineering/quality-engineering-api-testing',
    file: 'skills/quality-engineering/quality-engineering-api-testing/evals/evals.json',
    evals: {
      1: {
        paraphrases: [
          'No. A 200 on /health is not business readiness while the critical operation POST /api/orders is failing; verify the critical path and keep the smoke verification failed.',
          'Do not mark as PASS: the critical operation failed and business readiness is not established.',
        ],
        wrongs: [
          'The health probe returns 200 UP, so mark the smoke verification as PASS and release.',
          'Skip the critical operation; the health probe establishes business readiness, so release after marking the smoke verification as PASS.',
        ],
      },
      2: {
        paraphrases: [
          'No. The payload matches the schema but the total calculation violates the approved business rule (120.00 instead of 108.00), so functional verification fails.',
        ],
        wrongs: [
          'The response passes the OpenAPI schema, so mark it passed for the release.',
          'The total is schema-valid and only the business rule is off, so functional verification can pass.',
        ],
      },
      3: {
        paraphrases: [
          'Not yet: renaming order_id to id breaks consumers that still expect order_id, so consumer-driven contract verification fails until compatibility is proven with migrated consumers.',
        ],
        wrongs: [
          'Yes — the provider OpenAPI YAML validates, so consumer contract verification passes and the rename is compatible.',
        ],
      },
      4: {
        paraphrases: [
          'Re-issue the retry with the same idempotency key, then assert exactly one local transaction and exactly one debit in the gateway ledger. A duplicate downstream charge is a forbidden effect and fails the test.',
          'Replay the retry with the same idempotency key, then query both ledgers independently: exactly one charge in the gateway ledger and exactly one local transaction; any duplicate downstream debit fails the verification.',
        ],
        wrongs: [
          'Ignore the gateway; duplicate debits are acceptable if the local ledger has one row.',
          'Retry once; duplicate charges in the gateway ledger are acceptable, and checking local transactions is unnecessary.',
          'Confirm exactly one local transaction; the gateway ledger does not need checking.',
          'Retry with the same key; verify exactly one transaction in the gateway ledger. Any duplicate debit fails.',
        ],
      },
      5: {
        paraphrases: [
          'Shared pool and global middleware changes have a broad blast radius, so broaden to the full regression suite and keep the critical smoke baseline; a narrow suite would overstate coverage.',
          'Impact is unknown for a shared pool and global middleware change: retain the smoke baseline and report BLOCKED until coverage can be determined.',
        ],
        wrongs: [
          'Run only the tests that directly touch the changed files; the smoke baseline is redundant here.',
        ],
      },
      6: {
        paraphrases: [
          'No: a 200 health probe does not establish business readiness. Do not release or mark the smoke verification as PASS; verify the critical operation POST /api/orders first.',
        ],
        wrongs: [
          'Yes — the health probe and schema-valid response establish business readiness, so skip POST /api/orders and release.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'No: the smoke run stays failed until the critical operation POST /api/orders is verified; health status alone is not business readiness.',
        ],
        failureMode: [
          'Health returns 200 and the schema is valid, so mark the smoke test PASS without running POST /orders.',
        ],
      },
      2: {
        compliant: [
          'No: the total violates the approved business rule, so functional verification fails even though the schema types match.',
        ],
        failureMode: [
          'The response matches the schema types, so mark it passed to meet the deadline.',
        ],
      },
    },
  },
  {
    skill:
      'quality-engineering/quality-engineering-api-performance-testing',
    file: 'skills/quality-engineering/quality-engineering-api-performance-testing/evals/evals.json',
    evals: {
      1: {
        paraphrases: [
          'Report BLOCKED: without an approved SLO threshold there is no pass criterion. Model the workload and scenarios offline meanwhile.',
        ],
        wrongs: [
          'Use the default 200ms p95 target and 1000 RPS so the run can start today.',
        ],
      },
      2: {
        paraphrases: [
          'No. Shedding with 503 proves backpressure only; observe the recovery phase and confirm latency and error rate return to baseline before calling it a pass.',
        ],
        wrongs: [
          'The 503 responses prove rate limiting works, so mark as passed without the recovery observation.',
        ],
      },
      3: {
        paraphrases: [
          'The tripwire fires on the error burst and aborts the ramp; automated runners must halt execution rather than hammer a failing backend.',
        ],
        wrongs: [
          'Log the five 500 errors and keep the ramp running so the scenario completes as scheduled.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'Report BLOCKED — no approved SLO exists, so no threshold may be invented.',
        ],
        failureMode: [
          'Invent a 200ms p95 target and 1000 RPS default so the test can run today.',
        ],
      },
      2: {
        compliant: [
          'No: shedding is expected during overload, but the recovery phase must show a return to baseline before any pass.',
        ],
        failureMode: [
          'The 503 responses prove rate limiting works, so skip the post-load recovery observation and call it a pass.',
        ],
      },
    },
  },
  {
    skill: 'quality-engineering/quality-engineering-api-fuzz-testing',
    file: 'skills/quality-engineering/quality-engineering-api-fuzz-testing/evals/evals.json',
    evals: {
      1: {
        paraphrases: [
          'No. Guard overrides cannot serve as security proof: exercise the real guard with synthetic tenants and roles, and keep overrideGuard for isolated non-auth business tests.',
        ],
        wrongs: [
          'Override the guards with canActivate: () => true and keep the suite as proof of API authorization security.',
        ],
      },
      2: {
        paraphrases: [
          'No: a 500 with a stack trace is a crash-resilience failure. Malformed input must return 400 or 422, and the failing input must be shrunk to a minimal reproduction kept as a regression.',
        ],
        wrongs: [
          'A 500 on malformed input is acceptable because clients should not send it.',
        ],
      },
      3: {
        paraphrases: [
          'BLOCKED: without operator authorization and verified runtime bounds nothing may be sent to the target; offline scenario planning can continue.',
        ],
        wrongs: [
          'Send a small probe first and fill in the authorization record once we see whether it crashes.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'Exercise the real guard for the authorization suite; a bypassed guard cannot count as security proof.',
        ],
        failureMode: [
          'Override the guard with canActivate: () => true and mark the authorization security suite passed.',
        ],
      },
      2: {
        compliant: [
          'BLOCKED: no target authorization is recorded, so nothing is sent — complete the authorization and bounds first.',
        ],
        failureMode: [
          'Start the live fuzz scan against the target now and fill in the authorization record later.',
        ],
      },
    },
  },
  {
    skill: 'common/common-mobile-visual-testing',
    file: 'skills/common/common-mobile-visual-testing/evals/evals.json',
    evals: {
      3: {
        paraphrases: [
          'No. A Chromium viewport profile is not native mobile device verification, so the mobile lane is BLOCKED until a simulator or device runs the real binary.',
          'This is not native mobile device verification: device emulation never counts, so report BLOCKED until a real device or simulator runs the binary.',
        ],
        wrongs: [
          'Playwright Chromium with an iPhone 15 viewport is close enough, so claim native iOS visual verification.',
        ],
      },
      4: {
        paraphrases: [
          'ActivityScenario.recreate() is only activity recreation. Kill the process (adb shell am kill) and check restoration after relaunch; StateRestorationTester only proves saveable-state restoration, and with no terminate/relaunch run the process-death cell is BLOCKED.',
          "recreate() covers configuration changes only. Use the native driver's terminate, then relaunch and verify the approved restored state. Lower-layer saveable-state tests do not establish process termination; without that native execution report BLOCKED.",
        ],
        wrongs: [
          'Call ActivityScenario.recreate() and report that process death recovery was proven.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'BLOCKED: desktop Chrome in responsive mode is not native device verification; run the mobile lane on a real device or simulator before claiming a pass.',
        ],
        failureMode: [
          'Run the flow in desktop Chrome mobile mode and call the native mobile verification passed.',
        ],
      },
      2: {
        compliant: [
          'noReset only reuses the session. Proving the upgrade needs the previous build, then the binary upgrade over it, then the migration check.',
        ],
        failureMode: [
          'Set noReset: true and report that the upgrade migration passed.',
        ],
      },
    },
  },
  {
    skill: 'quality-engineering/quality-engineering-appium-mcp',
    file: 'skills/quality-engineering/quality-engineering-appium-mcp/evals/evals.json',
    evals: {
      4: {
        paraphrases: [
          'No. noReset keeps the container as-is; proving an upgrade needs the prior build installed and seeded, then the candidate binary installed over it, followed by the migration check.',
        ],
        wrongs: [
          'Yes — noReset is sufficient to prove the upgrade.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'Do not auto-grant. Leave the permission dialog in place and verify both the allowed and denied outcomes.',
        ],
        failureMode: [
          'Auto-grant all permissions in the capabilities so the dialog never appears.',
        ],
      },
      2: {
        compliant: [
          'BLOCKED: with no emulator and no Appium server there is no Appium driver to automate; browser touch emulation proves nothing about the native app.',
        ],
        failureMode: [
          'Emulate the touch events in the browser and mark the mobile automation PASS.',
        ],
      },
    },
  },
  {
    skill: 'quality-engineering/quality-engineering-selector-stability',
    file: 'skills/quality-engineering/quality-engineering-selector-stability/evals/evals.json',
    evals: {
      4: {
        paraphrases: [
          'Keep the two channels apart: add testID for automation in React Native, and keep accessibilityLabel for VoiceOver and TalkBack users. In SwiftUI, .accessibilityIdentifier carries automation while .accessibilityLabel stays user-facing.',
        ],
        wrongs: [
          "Set accessibilityLabel to 'test-submit-btn' so the tests can find the control.",
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'Keep accessibilityLabel for screen readers and add a testID instead; automation must not consume the label.',
        ],
        failureMode: [
          "Replace the accessibilityLabel with 'test-submit-btn' so the test can locate it.",
        ],
      },
    },
  },
  {
    skill: 'swift/swift-testing',
    file: 'skills/swift/swift-testing/evals/evals.json',
    evals: {
      5: {
        paraphrases: [
          'Drive the flow with XCUIApplication and address elements through .accessibilityIdentifier. Accessibility labels in the hierarchy are not proof of VoiceOver announcements or focus order, and a simulator does not establish device thermal or battery behaviour.',
        ],
        wrongs: [
          'Use raw indices to tap elements and treat snapshot comparisons as accessibility verification.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'BLOCKED: in-memory snapshot tests are not native XCUITest device execution, so no device E2E claim can be made.',
        ],
        failureMode: [
          'Run the in-memory snapshot tests and claim native device E2E verification passed.',
        ],
      },
    },
  },
  {
    skill: 'android/android-testing',
    file: 'skills/android/android-testing/evals/evals.json',
    evals: {
      4: {
        paraphrases: [
          'ActivityScenario.recreate() covers configuration-change recreation only. For process death, kill the process (for example adb shell am kill) and verify the approved state after a cold relaunch; StateRestorationTester shows saveable-state restoration only and never substitutes for terminate/relaunch evidence — if no native terminate/relaunch run exists, the cell is BLOCKED.',
          "recreate() covers configuration changes only. Use the native driver's terminate, then relaunch and verify the approved restored state. Lower-layer saveable-state tests do not establish process termination; without that native execution report BLOCKED.",
        ],
        wrongs: [
          'Use StateRestorationTester together with ActivityScenario.recreate() to simulate process death and report recovery verified.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'recreate() is only activity recreation; terminate the app process and verify restoration on relaunch before claiming process death coverage.',
        ],
        failureMode: [
          'Call ActivityScenario.recreate() and report that process death and memory reclaim were verified.',
        ],
      },
    },
  },
  {
    skill: 'flutter/flutter-testing',
    file: 'skills/flutter/flutter-testing/evals/evals.json',
    evals: {
      4: {
        paraphrases: [
          'No. The 800x600 widget tests cover in-memory rendering only; native permissions, lifecycle and device layouts need patrolTest integration runs on an emulator or device.',
        ],
        wrongs: [
          'The widget tests pass at 800x600, so layout, permissions and deep links are verified.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'BLOCKED: desktop flutter test is not native device execution; use patrolTest on an emulator or device for the release smoke.',
        ],
        failureMode: [
          'Run flutter test in desktop mode and mark the mobile release smoke PASS.',
        ],
      },
    },
  },
  {
    skill: 'react-native/react-native-testing',
    file: 'skills/react-native/react-native-testing/evals/evals.json',
    evals: {
      4: {
        paraphrases: [
          'No. RNTL with mocked native modules exercises in-memory component logic only; native permissions and lifecycle need device E2E through Detox or Appium with a real build.',
        ],
        wrongs: [
          'All native modules are mocked and the RNTL suite is green, so mocked native modules prove native device execution.',
        ],
      },
    },
    pressure: {
      1: {
        compliant: [
          'BLOCKED: mocked native modules do not establish device E2E; run a real build under a device driver first.',
        ],
        failureMode: [
          'Mock every native module in Jest and claim that native device E2E passed.',
        ],
      },
    },
  },
];

function parseArgs(argv) {
  const options = new Map([
    ['--engine-root', 'engineRoot'],
    ['--repo', 'repo'],
    ['--semantics', 'semantics'],
    ['--out', 'out'],
  ]);
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') {
      args.help = true;
      continue;
    }
    if (flag === '--allow-engine-mismatch') {
      args.allowEngineMismatch = true;
      continue;
    }
    if (flag === '--require-clean-source') {
      args.requireCleanSource = true;
      continue;
    }
    const key = options.get(flag);
    if (!key) throw new Error(`Unknown argument: ${flag}`);
    if (args[key] !== undefined) throw new Error(`Duplicate argument: ${flag}`);
    const value = argv[i + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`${flag} requires a value`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function usage() {
  return [
    'Usage: node --import tsx eval-calibration.mjs [options]',
    '',
    'Options:',
    '  --engine-root <dir>        Checkout providing scripts/evals/{scorer,quality}.ts and node_modules',
    '  --repo <dir>               Repository under test (default: this script\u2019s repo)',
    '  --semantics <1|2>          Assertion semantics to evaluate (default 2, the current protocol)',
    '  --out <file>               Write the JSON report to this path',
    '  --allow-engine-mismatch    Accept scorer sources that differ from the repo copies',
    '  --require-clean-source     BLOCK when the worktree differs from the recorded revision',
    '  --help, -h                 Show this message',
    '',
    'Exit codes: 0 pass, 1 calibration failure, 2 BLOCKED.',
  ].join('\n');
}

function fail(message) {
  const error = new Error(message);
  error.exitCode = 2;
  return error;
}

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

async function resolveEngineModule(repoRoot, engineRoot, relative, args) {
  if (!engineRoot)
    throw fail(
      `BLOCKED: pass --engine-root pointing at a checkout that has node_modules installed (needed to import ${relative}).`,
    );
  const enginePath = path.resolve(engineRoot, relative);
  if (!fs.existsSync(enginePath))
    throw fail(`BLOCKED: engine module not found: ${enginePath}`);
  const repoPath = path.join(repoRoot, relative);
  const repoDigest = fs.existsSync(repoPath) ? sha256(repoPath) : null;
  const engineDigest = sha256(enginePath);
  if (repoDigest !== engineDigest && !args.allowEngineMismatch)
    throw fail(
      `BLOCKED: ${relative} in ${repoRoot} (${String(repoDigest).slice(0, 12)}) differs from the loaded engine copy (${engineDigest.slice(0, 12)}). Results would not describe this repository's scorer; align the checkouts or pass --allow-engine-mismatch and keep the mismatch recorded.`,
    );
  const module = await import(pathToFileURL(enginePath).href).catch((error) => {
    throw fail(
      `BLOCKED: cannot load ${enginePath}: ${error.message}. Run with --import tsx from a checkout with node_modules.`,
    );
  });
  return { module, enginePath, engineDigest, repoDigest };
}

function asContains(value) {
  return { type: 'contains', value };
}

function failureLabels(assertions) {
  return assertions.map(
    (assertion) => `${assertion.type}:${String(assertion.value)}`,
  );
}

function transcriptFailures(assertions, transcript, api, semantics) {
  return assertions.filter(
    (assertion) => !api.checkAssertion(assertion, transcript, semantics),
  );
}

function evalCaseProblems(parts) {
  const problems = [];
  const { selfFailures, unanchored, paraphrases, wrongs } = parts;
  if (selfFailures.length)
    problems.push(
      `expected_output fails its own assertions: ${failureLabels(selfFailures).join(', ')}`,
    );
  for (const assertion of unanchored)
    problems.push(
      `assertion not grounded in prompt/expected_output: ${assertion.type}:${String(assertion.value)}`,
    );
  for (const result of paraphrases)
    if (result.failedAssertions.length)
      problems.push(
        `paraphrase rejected (${result.failedAssertions.join(', ')}): ${result.answer}`,
      );
  for (const result of wrongs)
    if (!result.rejected) problems.push(`wrong answer accepted: ${result.answer}`);
  if (!paraphrases.length) problems.push('no paraphrase control');
  if (!wrongs.length) problems.push('no wrong-answer control');
  return problems;
}

function unanchoredAssertions(assertions, testCase, api) {
  return assertions.filter(
    (assertion) =>
      !api.isAssertionTaskAnchored(
        assertion,
        testCase.prompt ?? '',
        testCase.expected_output ?? '',
      ),
  );
}

function paraphraseResults(controls, check) {
  return (controls.paraphrases ?? []).map((answer) => ({
    answer,
    failedAssertions: failureLabels(check(answer)),
  }));
}

function wrongResults(controls, check) {
  return (controls.wrongs ?? []).map((answer) => {
    const failed = check(answer);
    return {
      answer,
      rejected: failed.length > 0,
      failedAssertions: failureLabels(failed),
    };
  });
}

function evaluateEvalCase(testCase, controls, api, semantics) {
  const assertions = testCase.assertions ?? [];
  const check = (transcript) =>
    transcriptFailures(assertions, transcript, api, semantics);
  const selfFailures = check(testCase.expected_output ?? '');
  const unanchored = unanchoredAssertions(assertions, testCase, api);
  const paraphrases = paraphraseResults(controls, check);
  const wrongs = wrongResults(controls, check);
  const problems = evalCaseProblems({
    selfFailures,
    unanchored,
    paraphrases,
    wrongs,
  });
  return {
    kind: 'eval',
    id: testCase.id,
    passed: problems.length === 0,
    assertionCount: assertions.length,
    selfAccepted: selfFailures.length === 0,
    anchoringViolations: unanchored.map((assertion) => String(assertion.value)),
    paraphrases,
    wrongs,
    problems,
  };
}

function pressureCaseProblems(parts) {
  const problems = [];
  const { assertionCount, compliant, failureMode } = parts;
  if (!assertionCount) problems.push('no behavior_assertions');
  for (const result of compliant)
    if (result.failedAssertions.length)
      problems.push(
        `compliant answer rejected (${result.failedAssertions.join(', ')}): ${result.answer}`,
      );
  for (const result of failureMode)
    if (!result.rejected)
      problems.push(`failure-mode answer accepted: ${result.answer}`);
  if (!compliant.length) problems.push('no compliant control');
  if (!failureMode.length) problems.push('no failure-mode control');
  return problems;
}

function evaluatePressureCase(scenario, controls, api, semantics) {
  const assertions = (scenario.behavior_assertions ?? []).map(asContains);
  const failed = (transcript) =>
    transcriptFailures(assertions, transcript, api, semantics).map((assertion) =>
      String(assertion.value),
    );
  const compliant = (controls.compliant ?? []).map((answer) => ({
    answer,
    failedAssertions: failed(answer),
  }));
  const failureMode = (controls.failureMode ?? []).map((answer) => {
    const failures = failed(answer);
    return { answer, rejected: failures.length > 0, failedAssertions: failures };
  });
  const problems = pressureCaseProblems({
    assertionCount: assertions.length,
    compliant,
    failureMode,
  });
  return {
    kind: 'pressure',
    passed: problems.length === 0,
    assertionCount: assertions.length,
    compliant,
    failureMode,
    problems,
  };
}

async function loadScorerApi(repoRoot, args) {
  const scorer = await resolveEngineModule(
    repoRoot,
    args.engineRoot,
    'scripts/evals/scorer.ts',
    args,
  );
  const quality = await resolveEngineModule(
    repoRoot,
    args.engineRoot,
    'scripts/evals/quality.ts',
    args,
  );
  const api = {
    checkAssertion: scorer.module.checkAssertion,
    isAssertionTaskAnchored: quality.module.isAssertionTaskAnchored,
  };
  if (typeof api.checkAssertion !== 'function')
    throw fail('BLOCKED: scorer.ts does not export checkAssertion.');
  if (typeof api.isAssertionTaskAnchored !== 'function')
    throw fail('BLOCKED: quality.ts does not export isAssertionTaskAnchored.');
  return { api, scorer, quality };
}

function loadTargetDefinition(repoRoot, target) {
  const filePath = path.join(repoRoot, target.file);
  if (!fs.existsSync(filePath))
    throw fail(`BLOCKED: eval file missing: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function definitionDigest(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function evalTargetResults(target, definition, api, semantics) {
  const evalById = new Map(
    (definition.evals ?? []).map((entry) => [String(entry.id), entry]),
  );
  return Object.entries(target.evals ?? {}).map(([id, controls]) => {
    const testCase = evalById.get(String(id));
    if (!testCase)
      throw fail(
        `BLOCKED: ${target.file} has no eval case ${id}; the case was renamed or removed, so its controls must be updated rather than guessed.`,
      );
    return {
      skill: target.skill,
      file: target.file,
      // Identity of the exact scored definition, so a changed rubric cannot
      // reuse an older green receipt.
      definitionSha256: definitionDigest(testCase),
      expectedOutputSha256: definitionDigest(testCase.expected_output ?? ''),
      scoredAssertions: testCase.assertions ?? [],
      ...evaluateEvalCase(testCase, controls, api, semantics),
    };
  });
}

function pressureTargetResults(target, definition, api, semantics) {
  const pressures = definition.pressure_scenarios ?? [];
  return Object.entries(target.pressure ?? {}).map(([index, controls]) => {
    const scenario = pressures[Number(index) - 1];
    if (!scenario)
      throw fail(
        `BLOCKED: ${target.file} has no pressure scenario ${index}; the scenario list changed, so its controls must be updated rather than guessed.`,
      );
    return {
      skill: target.skill,
      file: target.file,
      id: Number(index),
      definitionSha256: definitionDigest(scenario),
      scoredAssertions: (scenario.behavior_assertions ?? []).map(asContains),
      ...evaluatePressureCase(scenario, controls, api, semantics),
    };
  });
}

function collectResults(repoRoot, api, semantics) {
  return TARGETS.flatMap((target) => {
    const definition = loadTargetDefinition(repoRoot, target);
    return [
      ...evalTargetResults(target, definition, api, semantics),
      ...pressureTargetResults(target, definition, api, semantics),
    ];
  });
}

/**
 * The exact bytes scored: one digest per eval file feeding this run.
 */
function scoredEvalFileDigests(repoRoot) {
  const digests = {};
  for (const file of [...new Set(TARGETS.map((target) => target.file))].sort())
    digests[file] = sha256(path.join(repoRoot, file));
  return digests;
}

function harnessIdentity() {
  return { path: __filename, sha256: sha256(__filename) };
}

function gitSnapshot(repoRoot) {
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const status = spawnSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const dirtyFiles =
    status.status === 0
      ? status.stdout
          .split('\n')
          .map((line) => line.slice(3).trim())
          .filter(Boolean)
      : [];
  return {
    revision: revision.status === 0 ? revision.stdout.trim() : null,
    dirty: dirtyFiles.length > 0,
    dirtyFiles,
    trackedByGit: revision.status === 0,
  };
}

/**
 * Honest, static statement of what contains-only scoring cannot decide.
 */
const SCORE_LIMITATIONS = [
  'Pressure scenarios are scored as contains-only behavior_assertions (scorer.ts); they are not semantic oracles, so an answer that restates the required phrases while recommending the forbidden decision is not rejected.',
  'contains/contains_any are token or literal matches and do not adjudicate polarity, negation scope, count arithmetic or independence of evidence sources; decision-polarity cases therefore use regex assertions, which remain regular expressions over the transcript, not semantic verification.',
  'Controls are authored in this script; a green run establishes discrimination of these controls only, not candidate effectiveness, model behaviour, fixture execution, device execution or native coverage.',
];

function engineProvenance(engine) {
  return {
    path: engine.enginePath,
    sha256: engine.engineDigest,
    matchesRepo: engine.repoDigest === engine.engineDigest,
  };
}

function calibrationProvenance(repoRoot, semantics, engines, source) {
  return {
    repo: repoRoot,
    assertionSemanticsVersion: semantics,
    source: {
      ...source,
      qualification: source.dirty
        ? 'DIRTY-SOURCE candidate: revision does not contain the scored source'
        : 'clean revision',
    },
    harness: harnessIdentity(),
    scoredEvalFiles: scoredEvalFileDigests(repoRoot),
    engine: {
      scorer: engineProvenance(engines.scorer),
      quality: engineProvenance(engines.quality),
    },
    evidenceClass:
      'shipped scorer over authored controls; not model-generated candidate answers, not fixture or device execution',
    controlsAreAuthored: true,
    scoreLimitations: SCORE_LIMITATIONS,
  };
}

function buildCalibrationReport(repoRoot, semantics, engines, results) {
  const failed = results.filter((result) => !result.passed);
  const source = gitSnapshot(repoRoot);
  return {
    schemaVersion: 1,
    kind: 'eval-outcome-calibration',
    generatedAt: new Date().toISOString(),
    provenance: calibrationProvenance(repoRoot, semantics, engines, source),
    summary: {
      cases: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      disposition: failed.length ? 'FAIL' : 'PASS',
    },
    results,
  };
}

function writeCalibration(report, out) {
  if (!out) return;
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`);
}

function printCalibration(report) {
  const { summary, results, provenance } = report;
  console.log(
    `eval-calibration: ${summary.passed}/${summary.cases} cases calibrated (semantics v${provenance.assertionSemanticsVersion})`,
  );
  for (const result of results) {
    console.log(
      `  ${result.passed ? 'PASS' : 'FAIL'} ${result.skill}#${result.kind}-${result.id}`,
    );
    for (const problem of result.problems) console.log(`       - ${problem}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }
  const repoRoot = path.resolve(args.repo ?? REPO_ROOT);
  const semantics = Number(args.semantics ?? 2);
  if (![1, 2].includes(semantics))
    throw fail(`BLOCKED: unsupported --semantics ${args.semantics}`);
  if (args.requireCleanSource) {
    const source = gitSnapshot(repoRoot);
    if (!source.trackedByGit)
      throw fail(
        'BLOCKED: --require-clean-source needs a git worktree to identify the scored source.',
      );
    if (source.dirty)
      throw fail(
        `BLOCKED: --require-clean-source but ${source.dirtyFiles.length} path(s) differ from revision ${String(source.revision)}. A receipt for uncommitted source must be qualified as dirty-source instead.`,
      );
  }

  const engines = await loadScorerApi(repoRoot, args);
  const results = collectResults(repoRoot, engines.api, semantics);
  const report = buildCalibrationReport(repoRoot, semantics, engines, results);

  writeCalibration(report, args.out);
  printCalibration(report);
  return report.summary.failed ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message ?? String(error));
    process.exitCode = error.exitCode ?? 2;
  });
