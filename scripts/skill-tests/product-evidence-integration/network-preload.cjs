// scripts/skill-tests/product-evidence-integration/network-preload.cjs
// Request-level interception proxy for node:http, node:https, and globalThis.fetch.
// Note: Intercepts standard application HTTP/HTTPS/fetch requests only; does not provide
// a full OS/network sandbox or host-level kernel isolation (raw sockets/net remain unrestricted).
'use strict';
const http = require('node:http');
const https = require('node:https');

const FIXTURE_HOST = process.env.FIXTURE_HOST || '127.0.0.1';
const FIXTURE_PORT = process.env.FIXTURE_PORT ? parseInt(process.env.FIXTURE_PORT, 10) : null;
const APPROVED_OWNER = process.env.FIXTURE_OWNER || 'HoangNguyen0403';
const APPROVED_REPO = process.env.FIXTURE_REPO || 'agent-skills-standard';

const APPROVED_HOSTS = new Set(['api.github.com', 'raw.githubusercontent.com', 'github.com']);

const origHttpRequest = http.request;
const origHttpsRequest = https.request;
const origGlobalFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;

function stripCredentials(headers) {
  if (!headers) return {};
  const cleaned = {};
  if (Array.isArray(headers)) {
    for (let i = 0; i < headers.length; i += 2) {
      const k = String(headers[i]).toLowerCase();
      if (k === 'authorization' || k === 'token' || k === 'x-access-token' || k === 'x-github-token') {
        continue;
      }
      cleaned[headers[i]] = headers[i + 1];
    }
    return cleaned;
  }
  if (headers && typeof headers.forEach === 'function') {
    // Headers object
    headers.forEach((val, key) => {
      const lk = key.toLowerCase();
      if (lk !== 'authorization' && lk !== 'token' && lk !== 'x-access-token' && lk !== 'x-github-token') {
        cleaned[key] = val;
      }
    });
    return cleaned;
  }
  for (const [key, val] of Object.entries(headers)) {
    const lk = key.toLowerCase();
    if (lk === 'authorization' || lk === 'token' || lk === 'x-access-token' || lk === 'x-github-token') {
      continue;
    }
    cleaned[key] = val;
  }
  return cleaned;
}

function validateApprovedPath(host, pathname) {
  const p = pathname || '/';
  if (host === 'api.github.com') {
    const apiRegex = new RegExp(`^/repos/${APPROVED_OWNER}/${APPROVED_REPO}(?:/.*)?$`, 'i');
    return apiRegex.test(p);
  }
  if (host === 'raw.githubusercontent.com') {
    const rawRegex = new RegExp(`^/${APPROVED_OWNER}/${APPROVED_REPO}/.*$`, 'i');
    return rawRegex.test(p);
  }
  if (host === 'github.com') {
    const ghRegex = new RegExp(`^/${APPROVED_OWNER}/${APPROVED_REPO}/releases/.*$`, 'i');
    return ghRegex.test(p);
  }
  return false;
}

function normalizeOptions(args) {
  let opts = {};
  let cb;

  if (typeof args[0] === 'string') {
    const u = new URL(args[0]);
    u.username = '';
    u.password = '';
    opts = {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 443,
      path: u.pathname + u.search,
      headers: (typeof args[1] === 'object' && args[1] && args[1].headers) ? { ...args[1].headers } : {}
    };
    if (typeof args[1] === 'function') cb = args[1];
    else if (typeof args[2] === 'function') cb = args[2];
  } else if (args[0] instanceof URL) {
    const u = new URL(args[0].href);
    u.username = '';
    u.password = '';
    opts = {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 443,
      path: u.pathname + u.search,
      headers: (typeof args[1] === 'object' && args[1] && args[1].headers) ? { ...args[1].headers } : {}
    };
    if (typeof args[1] === 'function') cb = args[1];
    else if (typeof args[2] === 'function') cb = args[2];
  } else if (typeof args[0] === 'object' && args[0] !== null) {
    opts = { ...args[0] };
    if (typeof args[1] === 'function') cb = args[1];
  }

  return { opts, cb };
}

// Intercept HTTPS requests
https.request = function(...args) {
  const { opts, cb } = normalizeOptions(args);
  const host = opts.hostname || (opts.host ? opts.host.split(':')[0] : '');

  if (!APPROVED_HOSTS.has(host)) {
    throw new Error(`[network-preload] Denied external HTTPS egress: ${host} (path: ${opts.path})`);
  }

  const pathname = opts.path ? opts.path.split('?')[0] : '/';
  if (!validateApprovedPath(host, pathname)) {
    throw new Error(`[network-preload] Denied access to unapproved repository path: ${pathname} on ${host}`);
  }

  if (!FIXTURE_PORT) {
    throw new Error('[network-preload] FIXTURE_PORT is not configured');
  }

  const cleanedHeaders = stripCredentials(opts.headers);
  cleanedHeaders['x-original-host'] = host;
  cleanedHeaders['x-original-path'] = opts.path;

  // Crucial: remove agent to avoid TLS handshake against plain HTTP loopback
  const redirectedOpts = {
    ...opts,
    protocol: 'http:',
    hostname: FIXTURE_HOST,
    host: `${FIXTURE_HOST}:${FIXTURE_PORT}`,
    port: FIXTURE_PORT,
    headers: cleanedHeaders
  };
  delete redirectedOpts.agent;
  delete redirectedOpts.createConnection;

  return origHttpRequest(redirectedOpts, cb);
};

https.get = function(...args) {
  const req = https.request(...args);
  req.end();
  return req;
};

// Intercept HTTP requests: allow ONLY loopback fixture
http.request = function(...args) {
  const { opts, cb } = normalizeOptions(args);
  const host = opts.hostname || (opts.host ? opts.host.split(':')[0] : '');
  const port = opts.port ? parseInt(opts.port, 10) : 80;

  const isLoopback = (host === FIXTURE_HOST || host === '127.0.0.1' || host === 'localhost');
  const isFixturePort = FIXTURE_PORT && port === FIXTURE_PORT;

  if (isLoopback && isFixturePort) {
    return origHttpRequest(opts, cb);
  }

  throw new Error(`[network-preload] Denied external HTTP egress: ${host}:${port} (path: ${opts.path})`);
};

http.get = function(...args) {
  const req = http.request(...args);
  req.end();
  return req;
};

// The harness contract redirects node:https.request only. Fetch is denied for all
// non-loopback URLs so an unexpected transport cannot bypass the bounded fixture.
if (origGlobalFetch) {
  globalThis.fetch = async function(input) {
    let u;
    if (typeof input === 'string' || input instanceof URL) {
      u = new URL(input);
    } else if (input && typeof input.url === 'string') {
      u = new URL(input.url);
    } else {
      throw new Error('[network-preload] Unsupported fetch input');
    }
    const isLoopback = u.hostname === FIXTURE_HOST || u.hostname === '127.0.0.1' || u.hostname === 'localhost';
    const isFixturePort = FIXTURE_PORT && Number(u.port || (u.protocol === 'https:' ? 443 : 80)) === FIXTURE_PORT;
    if (u.protocol === 'http:' && isLoopback && isFixturePort) {
      return origGlobalFetch(input);
    }
    throw new Error(`[network-preload] Denied fetch transport: ${u.protocol}//${u.host}${u.pathname}`);
  };
}
