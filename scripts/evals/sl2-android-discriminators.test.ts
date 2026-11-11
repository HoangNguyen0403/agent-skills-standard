/**
 * Real-scorer behavioral decision controls for SL2 Android repaired eval cases:
 *   - android-testing eval 1
 *   - android-architecture eval 1
 *   - android-compose-migration eval 1
 *   - android-concurrency eval 2
 *
 * Every control is scored against all assertions of its canonical case using
 * the unmodified production `checkAssertion` engine across semantics v1 and v2.
 *
 * Lexical scope and limitations:
 *   - Calibrates finite lexical discrimination on declared controls; does not
 *     measure live LLM efficacy or model pass rates.
 *   - Negation lookbehinds operate within a bounded 35-60 character single-clause
 *     window (`[^.;\n]` with identifier dots preserved); cross-sentence negations
 *     and double negations fall outside lexical regex coverage.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { checkAssertion } from "./scorer";
import type { Assertion, AssertionSemanticsVersion } from "./types";

interface IdAssertion extends Assertion {
  id?: string;
  description?: string;
}

interface CanonicalEvalCase {
  id: number | string;
  prompt: string;
  expected_output: string;
  assertions: IdAssertion[];
}

interface CanonicalEvalsJson {
  evals: CanonicalEvalCase[];
}

interface DecisionControl {
  id: string;
  expect: boolean;
  /** Obligation assertion IDs expected to reject a negative control. */
  intendedRejections?: readonly string[];
  transcript: string;
}

interface CaseSuite {
  evalsPath: string;
  caseId: number;
  includeExpectedOutputSanity: boolean;
  controls: readonly DecisionControl[];
}

const SEMANTICS_VERSIONS: readonly AssertionSemanticsVersion[] = [1, 2];

const SUITES: readonly CaseSuite[] = [
  {
    evalsPath: "skills/android/android-testing/evals/evals.json",
    caseId: 1,
    includeExpectedOutputSanity: true,
    controls: [
      {
        id: "T1-P (blind disclosed): controlled in-memory double, injected dispatcher, Turbine/awaitItem",
        expect: true,
        transcript:
          "Run the test body with kotlinx-coroutines-test runTest. Install MainDispatcherRule with a StandardTestDispatcher backed by the test scheduler, and restore Main after the test. Supply the ViewModel an injected dispatcher provider and an in-memory repository double whose responses are configured by the test. Use Turbine to collect the StateFlow, invoke the public load action, advance the virtual scheduler, and check the emitted loading and success values with awaitItem.",
      },
      {
        id: "testing1-safe-setmain-stub-injected-dispatcher",
        expect: true,
        transcript:
          "Replace Dispatchers.Main in @Before/@After with Dispatchers.setMain(StandardTestDispatcher()) and Dispatchers.resetMain(). Inject a DispatcherProvider into the ViewModel alongside a stub repository double, run inside runTest, and collect StateFlow emissions with awaitItem(). Never use Thread.sleep or call a real network endpoint.",
      },
      {
        id: "T1-W (blind disclosed): production network fetch and Thread.sleep(2000)",
        expect: false,
        intendedRejections: ["a6"],
        transcript:
          "Use runTest, MainDispatcherRule, StandardTestDispatcher and an injected DispatcherProvider with a fake repository; collect the StateFlow in Turbine and check awaitItem. Configure the fake repository to fetch its results from the production network service, then use Thread.sleep(2000) to give the request time to finish before checking the success state.",
      },
      {
        id: "testing1-wrong-bare-stateflow-mention",
        expect: false,
        intendedRejections: ["a4"],
        transcript:
          "Use runTest, MainDispatcherRule, an injected DispatcherProvider, and MockK for a ViewModel that exposes a StateFlow.",
      },
      {
        id: "testing1-wrong-omits-main-and-dispatcher-injection",
        expect: false,
        intendedRejections: ["a1", "a2", "a5"],
        transcript:
          "Create a FakeUserRepository, construct the ViewModel in a standard @Test function, call loadUser(), and assert viewModel.uiState.value directly without changing dispatchers or coroutine test scopes.",
      },
    ],
  },
  {
    evalsPath: "skills/android/android-architecture/evals/evals.json",
    caseId: 1,
    includeExpectedOutputSanity: true,
    controls: [
      {
        id: "A1-P (blind disclosed): plain Kotlin domain use case, VM/Repo separation",
        expect: true,
        transcript:
          "Put the pricing calculation in a domain-layer use case implemented in plain Kotlin, independent of Android APIs. It computes the order total from the supplied order data. The ViewModel calls that operation and maps its result to screen state; the repository only retrieves and persists the data needed by the operation.",
      },
      {
        id: "architecture1-safe-negated-viewmodel-pure-kotlin",
        expect: true,
        transcript:
          "Do not put business logic in the ViewModel or Repository. Implement order-total calculation in a pure Kotlin use case inside the domain layer with no Android dependencies; the ViewModel orchestrates UI state and the Repository handles data access.",
      },
      {
        id: "architecture1-safe-platform-dependency-confined-to-viewmodel",
        expect: true,
        transcript:
          "Keep order-total rules in a pure Kotlin Domain use case with no Android dependencies. The ViewModel orchestrates the use case, may use Android lifecycle APIs, and exposes screen state; Repository handles data access only.",
      },
      {
        id: "A1-W (blind disclosed): ViewModel calculates totals and forwards to UseCase",
        expect: false,
        intendedRejections: ["a4"],
        transcript:
          "Create a pure Kotlin UseCase in the Domain layer with no Android dependencies. Have the ViewModel calculate the order totals, discounts and taxes, and pass the final number into that UseCase for forwarding. Keep the Repository limited to data access.",
      },
      {
        id: "architecture1-wrong-usecase-depends-on-android-context",
        expect: false,
        intendedRejections: ["a3", "a4"],
        transcript:
          "Put calculation in domain UseCase; let UseCase depend on Android Context; ViewModel orchestrates and Repository accesses data.",
      },
      {
        id: "architecture1-wrong-repository-instead-of-usecase",
        expect: false,
        intendedRejections: ["a1", "a4"],
        transcript:
          "The Repository should own the business logic for order totals in pure Kotlin instead of a UseCase in the Domain layer, while the ViewModel simply observes UI state.",
      },
    ],
  },
  {
    evalsPath: "skills/android/android-compose-migration/evals/evals.json",
    caseId: 1,
    includeExpectedOutputSanity: true,
    controls: [
      {
        id: "M1-P (blind disclosed): small leaf layout, hierarchy/bindings, libraries/theme, screenshots",
        expect: true,
        transcript:
          "Start with one small leaf XML layout with few custom views; leave complicated RecyclerView screens for later. Inventory its view hierarchy, bindings and event handlers. Enable Compose in the module, add the required libraries and map the existing theme. Replace each widget with its corresponding composable and compare before-and-after screenshots so layout, colors and spacing stay the same.",
      },
      {
        id: "migration1-safe-leaf-bom-theme-preview-parity",
        expect: true,
        transcript:
          "Start incrementally with a single leaf XML layout, inspect its view structure and bindings, add the Compose BOM in libs.versions.toml and configure theming (including the full app theme if desired), convert each view to an equivalent composable, and compare a baseline screenshot with @Preview for visual parity.",
      },
      {
        id: "M1-W (blind disclosed): largest complex RecyclerView first, all XML screens in one sweep",
        expect: false,
        intendedRejections: ["a1", "a5"],
        transcript:
          "Identify the best migration candidate by choosing the largest screen with the most complex RecyclerView adapters first. Analyze its structure and bindings, install Compose dependencies and theming, then convert every View to its Compose equivalent and verify visual parity. Replace all XML screens in the same change so migration is completed in one sweep.",
      },
      {
        id: "migration1-wrong-wholesale-all-screens-together",
        expect: false,
        intendedRejections: ["a1", "a5"],
        transcript:
          "Pick a candidate layout, inspect its structure and bindings, add Compose dependencies and theming, and migrate all XML screens together in one PR while converting widgets to composables with @Preview.",
      },
      {
        id: "migration1-wrong-omits-structure-theming-parity",
        expect: false,
        intendedRejections: ["a2", "a3", "a4"],
        transcript:
          "Pick one small leaf layout and replace XML tags with Text and Column.",
      },
    ],
  },
  {
    evalsPath: "skills/android/android-concurrency/evals/evals.json",
    caseId: 2,
    includeExpectedOutputSanity: true,
    controls: [
      {
        id: "C2-P (blind disclosed): AppExecutors IO/Main/Default via Hilt, uses supplied io, StandardTestDispatcher",
        expect: true,
        transcript:
          "Define an AppExecutors interface exposing io, main and default CoroutineDispatcher properties. Bind its production implementation with Hilt and supply it through the constructor to the class that launches work. Use the supplied io property in withContext. In tests pass an AppExecutors implementation whose properties use StandardTestDispatcher on the runTest scheduler, so the same code runs under virtual-time control.",
      },
      {
        id: "concurrency2-safe-custom-dispatchers-hilt-and-never-hardcode",
        expect: true,
        transcript:
          "Create an AppDispatchers interface with IO, Main, and Default CoroutineDispatcher properties and provide it via Hilt. Never hardcode Dispatchers.IO inside repositories or ViewModels; in tests, swap in UnconfinedTestDispatcher.",
      },
      {
        id: "C2-W (blind disclosed): withContext(Dispatchers.IO) ignoring injected IO property",
        expect: false,
        intendedRejections: ["a2", "a4"],
        transcript:
          "Define DispatcherProvider with IO, Main and Default properties and inject it through Hilt. In tests supply StandardTestDispatcher to the provider and use runTest. In the repository perform each request with withContext(Dispatchers.IO), ignoring the injected IO property because production I/O should always use that global dispatcher.",
      },
      {
        id: "concurrency2-wrong-bare-runtest-without-test-dispatcher",
        expect: false,
        intendedRejections: ["a3"],
        transcript:
          "Define a DispatcherProvider interface with IO, Main, and Default properties, bind it with Hilt, never hardcode Dispatchers.IO, and execute unit tests with runTest.",
      },
      {
        id: "concurrency2-wrong-direct-io-after-contrasting-never",
        expect: false,
        intendedRejections: ["a4"],
        transcript:
          "Define DispatcherProvider with IO, Main and Default properties and inject it with Hilt. In tests supply StandardTestDispatcher to the provider. Never hardcode Dispatchers.Main, but use Dispatchers.IO directly in the repository for every request.",
      },
      {
        id: "concurrency2-safe-warning-only-no-direct-recommendation",
        expect: true,
        transcript:
          "Inject a DispatcherProvider exposing IO, Main, and Default via Hilt and use its supplied IO property for requests. Never hardcode Dispatchers.IO; that global dispatcher is only mentioned here as the anti-pattern to avoid. Replace the provider's dispatchers with StandardTestDispatcher in tests.",
      },
      {
        id: "concurrency2-wrong-keyword-rich-hardcode-io",
        expect: false,
        intendedRejections: ["a4"],
        transcript:
          "Define DispatcherProvider with IO, Main, and Default via Hilt, but hardcode Dispatchers.IO directly in the repository instead of injecting the provider; use StandardTestDispatcher in tests.",
      },
    ],
  },
];

function loadCase(evalsPath: string, caseId: number): CanonicalEvalCase {
  const fullPath = path.resolve(process.cwd(), evalsPath);
  const parsed = JSON.parse(
    fs.readFileSync(fullPath, "utf8"),
  ) as CanonicalEvalsJson;
  const evalCase = parsed.evals.find((item) => item.id === caseId);
  if (!evalCase) {
    throw new Error(`Case ${caseId} not found in ${evalsPath}`);
  }
  return evalCase;
}

function evaluateAllAssertions(
  assertions: IdAssertion[],
  transcript: string,
  semanticsVersion: AssertionSemanticsVersion,
): { passed: boolean; failedIds: string[] } {
  const failedIds: string[] = [];
  for (let index = 0; index < assertions.length; index++) {
    const assertion = assertions[index];
    if (!checkAssertion(assertion, transcript, semanticsVersion)) {
      failedIds.push(assertion.id ?? `index-${index}`);
    }
  }
  return { passed: failedIds.length === 0, failedIds };
}

for (const suite of SUITES) {
  test(`${suite.evalsPath} eval ${suite.caseId} discriminates safe and wrong controls (v1 & v2)`, () => {
    const evalCase = loadCase(suite.evalsPath, suite.caseId);
    const controls = suite.includeExpectedOutputSanity
      ? [
          {
            id: "canonical-expected-output-sanity",
            expect: true,
            transcript: evalCase.expected_output,
          },
          ...suite.controls,
        ]
      : suite.controls;

    for (const control of controls) {
      for (const semanticsVersion of SEMANTICS_VERSIONS) {
        const result = evaluateAllAssertions(
          evalCase.assertions,
          control.transcript,
          semanticsVersion,
        );
        assert.equal(
          result.passed,
          control.expect,
          `${control.id} (v${semanticsVersion}) expected ${control.expect ? "pass" : "fail"}, failed=[${result.failedIds.join(",")}]`,
        );
        if (!control.expect && control.intendedRejections?.length) {
          const hitIntended = control.intendedRejections.some((id) =>
            result.failedIds.includes(id),
          );
          assert.equal(
            hitIntended,
            true,
            `${control.id} (v${semanticsVersion}) failed [${result.failedIds.join(",")}], missing intended obligation [${control.intendedRejections.join(",")}]`,
          );
        }
      }
    }
  });
}
