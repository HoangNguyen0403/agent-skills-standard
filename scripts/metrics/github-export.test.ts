// scripts/metrics/github-export.test.ts
//
// REQ-AFC-07 fixtures: the exporter boundary is injected, so nothing here touches
// `gh`, git, or the network. Assertions cover the approved SRS-AFC-07 mapping, the
// selection/completeness rules from review, and the fail-closed write.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readDeliveryObservations } from "./delivery";
import {
  DEPLOYMENT_WORKFLOWS,
  buildExport,
  createGhFetcher,
  main,
  parseArgs,
  validateExport,
  writeExport,
  type CommitListing,
  type DeploymentWorkflow,
  type GitHubFetcher,
  type RawPull,
  type RawReview,
  type RawRun,
} from "./github-export";
import type { DeliveryEvent, DeliveryObservationFile } from "./types";

const AS_OF = "2026-08-31T23:59:59.999Z";
const WINDOW = { since: "2026-08-01T00:00:00.000Z", until: AS_OF, asOf: AS_OF };

function pull(overrides: Partial<RawPull> & { number: number }): RawPull {
  return {
    createdAt: "2026-08-01T00:00:00Z",
    mergedAt: "2026-08-02T00:00:00Z",
    closedAt: "2026-08-02T00:00:00Z",
    headSha: `head-${overrides.number}`,
    mergeCommitSha: `merge-${overrides.number}`,
    ...overrides,
  };
}

function run(overrides: Partial<RawRun> & { id: number }): RawRun {
  return {
    conclusion: "success",
    event: "push",
    headSha: "tag-sha",
    createdAt: "2026-08-05T00:00:00Z",
    completedAt: "2026-08-05T00:10:00Z",
    ...overrides,
  };
}

const COMPLETE_COMMITS: CommitListing = { commits: [], complete: true };

interface Fixture {
  pulls?: RawPull[];
  reviews?: Record<number, RawReview[]>;
  commits?: Record<number, CommitListing>;
  runs?: Partial<Record<DeploymentWorkflow, RawRun[]>>;
  ancestors?: (ancestor: string, descendant: string) => boolean;
}

function fixtureFetcher(fixture: Fixture): GitHubFetcher {
  return {
    async listClosedPulls() {
      return fixture.pulls ?? [];
    },
    async listReviews(pullNumber) {
      return fixture.reviews?.[pullNumber] ?? [];
    },
    async listCommits(pullNumber) {
      return fixture.commits?.[pullNumber] ?? COMPLETE_COMMITS;
    },
    async listRuns(workflow, range) {
      return (fixture.runs?.[workflow] ?? []).filter((entry) => {
        const created = Date.parse(entry.createdAt);
        if (range.sinceIso && created < Date.parse(range.sinceIso)) return false;
        if (range.beforeIso && created >= Date.parse(range.beforeIso)) return false;
        return true;
      });
    },
    async isAncestor(ancestor, descendant) {
      return fixture.ancestors?.(ancestor, descendant) ?? false;
    },
  };
}

function byKind(events: readonly DeliveryEvent[], kind: DeliveryEvent["kind"]): DeliveryEvent[] {
  return events.filter((event) => event.kind === kind);
}

function coverageFor(file: DeliveryObservationFile, changeId: string, kind: string) {
  return file.coverage.filter((entry) => entry.change_id === changeId && entry.kinds.includes(kind as never));
}

test("buildExport maps merged and closed PRs to submission, acceptance, and coverage", async () => {
  const merged = pull({ number: 10 });
  const rejected = pull({
    number: 12,
    createdAt: "2026-08-03T00:00:00Z",
    mergedAt: null,
    closedAt: "2026-08-04T00:00:00Z",
    mergeCommitSha: null,
  });
  const { file } = await buildExport(fixtureFetcher({ pulls: [merged, rejected] }), WINDOW);

  assert.equal(file.schema_version, 1);
  assert.equal(file.source_kind, "host-export");
  assert.equal(file.events.length, 4);
  assert.deepEqual(byKind(file.events, "submission").map((event) => event.change_id), ["pr-10", "pr-12"]);

  const acceptance = byKind(file.events, "acceptance");
  assert.deepEqual(
    acceptance.map((event) => ({
      change_id: event.change_id,
      revision: event.revision,
      at: event.observed_at,
      ...("decision" in event ? { decision: event.decision, authority: event.authority_ref } : {}),
    })),
    [
      {
        change_id: "pr-10",
        revision: "head-10",
        at: "2026-08-02T00:00:00Z",
        decision: "accepted",
        authority: "merge:merge-10",
      },
      {
        change_id: "pr-12",
        revision: "head-12",
        at: "2026-08-04T00:00:00Z",
        decision: "rejected",
        authority: "close:pr-12",
      },
    ],
  );

  assert.deepEqual(coverageFor(file, "pr-10", "submission"), [
    {
      change_id: "pr-10",
      revisions: ["head-10"],
      from: "2026-08-01T00:00:00Z",
      through: "2026-08-02T00:00:00Z",
      kinds: ["submission", "acceptance"],
      complete: true,
    },
  ]);
  assert.deepEqual(coverageFor(file, "pr-10", "correction"), [
    {
      change_id: "pr-10",
      revisions: ["head-10"],
      from: "2026-08-01T00:00:00Z",
      through: "2026-08-02T00:00:00Z",
      kinds: ["correction"],
      complete: true,
    },
  ]);
  assert.deepEqual(coverageFor(file, "pr-12", "correction"), [], "a rejected PR claims no correction coverage");
  assert.deepEqual(validateExport(file), []);
});

test("PRs are observed by decision time, keeping the full created-to-decision lifecycle", async () => {
  const openedEarlier = pull({
    number: 10,
    createdAt: "2026-07-10T00:00:00Z",
    mergedAt: "2026-08-02T00:00:00Z",
  });
  const decidedBeforeWindow = pull({
    number: 11,
    createdAt: "2026-07-05T00:00:00Z",
    mergedAt: "2026-07-20T00:00:00Z",
  });
  const { file } = await buildExport(
    fixtureFetcher({
      pulls: [openedEarlier, decidedBeforeWindow],
      ancestors: () => false,
    }),
    WINDOW,
  );

  assert.deepEqual(byKind(file.events, "submission").map((event) => [event.change_id, event.observed_at]), [
    ["pr-10", "2026-07-10T00:00:00Z"],
  ]);
  assert.equal(byKind(file.events, "acceptance").length, 1);
  assert.deepEqual(coverageFor(file, "pr-10", "submission")[0].from, "2026-07-10T00:00:00Z");
});

test("correction requires a CHANGES_REQUESTED review followed by a commit before merge", async () => {
  const merged = pull({ number: 20, mergedAt: "2026-08-04T00:00:00Z" });
  const { file } = await buildExport(
    fixtureFetcher({
      pulls: [merged],
      reviews: {
        20: [
          { id: 900, state: "CHANGES_REQUESTED", submittedAt: "2026-08-02T00:00:00Z" },
          { id: 901, state: "CHANGES_REQUESTED", submittedAt: "2026-08-03T00:00:00Z" },
          { id: 902, state: "APPROVED", submittedAt: "2026-08-03T06:00:00Z" },
        ],
      },
      commits: {
        20: {
          complete: true,
          commits: [
            { sha: "c1", committedAt: "2026-08-01T00:00:00Z" },
            { sha: "c2", committedAt: "2026-08-02T12:00:00Z" },
            { sha: "c3", committedAt: "2026-08-05T00:00:00Z" },
          ],
        },
      },
    }),
    WINDOW,
  );

  const corrections = byKind(file.events, "correction");
  assert.equal(corrections.length, 1, "only review 900 is followed by a commit before the merge");
  assert.deepEqual(
    corrections.map((event) => ({ id: event.id, round: "round_id" in event ? event.round_id : undefined })),
    [{ id: "gh:pr-20:correction:900", round: "cr-900" }],
  );
  assert.equal(coverageFor(file, "pr-20", "correction")[0].complete, true);
});

test("a capped commit listing marks correction coverage incomplete and emits no correction", async () => {
  const merged = pull({ number: 21, mergedAt: "2026-08-04T00:00:00Z" });
  const { file } = await buildExport(
    fixtureFetcher({
      pulls: [merged],
      reviews: { 21: [{ id: 903, state: "CHANGES_REQUESTED", submittedAt: "2026-08-02T00:00:00Z" }] },
      commits: { 21: { complete: false, commits: [{ sha: "c1", committedAt: "2026-08-03T00:00:00Z" }] } },
    }),
    WINDOW,
  );

  assert.deepEqual(byKind(file.events, "correction"), []);
  assert.deepEqual(coverageFor(file, "pr-21", "correction")[0], {
    change_id: "pr-21",
    revisions: ["head-21"],
    from: "2026-08-01T00:00:00Z",
    through: "2026-08-04T00:00:00Z",
    kinds: ["correction"],
    complete: false,
  });
  assert.deepEqual(validateExport(file), []);
});

test("deployment membership is commit ancestry against current and previous production SHAs", async () => {
  const inherited = pull({ number: 9, createdAt: "2026-07-15T00:00:00Z", mergedAt: "2026-07-20T00:00:00Z" });
  const first = pull({ number: 10, createdAt: "2026-08-01T02:00:00Z", mergedAt: "2026-08-02T00:00:00Z" });
  const second = pull({ number: 11, createdAt: "2026-08-01T01:00:00Z", mergedAt: "2026-08-02T01:00:00Z" });

  const previous = run({ id: 1, createdAt: "2026-07-01T00:00:00Z", completedAt: "2026-07-01T00:10:00Z", headSha: "prev-sha" });
  const deployed = run({ id: 2 });

  const fetcher = fixtureFetcher({
    pulls: [inherited, first, second],
    runs: { "publish.yml": [previous, deployed] },
    ancestors: (ancestor, descendant) => {
      if (descendant === "prev-sha") return ancestor === "merge-9";
      if (descendant === "tag-sha") return ancestor === "merge-9" || ancestor === "merge-10";
      return false;
    },
  });

  const { file } = await buildExport(fetcher, WINDOW);
  const deployments = byKind(file.events, "deployment");
  assert.equal(deployments.length, 1, "merge-9 predates the previous production SHA; merge-11 is not an ancestor");
  assert.deepEqual(
    deployments.map((event) => ({
      deployment_id: "deployment_id" in event ? event.deployment_id : undefined,
      change_id: event.change_id,
      revision: event.revision,
      first_change_at: "first_change_at" in event ? event.first_change_at : undefined,
      deployed_at: "deployed_at" in event ? event.deployed_at : undefined,
    })),
    [
      {
        deployment_id: "gha:publish.yml:2",
        change_id: "pr-10",
        revision: "head-10",
        first_change_at: "2026-08-01T02:00:00Z",
        deployed_at: "2026-08-05T00:10:00Z",
      },
    ],
  );
  assert.deepEqual(coverageFor(file, "pr-10", "deployment"), [
    {
      change_id: "pr-10",
      revisions: ["head-10"],
      from: "2026-08-01T02:00:00.000Z",
      through: AS_OF,
      kinds: ["deployment"],
      complete: true,
    },
  ]);
  assert.deepEqual(validateExport(file), []);
});
 
test("deployment coverage is bounded by the exported completion window", async () => {
  const merged = pull({ number: 41, createdAt: "2026-07-10T00:00:00Z" });
  const deployed = run({ id: 10 });
  const { file } = await buildExport(
    fixtureFetcher({
      pulls: [merged],
      runs: { "publish.yml": [deployed] },
      ancestors: (ancestor, descendant) => ancestor === "merge-41" && descendant === "tag-sha",
    }),
    { since: "2026-08-01T00:00:00Z", until: "2026-08-15T00:00:00Z", asOf: AS_OF },
  );

  assert.deepEqual(coverageFor(file, "pr-41", "deployment"), [{
    change_id: "pr-41",
    revisions: ["head-41"],
    from: "2026-08-01T00:00:00.000Z",
    through: "2026-08-15T00:00:00.000Z",
    kinds: ["deployment"],
    complete: true,
  }]);
});

test("deployment coverage does not start before the export window", async () => {
  const merged = pull({ number: 42, createdAt: "2026-07-10T00:00:00Z" });
  const deployed = run({ id: 11 });
  const { file } = await buildExport(
    fixtureFetcher({
      pulls: [merged],
      runs: { "publish.yml": [deployed] },
      ancestors: (ancestor, descendant) => ancestor === "merge-42" && descendant === "tag-sha",
    }),
    { since: "2026-08-04T00:00:00Z", until: AS_OF, asOf: AS_OF },
  );

  assert.equal(coverageFor(file, "pr-42", "deployment")[0]?.from, "2026-08-04T00:00:00.000Z");
});
test("only tag-push website runs are production; a manual dispatch is excluded with a note", async () => {
  const merged = pull({ number: 30 });
  const push = run({ id: 7, createdAt: "2026-08-06T00:00:00Z", completedAt: "2026-08-06T00:10:00Z", headSha: "site-sha" });
  const dispatch = run({
    id: 8,
    createdAt: "2026-08-07T00:00:00Z",
    completedAt: "2026-08-07T00:10:00Z",
    event: "workflow_dispatch",
    headSha: "preview-sha",
  });

  const { file, notes } = await buildExport(
    fixtureFetcher({
      pulls: [merged],
      runs: { "deploy-website.yml": [push, dispatch] },
      ancestors: (ancestor, descendant) => ancestor === "merge-30" && descendant === "site-sha",
    }),
    WINDOW,
  );

  assert.deepEqual(byKind(file.events, "deployment").map((event) => event.id), ["gh:deploy:deploy-website.yml:7"]);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /gha:deploy-website\.yml:8 is a manual dispatch/);
});

test("deployment runs are cohorted by completion time, including a run created before the window", async () => {
  const merged = pull({
    number: 40,
    createdAt: "2026-07-10T00:00:00Z",
    mergedAt: "2026-07-25T00:00:00Z",
  });
  const spanning = run({
    id: 9,
    createdAt: "2026-07-30T00:00:00Z",
    completedAt: "2026-08-02T00:10:00Z",
    headSha: "late-sha",
  });

  const { file } = await buildExport(
    fixtureFetcher({
      pulls: [merged],
      runs: { "deploy-server.yml": [spanning] },
      ancestors: (ancestor, descendant) => ancestor === "merge-40" && descendant === "late-sha",
    }),
    WINDOW,
  );

  assert.deepEqual(byKind(file.events, "deployment").map((event) => event.id), ["gh:deploy:deploy-server.yml:9"]);
});

test("a deployment with no linked PR is reported and omitted, never guessed", async () => {
  const only = pull({ number: 50 });
  const fetcher = fixtureFetcher({ pulls: [only], runs: { "deploy-server.yml": [run({ id: 11 })] }, ancestors: () => false });
  const { file, notes } = await buildExport(fetcher, WINDOW);
  assert.deepEqual(byKind(file.events, "deployment"), []);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /gha:deploy-server\.yml:11/);
});

test("coverage never claims past the as-of instant and a future window end is rejected", async () => {
  await assert.rejects(
    () => buildExport(fixtureFetcher({}), { ...WINDOW, until: "2026-09-01T00:00:00.000Z", asOf: AS_OF }),
    /must not be after the export as-of time/,
  );

  assert.throws(() => parseArgs(["--since", "2026-08-01", "--until", "2026-08-31"], new Date("2026-08-31T12:00:00Z")), /as-of/);
  assert.deepEqual(parseArgs(["--since", "2026-08-01"], new Date("2026-08-31T12:00:00Z")), {
    since: "2026-08-01",
    sinceIso: "2026-08-01T00:00:00.000Z",
    untilIso: "2026-08-31T12:00:00.000Z",
    asOfIso: "2026-08-31T12:00:00.000Z",
  });
  assert.throws(() => parseArgs([], new Date("2026-08-31T00:00:00Z")), /--since/);
  assert.throws(() => parseArgs(["--since", "08-01-2026"]), /YYYY-MM-DD/);
});

test("main rejects a future --until and writes nothing", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-export-future-"));
  const code = await main(["--since", "2026-08-01", "--until", "2026-09-01"], {
    cwd: root,
    fetcher: fixtureFetcher({ pulls: [pull({ number: 60 })] }),
    now: new Date("2026-08-31T12:00:00Z"),
  });
  assert.equal(code, 1);
  assert.equal(fs.existsSync(path.join(root, "artifacts", "metrics", "delivery-observations.json")), false);
});

test("writeExport refuses an invalid file and writes nothing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-export-write-"));
  const acceptance: DeliveryEvent = {
    id: "gh:pr-1:acceptance",
    kind: "acceptance",
    change_id: "pr-1",
    revision: "head-1",
    observed_at: "2026-08-02T00:00:00Z",
    source_ref: "github:pull/1#merge/merge-1",
    attempt: 1,
    decision: "accepted",
    authority_ref: "merge:merge-1",
  };
  const invalid: DeliveryObservationFile = {
    schema_version: 1,
    source_kind: "host-export",
    coverage: [
      {
        change_id: "pr-1",
        revisions: ["head-1"],
        from: "2026-08-01T00:00:00Z",
        through: "2026-08-02T00:00:00Z",
        kinds: ["submission", "acceptance"],
        complete: true,
      },
    ],
    events: [acceptance],
  };
  const problems = writeExport(root, invalid);
  assert.ok(problems.length > 0);
  assert.ok(problems.some((problem) => problem.includes("no matching submission")));
  assert.equal(fs.existsSync(path.join(root, "artifacts", "metrics", "delivery-observations.json")), false);
});

test("main writes the validated export through the injected fetcher", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-export-main-"));
  const code = await main(["--since", "2026-08-01"], {
    cwd: root,
    fetcher: fixtureFetcher({ pulls: [pull({ number: 70 })] }),
    now: new Date("2026-08-31T12:00:00Z"),
  });
  assert.equal(code, 0);
  const { observations, issues } = readDeliveryObservations(root);
  assert.deepEqual(issues, []);
  assert.equal(observations?.source_kind, "host-export");
  assert.equal(observations?.events.length, 2);
});

test("main exits non-zero without writing when the fetcher fails", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-export-fail-"));
  const fetcher: GitHubFetcher = {
    ...fixtureFetcher({}),
    async listRuns() {
      throw new Error("gh: authentication required");
    },
  };
  const code = await main(["--since", "2026-08-01"], { cwd: root, fetcher, now: new Date("2026-08-31T12:00:00Z") });
  assert.equal(code, 1);
  assert.equal(fs.existsSync(path.join(root, "artifacts", "metrics", "delivery-observations.json")), false);
});

test("createGhFetcher parses paginated responses and rejects malformed pages", async () => {
  const pullsPayload = JSON.stringify([
    [
      {
        number: 5,
        created_at: "2026-08-01T00:00:00Z",
        merged_at: null,
        closed_at: "2026-08-02T00:00:00Z",
        head: { sha: "head-5" },
        merge_commit_sha: null,
      },
    ],
  ]);
  const fetcher = createGhFetcher("owner/repo", () => pullsPayload, process.cwd());
  assert.deepEqual(await fetcher.listClosedPulls(), [
    {
      number: 5,
      createdAt: "2026-08-01T00:00:00Z",
      mergedAt: null,
      closedAt: "2026-08-02T00:00:00Z",
      headSha: "head-5",
      mergeCommitSha: null,
    },
  ]);

  const broken = createGhFetcher("owner/repo", () => JSON.stringify([{ total_count: 0 }]), process.cwd());
  await assert.rejects(
    () => broken.listRuns("publish.yml", { sinceIso: "2026-08-01T00:00:00Z" }),
    /malformed page/,
  );
});

test("a capped workflow-run search is partitioned by date range", async () => {
  const calls: string[] = [];
  const runner = (args: string[]): string => {
    const url = args[args.length - 1];
    calls.push(url);
    const created = decodeURIComponent(url.split("created=")[1]);
    const [from, to] = created.split("..");
    const spanDays = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (spanDays > 1) {
      return JSON.stringify([{ total_count: 1500, workflow_runs: [] }]);
    }
    return JSON.stringify([
      {
        total_count: 1,
        workflow_runs: [
          {
            id: from === "2026-08-01T00:00:00Z" ? 1 : 2,
            conclusion: "success",
            event: "push",
            head_sha: "tag-sha",
            created_at: from,
            updated_at: from,
          },
        ],
      },
    ]);
  };
  const fetcher = createGhFetcher("owner/repo", runner, process.cwd());
  const runs = await fetcher.listRuns("publish.yml", { sinceIso: "2026-08-01T00:00:00Z", beforeIso: "2026-08-03T00:00:00Z" });

  assert.equal(calls.length, 3, "one capped query plus two under-cap partitions");
  assert.deepEqual(runs.map((entry) => entry.id).sort(), [1, 2]);
});

test("a single-day workflow-run search over the cap fails closed", async () => {
  const runner = (): string => JSON.stringify([{ total_count: 1500, workflow_runs: [] }]);
  const fetcher = createGhFetcher("owner/repo", runner, process.cwd());
  await assert.rejects(
    () => fetcher.listRuns("publish.yml", { sinceIso: "2026-08-01T00:00:00Z", beforeIso: "2026-08-02T00:00:00Z" }),
    /cannot partition further/,
  );
});

test("a commit listing at the 250-commit cap is reported incomplete", async () => {
  const commits = Array.from({ length: 250 }, (_, index) => ({
    sha: `sha-${index}`,
    commit: { committer: { date: "2026-08-01T00:00:00Z" } },
  }));
  const fetcher = createGhFetcher("owner/repo", () => JSON.stringify([commits]), process.cwd());
  const listing = await fetcher.listCommits(12);
  assert.equal(listing.commits.length, 250);
  assert.equal(listing.complete, false);
});

test("a manual website dispatch is never the previous production SHA", async () => {
  const inherited = pull({ number: 60, createdAt: "2026-08-01T00:00:00Z", mergedAt: "2026-08-02T00:00:00Z" });
  const only = pull({ number: 61, createdAt: "2026-08-03T00:00:00Z", mergedAt: "2026-08-04T00:00:00Z" });
  const firstPush = run({
    id: 20,
    createdAt: "2026-08-05T00:00:00Z",
    completedAt: "2026-08-05T00:05:00Z",
    headSha: "push-1",
  });
  const preview = run({
    id: 21,
    createdAt: "2026-08-06T00:00:00Z",
    completedAt: "2026-08-06T00:05:00Z",
    event: "workflow_dispatch",
    headSha: "preview-1",
  });
  const secondPush = run({
    id: 22,
    createdAt: "2026-08-07T00:00:00Z",
    completedAt: "2026-08-07T00:05:00Z",
    headSha: "push-2",
  });

  const { file, notes } = await buildExport(
    fixtureFetcher({
      pulls: [inherited, only],
      runs: { "deploy-website.yml": [firstPush, preview, secondPush] },
      ancestors: (ancestor, descendant) => {
        if (descendant === "push-1") return ancestor === "merge-60";
        if (descendant === "push-2") return ancestor === "merge-60" || ancestor === "merge-61";
        return false;
      },
    }),
    WINDOW,
  );

  const deployments = byKind(file.events, "deployment");
  assert.deepEqual(
    deployments.map((event) => [event.id, "first_change_at" in event ? event.first_change_at : undefined]),
    [
      ["gh:deploy:deploy-website.yml:20", "2026-08-01T00:00:00Z"],
      ["gh:deploy:deploy-website.yml:22", "2026-08-03T00:00:00Z"],
    ],
    "the second push excludes only what the first push already deployed, not what the preview carried",
  );
  assert.ok(notes.some((note) => note.includes("gha:deploy-website.yml:21 is a manual dispatch")));
});

test("every deployment workflow is polled, production-qualified, for the window", async () => {
  const seen: DeploymentWorkflow[] = [];
  const fetcher: GitHubFetcher = {
    ...fixtureFetcher({}),
    async listRuns(workflow, range) {
      if (!range.sinceIso) seen.push(workflow);
      return [];
    },
  };
  await buildExport(fetcher, WINDOW);
  assert.deepEqual(seen, [...DEPLOYMENT_WORKFLOWS]);
});
