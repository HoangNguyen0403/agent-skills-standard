#!/usr/bin/env node
/**
 * PreToolUse hook: remind AI agent to call load_skills_for_files() before any code edit.
 * Installed by agent-skills-standard (ags sync). Remove via: ags hooks uninstall
 * Guaranteed to execute on any system with Node.js. Always exits 0 to never block work.
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

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

    const filePath = data.tool_input?.file_path || '';
    if (!filePath || shouldSkip(filePath)) process.exit(0);

    const fileName = path.basename(filePath);
    console.log(
      '[SKILL TRIGGER] Editing: ' + fileName + '\n' +
      '-> Call load_skills_for_files(files=[ "' + filePath + '" ]) on the ' +
      'agent-skills-standard MCP. It returns applicable SKILL.md rules, ' +
      'or nothing if no skills match this file type.'
    );
    process.exit(0);
  } catch {
    process.exit(0);
  }
});
