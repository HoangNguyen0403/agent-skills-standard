#!/usr/bin/env node
// ags-hook-version: 2.6.5
/**
 * PreToolUse hook: remind AI agent to call load_skills_for_files() before any code edit.
 * Installed by agent-skills-standard (ags sync). Remove via: ags hooks uninstall
 * Guaranteed to execute on any system with Node.js. Always exits 0 to never block work,
 * UNLESS AGS_HOOK_ENFORCE=1 is set in the environment (opt-in via
 * `ags hooks install --enforce`) AND the target file matches the small,
 * fixed, skill-agnostic deny-list below — see installStandardHookConfig's
 * doc comment in HookService.ts for why this can't be a per-skill
 * permissions.filesystem.deny check.
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
    if (SKIP_DIRS.some(d => real.startsWith(d))) return true;
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
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

    const filePath = data.tool_input?.file_path || '';
    if (!filePath || shouldSkip(filePath)) process.exit(0);
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
          const waived = matched.map(function(m) { return m.id; }).join(', ');
          console.error('[AGS POLICY] bypass active: waived ' + waived);
          process.exit(0);
        }

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

    if (ENFORCE && isDenied(filePath)) {
      console.error(
        '[AGS BLOCKED] Refusing to edit ' + path.basename(filePath) + ': ' +
        'matches the default identity/secret deny-list (SOUL.md, MEMORY.md, .env*, .ssh/, credentials*.json|yaml).\n' +
        'If this edit is intentional, re-run `ags hooks install` (without --enforce) to return to advisory-only mode.'
      );
      process.exit(2);
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
