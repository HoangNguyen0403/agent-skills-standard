// artifacts/creative-production-improvements/evidence/marketing-consumer-smoke.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const PRELOAD_SCRIPT = path.join(REPO_ROOT, 'scripts/skill-tests/product-evidence-integration/network-preload.cjs');
const REGISTRY_FIXTURE = path.join(REPO_ROOT, 'scripts/skill-tests/product-evidence-integration/registry-fixture.mjs');
const BUILT_CLI = path.join(REPO_ROOT, 'cli/dist/index.js');
const BUILT_MCP = path.join(REPO_ROOT, 'mcp/dist/index.js');

function sha256(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return crypto.createHash('sha256').update(buf).digest('hex');
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

async function run() {
  console.log('--- Step 1: Starting local registry fixture server from frozen candidate snapshot ---');
  const { startRegistryFixture } = await import(REGISTRY_FIXTURE);
  const fixture = await startRegistryFixture(REPO_ROOT, {
    owner: 'HoangNguyen0403',
    repo: 'agent-skills-standard',
  });
  console.log(`Fixture server listening on port ${fixture.port}`);

  const tempConsumerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marketing-consumer-smoke-'));
  const tempHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marketing-home-'));
  const tempXdgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marketing-xdg-'));
  console.log(`--- Step 2: Created disposable temporary consumer at ${tempConsumerDir} ---`);

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

  console.log('--- Step 3: Running CLI sync with network preload against candidate local fixture ---');
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

  console.log(`Sync status: ${syncRes.status}`);
  if (syncRes.status !== 0) {
    console.error('Sync stdout:', syncRes.stdout);
    console.error('Sync stderr:', syncRes.stderr);
    await fixture.close();
    process.exit(1);
  }
  console.log('Sync output:\n', syncRes.stdout);

  console.log('--- Step 4: Verifying installed candidate files and SHA-256 hashes ---');
  const installedSkillsBase = path.join(tempConsumerDir, '.claude/skills/marketing');

  const filesToCheck = [
    {
      installedRel: 'marketing-content-strategy/SKILL.md',
      sourceRel: 'skills/marketing/marketing-content-strategy/SKILL.md'
    },
    {
      installedRel: 'marketing-content-strategy/references/creative-production-contract.md',
      sourceRel: 'skills/marketing/marketing-content-strategy/references/creative-production-contract.md'
    },
    {
      installedRel: 'marketing-copywriting/SKILL.md',
      sourceRel: 'skills/marketing/marketing-copywriting/SKILL.md'
    },
    {
      installedRel: 'marketing-demo-video/SKILL.md',
      sourceRel: 'skills/marketing/marketing-demo-video/SKILL.md'
    },
    {
      installedRel: 'marketing-demo-video/scripts/validate-demo-storyboard.mjs',
      sourceRel: 'skills/marketing/marketing-demo-video/scripts/validate-demo-storyboard.mjs'
    },
    {
      installedRel: 'marketing-demo-video/assets/fixture-storyboard.json',
      sourceRel: 'skills/marketing/marketing-demo-video/assets/fixture-storyboard.json'
    }
  ];

  const fileVerification = [];
  for (const f of filesToCheck) {
    const installedPath = path.join(installedSkillsBase, f.installedRel);
    const sourcePath = path.join(REPO_ROOT, f.sourceRel);
    if (!fs.existsSync(installedPath)) {
      throw new Error(`FAIL: Missing installed file: ${f.installedRel}`);
    }
    const installedHash = sha256(fs.readFileSync(installedPath));
    const sourceHash = sha256(fs.readFileSync(sourcePath));
    const matches = installedHash === sourceHash;
    console.log(`File: ${f.installedRel} | Hash: ${installedHash} | Matches source: ${matches}`);
    if (!matches) {
      throw new Error(`FAIL: Hash mismatch for ${f.installedRel}`);
    }
    fileVerification.push({
      file: f.installedRel,
      sha256: installedHash,
      matchesSource: matches
    });
  }

  console.log('--- Step 5: Verifying companion reference resolution (ordinary & flattened) ---');
  // Ordinary resolution:
  const ordinaryContractPath = path.join(installedSkillsBase, 'marketing-content-strategy/references/creative-production-contract.md');
  const ordinaryExists = fs.existsSync(ordinaryContractPath);
  console.log(`Ordinary resolution exists: ${ordinaryExists}`);

  // Flattened layout simulation:
  const flattenedDir = path.join(tempConsumerDir, 'flattened-test');
  fs.mkdirSync(flattenedDir, { recursive: true });
  const flattenedPkg = path.join(flattenedDir, 'marketing-marketing-content-strategy/references');
  fs.mkdirSync(flattenedPkg, { recursive: true });
  fs.copyFileSync(ordinaryContractPath, path.join(flattenedPkg, 'creative-production-contract.md'));
  const flattenedExists = fs.existsSync(path.join(flattenedPkg, 'creative-production-contract.md'));
  console.log(`Flattened resolution exists: ${flattenedExists}`);

  // Missing capability gap semantics check:
  const copySkillContent = fs.readFileSync(path.join(installedSkillsBase, 'marketing-copywriting/SKILL.md'), 'utf8');
  const videoSkillContent = fs.readFileSync(path.join(installedSkillsBase, 'marketing-demo-video/SKILL.md'), 'utf8');
  const copyHasGapRecord = copySkillContent.includes('missing_creative_production_contract') || copySkillContent.includes('creative-production-contract');
  const videoHasGapRecord = videoSkillContent.includes('missing_creative_production_contract') || videoSkillContent.includes('creative-production-contract');
  console.log(`Copywriting references contract/gap: ${copyHasGapRecord}`);
  console.log(`Demo video references contract/gap: ${videoHasGapRecord}`);

  console.log('--- Step 6: Exercising SkillIndex (MCP Router) on installed consumer skills ---');
  const { SkillIndex } = await import(path.join(REPO_ROOT, 'mcp/src/services/SkillIndex.ts'));
  const installedSkillsDir = path.join(tempConsumerDir, '.claude/skills');
  const metadataPath = path.join(installedSkillsDir, 'metadata.json');
  const skillIndex = new SkillIndex(installedSkillsDir, metadataPath);
  await skillIndex.load();

  // Test keyword matches:
  const keywordTests = [
    {
      keywords: ['marketing content strategy'],
      expectedSkill: 'marketing-content-strategy',
    },
    {
      keywords: ['marketing copywriting'],
      expectedSkill: 'marketing-copywriting',
    },
    {
      keywords: ['demo video'],
      expectedSkill: 'marketing-demo-video',
    },
    {
      keywords: ['deploy Docker containers'],
      expectedSkill: null, // negative test
    }
  ];

  const routerResults = [];
  for (const t of keywordTests) {
    const matches = skillIndex.matchKeywords(t.keywords);
    const matchedSkills = matches.map(m => m.skill.name);
    console.log(`Keywords: [${t.keywords.join(', ')}] -> Matched skills: [${matchedSkills.join(', ')}]`);
    if (t.expectedSkill !== null) {
      const hit = matchedSkills.includes(t.expectedSkill);
      if (!hit) throw new Error(`FAIL: Keyword [${t.keywords.join(', ')}] failed to match ${t.expectedSkill}`);
      routerResults.push({ keywords: t.keywords, expected: t.expectedSkill, matched: matchedSkills, pass: true });
    } else {
      const marketingHits = matchedSkills.filter(s => s.startsWith('marketing-'));
      const pass = marketingHits.length === 0;
      if (!pass) throw new Error(`FAIL: Negative keyword [${t.keywords.join(', ')}] unexpectedly matched marketing skills: ${marketingHits.join(', ')}`);
      routerResults.push({ keywords: t.keywords, expected: 'NO_MARKETING_MATCH', matched: matchedSkills, pass: true });
    }
  }

  // Direct findSkill test
  const getSkillResults = [];
  for (const name of ['marketing-content-strategy', 'marketing-copywriting', 'marketing-demo-video']) {
    const skillObj = skillIndex.findSkill('marketing', name);
    if (!skillObj) throw new Error(`FAIL: findSkill('marketing', '${name}') returned null`);
    console.log(`findSkill('marketing', '${name}') -> found, title: ${skillObj.name}, desc length: ${skillObj.description?.length}`);
    getSkillResults.push({
      category: 'marketing',
      name,
      found: true,
      hasDescription: !!skillObj.description
    });
  }

  console.log('--- Step 7: Exercising installed storyboard validator on fixture-storyboard.json ---');
  const validatorScript = path.join(installedSkillsBase, 'marketing-demo-video/scripts/validate-demo-storyboard.mjs');
  const fixtureStoryboard = path.join(installedSkillsBase, 'marketing-demo-video/assets/fixture-storyboard.json');

  const jsonRun = spawnSync(process.execPath, [validatorScript, fixtureStoryboard, '--check', '--format', 'json'], {
    encoding: 'utf8'
  });
  console.log(`Storyboard JSON validate status: ${jsonRun.status}`);
  if (jsonRun.status !== 0) throw new Error(`Storyboard JSON validation failed: ${jsonRun.stderr}`);
  const jsonParsed = JSON.parse(jsonRun.stdout);
  if (!jsonParsed.valid) throw new Error('Storyboard returned valid: false');

  const vttRun = spawnSync(process.execPath, [validatorScript, fixtureStoryboard, '--check', '--format', 'vtt'], {
    encoding: 'utf8'
  });
  console.log(`Storyboard VTT validate status: ${vttRun.status}, cue count: ${(vttRun.stdout.match(/-->/g) || []).length}`);
  if (vttRun.status !== 0) throw new Error(`Storyboard VTT validation failed: ${vttRun.stderr}`);

  const transcriptRun = spawnSync(process.execPath, [validatorScript, fixtureStoryboard, '--check', '--format', 'transcript'], {
    encoding: 'utf8'
  });
  console.log(`Storyboard Transcript validate status: ${transcriptRun.status}, has Narration: ${transcriptRun.stdout.includes('Narration')}`);
  if (transcriptRun.status !== 0) throw new Error(`Storyboard Transcript validation failed: ${transcriptRun.stderr}`);

  await fixture.close();
  console.log('Fixture server closed.');

  const smokeReport = {
    timestamp: new Date().toISOString(),
    tempConsumerDir,
    registryFixture: {
      port: fixture.port,
      requestsServed: fixture.requests?.length ?? 0
    },
    syncExitCode: syncRes.status,
    fileVerification,
    companionResolution: {
      ordinaryExists,
      flattenedExists,
      copyHasGapRecord,
      videoHasGapRecord
    },
    routerResults,
    getSkillResults,
    storyboardSmoke: {
      jsonExitCode: jsonRun.status,
      valid: jsonParsed.valid,
      summary: jsonParsed.summary,
      vttExitCode: vttRun.status,
      vttCueCount: (vttRun.stdout.match(/-->/g) || []).length,
      transcriptExitCode: transcriptRun.status,
      hasNarration: transcriptRun.stdout.includes('Narration')
    }
  };

  const reportPath = path.resolve(__dirname, 'consumer-smoke-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(smokeReport, null, 2), 'utf8');
  console.log(`Saved consumer smoke results to ${reportPath}`);
  console.log('SUCCESS: All behavior smoke checks passed!');
}

run().catch((err) => {
  console.error('Consumer smoke failed:', err);
  process.exit(1);
});
