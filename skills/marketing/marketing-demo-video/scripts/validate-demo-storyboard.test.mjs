import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, cpSync, mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  validateStoryboard,
  compileWebVtt,
  compileTranscript,
  preflightSchema
} from './validate-demo-storyboard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = resolve(__dirname, '..');
const scriptPath = resolve(__dirname, 'validate-demo-storyboard.mjs');
const fixturePath = resolve(packageDir, 'assets/fixture-storyboard.json');

function getBaseFixture() {
  return JSON.parse(readFileSync(fixturePath, 'utf-8'));
}

function makeScene(id, durationSeconds, { actions, captions } = {}) {
  return {
    id,
    title: `Scene ${id}`,
    duration_seconds: durationSeconds,
    actions: actions ?? [{ type: 'narration', content: 'Narration line.', claim_ref: null }],
    captions: captions ?? [
      { start_seconds: 0.5, end_seconds: Math.min(1, durationSeconds / 2), text: 'Caption line.' }
    ]
  };
}

function makeStoryboard(scenes) {
  return {
    schema_version: 1,
    synthetic: true,
    initiative: 'test-initiative',
    campaign_id: 'test-campaign',
    title: 'Test Storyboard',
    context_revision: 'rev-test',
    rights: {
      license: 'CC0-1.0',
      audio_provenance: 'Synthetic silence declaration',
      assets_cleared: true,
      cleared_by: 'test-fixture'
    },
    cost: {
      mode: 'zero_cost_local',
      estimated_usd: 0,
      spending_cap_usd: 0,
      authorization: null
    },
    scenes
  };
}

function cueBlocks(vtt) {
  return vtt
    .split(/\n\n+/)
    .slice(1)
    .map((block) => block.replace(/\n+$/, '').split('\n'))
    .filter((lines) => lines.length >= 2 && lines[0].match(/^\d+$/) && lines[1].includes('-->'));
}

test('preflight locates the closed schema bundled beside the installed script', () => {
  const result = preflightSchema();
  assert.equal(result.ok, true);
  assert.equal(result.schema.additionalProperties, false);
  assert.ok(Array.isArray(result.schema.required) && result.schema.required.includes('scenes'));
});

test('well-formed synthetic storyboard passes with no issues', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10),
    makeScene('scene-02', 10, {
      actions: [
        { type: 'terminal_command', content: 'npm test', claim_ref: 'SRC-002' },
        { type: 'narration', content: 'Run the suite.', claim_ref: null }
      ]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.deepEqual(result.issues, []);
  assert.equal(result.valid, true);
});

test('summary reports total duration summed across scenes', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 7.5), makeScene('scene-02', 12.25)]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.summary.total_duration_seconds, 19.75);
});

test('bundled synthetic fixture satisfies the closed contract', () => {
  const result = validateStoryboard(getBaseFixture());
  assert.deepEqual(result.issues, []);
  assert.equal(result.valid, true);
});

test('unknown property at root is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.unauthorized_extra_field = 'unknown';
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('at root')));
});

test('unknown property in rights is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.rights.extra_claim = 'unsupported';
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('at rights')));
});

test('unknown property in cost is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.cost.bonus_rebate = 10;
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('at cost')));
});

test('unknown property in scene is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.scenes[0].transition_fx = 'wipe_left';
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('at scenes[0]')));
});

test('unknown property in action is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.scenes[0].actions[0].unsupported_meta = 42;
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('at scenes[0].actions[0]')));
});

test('unknown property in caption is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.scenes[0].captions[0].font_color = '#ffffff';
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('at scenes[0].captions[0]')));
});

test('non-finite scene duration is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', Number.NaN)]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('duration_seconds')));
});

test('non-finite cost estimate is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.cost.estimated_usd = Number.POSITIVE_INFINITY;
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('estimated_usd')));
});

test('inverted caption timecode is rejected', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [{ start_seconds: 5, end_seconds: 4, text: 'Inverted.' }]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('end_seconds')));
});

test('caption extending past its scene duration is rejected', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [{ start_seconds: 2, end_seconds: 10.5, text: 'Overflows.' }]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('exceeds scene duration')));
});

test('caption starting before the previous caption ends is rejected', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [
        { start_seconds: 0.5, end_seconds: 5, text: 'First.' },
        { start_seconds: 4, end_seconds: 6, text: 'Overlapping.' }
      ]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('captions[1]')));
});

test('narrated scene without captions is rejected', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      actions: [{ type: 'narration', content: 'Spoken but uncaptioned.', claim_ref: null }],
      captions: []
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes("'scene-01'") && issue.includes('no captions')));
});

test('evidenced command action without claim_ref is rejected', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      actions: [{ type: 'terminal_command', content: 'npm test', claim_ref: null }]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('claim_ref') && issue.includes('scenes[0].actions[0]')));
});

test('malformed claim_ref is rejected', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      actions: [{ type: 'terminal_command', content: 'npm test', claim_ref: 'not a reference' }]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('malformed')));
});

test('canonical SRC reference is accepted for a synthetic storyboard with an honest banner', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      actions: [{ type: 'terminal_command', content: 'npm test', claim_ref: 'SRC-001' }]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((warning) => warning.includes('structural identifiers only')));
});

test('paid_generative mode without authorization is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.cost = {
    mode: 'paid_generative',
    estimated_usd: 50,
    spending_cap_usd: 100,
    authorization: null
  };
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('authorization')));
});

test('paid_generative spend above cap is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.cost = {
    mode: 'paid_generative',
    estimated_usd: 150,
    spending_cap_usd: 100,
    authorization: 'DEC-002'
  };
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('Cost cap breach')));
});

test('unasserted rights clearance is rejected', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.rights.assets_cleared = false;
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('assets_cleared')));
});

test('WebVTT cues are shifted by cumulative preceding scene durations', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [{ start_seconds: 0.5, end_seconds: 7, text: 'First scene caption.' }]
    }),
    makeScene('scene-02', 20, {
      captions: [{ start_seconds: 2, end_seconds: 9.5, text: 'Second scene caption.' }]
    })
  ]);
  const vtt = compileWebVtt(storyboard);
  const blocks = cueBlocks(vtt);
  assert.equal(blocks.length, 2);
  assert.match(blocks[0][1], /^00:00:00\.500 --> 00:00:07\.000$/);
  assert.match(blocks[1][1], /^00:00:12\.000 --> 00:00:19\.500$/);
  assert.ok(!vtt.includes('00:00:02.000 --> 00:00:09.500'));
});

test('WebVTT cue starts are globally ordered and non-decreasing', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [
        { start_seconds: 0.5, end_seconds: 4, text: 'A.' },
        { start_seconds: 5, end_seconds: 9, text: 'B.' }
      ]
    }),
    makeScene('scene-02', 5, {
      captions: [
        { start_seconds: 0, end_seconds: 2, text: 'C.' },
        { start_seconds: 2.5, end_seconds: 4.5, text: 'D.' }
      ]
    })
  ]);
  const starts = cueBlocks(compileWebVtt(storyboard)).map((block) => block[1].split(' --> ')[0]);
  const ordered = [...starts].sort();
  assert.deepEqual(starts, ordered);
  assert.equal(starts[0], '00:00:00.500');
  assert.equal(starts[starts.length - 1], '00:00:12.500');
});

test('WebVTT timestamps round accumulated float offsets to the nearest millisecond', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 0.7, { captions: [{ start_seconds: 0, end_seconds: 0.5, text: 'A.' }] }),
    makeScene('scene-02', 0.1, { captions: [{ start_seconds: 0, end_seconds: 0.1, text: 'B.' }] }),
    makeScene('scene-03', 1, { captions: [{ start_seconds: 0, end_seconds: 0.5, text: 'C.' }] })
  ]);
  const blocks = cueBlocks(compileWebVtt(storyboard));
  assert.match(blocks[2][1], /^00:00:00\.800 --> 00:00:01\.300$/);
});

test('transcript reports captions on the global timeline', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [{ start_seconds: 0.5, end_seconds: 7, text: 'First scene caption.' }]
    }),
    makeScene('scene-02', 20, {
      captions: [{ start_seconds: 2, end_seconds: 9.5, text: 'Second scene caption.' }]
    })
  ]);
  const transcript = compileTranscript(storyboard);
  assert.ok(transcript.includes('global video timeline'));
  assert.ok(transcript.includes('00:00:12.000 - 00:00:19.500'));
  assert.ok(transcript.includes('starts at 00:00:10.000'));
});

test('copied flattened package runs from an unrelated working directory', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-package-'));
  const installedDir = join(sandbox, 'marketing-marketing-demo-video');
  const unrelatedCwd = join(sandbox, 'unrelated');
  try {
    cpSync(packageDir, installedDir, { recursive: true });
    cpSync(packageDir, unrelatedCwd, { recursive: true });
    rmSync(join(unrelatedCwd, 'assets'), { recursive: true, force: true });

    const storyboard = makeStoryboard([
      makeScene('scene-01', 10, {
        captions: [{ start_seconds: 0.5, end_seconds: 7, text: 'First scene caption.' }]
      }),
      makeScene('scene-02', 20, {
        captions: [{ start_seconds: 2, end_seconds: 9.5, text: 'Second scene caption.' }]
      })
    ]);
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));

    const run = spawnSync(
      process.execPath,
      [join(installedDir, 'scripts', 'validate-demo-storyboard.mjs'), boardPath, '--format', 'vtt'],
      { cwd: unrelatedCwd, encoding: 'utf8' }
    );

    assert.equal(run.status, 0, run.stderr);
    assert.ok(run.stdout.startsWith('WEBVTT'));
    assert.ok(run.stdout.includes('00:00:12.000 --> 00:00:19.500'));
    assert.ok(!run.stdout.includes('00:00:02.000 --> 00:00:09.500'));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('CLI rejects an invalid storyboard before emitting captions', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.rights.assets_cleared = false;
  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-invalid-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));
    const run = spawnSync(process.execPath, [scriptPath, boardPath, '--format', 'vtt'], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.equal(run.stdout.trim(), '');
    assert.ok(run.stderr.includes('assets_cleared'));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

function runCli(args, cwd) {
  return spawnSync(process.execPath, [scriptPath, ...args], { cwd, encoding: 'utf8' });
}

const INJECTED_CUE = 'ATTACKER-BLOCK';

function injectedPayload() {
  return `Legitimate line\n\n99\n09:00:00.000 --> 09:00:01.000\n${INJECTED_CUE}`;
}

test('caption text cannot inject extra WebVTT cue blocks or timings', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [{ start_seconds: 0.5, end_seconds: 5, text: injectedPayload() }]
    })
  ]);
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('captions[0]') && issue.includes('unsafe WebVTT payload')));

  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-inject-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));
    const run = runCli([boardPath, '--format', 'vtt'], sandbox);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.ok(!run.stdout.includes(INJECTED_CUE));
    assert.ok(!run.stderr.includes(INJECTED_CUE));
    const diagnostic = JSON.parse(run.stderr);
    assert.equal(diagnostic.error, 'STORYBOARD_INVALID');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('header title cannot inject WebVTT lines', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.title = `Demo\n\n09:00:00.000 --> 09:00:01.000\n${INJECTED_CUE}`;
  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes("'title'")));

  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-title-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));
    const run = runCli([boardPath, '--format', 'vtt'], sandbox);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.ok(!run.stderr.includes(INJECTED_CUE));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('serializer refuses unsafe payloads when called without validation', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [{ start_seconds: 0.5, end_seconds: 5, text: injectedPayload() }]
    })
  ]);
  assert.throws(
    () => compileWebVtt(storyboard),
    (err) => err.code === 'UNSAFE_VTT_PAYLOAD'
  );
});

test('legitimate multiline caption stays one cue with escaped markup', () => {
  const storyboard = makeStoryboard([
    makeScene('scene-01', 10, {
      captions: [{ start_seconds: 0.5, end_seconds: 5, text: 'Compare a < b & c > d\nSecond line' }]
    })
  ]);
  assert.equal(validateStoryboard(storyboard).valid, true);

  const blocks = cueBlocks(compileWebVtt(storyboard));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].length, 4);
  assert.equal(blocks[0][2], 'Compare a &lt; b &amp; c &gt; d');
  assert.equal(blocks[0][3], 'Second line');
});

test('oversized input is rejected before parsing', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-oversize-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, Buffer.alloc(1024 * 1024 + 1, 0x20));
    const run = runCli([boardPath, '--check'], sandbox);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, '');
    assert.equal(JSON.parse(run.stderr).error, 'INPUT_TOO_LARGE');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('non-regular input is rejected', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-directory-'));
  try {
    const directoryPath = join(sandbox, 'storyboard-dir');
    mkdirSync(directoryPath);
    const run = runCli([directoryPath, '--check'], sandbox);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, '');
    assert.equal(JSON.parse(run.stderr).error, 'INPUT_NOT_REGULAR_FILE');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('symlinked input is rejected', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-symlink-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, JSON.stringify(makeStoryboard([makeScene('scene-01', 10)])));
    const linkPath = join(sandbox, 'storyboard-link.json');
    symlinkSync(boardPath, linkPath);
    const run = runCli([linkPath, '--check'], sandbox);
    assert.equal(run.status, 2);
    assert.equal(JSON.parse(run.stderr).error, 'INPUT_SYMLINK_REJECTED');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('unknown property sentinel is not reflected in diagnostics', () => {
  const sentinel = 'PRIVATE_DIAGNOSTIC_SENTINEL';
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard[sentinel] = 'private value';
  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-sentinel-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));
    const run = runCli([boardPath, '--check'], sandbox);
    assert.equal(run.status, 1);
    assert.ok(!run.stdout.includes(sentinel));
    assert.ok(!run.stderr.includes(sentinel));
    const report = JSON.parse(run.stdout);
    assert.equal(report.valid, false);
    assert.ok(report.issues.some((issue) => issue.includes('at root')));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('malformed JSON reports a fixed code without parser or content leakage', () => {
  const sentinel = 'PRIVATE_DIAGNOSTIC_SENTINEL';
  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-json-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, `{"${sentinel}": broken`);
    const run = runCli([boardPath, '--check'], sandbox);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, '');
    assert.equal(JSON.parse(run.stderr).error, 'INPUT_INVALID_JSON');
    assert.ok(!run.stderr.includes(sentinel));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('invalid nested identity is not echoed in summary or diagnostics', () => {
  const sentinel = 'PRIVATE_INVALID_SUMMARY_SENTINEL';
  const storyboard = makeStoryboard([makeScene('scene-01', 10)]);
  storyboard.campaign_id = { private_contact: sentinel };
  storyboard.title = { private_contact: sentinel };

  const result = validateStoryboard(storyboard);
  assert.equal(result.valid, false);
  assert.equal(result.summary, null);
  assert.ok(!JSON.stringify(result).includes(sentinel));

  const sandbox = mkdtempSync(join(tmpdir(), 'demo-video-summary-'));
  try {
    const boardPath = join(sandbox, 'storyboard.json');
    writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));
    const run = runCli([boardPath, '--check'], sandbox);
    assert.equal(run.status, 1);
    assert.ok(!run.stdout.includes(sentinel));
    assert.ok(!run.stderr.includes(sentinel));
    const report = JSON.parse(run.stdout);
    assert.equal(report.valid, false);
    assert.equal(report.summary, null);
    assert.ok(report.issues.length >= 2);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('accepted storyboard summary is a typed projection', () => {
  const storyboard = makeStoryboard([makeScene('scene-01', 7.5), makeScene('scene-02', 12.25)]);
  const result = validateStoryboard(storyboard);
  assert.deepEqual(Object.keys(result.summary).sort(), [
    'campaign_id',
    'cost_mode',
    'initiative',
    'rights_cleared_assertion',
    'scene_count',
    'synthetic',
    'title',
    'total_duration_seconds'
  ]);
  assert.equal(typeof result.summary.scene_count, 'number');
  assert.equal(typeof result.summary.total_duration_seconds, 'number');
  assert.equal(typeof result.summary.rights_cleared_assertion, 'boolean');
});
