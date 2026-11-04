#!/usr/bin/env node

// S7 built-CLI sync qualification harness.
//
// Runs the real `cli/dist/index.js` entrypoint as a child process against a
// loopback GitHub fixture (`registry-fixture.mjs`) with a replaced environment
// and isolated HOME/XDG/project directories. The child is confined to the
// fixture by `network-preload.cjs`, which is loaded with `node --require`.
//
// The harness never builds, never syncs this workspace, and never reuses
// `scripts/test-e2e.ts` (real network + .env copy). It asserts approved
// contracts from docs/prd/prd-sync-reliability-and-attribution.md; when a
// contract is not implemented yet the scenario FAILS and is attributed to its
// owning slice. No scenario is weakened to match pre-integration behavior.
//
// Every invocation is an owned process group: bounded output, timeout
// termination of the whole group, verified termination before temp cleanup, and
// per-invocation `preload-ready`/denial evidence that fails closed. Synthetic
// control probes (`controls.mjs`) gate the run before scenarios start.
//
// Persistent disk-cache qualification (S5) is out of scope by user amendment;
// the cache/conditional-metadata scenarios were retired rather than skipped.
//
// Usage:
//   node scripts/sync-smoke/run.mjs [--scenario <name>]... [--list]
//        [--controls-only] [--timeout <seconds>] [--json]
//        [--out <evidence.json>]
//
// Every scenario is required and gates the exit status.
//
// Requires a prebuilt cli/dist/index.js (prerequisite, never built here).

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  RegistryFixture,
  FIXTURE_HOSTS,
  gitBlobSha1,
  sha256,
} from './registry-fixture.mjs';
import {
  composeVerdict,
  credentialLeakProblems,
  healthProblems,
  runControlSuite,
  runOwnedProcess,
} from './controls.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CLI_DIST = path.join(ROOT, 'cli', 'dist', 'index.js');
const CLI_PACKAGE = path.join(ROOT, 'cli', 'package.json');
const PRELOAD = path.join(HERE, 'network-preload.cjs');

const OWNER = 'fixture-owner';
const REPO = 'demo-registry';
const REGISTRY_URL = `https://${FIXTURE_HOSTS.web}/${OWNER}/${REPO}`;

const TAG_V1 = 'demo-v1.0.0';
const TAG_V2 = 'demo-v1.0.1';
const TAG_V3 = 'demo-v1.0.2';
const WORKFLOWS_EMPTY = 'workflows-v1.0.0';
const WORKFLOWS_FULL = 'workflows-v1.1.0';
const SPECIALISTS_EMPTY = 'specialists-v1.0.0';
const SPECIALISTS_FULL = 'specialists-v1.1.0';

const STDOUT_LIMIT = 512 * 1024;
const DEFAULT_TIMEOUT_S = 60;
const MAX_TIMEOUT_S = 120;

const ROOT_ATTRIBUTION_RE = /^(?:LICENSE|NOTICE)(?:\.(?:md|txt))?$/i;

// Fixed synthetic sentinel used only to detect accidental credential echoes.
// It is never placed in the child environment or sent to the fixture.
const SYNTHETIC_TOKEN_SENTINEL = 'ghp_SYNCSMOKE0000000000000000000000000000';

// ---------------------------------------------------------------------------
// Registry content
// ---------------------------------------------------------------------------

const APACHE_LICENSE = `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright 2026 Fixture Author

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
`;

const MIT_LICENSE = `MIT License

Copyright (c) 2026 Fixture Author

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction.
`;

const NOTICE_TEXT = `Demo Registry (fixture)
Copyright 2026 Fixture Author
`;

const PACKAGE_LICENSE_V1 = 'Demo Package License v1 — historical fixture bytes\n';
const PACKAGE_LICENSE_V2 = 'Demo Package License v2 — current fixture bytes\n';

function skillDoc({ name, summary, keywords, body }) {
  return `---
name: ${name}
description: ${summary}
metadata:
  triggers:
    files:
    - '**/*.ts'
    keywords:
${keywords.map((keyword) => `    - ${keyword}`).join('\n')}
---
# ${name}

${body}
`;
}

const ALPHA_SKILL_V1 = skillDoc({
  name: 'demo-alpha',
  summary: 'Historical demo skill used by the sync smoke fixture.',
  keywords: ['demo-alpha', 'historical'],
  body: 'Historical body. Changed in demo-v1.0.1.\n',
});

const ALPHA_SKILL_V2 = skillDoc({
  name: 'demo-alpha',
  summary: 'Current demo skill used by the sync smoke fixture.',
  keywords: ['demo-alpha', 'current'],
  body: 'Current body with an accepted version update.\n',
});

const ALPHA_SKILL_V3 = skillDoc({
  name: 'demo-alpha',
  summary: 'Third demo skill body with unchanged attribution.',
  keywords: ['demo-alpha', 'v3'],
  body: 'Third body: version update without any attribution change.\n',
});

const BETA_SKILL = skillDoc({
  name: 'demo-beta',
  summary: 'Second demo skill relying on root attribution.',
  keywords: ['demo-beta'],
  body: 'Stable body across releases.\n',
});

const ALPHA_NOTES = 'Reference notes for demo-alpha.\n';
const ALPHA_NEW_FILE = 'New reference file introduced by demo-v1.0.1.\n';

const SDLC_WORKFLOW = `---
name: sdlc
description: Fixture workflow used to exercise canonical workflow installation.
---
# Fixture SDLC workflow

Fixture body for workflow installation checks.
`;

const REVIEWER_SPECIALIST = `---
name: fixture-reviewer
description: Fixture specialist used to exercise specialist installation.
---
# Fixture reviewer specialist

Fixture body for specialist installation checks.
`;

function metadataDoc({ version }) {
  return `${JSON.stringify(
    {
      global: {
        author: 'Fixture Author',
        repository: REGISTRY_URL,
      },
      broad_globs: ['**/*.ts'],
      base_language_skills: { demo: 'demo-alpha' },
      file_routing: { ts: ['demo'] },
      categories: {
        demo: {
          version,
          last_updated: '2026-11-04',
          tag_prefix: 'demo-v',
          owners: [OWNER],
        },
      },
    },
    null,
    2,
  )}\n`;
}

const HISTORICAL_FILES = {
  'LICENSE': APACHE_LICENSE,
  'NOTICE': NOTICE_TEXT,
  'skills/metadata.json': metadataDoc({ version: '1.0.0' }),
  'skills/demo/demo-alpha/SKILL.md': ALPHA_SKILL_V1,
  'skills/demo/demo-alpha/LICENSE': PACKAGE_LICENSE_V1,
  'skills/demo/demo-alpha/references/notes.md': ALPHA_NOTES,
  'skills/demo/demo-beta/SKILL.md': BETA_SKILL,
};

const NEXT_FILES = {
  'LICENSE': MIT_LICENSE,
  'skills/metadata.json': metadataDoc({ version: '1.0.1' }),
  'skills/demo/demo-alpha/SKILL.md': ALPHA_SKILL_V2,
  'skills/demo/demo-alpha/LICENSE': PACKAGE_LICENSE_V2,
  'skills/demo/demo-alpha/references/notes.md': ALPHA_NOTES,
  'skills/demo/demo-alpha/references/new.md': ALPHA_NEW_FILE,
  'skills/demo/demo-beta/SKILL.md': BETA_SKILL,
};

const NEXT2_FILES = {
  ...NEXT_FILES,
  'skills/metadata.json': metadataDoc({ version: '1.0.2' }),
  'skills/demo/demo-alpha/SKILL.md': ALPHA_SKILL_V3,
};

const MAIN_V1_FILES = {
  ...HISTORICAL_FILES,
  'LICENSE': MIT_LICENSE,
  'skills/specialists/reviewer/SKILL.md': REVIEWER_SPECIALIST,
};

const MAIN_V2_FILES = {
  ...NEXT_FILES,
  'skills/specialists/reviewer/SKILL.md': REVIEWER_SPECIALIST,
};

function createFixture() {
  const registry = new RegistryFixture({ owner: OWNER, repo: REPO });
  const commits = {};
  commits.historical = registry.addCommit(HISTORICAL_FILES);
  registry.addRelease(TAG_V1, commits.historical);
  commits.next = registry.addCommit(NEXT_FILES);
  registry.addRelease(TAG_V2, commits.next);
  commits.next2 = registry.addCommit(NEXT2_FILES);
  registry.addRelease(TAG_V3, commits.next2);

  commits.workflowsEmpty = registry.addCommit({
    'skills/metadata.json': metadataDoc({ version: '1.0.0' }),
  });
  registry.addRelease(WORKFLOWS_EMPTY, commits.workflowsEmpty);
  commits.workflowsFull = registry.addCommit({
    'skills/metadata.json': metadataDoc({ version: '1.0.0' }),
    '.agents/workflows/sdlc.md': SDLC_WORKFLOW,
  });
  registry.addRelease(WORKFLOWS_FULL, commits.workflowsFull);

  commits.specialistsEmpty = registry.addCommit({
    'skills/metadata.json': metadataDoc({ version: '1.0.0' }),
  });
  registry.addRelease(SPECIALISTS_EMPTY, commits.specialistsEmpty);
  commits.specialistsFull = registry.addCommit({
    'skills/metadata.json': metadataDoc({ version: '1.0.0' }),
    'skills/specialists/reviewer/SKILL.md': REVIEWER_SPECIALIST,
  });
  registry.addRelease(SPECIALISTS_FULL, commits.specialistsFull);

  commits.mainV1 = registry.addCommit(MAIN_V1_FILES);
  registry.setRef('main', commits.mainV1);
  commits.mainV2 = registry.addCommit(MAIN_V2_FILES);
  commits.mainV3 = registry.addCommit({
    ...NEXT2_FILES,
    'skills/specialists/reviewer/SKILL.md': REVIEWER_SPECIALIST,
  });

  return { registry, commits };
}

// ---------------------------------------------------------------------------
// Config / project helpers
// ---------------------------------------------------------------------------

function configText({
  skillsRef = TAG_V1,
  workflows = false,
  workflowsRef = WORKFLOWS_EMPTY,
  specialistsRef = SPECIALISTS_EMPTY,
} = {}) {
  const lines = [
    `registry: ${REGISTRY_URL}`,
    'agents:',
    '  - claude',
    'skills:',
    '  demo:',
    `    ref: ${skillsRef}`,
  ];
  if (Array.isArray(workflows)) {
    lines.push('workflows:');
    for (const workflow of workflows) lines.push(`  - ${workflow}`);
  } else {
    lines.push(`workflows: ${workflows}`);
  }
  lines.push(`workflows_ref: ${workflowsRef}`);
  lines.push(`specialists_ref: ${specialistsRef}`);
  lines.push('custom_overrides: []');
  // Enabled + disabled scope keeps MCP prompts/hook writes out of the fixture
  // while avoiding the ordinary `--yes` re-prompt path that flips the setting.
  lines.push('mcp:');
  lines.push('  enabled: true');
  lines.push('  scope: disabled');
  lines.push('  prompted: true');
  return `${lines.join('\n')}\n`;
}

let yamlLib = null;
try {
  yamlLib = createRequire(CLI_PACKAGE)('js-yaml');
} catch {
  yamlLib = null;
}

function parseConfig(text) {
  if (yamlLib) return yamlLib.load(text);
  // Minimal fallback: the fixture writes a known shape.
  const out = { skills: {} };
  for (const line of text.split('\n')) {
    const top = line.match(/^([a-z_]+):(.*)$/);
    if (top) {
      out[top[1]] = top[2].trim();
      continue;
    }
    const cat = line.match(/^  ([A-Za-z0-9_-]+):$/);
    if (cat && out.skills) out.skills[cat[1]] ??= {};
  }
  return out;
}

async function walkFiles(root) {
  const files = new Map();
  async function visit(dir, relPrefix) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(abs, rel);
      } else if (entry.isSymbolicLink()) {
        files.set(rel, { type: 'symlink' });
      } else if (entry.isFile()) {
        const bytes = await fsp.readFile(abs);
        files.set(rel, { type: 'file', sha256: sha256(bytes), bytes });
      }
    }
  }
  await visit(root, '');
  return files;
}

function snapshotDigests(files) {
  return Object.fromEntries(
    [...files.entries()]
      .filter(([, info]) => info.type === 'file')
      .map(([rel, info]) => [rel, info.sha256])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function readProjectFile(project, rel) {
  try {
    return await fsp.readFile(path.join(project, rel));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Child execution
// ---------------------------------------------------------------------------

const KNOWN_EVENT_NAMES = new Set([
  'preload-ready',
  'denied',
  'credential-forward',
]);

function childEnv(ctx, origin, eventLogPath) {
  const env = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: ctx.home,
    TMPDIR: ctx.tmp,
    XDG_CACHE_HOME: ctx.cache,
    XDG_CONFIG_HOME: ctx.configHome,
    LANG: 'en_US.UTF-8',
    TZ: 'UTC',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    CI: '1',
    SYNC_SMOKE_ORIGIN: origin,
    SYNC_SMOKE_DENY_LOG: eventLogPath,
  };
  // Shell/platform minimums only on Windows; deliberately no GITHUB_TOKEN,
  // GH_TOKEN, NODE_OPTIONS, or PYTHONPATH.
  for (const key of ['SystemRoot', 'ComSpec', 'WINDIR', 'PATHEXT']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

async function createContext(env, { config, label }) {
  const base = await fsp.mkdtemp(path.join(env.tmpRoot, `${label}-`));
  const ctx = {
    project: path.join(base, 'project'),
    home: path.join(base, 'home'),
    tmp: path.join(base, 'tmp'),
    cache: path.join(base, 'cache'),
    configHome: path.join(base, 'config'),
    eventDir: path.join(base, 'events'),
    invocationCount: 0,
    invocations: [],
    teardownFailures: [],
    base,
  };
  await Promise.all([
    fsp.mkdir(ctx.project, { recursive: true }),
    fsp.mkdir(ctx.home, { recursive: true }),
    fsp.mkdir(ctx.tmp, { recursive: true }),
    fsp.mkdir(ctx.cache, { recursive: true }),
    fsp.mkdir(ctx.configHome, { recursive: true }),
    fsp.mkdir(ctx.eventDir, { recursive: true }),
  ]);
  await fsp.writeFile(path.join(ctx.project, '.skillsrc'), config, 'utf8');
  return ctx;
}

/**
 * Removes only this context's owned temp tree, and only after every owned
 * process group has verified termination. Unverified teardown keeps the bytes
 * for inspection and fails the scenario.
 */
async function destroyContext(ctx) {
  if (ctx.teardownFailures.length > 0) {
    return { removed: false, reason: 'teardown-unverified', base: ctx.base };
  }
  await fsp.rm(ctx.base, { recursive: true, force: true });
  return { removed: true };
}

/**
 * Parses one invocation's event log fail-closed: unreadable, malformed, or
 * unknown events and a missing/duplicated readiness line are all defects.
 */
async function readEventLog(file) {
  let text;
  try {
    text = await fsp.readFile(file, 'utf8');
  } catch (error) {
    return {
      events: [],
      problems: [`event log unreadable: ${error.code ?? error.message}`],
    };
  }
  const events = [];
  const problems = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      problems.push(`malformed event line: ${line.slice(0, 120)}`);
      continue;
    }
    if (
      !event ||
      typeof event.event !== 'string' ||
      !KNOWN_EVENT_NAMES.has(event.event)
    ) {
      problems.push(`unknown event: ${line.slice(0, 120)}`);
      continue;
    }
    events.push(event);
  }
  const ready = events.filter((event) => event.event === 'preload-ready');
  if (ready.length === 0) problems.push('missing preload-ready');
  if (ready.length > 1) problems.push('duplicate preload-ready');
  return { events, problems };
}

async function runCli(env, ctx, args, timeoutMs) {
  const eventLogPath = path.join(
    ctx.eventDir,
    `${(ctx.invocationCount += 1)}.log`,
  );
  const seqStart = env.registry.requests.length;
  const result = await runOwnedProcess({
    args: ['--require', PRELOAD, CLI_DIST, ...args],
    cwd: ctx.project,
    env: childEnv(ctx, env.registry.origin, eventLogPath),
    timeoutMs,
    limit: STDOUT_LIMIT,
  });
  const seqEnd = env.registry.requests.length;
  const log = await readEventLog(eventLogPath);
  const invocation = {
    args,
    scenario: env.currentScenario ?? null,
    eventLog: eventLogPath,
    seqStart,
    seqEnd,
    events: log.events,
    eventProblems: log.problems,
    ...result,
  };
  ctx.invocations.push(invocation);
  env.invocations.push(invocation);
  if (!result.teardown?.verified) {
    const failure = { args, teardown: result.teardown };
    ctx.teardownFailures.push(failure);
    env.teardownFailures.push(failure);
  }
  return invocation;
}

// ---------------------------------------------------------------------------
// Expectations
// ---------------------------------------------------------------------------

function sampleInfo(registry, commitSha) {
  const commit = registry.commits.get(commitSha);
  return { files: commit.files };
}

function expectedInstalled(registry, commitSha) {
  const { files } = sampleInfo(registry, commitSha);
  const installed = new Map();
  const rootAttribution = [...files.keys()].filter(
    (filePath) => !filePath.includes('/') && ROOT_ATTRIBUTION_RE.test(filePath),
  );
  const packagePaths = [...files.keys()]
    .filter((filePath) => filePath.startsWith('skills/demo/'))
    .sort((left, right) => left.localeCompare(right));
  const skills = new Set(packagePaths.map((filePath) => filePath.split('/')[2]));
  for (const filePath of packagePaths) {
    const [, , skill, ...rest] = filePath.split('/');
    installed.set(`.claude/skills/demo/${skill}/${rest.join('/')}`, files.get(filePath));
  }
  for (const skill of skills) {
    for (const rootPath of rootAttribution) {
      const target = `.claude/skills/demo/${skill}/${rootPath}`;
      const shadowed = [...installed.keys()].some(
        (existing) => existing.toLowerCase() === target.toLowerCase(),
      );
      if (!shadowed) installed.set(target, files.get(rootPath));
    }
  }
  return installed;
}

const AFFECTED_ATTRIBUTION_PACKAGES = {
  'demo/demo-alpha': {
    installedPath: '.claude/skills/demo/demo-alpha/LICENSE',
    sourcePath: 'skills/demo/demo-alpha/LICENSE',
    sourceKind: 'package',
    sha256: sha256(PACKAGE_LICENSE_V2),
    blobSha1: gitBlobSha1(PACKAGE_LICENSE_V2),
  },
  'demo/demo-beta': {
    installedPath: '.claude/skills/demo/demo-beta/LICENSE',
    sourcePath: 'LICENSE',
    sourceKind: 'root',
    sha256: sha256(MIT_LICENSE),
    blobSha1: gitBlobSha1(MIT_LICENSE),
  },
};

/**
 * Tiny package-specific oracle: every affected fixture package must carry the
 * expected qualified catalog record (origin + fixture-derived source and
 * destination digests). Used for the old setup state and both transitions.
 */
function assertAttributionCatalog(assertions, lock, { id, ac, ref, commit }) {
  const problems = [];
  for (const [packageId, expected] of Object.entries(
    AFFECTED_ATTRIBUTION_PACKAGES,
  )) {
    const record = lock?.attributionCatalog?.packages?.[packageId];
    if (!record) {
      problems.push(`${packageId}: missing catalog record`);
      continue;
    }
    if (record.requestedRef !== ref) {
      problems.push(`${packageId}: requestedRef ${String(record.requestedRef)}`);
    }
    if (record.resolvedCommit !== commit) {
      problems.push(`${packageId}: resolvedCommit ${String(record.resolvedCommit)}`);
    }
    const licenseFiles = (record.files ?? []).filter(
      (file) => file?.name === 'LICENSE',
    );
    if (licenseFiles.length !== 1) {
      problems.push(`${packageId}: LICENSE records ${licenseFiles.length}`);
      continue;
    }
    const file = licenseFiles[0];
    if (file.sourceKind !== expected.sourceKind) {
      problems.push(`${packageId}: sourceKind ${String(file.sourceKind)}`);
    }
    if (file.sourcePath !== expected.sourcePath) {
      problems.push(`${packageId}: sourcePath ${String(file.sourcePath)}`);
    }
    if (file.sha256 !== expected.sha256) {
      problems.push(`${packageId}: source sha256 ${String(file.sha256)}`);
    }
    if (file.blobSha1 !== expected.blobSha1) {
      problems.push(`${packageId}: blobSha1 ${String(file.blobSha1)}`);
    }
    const destination = (file.destinations ?? []).find(
      (binding) => binding?.path === expected.installedPath,
    );
    if (!destination) {
      problems.push(`${packageId}: missing destination ${expected.installedPath}`);
    } else if (
      destination.agent !== 'claude' ||
      destination.sha256 !== expected.sha256
    ) {
      problems.push(`${packageId}: destination binding mismatch`);
    }
  }
  assertions.check(
    id,
    ac,
    problems.length === 0,
    {
      ref,
      commit,
      packages: Object.keys(AFFECTED_ATTRIBUTION_PACKAGES),
      digests: Object.fromEntries(
        Object.entries(AFFECTED_ATTRIBUTION_PACKAGES).map(([packageId, value]) => [
          packageId,
          { sha256: value.sha256, blobSha1: value.blobSha1 },
        ]),
      ),
    },
    problems.length === 0 ? { ok: true } : problems,
  );
}

async function readLicenseDigests(ctx) {
  const read = async (rel) => {
    const bytes = await readProjectFile(ctx.project, rel);
    return bytes ? sha256(bytes) : null;
  };
  return {
    alpha: await read('.claude/skills/demo/demo-alpha/LICENSE'),
    beta: await read('.claude/skills/demo/demo-beta/LICENSE'),
  };
}

function expectedClaudeSpecialist(folderName, sourceMarkdown) {
  if (!yamlLib) return null;
  const match = sourceMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const metadata = yamlLib.load(match[1]) ?? {};
  if (
    metadata.tools !== undefined ||
    metadata['allowed-tools'] !== undefined ||
    metadata.model !== undefined ||
    metadata.color !== undefined
  ) {
    return null;
  }
  const body = match[2].trim();
  const baseName = folderName.replace(/^specialist-/, '');
  const description =
    metadata.description || `Specialist persona for ${baseName}`;
  const frontmatter = yamlLib
    .dump({ name: baseName, description }, { lineWidth: -1 })
    .trimEnd();
  return {
    path: `.claude/agents/${baseName}.md`,
    content: `---\n${frontmatter}\n---\n\n${body}`,
  };
}

function candidateRefMatch(pathname, refs) {
  return refs.some((ref) => pathname.includes(ref));
}

function singleJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function requestWindow(registry, startSeq) {
  return registry.requests.filter((request) => request.seq > startSeq);
}

function summarizeRequests(requests) {
  const byHost = {};
  const byRoute = {};
  for (const request of requests) {
    byHost[request.host] = (byHost[request.host] ?? 0) + 1;
    const key = request.route ?? `${request.method} ${request.path}`;
    byRoute[key] = (byRoute[key] ?? 0) + 1;
  }
  return { total: requests.length, byHost, byRoute };
}

function lastSeq(registry) {
  return registry.requests.length;
}

async function fixtureGet(registry, host, pathWithQuery) {
  const origin = new URL(registry.origin);
  return await new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: origin.hostname,
        port: Number(origin.port),
        path: pathWithQuery,
        method: 'GET',
        headers: { 'x-sync-smoke-host': host },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    request.on('error', reject);
    request.end();
  });
}

/**
 * Independent recomputation of the Git root tree object for the entries the
 * fixture actually served. Proves tree identities are real Git hashes derived
 * from modes/names/blob SHA-1s, not self-reported 40-hex strings.
 */
function gitTreeShaFromEntries(entries) {
  const byDir = new Map();
  for (const entry of entries) {
    const parts = entry.path.split('/');
    const name = parts.pop();
    const dir = parts.join('/');
    const list = byDir.get(dir) ?? [];
    list.push({ ...entry, name });
    byDir.set(dir, list);
  }
  function hashDir(dir) {
    const rows = (byDir.get(dir) ?? [])
      .map((entry) => ({
        sort: entry.type === 'tree' ? `${entry.name}/` : entry.name,
        mode: entry.type === 'tree' ? '40000' : entry.mode,
        name: entry.name,
        hash: Buffer.from(entry.sha, 'hex'),
      }))
      .sort((left, right) =>
        Buffer.compare(Buffer.from(left.sort), Buffer.from(right.sort)),
      );
    const payload = Buffer.concat(
      rows.map((row) =>
        Buffer.concat([
          Buffer.from(`${row.mode} ${row.name}\0`, 'utf8'),
          row.hash,
        ]),
      ),
    );
    return createHash('sha1')
      .update(Buffer.from(`tree ${payload.byteLength}\0`, 'utf8'))
      .update(payload)
      .digest('hex');
  }
  return hashDir('');
}

async function verifyFixtureGitIdentity(registry, commits) {
  const results = [];
  const problems = [];
  for (const [label, commitSha] of Object.entries(commits)) {
    const treeResponse = await fixtureGet(
      registry,
      FIXTURE_HOSTS.api,
      `/repos/${OWNER}/${REPO}/git/trees/${commitSha}?recursive=1`,
    );
    const treeBody = JSON.parse(treeResponse.body.toString('utf8'));
    const commitResponse = await fixtureGet(
      registry,
      FIXTURE_HOSTS.api,
      `/repos/${OWNER}/${REPO}/git/commits/${commitSha}`,
    );
    const gitCommit = JSON.parse(commitResponse.body.toString('utf8'));
    const recomputedTreeSha = gitTreeShaFromEntries(treeBody.tree);
    const blobProblems = [];
    for (const entry of treeBody.tree.filter((item) => item.type === 'blob')) {
      const blobResponse = await fixtureGet(
        registry,
        FIXTURE_HOSTS.api,
        `/repos/${OWNER}/${REPO}/git/blobs/${entry.sha}`,
      );
      const actual = gitBlobSha1(blobResponse.body);
      if (actual !== entry.sha) {
        blobProblems.push({ path: entry.path, served: actual, tree: entry.sha });
      }
    }
    const ok =
      treeBody.truncated === false &&
      recomputedTreeSha === treeBody.sha &&
      gitCommit.sha === commitSha &&
      gitCommit.tree?.sha === treeBody.sha &&
      blobProblems.length === 0;
    if (!ok) problems.push(label);
    results.push({
      label,
      commit: commitSha,
      treeSha: treeBody.sha,
      recomputedTreeSha,
      gitCommitTreeSha: gitCommit.tree?.sha ?? null,
      blobCount: treeBody.tree.filter((item) => item.type === 'blob').length,
      blobProblems,
      ok,
    });
  }
  return { ok: problems.length === 0, problems, commits: results };
}

// ---------------------------------------------------------------------------
// Assertion plumbing
// ---------------------------------------------------------------------------

function newAssertions(scenario) {
  const list = [];
  return {
    list,
    check(id, ac, ok, expected, actual) {
      list.push({
        id,
        ac,
        ok: Boolean(ok),
        expected: expected === undefined ? null : expected,
        actual: actual === undefined ? null : actual,
      });
      return Boolean(ok);
    },
    equal(id, ac, actual, expected) {
      const ok = JSON.stringify(actual) === JSON.stringify(expected);
      return this.check(id, ac, ok, expected, actual);
    },
  };
}

async function assertExactInstalled(assertions, ctx, expectedMap) {
  const mismatches = [];
  for (const [rel, bytes] of expectedMap) {
    const actual = await readProjectFile(ctx.project, rel);
    if (!actual) {
      mismatches.push({ path: rel, problem: 'missing' });
      continue;
    }
    const expectedDigest = sha256(bytes);
    const actualDigest = sha256(actual);
    if (actualDigest !== expectedDigest) {
      mismatches.push({
        path: rel,
        problem: 'digest-mismatch',
        expected: expectedDigest,
        actual: actualDigest,
      });
    }
  }
  assertions.check(
    'installed-bytes',
    'AC-22',
    mismatches.length === 0,
    `${expectedMap.size} installed files with fixture digests`,
    mismatches.slice(0, 8),
  );
  return mismatches;
}

async function readLock(ctx) {
  const bytes = await readProjectFile(ctx.project, '.skills-lock.json');
  if (!bytes) return { bytes: null, lock: null };
  try {
    return { bytes, lock: JSON.parse(bytes.toString('utf8')) };
  } catch {
    return { bytes, lock: null };
  }
}

/**
 * Converts a newly qualified install into legacy-unqualified state by removing
 * only the attribution catalog. Installed bytes and every other lock field are
 * preserved, so a following denial proves consent gating, not missing content.
 */
async function stripAttributionCatalog(ctx) {
  const file = path.join(ctx.project, '.skills-lock.json');
  const bytes = await fsp.readFile(file);
  const lock = JSON.parse(bytes.toString('utf8'));
  const hadCatalog = Object.prototype.hasOwnProperty.call(
    lock,
    'attributionCatalog',
  );
  delete lock.attributionCatalog;
  await fsp.writeFile(file, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  const after = JSON.parse(await fsp.readFile(file, 'utf8'));
  return {
    hadCatalog,
    catalogAbsent: !Object.prototype.hasOwnProperty.call(
      after,
      'attributionCatalog',
    ),
  };
}

async function assertLockCovers(
  assertions,
  ctx,
  expectedMap,
  { ref, commit, ac, requireCatalog = false },
) {
  const { lock } = await readLock(ctx);
  assertions.check('lock-present', ac, lock !== null, 'version-2 lock file', lock ? 'present' : 'missing');
  if (!lock) return;
  assertions.check('lock-version', ac, lock.version === 2, 2, lock.version);
  const source = lock.sources?.['skills/demo'];
  assertions.check(
    'lock-source',
    ac,
    source?.ref === ref && source?.commit === commit,
    { ref, commit },
    source ?? null,
  );
  const missing = [];
  const digestMismatch = [];
  for (const [rel, bytes] of expectedMap) {
    const entry = lock.entries?.[rel];
    if (!entry) {
      missing.push(rel);
    } else if (entry.sha256 !== sha256(bytes)) {
      digestMismatch.push({ path: rel, expected: sha256(bytes), actual: entry.sha256 });
    }
  }
  assertions.check(
    'lock-entries',
    ac,
    missing.length === 0 && digestMismatch.length === 0,
    `${expectedMap.size} owned files`,
    { missing: missing.slice(0, 8), digestMismatch: digestMismatch.slice(0, 8) },
  );
  const catalogOk =
    lock.attributionCatalog === undefined ||
    (lock.attributionCatalog.version === 1 &&
      typeof lock.attributionCatalog.packages === 'object' &&
      lock.attributionCatalog.packages !== null);
  assertions.check(
    'lock-attribution-origin',
    ac,
    requireCatalog
      ? lock.attributionCatalog?.version === 1
      : catalogOk,
    requireCatalog
      ? 'attributionCatalog version 1 written by the new CLI'
      : 'attributionCatalog absent (legacy) or version 1',
    lock.attributionCatalog === undefined
      ? 'absent'
      : { version: lock.attributionCatalog.version },
  );
}

function assertPreserved(assertions, before, after, { ac, id = 'state-preserved' }) {
  const changed = [];
  const keys = new Set([...before.keys(), ...after.keys()]);
  for (const key of keys) {
    const left = before.get(key);
    const right = after.get(key);
    if (!left || !right || left.sha256 !== right.sha256) {
      changed.push({
        path: key,
        before: left?.sha256 ?? null,
        after: right?.sha256 ?? null,
      });
    }
  }
  assertions.check(
    id,
    ac,
    changed.length === 0,
    'project bytes unchanged',
    changed.slice(0, 10),
  );
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const SCENARIOS = [];
function scenario(definition) {
  SCENARIOS.push(definition);
}

// S4/S7 settled contract (.agent/sdd/sync-reliability/command-outcome-contract.md):
// success = sync.result/data.status success, failure = sync.error/data.code,
// exit 1 for failure/cancel, dry-run keeps sync.plan. Assertions use the
// semantic code and actual bytes, never incidental message text.
function assertErrorEnvelope(assertions, run, code, ac) {
  const envelope = singleJson(run.stdout);
  assertions.check('exit', ac, run.code === 1, 1, run.code);
  assertions.check(
    'single-json-stdout',
    ac,
    envelope !== null,
    'stdout is exactly one JSON document',
    run.stdout.slice(0, 400),
  );
  assertions.check('failure-kind', ac, envelope?.kind === 'sync.error', "kind 'sync.error'", envelope?.kind ?? null);
  assertions.check('failure-code', ac, envelope?.data?.code === code, code, envelope?.data?.code ?? null);
  assertions.check('schema-version', ac, envelope?.schema_version === 1, 1, envelope?.schema_version ?? null);
  return envelope;
}

function assertSuccessEnvelope(assertions, run, ac) {
  const envelope = singleJson(run.stdout);
  assertions.check('exit', ac, run.code === 0, 0, run.code);
  assertions.check(
    'single-json-stdout',
    ac,
    envelope !== null,
    'stdout is exactly one JSON document',
    run.stdout.slice(0, 400),
  );
  assertions.check('success-kind', ac, envelope?.kind === 'sync.result', "kind 'sync.result'", envelope?.kind ?? null);
  assertions.check('success-status', ac, envelope?.data?.status === 'success', 'success', envelope?.data?.status ?? null);
  assertions.check('schema-version', ac, envelope?.schema_version === 1, 1, envelope?.schema_version ?? null);
  return envelope;
}

scenario({
  name: 'initial-verified-sync',
  acs: ['AC-06', 'AC-11', 'AC-12', 'AC-22'],
  owner: 'S1/S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'initial' });
    const assertions = newAssertions(this);
    const start = lastSeq(registry);
    try {
      const run = await runCli(env, ctx, ['sync'], env.timeoutMs);
      const expected = expectedInstalled(registry, commits.historical);
      assertions.check('exit', 'AC-22', run.code === 0, 0, run.code);
      assertions.check(
        'fresh-install-transition-consent-not-required',
        'AC-16',
        !run.args.includes('--accept-attribution-changes'),
        'fresh install needs no attribution transition consent',
        { exit: run.code, args: run.args },
      );
      await assertExactInstalled(assertions, ctx, expected);
      const packageLicense = await readProjectFile(
        ctx.project,
        '.claude/skills/demo/demo-alpha/LICENSE',
      );
      assertions.check(
        'package-license-precedence',
        'AC-12',
        packageLicense?.toString('utf8') === PACKAGE_LICENSE_V1,
        sha256(PACKAGE_LICENSE_V1),
        packageLicense ? sha256(packageLicense) : null,
      );
      const rootLicense = await readProjectFile(
        ctx.project,
        '.claude/skills/demo/demo-beta/LICENSE',
      );
      assertions.check(
        'root-attribution-bytes',
        'AC-13',
        rootLicense?.toString('utf8') === APACHE_LICENSE,
        sha256(APACHE_LICENSE),
        rootLicense ? sha256(rootLicense) : null,
      );
      await assertLockCovers(assertions, ctx, expected, {
        ref: TAG_V1,
        commit: commits.historical,
        ac: 'AC-11',
        requireCatalog: true,
      });
      const config = await readProjectFile(ctx.project, '.skillsrc');
      assertions.check(
        'config-unchanged',
        'AC-15',
        config?.toString('utf8') === configText(),
        'identical .skillsrc bytes',
        config ? sha256(config) : null,
      );
      const installedFiles = await walkFiles(path.join(ctx.project, '.claude/skills/demo'));
      const extras = [...installedFiles.keys()].filter(
        (rel) =>
          rel !== '_INDEX.md' &&
          !rel.startsWith('demo-alpha/') &&
          !rel.startsWith('demo-beta/'),
      );
      assertions.check(
        'installed-surface',
        'AC-22',
        installedFiles.size > 0 && extras.length === 0,
        'demo-alpha/demo-beta packages plus _INDEX.md',
        { files: installedFiles.size, extras },
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-2000),
          stderrTail: run.stderr.slice(-2000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'missing-ref-404',
  acs: ['AC-05', 'AC-21'],
  owner: 'S1/S4',
  async run(env) {
    const { registry } = env;
    const ctx = await createContext(env, {
      config: configText({ skillsRef: 'demo-v9.9.9' }),
      label: 'missing-ref',
    });
    const assertions = newAssertions(this);
    const start = lastSeq(registry);
    try {
      const before = await walkFiles(ctx.project);
      const run = await runCli(env, ctx, ['sync', '--json'], env.timeoutMs);
      const after = await walkFiles(ctx.project);
      const envelope = assertErrorEnvelope(assertions, run, 'sync-failed', 'AC-05');
      assertions.check(
        'missing-not-misclassified',
        'AC-05',
        !['rate-limited', 'access-denied', 'integrity'].includes(
          envelope?.data?.code,
        ),
        'missing ref is not reported as throttle/access/integrity',
        envelope?.data?.code ?? null,
      );
      await assertPreserved(assertions, before, after, { ac: 'AC-21' });
      return {
        assertions,
        evidence: {
          exit: run.code,
          envelope,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-2000),
          stderrTail: run.stderr.slice(-2000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'json-success-envelope',
  acs: ['AC-05', 'AC-22'],
  owner: 'S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'json-success' });
    const assertions = newAssertions(this);
    const start = lastSeq(registry);
    try {
      const run = await runCli(env, ctx, ['sync', '--json'], env.timeoutMs);
      const expected = expectedInstalled(registry, commits.historical);
      assertSuccessEnvelope(assertions, run, 'AC-05');
      await assertExactInstalled(assertions, ctx, expected);
      const { lock } = await readLock(ctx);
      assertions.check(
        'source-identity',
        'AC-22',
        lock?.sources?.['skills/demo']?.commit === commits.historical,
        commits.historical,
        lock?.sources?.['skills/demo']?.commit ?? null,
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-2000),
          stderrTail: run.stderr.slice(-2000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'accepted-version-update',
  acs: ['AC-02', 'AC-11', 'AC-18'],
  owner: 'S1/S2/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'accepted' });
    const assertions = newAssertions(this);
    const start = lastSeq(registry);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      registry.setRef('main', commits.mainV2);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const expected = expectedInstalled(registry, commits.next);
      assertSuccessEnvelope(assertions, run, 'AC-11');
      await assertExactInstalled(assertions, ctx, expected);
      const configTextAfter = (await readProjectFile(ctx.project, '.skillsrc'))?.toString('utf8') ?? '';
      assertions.check(
        'config-ref-updated',
        'AC-02',
        configTextAfter.includes(`ref: ${TAG_V2}`) && !configTextAfter.includes(`ref: ${TAG_V1}`),
        `demo ref ${TAG_V2}`,
        configTextAfter.match(/ref: .*/)?.[0] ?? null,
      );
      const newFile = await readProjectFile(
        ctx.project,
        '.claude/skills/demo/demo-alpha/references/new.md',
      );
      assertions.check(
        'new-file-installed',
        'AC-11',
        newFile?.toString('utf8') === ALPHA_NEW_FILE,
        sha256(ALPHA_NEW_FILE),
        newFile ? sha256(newFile) : null,
      );
      await assertLockCovers(assertions, ctx, expected, {
        ref: TAG_V2,
        commit: commits.next,
        ac: 'AC-11',
        requireCatalog: true,
      });
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-2000),
          stderrTail: run.stderr.slice(-2000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'accepted-version-update-identical-attribution-bytes',
  acs: ['AC-11', 'AC-14', 'AC-16', 'AC-18'],
  owner: 'S1/S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, {
      config: configText({ skillsRef: TAG_V2 }),
      label: 'accepted-identical',
    });
    const assertions = newAssertions(this);
    const start = lastSeq(registry);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      const setupLock = await readLock(ctx);
      assertAttributionCatalog(assertions, setupLock.lock, {
        id: 'setup-qualified-old-catalog',
        ac: 'AC-14',
        ref: TAG_V2,
        commit: commits.next,
      });
      const licenseBefore = await readLicenseDigests(ctx);
      assertions.check(
        'setup-installed-license-digests',
        'AC-14',
        licenseBefore.alpha === AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-alpha'].sha256 &&
          licenseBefore.beta === AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-beta'].sha256,
        {
          alpha: AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-alpha'].sha256,
          beta: AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-beta'].sha256,
        },
        licenseBefore,
      );
      registry.setRef('main', commits.mainV3);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const expected = expectedInstalled(registry, commits.next2);
      assertSuccessEnvelope(assertions, run, 'AC-16');
      await assertExactInstalled(assertions, ctx, expected);
      const licenseAfter = await readLicenseDigests(ctx);
      assertions.check(
        'license-bytes-identical',
        'AC-11',
        licenseBefore.alpha !== null &&
          licenseBefore.alpha === licenseAfter.alpha &&
          licenseBefore.beta === licenseAfter.beta,
        {
          alpha: sha256(PACKAGE_LICENSE_V2),
          beta: sha256(MIT_LICENSE),
        },
        { before: licenseBefore, after: licenseAfter },
      );
      const configTextAfter =
        (await readProjectFile(ctx.project, '.skillsrc'))?.toString('utf8') ?? '';
      assertions.check(
        'config-ref-updated',
        'AC-18',
        configTextAfter.includes(`ref: ${TAG_V3}`) &&
          !configTextAfter.includes(`ref: ${TAG_V2}`),
        `demo ref ${TAG_V3}`,
        configTextAfter.match(/ref: .*/)?.[0] ?? null,
      );
      await assertLockCovers(assertions, ctx, expected, {
        ref: TAG_V3,
        commit: commits.next2,
        ac: 'AC-11',
        requireCatalog: true,
      });
      const { lock } = await readLock(ctx);
      assertAttributionCatalog(assertions, lock, {
        id: 'each-package-origin-advanced',
        ac: 'AC-14',
        ref: TAG_V3,
        commit: commits.next2,
      });
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          licenseBefore,
          licenseAfter,
          stdoutTail: run.stdout.slice(-2000),
          stderrTail: run.stderr.slice(-2000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'origin-change-without-consent-denied',
  acs: ['AC-14', 'AC-15', 'AC-21'],
  owner: 'S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, {
      config: configText({ skillsRef: TAG_V2 }),
      label: 'origin-denied',
    });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      const setupLock = await readLock(ctx);
      assertAttributionCatalog(assertions, setupLock.lock, {
        id: 'setup-qualified-old-catalog',
        ac: 'AC-14',
        ref: TAG_V2,
        commit: commits.next,
      });
      const licenseBefore = await readLicenseDigests(ctx);
      assertions.check(
        'setup-installed-license-digests',
        'AC-14',
        licenseBefore.alpha === AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-alpha'].sha256 &&
          licenseBefore.beta === AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-beta'].sha256,
        {
          alpha: AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-alpha'].sha256,
          beta: AFFECTED_ATTRIBUTION_PACKAGES['demo/demo-beta'].sha256,
        },
        licenseBefore,
      );
      const before = await walkFiles(ctx.project);
      registry.setRef('main', commits.mainV3);
      const start = lastSeq(registry);
      // Ref/commit moves are origin changes under the accepted S3 predicate,
      // even though every LICENSE/NOTICE byte is identical.
      const run = await runCli(env, ctx, ['sync', '--json', '--yes'], env.timeoutMs);
      const after = await walkFiles(ctx.project);
      assertErrorEnvelope(
        assertions,
        run,
        'attribution-consent-required',
        'AC-15',
      );
      await assertPreserved(assertions, before, after, { ac: 'AC-21' });
      const licenseAfter = await readLicenseDigests(ctx);
      assertions.check(
        'license-bytes-preserved',
        'AC-14',
        licenseBefore.alpha !== null &&
          licenseBefore.alpha === licenseAfter.alpha &&
          licenseBefore.beta === licenseAfter.beta,
        licenseBefore,
        licenseAfter,
      );
      const { lock } = await readLock(ctx);
      assertions.check(
        'origin-not-advanced',
        'AC-15',
        lock?.sources?.['skills/demo']?.ref === TAG_V2 &&
          lock?.sources?.['skills/demo']?.commit === commits.next,
        { ref: TAG_V2, commit: commits.next },
        lock?.sources?.['skills/demo'] ?? null,
      );
      assertAttributionCatalog(assertions, lock, {
        id: 'each-package-origin-retained',
        ac: 'AC-15',
        ref: TAG_V2,
        commit: commits.next,
      });
      assertions.check(
        'candidate-considered',
        'AC-14',
        requestWindow(registry, start).some(
          (request) =>
            request.path.includes(TAG_V3) || request.path.includes(commits.next2),
        ),
        'candidate ref/commit observed before consent refusal',
        summarizeRequests(requestWindow(registry, start)),
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          licenseBefore,
          licenseAfter,
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'historical-attribution-preserved',
  acs: ['AC-13', 'AC-15', 'AC-18'],
  owner: 'S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'historical' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      const installedBeforeStrip = await walkFiles(
        path.join(ctx.project, '.claude/skills/demo'),
      );
      const stripped = await stripAttributionCatalog(ctx);
      const installedAfterStrip = await walkFiles(
        path.join(ctx.project, '.claude/skills/demo'),
      );
      assertions.check(
        'legacy-strip-only-catalog',
        'AC-13',
        stripped.catalogAbsent &&
          JSON.stringify(snapshotDigests(installedBeforeStrip)) ===
            JSON.stringify(snapshotDigests(installedAfterStrip)),
        'attributionCatalog removed, historical bytes retained',
        stripped,
      );
      const before = await walkFiles(ctx.project);
      registry.setRef('main', commits.mainV2);
      const start = lastSeq(registry);
      const run = await runCli(env, ctx, ['sync', '--json'], env.timeoutMs);
      const after = await walkFiles(ctx.project);
      assertErrorEnvelope(assertions, run, 'attribution-consent-required', 'AC-15');
      await assertPreserved(assertions, before, after, { ac: 'AC-13' });
      const rootLicense = await readProjectFile(
        ctx.project,
        '.claude/skills/demo/demo-beta/LICENSE',
      );
      assertions.check(
        'historical-license-bytes',
        'AC-13',
        rootLicense?.toString('utf8') === APACHE_LICENSE,
        sha256(APACHE_LICENSE),
        rootLicense ? sha256(rootLicense) : null,
      );
      const { lock } = await readLock(ctx);
      assertions.check(
        'historical-source',
        'AC-13',
        lock?.sources?.['skills/demo']?.ref === TAG_V1 &&
          lock?.sources?.['skills/demo']?.commit === commits.historical,
        { ref: TAG_V1, commit: commits.historical },
        lock?.sources?.['skills/demo'] ?? null,
      );
      const nextDownloads = requestWindow(registry, start).filter(
        (request) => request.host === FIXTURE_HOSTS.raw && request.path.includes(TAG_V2),
      );
      assertions.check(
        'no-current-branch-substitution',
        'AC-13',
        nextDownloads.length === 0,
        'zero raw downloads from the unselected newer tag',
        nextDownloads.length,
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stderrTail: run.stderr.slice(-2000),
          stdoutTail: run.stdout.slice(-2000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'attribution-change-denied',
  acs: ['AC-14', 'AC-15', 'AC-21'],
  owner: 'S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'attr-denied' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      const before = await walkFiles(ctx.project);
      registry.setRef('main', commits.mainV2);
      const start = lastSeq(registry);
      const run = await runCli(env, ctx, ['sync', '--json', '--yes'], env.timeoutMs);
      const after = await walkFiles(ctx.project);
      assertErrorEnvelope(assertions, run, 'attribution-consent-required', 'AC-15');
      await assertPreserved(assertions, before, after, { ac: 'AC-21' });
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'attribution-change-accepted',
  acs: ['AC-12', 'AC-16'],
  owner: 'S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'attr-accepted' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      registry.setRef('main', commits.mainV2);
      const start = lastSeq(registry);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const expected = expectedInstalled(registry, commits.next);
      assertSuccessEnvelope(assertions, run, 'AC-16');
      await assertExactInstalled(assertions, ctx, expected);
      const rootLicense = await readProjectFile(
        ctx.project,
        '.claude/skills/demo/demo-beta/LICENSE',
      );
      assertions.check(
        'accepted-license-bytes',
        'AC-16',
        rootLicense?.toString('utf8') === MIT_LICENSE,
        sha256(MIT_LICENSE),
        rootLicense ? sha256(rootLicense) : null,
      );
      const { lock } = await readLock(ctx);
      assertions.check(
        'catalog-origin',
        'AC-12',
        lock?.attributionCatalog?.version === 1 &&
          Object.values(lock.attributionCatalog.packages ?? {}).some(
            (entry) => entry?.resolvedCommit === commits.next,
          ),
        `attributionCatalog version 1 with resolvedCommit ${commits.next}`,
        lock?.attributionCatalog
          ? {
              version: lock.attributionCatalog.version,
              packages: Object.keys(lock.attributionCatalog.packages ?? {}),
              commits: Object.values(lock.attributionCatalog.packages ?? {}).map(
                (entry) => entry?.resolvedCommit ?? null,
              ),
            }
          : 'absent',
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'primary-rate-limit-stops',
  acs: ['AC-03', 'AC-05', 'AC-21'],
  owner: 'S1/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'primary' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      const before = await walkFiles(ctx.project);
      registry.setRef('main', commits.mainV2);
      const treeTarget = new RegExp(
        `/git/trees/(?:${TAG_V2.replace(/\./g, '\\.')}|${commits.next})`,
      );
      registry.injectFault({
        host: FIXTURE_HOSTS.api,
        path: treeTarget,
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-limit': '60',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        body: JSON.stringify({ message: 'API rate limit exceeded' }),
      });
      const start = lastSeq(registry);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const after = await walkFiles(ctx.project);
      const window = requestWindow(registry, start);
      const faulted = window.filter((request) => request.faulted);
      const candidateFaults = faulted.filter(
        (request) =>
          request.faultId === 1 &&
          request.host === FIXTURE_HOSTS.api &&
          request.method === 'GET' &&
          request.status === 403 &&
          candidateRefMatch(request.path, [TAG_V2, commits.next]),
      );
      const firstFault = candidateFaults[0];
      const afterFault = firstFault
        ? window.filter((request) => request.seq > firstFault.seq)
        : [];
      assertErrorEnvelope(assertions, run, 'rate-limited', 'AC-03');
      assertions.check(
        'fault-observed',
        'AC-03',
        faulted.length === 1 && candidateFaults.length === 1,
        'exactly one injected 403 fault on the selected candidate path',
        faulted.map((request) => ({
          faultId: request.faultId,
          status: request.status,
          path: request.path,
        })),
      );
      await assertPreserved(assertions, before, after, { ac: 'AC-21' });
      assertions.check(
        'no-post-throttle-scheduling',
        'AC-03',
        firstFault !== undefined && afterFault.length <= 1,
        '<=1 in-flight settle request after the first rate-limit response',
        afterFault.map((request) => `${request.host} ${request.path}`),
      );
      const downloads = window.filter(
        (request) =>
          request.host === FIXTURE_HOSTS.raw &&
          request.path.includes('/skills/demo/') &&
          candidateRefMatch(request.path, [TAG_V2, commits.next]),
      );
      assertions.check(
        'no-download-after-throttle',
        'AC-03',
        downloads.length === 0,
        'zero raw downloads for the unverified tag',
        downloads.length,
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(window),
          afterFault: afterFault.map((request) => ({
            host: request.host,
            path: request.path,
          })),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      registry.clearFaults();
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'secondary-throttle-header',
  acs: ['AC-04', 'AC-05'],
  owner: 'S1/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'secondary' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      registry.setRef('main', commits.mainV2);
      registry.injectFault({
        host: FIXTURE_HOSTS.api,
        path: new RegExp(`/commits/${TAG_V2.replace(/\./g, '\\.')}`),
        status: 403,
        headers: {
          'retry-after': '30',
          'x-ratelimit-remaining': '42',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 30),
        },
        body: JSON.stringify({ message: 'You have exceeded a secondary rate limit' }),
      });
      const start = lastSeq(registry);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const window = requestWindow(registry, start);
      const faulted = window.filter((request) => request.faulted);
      const candidateFaults = faulted.filter(
        (request) =>
          request.faultId === 1 &&
          request.host === FIXTURE_HOSTS.api &&
          request.method === 'GET' &&
          request.status === 403 &&
          request.path.includes('/commits/') &&
          candidateRefMatch(request.path, [TAG_V2, commits.next]),
      );
      const commitRequests = window.filter(
        (request) =>
          request.path.includes('/commits/') &&
          candidateRefMatch(request.path, [TAG_V2, commits.next]),
      );
      assertErrorEnvelope(assertions, run, 'rate-limited', 'AC-04');
      assertions.check(
        'fault-observed',
        'AC-04',
        faulted.length === 1 && candidateFaults.length === 1,
        'exactly one injected 403 fault on candidate resolution',
        faulted.map((request) => ({
          faultId: request.faultId,
          status: request.status,
          path: request.path,
        })),
      );
      assertions.check(
        'no-retry-storm',
        'AC-04',
        commitRequests.length === 1,
        'exactly one resolution request',
        commitRequests.length,
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(window),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      registry.clearFaults();
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'ordinary-403-is-access-denied',
  acs: ['AC-04', 'AC-05'],
  owner: 'S1/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'forbidden' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      registry.setRef('main', commits.mainV2);
      registry.injectFault({
        host: FIXTURE_HOSTS.api,
        path: new RegExp(`/commits/${TAG_V2.replace(/\./g, '\\.')}`),
        status: 403,
        headers: { 'x-ratelimit-remaining': '1234' },
        body: JSON.stringify({ message: 'Resource not accessible by integration' }),
      });
      const start = lastSeq(registry);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const window = requestWindow(registry, start);
      const faulted = window.filter((request) => request.faulted);
      const candidateFaults = faulted.filter(
        (request) =>
          request.faultId === 1 &&
          request.host === FIXTURE_HOSTS.api &&
          request.method === 'GET' &&
          request.status === 403 &&
          request.path.includes('/commits/') &&
          candidateRefMatch(request.path, [TAG_V2, commits.next]),
      );
      assertErrorEnvelope(assertions, run, 'access-denied', 'AC-04');
      assertions.check(
        'fault-observed',
        'AC-04',
        faulted.length === 1 && candidateFaults.length === 1,
        'exactly one injected ordinary 403 fault on candidate resolution',
        faulted.map((request) => ({
          faultId: request.faultId,
          status: request.status,
          path: request.path,
        })),
      );
      const commitRequests = window.filter(
        (request) =>
          request.path.includes('/commits/') &&
          candidateRefMatch(request.path, [TAG_V2, commits.next]),
      );
      assertions.check(
        'no-retry-storm',
        'AC-04',
        commitRequests.length === 1,
        'exactly one resolution request',
        commitRequests.length,
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(window),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      registry.clearFaults();
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'json-failure-envelope',
  acs: ['AC-05', 'AC-06'],
  owner: 'S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'json' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      registry.setRef('main', commits.mainV2);
      registry.injectFault({
        host: FIXTURE_HOSTS.api,
        path: new RegExp(`/commits/${TAG_V2.replace(/\./g, '\\.')}`),
        status: 429,
        headers: { 'retry-after': '5', 'x-ratelimit-remaining': '0' },
        body: JSON.stringify({ message: 'API rate limit exceeded' }),
      });
      const start = lastSeq(registry);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const envelope = assertErrorEnvelope(assertions, run, 'rate-limited', 'AC-05');
      const faulted = requestWindow(registry, start).filter(
        (request) => request.faulted,
      );
      assertions.check(
        'fault-observed',
        'AC-05',
        faulted.length === 1 &&
          faulted[0].faultId === 1 &&
          faulted[0].host === FIXTURE_HOSTS.api &&
          faulted[0].method === 'GET' &&
          faulted[0].status === 429 &&
          faulted[0].path.includes('/commits/') &&
          candidateRefMatch(faulted[0].path, [TAG_V2, commits.next]),
        'exactly one injected 429 fault on candidate resolution',
        faulted.map((request) => ({
          faultId: request.faultId,
          status: request.status,
          path: request.path,
        })),
      );
      assertions.check(
        'no-success-summary',
        'AC-05',
        !/synced successfully|all skills synced/i.test(run.stdout),
        'no success summary on stdout',
        run.stdout.slice(0, 1200),
      );
      assertions.check(
        'auth-presence-reported',
        'AC-06',
        envelope?.data?.github?.authenticated === false,
        false,
        envelope?.data?.github?.authenticated ?? null,
      );
      const credentialProblems = credentialLeakProblems(
        `${run.stdout}\n${run.stderr}`,
        SYNTHETIC_TOKEN_SENTINEL,
      );
      assertions.check(
        'no-credential-material',
        'AC-06',
        credentialProblems.length === 0,
        'no synthetic token/header material in output',
        credentialProblems.length > 0 ? credentialProblems : 'none',
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          envelope,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      registry.clearFaults();
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'dry-run-preserves-files',
  acs: ['AC-15', 'AC-21', 'AC-22'],
  owner: 'S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'dryrun' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      const before = await walkFiles(ctx.project);
      registry.setRef('main', commits.mainV2);
      const start = lastSeq(registry);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--dry-run', '--json', '--yes'],
        env.timeoutMs,
      );
      const after = await walkFiles(ctx.project);
      const plan = singleJson(run.stdout);
      assertions.check('exit', 'AC-22', run.code === 0, 0, run.code);
      assertions.check(
        'single-plan-envelope',
        'AC-22',
        plan?.kind === 'sync.plan',
        "kind 'sync.plan'",
        plan?.kind ?? run.stdout.slice(0, 800),
      );
      assertions.check('schema-version', 'AC-22', plan?.schema_version === 1, 1, plan?.schema_version ?? null);
      await assertPreserved(assertions, before, after, { ac: 'AC-21' });
      return {
        assertions,
        evidence: {
          exit: run.code,
          planKind: plan?.kind ?? null,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'tamper-oracle',
  acs: ['AC-11', 'AC-21'],
  owner: 'S1/S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'tamper' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      registry.setRef('main', commits.mainV2);
      const targetPath = 'skills/demo/demo-alpha/SKILL.md';
      const tampered = `${ALPHA_SKILL_V2}\nTAMPERED BYTES\n`;
      const honestDigest = sha256(ALPHA_SKILL_V2);
      const tamperedDigest = sha256(tampered);
      const manifest = registry.manifest(TAG_V2);
      assertions.check(
        'honest-manifest-published',
        'AC-11',
        manifest?.files?.[targetPath] === honestDigest,
        honestDigest,
        manifest?.files?.[targetPath] ?? null,
      );
      const treeEntry = registry
        .treeFor(commits.next)
        .tree.find(
          (entry) => entry.type === 'blob' && entry.path === targetPath,
        );
      assertions.check(
        'honest-tree-published',
        'AC-11',
        treeEntry?.sha === gitBlobSha1(ALPHA_SKILL_V2) &&
          treeEntry?.sha !== gitBlobSha1(tampered),
        gitBlobSha1(ALPHA_SKILL_V2),
        treeEntry?.sha ?? null,
      );
      // Mutate only the served bytes, before this run ever acquires the newer
      // source; the published manifest and tree stay honest.
      registry.mutateServedBytes(commits.next, targetPath, tampered);
      assertions.check(
        'served-bytes-mutated',
        'AC-11',
        sha256(registry.fileAt(TAG_V2, targetPath)) === tamperedDigest,
        tamperedDigest,
        sha256(registry.fileAt(TAG_V2, targetPath)),
      );
      const servedDirect = await fixtureGet(
        registry,
        FIXTURE_HOSTS.raw,
        `/${OWNER}/${REPO}/${TAG_V2}/${targetPath}`,
      );
      assertions.check(
        'served-mutation-observed',
        'AC-11',
        servedDirect.status === 200 &&
          sha256(servedDirect.body) === tamperedDigest,
        tamperedDigest,
        { status: servedDirect.status, sha256: sha256(servedDirect.body) },
      );
      const installedBeforeRun = await readProjectFile(
        ctx.project,
        '.claude/skills/demo/demo-alpha/SKILL.md',
      );
      assertions.check(
        'older-source-installed',
        'AC-11',
        installedBeforeRun?.toString('utf8') === ALPHA_SKILL_V1,
        sha256(ALPHA_SKILL_V1),
        installedBeforeRun ? sha256(installedBeforeRun) : null,
      );
      const before = await walkFiles(ctx.project);
      const start = lastSeq(registry);
      const run = await runCli(
        env,
        ctx,
        ['sync', '--json', '--yes', '--accept-attribution-changes'],
        env.timeoutMs,
      );
      const after = await walkFiles(ctx.project);
      assertErrorEnvelope(assertions, run, 'integrity', 'AC-11');
      await assertPreserved(assertions, before, after, { ac: 'AC-21' });
      const window = requestWindow(registry, start);
      const candidateDownload = window.filter(
        (request) =>
          request.route === 'raw' &&
          request.path.endsWith(`/${targetPath}`) &&
          (request.path.includes(TAG_V2) ||
            request.path.includes(commits.next)),
      );
      assertions.check(
        'tampered-response-served',
        'AC-11',
        candidateDownload.some(
          (request) => request.servedSha256 === tamperedDigest,
        ),
        `served ${tamperedDigest}`,
        candidateDownload.map((request) => request.servedSha256 ?? null),
      );
      assertions.check(
        'no-honest-warm-bytes',
        'AC-11',
        candidateDownload.length > 0 &&
          !candidateDownload.some(
            (request) => request.servedSha256 === honestDigest,
          ),
        'candidate source acquired only as tampered bytes in this scenario',
        candidateDownload.map((request) => request.servedSha256 ?? null),
      );
      const installed = await readProjectFile(
        ctx.project,
        '.claude/skills/demo/demo-alpha/SKILL.md',
      );
      assertions.check(
        'tampered-bytes-not-installed',
        'AC-11',
        installed?.toString('utf8') !== tampered &&
          installed?.toString('utf8') === ALPHA_SKILL_V1,
        sha256(ALPHA_SKILL_V1),
        installed ? sha256(installed) : null,
      );
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(window),
          candidateDownloads: candidateDownload.map((request) => ({
            path: request.path,
            servedSha256: request.servedSha256 ?? null,
          })),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'workflow-and-specialist-resources',
  acs: ['AC-11', 'AC-22'],
  owner: 'S1/S4',
  async run(env) {
    const { registry } = env;
    const ctx = await createContext(env, {
      config: configText({
        workflows: ['sdlc'],
        workflowsRef: WORKFLOWS_FULL,
        specialistsRef: SPECIALISTS_FULL,
      }),
      label: 'resources',
    });
    const assertions = newAssertions(this);
    const start = lastSeq(registry);
    try {
      const run = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('exit', 'AC-22', run.code === 0, 0, run.code);
      const workflow = await readProjectFile(ctx.project, '.agents/workflows/sdlc.md');
      assertions.check(
        'canonical-workflow-bytes',
        'AC-22',
        workflow?.toString('utf8') === SDLC_WORKFLOW,
        sha256(SDLC_WORKFLOW),
        workflow ? sha256(workflow) : null,
      );
      const nativeWorkflow = await readProjectFile(
        ctx.project,
        '.claude/commands/sdlc.md',
      );
      assertions.check(
        'native-workflow-export',
        'AC-22',
        nativeWorkflow !== null &&
          nativeWorkflow.toString('utf8').includes(
            'Fixture body for workflow installation checks.',
          ),
        'provider export carries the canonical fixture body',
        nativeWorkflow ? sha256(nativeWorkflow) : null,
      );
      const expectedSpecialist = expectedClaudeSpecialist(
        'reviewer',
        REVIEWER_SPECIALIST,
      );
      assertions.check(
        'specialist-contract-available',
        'AC-22',
        expectedSpecialist !== null,
        'claude specialist export contract computable',
        expectedSpecialist === null ? 'yaml dependency unavailable' : 'available',
      );
      if (expectedSpecialist) {
        const specialistBytes = await readProjectFile(
          ctx.project,
          expectedSpecialist.path,
        );
        assertions.check(
          'specialist-bytes',
          'AC-22',
          specialistBytes?.toString('utf8') === expectedSpecialist.content,
          sha256(expectedSpecialist.content),
          specialistBytes ? sha256(specialistBytes) : null,
        );
        const { lock } = await readLock(ctx);
        const specialistEntries = lock
          ? Object.entries(lock.entries ?? {}).filter(
              ([, entry]) => entry.owner === 'specialist',
            )
          : [];
        assertions.check(
          'specialist-lock-binding',
          'AC-22',
          specialistEntries.length === 1 &&
            specialistEntries[0][0] === expectedSpecialist.path &&
            specialistEntries[0][1].sha256 ===
              sha256(expectedSpecialist.content),
          {
            path: expectedSpecialist.path,
            sha256: sha256(expectedSpecialist.content),
          },
          specialistEntries.map(([rel, entry]) => ({
            path: rel,
            sha256: entry.sha256,
          })),
        );
      }
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

scenario({
  name: 'legacy-attribution-same-bytes-denied',
  acs: ['AC-14', 'AC-15', 'AC-21'],
  owner: 'S3/S4',
  async run(env) {
    const { registry, commits } = env;
    const ctx = await createContext(env, { config: configText(), label: 'legacy-same' });
    const assertions = newAssertions(this);
    try {
      const setup = await runCli(env, ctx, ['sync'], env.timeoutMs);
      assertions.check('setup-exit', 'AC-22', setup.code === 0, 0, setup.code);
      const installedBeforeStrip = await walkFiles(
        path.join(ctx.project, '.claude/skills/demo'),
      );
      const stripped = await stripAttributionCatalog(ctx);
      const installedAfterStrip = await walkFiles(
        path.join(ctx.project, '.claude/skills/demo'),
      );
      assertions.check(
        'legacy-strip-only-catalog',
        'AC-14',
        stripped.catalogAbsent &&
          JSON.stringify(snapshotDigests(installedBeforeStrip)) ===
            JSON.stringify(snapshotDigests(installedAfterStrip)),
        'attributionCatalog removed, installed bytes retained',
        stripped,
      );
      const before = await walkFiles(ctx.project);
      const start = lastSeq(registry);
      // No version change, no attribution byte change: only the existing
      // legacy-unqualified record differs from the qualified proposal.
      const run = await runCli(env, ctx, ['sync', '--json', '--yes'], env.timeoutMs);
      const after = await walkFiles(ctx.project);
      assertErrorEnvelope(assertions, run, 'attribution-consent-required', 'AC-15');
      await assertPreserved(assertions, before, after, { ac: 'AC-21' });
      return {
        assertions,
        evidence: {
          exit: run.code,
          requests: summarizeRequests(requestWindow(registry, start)),
          stdoutTail: run.stdout.slice(-3000),
          stderrTail: run.stderr.slice(-3000),
        },
      };
    } finally {
      await destroyContext(ctx);
    }
  },
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {
    scenarios: [],
    list: false,
    json: false,
    out: null,
    timeoutS: DEFAULT_TIMEOUT_S,
    controlsOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--scenario') {
      const value = argv[++index];
      if (!value) throw new Error('--scenario requires a name');
      options.scenarios.push(value);
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--controls-only') {
      options.controlsOnly = true;
    } else if (arg === '--out') {
      const value = argv[++index];
      if (!value) throw new Error('--out requires a path');
      options.out = value;
    } else if (arg === '--timeout') {
      const value = Number(argv[++index]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('--timeout requires a positive number of seconds');
      }
      options.timeoutS = Math.min(value, MAX_TIMEOUT_S);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function usage() {
  return `usage: node scripts/sync-smoke/run.mjs [--scenario <name>]... [--list]
       [--controls-only] [--timeout <seconds>] [--json]
       [--out <evidence.json>]

Runs the built CLI (cli/dist/index.js) against the loopback sync fixture.
Requires a prebuilt dist; this helper never builds. Every scenario is required
and gates the exit status. --controls-only runs the synthetic boundary/lifecycle
controls without any scenario.
`;
}

function describeScenario(scenario) {
  return `${scenario.name} [${scenario.acs.join(', ')}] owner=${scenario.owner}`;
}

async function sourceBuildInfo() {
  const distBytes = await fsp.readFile(CLI_DIST);
  let version = null;
  try {
    version = JSON.parse(await fsp.readFile(CLI_PACKAGE, 'utf8')).version;
  } catch {
    version = null;
  }
  let gitHead = null;
  try {
    gitHead = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    gitHead = null;
  }
  return {
    cliDist: path.relative(ROOT, CLI_DIST),
    cliDistSha256: sha256(distBytes),
    cliVersion: version,
    gitHead,
  };
}

function assertInvocations(assertions, env, invocations) {
  if (invocations.length === 0) {
    assertions.push({
      id: 'owned-invocation',
      ac: 'AC-22',
      ok: false,
      expected: 'at least one bounded child invocation',
      actual: 'none recorded',
    });
    return;
  }
  for (const invocation of invocations) {
    const label = invocation.args.join(' ') || '(no args)';
    const problems = healthProblems(invocation);
    problems.push(...invocation.eventProblems);
    const denied = invocation.events.filter((event) => event.event === 'denied');
    if (denied.length > 0) {
      problems.push(
        `denied destinations: ${denied
          .slice(0, 3)
          .map((event) => `${event.kind}:${event.host}`)
          .join(', ')}`,
      );
    }
    const credential = invocation.events.filter(
      (event) => event.event === 'credential-forward',
    );
    if (credential.length > 0) {
      problems.push(
        `credential forwarding: ${credential
          .slice(0, 3)
          .map((event) => event.header)
          .join(', ')}`,
      );
    }
    const window = env.registry.requests.filter(
      (request) =>
        request.seq > invocation.seqStart && request.seq <= invocation.seqEnd,
    );
    const authScope = window.filter(
      (request) => request.authPresent && request.host !== FIXTURE_HOSTS.api,
    );
    if (authScope.length > 0) {
      problems.push(
        `auth outside api host: ${authScope
          .slice(0, 3)
          .map((request) => `${request.host}${request.path}`)
          .join(', ')}`,
      );
    }
    assertions.push({
      id: `invocation-health:${label}`,
      ac: 'AC-22',
      ok: problems.length === 0,
      expected: 'healthy, confined, bounded invocation',
      actual: problems,
    });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return 0;
  }
  if (options.list) {
    for (const scenario of SCENARIOS) {
      process.stdout.write(`${describeScenario(scenario)}\n`);
    }
    return 0;
  }
  if (!fs.existsSync(CLI_DIST)) {
    process.stderr.write(
      `PREREQUISITE MISSING: ${CLI_DIST}\n` +
        'Build the CLI first (e.g. `pnpm --filter ./cli build`); this helper never builds.\n',
    );
    return 2;
  }

  const known = new Set(SCENARIOS.map((scenario) => scenario.name));
  const explicitlySelected = new Set(options.scenarios);
  for (const name of options.scenarios) {
    if (!known.has(name)) {
      process.stderr.write(`unknown scenario: ${name}\n`);
      return 2;
    }
  }
  const selected =
    options.scenarios.length === 0
      ? SCENARIOS
      : SCENARIOS.filter((scenario) => explicitlySelected.has(scenario.name));

  const { registry, commits } = createFixture();
  const env = {
    registry,
    commits,
    timeoutMs: Math.round(options.timeoutS * 1000),
    tmpRoot: null,
    invocations: [],
    teardownFailures: [],
    currentScenario: null,
    controls: null,
    resetFixture() {
      // Scenarios mutate refs/faults/served bytes; each must start from the
      // published baseline so evidence never depends on scenario order.
      registry.clearFaults();
      registry.setRef('main', commits.mainV1);
      for (const commitSha of registry.commits.keys()) {
        registry.resetServedBytes(commitSha);
      }
    },
  };
  let exitCode = 0;
  let abortReason = null;
  const results = [];
  try {
    await registry.start();
    env.tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'ags-sync-smoke-'));
    env.fixtureOrigin = registry.origin;
    env.fixtureIdentity = await verifyFixtureGitIdentity(registry, commits);
    if (!env.fixtureIdentity.ok) {
      abortReason = 'fixture-identity';
    } else {
      env.controls = await runControlSuite({
        origin: registry.origin,
        preloadPath: PRELOAD,
        baseEnv: process.env,
        tmpRoot: env.tmpRoot,
        probePath: `/repos/${OWNER}/${REPO}`,
        crossFetchBase: CLI_PACKAGE,
      });
      if (!env.controls.ok) {
        abortReason = 'controls';
        if (env.controls.teardownUnverified) {
          env.teardownFailures.push({
            source: 'controls',
            dir: env.controls.preservedDir,
          });
        }
      }
    }

    if (!abortReason && !options.controlsOnly)
    for (const definition of selected) {
      env.resetFixture();
      env.currentScenario = definition.name;
      const startedAt = Date.now();
      const invocationStart = env.invocations.length;
      const teardownStart = env.teardownFailures.length;
      let outcome;
      try {
        outcome = await definition.run(env);
      } catch (error) {
        outcome = {
          assertions: {
            list: [
              {
                id: 'scenario-error',
                ac: definition.acs[0],
                ok: false,
                expected: 'scenario completes',
                actual: error instanceof Error ? error.message : String(error),
              },
            ],
          },
          evidence: {
            error: error instanceof Error ? error.stack : String(error),
          },
        };
      }
      const behaviorAssertions = outcome.assertions.list;
      const commonAssertions = [];
      assertInvocations(
        commonAssertions,
        env,
        env.invocations.slice(invocationStart),
      );
      const teardownFailures = env.teardownFailures.slice(teardownStart);
      commonAssertions.push({
        id: 'process-teardown',
        ac: 'AC-22',
        ok: teardownFailures.length === 0,
        expected: 'verified process-group termination before cleanup',
        actual:
          teardownFailures.length === 0
            ? { verified: true }
            : teardownFailures.slice(0, 3),
      });
      const verdict = composeVerdict(behaviorAssertions, commonAssertions);
      const result = {
        name: definition.name,
        acs: definition.acs,
        owner: definition.owner,
        status: verdict.status,
        durationMs: Date.now() - startedAt,
        assertions: verdict.assertions,
        failedAssertions: verdict.failed.map((assertion) => assertion.id),
        evidence: outcome.evidence,
      };
      results.push(result);
      if (result.status === 'failed') exitCode = 1;
    }
  } finally {
    env.currentScenario = null;
    await registry.stop().catch(() => {});
    if (env.tmpRoot) {
      if (
        env.teardownFailures.length > 0 ||
        abortReason !== null ||
        env.controls?.preservedDir
      ) {
        env.preservedTempRoot = env.tmpRoot;
      } else {
        await fsp.rm(env.tmpRoot, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  const sourceBuild = await sourceBuildInfo();
  const report = {
    schema_version: 1,
    kind: 'sync.smoke.report',
    generatedAt: new Date().toISOString(),
    fixture: {
      owner: OWNER,
      repo: REPO,
      hosts: FIXTURE_HOSTS,
      registryUrl: REGISTRY_URL,
    },
    prerequisite: sourceBuild,
    fixtureIdentity: env.fixtureIdentity,
    controls: env.controls,
    abortReason,
    preservedTempRoot: env.preservedTempRoot ?? null,
    scenarios: results,
    summary: {
      total: results.length,
      passed: results.filter((result) => result.status === 'passed').length,
      failed: results.filter((result) => result.status === 'failed').length,
    },
  };

  if (options.out) {
    try {
      await fsp.writeFile(options.out, `${JSON.stringify(report, null, 2)}\n`, {
        flag: 'wx',
      });
    } catch (error) {
      process.stderr.write(
        `refusing to overwrite evidence output: ${options.out} (${
          error instanceof Error ? error.message : String(error)
        })\n`,
      );
      return 2;
    }
  }

  if (abortReason) {
    const lines = [`QUALIFICATION ABORTED: ${abortReason}`];
    if (env.fixtureIdentity && !env.fixtureIdentity.ok) {
      lines.push(
        `fixture identity problems: ${JSON.stringify(env.fixtureIdentity.problems)}`,
      );
    }
    if (env.controls) {
      lines.push(
        `controls ok=${env.controls.ok} failed=${JSON.stringify(env.controls.failed)} ` +
          `teardownUnverified=${env.controls.teardownUnverified}`,
      );
      for (const probe of env.controls.probes.filter((entry) => !entry.ok)) {
        lines.push(
          `control ${probe.name}: ${JSON.stringify(probe.problems)} ` +
            `stderr=${JSON.stringify(probe.stderrTail ?? '')}`,
        );
      }
    }
    if (env.preservedTempRoot) {
      lines.push(`preserved evidence: ${env.preservedTempRoot}`);
    }
    process.stderr.write(`${lines.join('\n')}\n`);
    return 2;
  }

  if (options.controlsOnly) {
    const lines = [
      `sync-smoke controls: ${env.controls.probes.filter((probe) => probe.ok).length}/${env.controls.probes.length} pass`,
    ];
    for (const probe of env.controls.probes) {
      lines.push(`${probe.ok ? 'PASS' : 'FAIL'} ${probe.kind} ${probe.name}`);
      if (!probe.ok) {
        lines.push(`  problems=${JSON.stringify(probe.problems)}`);
      }
    }
    process.stdout.write(`${lines.join('\n')}\n`);
    return 0;
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const lines = [];
    lines.push(
      `sync-smoke: ${report.summary.passed}/${report.summary.total} required scenarios passed ` +
        `(${report.summary.failed} failed)`,
    );
    lines.push(
      `controls: ${env.controls.probes.filter((probe) => probe.ok).length}/${env.controls.probes.length} pass`,
    );
    lines.push(
      `dist ${sourceBuild.cliDistSha256} version ${sourceBuild.cliVersion ?? 'unknown'} HEAD ${sourceBuild.gitHead ?? 'unknown'}`,
    );
    for (const result of results) {
      lines.push(
        `${result.status === 'passed' ? 'PASS' : 'FAIL'} [REQUIRED] ${result.name} ` +
          `(${result.acs.join(', ')}; owner ${result.owner}; ${result.durationMs}ms)`,
      );
      for (const assertion of result.assertions.filter((entry) => !entry.ok)) {
        lines.push(
          `  ✗ ${assertion.id} [${assertion.ac}] expected=${short(assertion.expected)} actual=${short(assertion.actual)}`,
        );
      }
    }
    process.stdout.write(`${lines.join('\n')}\n`);
  }
  return exitCode;
}

function short(value) {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value ?? null);
  if (text.length <= 400) return text;
  return `${text.slice(0, 400)}…`;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(
      `sync-smoke fatal: ${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 2;
  });
