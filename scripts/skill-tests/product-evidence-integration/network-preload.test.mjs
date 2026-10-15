// scripts/skill-tests/product-evidence-integration/network-preload.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRELOAD_SCRIPT = path.join(__dirname, 'network-preload.cjs');

test('network-preload isolated proxy unit suite', async (t) => {
  let server;
  let serverPort;
  const receivedRequests = [];

  await new Promise((resolve) => {
    server = http.createServer((req, res) => {
      receivedRequests.push({
        method: req.method,
        url: req.url,
        headers: req.headers
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, url: req.url }));
    });
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve();
    });
  });

  process.env.FIXTURE_HOST = '127.0.0.1';
  process.env.FIXTURE_PORT = String(serverPort);
  process.env.FIXTURE_OWNER = 'TestOwner';
  process.env.FIXTURE_REPO = 'TestRepo';

  // Load preload
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  req(PRELOAD_SCRIPT);

  t.after(() => {
    server.close();
  });

  await t.test('forwards approved HTTPS request to loopback and strips Authorization', async () => {
    receivedRequests.length = 0;
    const responseData = await new Promise((resolve, reject) => {
      const request = https.request(
        'https://api.github.com/repos/TestOwner/TestRepo/git/trees/main',
        {
          method: 'GET',
          headers: {
            Authorization: 'token secret-12345',
            'X-Access-Token': 'super-secret',
            Accept: 'application/vnd.github.v3+json'
          }
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve(JSON.parse(body)));
        }
      );
      request.on('error', reject);
      request.end();
    });

    assert.strictEqual(responseData.ok, true);
    assert.strictEqual(receivedRequests.length, 1);
    const intercepted = receivedRequests[0];
    assert.strictEqual(intercepted.url, '/repos/TestOwner/TestRepo/git/trees/main');
    assert.strictEqual(intercepted.headers['x-original-host'], 'api.github.com');
    assert.strictEqual(intercepted.headers['authorization'], undefined);
    assert.strictEqual(intercepted.headers['x-access-token'], undefined);
    assert.strictEqual(intercepted.headers['accept'], 'application/vnd.github.v3+json');
  });

  await t.test('https.get also delegates and forwards approved requests', async () => {
    receivedRequests.length = 0;
    const responseData = await new Promise((resolve, reject) => {
      const request = https.get(
        'https://raw.githubusercontent.com/TestOwner/TestRepo/main/README.md',
        { headers: { 'User-Agent': 'test' } },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve(JSON.parse(body)));
        }
      );
      request.on('error', reject);
    });

    assert.strictEqual(responseData.ok, true);
    assert.strictEqual(receivedRequests.length, 1);
    assert.strictEqual(receivedRequests[0].url, '/TestOwner/TestRepo/main/README.md');
    assert.strictEqual(receivedRequests[0].headers['x-original-host'], 'raw.githubusercontent.com');
  });

  await t.test('denies external unapproved HTTPS host', () => {
    assert.throws(
      () => {
        https.request('https://evil.example.com/api', () => {});
      },
      /Denied external HTTPS egress: evil.example.com/
    );
  });

  await t.test('denies unapproved repository on approved host', () => {
    assert.throws(
      () => {
        https.request('https://api.github.com/repos/Attacker/MaliciousRepo/trees', () => {});
      },
      /Denied access to unapproved repository path/
    );
  });

  await t.test('denies arbitrary external HTTP egress', () => {
    assert.throws(
      () => {
        http.request('http://insecure.example.com:8080/data', () => {});
      },
      /Denied external HTTP egress: insecure.example.com:8080/
    );
  });

  await t.test('global fetch also redirects approved HTTPS requests', async () => {
    receivedRequests.length = 0;
    const res = await globalThis.fetch('https://api.github.com/repos/TestOwner/TestRepo', {
      headers: { Authorization: 'Bearer test-token' }
    });
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.strictEqual(receivedRequests.length, 1);
    assert.strictEqual(receivedRequests[0].headers['authorization'], undefined);
  });

  await t.test('global fetch rejects unapproved external egress', async () => {
    await assert.rejects(
      async () => {
        await globalThis.fetch('https://unapproved.example.com/test');
      },
      /Denied external egress via fetch: unapproved.example.com/
    );
  });
});
