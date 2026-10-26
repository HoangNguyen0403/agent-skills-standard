// scripts/skill-tests/testing-quality-improvement/router-matrix.mjs
//
// Actual-router activation matrix for the testing-quality-improvement package.
//
// What this proves (and what it does not):
//   - It executes the shipped MCP router (mcp/src/services/SkillIndex.ts,
//     `matchKeywords`) against the canonical registry under `skills/`.
//     Nothing here re-implements trigger matching; there is no mock lookup.
//   - 31 cases: nine API purposes, sixteen mobile stack/scenario cells and six
//     negatives (four unrelated topics plus two non-HTTP repository/interface
//     contract near misses whose keyword input must not activate API contract
//     guidance).
//   - It is NOT transcript scoring. Eval `should_trigger` / `pressure_scenarios`
//     text measures model activation from transcripts; this matrix measures the
//     registry router itself.
//   - It is NOT behavioural fixture evidence. Routing success never implies any
//     assertion oracle, fixture, driver or device executed.
//
// Usage (needs a checkout that has node_modules installed, e.g. the primary
// checkout; no installation is performed here):
//
//   cd <checkout-with-node_modules>
//   node --import tsx <repo>/scripts/skill-tests/testing-quality-improvement/router-matrix.mjs \
//     --engine-root <checkout-with-node_modules> \
//     [--skills-dir <repo>/skills] [--metadata <repo>/skills/metadata.json] \
//     [--out <path/to/router-matrix.json>]
//
// Alternatively export AGS_ROUTER_MODULE=<abs path to mcp/src/services/SkillIndex.ts>.
// The script refuses to run when the router source it loads differs from the
// registry-under-test revision unless --allow-router-mismatch is passed, so a
// result can never be attributed to a different router build by accident.
//
// Exit codes: 0 every case passed, 1 at least one case failed, 2 BLOCKED
// (router/dependency unavailable or revision mismatch). A blocked run never
// reports PASS.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const API_TESTING = 'quality-engineering/quality-engineering-api-testing';
const API_PERF =
  'quality-engineering/quality-engineering-api-performance-testing';
const API_FUZZ = 'quality-engineering/quality-engineering-api-fuzz-testing';
const SWIFT = 'swift/swift-testing';
const ANDROID = 'android/android-testing';
const FLUTTER = 'flutter/flutter-testing';
const REACT_NATIVE = 'react-native/react-native-testing';

/**
 * Declared triggers that are too generic to establish that a registry names a
 * concept: they fire on almost any testing request. A case cannot pass on one
 * of these even though the skill is selected.
 */
const GENERIC_TRIGGERS = new Set([
  'test',
  'testing',
  'render',
  'waitfor',
  'jest',
  'robot',
]);

/**
 * Each case is one natural-language request plus the concept words a caller
 * passes to `load_skills_for_keywords` (the real tool input; the router matches
 * those words against each skill's declared `triggers.keywords`).
 *
 * `expect` is the exact skill the request must retrieve; `forbid` lists skills
 * whose selection is a false positive for that request. All expectations and
 * prohibitions are per query; a case passes only when every expectation is
 * selected and no prohibited skill is selected.
 */
const CASES = [
  // -------- AC-16: nine API testing purposes --------
  {
    id: 'api-smoke',
    group: 'api-purpose',
    purpose: 'smoke',
    query:
      'Verify the API smoke suite is ready for release: health is green but POST /api/orders is broken.',
    keywords: ['api smoke test'],
    expect: [API_TESTING],
    forbid: [API_PERF, API_FUZZ],
  },
  {
    id: 'api-functional',
    group: 'api-purpose',
    purpose: 'functional',
    query:
      'Check the order total business rules in functional API tests, not just schema conformance.',
    keywords: ['api correctness', 'functional api test'],
    expect: [API_TESTING],
    forbid: [API_PERF, API_FUZZ],
  },
  {
    id: 'api-contract',
    group: 'api-purpose',
    purpose: 'contract',
    query:
      'Add consumer-driven contract verification between OrderService and PaymentGateway.',
    keywords: ['api contract test', 'consumer contract'],
    expect: [API_TESTING],
    forbid: [API_PERF, API_FUZZ],
  },
  {
    id: 'api-integration',
    group: 'api-purpose',
    purpose: 'integration',
    query:
      'Verify integration state and idempotent retry after a gateway timeout that committed the charge.',
    keywords: ['api integration test', 'idempotency'],
    expect: [API_TESTING],
    forbid: [API_PERF, API_FUZZ],
  },
  {
    id: 'api-regression',
    group: 'api-purpose',
    purpose: 'regression',
    query:
      'Select API regression tests after the pricing discount change and record exclusions.',
    keywords: ['api regression selection'],
    expect: [API_TESTING],
    forbid: [API_PERF, API_FUZZ],
  },
  {
    id: 'api-load',
    group: 'api-purpose',
    purpose: 'load',
    query:
      'Plan an API load test for checkout using the approved p95 latency SLO and request mix.',
    keywords: ['api load testing', 'p95 latency'],
    expect: [API_PERF],
    forbid: [API_FUZZ],
  },
  {
    id: 'api-stress',
    group: 'api-purpose',
    purpose: 'stress',
    query:
      'Run a bounded API stress ramp with an arrival rate and post-load recovery evidence.',
    keywords: ['stress testing', 'arrival rate'],
    expect: [API_PERF],
    forbid: [API_FUZZ],
  },
  {
    id: 'api-security',
    group: 'api-purpose',
    purpose: 'security',
    query:
      'Verify tenant isolation and role authorization on the invoice API with real guards.',
    keywords: ['api security testing', 'authorization'],
    expect: [API_FUZZ],
    forbid: [API_PERF],
  },
  {
    id: 'api-fuzz',
    group: 'api-purpose',
    purpose: 'fuzz',
    query:
      'Fuzz the search API request body with property-based boundary inputs and a deterministic seed.',
    keywords: ['property-based api testing', 'boundary fuzzing'],
    expect: [API_FUZZ],
    forbid: [API_PERF],
  },

  // -------- mobile: four stacks x lifecycle/offline/permission/upgrade --------
  {
    id: 'ios-lifecycle',
    group: 'mobile-scenario',
    stack: 'ios',
    scenario: 'lifecycle',
    query:
      'Verify iOS app state restoration after backgrounding and process termination on a physical iPhone.',
    keywords: ['ios ui test', 'state restoration'],
    expect: [SWIFT],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'ios-offline',
    group: 'mobile-scenario',
    stack: 'ios',
    scenario: 'offline',
    query:
      'Verify iOS offline queue synchronization after network loss and reconnection.',
    keywords: ['ios ui test', 'offline synchronization'],
    expect: [SWIFT],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'ios-permission',
    group: 'mobile-scenario',
    stack: 'ios',
    scenario: 'permission',
    query:
      'Verify the iOS camera permission denial path without auto-granting the dialog.',
    keywords: ['ios ui test', 'permission denial'],
    expect: [SWIFT],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'ios-upgrade',
    group: 'mobile-scenario',
    stack: 'ios',
    scenario: 'upgrade',
    query:
      'Verify an iOS app upgrade from the previous build preserves migrated local data.',
    keywords: ['ios ui test', 'app upgrade migration'],
    expect: [SWIFT],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'android-lifecycle',
    group: 'mobile-scenario',
    stack: 'android',
    scenario: 'lifecycle',
    query:
      'Verify Android recovery after process death caused by adb shell am kill on an emulator.',
    keywords: ['android instrumentation test', 'process death'],
    expect: [ANDROID],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'android-offline',
    group: 'mobile-scenario',
    stack: 'android',
    scenario: 'offline',
    query:
      'Verify Android offline mode and synchronization duplicates after reconnection.',
    keywords: ['android instrumentation test', 'offline synchronization'],
    expect: [ANDROID],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'android-permission',
    group: 'mobile-scenario',
    stack: 'android',
    scenario: 'permission',
    query:
      'Verify Android runtime permission revocation handling on a physical device.',
    keywords: ['android instrumentation test', 'permission revocation'],
    expect: [ANDROID],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'android-upgrade',
    group: 'mobile-scenario',
    stack: 'android',
    scenario: 'upgrade',
    query:
      'Verify Android app upgrade migration from the previous APK without a blanket app-data wipe.',
    keywords: ['android instrumentation test', 'app upgrade migration'],
    expect: [ANDROID],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'flutter-lifecycle',
    group: 'mobile-scenario',
    stack: 'flutter',
    scenario: 'lifecycle',
    query:
      'Verify Flutter app restoration after background termination and relaunch.',
    keywords: ['flutter integration test', 'state restoration'],
    expect: [FLUTTER],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'flutter-offline',
    group: 'mobile-scenario',
    stack: 'flutter',
    scenario: 'offline',
    query:
      'Verify Flutter offline request queue and synchronization after reconnect.',
    keywords: ['flutter integration test', 'offline synchronization'],
    expect: [FLUTTER],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'flutter-permission',
    group: 'mobile-scenario',
    stack: 'flutter',
    scenario: 'permission',
    query:
      'Verify Flutter camera permission denial handling on a real Android device.',
    keywords: ['flutter integration test', 'permission dialogs'],
    expect: [FLUTTER],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'flutter-upgrade',
    group: 'mobile-scenario',
    stack: 'flutter',
    scenario: 'upgrade',
    query:
      'Verify Flutter app upgrade from the previous release build preserves local data.',
    keywords: ['flutter integration test', 'app upgrade migration'],
    expect: [FLUTTER],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'react-native-lifecycle',
    group: 'mobile-scenario',
    stack: 'react-native',
    scenario: 'lifecycle',
    query:
      'Verify React Native app state restoration after OS background termination.',
    keywords: ['react native e2e test', 'state restoration'],
    expect: [REACT_NATIVE],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'react-native-offline',
    group: 'mobile-scenario',
    stack: 'react-native',
    scenario: 'offline',
    query:
      'Verify React Native offline cache synchronization after network reconnection.',
    keywords: ['react native e2e test', 'offline synchronization'],
    expect: [REACT_NATIVE],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'react-native-permission',
    group: 'mobile-scenario',
    stack: 'react-native',
    scenario: 'permission',
    query:
      'Verify React Native location permission denial on a device without auto-granting.',
    keywords: ['react native e2e test', 'permission denial'],
    expect: [REACT_NATIVE],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'react-native-upgrade',
    group: 'mobile-scenario',
    stack: 'react-native',
    scenario: 'upgrade',
    query:
      'Verify React Native app upgrade migration from the previous build keeps local data.',
    keywords: ['react native e2e test', 'app upgrade migration'],
    expect: [REACT_NATIVE],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },

  // -------- unrelated repository interfaces: must not select API contract skills --------
  {
    id: 'negative-kubernetes',
    group: 'negative',
    query: 'Configure a Kubernetes pod autoscaler for the deployment.',
    keywords: ['kubernetes', 'pod autoscaler'],
    expect: [],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'negative-sql',
    group: 'negative',
    query: 'Write a PostgreSQL query with CTEs to build the report.',
    keywords: ['postgresql', 'cte query'],
    expect: [],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'negative-nginx',
    group: 'negative',
    query: 'Set up Nginx for SSL termination in front of the service.',
    keywords: ['nginx', 'ssl termination'],
    expect: [],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'negative-css',
    group: 'negative',
    query: 'Design a CSS flexbox responsive navigation header.',
    keywords: ['css flexbox', 'responsive navigation'],
    expect: [],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'negative-ts-repository-interface',
    group: 'negative',
    query:
      'Review a TypeScript repository interface contract for the pricing data layer; it is not an HTTP API.',
    keywords: ['typescript repository interface', 'repository interface contract'],
    expect: [],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
  {
    id: 'negative-cli-plugin-contract',
    group: 'negative',
    query:
      'Check the CLI plugin interface contract used by our build tool, not an HTTP API.',
    keywords: ['cli plugin interface', 'plugin interface contract'],
    expect: [],
    forbid: [API_TESTING, API_PERF, API_FUZZ],
  },
];

function parseArgs(argv) {
  const options = new Map([
    ['--engine-root', 'engineRoot'],
    ['--router', 'router'],
    ['--skills-dir', 'skillsDir'],
    ['--metadata', 'metadata'],
    ['--out', 'out'],
  ]);
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') {
      args.help = true;
      continue;
    }
    if (flag === '--allow-router-mismatch') {
      args.allowRouterMismatch = true;
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
    'Usage: node --import tsx router-matrix.mjs [options]',
    '',
    'Options:',
    '  --engine-root <dir>       Checkout providing mcp/src/services/SkillIndex.ts and node_modules',
    '  --router <file>           Explicit path to mcp/src/services/SkillIndex.ts',
    '  --skills-dir <dir>        Registry to route against (default <repo>/skills)',
    '  --metadata <file>         Registry metadata.json (default <skills-dir>/metadata.json)',
    '  --out <file>              Write the JSON report to this path',
    '  --allow-router-mismatch   Accept a router source that differs from the registry revision',
    '  --help, -h                Show this message',
    '',
    'Environment: AGS_ROUTER_MODULE overrides --router.',
    '',
    'Exit codes: 0 pass, 1 case failure, 2 BLOCKED (router unavailable or revision mismatch).',
  ].join('\n');
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function gitHead(dir) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: dir,
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function fail(message, code = 2) {
  const error = new Error(message);
  error.exitCode = code;
  return error;
}

function resolveRouterPath(args) {
  const explicit = process.env.AGS_ROUTER_MODULE || args.router;
  if (explicit) return path.resolve(explicit);
  if (args.engineRoot)
    return path.resolve(args.engineRoot, 'mcp/src/services/SkillIndex.ts');
  throw fail(
    'BLOCKED: no router module available. Pass --router/--engine-root (or set AGS_ROUTER_MODULE) to a checkout that ships mcp/src/services/SkillIndex.ts with installed dependencies.',
  );
}

function selectedKeys(matches) {
  return matches.map((match) => `${match.skill.category}/${match.skill.id}`);
}

/**
 * A hit on a generic word ("test", "jest", "render") does not show that the
 * registry names this concept; an expectation must resolve via a
 * concept-specific trigger.
 */
function unmetExpectations(expected, byKey) {
  return expected.filter((key) => {
    const match = byKey.get(key);
    return !match || GENERIC_TRIGGERS.has(match.reason.toLowerCase());
  });
}

function expectedMatchRecords(expected, byKey) {
  return expected.map((key) => {
    const match = byKey.get(key);
    return match
      ? {
          skill: key,
          reason: match.reason,
          matchedBy: match.matchedBy,
          tier: match.tier,
        }
      : { skill: key, reason: null, matchedBy: null, tier: null };
  });
}

function evaluateCase(testCase, matches) {
  const selected = selectedKeys(matches);
  const byKey = new Map(
    matches.map((match) => [`${match.skill.category}/${match.skill.id}`, match]),
  );
  const missingExpectations = unmetExpectations(testCase.expect, byKey);
  const forbiddenHits = testCase.forbid.filter((key) => selected.includes(key));
  return {
    id: testCase.id,
    group: testCase.group,
    purpose: testCase.purpose,
    stack: testCase.stack,
    scenario: testCase.scenario,
    query: testCase.query,
    keywords: testCase.keywords,
    expect: testCase.expect,
    forbid: testCase.forbid,
    passed: missingExpectations.length === 0 && forbiddenHits.length === 0,
    missingExpectations,
    forbiddenHits,
    expectedMatches: expectedMatchRecords(testCase.expect, byKey),
    selected: selected.slice(0, 25),
    selectedCount: selected.length,
  };
}

/**
 * Registry provenance: the exact SKILL.md files that decided the outcome.
 */
function registryDigests(skillsDir, results) {
  const digests = {};
  if (fs.existsSync(path.join(skillsDir, 'metadata.json'))) {
    digests['metadata.json'] = sha256File(path.join(skillsDir, 'metadata.json'));
  }
  const keys = new Set();
  for (const result of results) {
    for (const key of [...result.expect, ...result.forbid]) keys.add(key);
    for (const key of result.selected) {
      const [category, id] = key.split('/');
      keys.add(`${category}/${id}`);
    }
  }
  for (const key of [...keys].sort()) {
    const [category, id] = key.split('/');
    const file = path.join(skillsDir, category, id, 'SKILL.md');
    if (fs.existsSync(file)) digests[`${category}/${id}/SKILL.md`] = sha256File(file);
  }
  return digests;
}

function resolveRegistryInputs(args) {
  const skillsDir = path.resolve(args.skillsDir ?? path.join(REPO_ROOT, 'skills'));
  if (!fs.existsSync(skillsDir))
    throw fail(`BLOCKED: registry directory not found: ${skillsDir}`);
  const metadataPath = args.metadata
    ? path.resolve(args.metadata)
    : path.join(skillsDir, 'metadata.json');
  return { skillsDir, metadataPath };
}

function resolveRouter(args) {
  const routerPath = resolveRouterPath(args);
  if (!fs.existsSync(routerPath))
    throw fail(`BLOCKED: router module not found: ${routerPath}`);
  const routerDigest = sha256File(routerPath);
  const localRouterPath = path.join(REPO_ROOT, 'mcp/src/services/SkillIndex.ts');
  const localRouterDigest = fs.existsSync(localRouterPath)
    ? sha256File(localRouterPath)
    : null;
  const routerMatchesRegistryRevision = localRouterDigest === routerDigest;
  if (!routerMatchesRegistryRevision && !args.allowRouterMismatch) {
    throw fail(
      `BLOCKED: router source ${routerPath} (${routerDigest.slice(0, 12)}) is not the router of the registry revision under test (${String(localRouterDigest).slice(0, 12)}). Routing results would not be attributable to this registry. Re-run from a checkout with installed dependencies, or pass --allow-router-mismatch and keep the mismatch recorded.`,
    );
  }
  return { routerPath, routerDigest, localRouterDigest, routerMatchesRegistryRevision };
}

async function loadIndex(routerPath, skillsDir, metadataPath) {
  const module = await import(pathToFileURL(routerPath).href).catch((error) => {
    throw fail(
      `BLOCKED: cannot load router module ${routerPath}: ${error.message}. It needs its dependencies installed (run from a checkout with node_modules) and --import tsx for TypeScript sources.`,
    );
  });
  const SkillIndex = module.SkillIndex;
  if (typeof SkillIndex !== 'function')
    throw fail(
      `BLOCKED: ${routerPath} does not export the SkillIndex class; the router API changed and this matrix must be updated rather than guessed.`,
    );
  const index = new SkillIndex(
    skillsDir,
    fs.existsSync(metadataPath) ? metadataPath : undefined,
  );
  await index.load();
  return index;
}

function summarizeGroups(results) {
  const groups = {};
  for (const result of results) {
    groups[result.group] ??= { total: 0, passed: 0 };
    groups[result.group].total += 1;
    if (result.passed) groups[result.group].passed += 1;
  }
  return groups;
}

function writeReport(report, out) {
  if (!out) return;
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`);
}

function caseLine(result) {
  if (result.passed) {
    const via = result.expectedMatches
      .map((match) => `${match.skill} (${match.reason})`)
      .join(', ');
    return `  PASS ${result.id}: via ${via}`;
  }
  const selected = result.selected.slice(0, 8).join(', ');
  return `  FAIL ${result.id}: missing=[${result.missingExpectations.join(', ')}] forbidden=[${result.forbiddenHits.join(', ')}] selected=[${selected}]`;
}

function printReport(report) {
  const lines = [
    `router-matrix: ${report.summary.passed}/${report.summary.total} cases passed (${JSON.stringify(report.summary.groups)})`,
    `router: ${report.provenance.routerPath} sha256=${report.provenance.routerSha256}`,
    `registry: ${report.provenance.skillsDir} revision=${report.provenance.registryRevision ?? 'unknown'}`,
    ...report.results.map(caseLine),
  ];
  console.log(lines.join('\n'));
}

function buildRouterReport(router, skillsDir, metadataPath, results) {
  const failed = results.filter((result) => !result.passed);
  return {
    schemaVersion: 1,
    kind: 'actual-router-matrix',
    generatedAt: new Date().toISOString(),
    provenance: {
      registryRevision: gitHead(REPO_ROOT),
      skillsDir,
      metadataPath: fs.existsSync(metadataPath) ? metadataPath : null,
      routerPath: router.routerPath,
      routerSha256: router.routerDigest,
      repoRouterSha256: router.localRouterDigest,
      routerMatchesRegistryRevision: router.routerMatchesRegistryRevision,
      routerApi: 'SkillIndex#matchKeywords(keywords[])',
      evidenceClass:
        'registry routing via the shipped router; not transcript/model activation, not fixture or device execution',
    },
    summary: {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      groups: summarizeGroups(results),
      genericTriggers: [...GENERIC_TRIGGERS],
      disposition: failed.length ? 'FAIL' : 'PASS',
    },
    registryDigests: registryDigests(skillsDir, results),
    results,
  };
}

async function runMatrix(args) {
  const { skillsDir, metadataPath } = resolveRegistryInputs(args);
  const router = resolveRouter(args);
  const index = await loadIndex(router.routerPath, skillsDir, metadataPath);
  const results = CASES.map((testCase) =>
    evaluateCase(testCase, index.matchKeywords(testCase.keywords)),
  );
  const report = buildRouterReport(router, skillsDir, metadataPath, results);
  writeReport(report, args.out);
  printReport(report);
  return report.summary.failed ? 1 : 0;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }
  return runMatrix(args);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message ?? String(error));
    process.exitCode = error.exitCode ?? 2;
  });
