// scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { buildNarrowSnapshot, getAllowedRefs, startRegistryFixture, getCandidateCommitSha, hashDirectoryFiles } from './registry-fixture.mjs';

test('registry refs stay bound to frozen metadata bytes after candidate mutation', () => {
  const candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't09-ref-snapshot-'));
  try {
    fs.mkdirSync(path.join(candidateRoot, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({
      categories: { common: { tag_prefix: 'common-v', version: '1.2.3' } }
    }));
    const snapshot = buildNarrowSnapshot(candidateRoot);
    fs.writeFileSync(path.join(candidateRoot, 'skills/metadata.json'), JSON.stringify({
      categories: { common: { tag_prefix: 'common-v', version: '99.99.99' } }
    }));

    const refs = getAllowedRefs(snapshot, '1111222233334444555566667777888899990000');
    assert.equal(refs.has('common-v1.2.3'), true);
    assert.equal(refs.has('common-v99.99.99'), false);
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
    const harnessDir = path.join(candidateRoot, 'scripts/skill-tests/product-evidence-integration');
    const skillsDir = path.join(candidateRoot, 'skills/common/demo');
    const workflowsDir = path.join(candidateRoot, '.agents/workflows');
    fs.mkdirSync(harnessDir, { recursive: true });
    fs.mkdirSync(path.join(harnessDir, 'fixtures'), { recursive: true });
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.mkdirSync(workflowsDir, { recursive: true });

    fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), 'skill bytes');
    fs.writeFileSync(path.join(workflowsDir, 'test.md'), 'workflow bytes');
    fs.writeFileSync(path.join(harnessDir, 'fixtures/evidence.json'), '{"initial":true}');

    const initialHarnessHash = hashDirectoryFiles(candidateRoot, 'scripts/skill-tests/product-evidence-integration');
    const initialSnapshot = buildNarrowSnapshot(candidateRoot);

    // Mutate fixture file inside harness directory
    fs.writeFileSync(path.join(harnessDir, 'fixtures/evidence.json'), '{"mutated":true}');
    const mutatedHarnessHash = hashDirectoryFiles(candidateRoot, 'scripts/skill-tests/product-evidence-integration');
    const secondSnapshot = buildNarrowSnapshot(candidateRoot);

    // Harness provenance hash changes
    assert.notEqual(mutatedHarnessHash, initialHarnessHash);

    // Served registry bytes snapshot remains completely separate and identical
    assert.equal(secondSnapshot.treeSha, initialSnapshot.treeSha);
    assert.equal(initialSnapshot.fileMap.has('scripts/skill-tests/product-evidence-integration/fixtures/evidence.json'), false);
    assert.equal(secondSnapshot.fileMap.has('scripts/skill-tests/product-evidence-integration/fixtures/evidence.json'), false);
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
