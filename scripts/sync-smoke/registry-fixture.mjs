// Loopback GitHub registry fixture for the S7 built-CLI sync qualification.
//
// This module owns the fake GitHub surface only: commits, Git trees with real
// blob SHA-1 identities, raw bytes, release MANIFEST.json assets, ETags/304,
// injectable GitHub failures, and a request log. It never imports application
// source and never talks to the network.
//
// Node standard library only.

import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';

export const FIXTURE_HOSTS = Object.freeze({
  api: 'api.github.com',
  raw: 'raw.githubusercontent.com',
  web: 'github.com',
});

const ROOT_ATTRIBUTION_RE = /^(?:LICENSE|NOTICE)(?:\.(?:md|txt))?$/i;

export function gitBlobSha1(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const header = Buffer.from(`blob ${buf.byteLength}\0`, 'utf8');
  return createHash('sha1').update(header).update(buf).digest('hex');
}

export function sha256(content) {
  return createHash('sha256')
    .update(Buffer.isBuffer(content) ? content : Buffer.from(content))
    .digest('hex');
}

function sha1(content) {
  return createHash('sha1')
    .update(Buffer.isBuffer(content) ? content : Buffer.from(content))
    .digest('hex');
}

/**
 * Computes real Git object ids for the fixture tree: blob SHA-1 with the
 * `blob <size>\0` header, and tree SHA-1 over `<mode> <name>\0<raw hash>`
 * entries in Git's ordering (directories sort as `name/`).
 */
function buildTree(files, { owner, repo, baseUrl }) {
  const root = { dirs: new Map(), blobs: new Map() };
  for (const [filePath, content] of files) {
    const parts = filePath.split('/');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let child = node.dirs.get(part);
      if (!child) {
        child = { dirs: new Map(), blobs: new Map() };
        node.dirs.set(part, child);
      }
      node = child;
    }
    node.blobs.set(parts[parts.length - 1], content);
  }

  const items = [];
  const sha = hashDir(root, '');
  return { sha, tree: items };

  function hashDir(node, prefix) {
    const entries = [];
    for (const [name, blob] of node.blobs) {
      const blobSha = gitBlobSha1(blob);
      const path = prefix ? `${prefix}/${name}` : name;
      items.push({
        path,
        mode: '100644',
        type: 'blob',
        sha: blobSha,
        size: blob.byteLength,
        url: `${baseUrl}/repos/${owner}/${repo}/git/blobs/${blobSha}`,
      });
      entries.push({ sort: name, name, mode: '100644', sha: Buffer.from(blobSha, 'hex') });
    }
    for (const [name, child] of node.dirs) {
      const childSha = hashDir(child, prefix ? `${prefix}/${name}` : name);
      const path = prefix ? `${prefix}/${name}` : name;
      items.push({
        path,
        mode: '040000',
        type: 'tree',
        sha: childSha,
        url: `${baseUrl}/repos/${owner}/${repo}/git/trees/${childSha}`,
      });
      entries.push({
        sort: `${name}/`,
        name,
        mode: '40000',
        sha: Buffer.from(childSha, 'hex'),
      });
    }
    // GitHub returns tree entries sorted by path; Git hashes with `name/` for
    // directories and the mode written without a leading zero.
    items.sort((left, right) => left.path.localeCompare(right.path));
    entries.sort((left, right) =>
      Buffer.compare(Buffer.from(left.sort), Buffer.from(right.sort)),
    );
    const payload = Buffer.concat(
      entries.map((entry) =>
        Buffer.concat([
          Buffer.from(`${entry.mode} ${entry.name}\0`, 'utf8'),
          entry.sha,
        ]),
      ),
    );
    const header = Buffer.from(`tree ${payload.byteLength}\0`, 'utf8');
    return createHash('sha1').update(header).update(payload).digest('hex');
  }
}

/**
 * An in-memory mutable registry. Every mutation is explicit so a scenario can
 * describe "publish 1.0.1", "mutate served bytes after the manifest was
 * published", or "main now advertises a newer version".
 */
export class RegistryFixture {
  constructor({ owner = 'fixture-owner', repo = 'demo-registry', defaultBranch = 'main' } = {}) {
    this.owner = owner;
    this.repo = repo;
    this.defaultBranch = defaultBranch;
    this.commits = new Map();
    this.refs = new Map();
    this.releases = new Map();
    this.servedOverrides = new Map();
    this.treeCache = new Map();
    this.faults = [];
    this.requests = [];
    this.server = null;
    this.origin = null;
    this.startedAt = null;
  }

  /** Registers a commit from a path->string|Buffer map. Returns its SHA. */
  addCommit(files) {
    const normalized = new Map();
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.startsWith('/') || filePath.includes('\\')) {
        throw new Error(`fixture: unsafe commit path ${filePath}`);
      }
      normalized.set(filePath, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
    }
    // Deterministic commit identity from the honest file map.
    const digestInput = [...normalized.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([filePath, content]) => `${filePath}\0${gitBlobSha1(content)}`)
      .join('\n');
    let sha = sha1(digestInput);
    while (this.commits.has(sha)) sha = sha1(`${sha}\n${randomBytes(8).toString('hex')}`);
    this.commits.set(sha, { files: normalized });
    return sha;
  }

  setRef(name, commitSha) {
    if (!this.commits.has(commitSha)) {
      throw new Error(`fixture: unknown commit ${commitSha}`);
    }
    this.refs.set(name, commitSha);
  }

  /**
   * Publishes an honest schema-1 manifest for a tag. The manifest is computed
   * from the commit's real bytes at publish time; later byte mutation via
   * `mutateServedBytes` intentionally leaves this manifest stale, which is the
   * tamper oracle (never generated from a tampered candidate).
   */
  addRelease(tag, commitSha) {
    const commit = this.commits.get(commitSha);
    if (!commit) throw new Error(`fixture: unknown commit ${commitSha}`);
    const files = {};
    for (const [filePath, content] of [...commit.files.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      if (!filePath.includes('/') && ROOT_ATTRIBUTION_RE.test(filePath)) continue;
      files[filePath] = sha256(content);
    }
    this.releases.set(tag, {
      schema_version: 1,
      tag,
      commit: commitSha,
      files,
    });
    // GitHub resolves tags to their commit through the same ref namespace.
    this.refs.set(tag, commitSha);
    return this.releases.get(tag);
  }

  /** Replaces served bytes for a commit/path without touching the manifest. */
  mutateServedBytes(commitSha, filePath, content) {
    if (!this.commits.has(commitSha)) {
      throw new Error(`fixture: unknown commit ${commitSha}`);
    }
    let commitOverrides = this.servedOverrides.get(commitSha);
    if (!commitOverrides) {
      commitOverrides = new Map();
      this.servedOverrides.set(commitSha, commitOverrides);
    }
    commitOverrides.set(filePath, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
  }

  resetServedBytes(commitSha) {
    this.servedOverrides.delete(commitSha);
  }

  /** Injects an HTTP fault. `times` defaults to unbounded. */
  injectFault(fault) {
    this.faults.push({
      host: fault.host,
      method: fault.method ?? 'GET',
      path: fault.path,
      status: fault.status ?? 500,
      headers: fault.headers ?? {},
      body: fault.body,
      reset: fault.reset === true,
      times: Number.isFinite(fault.times) ? fault.times : Infinity,
      id: this.faults.length + 1,
      hits: 0,
    });
  }

  clearFaults() {
    this.faults = [];
  }

  fileAt(refOrCommit, filePath) {
    const commitSha = this.resolveRef(refOrCommit);
    const commit = this.commits.get(commitSha);
    if (!commit) return null;
    const overrides = this.servedOverrides.get(commitSha);
    if (overrides?.has(filePath)) return overrides.get(filePath);
    return commit.files.get(filePath) ?? null;
  }

  resolveRef(refOrCommit) {
    if (this.commits.has(refOrCommit)) return refOrCommit;
    return this.refs.get(refOrCommit) ?? null;
  }

  manifest(tag) {
    return this.releases.get(tag) ?? null;
  }

  requestsSince(index) {
    return this.requests.slice(index);
  }

  /**
   * Real Git tree identity for a commit: recursively hashed `mode name\0<hash>`
   * entries. Served bytes may be mutated after publication, but the tree/commit
   * identity stays the honest one published to the release manifest.
   */
  treeFor(commitSha) {
    const cached = this.treeCache.get(commitSha);
    if (cached) return cached;
    const commit = this.commits.get(commitSha);
    if (!commit) throw new Error(`fixture: unknown commit ${commitSha}`);
    const built = buildTree(commit.files, {
      owner: this.owner,
      repo: this.repo,
      baseUrl: `https://${FIXTURE_HOSTS.api}`,
    });
    this.treeCache.set(commitSha, built);
    return built;
  }

  treeShaFor(commitSha) {
    return this.treeFor(commitSha).sha;
  }

  commitForTreeSha(treeSha) {
    for (const commitSha of this.commits.keys()) {
      if (this.treeFor(commitSha).sha === treeSha) return commitSha;
    }
    return null;
  }

  async start() {
    if (this.server) throw new Error('fixture: already started');
    this.server = http.createServer((req, res) => this.#handle(req, res));
    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(0, '127.0.0.1', resolve);
    });
    const address = this.server.address();
    this.origin = `http://127.0.0.1:${address.port}`;
    this.startedAt = Date.now();
    return this.origin;
  }

  async stop() {
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections?.();
    });
  }

  #record(req, host, url, status, extra = {}) {
    const auth = req.headers.authorization;
    this.requests.push({
      seq: this.requests.length + 1,
      at: Date.now(),
      host,
      method: req.method,
      path: url.pathname,
      query: url.search,
      status,
      faulted: Boolean(extra.faulted),
      authPresent: Boolean(auth),
      ...extra,
    });
  }

  #matchFault(host, method, pathAndQuery) {
    for (const fault of this.faults) {
      if (fault.times <= 0) continue;
      if (fault.host && fault.host !== host) continue;
      if (fault.method && fault.method !== method) continue;
      if (fault.path instanceof RegExp) {
        if (!fault.path.test(pathAndQuery)) continue;
      } else if (typeof fault.path === 'string' && fault.path !== pathAndQuery) {
        continue;
      }
      fault.times -= 1;
      fault.hits += 1;
      return fault;
    }
    return null;
  }

  #handle(req, res) {
    const url = new URL(req.url ?? '/', this.origin ?? 'http://127.0.0.1');
    const host =
      req.headers['x-sync-smoke-host'] ?? FIXTURE_HOSTS.api;
    const pathAndQuery = `${url.pathname}${url.search}`;

    const fault = this.#matchFault(host, req.method ?? 'GET', pathAndQuery);
    if (fault) {
      this.#record(req, host, url, fault.status, {
        faulted: true,
        faultId: fault.id,
      });
      if (fault.reset) {
        req.socket.destroy();
        return;
      }
      const body =
        typeof fault.body === 'function'
          ? fault.body({ host, path: url.pathname, query: url.search })
          : fault.body;
      const payload =
        body === undefined
          ? JSON.stringify({ message: 'fixture injected failure' })
          : Buffer.isBuffer(body)
            ? body
            : Buffer.from(String(body), 'utf8');
      res.writeHead(fault.status, {
        'content-type': 'application/json',
        'content-length': payload.byteLength,
        ...fault.headers,
      });
      res.end(payload);
      return;
    }

    let pack;
    try {
      pack = this.#route(host, req.method ?? 'GET', url);
    } catch (error) {
      this.#record(req, host, url, 500);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: `fixture error: ${error.message}` }));
      return;
    }
    if (!pack) {
      const notFound = JSON.stringify({ message: 'Not Found' });
      this.#record(req, host, url, 404);
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(notFound);
      return;
    }

    const body = pack.body;
    const etag = `"${sha256(body).slice(0, 32)}"`;
    const conditional = typeof req.headers['if-none-match'] === 'string';
    const notModified =
      (req.method === 'GET' || req.method === 'HEAD') &&
      req.headers['if-none-match'] === etag;
    this.#record(req, host, url, notModified ? 304 : pack.status ?? 200, {
      route: pack.route,
      conditional,
      notModified,
      ...(pack.log ?? {}),
    });

    if (notModified) {
      res.writeHead(304, { etag });
      res.end();
      return;
    }
    res.writeHead(pack.status ?? 200, {
      'content-type': pack.contentType ?? 'application/json',
      'content-length': body.byteLength,
      etag,
      ...(pack.headers ?? {}),
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(body);
  }

  #route(host, method, url) {
    if (method !== 'GET' && method !== 'HEAD') return null;
    const segments = url.pathname
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => decodeURIComponent(segment));

    if (host === FIXTURE_HOSTS.api) return this.#routeApi(segments);
    if (host === FIXTURE_HOSTS.raw) return this.#routeRaw(segments);
    if (host === FIXTURE_HOSTS.web) return this.#routeWeb(segments);
    return null;
  }

  #routeApi(segments) {
    // /repos/{owner}/{repo}[/...]
    if (segments[0] !== 'repos' || segments[1] !== this.owner || segments[2] !== this.repo) {
      return null;
    }
    const rest = segments.slice(3);
    if (rest.length === 0) {
      return json({
        route: 'repo-info',
        full_name: `${this.owner}/${this.repo}`,
        default_branch: this.defaultBranch,
        private: false,
        visibility: 'public',
      });
    }
    if (rest[0] === 'commits' && rest.length === 2) {
      const commitSha = this.resolveRef(rest[1]);
      if (!commitSha) return null;
      return {
        route: 'commit',
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: Buffer.from(commitSha, 'utf8'),
      };
    }
    if (rest[0] === 'git' && rest[1] === 'trees' && rest.length === 3) {
      const commitSha = this.resolveRef(rest[2]) ?? this.commitForTreeSha(rest[2]);
      if (!commitSha) return null;
      const { sha, tree } = this.treeFor(commitSha);
      return json({
        route: 'tree',
        sha,
        url: `https://${FIXTURE_HOSTS.api}/repos/${this.owner}/${this.repo}/git/trees/${sha}`,
        tree,
        truncated: false,
      });
    }
    if (rest[0] === 'git' && rest[1] === 'commits' && rest.length === 3) {
      const commitSha = this.resolveRef(rest[2]);
      if (!commitSha) return null;
      const { sha: treeSha } = this.treeFor(commitSha);
      return json({
        route: 'git-commit',
        sha: commitSha,
        node_id: `fixture-commit-${commitSha.slice(0, 12)}`,
        message: `fixture commit ${commitSha.slice(0, 7)}`,
        url: `https://${FIXTURE_HOSTS.api}/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`,
        tree: {
          sha: treeSha,
          url: `https://${FIXTURE_HOSTS.api}/repos/${this.owner}/${this.repo}/git/trees/${treeSha}`,
        },
        parents: [],
        author: { name: 'Fixture Author', email: 'fixture@example.invalid' },
        committer: { name: 'Fixture Author', email: 'fixture@example.invalid' },
      });
    }
    if (rest[0] === 'releases' && rest[1] === 'latest') {
      const tags = [...this.releases.keys()].filter((tag) => tag.startsWith('demo-'));
      if (tags.length === 0) return null;
      tags.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
      return json({ route: 'release-latest', tag_name: tags[tags.length - 1] });
    }
    if (rest[0] === 'git' && rest[1] === 'blobs' && rest.length === 3) {
      const wanted = rest[2];
      for (const commit of this.commits.values()) {
        for (const [filePath, content] of commit.files) {
          if (gitBlobSha1(content) === wanted) {
            return {
              route: 'blob',
              status: 200,
              contentType: 'text/plain; charset=utf-8',
              body: content,
            };
          }
        }
      }
      return null;
    }
    return null;
  }

  #routeRaw(segments) {
    // /{owner}/{repo}/{ref}/{path...}
    if (segments[0] !== this.owner || segments[1] !== this.repo || segments.length < 4) {
      return null;
    }
    const ref = segments[2];
    const filePath = segments.slice(3).join('/');
    const content = this.fileAt(ref, filePath);
    if (!content) return null;
    return {
      route: 'raw',
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: content,
      log: { servedSha256: sha256(content) },
    };
  }

  #routeWeb(segments) {
    // /{owner}/{repo}/releases/download/{tag}/MANIFEST.json
    if (
      segments[0] !== this.owner ||
      segments[1] !== this.repo ||
      segments[2] !== 'releases' ||
      segments[3] !== 'download' ||
      segments.length !== 6 ||
      segments[5] !== 'MANIFEST.json'
    ) {
      return null;
    }
    const tag = segments[4];
    const manifest = this.manifest(tag);
    if (!manifest) return null;
    return json({ route: 'manifest', ...manifest });
  }
}

function json(value) {
  return {
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'),
  };
}
