// scripts/generation/fixtures/registry-fixture.test.mjs
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildNarrowSnapshot,
  getAllowedRefs,
  startRegistryFixture,
  getCandidateCommitSha,
  hashDirectoryFiles
} from './registry-fixture.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Poll an observable condition on the real server handle without relying on timers alone. */
async function waitUntil(predicate, description, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(predicate(), `${description} did not settle within ${timeoutMs}ms`);
}

test('registry refs stay bound to frozen metadata bytes after candidate mutation', () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-ref-snapshot-'));
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({
      categories: {
        common: { tag_prefix: 'common-v', version: '3.0.0' },
        'product-management': { tag_prefix: 'product-management-v', version: '1.1.0' }
      }
    }));
    const snapshot = buildNarrowSnapshot(candidateRoot);
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({
      categories: {
        common: { tag_prefix: 'common-v', version: '99.99.99' },
        'product-management': { tag_prefix: 'product-management-v', version: '99.99.99' }
      }
    }));
    const refs = getAllowedRefs(snapshot, '1111222233334444555566667777888899990000');
    assert.equal(refs.has('common-v3.0.0'), true);
    assert.equal(refs.has('common-v99.99.99'), false);
    assert.equal(refs.has('product-management-v1.1.0'), true);
    assert.equal(refs.has('product-management-v99.99.99'), false);
  } finally {
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});

test('registry snapshot excludes checkout-private files and freezes served bytes', () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-frozen-snapshot-'));
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills/common/demo'), { recursive: true });
    fs.mkdirSync(path.join(candidateRoot, '.agents/workflows'), { recursive: true });
    fs.mkdirSync(path.join(candidateRoot, '.superpowers'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/common/demo/SKILL.md'), 'approved bytes');
    fs.writeFileSync(path.join(candidateRoot, '.agents/workflows/demo.md'), 'workflow bytes');
    fs.writeFileSync(path.join(candidateRoot, '.superpowers/private.md'), 'must not enter fixture');
    const snapshot = buildNarrowSnapshot(candidateRoot);
    fs.writeFileSync(path.join(candidateRoot, 'skills/common/demo/SKILL.md'), 'mutated bytes');

    assert.equal(snapshot.fileMap.get('skills/common/demo/SKILL.md').toString(), 'approved bytes');
    assert.equal(snapshot.fileMap.has('.superpowers/private.md'), false);
    assert.equal(snapshot.fileMap.has('.agents/workflows/demo.md'), true);
  } finally {
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});

test('registry denies credentials and serves only pinned snapshot entries', async () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-registry-routes-'));
  let fixture;
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills/common/demo'), { recursive: true });
    fs.mkdirSync(path.join(candidateRoot, '.superpowers'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/common/demo/SKILL.md'), 'pinned skill bytes');
    fs.writeFileSync(path.join(candidateRoot, '.superpowers/private.md'), 'private bytes');
    fixture = await startRegistryFixture(candidateRoot, {
      owner: 'TestOwner',
      repo: 'test-repo',
      commitSha: '2222333344445555666677778888999900001111'
    });
    const base = `http://127.0.0.1:${fixture.port}`;

    const raw = await fetch(`${base}/TestOwner/test-repo/main/skills/common/demo/SKILL.md`);
    assert.equal(raw.status, 200);
    assert.equal(await raw.text(), 'pinned skill bytes');
    assert.equal(raw.headers.get('etag'), '"175e02fdd7f4d8414f4d1f3cda689ec146244ff6"');

    const privatePath = await fetch(`${base}/TestOwner/test-repo/main/.superpowers/private.md`);
    assert.equal(privatePath.status, 404);
    const unknownRef = await fetch(`${base}/repos/TestOwner/test-repo/commits/untrusted-ref`);
    assert.equal(unknownRef.status, 404);
    const credentialRequest = await fetch(`${base}/repos/TestOwner/test-repo`, {
      headers: { Authorization: 'Bearer synthetic-never-forward' }
    });
    assert.equal(credentialRequest.status, 403);
    const traversalStatus = await new Promise((resolve, reject) => {
      const request = http.get({
        hostname: '127.0.0.1',
        port: fixture.port,
        path: '/TestOwner/test-repo/main/%2e%2e/private.md'
      }, (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode));
      });
      request.once('error', reject);
    });
    assert.equal(traversalStatus, 400);
  } finally {
    if (fixture) await fixture.close();
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});

test('harness fixture mutation alters verification input provenance while registry served bytes snapshot remains separate', () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-provenance-test-'));
  try {
    const harnessDir = path.join(candidateRoot, 'scripts/generation/fixtures');
    const skillsDir = path.join(candidateRoot, 'skills/common/demo');
    const workflowsDir = path.join(candidateRoot, '.agents/workflows');
    fs.mkdirSync(harnessDir, { recursive: true });
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), 'skill bytes');
    fs.writeFileSync(path.join(workflowsDir, 'w.md'), 'workflow bytes');
    fs.writeFileSync(path.join(harnessDir, 'evidence.json'), '{"initial":true}');

    const initialHarnessHash = hashDirectoryFiles(candidateRoot, 'scripts/generation/fixtures');
    const initialSnapshot = buildNarrowSnapshot(candidateRoot);

    // Mutate fixture file inside harness directory
    fs.writeFileSync(path.join(harnessDir, 'evidence.json'), '{"mutated":true}');
    const mutatedHarnessHash = hashDirectoryFiles(candidateRoot, 'scripts/generation/fixtures');
    const secondSnapshot = buildNarrowSnapshot(candidateRoot);

    // Harness provenance hash changes
    assert.notEqual(mutatedHarnessHash, initialHarnessHash);

    // Narrow snapshot tree bytes remain unchanged and exclude harness directory
    assert.equal(secondSnapshot.treeSha, initialSnapshot.treeSha);
    assert.equal(initialSnapshot.fileMap.has('scripts/generation/fixtures/evidence.json'), false);
    assert.equal(secondSnapshot.fileMap.has('scripts/generation/fixtures/evidence.json'), false);
  } finally {
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});

test('getCandidateCommitSha fails closed when git HEAD is unavailable', () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 't09-no-git-'));
  try {
    assert.throws(() => {
      getCandidateCommitSha(emptyDir);
    }, /does not have an available git HEAD commit SHA|Failed to resolve candidate commit SHA/);
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('startRegistryFixture deadline rejection stops a bind that arrives late', async () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-timeout-fixture-'));
  let testServer = null;
  let lateBindRequested = false;
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({ categories: {} }));
    const error = await startRegistryFixture(candidateRoot, {
      commitSha: '1111222233334444555566667777888899990000',
      timeoutMs: 20,
      bindHook: (srv) => {
        testServer = srv;
        setTimeout(() => {
          lateBindRequested = true;
          srv.listen(0, '127.0.0.1');
        }, 40);
      }
    }).then(() => {
      throw new Error('expected the bounded deadline to reject');
    }, (rejection) => rejection);
    assert.match(error.message, /listen timed out after 20ms/);
    const outcome = await error.cleanup;
    assert.ok(testServer);
    assert.equal(testServer.listening, false);
    assert.equal(testServer.address(), null);
    await waitUntil(() => lateBindRequested, 'late bind request');
    await waitUntil(() => testServer.listening === false, 'late bind teardown');
    assert.equal(testServer.listening, false, 'a late bind must not stay listening after rejection');
    assert.equal(testServer.address(), null);
    assert.equal(outcome.closed, true, 'cleanup state must reflect the actual late close');
    assert.equal(outcome.error, null);
  } finally {
    if (testServer?.listening) await new Promise((resolve) => testServer.close(resolve));
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});

test('startRegistryFixture rejects a real bind error and leaves no listening handle', async () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-bind-err-fixture-'));
  const blocker = http.createServer();
  await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  const occupiedPort = blocker.address().port;
  let testServer = null;
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({ categories: {} }));
    await assert.rejects(
      () => startRegistryFixture(candidateRoot, {
        commitSha: '1111222233334444555566667777888899990000',
        bindHook: (srv) => {
          testServer = srv;
          srv.listen(occupiedPort, '127.0.0.1');
        }
      }),
      /EADDRINUSE/
    );
    assert.ok(testServer);
    assert.equal(testServer.listening, false);
    assert.equal(testServer.address(), null);
  } finally {
    if (testServer?.listening) await new Promise((resolve) => testServer.close(resolve));
    await new Promise((resolve) => blocker.close(resolve));
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});

test('startRegistryFixture rejects a server closed before it starts listening', async () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-close-fixture-'));
  let testServer = null;
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({ categories: {} }));
    await assert.rejects(
      () => startRegistryFixture(candidateRoot, {
        commitSha: '1111222233334444555566667777888899990000',
        bindHook: (srv) => {
          testServer = srv;
          srv.close();
        }
      }),
      /closed before listening/
    );
    assert.ok(testServer);
    assert.equal(testServer.listening, false);
    assert.equal(testServer.address(), null);
  } finally {
    if (testServer?.listening) await new Promise((resolve) => testServer.close(resolve));
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});

test('startRegistryFixture serves once ready and releases its handle on close', async () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-listen-cleanup-'));
  let fixture = null;
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({ categories: {} }));
    fixture = await startRegistryFixture(candidateRoot, { commitSha: '1111222233334444555566667777888899990000' });
    assert.equal(fixture.server.listening, true);
    assert.ok(fixture.port > 0);
    assert.equal(fixture.server.address().port, fixture.port);
    await fixture.close();
    assert.equal(fixture.server.listening, false);
    assert.equal(fixture.server.address(), null);
  } finally {
    if (fixture?.server.listening) await fixture.close();
    fs.rmSync(candidateRoot, { recursive: true, force: true });
  }
});
