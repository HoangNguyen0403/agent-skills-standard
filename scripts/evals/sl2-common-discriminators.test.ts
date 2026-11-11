/**
 * Offline real-scorer calibration controls for SL2 Common assertion repairs:
 *   - `common-api-design` cases 2 and 3
 *   - `common-architecture-diagramming` case 1
 *
 * Each control is scored against the full canonical case assertions via the
 * unchanged production `checkAssertion` in `scripts/evals/scorer.ts` under
 * both published assertion semantics versions (1 and 2).
 *
 * Includes original author controls, newly calibrated irregular/unfamiliar
 * noun controls, and the disclosed independent blind controls (`API2-P..D1-W`)
 * as calibrated regression checks (not held-out proof). Negative controls assert
 * rejection on the intended fault obligation rather than pinning exact total
 * failed-ID sets.
 *
 * Scope of claim: finite rubric discrimination on natural prose controls only.
 * Does not claim model efficacy, live LLM pass rates, or mirror parity.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { checkAssertion } from "./scorer";
import type { Assertion, AssertionSemanticsVersion } from "./types";

interface CanonicalCase {
  id: number;
  prompt: string;
  expected_output: string;
  assertions: Array<Assertion & { id?: string }>;
}

interface CanonicalEvalsJson {
  skill_name: string;
  evals: CanonicalCase[];
}

interface Control {
  id: string;
  transcript: string;
  expectedPassed: boolean;
  /** At least one of these obligation-bearing assertion IDs must fail when expectedPassed=false. */
  expectedFaultAnyOf?: string[];
  rationale: string;
}

interface CaseSuite {
  caseLabel: string;
  evalsPath: string;
  evalId: number;
  controls: Control[];
}

function loadCanonicalCase(evalsPath: string, evalId: number): CanonicalCase {
  const absPath = path.resolve(process.cwd(), evalsPath);
  const parsed = JSON.parse(
    fs.readFileSync(absPath, "utf8"),
  ) as CanonicalEvalsJson;
  const canonicalCase = parsed.evals.find((entry) => entry.id === evalId);
  assert.ok(
    canonicalCase,
    `Canonical case ${evalId} not found in ${evalsPath}`,
  );
  return canonicalCase;
}

function scoreCanonicalCase(
  assertions: Array<Assertion & { id?: string }>,
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

const SUITES: CaseSuite[] = [
  {
    caseLabel: "common-api-design#eval-2",
    evalsPath: "skills/common/common-api-design/evals/evals.json",
    evalId: 2,
    controls: [
      {
        id: "api2-safe-canonical-expected",
        transcript:
          "**Plural nouns**: `/orders`, `/products`. Not `/order`, `/getProducts`.",
        expectedPassed: true,
        rationale:
          "Canonical expected output states plural noun routes and warns against singular /order and /getProducts.",
      },
      {
        id: "api2-safe-baseline-probe-products",
        transcript:
          "Use collection resource names: GET /products. Avoid /getProducts and singular /product.",
        expectedPassed: true,
        rationale:
          "Reproduced valid baseline probe using collection naming with /products and avoiding /getProducts and singular /product.",
      },
      {
        id: "api2-safe-disclosed-API2-P",
        transcript:
          "Name collections after the things they contain: GET /invoices and GET /customers. Keep those collection names plural. Put retrieval in the HTTP method rather than in an endpoint name; avoid a singular collection such as /invoice and an operation-style route such as /getCustomers.",
        expectedPassed: true,
        rationale:
          "Disclosed independent control API2-P using /invoices, /customers, and 'collection names plural'.",
      },
      {
        id: "api2-safe-irregular-plural-people",
        transcript:
          "Use plural collection resource names such as GET /people. Avoid singular /person and operation-style /getPeople.",
        expectedPassed: true,
        rationale:
          "Irregular plural collection /people without relying on an English noun dictionary.",
      },
      {
        id: "api2-safe-unfamiliar-regular-widgets",
        transcript:
          "Name collection endpoints with plural nouns like GET /widgets and /shipments; avoid singular /widget or operation-style /fetchWidgets.",
        expectedPassed: true,
        rationale:
          "Unfamiliar regular plural nouns /widgets and /shipments outside any noun whitelist.",
      },
      {
        id: "api2-safe-anti-pattern-first",
        transcript:
          "Avoid singular paths like /item and verb-in-path endpoints like POST /createItem; instead expose plural collection endpoints such as GET /items.",
        expectedPassed: true,
        rationale:
          "States anti-patterns first in an avoidance clause before recommending plural /items.",
      },
      {
        id: "api2-wrong-disclosed-API2-W",
        transcript:
          "Plural nouns such as /orders and /products are useful examples for documentation. For the actual public API, expose GET /order as the orders collection and GET /getProducts as the product listing endpoint; these singular and verb-style paths are our recommended naming convention.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a3", "a4"],
        rationale:
          "Disclosed independent wrong control API2-W: recommends singular GET /order and GET /getProducts despite mentioning plural examples.",
      },
      {
        id: "api2-wrong-keyword-rich-singular-and-verb",
        transcript:
          "Follow plural nouns and collection resource naming conventions by exposing GET /product and GET /getProducts instead of /orders.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a3", "a4"],
        rationale:
          "Echoes plural/collection keywords while affirmatively recommending singular GET /product and operation-style GET /getProducts.",
      },
      {
        id: "api2-wrong-unfamiliar-contradicted-widget",
        transcript:
          "Use plural nouns like /widgets as examples, avoid singular /item, and expose GET /widget instead of /widgets.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a4"],
        rationale:
          "Affirmatively recommends unfamiliar singular /widget while contradicting /widgets despite mentioning plural nouns.",
      },
      {
        id: "api2-wrong-unfamiliar-operation-fetchWidgets",
        transcript:
          "Use plural collection resource names such as GET /widgets, avoid singular /widget, and expose GET /fetchWidgets for listing.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a4"],
        rationale:
          "Lists valid plural guidance alongside an affirmative unfamiliar operation-style route GET /fetchWidgets.",
      },
      {
        id: "api2-wrong-avoid-plural-use-singular",
        transcript:
          "In common API design, avoid plural nouns for collection resources and use singular resource paths such as GET /order and GET /product rather than /getProducts.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a4"],
        rationale:
          "Advises avoiding plural nouns and recommends singular paths.",
      },
      {
        id: "api2-wrong-missing-obligation-unrelated",
        transcript:
          "Never use GET requests to mutate state, and never return HTTP 200 for error responses. Paginate large collections using cursor and limit.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a2", "a3"],
        rationale:
          "Omits plural collection resource naming and singular/operation anti-pattern warnings.",
      },
      {
        id: "api2-wrong-missing-antipattern-warning",
        transcript:
          "Use plural nouns for collection resource names like /orders and /products.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a3"],
        rationale:
          "Recommends plural nouns without identifying singular or operation-style anti-patterns to avoid.",
      },
    ],
  },
  {
    caseLabel: "common-api-design#eval-3",
    evalsPath: "skills/common/common-api-design/evals/evals.json",
    evalId: 3,
    controls: [
      {
        id: "api3-safe-canonical-expected",
        transcript:
          "**No verbs in paths** (except action sub-resources): `/orders/:id/cancel` ✅, `/cancelOrder` ❌.",
        expectedPassed: true,
        rationale:
          "Canonical expected output states no-verbs-in-paths, gives /orders/:id/cancel, and marks /cancelOrder invalid.",
      },
      {
        id: "api3-safe-disclosed-API3-P",
        transcript:
          "Represent products as resources. To archive one, expose POST /products/{productId}/archive: archive is an action below the identified product, rather than an operation used as the root endpoint. Keep ordinary collection and item URLs noun-based, and reject POST /archiveProduct as an RPC-shaped top-level route.",
        expectedPassed: true,
        rationale:
          "Disclosed independent control API3-P: noun-based URLs, child-action route /products/{productId}/archive, and explicit rejection of POST /archiveProduct.",
      },
      {
        id: "api3-safe-paraphrase-invoices",
        transcript:
          "Keep URLs noun-based with no verbs in paths (avoid POST /cancelOrder); model non-CRUD state changes as action sub-resources such as POST /invoices/{id}/send.",
        expectedPassed: true,
        rationale:
          "Uses brace parameter syntax {id} and alternate resource/action while avoiding /cancelOrder.",
      },
      {
        id: "api3-safe-paraphrase-unfamiliar-draft",
        transcript:
          "Keep resource routes noun-based and reject POST /publishDraft as an RPC-shaped top-level route; model publishing via POST /drafts/{draftId}/publish.",
        expectedPassed: true,
        rationale:
          "Unfamiliar verb/noun route /publishDraft inside explicit rejection clause with child-action sub-resource /drafts/{draftId}/publish.",
      },
      {
        id: "api3-wrong-counterexample-separate-rejection-and-recommendation",
        transcript:
          "Keep paths noun-based with no verbs in paths. Use POST /orders/:id/cancel for the action sub-resource, and reject POST /archiveProduct as an RPC-shaped top-level route. Also expose POST /cancelOrder as an RPC-shaped top-level route for new clients; this endpoint is the recommended cancellation API.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a3"],
        rationale:
          "The rejected /archiveProduct example must not exonerate the separately recommended /cancelOrder route.",
      },
      {
        id: "api3-wrong-counterexample-rejection-before-separate-recommendation",
        transcript:
          "Reject POST /archiveProduct as an RPC-shaped top-level route. In a later sentence, recommend POST /cancelOrder as a top-level cancellation route. Keep /orders/:id/cancel as the scoped action route and paths noun-based.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a3"],
        rationale:
          "A separate affirmative route recommendation remains a fault after an explicit rejection elsewhere.",
      },
      {
        id: "api3-wrong-disclosed-API3-W",
        transcript:
          "Use POST /orders/:id/cancel as an action sub-resource and keep resource paths noun-based. Also publish POST /cancelOrder as the recommended cancellation endpoint for new clients; verbs in paths make that top-level operation clearer, and both routes should be treated as equally valid designs.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a3"],
        rationale:
          "Disclosed independent wrong control API3-W: recommends POST /cancelOrder and endorses verbs in paths alongside valid tokens.",
      },
      {
        id: "api3-wrong-baseline-unsafe-probe",
        transcript: "Put verbs in paths, for example POST /cancelOrder.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a2", "a3"],
        rationale:
          "Baseline unsafe probe recommending verbs in paths and POST /cancelOrder.",
      },
      {
        id: "api3-wrong-keyword-rich-optional-verbs",
        transcript:
          "No verbs in paths is optional; for action sub-resources you can put verbs in paths like POST /cancelOrder.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a3"],
        rationale:
          "Declares no-verbs rule optional and recommends POST /cancelOrder.",
      },
      {
        id: "api3-wrong-unfamiliar-publishDraft",
        transcript:
          "Use POST /drafts/{draftId}/publish and keep paths noun-based, or publish POST /publishDraft as an equally valid top-level endpoint.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a3"],
        rationale:
          "Affirmatively recommends unfamiliar top-level RPC route POST /publishDraft without rejecting top-level operation routes.",
      },
      {
        id: "api3-wrong-keyword-rich-negated-subresource",
        transcript:
          "Instead of action sub-resources like POST /orders/:id/cancel, put verbs in paths such as POST /cancelOrder.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a2", "a3"],
        rationale:
          "Negates the action sub-resource and recommends POST /cancelOrder.",
      },
      {
        id: "api3-wrong-missing-action-subresource",
        transcript:
          "Never put verbs in URL paths; only use nouns like /orders.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a2"],
        rationale:
          "Omits any resource-scoped action sub-resource route pattern.",
      },
    ],
  },
  {
    caseLabel: "common-architecture-diagramming#eval-1",
    evalsPath: "skills/common/common-architecture-diagramming/evals/evals.json",
    evalId: 1,
    controls: [
      {
        id: "c4-1-safe-canonical-expected",
        transcript:
          "Uses a C4 system-context diagram for actors and external systems, labels relationships, avoids database-table detail, and includes title/legend/scope metadata.",
        expectedPassed: true,
        rationale:
          "Canonical expected output chooses C4 system-context with actors, external systems, labeled relationships, no database-table detail, and title/legend/scope.",
      },
      {
        id: "c4-1-safe-disclosed-D1-P",
        transcript:
          "Use the C4 level-one view for this executive decision. Draw the product as a single system within its stated boundary, with its users and the external payment provider around it. Label the connections with the interactions they represent. State whether the mobile app, API and database belong inside the product boundary without decomposing them into implementation boxes or schema tables. Give the view a descriptive title, a key explaining the notation, and an explicit scope note.",
        expectedPassed: true,
        rationale:
          "Disclosed independent control D1-P: C4 level-one view, users + external payment provider, labeled connections, schema tables excluded, title + notation key + scope.",
      },
      {
        id: "c4-1-safe-paraphrase-level1-context",
        transcript:
          "Use a C4 Level 1 context diagram for executives. Show the users (actors), the platform system boundary, and external systems like the payment provider with labeled relationships. Leave internal service classes and database tables out of scope, and include a title, legend, and scope note.",
        expectedPassed: true,
        rationale:
          "Natural paraphrase using 'C4 Level 1 context diagram' and excluding internal service classes and database tables.",
      },
      {
        id: "c4-1-safe-paraphrase-contrast-views",
        transcript:
          "Select a C4 system context diagram rather than a component or container view. Include actors, our system, and external systems such as the payment provider, label every relationship with its protocol, avoid database-table or class detail, and add a title, legend, and explicit scope.",
        expectedPassed: true,
        rationale:
          "Contrasts component/container views in an exclusion clause and includes protocol-labeled relationships.",
      },
      {
        id: "c4-1-wrong-counterexample-dismissed-metadata",
        transcript:
          "Use a C4 system-context diagram showing actors and external systems such as the payment provider, with labeled relationships and no database-table detail. The title, legend and scope are unnecessary; leave them off the diagram.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a4"],
        rationale:
          "Metadata is directly dismissed despite appearing as all three required terms.",
      },
      {
        id: "c4-1-safe-warning-against-metadata-omission",
        transcript:
          "Use a C4 system-context diagram showing actors and external systems such as the payment provider, with labeled relationships and no database-table detail. Do not omit the title, legend or scope; include a title, legend and scope note in the diagram metadata.",
        expectedPassed: true,
        rationale:
          "Warns against omission while affirmatively including every required metadata item.",
      },
      {
        id: "c4-1-wrong-disclosed-D1-W",
        transcript:
          "Choose a C4 component diagram as the primary executive scope view. Show the mobile UI classes, API controllers, payment adapter and database tables with all their columns so leaders can decide the boundary from implementation detail. Add an actor and the external payment provider, label every relationship, and include a title, legend and scope note. Mention system context in the caption, but use the detailed component-and-table view for the decision.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a5"],
        rationale:
          "Disclosed independent wrong control D1-W: selects C4 component/table view with UI classes, API controllers, and database tables while mentioning system context only as a caption.",
      },
      {
        id: "c4-1-wrong-baseline-unsafe-probe",
        transcript:
          "Choose a C4 component diagram with internal service classes. Include payment provider relationships, a scope, title and legend.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a5"],
        rationale:
          "Baseline unsafe probe choosing C4 component diagram with internal service classes.",
      },
      {
        id: "c4-1-wrong-keyword-rich-component-and-context",
        transcript:
          "Use a C4 component diagram alongside system-context notes showing actors, external payment provider, labeled relationships, internal service classes, and database tables, with title, legend, and scope.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a5"],
        rationale:
          "Keyword-stuffed answer selecting component diagram, internal service classes, and database tables.",
      },
      {
        id: "c4-1-wrong-container-diagram",
        transcript:
          "Pick a C4 container diagram for executives showing actors, the mobile app, API, database, and payment provider with labeled relationships, plus a title, legend, and scope.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a1", "a5"],
        rationale:
          "Selects C4 container level instead of executive system-context level.",
      },
      {
        id: "c4-1-wrong-missing-legend-or-key",
        transcript:
          "Use a C4 system-context diagram for actors and external systems like the payment provider, with labeled relationships, no database-table detail, and a clear title and scope.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a4"],
        rationale: "Omits legend or notation key.",
      },
      {
        id: "c4-1-wrong-missing-actors-and-labels",
        transcript:
          "Use a C4 system-context diagram showing external systems like the payment provider, avoiding database-table detail, with title, legend, and scope.",
        expectedPassed: false,
        expectedFaultAnyOf: ["a2", "a3"],
        rationale: "Omits actors/users and labeled relationships.",
      },
    ],
  },
];

for (const suite of SUITES) {
  const canonicalCase = loadCanonicalCase(suite.evalsPath, suite.evalId);

  for (const semanticsVersion of [1, 2] as const) {
    for (const control of suite.controls) {
      test(`${suite.caseLabel} [v${semanticsVersion}] ${control.id}`, () => {
        const result = scoreCanonicalCase(
          canonicalCase.assertions,
          control.transcript,
          semanticsVersion,
        );
        assert.equal(
          result.passed,
          control.expectedPassed,
          `${suite.caseLabel} (${control.id}): expected passed=${control.expectedPassed}, got ${result.passed} (failedIds=${JSON.stringify(result.failedIds)}). ${control.rationale}`,
        );
        if (!control.expectedPassed && control.expectedFaultAnyOf) {
          assert.ok(
            control.expectedFaultAnyOf.some((id) =>
              result.failedIds.includes(id),
            ),
            `${suite.caseLabel} (${control.id}): expected at least one intended fault assertion in ${JSON.stringify(control.expectedFaultAnyOf)}, got ${JSON.stringify(result.failedIds)}`,
          );
        }
      });
    }
  }
}
