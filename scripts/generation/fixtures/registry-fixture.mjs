// scripts/generation/fixtures/registry-fixture.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export function gitBlobSha1(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const header = Buffer.from(`blob ${buf.byteLength}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, buf])).digest('hex');
}

/**
 * Builds an immutable, narrow snapshot containing ONLY approved candidate paths:
 * - skills/ (metadata.json, _INDEX.md, and all categories)
 * - .agents/workflows/*.md
 * Freezes actual file bytes into an in-memory Map. No live filesystem reads during request serving.
 */
export function buildNarrowSnapshot(candidateRoot) {
  const fileMap = new Map();
  const tree = [];

  function addFile(relPath, absPath) {
    if (!fs.existsSync(absPath) || !fs.lstatSync(absPath).isFile()) return;
    const buf = fs.readFileSync(absPath);
    const posixRel = relPath.split(path.sep).join('/');
    fileMap.set(posixRel, buf);
    tree.push({
      path: posixRel,
      mode: '100644',
      type: 'blob',
      sha: gitBlobSha1(buf),
      size: buf.byteLength
    });
  }

  function walkDir(dirRel) {
    const dirAbs = path.join(candidateRoot, dirRel);
    if (!fs.existsSync(dirAbs) || !fs.lstatSync(dirAbs).isDirectory()) return;
    const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const childRel = path.join(dirRel, entry.name);
      const childAbs = path.join(candidateRoot, childRel);
      if (entry.isDirectory()) {
        walkDir(childRel);
      } else if (entry.isFile()) {
        addFile(childRel, childAbs);
      }
    }
  }

  // Walk the approved skills tree; metadata and category indexes are served from
  // these frozen bytes exactly once.
  walkDir('skills');

  const workflowsDir = path.join(candidateRoot, '.agents/workflows');
  if (fs.existsSync(workflowsDir)) {
    const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        addFile(path.join('.agents/workflows', entry.name), path.join(workflowsDir, entry.name));
      }
    }
  }
  tree.sort((a, b) => a.path.localeCompare(b.path));
  const treeSha = crypto.createHash('sha256').update(JSON.stringify(tree)).digest('hex');

  return { fileMap, tree, treeSha };
}

/** Derive every allowed tag from the same frozen bytes served by the registry. */
export function getAllowedRefs(snapshot, commitSha) {
  const allowed = new Set([commitSha, 'main', 'HEAD', 'refs/heads/main']);
  const metadataBytes = snapshot.fileMap.get('skills/metadata.json');
  if (!metadataBytes) return allowed;
  try {
    const meta = JSON.parse(metadataBytes.toString('utf8'));
    for (const entry of [...Object.values(meta.categories ?? {}), ...Object.values(meta.releases ?? {})]) {
      if (typeof entry?.tag_prefix === 'string' && typeof entry?.version === 'string') {
        allowed.add(`${entry.tag_prefix}${entry.version}`);
      }
    }
  } catch {
    return allowed;
  }
  return allowed;
}

export function getCandidateCommitSha(candidateRoot) {
  let res;
  try {
    res = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: candidateRoot,
      encoding: 'utf8',
      timeout: 5000,
    });
  } catch (error) {
    throw new Error(`Failed to resolve candidate commit SHA from git HEAD: ${error.message}`);
  }
  if (res.status !== 0 || !res.stdout || !/^[a-f0-9]{40}$/i.test(res.stdout.trim())) {
    throw new Error(`Candidate root at ${candidateRoot} does not have an available git HEAD commit SHA (exit ${res.status}): ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim().toLowerCase();
}

export function hashDirectoryFiles(baseDir, dirRel = '.') {
  const dirAbs = path.resolve(baseDir, dirRel);
  if (!fs.existsSync(dirAbs) || !fs.lstatSync(dirAbs).isDirectory()) {
    throw new Error(`Required directory missing for provenance hashing: ${dirRel}`);
  }
  const hashes = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = path.relative(baseDir, full).split(path.sep).join('/');
        hashes.push(`${rel}:${crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')}`);
      }
    }
  }
  walk(dirAbs);
  if (hashes.length === 0) {
    throw new Error(`Required directory has no files for provenance hashing: ${dirRel}`);
  }
  return crypto.createHash('sha256').update(hashes.join('\n')).digest('hex');
}

export async function startRegistryFixture(candidateRoot, options = {}) {
  const owner = options.owner || 'HoangNguyen0403';
  const repo = options.repo || 'agent-skills-standard';
  const commitSha = options.commitSha || getCandidateCommitSha(candidateRoot);

  const snapshot = buildNarrowSnapshot(candidateRoot);
  const { fileMap, tree, treeSha } = snapshot;
  const allowedRefs = getAllowedRefs(snapshot, commitSha);
  const blobHashes = new Map(tree.map((entry) => [entry.path, entry.sha]));

  const requests = [];

  const server = options.server || http.createServer((req, res) => {
    const requestPath = req.url ?? '/';
    if (requestPath.includes('..') || /%2e|%2f|%5c|%00/i.test(requestPath) || /[\u0000-\u001f]/.test(requestPath)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Invalid request path');
    }

    const url = new URL(requestPath, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = url.pathname;
    const originalHost = req.headers['x-original-host'] || 'api.github.com';
    requests.push({ method: req.method, url: req.url, pathname, originalHost });

    if (Object.keys(req.headers).some((header) => /^(authorization|token|x-access-token|x-github-token)$/i.test(header))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Credentials are not accepted by the fixture');
    }

    if (pathname === `/repos/${owner}/${repo}`) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ name: repo, default_branch: 'main', owner: { login: owner } }));
    }

    const commitMatch = pathname.match(new RegExp(`^/repos/${owner}/${repo}/commits/([^/]+)$`));
    if (commitMatch) {
      const ref = decodeURIComponent(commitMatch[1]);
      if (!allowedRefs.has(ref)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end(`Unknown ref: ${ref}`);
      }
      if ((req.headers.accept ?? '').includes('application/vnd.github.sha')) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(commitSha);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ sha: commitSha, commit: { message: `Snapshot ${ref}` } }));
    }

    const treeMatch = pathname.match(new RegExp(`^/repos/${owner}/${repo}/git/trees/([^/]+)$`));
    if (treeMatch) {
      if (!allowedRefs.has(decodeURIComponent(treeMatch[1]))) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Unknown ref');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ sha: commitSha, tree, truncated: false }));
    }

    const rawMatch = pathname.match(new RegExp(`^/${owner}/${repo}/([^/]+)/(.+)$`));
    if (rawMatch) {
      const ref = decodeURIComponent(rawMatch[1]);
      if (!allowedRefs.has(ref)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end(`Unknown ref: ${ref}`);
      }
      const filePath = decodeURIComponent(rawMatch[2]);
      const bytes = fileMap.get(filePath);
      if (!bytes || gitBlobSha1(bytes) !== blobHashes.get(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File Not Found in Immutable Snapshot');
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': bytes.byteLength,
        ETag: `"${blobHashes.get(filePath)}"`
      });
      return res.end(bytes);
    }

    const releaseMatch = pathname.match(new RegExp(`^/${owner}/${repo}/releases/download/([^/]+)/MANIFEST\\.json$`));
    if (releaseMatch) {
      const tag = decodeURIComponent(releaseMatch[1]);
      if (!allowedRefs.has(tag)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Unknown release tag');
      }
      const manifest = fileMap.get('release/MANIFEST.json');
      if (!manifest) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Release manifest not found for snapshot');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(manifest);
    }

    if (pathname === `/repos/${owner}/${repo}/releases/latest`) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('No release metadata in immutable snapshot');
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  const timeoutMs = options.timeoutMs ?? 5000;
  const cleanupTimeoutMs = options.cleanupTimeoutMs ?? 1000;
  await new Promise((resolve, reject) => {
    let phase = 'starting';
    let timer = null;
    let cleanupBudget = null;
    let cleanupSettled = false;
    const cleanupOutcome = { closed: false, error: null, lateFailures: [] };
    let resolveCleanup;
    const cleanup = new Promise((done) => {
      resolveCleanup = done;
    });

    const settleCleanup = (closed, error) => {
      if (cleanupSettled) return;
      cleanupSettled = true;
      cleanupOutcome.closed = closed;
      cleanupOutcome.error = error;
      resolveCleanup(cleanupOutcome);
    };

    const reportLateFailure = (error) => {
      cleanupOutcome.lateFailures.push(error);
      if (typeof options.onCleanupFailure === 'function') options.onCleanupFailure(error);
    };

    const startFailure = (cause, detail) => {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (detail) error.message = `${error.message}; ${detail}`;
      error.cleanup = cleanup;
      return error;
    };

    const closeOwnedServer = () => new Promise((res) => {
      try {
        server.close((closeErr) => res(closeErr ?? null));
      } catch (syncCloseErr) {
        res(syncCloseErr);
      }
    });

    let lateReadinessObserved = false;
    const failAndTeardown = (cause) => {
      if (phase !== 'starting') return;
      phase = 'failed';
      clearTimeout(timer);
      cleanupBudget = setTimeout(() => {
        cleanupBudget = null;
        settleCleanup(false, new Error(`teardown did not complete within ${cleanupTimeoutMs}ms`));
        reject(startFailure(cause, `teardown incomplete after ${cleanupTimeoutMs}ms`));
      }, cleanupTimeoutMs);
      void closeOwnedServer().then((closeErr) => {
        if (cleanupBudget === null) return;
        clearTimeout(cleanupBudget);
        cleanupBudget = null;
        if (closeErr && closeErr.code !== 'ERR_SERVER_NOT_RUNNING') {
          settleCleanup(false, closeErr);
          reject(startFailure(cause, `teardown failure: ${closeErr.message}`));
          return;
        }
        settleCleanup(true, null);
        reject(startFailure(cause));
      });
    };

    const onError = (err) => {
      failAndTeardown(err);
    };

    const onClose = () => {
      if (phase === 'failed') {
        if (!lateReadinessObserved) return;
        cleanupOutcome.closed = true;
        cleanupOutcome.error = null;
        server.removeListener('listening', onListening);
        server.removeListener('error', onError);
        server.removeListener('close', onClose);
        return;
      }
      failAndTeardown(new Error('Registry fixture server closed before listening'));
    };

    const onListening = () => {
      if (phase === 'starting') {
        phase = 'ready';
        clearTimeout(timer);
        server.removeListener('error', onError);
        server.removeListener('close', onClose);
        server.removeListener('listening', onListening);
        resolve();
        return;
      }
      if (phase === 'failed') {
        lateReadinessObserved = true;
        cleanupOutcome.closed = false;
        cleanupOutcome.error = null;
        void closeOwnedServer().then((closeErr) => {
          if (closeErr && closeErr.code !== 'ERR_SERVER_NOT_RUNNING') {
            cleanupOutcome.error = closeErr;
            reportLateFailure(closeErr);
            return;
          }
          cleanupOutcome.closed = true;
          cleanupOutcome.error = null;
          server.removeListener('listening', onListening);
          server.removeListener('error', onError);
          server.removeListener('close', onClose);
        });
      }
    };

    server.on('error', onError);
    server.on('close', onClose);
    server.once('listening', onListening);

    timer = setTimeout(() => {
      failAndTeardown(new Error(`Registry fixture listen timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      if (typeof options.bindHook === 'function') {
        options.bindHook(server);
      } else {
        server.listen(0, '127.0.0.1');
      }
    } catch (listenError) {
      failAndTeardown(listenError);
    }
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return {
    server, port, owner, repo, commitSha, treeSha, tree, fileMap, allowedRefs, requests,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}
