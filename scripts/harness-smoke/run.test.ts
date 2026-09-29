import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  checkCodexMcp,
  checkGhSkill,
  checkOpencodeAgents,
  checkSkillsInstaller,
  computeExitCode,
  renderResults,
  type CheckResult,
  type Exec,
} from './checks';

test('checkSkillsInstaller: pass when discovered matches registry skills', async () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-check-si-'));
  try {
    fs.mkdirSync(path.join(tempRepo, 'skills', 'cat1', 'skill-a'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempRepo, 'skills', 'cat1', 'skill-a', 'SKILL.md'),
      '# A',
    );

    const fakeExec: Exec = async (cmd, args) => {
      assert.equal(cmd, 'npx');
      assert.deepEqual(args, ['-y', 'skills@1.7.0', 'add', tempRepo, '--list', '-y']);
      return {
        code: 0,
        stdout: '│    skill-a\n│      Description\n',
        stderr: '',
        missing: false,
      };
    };

    const result = await checkSkillsInstaller(tempRepo, fakeExec);
    assert.equal(result.status, 'pass');
    assert.equal(result.name, 'skills-installer');
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('checkSkillsInstaller: fail when discovered has extra/missing skills', async () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-check-si-'));
  try {
    fs.mkdirSync(path.join(tempRepo, 'skills', 'cat1', 'skill-a'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempRepo, 'skills', 'cat1', 'skill-a', 'SKILL.md'),
      '# A',
    );

    const fakeExec: Exec = async () => {
      return {
        code: 0,
        stdout: '│    skill-extra\n│      Description\n',
        stderr: '',
        missing: false,
      };
    };

    const result = await checkSkillsInstaller(tempRepo, fakeExec);
    assert.equal(result.status, 'fail');
    assert.match(result.evidence, /Mismatch/);
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('checkSkillsInstaller: skip when binary is missing', async () => {
  const fakeExec: Exec = async () => ({
    code: 127,
    stdout: '',
    stderr: 'not found',
    missing: true,
  });

  const result = await checkSkillsInstaller('/tmp', fakeExec);
  assert.equal(result.status, 'skip');
  assert.match(result.evidence, /not found/i);
});

test('checkGhSkill: skip when gh is missing', async () => {
  const fakeExec: Exec = async () => ({
    code: 127,
    stdout: '',
    stderr: '',
    missing: true,
  });

  const result = await checkGhSkill('/tmp', fakeExec);
  assert.equal(result.status, 'skip');
});

test('checkGhSkill: skip when gh version is < 2.90.0', async () => {
  const fakeExec: Exec = async (cmd, args) => {
    if (args.includes('--version')) {
      return {
        code: 0,
        stdout: 'gh version 2.87.0 (2026-02-18)\n',
        stderr: '',
        missing: false,
      };
    }
    throw new Error('should not run publish command');
  };

  const result = await checkGhSkill('/tmp', fakeExec);
  assert.equal(result.status, 'skip');
  assert.match(result.evidence, /< 2\.90\.0/);
});

test('checkGhSkill: pass when version >= 2.90.0 and publish --dry-run succeeds', async () => {
  const fakeExec: Exec = async (cmd, args) => {
    if (args.includes('--version')) {
      return {
        code: 0,
        stdout: 'gh version 2.98.0 (2026-03-01)\n',
        stderr: '',
        missing: false,
      };
    }
    if (args.includes('publish') && args.includes('--dry-run')) {
      return { code: 0, stdout: 'Dry run successful', stderr: '', missing: false };
    }
    throw new Error(`Unexpected invocation: ${cmd} ${args.join(' ')}`);
  };

  const result = await checkGhSkill('/tmp', fakeExec);
  assert.equal(result.status, 'pass');
  assert.equal(result.version, '2.98.0');
});

test('checkGhSkill: fail when publish --dry-run fails', async () => {
  const fakeExec: Exec = async (cmd, args) => {
    if (args.includes('--version')) {
      return {
        code: 0,
        stdout: 'gh version 2.98.0 (2026-03-01)\n',
        stderr: '',
        missing: false,
      };
    }
    return {
      code: 1,
      stdout: '',
      stderr: 'Error: invalid repository format',
      missing: false,
    };
  };

  const result = await checkGhSkill('/tmp', fakeExec);
  assert.equal(result.status, 'fail');
  assert.match(result.evidence, /invalid repository format/);
});

// The real `ags mcp snippets` writes mcp-config-snippets/codex.toml in its cwd.
function writesSnippet(opts: { cwd: string }): void {
  const dir = path.join(opts.cwd, 'mcp-config-snippets');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'codex.toml'), '[mcp_servers.agent-skills-standard]\n');
}

test('checkCodexMcp: skip when codex is missing', async () => {
  const fakeExec: Exec = async (cmd, _args, opts) => {
    if (cmd === 'codex') {
      return { code: 127, stdout: '', stderr: '', missing: true };
    }
    writesSnippet(opts);
    return { code: 0, stdout: '', stderr: '', missing: false };
  };

  const result = await checkCodexMcp('/tmp', fakeExec);
  assert.equal(result.status, 'skip');
});

test('checkCodexMcp: fail with the ags error when no snippet is generated', async () => {
  const fakeExec: Exec = async (cmd) => {
    if (cmd === 'codex') {
      return { code: 0, stdout: '', stderr: '', missing: false };
    }
    return { code: 1, stdout: '', stderr: 'Invalid .skillsrc format', missing: false };
  };

  const result = await checkCodexMcp('/tmp', fakeExec);
  assert.equal(result.status, 'fail');
  assert.match(result.evidence, /no codex\.toml.*Invalid \.skillsrc format/);
});

test('checkCodexMcp: pass when agent-skills-standard is listed', async () => {
  const fakeExec: Exec = async (cmd, _args, opts) => {
    if (cmd === 'codex') {
      return {
        code: 0,
        stdout: [
          'Name                   Command  Args',
          'agent-skills-standard  npx      -y agent-skills-standard-mcp',
        ].join('\n'),
        stderr: '',
        missing: false,
      };
    }
    writesSnippet(opts);
    return { code: 0, stdout: '', stderr: '', missing: false };
  };

  const result = await checkCodexMcp('/tmp', fakeExec);
  assert.equal(result.status, 'pass');
  assert.match(result.evidence, /agent-skills-standard discovered/);
});

test('checkCodexMcp: fail when agent-skills-standard is not in list', async () => {
  const fakeExec: Exec = async (cmd, _args, opts) => {
    if (cmd === 'codex') {
      return {
        code: 0,
        stdout: [
          'Name          Command',
          'computer-use  client',
        ].join('\n'),
        stderr: '',
        missing: false,
      };
    }
    writesSnippet(opts);
    return { code: 0, stdout: '', stderr: '', missing: false };
  };

  const result = await checkCodexMcp('/tmp', fakeExec);
  assert.equal(result.status, 'fail');
});

test('checkOpencodeAgents: skip when opencode is missing', async () => {
  const fakeExec: Exec = async (cmd) => {
    if (cmd === 'opencode') {
      return { code: 127, stdout: '', stderr: '', missing: true };
    }
    return { code: 0, stdout: '', stderr: '', missing: false };
  };

  const result = await checkOpencodeAgents('/tmp', fakeExec);
  assert.equal(result.status, 'skip');
});

test('checkOpencodeAgents: pass when all emitted specialists appear in agent list', async () => {
  const fakeExec: Exec = async (cmd, args, opts) => {
    if (cmd === 'opencode') {
      return {
        code: 0,
        stdout: 'architecture-guard (subagent)\ncode-reviewer (subagent)\n',
        stderr: '',
        missing: false,
      };
    }
    // The real helper emits into the target dir passed as its last argument.
    const agentsDir = path.join(args[args.length - 1], '.opencode', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'architecture-guard.md'), 'agent');
    fs.writeFileSync(path.join(agentsDir, 'code-reviewer.md'), 'agent');
    return { code: 0, stdout: '', stderr: '', missing: false };
  };

  const result = await checkOpencodeAgents('/tmp', fakeExec);
  assert.equal(result.status, 'pass');
});

test('checkOpencodeAgents: fail when emitted specialist is missing from agent list', async () => {
  const fakeExec: Exec = async (cmd, args, opts) => {
    if (cmd === 'opencode') {
      return {
        code: 0,
        stdout: 'architecture-guard (subagent)\n',
        stderr: '',
        missing: false,
      };
    }
    // The real helper emits into the target dir passed as its last argument.
    const agentsDir = path.join(args[args.length - 1], '.opencode', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'architecture-guard.md'), 'agent');
    fs.writeFileSync(path.join(agentsDir, 'code-reviewer.md'), 'agent');
    return { code: 0, stdout: '', stderr: '', missing: false };
  };

  const result = await checkOpencodeAgents('/tmp', fakeExec);
  assert.equal(result.status, 'fail');
  assert.match(result.evidence, /Missing specialists/);
});

test('renderResults outputs markdown table with date, commit and check rows', () => {
  const results: CheckResult[] = [
    {
      name: 'skills-installer',
      status: 'pass',
      tool: 'skills@1.7.0',
      evidence: 'All 309 skills found',
    },
    {
      name: 'gh-skill',
      status: 'skip',
      tool: 'gh',
      version: '2.87.0',
      evidence: 'gh version < 2.90.0',
    },
    {
      name: 'codex-mcp',
      status: 'fail',
      tool: 'codex',
      evidence: 'Server not listed',
    },
  ];

  const md = renderResults(results, {
    date: '2026-09-28',
    commit: 'a1b2c3d',
  });

  assert.match(md, /Date: 2026-09-28/);
  assert.match(md, /Commit: a1b2c3d/);
  assert.match(md, /\|\s*Check\s*\|\s*Status\s*\|\s*Tool\s*\|\s*Version\s*\|\s*Evidence\s*\|/);
  assert.match(md, /\|\s*skills-installer\s*\|\s*pass\s*\|\s*skills@1\.7\.0\s*\|\s*-\s*\|\s*All 309 skills found\s*\|/);
  assert.match(md, /\|\s*gh-skill\s*\|\s*skip\s*\|\s*gh\s*\|\s*2\.87\.0\s*\|\s*gh version < 2\.90\.0\s*\|/);
  assert.match(md, /\|\s*codex-mcp\s*\|\s*fail\s*\|\s*codex\s*\|\s*-\s*\|\s*Server not listed\s*\|/);
});

test('renderResults escapes backslashes and pipes in evidence', () => {
  const results: CheckResult[] = [
    {
      name: 'escape-test',
      status: 'pass',
      evidence: 'C:\\path\\with\\slashes | and | pipes',
    },
  ];
  const md = renderResults(results, { date: '2026-09-28', commit: 'abc' });
  assert.match(md, /C:\\\\path\\\\with\\\\slashes \\| and \\| pipes/);
});

test('computeExitCode returns 0 if all pass or skip, 1 if any fail', () => {
  assert.equal(
    computeExitCode([
      { name: 'a', status: 'pass', evidence: 'ok' },
      { name: 'b', status: 'skip', evidence: 'missing' },
    ]),
    0,
  );

  assert.equal(
    computeExitCode([
      { name: 'a', status: 'pass', evidence: 'ok' },
      { name: 'b', status: 'fail', evidence: 'failed' },
    ]),
    1,
  );
});
