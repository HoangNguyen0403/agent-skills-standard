// scripts/freshness/check.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { checkUpstream, driftIssue, uniquePins } from "./check";
import { GithubSource } from "./sources";
import type { EffectivePin } from "./types";

function pin(over: Partial<EffectivePin>): EffectivePin {
  return {
    name: "next",
    source: "github",
    repo: "vercel/next.js",
    pinned: "16.0.0",
    tag_pattern: "^v(\\d+\\.\\d+\\.\\d+)$",
    reviewed: "2026-06-17",
    category: "nextjs",
    skillName: "nextjs-app-router",
    origin: "category",
    ...over,
  };
}

test("uniquePins collapses category pins shared by many skills, keeps skill pins apart", () => {
  const pins = [
    pin({ skillName: "nextjs-app-router" }),
    pin({ skillName: "nextjs-caching" }),
    pin({ name: "react", repo: "facebook/react", pinned: "19.1.0", skillName: "nextjs-caching", origin: "skill" }),
    pin({ name: "react", repo: "facebook/react", pinned: "19.1.0", skillName: "nextjs-app-router", origin: "skill" }),
  ];
  const unique = uniquePins(pins);
  assert.deepEqual(
    unique.map((p) => `${p.category}:${p.origin === "category" ? "" : p.skillName}:${p.name}`),
    ["nextjs::next", "nextjs:nextjs-caching:react", "nextjs:nextjs-app-router:react"],
  );
});

test("driftIssue classifies major, minor, equal, and pinned-ahead", () => {
  const rel = (version: string) => ({ version, tag: `v${version}`, publishedAt: null, url: "u" });
  assert.equal(driftIssue(pin({}), rel("17.0.0"))?.type, "upstream-major-drift");
  assert.equal(driftIssue(pin({}), rel("17.0.0"))?.severity, "high");
  assert.equal(driftIssue(pin({}), rel("16.3.1"))?.type, "upstream-minor-drift");
  assert.equal(driftIssue(pin({}), rel("16.3.1"))?.severity, "low");
  assert.equal(driftIssue(pin({}), rel("16.0.0")), null);
  assert.equal(driftIssue(pin({}), rel("15.9.0")), null);
  // minor-significant alias: go 1.24 -> 1.25 is a major-class drift
  const go = pin({ name: "go", repo: "golang/go", pinned: "1.24.0", category: "golang", tag_pattern: "^go(\\d+\\.\\d+(?:\\.\\d+)?)$" });
  assert.equal(driftIssue(go, rel("1.25.0"))?.type, "upstream-major-drift");
  assert.equal(driftIssue(go, rel("1.24.6"))?.type, "upstream-minor-drift");
  // unknown alias defaults to major
  const bloc = pin({ name: "bloc", repo: "felangel/bloc", pinned: "9.0.0", category: "flutter", origin: "skill", skillName: "flutter-bloc-state-management" });
  assert.equal(driftIssue(bloc, rel("9.1.0"))?.type, "upstream-minor-drift");
});

test("checkUpstream fetches once per unique pin, reports drift, fetch-failed, and manual rows", async () => {
  const urls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("vercel/next.js/releases?per_page=100")) {
      return new Response(JSON.stringify([{ tag_name: "v17.0.0", draft: false, prerelease: false, published_at: "2026-09-01T00:00:00Z", html_url: "https://github.com/vercel/next.js/releases/tag/v17.0.0" }]), { status: 200 });
    }
    if (url.includes("facebook/react/releases?per_page=100")) {
      return new Response("", { status: 403, statusText: "rate limited" });
    }
    return new Response("", { status: 500, statusText: "unexpected" });
  }) as typeof fetch;

  const pins: EffectivePin[] = [
    pin({ skillName: "nextjs-app-router" }),
    pin({ skillName: "nextjs-caching" }),
    pin({ name: "react", repo: "facebook/react", pinned: "19.1.0", category: "react", skillName: "react-hooks" }),
    pin({ name: "ios", source: "manual", repo: undefined, tag_pattern: undefined, pinned: "18", category: "ios", skillName: "ios-swiftui" }),
  ];
  const result = await checkUpstream(pins, new GithubSource({ fetchImpl }), { concurrency: 2 });

  assert.equal(urls.filter((u) => u.includes("vercel/next.js")).length, 1);
  const types = result.issues.map((i) => `${i.type}:${i.category}:${i.upstream}`).sort();
  assert.deepEqual(types, ["fetch-failed:react:react", "upstream-major-drift:nextjs:next"]);
  const drift = result.issues.find((i) => i.type === "upstream-major-drift");
  assert.equal(drift?.severity, "high");
  assert.equal(drift?.skillName, "");
  assert.match(drift?.message ?? "", /17\.0\.0/);
  const failed = result.issues.find((i) => i.type === "fetch-failed");
  assert.equal(failed?.severity, "warn");
  assert.match(failed?.message ?? "", /403/);

  const rows = result.upstream.map((u) => [u.category, u.name, u.pinned, u.latest, u.releaseUrl]);
  assert.deepEqual(rows.sort(), [
    ["ios", "ios", "18", null, null],
    ["nextjs", "next", "16.0.0", "17.0.0", "https://github.com/vercel/next.js/releases/tag/v17.0.0"],
    ["react", "react", "19.1.0", null, null],
  ]);
});

test("checkUpstream reports fetch-failed when a github pin matches no release or tag, and leaves manual pins issue-free", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("releases?per_page=100")) return new Response(JSON.stringify([]), { status: 404 });
    if (url.includes("tags?per_page=100&page=1")) return new Response(JSON.stringify([]), { status: 200 });
    return new Response("", { status: 500, statusText: "unexpected" });
  }) as typeof fetch;

  const pins: EffectivePin[] = [
    pin({ skillName: "nextjs-app-router" }),
    pin({ name: "ios", source: "manual", repo: undefined, tag_pattern: undefined, pinned: "18", category: "ios", skillName: "ios-swiftui" }),
  ];
  const result = await checkUpstream(pins, new GithubSource({ fetchImpl }));

  assert.equal(result.issues.length, 1);
  const issue = result.issues[0];
  assert.equal(issue.type, "fetch-failed");
  assert.equal(issue.severity, "warn");
  assert.match(issue.message, /matched tag_pattern/);

  const nextRow = result.upstream.find((u) => u.name === "next");
  assert.equal(nextRow?.latest, null);
  const iosRow = result.upstream.find((u) => u.name === "ios");
  assert.equal(iosRow?.latest, null);
});

test("driftIssue downgrades drift covered by an acknowledged version", () => {
  const rel = (version: string) => ({ version, tag: `v${version}`, publishedAt: null, url: "u" });
  const ack = pin({ acknowledged: "17" });
  assert.equal(driftIssue(ack, rel("17.0.0"))?.severity, "low");
  assert.equal(driftIssue(ack, rel("17.0.0"))?.type, "upstream-major-drift");
  assert.match(driftIssue(ack, rel("17.0.0"))?.message ?? "", /acknowledged up to 17/);
  assert.equal(driftIssue(ack, rel("17.9.3"))?.severity, "low"); // same major covered
  assert.equal(driftIssue(ack, rel("18.0.0"))?.severity, "high");
  const badAck = driftIssue(pin({ acknowledged: "not-a-version" }), rel("17.0.0"));
  assert.equal(badAck?.severity, "high");
  assert.match(badAck?.message ?? "", /not a version/);

  // minor-significant alias: acknowledging 1.25 covers all 1.25.x
  const go = pin({
    name: "go",
    pinned: "1.24.0",
    acknowledged: "1.25",
    category: "golang",
    tag_pattern: "^go(\\d+\\.\\d+(?:\\.\\d+)?)$",
  });
  assert.equal(driftIssue(go, rel("1.25.4"))?.severity, "low");
  assert.equal(driftIssue(go, rel("1.26.0"))?.severity, "high");
});
