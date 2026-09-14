// scripts/freshness/sources.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { GithubSource, ManualSource, extractVersionFromTag, resolveSource } from "./sources";
import type { UpstreamEntry } from "./types";

const next: UpstreamEntry = {
  name: "next",
  source: "github",
  repo: "vercel/next.js",
  pinned: "16.0.0",
  tag_pattern: "^v(\\d+\\.\\d+\\.\\d+)$",
  reviewed: "2026-06-17",
};

const postgres: UpstreamEntry = {
  name: "postgresql",
  source: "github",
  repo: "postgres/postgres",
  pinned: "17",
  tag_pattern: "^REL_(\\d+)_(\\d+)$",
  reviewed: "2026-06-17",
};

/** Builds a fetch stub keyed by URL (query string included). Records calls. */
function stubFetch(routes: Record<string, { status: number; body?: unknown }>) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: Object.fromEntries(Object.entries(init?.headers ?? {})) as Record<string, string> });
    const route = routes[url];
    if (!route) return new Response("not stubbed", { status: 500, statusText: "Unstubbed" });
    return new Response(route.body === undefined ? "" : JSON.stringify(route.body), {
      status: route.status,
      statusText: route.status === 200 ? "OK" : "Error",
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const API = "https://api.github.com";

test("extractVersionFromTag applies the pattern and joins capture groups", () => {
  assert.equal(extractVersionFromTag("v16.0.1", "^v(\\d+\\.\\d+\\.\\d+)$"), "16.0.1");
  assert.equal(extractVersionFromTag("REL_17_2", "^REL_(\\d+)_(\\d+)$"), "17.2");
  assert.equal(extractVersionFromTag("jdk-25-ga", "^jdk-(\\d+)-ga$"), "25");
  assert.equal(extractVersionFromTag("v16.0.0-canary.3", "^v(\\d+\\.\\d+\\.\\d+)$"), null);
  assert.equal(extractVersionFromTag("v3.14.0rc1", "^v(\\d+\\.\\d+\\.\\d+)$"), null);
});

test("extractVersionFromTag without a pattern accepts plain semver with optional v", () => {
  assert.equal(extractVersionFromTag("v9.0.0", undefined), "9.0.0");
  assert.equal(extractVersionFromTag("9.1", undefined), "9.1");
  assert.equal(extractVersionFromTag("release-9", undefined), null);
});

test("GithubSource uses releases/latest when its tag matches the pattern", async () => {
  const { fetchImpl, calls } = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: {
      status: 200,
      body: { tag_name: "v16.2.0", published_at: "2026-08-01T00:00:00Z", html_url: "https://github.com/vercel/next.js/releases/tag/v16.2.0" },
    },
  });
  const source = new GithubSource({ fetchImpl, token: "secret" });
  const latest = await source.latest(next);
  assert.deepEqual(latest, {
    version: "16.2.0",
    tag: "v16.2.0",
    publishedAt: "2026-08-01T00:00:00Z",
    url: "https://github.com/vercel/next.js/releases/tag/v16.2.0",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, "Bearer secret");
  assert.equal(calls[0].headers.Accept, "application/vnd.github+json");
});

test("GithubSource falls back to tags on 404 and picks the highest matching tag across pages", async () => {
  const { fetchImpl, calls } = stubFetch({
    [`${API}/repos/postgres/postgres/releases/latest`]: { status: 404 },
    [`${API}/repos/postgres/postgres/tags?per_page=100&page=1`]: {
      status: 200,
      body: [{ name: "REL_17_2" }, { name: "REL_18_BETA3" }, { name: "REL_16_9" }],
    },
    [`${API}/repos/postgres/postgres/tags?per_page=100&page=2`]: {
      status: 200,
      body: [{ name: "REL_18_1" }, { name: "REL_17_5" }],
    },
    [`${API}/repos/postgres/postgres/tags?per_page=100&page=3`]: { status: 200, body: [] },
  });
  const source = new GithubSource({ fetchImpl });
  const latest = await source.latest(postgres);
  assert.deepEqual(latest, {
    version: "18.1",
    tag: "REL_18_1",
    publishedAt: null,
    url: "https://github.com/postgres/postgres/releases/tag/REL_18_1",
  });
  assert.equal(calls.length, 4);
  assert.equal(calls[0].headers.Authorization, undefined);
});

test("GithubSource falls back to tags when the latest release tag does not match the pattern", async () => {
  const { fetchImpl } = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: {
      status: 200,
      body: { tag_name: "v17.0.0-canary.1", published_at: null, html_url: "x" },
    },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=1`]: {
      status: 200,
      body: [{ name: "v17.0.0-canary.1" }, { name: "v16.3.0" }],
    },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=2`]: { status: 200, body: [] },
  });
  const latest = await new GithubSource({ fetchImpl }).latest(next);
  assert.equal(latest?.version, "16.3.0");
});

test("GithubSource returns null when no tag matches and throws on other errors", async () => {
  const none = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: { status: 404 },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=1`]: { status: 200, body: [{ name: "weird" }] },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=2`]: { status: 200, body: [] },
  });
  assert.equal(await new GithubSource({ fetchImpl: none.fetchImpl }).latest(next), null);

  const limited = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: { status: 403 },
  });
  await assert.rejects(
    () => new GithubSource({ fetchImpl: limited.fetchImpl }).latest(next),
    /GitHub 403 for vercel\/next\.js/,
  );
});

test("ManualSource and resolveSource", async () => {
  const manual: UpstreamEntry = { name: "ios", source: "manual", pinned: "18", reviewed: "2026-07-09" };
  assert.equal(await new ManualSource().latest(manual), null);
  const gh = new GithubSource({ fetchImpl: stubFetch({}).fetchImpl });
  assert.ok(resolveSource(manual, gh) instanceof ManualSource);
  assert.equal(resolveSource(next, gh), gh);
});
