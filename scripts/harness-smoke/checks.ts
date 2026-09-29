import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseCodexMcpList,
  parseGhVersion,
  parseOpencodeAgentList,
  parseSkillsList,
  registrySkillNames,
} from './parse';

export type Status = 'pass' | 'fail' | 'skip';

export interface CheckResult {
  name: string;
  status: Status;
  evidence: string;
  tool?: string;
  version?: string;
}

export interface Exec {
  (
    cmd: string,
    args: string[],
    opts: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
  ): Promise<{
    code: number;
    stdout: string;
    stderr: string;
    missing: boolean;
  }>;
}

/**
 * Runs a real binary with no shell. Output goes to temp files, not pipes:
 * some CLIs (OpenCode's Bun build) exit before flushing a piped stdout, which
 * silently truncates long listings.
 */
export const defaultExec: Exec = async (cmd, args, opts) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-exec-'));
  const outPath = path.join(dir, 'stdout');
  const errPath = path.join(dir, 'stderr');
  const outFd = fs.openSync(outPath, 'w');
  const errFd = fs.openSync(errPath, 'w');
  try {
    const result = await new Promise<{ code: number; missing: boolean; error?: string }>(
      (resolve) => {
        const child = spawn(cmd, args, {
          cwd: opts.cwd,
          env: {
            ...process.env,
            OPENAI_API_KEY: 'sk-invalid',
            OPENAI_BASE_URL: 'http://127.0.0.1:1',
            ANTHROPIC_API_KEY: 'sk-ant-invalid',
            ANTHROPIC_BASE_URL: 'http://127.0.0.1:1',
            DISABLE_TELEMETRY: '1',
            ...opts.env,
          },
          stdio: ['ignore', outFd, errFd],
          timeout: opts.timeoutMs,
        });
        child.on('error', (err: NodeJS.ErrnoException) =>
          resolve({ code: 127, missing: err.code === 'ENOENT', error: err.message }),
        );
        child.on('close', (code, signal) =>
          resolve({ code: code ?? (signal ? 124 : 1), missing: false }),
        );
      },
    );
    fs.closeSync(outFd);
    fs.closeSync(errFd);
    return {
      code: result.code,
      stdout: fs.readFileSync(outPath, 'utf8'),
      stderr: result.error ?? fs.readFileSync(errPath, 'utf8'),
      missing: result.missing,
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Check that skills installer discovers registry skills without leakage.
 */
export async function checkSkillsInstaller(
  repoRoot: string,
  exec: Exec,
): Promise<CheckResult> {
  const tool = 'skills@1.7.0';
  const res = await exec(
    'npx',
    ['-y', tool, 'add', repoRoot, '--list', '-y'],
    {
      cwd: repoRoot,
      env: {},
      timeoutMs: 60000,
    },
  );

  if (res.missing) {
    return {
      name: 'skills-installer',
      status: 'skip',
      tool,
      evidence: `Binary npx not found: ${res.stderr.trim() || 'ENOENT'}`,
    };
  }

  if (res.code !== 0) {
    return {
      name: 'skills-installer',
      status: 'fail',
      tool,
      evidence: `skills add --list failed (exit ${res.code}): ${res.stderr.trim() || res.stdout.trim()}`,
    };
  }

  const found = parseSkillsList(res.stdout);
  const expected = registrySkillNames(repoRoot);

  const extra = found.filter((s) => !expected.includes(s));
  const missing = expected.filter((s) => !found.includes(s));

  if (extra.length === 0 && missing.length === 0) {
    return {
      name: 'skills-installer',
      status: 'pass',
      tool,
      evidence: `Discovered all ${expected.length} registry skills with no leakage`,
    };
  }

  const extraStr = extra.slice(0, 10).join(', ') + (extra.length > 10 ? '...' : '');
  const missingStr =
    missing.slice(0, 10).join(', ') + (missing.length > 10 ? '...' : '');

  return {
    name: 'skills-installer',
    status: 'fail',
    tool,
    evidence: `Mismatch: found ${found.length}, expected ${expected.length}. Extra: [${extraStr}]. Missing: [${missingStr}]`,
  };
}

/**
 * Check that gh CLI (>= 2.90.0) can publish skills in dry-run mode.
 */
export async function checkGhSkill(
  repoRoot: string,
  exec: Exec,
): Promise<CheckResult> {
  const tool = 'gh';
  const verRes = await exec('gh', ['--version'], {
    cwd: repoRoot,
    env: {},
    timeoutMs: 10000,
  });

  if (verRes.missing) {
    return {
      name: 'gh-skill',
      status: 'skip',
      tool,
      evidence: 'Binary gh not found',
    };
  }

  const version = parseGhVersion(verRes.stdout);
  if (!version) {
    return {
      name: 'gh-skill',
      status: 'skip',
      tool,
      evidence: `Could not parse gh version: ${verRes.stdout.trim() || verRes.stderr.trim()}`,
    };
  }

  const versionStr = version.join('.');
  if (version[0] < 2 || (version[0] === 2 && version[1] < 90)) {
    return {
      name: 'gh-skill',
      status: 'skip',
      tool,
      version: versionStr,
      evidence: `gh version ${versionStr} < 2.90.0 (gh skill extension requires >= 2.90.0)`,
    };
  }

  const pubRes = await exec('gh', ['skill', 'publish', '--dry-run'], {
    cwd: repoRoot,
    env: {},
    timeoutMs: 60000,
  });

  if (pubRes.missing) {
    return {
      name: 'gh-skill',
      status: 'skip',
      tool,
      version: versionStr,
      evidence: 'Binary gh not found',
    };
  }

  if (pubRes.code === 0) {
    return {
      name: 'gh-skill',
      status: 'pass',
      tool,
      version: versionStr,
      evidence: 'gh skill publish --dry-run succeeded',
    };
  }

  const stderrTail =
    pubRes.stderr.trim().split('\n').slice(-5).join(' ') ||
    pubRes.stdout.trim().split('\n').slice(-5).join(' ');

  return {
    name: 'gh-skill',
    status: 'fail',
    tool,
    version: versionStr,
    evidence: `gh skill publish --dry-run failed (exit ${pubRes.code}): ${stderrTail}`,
  };
}

/**
 * Check that Codex discovers agent-skills-standard in its config.toml.
 */
export async function checkCodexMcp(
  repoRoot: string,
  exec: Exec,
): Promise<CheckResult> {
  const tool = 'codex';
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-codex-'));

  try {
    const skillsrc = {
      registry: 'https://github.com/HoangNguyen0403/agent-skills-standard',
      agents: ['codex'],
      skills: {},
      mcp: {
        enabled: true,
        scope: 'snippets-only',
        prompted: true,
      },
    };
    fs.writeFileSync(
      path.join(tmpDir, '.skillsrc'),
      JSON.stringify(skillsrc, null, 2),
    );

    const cliDist = path.join(repoRoot, 'cli', 'dist', 'index.js');
    const cliSrc = path.join(repoRoot, 'cli', 'src', 'index.ts');
    const [cmd, args] = fs.existsSync(cliDist)
      ? ['node', [cliDist, 'mcp', 'snippets']]
      : ['node', ['--import', 'tsx', cliSrc, 'mcp', 'snippets']];

    const snippetRes = await exec(cmd, args, {
      cwd: tmpDir,
      env: {},
      timeoutMs: 30000,
    });

    const snippetFile = path.join(tmpDir, 'mcp-config-snippets', 'codex.toml');
    if (!fs.existsSync(snippetFile)) {
      return {
        name: 'codex-mcp',
        status: 'fail',
        tool,
        evidence: `ags mcp snippets produced no codex.toml (exit ${snippetRes.code}): ${lastLine(snippetRes.stderr || snippetRes.stdout)}`,
      };
    }
    const codexHome = path.join(tmpDir, 'codex-home');
    fs.mkdirSync(codexHome, { recursive: true });
    fs.copyFileSync(snippetFile, path.join(codexHome, 'config.toml'));

    const res = await exec('codex', ['mcp', 'list'], {
      cwd: tmpDir,
      env: { CODEX_HOME: codexHome },
      timeoutMs: 30000,
    });

    if (res.missing) {
      return {
        name: 'codex-mcp',
        status: 'skip',
        tool,
        evidence: 'Binary codex not found',
      };
    }

    if (res.code !== 0) {
      return {
        name: 'codex-mcp',
        status: 'fail',
        tool,
        evidence: `codex mcp list failed (exit ${res.code}): ${res.stderr.trim() || res.stdout.trim()}`,
      };
    }

    const servers = parseCodexMcpList(res.stdout);
    if (servers.includes('agent-skills-standard')) {
      return {
        name: 'codex-mcp',
        status: 'pass',
        tool,
        evidence: 'agent-skills-standard discovered in codex mcp list',
      };
    }

    return {
      name: 'codex-mcp',
      status: 'fail',
      tool,
      evidence: `agent-skills-standard not found in codex mcp list: [${servers.join(', ')}]`,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Check that OpenCode discovers all emitted specialists.
 */
export async function checkOpencodeAgents(
  repoRoot: string,
  exec: Exec,
): Promise<CheckResult> {
  const tool = 'opencode';
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-opencode-'));

  try {
    const helper = path.join(
      repoRoot,
      'scripts',
      'harness-smoke',
      'emit-specialists.ts',
    );

    // tsx resolves from the working directory, so run the helper from the repo.
    const emitRes = await exec('node', ['--import', 'tsx', helper, tmpDir], {
      cwd: repoRoot,
      env: {},
      timeoutMs: 30000,
    });

    const res = await exec('opencode', ['agent', 'list'], {
      cwd: tmpDir,
      env: {},
      timeoutMs: 30000,
    });

    if (res.missing) {
      return {
        name: 'opencode-agents',
        status: 'skip',
        tool,
        evidence: 'Binary opencode not found',
      };
    }

    if (res.code !== 0) {
      return {
        name: 'opencode-agents',
        status: 'fail',
        tool,
        evidence: `opencode agent list failed (exit ${res.code}): ${res.stderr.trim() || res.stdout.trim()}`,
      };
    }

    const found = parseOpencodeAgentList(res.stdout);
    const agentsDir = path.join(tmpDir, '.opencode', 'agents');
    const emitted = fs.existsSync(agentsDir)
      ? fs
          .readdirSync(agentsDir)
          .filter((f) => f.endsWith('.md'))
          .map((f) => path.basename(f, '.md'))
      : [];

    if (emitted.length === 0) {
      return {
        name: 'opencode-agents',
        status: 'fail',
        tool,
        evidence: `No specialists were emitted to ${agentsDir} (exit ${emitRes.code}): ${lastLine(emitRes.stderr || emitRes.stdout)}`,
      };
    }

    const missing = emitted.filter((name) => !found.includes(name));
    if (missing.length === 0) {
      return {
        name: 'opencode-agents',
        status: 'pass',
        tool,
        evidence: `All ${emitted.length} emitted specialists discovered by opencode`,
      };
    }

    return {
      name: 'opencode-agents',
      status: 'fail',
      tool,
      evidence: `Missing specialists in opencode agent list: [${missing.join(', ')}]`,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Render check results as a markdown table.
 */
export function renderResults(
  results: CheckResult[],
  meta: { date: string; commit: string },
): string {
  const lines = [
    `Date: ${meta.date}`,
    `Commit: ${meta.commit}`,
    '',
    '| Check | Status | Tool | Version | Evidence |',
    '|---|---|---|---|---|',
  ];

  for (const r of results) {
    const tool = r.tool ?? '-';
    const version = r.version ?? '-';
    const evidence = r.evidence
      .replace(/\\/g, '\\\\')
      .replace(/\|/g, '\\|');
    lines.push(`| ${r.name} | ${r.status} | ${tool} | ${version} | ${evidence} |`);
  }

  return lines.join('\n');
}

/**
 * Compute overall exit code: 1 if any check failed, 0 if all passed or skipped.
 */
export function computeExitCode(results: CheckResult[]): number {
  return results.some((r) => r.status === 'fail') ? 1 : 0;
}

function lastLine(text: string): string {
  const lines = text.trim().split('\n').filter((l) => !/^\s+at /.test(l));
  return lines.slice(-3).join(' ').slice(0, 300) || 'no output';
}
