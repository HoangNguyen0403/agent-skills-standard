#!/usr/bin/env node
/**
 * render-demo.mjs — real command capture + demo video renderer for standards-demo-01.
 *
 * Invariants (fail-closed, no fallbacks):
 * 1. Every displayed command is genuinely executed in a disposable consumer project:
 *    `cat .skillsrc`, the candidate CLI `sync`, `head -n 28 AGENTS.md`, and the
 *    measurement CLI. Command output shown on screen is the captured stdout of
 *    those exact processes, sliced to declared line ranges and labelled as an excerpt.
 * 2. MCP is left off through the CLI's own consent convention: `.skillsrc` declares
 *    `mcp.enabled: false` + `mcp.scope: disabled` and `sync` runs WITHOUT `--yes`
 *    (non-interactive stdin), so `runMcpPhase` skips consent and writes nothing.
 *    The run asserts that no MCP/hook config files were created.
 * 3. Non-zero exit status, missing artifacts, out-of-range excerpts, or a rendered
 *    line count that would overflow the frame aborts the render.
 * 4. Public logs are sanitized with an explicit declared transform; raw bytes are
 *    only hashed (private original is not retained inside the public checkout).
 * 5. `capture-manifest.json` records the capture identity: commit, snapshot tree
 *    SHA/file count, CLI hash, command artifacts, per-command output hashes, and
 *    the shared context revision used by every campaign asset.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const PLAYWRIGHT_CLI = path.join(REPO_ROOT, 'website/node_modules/@playwright/test/cli.js');
const FIXTURE_MODULE = path.join(REPO_ROOT, 'scripts/skill-tests/product-evidence-integration/registry-fixture.mjs');
const PRELOAD_SCRIPT = path.join(REPO_ROOT, 'scripts/skill-tests/product-evidence-integration/network-preload.cjs');
const CLI_PATH = path.join(REPO_ROOT, 'cli/dist/index.js');
const REPORT_SCRIPT = path.join(REPO_ROOT, 'skills/marketing/marketing-measurement/scripts/report-marketing.mjs');
const VALIDATOR = path.join(REPO_ROOT, 'skills/marketing/marketing-demo-video/scripts/validate-demo-storyboard.mjs');
const OUTPUT_DIR = __dirname;
const STORYBOARD_PATH = path.join(OUTPUT_DIR, 'demo-storyboard.json');
const CAPTIONS_PATH = path.join(OUTPUT_DIR, 'demo-captions.vtt');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'capture-manifest.json');
const LOG_PATH = path.join(OUTPUT_DIR, 'command-capture.log');
const TRANSCRIPT_PATH = path.join(OUTPUT_DIR, 'demo-transcript.md');

const MAX_RENDERED_LINES = 18;
const MOBILE_MAX_RENDERED_LINES = 26;
const OUTPUT_TERMINAL_PX = 26;
const OUTPUT_LINE_PX = 24;

const sanitizationStats = { consumerPath: 0, homePath: 0, worktreePattern: 0, tempPattern: 0 };

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function countReplacements(haystack, needle) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function sanitize(text, homeDir, projectDir) {
  let res = text;
  const consumerHits = countReplacements(res, projectDir);
  sanitizationStats.consumerPath += consumerHits;
  res = res.replaceAll(projectDir, '~/my-project');

  const homeHits = countReplacements(res, homeDir);
  sanitizationStats.homePath += homeHits;
  res = res.replaceAll(homeDir, '~');

  const worktreeHits = (res.match(/\/Users\/[a-zA-Z0-9._-]+\/\.paseo\/worktrees\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+/g) || []).length;
  sanitizationStats.worktreePattern += worktreeHits;
  res = res.replace(/\/Users\/[a-zA-Z0-9._-]+\/\.paseo\/worktrees\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+/g, '~/my-project');

  const tempHits = (res.match(/\/private\/var\/folders\/[^\s'"]+|\/var\/folders\/[^\s'"]+/g) || []).length;
  sanitizationStats.tempPattern += tempHits;
  res = res.replace(/\/private\/var\/folders\/[^\s'"]+/g, '~/my-project/tmp');
  res = res.replace(/\/var\/folders\/[^\s'"]+/g, '~/my-project/tmp');

  return stripAnsi(res);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

/** Redact local absolute paths from argv for the public log. */
function redactArgv(argv, homeDir, projectDir) {
  return argv.map((arg) => {
    let value = arg;
    if (value === process.execPath) return 'node';
    if (projectDir && value.startsWith(projectDir)) return '~/my-project' + value.slice(projectDir.length);
    if (homeDir && value.startsWith(homeDir)) return '~' + value.slice(homeDir.length);
    if (value.startsWith(REPO_ROOT)) return '<candidate checkout>' + value.slice(REPO_ROOT.length);
    return value;
  });
}

function runBuffered(argv0, argv, options) {
  const started = process.hrtime.bigint();
  const result = spawnSync(argv0, argv, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 30000,
    maxBuffer: 16 * 1024 * 1024
  });
  return {
    label: options.label,
    display: options.display ?? `${argv0} ${argv.join(' ')}`,
    cwdLabel: options.cwdLabel,
    argv: [argv0, ...argv],
    cwd: options.cwd,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    durationMs: Number(process.hrtime.bigint() - started) / 1e6
  };
}

function spawnNodeAsync(args, options = {}) {
  const started = process.hrtime.bigint();
  const timeoutMs = options.timeoutMs ?? 30000;
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let timedOut = false;

    proc.stdout.on('data', (chunk) => { stdout = Buffer.concat([stdout, chunk]); });
    proc.stderr.on('data', (chunk) => { stderr = Buffer.concat([stderr, chunk]); });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.once('error', (error) => {
      clearTimeout(timer);
      resolve({
        status: -1,
        stdout: '',
        stderr: error.message,
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        timedOut: false
      });
    });

    proc.once('close', (status, signal) => {
      clearTimeout(timer);
      resolve({
        status: timedOut ? 124 : status,
        signal,
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        timedOut
      });
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function excerptLines(text, start, end, label) {
  const lines = text.replace(/\n+$/, '').split('\n');
  assert(start >= 1 && end <= lines.length && start <= end,
    `${label}: excerpt ${start}-${end} outside captured output of ${lines.length} lines`);
  const slice = lines.slice(start - 1, end);
  assert(slice.join('').trim().length > 0, `${label}: empty excerpt ${start}-${end}`);
  return { start, end, total: lines.length, lines: slice, text: slice.join('\n') };
}

/** Conservative rendered-line estimate: monospace wrap at the frame width. */
function renderedLineCount(lines, charsPerLine) {
  let count = 0;
  for (const line of lines) {
    const len = [...line].length;
    count += Math.max(1, Math.ceil(len / charsPerLine));
  }
  return count;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildSceneHtml({ scene, blocks, banner, promptLine, width, height, mode }) {
  const isMobile = mode === 'mobile';
  const terminalPx = isMobile ? 14 : OUTPUT_TERMINAL_PX;
  const outputPx = isMobile ? 13 : OUTPUT_LINE_PX;
  const titlePx = isMobile ? 11 : 18;
  const bannerPx = isMobile ? 9 : 14;
  const captionPx = isMobile ? 13 : 25;
  const margin = isMobile ? '8px' : '36px 48px';
  const termPad = isMobile ? '12px' : '32px 44px';
  const footerH = isMobile ? 118 : 110;
  const titleH = isMobile ? 34 : 52;

  const outputHtml = blocks.map((block, index) => {
    const sep = index === 0 ? '' : `<div class="cont">${escapeHtml(block.label)}</div>`;
    return `${sep}<div class="output">${escapeHtml(block.text)}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(scene.id)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${width}px;
    height: ${height}px;
    background: #090d13;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .window {
    margin: ${margin};
    flex: 1;
    background: #161b22;
    border-radius: ${isMobile ? 8 : 14}px;
    border: 1px solid #30363d;
    box-shadow: 0 24px 48px rgba(0,0,0,0.7);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .titlebar {
    height: ${titleH}px;
    flex: 0 0 ${titleH}px;
    background: #21262d;
    border-bottom: 1px solid #30363d;
    display: flex;
    align-items: center;
    padding: 0 ${isMobile ? 10 : 24}px;
  }
  .title {
    flex: 1;
    text-align: center;
    color: #8b949e;
    font-size: ${titlePx}px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
  }
  .privacy-banner {
    background: #1f2937;
    border-bottom: 1px solid #374151;
    padding: ${isMobile ? '5px 10px' : '6px 36px'};
    font-size: ${bannerPx}px;
    color: #9ca3af;
    font-family: "JetBrains Mono", "SF Mono", monospace;
    line-height: 1.3;
  }
  .terminal {
    flex: 1;
    padding: ${termPad};
    font-family: "JetBrains Mono", "SF Mono", "Fira Code", monospace;
    font-size: ${terminalPx}px;
    line-height: 1.5;
    white-space: normal;
    color: #c9d1d9;
    overflow: hidden;
  }
  .prompt-line {
    margin-bottom: ${isMobile ? 8 : 16}px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .prompt { color: #58a6ff; font-weight: bold; }
  .path { color: #3fb950; }
  .cmd { color: #f0f6fc; font-weight: 600; }
  .output {
    color: #8b949e;
    font-size: ${outputPx}px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .cont {
    color: #6e7681;
    font-size: ${outputPx}px;
    line-height: 1.5;
    margin: ${isMobile ? 6 : 10}px 0;
    border-top: 1px dashed #30363d;
    padding-top: ${isMobile ? 4 : 6}px;
  }
  .footer {
    height: ${footerH}px;
    flex: 0 0 ${footerH}px;
    background: #0d1117;
    border-top: 1px solid #21262d;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 ${isMobile ? 12 : 60}px;
  }
  .caption-box {
    background: rgba(22, 27, 34, 0.98);
    border: 1px solid #388bfd;
    border-radius: 8px;
    padding: ${isMobile ? '8px 10px' : '16px 36px'};
    color: #58a6ff;
    font-size: ${captionPx}px;
    font-weight: 600;
    text-align: center;
    line-height: 1.35;
    box-shadow: 0 6px 16px rgba(0,0,0,0.5);
  }
</style>
</head>
<body>
  <div class="window">
    <div class="titlebar"><div class="title">${escapeHtml(scene.id)} — agent-skills-standard demo</div></div>
    <div class="privacy-banner">${escapeHtml(banner)}</div>
    <div class="terminal"><div class="prompt-line"><span class="prompt">dev@workstation</span>:<span class="path">~/my-project</span>$ <span class="cmd">${escapeHtml(promptLine)}</span></div>${outputHtml}</div>
  </div>
  <div class="footer">
    <div class="caption-box">${escapeHtml(scene.caption)}</div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('🎬 Real command capture + demo video render');
  assert(fs.existsSync(CLI_PATH), `candidate CLI build missing: ${CLI_PATH}`);
  assert(fs.existsSync(STORYBOARD_PATH), `storyboard missing: ${STORYBOARD_PATH}`);
  assert(fs.existsSync(CAPTIONS_PATH), `captions missing: ${CAPTIONS_PATH} (generate from the storyboard first)`);

  const storyboard = JSON.parse(fs.readFileSync(STORYBOARD_PATH, 'utf8'));
  const captureStartedAt = new Date();
  const commitSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim();
  const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim().length > 0;
  const cliSha256 = sha256File(CLI_PATH);
  console.log(`   commit=${commitSha} dirty=${dirty} cli_sha256=${cliSha256.slice(0, 16)}…`);

  const { startRegistryFixture } = await import(FIXTURE_MODULE);
  const fixture = await startRegistryFixture(REPO_ROOT, {
    owner: 'HoangNguyen0403',
    repo: 'agent-skills-standard',
    commitSha
  });
  console.log(`   fixture 127.0.0.1:${fixture.port} tree=${fixture.treeSha.slice(0, 16)}… files=${fixture.tree.length}`);
  const captureDate = captureStartedAt.toISOString().slice(0, 10).replace(/-/g, '');
  contextRevision = `ctx-rev-${captureDate}-capture-${fixture.treeSha.slice(0, 8)}`;
  console.log(`   context revision: ${contextRevision}`);

  const consumerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ags-demo-live-'));
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ags-demo-home-'));
  const xdgDir = path.join(homeDir, '.config');
  fs.mkdirSync(xdgDir, { recursive: true });

  // MCP off via the CLI's own consent convention: declared disabled + non-interactive
  // `sync` (no --yes) so runMcpPhase skips without writing runtime configs.
  const skillsrcContent = `registry: "https://github.com/HoangNguyen0403/agent-skills-standard"
agents:
  - claude
  - cursor
  - codex
skills:
  typescript:
    ref: "typescript-v1.3.4"
  product-management:
    ref: "product-management-v1.0.1"
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
`;
  fs.writeFileSync(path.join(consumerDir, '.skillsrc'), skillsrcContent);

  const captureEnv = {
    PATH: process.env.PATH || '/usr/bin:/bin',
    HOME: homeDir,
    XDG_CONFIG_HOME: xdgDir,
    TMPDIR: os.tmpdir(),
    LANG: 'C.UTF-8',
    NODE_OPTIONS: `--require ${PRELOAD_SCRIPT}`,
    FIXTURE_HOST: '127.0.0.1',
    FIXTURE_PORT: String(fixture.port),
    FIXTURE_OWNER: fixture.owner,
    FIXTURE_REPO: fixture.repo,
    AGS_TELEMETRY: 'false',
    AGS_TELEMETRY_PATH: path.join(homeDir, 'telemetry-disabled.jsonl')
  };

  const commands = [];

  // ── 1. cat .skillsrc (genuinely executed) ─────────────────────────────────
  const skillsrcCmd = runBuffered('cat', ['.skillsrc'], {
    cwd: consumerDir, env: captureEnv, label: 'scene-01', display: 'cat .skillsrc', cwdLabel: '~/my-project'
  });
  assert(skillsrcCmd.status === 0, `cat .skillsrc exited ${skillsrcCmd.status}`);
  commands.push(skillsrcCmd);

  // ── 2. candidate CLI sync (async; no --yes) ───────────────────────────────
  const syncStarted = Date.now();
  const syncResult = await spawnNodeAsync([CLI_PATH, 'sync'], {
    cwd: consumerDir,
    env: captureEnv,
    timeoutMs: 30000
  });
  const syncCmd = {
    label: 'scene-02/03',
    display: 'ags sync',
    exactInvocation: 'node cli/dist/index.js sync   (candidate build, no --yes)',
    argv: [process.execPath, CLI_PATH, 'sync'],
    cwdLabel: '~/my-project',
    cwd: consumerDir,
    status: syncResult.status,
    signal: syncResult.signal,
    stdout: syncResult.stdout,
    stderr: syncResult.stderr,
    durationMs: syncResult.durationMs
  };
  assert(syncResult.status === 0, `sync exited ${syncResult.status}\n${syncResult.stderr}`);
  commands.push(syncCmd);
  console.log(`   sync exit=0 in ${syncResult.durationMs.toFixed(1)}ms (wall ${Date.now() - syncStarted}ms)`);

  // ── 3. Assert actual artifacts + MCP-off invariants ───────────────────────
  const requiredFiles = ['.skills-lock.json', 'AGENTS.md', 'CLAUDE.md'];
  for (const rel of requiredFiles) {
    assert(fs.existsSync(path.join(consumerDir, rel)), `expected artifact missing: ${rel}`);
  }
  for (const rel of ['.claude/skills', '.cursor/skills', '.codex/skills']) {
    assert(fs.existsSync(path.join(consumerDir, rel)), `expected agent directory missing: ${rel}`);
  }
  const forbiddenArtifacts = ['.mcp.json', '.cursor/mcp.json', '.codex/config.toml', '.claude/hooks', '.claude/settings.json'];
  for (const rel of forbiddenArtifacts) {
    assert(!fs.existsSync(path.join(consumerDir, rel)), `MCP-off invariant violated: ${rel} exists after sync`);
  }

  const lockJson = JSON.parse(fs.readFileSync(path.join(consumerDir, '.skills-lock.json'), 'utf8'));
  const lockEntries = Object.keys(lockJson.entries || {});
  assert(lockEntries.length > 0, 'lockfile has no entries');

  const agentsRaw = fs.readFileSync(path.join(consumerDir, 'AGENTS.md'), 'utf8');
  assert(agentsRaw.includes('## Agent Skills Index'), 'AGENTS.md missing Agent Skills Index');
  assert(agentsRaw.includes('ags mcp enable'), 'AGENTS.md missing the MCP-disabled note (expected with mcp.enabled=false)');
  assert(!agentsRaw.includes('GATEKEEPER CONSTRAINT'), 'unexpected gatekeeper block in router-style AGENTS.md');

  // ── 4. head -n 28 AGENTS.md (genuinely executed) ──────────────────────────
  const headCmd = runBuffered('head', ['-n', '28', 'AGENTS.md'], {
    cwd: consumerDir, env: captureEnv, label: 'scene-04/05', display: 'head -n 28 AGENTS.md', cwdLabel: '~/my-project'
  });
  assert(headCmd.status === 0, `head exited ${headCmd.status}`);
  commands.push(headCmd);

  // ── 5. measurement CLI (genuinely executed) ───────────────────────────────
  const reportFixture = path.join(REPO_ROOT, 'docs/product/evidence-led-marketing/fixtures/synthetic-input-combined.json');
  const reportAuthRoot = path.join(REPO_ROOT, 'docs/product/evidence-led-marketing');
  const reportArgs = [
    REPORT_SCRIPT, reportFixture,
    '--authority-root', reportAuthRoot,
    '--as-of', '2026-10-25T00:00:00Z',
    '--format', 'markdown'
  ];
  const reportCmd = runBuffered(process.execPath, reportArgs, {
    cwd: REPO_ROOT,
    env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: homeDir, LANG: 'C.UTF-8' },
    label: 'scene-06',
    cwdLabel: '<candidate checkout>',
    display: 'node skills/marketing/marketing-measurement/scripts/report-marketing.mjs … --format markdown'
  });
  assert(reportCmd.status === 0, `report-marketing exited ${reportCmd.status}\n${reportCmd.stderr}`);
  commands.push(reportCmd);

  // ── 6. Sanitized outputs + excerpts ──────────────────────────────────────
  const sanitizedOut = commands.map((cmd) => ({
    ...cmd,
    stdoutRawSha256: sha256(Buffer.from(cmd.stdout, 'utf8')),
    stderrRawSha256: sha256(Buffer.from(cmd.stderr, 'utf8')),
    stdout: sanitize(cmd.stdout, homeDir, consumerDir),
    stderr: sanitize(cmd.stderr, homeDir, consumerDir)
  }));
  const sanitizedByLabel = Object.fromEntries(sanitizedOut.map((c) => [c.label, c]));

  const skillsrcOut = sanitizedByLabel['scene-01'];
  const syncOut = sanitizedByLabel['scene-02/03'];
  const headOut = sanitizedByLabel['scene-04/05'];
  const reportOut = sanitizedByLabel['scene-06'];
  const reportLines = reportOut.stdout.replace(/\n+$/, '').split('\n').length;

  const scenePlan = [
    {
      id: 'scene-01',
      duration: 7.0,
      command: 'cat .skillsrc',
      caption: 'Define the target agents and pinned skill versions once in .skillsrc.',
      claimRef: 'CLM-001',
      blocks: [excerptLines(skillsrcOut.stdout, 1, 15, 'scene-01')]
    },
    {
      id: 'scene-02',
      duration: 8.0,
      command: 'ags sync',
      caption: 'ags sync fetches only the pinned categories and writes native mirrors for each agent.',
      claimRef: 'CLM-001',
      note: 'exact invocation: node cli/dist/index.js sync (candidate build)',
      blocks: [excerptLines(syncOut.stdout, 3, 14, 'scene-02')]
    },
    {
      id: 'scene-03',
      duration: 8.0,
      command: 'ags sync',
      caption: 'Native directories and lockfile are written; no MCP runtime config is touched while MCP stays disabled.',
      claimRef: 'CLM-001',
      note: 'same execution as scene-02',
      blocks: [excerptLines(syncOut.stdout, 22, 34, 'scene-03')]
    },
    {
      id: 'scene-04',
      duration: 8.0,
      command: 'head -n 28 AGENTS.md',
      caption: 'Generated AGENTS.md opens with the Agent Skills Index and the Zero-Trust rule to read matching SKILL.md files.',
      claimRef: 'CLM-004',
      blocks: [excerptLines(headOut.stdout, 6, 17, 'scene-04')]
    },
    {
      id: 'scene-05',
      duration: 8.0,
      command: 'head -n 28 AGENTS.md',
      caption: 'The MCP section states when it applies and, with MCP disabled, tells you to enable it explicitly.',
      claimRef: 'CLM-004',
      note: 'same execution as scene-04',
      blocks: [excerptLines(headOut.stdout, 19, 28, 'scene-05')]
    },
    {
      id: 'scene-06',
      duration: 10.0,
      command: 'node skills/marketing/marketing-measurement/scripts/report-marketing.mjs … --format markdown',
      caption: 'The scorecard reports synthetic cohort counts and recommendation: inconclusive — no ROI is fabricated.',
      claimRef: 'CLM-003',
      blocks: [
        excerptLines(reportOut.stdout, 1, 8, 'scene-06'),
        { ...excerptLines(reportOut.stdout, 17, 24, 'scene-06'), label: `excerpt continues — lines 17–24 of ${reportLines} captured lines` }
      ]
    }
  ];

  // Plan must match the storyboard contract exactly (durations drive captions + video).
  assert(storyboard.scenes.length === scenePlan.length + 1,
    `storyboard has ${storyboard.scenes.length} scenes, renderer plan has ${scenePlan.length} + narration`);
  for (let i = 0; i < scenePlan.length; i++) {
    const sbScene = storyboard.scenes[i];
    assert(sbScene.id === scenePlan[i].id, `storyboard scene ${i} id ${sbScene.id} ≠ plan ${scenePlan[i].id}`);
    assert(Math.abs(sbScene.duration_seconds - scenePlan[i].duration) < 1e-9,
      `storyboard scene ${sbScene.id} duration ${sbScene.duration_seconds} ≠ plan ${scenePlan[i].duration}`);
    assert(sbScene.captions?.[0]?.text === scenePlan[i].caption,
      `storyboard scene ${sbScene.id} caption text must equal the rendered caption`);
  }
  assert(storyboard.scenes.at(-1).id === 'scene-07', 'final storyboard scene must be the narration scene-07');
  assert(storyboard.context_revision === contextRevision,
    `storyboard context_revision ${storyboard.context_revision} ≠ capture identity ${contextRevision}`);

  // Rendered-line overflow guards (frame is fixed; clipping is a hard failure).
  for (const scene of scenePlan) {
    const lines = scene.blocks.flatMap((b) => b.lines);
    const rendered = renderedLineCount(lines, 108);
    assert(rendered <= MAX_RENDERED_LINES,
      `${scene.id} would render ~${rendered} lines (max ${MAX_RENDERED_LINES}); shrink the excerpt`);
    scene.renderedLines = rendered;
  }

  // ── 7. Public capture log (explicit transform, raw bytes only hashed) ─────
  const captureFinishedAt = new Date();
  const logLines = [];
  logLines.push('=== COMMAND EXECUTION CAPTURE LOG (PUBLIC — SANITIZED) ===');
  logLines.push(`Capture started : ${captureStartedAt.toISOString()}`);
  logLines.push(`Capture finished: ${captureFinishedAt.toISOString()}`);
  logLines.push(`Candidate commit: ${commitSha} (working tree dirty: ${dirty})`);
  logLines.push(`Snapshot tree SHA256: ${fixture.treeSha} (${fixture.tree.length} files served by the in-memory fixture)`);
  logLines.push(`Candidate CLI: cli/dist/index.js sha256=${cliSha256}`);
  logLines.push(`Node: ${process.version}`);
  logLines.push('');
  logLines.push('PUBLIC SANITIZATION TRANSFORM (declared, not silent):');
  logLines.push('  - disposable consumer directory -> ~/my-project');
  logLines.push('  - disposable HOME directory     -> ~');
  logLines.push('  - macOS temp directories        -> ~/my-project/tmp');
  logLines.push('  - ANSI colour escape sequences  -> stripped');
  logLines.push('  - argv absolute paths           -> node / ~/my-project / <candidate checkout>');
  logLines.push(`  replacements applied: consumer=${sanitizationStats.consumerPath} home=${sanitizationStats.homePath} worktree=${sanitizationStats.worktreePattern} temp=${sanitizationStats.tempPattern}`);
  logLines.push('  raw (unsanitized) bytes are hashed below and NOT retained in this public checkout.');
  logLines.push('');
  for (const cmd of sanitizedOut) {
    logLines.push(`[${cmd.label}] $ ${cmd.display}`);
    logLines.push(`argv: ${JSON.stringify(redactArgv(cmd.argv, homeDir, consumerDir))}`);
    logLines.push(`cwd: ${cmd.cwdLabel ?? '(unlabeled)'}`);
    logLines.push(`STDOUT (sanitized):`);
    logLines.push(cmd.stdout.replace(/\n+$/, ''));
    logLines.push(`STDERR (sanitized, non-fatal unless exit ≠ 0):`);
    logLines.push(cmd.stderr.replace(/\n+$/, '') || '(empty)');
    logLines.push(`Exit status: ${cmd.status}  (duration ${cmd.durationMs.toFixed(1)}ms)`);
    logLines.push(`stdout sha256 (sanitized): ${sha256(Buffer.from(cmd.stdout, 'utf8'))}`);
    logLines.push(`stdout sha256 (raw)      : ${cmd.stdoutRawSha256}`);
    logLines.push('');
  }
  logLines.push('NOTE: stderr from the candidate CLI contains "fatal: not a git repository" because the disposable');
  logLines.push('consumer directory is not a git worktree. It is non-fatal and the process exit status is 0;');
  logLines.push('the exit status (not stderr text) is the authoritative outcome asserted by this pipeline.');
  logLines.push('');
  logLines.push('MCP-OFF ASSERTIONS (checked on disk after sync):');
  logLines.push('  .skillsrc declared: mcp.enabled=false, mcp.scope=disabled, prompted=true');
  logLines.push('  sync invoked without --yes in a non-interactive shell -> runMcpPhase skips consent');
  logLines.push(`  absent: ${forbiddenArtifacts.join(', ')}`);
  logLines.push(`  present: ${requiredFiles.join(', ')}, .claude/skills, .cursor/skills, .codex/skills`);
  logLines.push(`  lockfile entries: ${lockEntries.length}`);
  fs.writeFileSync(LOG_PATH, logLines.join('\n'));
  console.log(`✓ capture log: ${LOG_PATH}`);

  // ── 8. Video segments from rendered frames ───────────────────────────────
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ags-demo-frames-'));
  const frameFiles = [];

  const renderFrame = ({ id, html, png, width, height }) => {
    const htmlPath = path.join(framesDir, `${id}.html`);
    fs.writeFileSync(htmlPath, html);
    const shot = spawnSync(process.execPath, [
      PLAYWRIGHT_CLI, 'screenshot',
      '--viewport-size', `${width}, ${height}`,
      htmlPath, png
    ], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120000 });
    assert(shot.status === 0 && fs.existsSync(png), `screenshot failed for ${id}: ${shot.stderr || shot.stdout}`);
  };

  for (const scene of scenePlan) {
    const firstBlock = scene.blocks[0];
    const lastBlock = scene.blocks.at(-1);
    const rangeLabel = scene.blocks.length === 1
      ? `[actual output excerpt — lines ${firstBlock.start}–${firstBlock.end} of ${firstBlock.total} captured lines · full log: command-capture.log]`
      : `[actual output excerpts — lines ${firstBlock.start}–${firstBlock.end} and ${lastBlock.start}–${lastBlock.end} of ${firstBlock.total} captured lines · full log: command-capture.log]`;
    const banner = `${rangeLabel}  ${scene.note ? '· ' + scene.note + ' ' : ''}· paths normalized to ~/my-project`;
    const html = buildSceneHtml({
      scene: { ...scene, caption: scene.caption },
      blocks: scene.blocks,
      banner,
      promptLine: scene.command,
      width: 1920,
      height: 1080,
      mode: 'desktop'
    });
    const png = path.join(framesDir, `${scene.id}.png`);
    renderFrame({ id: scene.id, html, png, width: 1920, height: 1080 });
    frameFiles.push({ id: scene.id, png });
    console.log(`   frame ${scene.id} (${scene.renderedLines} rendered lines)`);
  }

  // Narration scene: no fabricated command output.
  const narrationScene = storyboard.scenes.at(-1);
  const narrationHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 1920px; height: 1080px; background: #090d13; color: #e6edf3;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
         display: flex; flex-direction: column; }
  .panel { margin: 36px 48px; flex: 1; background: #161b22; border: 1px solid #30363d; border-radius: 14px;
           padding: 56px 64px; display: flex; flex-direction: column; justify-content: center; }
  h2 { font-size: 40px; margin-bottom: 28px; color: #f0f6fc; }
  p { font-size: 27px; line-height: 1.6; color: #c9d1d9; margin-bottom: 18px; }
  .caveat { color: #f0b72f; font-weight: 600; }
  .meta { color: #8b949e; font-size: 22px; margin-top: 26px; }
  .footer { height: 110px; flex: 0 0 110px; background: #0d1117; border-top: 1px solid #21262d;
            display: flex; align-items: center; justify-content: center; padding: 0 60px; }
  .caption-box { background: rgba(22,27,34,0.98); border: 1px solid #388bfd; border-radius: 8px;
                 padding: 16px 36px; color: #58a6ff; font-size: 25px; font-weight: 600; text-align: center; }
</style></head><body>
  <div class="panel">
    <h2>What the files do — and do not do</h2>
    <p>Pinned skill files give agents structured, high-priority context.</p>
    <p class="caveat">"Don't claim agent compliance because files exist."</p>
    <p>Language models remain probabilistic. Deterministic CI gates, linters and eval runs stay mandatory.</p>
    <p class="meta">Assets are in prepared state for maintainer review; the remote release gate (AC-16) is still open.</p>
  </div>
  <div class="footer"><div class="caption-box">${escapeHtml(narrationScene.captions[0].text)}</div></div>
</body></html>`;
  const narrationPng = path.join(framesDir, 'scene-07.png');
  renderFrame({ id: 'scene-07', html: narrationHtml, png: narrationPng, width: 1920, height: 1080 });
  frameFiles.push({ id: 'scene-07', png: narrationPng });

  // ── 9. Mobile verification frames (390 px viewport, actual captured text) ─
  const mobileSpecs = [
    {
      id: 'mobile-01',
      scene: scenePlan[1],
      blocks: [excerptLines(syncOut.stdout, 3, 8, 'mobile-01')],
      rangeLabel: 'lines 3–8 of ' + excerptLines(syncOut.stdout, 3, 8, 'mobile-01').total
    },
    {
      id: 'mobile-02',
      scene: scenePlan[3],
      blocks: [excerptLines(headOut.stdout, 6, 12, 'mobile-02')],
      rangeLabel: 'lines 6–12 of 28'
    }
  ];
  const mobileFrames = [];
  for (const spec of mobileSpecs) {
    const banner = `[390px viewport · actual output excerpt ${spec.rangeLabel} · paths normalized to ~/my-project]`;
    const html = buildSceneHtml({
      scene: { ...spec.scene, caption: spec.scene.caption },
      blocks: spec.blocks,
      banner,
      promptLine: spec.scene.command,
      width: 390,
      height: 844,
      mode: 'mobile'
    });
    const png = path.join(OUTPUT_DIR, `demo-frame-${spec.id}.png`);
    renderFrame({ id: spec.id, html, png, width: 390, height: 844 });
    const rendered = renderedLineCount(spec.blocks.flatMap((b) => b.lines), 40);
    assert(rendered <= MOBILE_MAX_RENDERED_LINES,
      `${spec.id} would render ~${rendered} lines at 390px (max ${MOBILE_MAX_RENDERED_LINES})`);
    mobileFrames.push({ id: spec.id, png: path.basename(png), viewport: '390x844', terminal_px: 14, output_px: 13, rendered_lines: rendered, source_range: spec.rangeLabel });
    console.log(`   mobile frame ${spec.id} (${rendered} rendered lines)`);
  }

  // ── 10. Encode + concat, embed pre-generated captions ────────────────────
  const segmentPaths = [];
  frameFiles.forEach((frame, index) => {
    const duration = index < scenePlan.length ? scenePlan[index].duration : narrationScene.duration_seconds;
    const segPath = path.join(framesDir, `seg_${index}.mp4`);
    execFileSync('ffmpeg', [
      '-y', '-loop', '1', '-i', frame.png,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-c:v', 'libx264', '-t', String(duration), '-pix_fmt', 'yuv420p', '-r', '30',
      '-c:a', 'aac', '-b:a', '128k', '-shortest', segPath
    ]);
    segmentPaths.push(segPath);
  });
  const concatListPath = path.join(framesDir, 'concat.txt');
  fs.writeFileSync(concatListPath, segmentPaths.map((p) => `file '${p}'`).join('\n'));

  const captionsVtt = fs.readFileSync(CAPTIONS_PATH, 'utf8');
  const finalMp4 = path.join(OUTPUT_DIR, 'demo.mp4');
  execFileSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath,
    '-i', CAPTIONS_PATH,
    '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text',
    '-metadata:s:s:0', 'language=eng', '-movflags', '+faststart', finalMp4
  ]);
  console.log(`✓ video: ${finalMp4}`);

  // ── 11. Proof frames from the exported video ─────────────────────────────
  const timeline = [];
  let offset = 0;
  for (const scene of [...scenePlan, { id: narrationScene.id, duration: narrationScene.duration_seconds }]) {
    timeline.push({ id: scene.id, start: offset, duration: scene.duration });
    offset += scene.duration;
  }
  const proofFrames = [];
  const proofTargets = ['scene-02', 'scene-03', 'scene-05', 'scene-06'];
  proofTargets.forEach((target, index) => {
    const entry = timeline.find((t) => t.id === target);
    const at = entry.start + entry.duration / 2;
    const png = path.join(OUTPUT_DIR, `demo-frame-0${index + 1}.png`);
    execFileSync('ffmpeg', ['-y', '-ss', at.toFixed(3), '-i', finalMp4, '-vframes', '1', png]);
    proofFrames.push({ file: path.basename(png), scene: target, seconds: Number(at.toFixed(3)) });
  });

  // ── 12. ffprobe + embedded-subtitle check ────────────────────────────────
  const probe = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,duration:format=duration,size',
    '-of', 'json', finalMp4
  ], { encoding: 'utf8' });
  const probeJson = JSON.parse(probe);
  const videoStream = probeJson.streams.find((s) => s.codec_type === 'video');
  const audioStream = probeJson.streams.find((s) => s.codec_type === 'audio');
  const subStream = probeJson.streams.find((s) => s.codec_type === 'subtitle');
  assert(videoStream && videoStream.width === 1920 && videoStream.height === 1080, 'video stream is not 1920x1080');
  assert(audioStream && audioStream.codec_name === 'aac', 'audio stream missing/AAC unexpected');
  assert(subStream && subStream.codec_name === 'mov_text', 'embedded subtitle stream missing');

  const extractedSrt = path.join(framesDir, 'extracted.srt');
  execFileSync('ffmpeg', ['-y', '-i', finalMp4, '-map', '0:s:0', extractedSrt], { stdio: 'pipe' });
  const srtText = fs.readFileSync(extractedSrt, 'utf8');
  const captionTexts = storyboard.scenes.flatMap((s) => s.captions.map((c) => c.text));
  for (const text of captionTexts) {
    const probeText = text.replace(/\s+/g, ' ');
    assert(srtText.replace(/\s+/g, ' ').includes(probeText), `caption text missing from embedded subtitle stream: ${text.slice(0, 40)}…`);
  }

  // ── 13. Transcript compiled from the same plan + captured text ───────────
  const transcript = [];
  transcript.push(`# Video Transcript: ${storyboard.title}`);
  transcript.push(`Campaign: \`${storyboard.campaign_id}\` | Context Revision: \`${contextRevision}\``);
  transcript.push(`Capture Identity: commit \`${commitSha}\` (dirty: ${dirty}) | snapshot tree \`${fixture.treeSha}\` (${fixture.tree.length} files) | CLI sha256 \`${cliSha256}\``);
  transcript.push(`Rights License Assertion: ${storyboard.rights.license} | Audio Provenance: ${storyboard.rights.audio_provenance}`);
  transcript.push('Synthetic Contract: No — every terminal excerpt below is captured stdout from an actual local execution.');
  transcript.push('');
  transcript.push('Output shown in the video is an excerpt of captured stdout, labelled with its line range. The complete,');
  transcript.push('sanitized capture is `command-capture.log`; raw output hashes are in `capture-manifest.json`.');
  transcript.push('Caption times are scene-local offsets resolved onto the global timeline (HH:MM:SS.mmm).');
  transcript.push('');
  transcript.push('## Scene Breakdown');
  transcript.push('');
  let sceneOffset = 0;
  for (const scene of storyboard.scenes) {
    const plan = scenePlan.find((p) => p.id === scene.id);
    transcript.push(`### ${scene.title} (${scene.duration_seconds}s, starts at ${formatTimestamp(sceneOffset)})`);
    transcript.push('');
    if (plan) {
      transcript.push('```bash');
      transcript.push(`$ ${plan.command}`);
      transcript.push('```');
      if (plan.note) transcript.push(`*${plan.note}*`);
      for (const block of plan.blocks) {
        transcript.push(`*Captured Output (actual, sanitized excerpt — lines ${block.start}–${block.end} of ${block.total}):*`);
        transcript.push('```');
        transcript.push(block.text);
        transcript.push('```');
      }
      if (plan.id === 'scene-03') {
        transcript.push('*Non-fatal stderr (retained verbatim from the capture; exit status 0 is authoritative):*');
        transcript.push('```');
        transcript.push(syncOut.stderr.replace(/\n+$/, ''));
        transcript.push('```');
      }
    } else {
      transcript.push(`> 🎙️ **Narration**: ${scene.actions[0].content}`);
    }
    transcript.push('');
    transcript.push('**Captions (global timeline):**');
    for (const cap of scene.captions) {
      transcript.push(`- [${formatTimestamp(sceneOffset + cap.start_seconds)} - ${formatTimestamp(sceneOffset + cap.end_seconds)}]: "${cap.text}"`);
    }
    transcript.push('');
    sceneOffset += scene.duration_seconds;
  }
  transcript.push('## Limitations');
  transcript.push('');
  transcript.push('- This is a local candidate execution against an in-memory registry snapshot; the remote release gate (AC-16) is open.');
  transcript.push('- Standards files instruct agents; they do not enforce LLM compliance. CI gates remain mandatory.');
  transcript.push('- The measurement scorecard runs on synthetic fixtures only; it is not retention, market, or ROI evidence.');
  fs.writeFileSync(TRANSCRIPT_PATH, transcript.join('\n'));
  console.log(`✓ transcript: ${TRANSCRIPT_PATH}`);

  // ── 14. Capture manifest (identity + hashes) ─────────────────────────────
  const manifest = {
    schema_version: 1,
    campaign_id: storyboard.campaign_id,
    context_revision: contextRevision,
    capture: {
      started_at: captureStartedAt.toISOString(),
      finished_at: captureFinishedAt.toISOString(),
      candidate_commit: commitSha,
      working_tree_dirty: dirty,
      snapshot_tree_sha256: fixture.treeSha,
      snapshot_file_count: fixture.tree.length,
      cli_path: 'cli/dist/index.js',
      cli_sha256: cliSha256,
      node_version: process.version,
      host_platform: `${process.platform}-${process.arch}`
    },
    network_isolation: {
      preload: 'scripts/skill-tests/product-evidence-integration/network-preload.cjs',
      fixture_host: '127.0.0.1',
      fixture_requests_served: fixture.requests.length,
      credentials_forwarded: false
    },
    sanitization: {
      transform: [
        'disposable consumer directory -> ~/my-project',
        'disposable HOME directory -> ~',
        'macOS temp directories -> ~/my-project/tmp',
        'ANSI colour escape sequences -> stripped',
        'argv absolute paths -> node / ~/my-project / <candidate checkout>'
      ],
      replacements_applied: { ...sanitizationStats },
      raw_bytes_retained_in_public_checkout: false
    },
    commands: sanitizedOut.map((cmd) => ({
      label: cmd.label,
      display: cmd.display,
      argv_shape: cmd.argv.map((a) => (a.startsWith(REPO_ROOT) || a.startsWith(consumerDir) || a.startsWith(homeDir) ? '<path>' : a)),
      exit_status: cmd.status,
      duration_ms: Number(cmd.durationMs.toFixed(1)),
      stdout_sha256_sanitized: sha256(Buffer.from(cmd.stdout, 'utf8')),
      stdout_sha256_raw: cmd.stdoutRawSha256,
      stderr_sha256_sanitized: sha256(Buffer.from(cmd.stderr, 'utf8')),
      stderr_sha256_raw: cmd.stderrRawSha256,
      stderr_non_fatal_note: cmd.stderr.includes('fatal: not a git repository')
        ? 'stderr contains "fatal: not a git repository" from the disposable non-git consumer dir; exit status 0'
        : null
    })),
    artifacts: {
      consumer_root: ['AGENTS.md', 'CLAUDE.md', '.skills-lock.json', '.skillsrc', '.claude/skills', '.cursor/skills', '.codex/skills'],
      agents_md_sha256: sha256(Buffer.from(agentsRaw, 'utf8')),
      agents_md_lines: agentsRaw.replace(/\n+$/, '').split('\n').length,
      lockfile_entries: lockEntries.length,
      lockfile_agents: [...new Set(lockEntries.map((e) => lockJson.entries[e].agent))].sort(),
      mcp_config_absent: forbiddenArtifacts,
      mcp_disabled_note_present: agentsRaw.includes('ags mcp enable')
    },
    scenes: scenePlan.map((scene) => ({
      id: scene.id,
      duration_seconds: scene.duration,
      command: scene.command,
      claim_ref: scene.claimRef,
      rendered_lines: scene.renderedLines,
      excerpts: scene.blocks.map((b) => ({ start_line: b.start, end_line: b.end, total_lines: b.total }))
    })),
    mobile_verification: {
      viewport: '390x844',
      claim: 'key action lines legible at 390px viewport from actual captured text; full output remains in command-capture.log',
      frames: mobileFrames
    },
    assets: {},
    video: {
      file: 'demo.mp4',
      duration_seconds: Number(probeJson.format.duration),
      size_bytes: Number(probeJson.format.size),
      video: { codec: videoStream.codec_name, width: videoStream.width, height: videoStream.height, frame_rate: videoStream.r_frame_rate },
      audio: { codec: audioStream.codec_name, sample_rate: Number(audioStream.sample_rate), channels: audioStream.channels, description: 'anullsrc silence, no spoken narration' },
      subtitles: { codec: subStream.codec_name, embedded_caption_cues_verified: captionTexts.length }
    },
    proof_frames: proofFrames
  };

  const assetFiles = ['command-capture.log', 'demo.mp4', 'demo-captions.vtt', 'demo-transcript.md',
    ...proofFrames.map((p) => p.file), ...mobileFrames.map((f) => f.png), 'render-demo.mjs'];
  for (const file of assetFiles) {
    const abs = path.join(OUTPUT_DIR, file);
    if (!fs.existsSync(abs)) continue;
    manifest.assets[file] = { bytes: fs.statSync(abs).size, sha256: sha256File(abs) };
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ manifest: ${MANIFEST_PATH}`);

  await fixture.close();
  fs.rmSync(consumerDir, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
  fs.rmSync(framesDir, { recursive: true, force: true });

  console.log('🎉 capture + render complete');
}

function formatTimestamp(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// Shared context revision derived from the actual snapshot identity (assigned in main()).
let contextRevision = null;

main().catch((err) => {
  console.error('❌ render-demo failed:', err.message);
  process.exit(1);
});
