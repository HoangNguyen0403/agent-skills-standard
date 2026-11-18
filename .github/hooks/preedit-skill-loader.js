#!/usr/bin/env node
// ags-hook-version: 2.7.6
/**
 * PreToolUse hook: require load_skills_for_files() before any code edit.
 * Installed by agent-skills-standard (ags sync). Remove via: ags hooks uninstall
 * Advisory by default (exits 0). With AGS_HOOK_ENFORCE=1 (opt-in via
 * `ags hooks install --enforce`) it exits 2 when either:
 *   1. the target file matches the fixed identity/secret deny-list below, or
 *   2. the session transcript has no load_skills_for_files() call covering
 *      this file. Enforcement reads Claude Code's `transcript_path` from hook
 *      stdin; hosts that do not send it fail open with a warning.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '../../');
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SKIP_DIRS = [
  path.resolve(REPO_ROOT, '.claude'),
  path.resolve(REPO_ROOT, '.gemini'),
  path.resolve(REPO_ROOT, '.codex'),
  path.resolve(REPO_ROOT, '.github'),
  path.resolve(REPO_ROOT, '.cursor'),
  path.resolve(REPO_ROOT, '.roo'),
  path.resolve(REPO_ROOT, '.trae'),
  path.resolve(REPO_ROOT, '.opencode'),
  path.resolve(REPO_ROOT, '.kiro'),
  path.resolve(REPO_ROOT, '.windsurf'),
  path.resolve(REPO_ROOT, '.agents'),
  path.resolve(REPO_ROOT, '.vscode'),
];
const SKIP_FILES = [
  path.resolve(REPO_ROOT, 'AGENTS.md'),
  path.resolve(REPO_ROOT, 'CLAUDE.md'),
];

function shouldSkip(filePath) {
  try {
    const real = path.resolve(filePath);
    // Boundary-aware: '.github-extra' must not match '.github'.
    if (SKIP_DIRS.some(d => real === d || real.startsWith(d + path.sep))) return true;
    if (SKIP_FILES.includes(real)) return true;
    return false;
  } catch {
    return false;
  }
}

const ENFORCE = process.env.AGS_HOOK_ENFORCE === '1';
const DENY_BASENAMES = new Set(['SOUL.md', 'MEMORY.md']);
const DENY_PATTERNS = [
  /(^|[\\/])\.env(\.[^\\/]*)?$/i,
  /(^|[\\/])\.ssh([\\/]|$)/i,
  /credentials[^\\/]*\.(json|ya?ml)$/i,
];

function isDenied(filePath) {
  if (DENY_BASENAMES.has(path.basename(filePath))) return true;
  return DENY_PATTERNS.some(re => re.test(filePath));
}
// Mirrors match.ts
function normalizePath(p) {
  let norm = p.split('\\').join('/');
  while (norm.startsWith('./')) norm = norm.slice(2);
  return norm;
}

function matchesPattern(pattern, relPath) {
  const normPat = normalizePath(pattern);
  const normPath = normalizePath(relPath);
  if (normPat === '**') return true;
  if (!normPat.includes('/')) {
    const base = normPath.includes('/') ? normPath.slice(normPath.lastIndexOf('/') + 1) : normPath;
    let segRe = '^';
    for (let i = 0; i < normPat.length; i++) {
      const c = normPat[i];
      if (c === '*') segRe += '[^/]*';
      else if (c === '?') segRe += '[^/]';
      else segRe += '-\\^$*+?.()|[]{}'.indexOf(c) !== -1 ? '\\' + c : c;
    }
    segRe += '$';
    return new RegExp(segRe).test(base);
  }
  let reStr = '^';
  let i = 0;
  while (i < normPat.length) {
    if (normPat.startsWith('/**/', i)) {
      reStr += '(?:/.+)?/';
      i += 4;
    } else if (i === 0 && normPat.startsWith('**/', i)) {
      reStr += '(?:.+/)?';
      i += 3;
    } else if (normPat.startsWith('/**', i) && i + 3 === normPat.length) {
      reStr += '(?:/.*)?';
      i += 3;
    } else {
      const c = normPat[i];
      if (c === '*') reStr += '[^/]*';
      else if (c === '?') reStr += '[^/]';
      else reStr += '-\\^$*+?.()|[]{}'.indexOf(c) !== -1 ? '\\' + c : c;
      i++;
    }
  }
  reStr += '$';
  return new RegExp(reStr).test(normPath);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });

// ── Enforce mode: transcript verification ────────────────────────────────────
// Claude Code sends `transcript_path` (session JSONL) on hook stdin. A target
// file is covered when an assistant tool_use named *load_skills_for_files*
// listed a file that either equals the target's normalized project-relative
// path or shares its extension. Extension matching is deliberately lenient:
// loading rules for one *.ts file covers sibling *.ts edits. Only the last
// 5 MB is read, keeping the 5s hook timeout safe.
const TRANSCRIPT_MAX_BYTES = 5 * 1024 * 1024;

function readTranscriptTail(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - TRANSCRIPT_MAX_BYTES);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function toRelPath(p, projectDir) {
  // Resolve first so 'src/../Makefile' and 'Makefile' compare equal.
  return normalizePath(path.relative(projectDir, path.resolve(projectDir, p)));
}

function fileExtension(p) {
  const base = p.slice(p.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot).toLowerCase() : '';
}

function toolUseBlocks(entry) {
  const blocks = [];
  if (entry && entry.message && Array.isArray(entry.message.content)) {
    blocks.push(...entry.message.content);
  }
  if (entry && Array.isArray(entry.content)) blocks.push(...entry.content);
  return blocks;
}

// true = covering call found, false = readable but absent, null = unusable.
function transcriptCoversFile(transcriptPath, filePath, projectDir) {
  if (typeof transcriptPath !== 'string' || transcriptPath === '') return null;
  let text;
  try {
    text = readTranscriptTail(transcriptPath);
  } catch {
    return null;
  }
  const target = toRelPath(filePath, projectDir);
  const targetExt = fileExtension(target);
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('load_skills_for_files') === -1) continue;
    let entry;
    try { entry = JSON.parse(lines[i]); } catch { continue; }
    const blocks = toolUseBlocks(entry);
    for (let j = 0; j < blocks.length; j++) {
      const block = blocks[j];
      if (!block || block.type !== 'tool_use') continue;
      const name = typeof block.name === 'string' ? block.name : '';
      if (!name.endsWith('load_skills_for_files')) continue;
      const files = block.input && Array.isArray(block.input.files) ? block.input.files : [];
      for (let k = 0; k < files.length; k++) {
        if (typeof files[k] !== 'string') continue;
        const candidate = toRelPath(files[k], projectDir);
        if (candidate === target) return true;
        if (targetExt !== '' && fileExtension(candidate) === targetExt) return true;
      }
    }
  }
  return false;
}

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

    const filePath = data.tool_input?.file_path || '';
    if (!filePath) process.exit(0);
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const policyFile = path.join(projectDir, '.ags/policy.json');
    let policyDoc = null;
    if (fs.existsSync(policyFile)) {
      try {
        const raw = fs.readFileSync(policyFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schema_version === 1 && Array.isArray(parsed.rules)) {
          let hasConflict = false;
          let invalidShape = false;
          const patternActions = {};
          for (let i = 0; i < parsed.rules.length; i++) {
            const r = parsed.rules[i];
            if (r && r.kind === 'protected_path') {
              if (!Array.isArray(r.paths) || !r.paths.every(function(p) { return typeof p === 'string'; })) {
                invalidShape = true;
                break;
              }
              const act = r.action || 'warn';
              for (let j = 0; j < r.paths.length; j++) {
                const np = normalizePath(r.paths[j]);
                if (patternActions[np] && patternActions[np] !== act) {
                  hasConflict = true;
                  break;
                }
                patternActions[np] = act;
              }
              if (hasConflict) break;
            }
          }
          if (invalidShape) {
            console.error('[AGS POLICY] ignored: invalid protected_path rule shape');
          } else if (hasConflict) {
            console.error('[AGS POLICY] ignored: conflicting action for pattern');
          } else {
            policyDoc = parsed;
          }
        } else {
          console.error('[AGS POLICY] ignored: schema_version must be 1 and rules must be an array');
        }
      } catch (err) {
        console.error('[AGS POLICY] ignored: ' + (err && err.message ? err.message : String(err)));
      }
    }

    if (policyDoc) {
      const relPath = normalizePath(path.isAbsolute(filePath) ? path.relative(projectDir, filePath) : filePath);
      const matched = [];
      for (let i = 0; i < policyDoc.rules.length; i++) {
        const r = policyDoc.rules[i];
        if (r && r.kind === 'protected_path' && Array.isArray(r.paths)) {
          if (r.paths.some(function(p) { return matchesPattern(p, relPath); })) {
            matched.push(r);
          }
        }
      }

      if (matched.length > 0) {
        const BYPASS = process.env.AGS_POLICY_BYPASS === '1' || process.env.AGS_POLICY_BYPASS === 'true';
        if (BYPASS) {
          // Waives policy rules only; deny-list and transcript gates still apply.
          const waived = matched.map(function(m) { return m.id; }).join(', ');
          console.error('[AGS POLICY] bypass active: waived ' + waived);
        } else {
          const blockRule = matched.find(function(m) { return (m.action || 'warn') === 'block'; });
          if (blockRule) {
            if (ENFORCE) {
              console.error('[AGS BLOCKED] ' + blockRule.id + ': ' + blockRule.reason);
              process.exit(2);
            } else {
              console.error('[AGS POLICY WARN] ' + blockRule.id + ': ' + blockRule.reason);
            }
          }

          for (let i = 0; i < matched.length; i++) {
            const m = matched[i];
            if ((m.action || 'warn') === 'warn') {
              console.error('[AGS POLICY WARN] ' + m.id + ': ' + m.reason);
            }
          }
        }
      }
    }

    if (ENFORCE && isDenied(filePath)) {
      console.error(
        '[AGS BLOCKED] Refusing to edit ' + path.basename(filePath) + ': ' +
        'matches the default identity/secret deny-list (SOUL.md, MEMORY.md, .env*, .ssh/, credentials*.json|yaml).\n' +
        'If this edit is intentional, re-run `ags hooks install` (without --enforce) to return to advisory-only mode.'
      );
      process.exit(2);
    }

    // Harness / agent-config paths (.claude, .github, .codex, .agents, AGENTS.md,
    // CLAUDE.md, ...) skip only the skill-loading gate and the reminder below:
    // they are agent configuration, not skill-governed source. Policy rules and
    // the secret deny-list above already ran, so they still protect these paths.
    if (shouldSkip(filePath)) process.exit(0);

    if (ENFORCE) {
      const relTarget = toRelPath(filePath, projectDir);
      const covered = transcriptCoversFile(data.transcript_path, filePath, projectDir);
      if (covered === null) {
        console.error(
          '[AGS HOOK] No readable transcript_path on hook stdin; cannot verify ' +
          'load_skills_for_files(). Allowing this edit (fail-open).'
        );
      } else if (covered === false) {
        console.error(
          '[AGS BLOCKED] No load_skills_for_files() call covering ' + relTarget + ' in this session transcript.\n' +
          '-> Call load_skills_for_files(files=[ "' + relTarget + '" ]) on the agent-skills-standard MCP, then retry.\n' +
          '-> To return to advisory-only mode, re-run `ags hooks install` (without --enforce).'
        );
        process.exit(2);
      }
    }

    const fileName = path.basename(filePath);
    console.log(
      '[SKILL TRIGGER] Editing: ' + fileName + '\n' +
      '-> Call load_skills_for_files(files=[ "' + filePath + '" ]) on the ' +
      'agent-skills-standard MCP. It returns applicable SKILL.md rules, ' +
      'or nothing if no skills match this file type.\n' +
      '-> If this work spans a whole framework or migration, also call ' +
      'get_category_guide(category="...") for the framework-level map.'
    );
    process.exit(0);
  } catch {
    process.exit(0);
  }
});
