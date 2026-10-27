// artifacts/creative-production-improvements/evidence/mcp-transport-smoke.mjs
// Real MCP stdio transport smoke test for marketing skills
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const BUILT_CLI = path.join(REPO_ROOT, 'cli/dist/index.js');
const BUILT_MCP = path.join(REPO_ROOT, 'mcp/dist/index.js');
const PRELOAD_SCRIPT = path.join(REPO_ROOT, 'scripts/skill-tests/product-evidence-integration/network-preload.cjs');
const REGISTRY_FIXTURE = path.join(REPO_ROOT, 'scripts/skill-tests/product-evidence-integration/registry-fixture.mjs');

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms))
  ]);
}

function runNodeAsync(args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const started = process.hrtime.bigint();
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);
    proc.once('error', (err) => {
      clearTimeout(timer);
      resolve({ status: -1, stdout: '', stderr: err.message, durationMs: Number(process.hrtime.bigint() - started) / 1e6, timedOut: false });
    });
    proc.once('close', (status) => {
      clearTimeout(timer);
      resolve({
        status: timedOut ? 124 : status,
        stdout,
        stderr,
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        timedOut
      });
    });
  });
}

export async function runMcpTransportSmoke(consumerDir, fixture) {
  const req = createRequire(path.join(REPO_ROOT, 'mcp/package.json'));
  const { Client } = req(req.resolve('@modelcontextprotocol/sdk/client/index.js', { paths: [path.join(REPO_ROOT, 'mcp')] }));
  const { StdioClientTransport } = req(req.resolve('@modelcontextprotocol/sdk/client/stdio.js', { paths: [path.join(REPO_ROOT, 'mcp')] }));

  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-smoke-home-'));
  const xdg = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-smoke-xdg-'));

  const env = {
    PATH: process.env.PATH || '/usr/bin:/bin',
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    TMPDIR: os.tmpdir(),
    LANG: 'C.UTF-8',
    NODE_OPTIONS: `--require ${PRELOAD_SCRIPT}`,
    FIXTURE_HOST: '127.0.0.1',
    FIXTURE_PORT: String(fixture.port),
    FIXTURE_OWNER: fixture.owner,
    FIXTURE_REPO: fixture.repo,
    SKILLS_PROJECT_ROOT: consumerDir,
    MCP_TRANSPORT: 'stdio',
    AGS_TELEMETRY: 'false',
    AGS_TELEMETRY_PATH: path.join(home, 'telemetry-disabled.jsonl')
  };

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BUILT_MCP],
    env
  });

  const client = new Client({ name: 'marketing-smoke-client', version: '1.0.0' }, { capabilities: {} });
  await withTimeout(client.connect(transport), 8000, 'MCP client connect');

  const toolsRes = await withTimeout(client.listTools(), 5000, 'listTools');
  const toolNames = toolsRes.tools.map(t => t.name);

  // Positive keyword calls
  const stratRes = await withTimeout(client.callTool({
    name: 'load_skills_for_keywords',
    arguments: { keywords: ['marketing content strategy'] }
  }), 5000, 'load_skills_for_keywords(strategy)');
  const stratText = stratRes.content?.[0]?.text || '';
  const stratMatch = stratText.includes('marketing/marketing-content-strategy');

  const copyRes = await withTimeout(client.callTool({
    name: 'load_skills_for_keywords',
    arguments: { keywords: ['marketing copywriting'] }
  }), 5000, 'load_skills_for_keywords(copywriting)');
  const copyText = copyRes.content?.[0]?.text || '';
  const copyMatch = copyText.includes('marketing/marketing-copywriting');

  const videoRes = await withTimeout(client.callTool({
    name: 'load_skills_for_keywords',
    arguments: { keywords: ['demo video'] }
  }), 5000, 'load_skills_for_keywords(video)');
  const videoText = videoRes.content?.[0]?.text || '';
  const videoMatch = videoText.includes('marketing/marketing-demo-video');

  // Negative keyword call
  const negRes = await withTimeout(client.callTool({
    name: 'load_skills_for_keywords',
    arguments: { keywords: ['deploy Docker containers'] }
  }), 5000, 'load_skills_for_keywords(negative)');
  const negText = negRes.content?.[0]?.text || '';
  const negClean = !negText.includes('marketing-content-strategy') &&
                   !negText.includes('marketing-copywriting') &&
                   !negText.includes('marketing-demo-video');

  // Direct get_skill calls
  const getSkillStrat = await withTimeout(client.callTool({
    name: 'get_skill',
    arguments: { category: 'marketing', name: 'marketing-content-strategy' }
  }), 5000, 'get_skill(strategy)');
  const getStratOk = (getSkillStrat.content?.[0]?.text || '').includes('Marketing Content Strategy');

  const getSkillCopy = await withTimeout(client.callTool({
    name: 'get_skill',
    arguments: { category: 'marketing', name: 'marketing-copywriting' }
  }), 5000, 'get_skill(copywriting)');
  const getCopyOk = (getSkillCopy.content?.[0]?.text || '').includes('Marketing Copywriting');

  const getSkillVideo = await withTimeout(client.callTool({
    name: 'get_skill',
    arguments: { category: 'marketing', name: 'marketing-demo-video' }
  }), 5000, 'get_skill(video)');
  const getVideoOk = (getSkillVideo.content?.[0]?.text || '').includes('Demo Video Production Standard');

  await withTimeout(transport.close(), 3000, 'MCP transport close');

  return {
    transportType: 'stdio',
    toolsAvailable: toolNames,
    keywordRouting: {
      strategyMatch: stratMatch,
      copyMatch: copyMatch,
      videoMatch: videoMatch,
      negativeClean: negClean
    },
    directGetSkill: {
      strategyOk: getStratOk,
      copyOk: getCopyOk,
      videoOk: getVideoOk
    }
  };
}

async function main() {
  console.log('=== Real MCP Stdio Transport Smoke Test ===');
  const { startRegistryFixture } = await import(REGISTRY_FIXTURE);
  const fixture = await startRegistryFixture(REPO_ROOT, {
    owner: 'HoangNguyen0403',
    repo: 'agent-skills-standard',
  });
  console.log(`Registry fixture listening on port ${fixture.port}`);

  const tempConsumerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-transport-consumer-'));
  const tempHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-transport-home-'));
  const tempXdgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-transport-xdg-'));

  const skillsrcContent = `registry: "https://github.com/${fixture.owner}/${fixture.repo}"
agents:
  - claude
skills:
  marketing:
    include:
      - marketing-content-strategy
      - marketing-copywriting
      - marketing-demo-video
workflows: false
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
`;

  fs.writeFileSync(path.join(tempConsumerDir, '.skillsrc'), skillsrcContent, 'utf8');

  console.log('Synchronizing skills via CLI into consumer...');
  const syncEnv = {
    PATH: process.env.PATH || '/usr/bin:/bin',
    HOME: tempHomeDir,
    XDG_CONFIG_HOME: tempXdgDir,
    TMPDIR: os.tmpdir(),
    LANG: 'C.UTF-8',
    NODE_OPTIONS: `--require ${PRELOAD_SCRIPT}`,
    FIXTURE_HOST: '127.0.0.1',
    FIXTURE_PORT: String(fixture.port),
    FIXTURE_OWNER: fixture.owner,
    FIXTURE_REPO: fixture.repo,
  };

  const syncRes = await runNodeAsync([BUILT_CLI, 'sync', '--yes'], {
    cwd: tempConsumerDir,
    env: syncEnv,
    timeoutMs: 30000,
  });

  if (syncRes.status !== 0) {
    console.error('Sync failed:', syncRes.stderr || syncRes.stdout);
    await fixture.close();
    process.exit(1);
  }

  console.log('Connecting MCP client via StdioClientTransport and calling real tools...');
  const results = await runMcpTransportSmoke(tempConsumerDir, fixture);
  await fixture.close();

  const report = {
    timestamp: new Date().toISOString(),
    tempConsumerDir,
    results
  };

  const outPath = path.join(__dirname, 'mcp-transport-smoke-results.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('Results:\n', JSON.stringify(results, null, 2));
  console.log(`Saved results to ${outPath}`);

  const passed = results.keywordRouting.strategyMatch &&
                 results.keywordRouting.copyMatch &&
                 results.keywordRouting.videoMatch &&
                 results.keywordRouting.negativeClean &&
                 results.directGetSkill.strategyOk &&
                 results.directGetSkill.copyOk &&
                 results.directGetSkill.videoOk;

  if (!passed) {
    console.error('FAIL: One or more MCP transport checks failed!');
    process.exit(1);
  }
  console.log('SUCCESS: Real MCP stdio transport smoke passed completely!');
}

main().catch((err) => {
  console.error('MCP transport smoke failed:', err);
  process.exit(1);
});
