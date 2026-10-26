#!/usr/bin/env node
/**
 * @file validate-demo-storyboard.mjs
 * @description Validates demo video storyboards against closed JSON schema contracts,
 * rights assertions, and spend caps. Compiles synchronized WebVTT captions or plaintext transcripts.
 *
 * NOTE: Structural and schema validation only.
 * - claim_ref validates reference format; it does NOT resolve or verify underlying evidence.
 * - authorization and assets_cleared are contract assertions, NOT authenticated human authorization or legal clearance.
 */

import {
  readFileSync,
  existsSync,
  realpathSync,
  lstatSync,
  openSync,
  closeSync,
  fstatSync,
  readSync,
  constants
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, exit } from 'node:process';

const ROOT_ALLOWED = new Set([
  'schema_version', 'synthetic', 'initiative', 'campaign_id', 'title',
  'context_revision', 'media_specs', 'rights', 'cost', 'scenes'
]);

const MEDIA_SPECS_ALLOWED = new Set([
  'resolution', 'framerate', 'audio_sample_rate_hz', 'aspect_ratio'
]);

const RIGHTS_ALLOWED = new Set([
  'license', 'audio_provenance', 'assets_cleared', 'cleared_by'
]);

const COST_ALLOWED = new Set([
  'mode', 'estimated_usd', 'spending_cap_usd', 'authorization'
]);

const SCENE_ALLOWED = new Set([
  'id', 'title', 'duration_seconds', 'actions', 'captions'
]);

const ACTION_ALLOWED = new Set([
  'type', 'content', 'claim_ref', 'expected_output'
]);

const CAPTION_ALLOWED = new Set([
  'start_seconds', 'end_seconds', 'text'
]);

// Actions that assert an observed command/UI step must declare a reference.
const EVIDENCED_ACTION_TYPES = new Set(['terminal_command', 'editor_action', 'ui_interaction']);

// Declared reference shape only: uppercase segment(s) plus a numeric suffix.
const CLAIM_REF_PATTERN = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-[0-9]{3,}$/;

const MAX_INPUT_BYTES = 1024 * 1024;

// Characters that must never reach the WebVTT serializer (tab and LF allowed).
const VTT_CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const VTT_BLANK_LINE_PATTERN = /\n[ \t]*\n/;

export class VttPayloadError extends Error {
  constructor(field) {
    super(`unsafe_vtt_payload:${field}`);
    this.name = 'VttPayloadError';
    this.code = 'UNSAFE_VTT_PAYLOAD';
  }
}

function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val);
}

/**
 * Structural safety for cue text: line breaks are legitimate, but blank lines,
 * cue timing arrows, and control characters would create unvalidated VTT blocks.
 */
export function normalizeVttPayload(text) {
  const normalized = String(text).replace(/\r\n?/g, '\n');
  if (normalized.includes('-->')) return { ok: false, reason: 'arrow' };
  if (VTT_CONTROL_CHAR_PATTERN.test(normalized)) return { ok: false, reason: 'control' };
  if (normalized.startsWith('\n') || normalized.endsWith('\n') || VTT_BLANK_LINE_PATTERN.test(normalized)) {
    return { ok: false, reason: 'blank_line' };
  }
  return { ok: true, value: normalized };
}

/** Escape cue text character references so markup cannot be injected while rendered text is preserved. */
export function escapeVttText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeVttHeaderTitle(title) {
  const normalized = String(title ?? '').replace(/\r\n?/g, '\n');
  if (normalized.includes('\n') || VTT_CONTROL_CHAR_PATTERN.test(normalized)) return null;
  return normalized.trim();
}

function checkUnknownKeys(obj, allowedSet, location, issues) {
  for (const key of Object.keys(obj)) {
    if (!allowedSet.has(key)) {
      // Never echo the unknown property name: diagnostics expose only known field paths.
      issues.push(`Unknown property at ${location}`);
    }
  }
}

function printHelp() {
  console.log(`Usage: validate-demo-storyboard.mjs <storyboard.json> [options]

Options:
  --check              Validate storyboard closed schema, rights assertions, and spend caps (default)
  --format vtt         Output WebVTT synchronized captions to stdout
  --format transcript  Output plain-text / Markdown transcript to stdout
  --format json        Output verification summary JSON (default with --check)
  --help               Show this help message

Input: exactly one regular file, at most 1 MiB. Symlinked, special, oversized,
unreadable, or changed-during-read inputs are rejected before parsing.

Exit codes: 0 = valid, 1 = invalid storyboard or unsafe caption payload,
2 = rejected input/schema preflight (fixed error code JSON on stderr).
`);
}

export function formatVttTimestamp(seconds) {
  // Round the total millisecond count once so summed floating-point offsets
  // (e.g. 0.1 + 0.2) never truncate to a one-millisecond-early timestamp.
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * Resolve scene-local caption offsets onto the global video timeline.
 * Caption times in a storyboard are relative to the start of their parent scene;
 * each scene begins after the summed duration of all preceding scenes.
 */
export function resolveTimeline(storyboard) {
  const cues = [];
  if (!Array.isArray(storyboard?.scenes)) return cues;

  let sceneOffset = 0;
  storyboard.scenes.forEach((scene, sceneIndex) => {
    const offset = sceneOffset;
    if (isFiniteNumber(scene?.duration_seconds) && scene.duration_seconds > 0) {
      sceneOffset += scene.duration_seconds;
    }
    if (!Array.isArray(scene?.captions)) return;

    for (const cap of scene.captions) {
      if (!isFiniteNumber(cap?.start_seconds) || !isFiniteNumber(cap?.end_seconds)) continue;
      cues.push({
        scene_id: typeof scene.id === 'string' ? scene.id : `scene-${sceneIndex + 1}`,
        scene_index: sceneIndex,
        scene_offset_seconds: offset,
        start_seconds: offset + cap.start_seconds,
        end_seconds: offset + cap.end_seconds,
        text: typeof cap.text === 'string' ? cap.text.trim() : ''
      });
    }
  });

  return cues.sort((a, b) => a.start_seconds - b.start_seconds || a.end_seconds - b.end_seconds);
}

export function validateStoryboard(storyboard) {
  const issues = [];
  const warnings = [];

  if (!storyboard || typeof storyboard !== 'object' || Array.isArray(storyboard)) {
    return {
      valid: false,
      issues: ['Storyboard must be a valid non-array JSON object'],
      warnings: [],
      limitations: [],
      summary: null
    };
  }

  // Root closed-schema check
  checkUnknownKeys(storyboard, ROOT_ALLOWED, 'root', issues);

  if (storyboard.schema_version !== 1) {
    issues.push("Unsupported 'schema_version': expected integer 1");
  }

  if (typeof storyboard.synthetic !== 'boolean') {
    issues.push("Missing or non-boolean required root field: 'synthetic'");
  }

  for (const field of ['initiative', 'campaign_id', 'title', 'context_revision']) {
    if (typeof storyboard[field] !== 'string' || storyboard[field].trim().length === 0) {
      issues.push(`Missing or empty required string field: '${field}'`);
    }
  }

  if (storyboard.campaign_id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storyboard.campaign_id)) {
    issues.push("Invalid 'campaign_id' format (must be kebab-case)");
  }

  if (typeof storyboard.title === 'string' && storyboard.title.trim().length > 0 && normalizeVttHeaderTitle(storyboard.title) === null) {
    issues.push("Root 'title' must be a single-line WebVTT header without line breaks or control characters");
  }

  // media_specs (optional)
  if (storyboard.media_specs !== undefined) {
    if (!storyboard.media_specs || typeof storyboard.media_specs !== 'object' || Array.isArray(storyboard.media_specs)) {
      issues.push("Invalid 'media_specs': must be an object");
    } else {
      checkUnknownKeys(storyboard.media_specs, MEDIA_SPECS_ALLOWED, 'media_specs', issues);
      const { resolution, framerate, audio_sample_rate_hz, aspect_ratio } = storyboard.media_specs;
      if (resolution !== undefined && !['1920x1080', '1280x720'].includes(resolution)) {
        issues.push("Invalid 'media_specs.resolution'",);
      }
      if (framerate !== undefined && ![24, 30, 60].includes(framerate)) {
        issues.push("Invalid 'media_specs.framerate'");
      }
      if (audio_sample_rate_hz !== undefined && ![44100, 48000].includes(audio_sample_rate_hz)) {
        issues.push("Invalid 'media_specs.audio_sample_rate_hz'");
      }
      if (aspect_ratio !== undefined && aspect_ratio !== '16:9') {
        issues.push("Invalid 'media_specs.aspect_ratio'");
      }
    }
  }

  // rights (required)
  if (!storyboard.rights || typeof storyboard.rights !== 'object' || Array.isArray(storyboard.rights)) {
    issues.push("Missing or non-object required 'rights' declaration");
  } else {
    checkUnknownKeys(storyboard.rights, RIGHTS_ALLOWED, 'rights', issues);
    const { license, audio_provenance, assets_cleared, cleared_by } = storyboard.rights;
    if (typeof license !== 'string' || license.trim().length === 0) {
      issues.push("Missing or empty 'rights.license'");
    }
    if (typeof audio_provenance !== 'string' || audio_provenance.trim().length === 0) {
      issues.push("Missing or empty 'rights.audio_provenance'");
    }
    if (typeof assets_cleared !== 'boolean') {
      issues.push("Missing or non-boolean 'rights.assets_cleared'");
    } else if (!assets_cleared) {
      issues.push("Rights gate assertion failure: 'rights.assets_cleared' must be asserted true before production");
    }
    if (typeof cleared_by !== 'string' || cleared_by.trim().length === 0) {
      issues.push("Missing or empty 'rights.cleared_by'");
    }
  }

  // cost (required)
  if (!storyboard.cost || typeof storyboard.cost !== 'object' || Array.isArray(storyboard.cost)) {
    issues.push("Missing or non-object required 'cost' declaration");
  } else {
    checkUnknownKeys(storyboard.cost, COST_ALLOWED, 'cost', issues);
    const { mode, estimated_usd, spending_cap_usd, authorization } = storyboard.cost;
    if (!['zero_cost_local', 'paid_generative'].includes(mode)) {
      issues.push("Invalid 'cost.mode': expected 'zero_cost_local' or 'paid_generative'");
    }
    if (!isFiniteNumber(estimated_usd) || estimated_usd < 0) {
      issues.push("Missing, non-finite, or negative 'cost.estimated_usd'");
    }
    if (!isFiniteNumber(spending_cap_usd) || spending_cap_usd < 0) {
      issues.push("Missing, non-finite, or negative 'cost.spending_cap_usd'");
    }

    if (mode === 'paid_generative') {
      if (typeof authorization !== 'string' || authorization.trim().length === 0) {
        issues.push("Cost governance gate: paid_generative mode requires explicit 'authorization' reference assertion (e.g. DEC-xxx)");
      }
      if (isFiniteNumber(estimated_usd) && isFiniteNumber(spending_cap_usd) && estimated_usd > spending_cap_usd) {
        issues.push(`Cost cap breach: estimated spend ($${estimated_usd}) exceeds approved spending cap ($${spending_cap_usd})`);
      }
    } else if (mode === 'zero_cost_local') {
      if (isFiniteNumber(estimated_usd) && estimated_usd > 0) {
        warnings.push(`zero_cost_local mode specifies non-zero estimated_usd: $${estimated_usd}; note zero_cost_local means zero mandatory provider fees (labor/compute separate)`);
      }
    }
  }

  // scenes (required array)
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) {
    issues.push("Missing or empty required 'scenes' array");
  } else {
    let totalDuration = 0;
    storyboard.scenes.forEach((scene, sIdx) => {
      const sceneLoc = `scenes[${sIdx}]`;
      if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
        issues.push(`Scene at ${sceneLoc} must be an object`);
        return;
      }
      checkUnknownKeys(scene, SCENE_ALLOWED, sceneLoc, issues);

      const sceneLabel = typeof scene.id === 'string' && /^scene-[0-9]{2,}$/.test(scene.id) ? scene.id : sceneLoc;
      if (typeof scene.id !== 'string' || !/^scene-[0-9]{2,}$/.test(scene.id)) {
        issues.push(`Scene at ${sceneLoc} has invalid 'id' format (expected ^scene-[0-9]{2,}$)`);
      }
      if (typeof scene.title !== 'string' || scene.title.trim().length === 0) {
        issues.push(`Scene '${sceneLabel}' is missing or has empty 'title'`);
      }
      if (!isFiniteNumber(scene.duration_seconds) || scene.duration_seconds <= 0) {
        issues.push(`Scene '${sceneLabel}' must have duration_seconds as a positive finite number`);
      } else {
        totalDuration += scene.duration_seconds;
      }

      // actions
      if (!Array.isArray(scene.actions) || scene.actions.length === 0) {
        issues.push(`Scene '${sceneLabel}' must contain a non-empty 'actions' array`);
      } else {
        scene.actions.forEach((act, aIdx) => {
          const actLoc = `${sceneLoc}.actions[${aIdx}]`;
          if (!act || typeof act !== 'object' || Array.isArray(act)) {
            issues.push(`Action at ${actLoc} must be an object`);
            return;
          }
          checkUnknownKeys(act, ACTION_ALLOWED, actLoc, issues);

          if (!['terminal_command', 'editor_action', 'ui_interaction', 'narration'].includes(act.type)) {
            issues.push(`Action at ${actLoc} has an unsupported 'type'`);
          }
          if (typeof act.content !== 'string' || act.content.trim().length === 0) {
            issues.push(`Action at ${actLoc} missing or empty 'content'`);
          }
          if (act.claim_ref !== undefined && act.claim_ref !== null && typeof act.claim_ref !== 'string') {
            issues.push(`Action at ${actLoc} has invalid 'claim_ref' (must be string or null)`);
          }
          if (act.expected_output !== undefined && typeof act.expected_output !== 'string') {
            issues.push(`Action at ${actLoc} has non-string 'expected_output'`);
          }

          // Evidence declaration prerequisites: claiming an executed command or UI
          // step without a reference is a structural contract failure.
          if (EVIDENCED_ACTION_TYPES.has(act.type) && (typeof act.claim_ref !== 'string' || act.claim_ref.trim().length === 0)) {
            issues.push(`Action at ${actLoc} must declare a non-empty 'claim_ref' reference for the evidenced step`);
          }
          if (typeof act.claim_ref === 'string' && act.claim_ref.trim().length > 0) {
            const ref = act.claim_ref.trim();
            if (!CLAIM_REF_PATTERN.test(ref)) {
              issues.push(`Action at ${actLoc} has malformed 'claim_ref' (expected uppercase segments plus numeric suffix, e.g. 'SRC-001')`);
            }
          }
        });
      }

      // captions
      if (!Array.isArray(scene.captions)) {
        issues.push(`Scene '${sceneLabel}' is missing 'captions' array`);
      } else {
        // Caption offsets are scene-local; enforcing in-scene order keeps the
        // resolved global WebVTT cue sequence monotonically increasing.
        let previousCaptionEnd = 0;
        scene.captions.forEach((cap, cIdx) => {
          const capLoc = `${sceneLoc}.captions[${cIdx}]`;
          if (!cap || typeof cap !== 'object' || Array.isArray(cap)) {
            issues.push(`Caption at ${capLoc} must be an object`);
            return;
          }
          checkUnknownKeys(cap, CAPTION_ALLOWED, capLoc, issues);

          if (!isFiniteNumber(cap.start_seconds) || cap.start_seconds < 0) {
            issues.push(`Caption at ${capLoc} has non-finite or negative start_seconds`);
          }
          if (!isFiniteNumber(cap.end_seconds) || cap.end_seconds <= (cap.start_seconds ?? 0)) {
            issues.push(`Caption at ${capLoc} has non-finite end_seconds or end_seconds <= start_seconds`);
          }
          if (isFiniteNumber(scene.duration_seconds) && isFiniteNumber(cap.end_seconds) && cap.end_seconds > scene.duration_seconds) {
            issues.push(`Caption at ${capLoc} end_seconds (${cap.end_seconds}s) exceeds scene duration (${scene.duration_seconds}s)`);
          }
          if (typeof cap.text !== 'string' || cap.text.trim().length === 0) {
            issues.push(`Caption at ${capLoc} has missing or empty text`);
          } else if (!normalizeVttPayload(cap.text).ok) {
            issues.push(`Caption at ${capLoc} has an unsafe WebVTT payload (blank line, '-->' arrow, or control character)`);
          }
          if (isFiniteNumber(cap.start_seconds) && cap.start_seconds < previousCaptionEnd) {
            issues.push(`Caption at ${capLoc} start_seconds (${cap.start_seconds}s) precedes the previous caption end (${previousCaptionEnd}s) within the same scene`);
          }
          if (isFiniteNumber(cap.end_seconds)) {
            previousCaptionEnd = cap.end_seconds;
          }
        });

        const hasNarration = Array.isArray(scene.actions) && scene.actions.some(act => act?.type === 'narration');
        if (hasNarration && scene.captions.length === 0) {
          issues.push(`Scene '${sceneLabel}' declares narration actions but no captions; narrated scenes require at least one synchronized caption`);
        }
      }
    });

    if (totalDuration > 300) {
      warnings.push(`Total demo duration is ${totalDuration}s; recommended length is under 180s for product demo videos`);
    }
  }

  if (storyboard.synthetic === true) {
    warnings.push('Synthetic contract fixture: declared claim references are structural identifiers only; no evidence, recording, or product execution is asserted');
  }

  const limitations = [
    'structural_validation_only',
    'claim_ref_is_traceability_format_not_evidence_resolution',
    'authorization_and_rights_are_contract_assertions_not_legal_or_human_verification',
    'actual_campaign_export_not_evaluated'
  ];

  // Summary is a typed projection of an accepted storyboard. Rejected input
  // yields null so no caller-supplied identity or nested value is echoed back.
  const summary = issues.length === 0
    ? {
        initiative: storyboard.initiative,
        campaign_id: storyboard.campaign_id,
        title: storyboard.title,
        synthetic: Boolean(storyboard.synthetic),
        scene_count: storyboard.scenes.length,
        total_duration_seconds: storyboard.scenes.reduce(
          (sum, scene) => sum + (isFiniteNumber(scene?.duration_seconds) ? scene.duration_seconds : 0),
          0
        ),
        cost_mode: storyboard.cost.mode,
        rights_cleared_assertion: storyboard.rights.assets_cleared === true
      }
    : null;

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    limitations,
    summary
  };
}

export function compileWebVtt(storyboard) {
  const title = normalizeVttHeaderTitle(storyboard?.title ?? 'Demo Video Captions');
  if (title === null) throw new VttPayloadError('title');

  const lines = ['WEBVTT - ' + (title || 'Demo Video Captions'), ''];
  const cues = resolveTimeline(storyboard);

  cues.forEach((cue, index) => {
    const payload = normalizeVttPayload(cue.text);
    if (!payload.ok) throw new VttPayloadError(`captions[${index}]`);

    lines.push(String(index + 1));
    lines.push(`${formatVttTimestamp(cue.start_seconds)} --> ${formatVttTimestamp(cue.end_seconds)}`);
    for (const payloadLine of payload.value.split('\n')) {
      lines.push(escapeVttText(payloadLine.trimEnd()));
    }
    lines.push('');
  });

  return lines.join('\n');
}

export function compileTranscript(storyboard) {
  const lines = [
    `# Video Transcript: ${storyboard.title || 'Demo Video'}`,
    `Campaign: \`${storyboard.campaign_id || 'n/a'}\` | Context Revision: \`${storyboard.context_revision || 'n/a'}\``,
    `Rights License Assertion: ${storyboard.rights?.license || 'n/a'} | Audio Provenance: ${storyboard.rights?.audio_provenance || 'n/a'}`,
    `Synthetic Contract: ${storyboard.synthetic ? 'Yes (fictional teaching example)' : 'No'}`,
    '',
    'Caption times below are resolved from scene-local offsets onto the global video timeline (HH:MM:SS.mmm).',
    '',
    '## Scene Breakdown & Narration',
    ''
  ];

  if (Array.isArray(storyboard.scenes)) {
    let sceneOffset = 0;
    for (const scene of storyboard.scenes) {
      const startOffset = sceneOffset;
      if (isFiniteNumber(scene.duration_seconds) && scene.duration_seconds > 0) {
        sceneOffset += scene.duration_seconds;
      }
      lines.push(`### ${scene.title} (${scene.duration_seconds}s, starts at ${formatVttTimestamp(startOffset)})`);
      lines.push('');
      for (const action of scene.actions || []) {
        if (action.type === 'narration') {
          lines.push(`> 🎙️ **Narration**: ${action.content}`);
        } else if (action.type === 'terminal_command') {
          lines.push(`\`\`\`bash\n$ ${action.content}\n\`\`\``);
          if (action.expected_output) {
            lines.push(`*Expected Output (Contract Declaration):*`);
            lines.push(`\`\`\`\n${action.expected_output}\n\`\`\``);
          }
        } else {
          lines.push(`*Action (${action.type})*: ${action.content}`);
        }
      }
      lines.push('');
      if (Array.isArray(scene.captions) && scene.captions.length > 0) {
        lines.push('**Captions (global timeline):**');
        for (const cap of scene.captions) {
          const start = formatVttTimestamp(startOffset + cap.start_seconds);
          const end = formatVttTimestamp(startOffset + cap.end_seconds);
          lines.push(`- [${start} - ${end}]: "${cap.text}"`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// Self-locating schema preflight helper
export function preflightSchema() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaPath = resolve(__dirname, '../assets/demo-storyboard.schema.json');
  if (!existsSync(schemaPath)) {
    return { ok: false, code: 'SCHEMA_MISSING' };
  }
  try {
    const raw = readFileSync(schemaPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ok: true, schemaPath, schema: parsed };
  } catch {
    return { ok: false, code: 'SCHEMA_UNREADABLE' };
  }
}

/**
 * Read a caller-selected storyboard through a bounded, non-blocking regular-file
 * path. Size and file-type are checked from metadata before any read, symlinks are
 * rejected outright, and the descriptor is re-verified after reading.
 */
export function readBoundedStoryboardInput(filePath) {
  const targetPath = resolve(filePath);

  let inspected;
  try {
    inspected = lstatSync(targetPath);
  } catch {
    return { ok: false, code: 'INPUT_UNREADABLE' };
  }
  if (inspected.isSymbolicLink()) return { ok: false, code: 'INPUT_SYMLINK_REJECTED' };
  if (!inspected.isFile()) return { ok: false, code: 'INPUT_NOT_REGULAR_FILE' };
  if (inspected.size > MAX_INPUT_BYTES) return { ok: false, code: 'INPUT_TOO_LARGE' };

  let descriptor;
  try {
    const noFollow = constants.O_NOFOLLOW ?? 0;
    descriptor = openSync(targetPath, constants.O_RDONLY | noFollow | constants.O_NONBLOCK);
    const before = fstatSync(descriptor);
    if (!before.isFile()) return { ok: false, code: 'INPUT_NOT_REGULAR_FILE' };
    if (before.size > MAX_INPUT_BYTES) return { ok: false, code: 'INPUT_TOO_LARGE' };

    const scratch = Buffer.allocUnsafe(Math.min(before.size, MAX_INPUT_BYTES) + 1);
    let totalBytes = 0;
    while (totalBytes < scratch.length) {
      const bytesRead = readSync(descriptor, scratch, totalBytes, scratch.length - totalBytes, null);
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
    }
    const after = fstatSync(descriptor);

    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      totalBytes !== after.size
    ) {
      return { ok: false, code: 'INPUT_CHANGED' };
    }
    if (totalBytes > MAX_INPUT_BYTES) return { ok: false, code: 'INPUT_TOO_LARGE' };

    return { ok: true, buffer: scratch.subarray(0, totalBytes) };
  } catch {
    return { ok: false, code: 'INPUT_UNREADABLE' };
  } finally {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* descriptor already closed */ }
    }
  }
}

// CLI Execution
// Compare real paths so an installed package reached through a symlinked root
// (e.g. macOS /var -> /private/var) still runs instead of silently exiting.
function isEntrypoint() {
  if (!process.argv[1]) return false;
  const modulePath = fileURLToPath(import.meta.url);
  try {
    return realpathSync(process.argv[1]) === realpathSync(modulePath);
  } catch {
    return resolve(process.argv[1]) === resolve(modulePath);
  }
}

if (isEntrypoint()) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    exit(0);
  }

  // Public diagnostics are machine-readable fixed codes only; no caller text,
  // property names, filesystem paths, or parser exception text is reflected.
  const failInput = (code) => {
    console.error(JSON.stringify({ error: code }));
    exit(2);
  };

  const preflight = preflightSchema();
  if (!preflight.ok) failInput(preflight.code);

  const filePath = args[0];
  const formatIdx = args.indexOf('--format');
  const format = formatIdx !== -1 && args[formatIdx + 1] ? args[formatIdx + 1] : 'json';

  const input = readBoundedStoryboardInput(filePath);
  if (!input.ok) failInput(input.code);

  let storyboard;
  try {
    storyboard = JSON.parse(input.buffer.toString('utf8'));
  } catch {
    failInput('INPUT_INVALID_JSON');
  }

  const result = validateStoryboard(storyboard);

  if (format === 'vtt' || format === 'transcript') {
    if (!result.valid) {
      console.error(JSON.stringify({ error: 'STORYBOARD_INVALID', issues: result.issues }));
      exit(1);
    }
    try {
      console.log(format === 'vtt' ? compileWebVtt(storyboard) : compileTranscript(storyboard));
    } catch (err) {
      if (err?.code === 'UNSAFE_VTT_PAYLOAD') {
        console.error(JSON.stringify({ error: 'UNSAFE_VTT_PAYLOAD' }));
        exit(1);
      }
      console.error(JSON.stringify({ error: 'INTERNAL_ERROR' }));
      exit(2);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) exit(1);
  }
}
