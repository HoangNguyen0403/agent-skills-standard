'use strict';

// Sync-smoke network preload.
//
// Loaded with `node --require` in the child that runs the real built CLI. It
// remaps the GitHub hosts the CLI talks to onto one loopback fixture origin at
// the Node transport boundary (http/https request APIs, the cross-fetch /
// node-fetch layer used by the bundle) and denies unknown HTTP destinations,
// DNS resolvers, and direct net/tls sockets. It never imports application
// modules, never injects services, and never adds credentials.
//
// This is a test confinement layer for the transports it actually patches. It
// is NOT a hostile-code sandbox: out-of-process helpers, raw syscalls, or
// transports added after this list are outside its control boundary.
//
// Contract with the runner:
//   SYNC_SMOKE_ORIGIN     http://127.0.0.1:<port> of the fixture server
//   SYNC_SMOKE_DENY_LOG   per-invocation event file (required)
//   SYNC_SMOKE_HOSTS      optional comma-separated allowlist override
//
// Every event is written synchronously through one file descriptor. Log open or
// write failure throws, failing the child closed instead of silently dropping
// evidence. The first event is `preload-ready`; the runner requires it.

const http = require('node:http');
const https = require('node:https');
const http2 = require('node:http2');
const net = require('node:net');
const tls = require('node:tls');
const dns = require('node:dns');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');
const { URL } = require('node:url');

const ORIGIN = process.env.SYNC_SMOKE_ORIGIN;
if (!ORIGIN) {
  throw new Error('sync-smoke preload: SYNC_SMOKE_ORIGIN is required');
}
const DENY_LOG = process.env.SYNC_SMOKE_DENY_LOG;
if (!DENY_LOG) {
  throw new Error('sync-smoke preload: SYNC_SMOKE_DENY_LOG is required');
}

const originUrl = new URL(ORIGIN);
const LOOPBACK_HOST = originUrl.hostname.toLowerCase();
const LOOPBACK_PORT = originUrl.port || '80';
const ALLOWED_HOSTS = new Set(
  (process.env.SYNC_SMOKE_HOSTS ||
    'api.github.com,raw.githubusercontent.com,github.com')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
);
const API_HOST = 'api.github.com';

const LOG_FD = fs.openSync(DENY_LOG, 'a');

function logEvent(event) {
  const line = `${JSON.stringify({ ...event, at: Date.now() })}\n`;
  fs.writeSync(LOG_FD, line);
}

function isAllowedHost(hostname) {
  return ALLOWED_HOSTS.has(String(hostname).toLowerCase());
}

function isLoopbackTarget(hostname, port) {
  return (
    String(hostname).toLowerCase() === LOOPBACK_HOST &&
    String(port ?? LOOPBACK_PORT) === LOOPBACK_PORT
  );
}

function denialError(hostname, kind) {
  const error = new Error(
    `sync-smoke: denied ${kind} destination ${hostname}`,
  );
  error.code = 'ESYNCSMOKEDENIED';
  return error;
}

function deny(hostname, kind, extra = {}) {
  logEvent({ event: 'denied', host: hostname, kind, ...extra });
  return denialError(hostname, kind);
}

class DeniedRequest extends EventEmitter {
  constructor(hostname, kind) {
    super();
    this.destination = hostname;
    this.aborted = false;
    const error = deny(hostname, kind);
    process.nextTick(() => {
      if (this.aborted) return;
      this.emit('error', error);
    });
  }
  setHeader() {}
  getHeader() {}
  removeHeader() {}
  flushHeaders() {}
  write() {
    return true;
  }
  end() {
    return this;
  }
  abort() {
    this.aborted = true;
  }
  destroy() {
    this.aborted = true;
    return this;
  }
  setTimeout() {
    return this;
  }
}

function lowerCaseHeaders(headers) {
  const out = {};
  if (!headers) return out;
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    out[key.toLowerCase()] = value;
  }
  return out;
}

function splitRequestArgs(defaultProtocol, input, options, callback) {
  let url = null;
  let opts;
  let cb = callback;
  if (typeof input === 'string' || input instanceof URL) {
    url = new URL(String(input));
    if (typeof options === 'function') {
      cb = options;
      opts = {};
    } else {
      opts = { ...(options || {}) };
    }
  } else {
    opts = { ...(input || {}) };
    if (typeof options === 'function') cb = options;
  }
  const protocol = opts.protocol || url?.protocol || defaultProtocol;
  const hostname = (
    url?.hostname ||
    opts.hostname ||
    String(opts.host ?? '').split(':')[0] ||
    'localhost'
  ).toLowerCase();
  const port = String(
    url?.port || opts.port || (protocol === 'https:' ? '443' : '80'),
  );
  const requestPath = url ? `${url.pathname}${url.search}` : opts.path || '/';
  return { opts, cb, hostname, port, path: requestPath };
}

// Captured before patching so both modules can be redirected to the plain
// HTTP transport that serves the fixture; https.request rejects `http:` URLs.
const httpRequestOriginal = http.request.bind(http);

function patchHttpTransport(mod, defaultProtocol) {
  function request(input, options, callback) {
    const { opts, cb, hostname, port, path: requestPath } = splitRequestArgs(
      defaultProtocol,
      input,
      options,
      callback,
    );

    if (isLoopbackTarget(hostname, port)) {
      return httpRequestOriginal(input, options, callback);
    }
    if (!isAllowedHost(hostname)) {
      return new DeniedRequest(hostname, 'http host allowlist');
    }

    const headers = lowerCaseHeaders(opts.headers);
    if (hostname !== API_HOST) {
      for (const header of ['authorization', 'cookie']) {
        if (headers[header] === undefined) continue;
        logEvent({ event: 'credential-forward', host: hostname, header });
      }
      // Evidence is recorded above; never let a credential reach an asset host.
      delete headers.authorization;
      delete headers.cookie;
    }

    headers.host = hostname;
    headers['x-sync-smoke-host'] = hostname;

    return httpRequestOriginal(
      {
        method: opts.method || 'GET',
        path: requestPath,
        headers,
        hostname: LOOPBACK_HOST,
        port: Number(LOOPBACK_PORT),
        protocol: 'http:',
        setHost: false,
      },
      cb,
    );
  }

  function get(input, options, callback) {
    const req = request(input, options, callback);
    if (typeof req.end === 'function') req.end();
    return req;
  }

  mod.request = request;
  mod.get = get;
}

patchHttpTransport(http, 'http:');
patchHttpTransport(https, 'https:');

// ---------------------------------------------------------------------------
// DNS
// ---------------------------------------------------------------------------

function callbackError(callback, hostname, kind) {
  const error = deny(hostname, kind);
  process.nextTick(() => {
    if (typeof callback === 'function') callback(error);
  });
}

function synthesizeLookup(hostname, options, callback) {
  const all = Boolean(options && options.all);
  process.nextTick(() => {
    if (typeof callback !== 'function') return;
    if (all) {
      callback(null, [{ address: LOOPBACK_HOST, family: 4 }]);
    } else {
      callback(null, LOOPBACK_HOST, 4);
    }
  });
}

dns.lookup = function lookup(hostname, options, callback) {
  let optionsArg = options;
  let callbackFn = callback;
  if (typeof options === 'function') {
    callbackFn = options;
    optionsArg = {};
  }
  const host = String(hostname ?? '').toLowerCase();
  if (isAllowedHost(host) || isLoopbackTarget(host, LOOPBACK_PORT)) {
    return synthesizeLookup(host, optionsArg, callbackFn);
  }
  callbackError(callbackFn, host, 'dns.lookup');
  return {};
};

dns.promises.lookup = async function lookup(hostname) {
  const host = String(hostname ?? '').toLowerCase();
  if (isAllowedHost(host) || isLoopbackTarget(host, LOOPBACK_PORT)) {
    return { address: LOOPBACK_HOST, family: 4 };
  }
  throw deny(host, 'dns.promises.lookup');
};

const DENIED_DNS_FUNCTIONS = Object.keys(dns).filter(
  (name) =>
    typeof dns[name] === 'function' &&
    (name === 'reverse' || name.startsWith('resolve')),
);
for (const name of DENIED_DNS_FUNCTIONS) {
  dns[name] = function deniedDnsFunction(hostname, ...rest) {
    const host = String(hostname ?? '').toLowerCase();
    const callback = rest.find((item) => typeof item === 'function');
    callbackError(callback, host, `dns.${name}`);
  };
}

// The promise API is a separate set of exported functions in Node; patching
// only the callback functions would leave a real ambient resolver reachable.
if (dns.promises) {
  for (const name of DENIED_DNS_FUNCTIONS) {
    if (typeof dns.promises[name] !== 'function') continue;
    dns.promises[name] = async function deniedPromiseDnsFunction(hostname) {
      throw deny(String(hostname ?? '').toLowerCase(), `dns.promises.${name}`);
    };
  }
}

const RESOLVER_METHODS = [
  'resolve',
  'resolve4',
  'resolve6',
  'resolveAny',
  'resolveCaa',
  'resolveCname',
  'resolveMx',
  'resolveNaptr',
  'resolveNs',
  'resolvePtr',
  'resolveSoa',
  'resolveSrv',
  'resolveTxt',
  'reverse',
];

class DeniedResolver {
  constructor() {
    this._servers = [];
  }
  getServers() {
    return [];
  }
  setServers() {}
  cancel() {}
}
for (const method of RESOLVER_METHODS) {
  DeniedResolver.prototype[method] = function deniedResolverMethod(
    hostname,
    ...rest
  ) {
    const callback = rest.find((item) => typeof item === 'function');
    callbackError(callback, String(hostname ?? '').toLowerCase(), `dns.Resolver.${method}`);
  };
}
dns.Resolver = DeniedResolver;

class DeniedPromisesResolver {
  constructor() {
    this._servers = [];
  }
  getServers() {
    return [];
  }
  setServers() {}
  cancel() {}
}
for (const method of RESOLVER_METHODS) {
  DeniedPromisesResolver.prototype[method] = async function deniedPromiseMethod(
    hostname,
  ) {
    throw deny(String(hostname ?? '').toLowerCase(), `dns.promises.Resolver.${method}`);
  };
}
if (dns.promises) dns.promises.Resolver = DeniedPromisesResolver;

// ---------------------------------------------------------------------------
// Direct net/tls sockets
// ---------------------------------------------------------------------------

function safeString(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

/**
 * Normalizes net/tls connect overloads without coercing arbitrary objects to
 * primitives: Node's agent can pass array-like argument shapes here, and
 * `String(unknownObject)` throws instead of producing a host to deny.
 */
function socketTarget(args) {
  let first = args[0];
  if (Array.isArray(first)) {
    first = first[0] ?? 'unsupported-array-target';
  }
  if (first && typeof first === 'object') {
    const pathValue = safeString(first.path);
    if (pathValue !== null) return { kind: 'path', hostname: pathValue };
    const host =
      safeString(first.host) ?? safeString(first.hostname) ?? 'localhost';
    const port = safeString(first.port) ?? first.port;
    return { kind: 'host', hostname: host.toLowerCase(), port };
  }
  if (typeof first === 'number') {
    const host = safeString(args[1]) ?? 'localhost';
    return { kind: 'host', hostname: host.toLowerCase(), port: first };
  }
  const firstString = safeString(first);
  if (firstString !== null && /^\d+$/.test(firstString)) {
    const host = safeString(args[1]) ?? 'localhost';
    return { kind: 'host', hostname: host.toLowerCase(), port: firstString };
  }
  if (firstString !== null) {
    return { kind: 'path', hostname: firstString };
  }
  return { kind: 'host', hostname: 'unsupported-connect-target', port: undefined };
}

const originalSocketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connect(...args) {
  const target = socketTarget(args);
  if (
    target.kind === 'host' &&
    isLoopbackTarget(target.hostname, target.port ?? LOOPBACK_PORT)
  ) {
    return originalSocketConnect.apply(this, args);
  }
  const error = deny(target.hostname, `net.${target.kind}`);
  process.nextTick(() => this.destroy(error));
  return this;
};

for (const name of ['connect', 'createConnection']) {
  if (typeof tls[name] !== 'function') continue;
  const original = tls[name].bind(tls);
  tls[name] = function deniedAwareTlsConnect(...args) {
    const target = socketTarget(args);
    if (
      target.kind === 'host' &&
      isLoopbackTarget(target.hostname, target.port ?? LOOPBACK_PORT)
    ) {
      return original(...args);
    }
    const socket = new net.Socket();
    const error = deny(target.hostname, `tls.${name}`);
    process.nextTick(() => socket.destroy(error));
    return socket;
  };
}

if (http2 && typeof http2.connect === 'function') {
  const originalHttp2Connect = http2.connect.bind(http2);
  http2.connect = function deniedAwareHttp2Connect(authority, ...rest) {
    let hostname = 'localhost';
    let port;
    try {
      const parsed = new URL(String(authority));
      hostname = parsed.hostname.toLowerCase();
      port = parsed.port;
    } catch {
      // Fall through to denial with the raw authority.
      hostname = String(authority);
    }
    if (isLoopbackTarget(hostname, port)) {
      return originalHttp2Connect(authority, ...rest);
    }
    const emitted = new EventEmitter();
    const error = deny(hostname, 'http2.connect');
    process.nextTick(() => emitted.emit('error', error));
    emitted.close = () => {};
    emitted.destroy = () => {};
    return emitted;
  };
}

// ---------------------------------------------------------------------------
// Platform fetch
// ---------------------------------------------------------------------------

if (typeof globalThis.fetch === 'function') {
  globalThis.fetch = async function syncSmokeFetch(input, init = {}) {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input?.url ?? input);
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new TypeError(`sync-smoke: invalid fetch URL ${rawUrl}`);
    }
    const hostname = url.hostname.toLowerCase();
    if (!isAllowedHost(hostname)) {
      throw deny(hostname, 'global fetch');
    }
    const headers = lowerCaseHeaders(
      typeof Headers !== 'undefined' && init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : init.headers,
    );
    if (hostname !== API_HOST) {
      for (const header of ['authorization', 'cookie']) {
        if (headers[header] === undefined) continue;
        logEvent({ event: 'credential-forward', host: hostname, header });
      }
      delete headers.authorization;
      delete headers.cookie;
    }
    const body =
      init.body === undefined
        ? null
        : Buffer.isBuffer(init.body)
          ? init.body
          : Buffer.from(String(init.body), 'utf8');
    headers['x-sync-smoke-host'] = hostname;

    return await new Promise((resolve, reject) => {
      const req = httpRequestOriginal(
        {
          hostname: LOOPBACK_HOST,
          port: Number(LOOPBACK_PORT),
          path: `${url.pathname}${url.search}`,
          method: init.method || 'GET',
          headers: { ...headers, host: hostname },
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const responseHeaders = new Map(
              Object.entries(res.headers).map(([key, value]) => [
                key.toLowerCase(),
                String(value ?? ''),
              ]),
            );
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage || '',
              url: rawUrl,
              headers: {
                get: (name) => responseHeaders.get(name.toLowerCase()) ?? null,
                has: (name) => responseHeaders.has(name.toLowerCase()),
                forEach: (fn) => responseHeaders.forEach((value, key) => fn(value, key)),
                entries: () => responseHeaders.entries(),
              },
              text: async () => buffer.toString('utf8'),
              json: async () => JSON.parse(buffer.toString('utf8')),
              arrayBuffer: async () =>
                buffer.buffer.slice(
                  buffer.byteOffset,
                  buffer.byteOffset + buffer.byteLength,
                ),
            });
          });
        },
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  };
}

logEvent({
  event: 'preload-ready',
  origin: ORIGIN,
  allowlist: [...ALLOWED_HOSTS],
  boundary: [
    'http.request',
    'https.request',
    'dns.lookup',
    'dns.promises.lookup',
    'dns.resolve*',
    'dns.Resolver',
    'net.Socket.connect',
    'tls.connect',
    'http2.connect',
    'globalThis.fetch',
  ],
});
