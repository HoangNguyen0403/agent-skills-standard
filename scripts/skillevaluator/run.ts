/**
 * NVIDIA SkillEvaluator adapter (pinned, opt-in).
 *
 * Wraps `uvx --from skillevaluator==<pin>` so the whole repo runs the same
 * evaluator version. Reports land under `artifacts/skillevaluator/` (ignored).
 *
 * Modes:
 * - static (default): Tier 1 static/security/quality checks; no model key.
 *   Scanners that cannot install locally surface as INCOMPLETE in the child
 *   output and exit code; this adapter never reports a pass the child did not.
 * - llm: Tier 1 plus LLM-backed security analysis and `--llm-verify`.
 * - dedup: Tier 2 embedding/LLM deduplication.
 *
 * Tier 3 (live agent evaluation) is intentionally not wired here: it needs
 * Docker and overlaps the repo's own L3 lane.
 *
 * Usage: tsx scripts/skillevaluator/run.ts [--mode <mode>] [--path <dir>]
 *        [--checks <list>] [--out <dir>] [--print-env] [--dry-run]
 *        [-- <mode-allowed evaluator options>]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Exact pin: a SkillEvaluator bump is a reviewed PR, never an implicit float. */
const SKILLEVALUATOR_VERSION = '1.0.1';
const PYTHON_VERSION = '3.13';
const REPO_ROOT = path.resolve(__dirname, '../..');
const ENV_FILE = path.join(REPO_ROOT, '.env.skillevaluator');
const KEY_HELP =
  'Set NVIDIA_API_KEY (free key: https://build.nvidia.com) or add ' +
  'NVIDIA_API_KEY=... to the git-ignored .env.skillevaluator at the repo root.';

type Mode = 'static' | 'llm' | 'dedup';

const MODES: readonly Mode[] = ['static', 'llm', 'dedup'];
const STATIC_LLM_EXTRA_FLAGS: Readonly<Record<string, 0 | 1>> = {
  '--profile': 1,
  '--policy': 1,
  '--skip': 1,
  '--verbose': 0,
};
const DEDUP_EXTRA_FLAGS: Readonly<Record<string, 0 | 1>> = {
  '--threshold': 1,
  '--full-body': 0,
  '--catalog': 1,
  '--save-catalog': 1,
  '--max-entries': 1,
};

function validateExtraArgs(mode: Mode, extra: string[]): void {
  const allowed = mode === 'dedup' ? DEDUP_EXTRA_FLAGS : STATIC_LLM_EXTRA_FLAGS;
  for (let i = 0; i < extra.length; i += 1) {
    const arg = extra[i];
    const separator = arg.indexOf('=');
    const flag = separator === -1 ? arg : arg.slice(0, separator);
    if (!Object.hasOwn(allowed, flag)) {
      fail(`unsupported ${mode} evaluator option "${flag}"`);
    }
    const arity = allowed[flag];
    if (arity === 0) {
      if (separator !== -1) fail(`${flag} does not accept a value`);
      continue;
    }
    if (separator !== -1) {
      if (!arg.slice(separator + 1)) fail(`${flag} needs a value`);
      continue;
    }
    const value = extra[i + 1];
    if (!value || value.startsWith('--')) fail(`${flag} needs a value`);
    i += 1;
  }
}

function packageSpec(mode: Mode): string {
  const extra = mode === 'llm' ? '[llm]' : mode === 'dedup' ? '[tier2]' : '';
  return `skillevaluator${extra}==${SKILLEVALUATOR_VERSION}`;
}

interface Options {
  mode: Mode;
  target: string;
  checks: string | null;
  out: string | null;
  printEnv: boolean;
  dryRun: boolean;
  extra: string[];
}

interface ResolvedKey {
  value: string;
  source: 'environment' | 'file';
}

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

function fail(message: string): never {
  console.error(`skillevaluator: ${message}`);
  process.exit(2);
}

function parseArgs(argv: string[]): Options {
  let mode: Mode = 'static';
  let target = 'skills';
  let checks: string | null = null;
  let out: string | null = null;
  let printEnv = false;
  let dryRun = false;
  const extra: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = (): string => {
      const value = argv[i + 1];
      if (!value) fail(`${arg} needs a value`);
      i += 1;
      return value;
    };
    switch (arg) {
      case '--mode': {
        const value = next();
        if (!isMode(value)) fail(`unknown mode "${value}" (static|llm|dedup)`);
        mode = value;
        break;
      }
      case '--path':
        target = next();
        break;
      case '--checks':
        checks = next();
        break;
      case '--out':
        out = next();
        break;
      case '--print-env':
        printEnv = true;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--':
        // The separator is supplied by pnpm and carries no evaluator meaning.
        break;
      default:
        extra.push(arg);
        break;
    }
  }

  validateExtraArgs(mode, extra);
  return { mode, target, checks, out, printEnv, dryRun, extra };
}

/** Reads simple KEY=VALUE lines; only NVIDIA_API_KEY and SKILL_EVAL_* are honored. */
function readEnvFile(filePath: string): Record<string, string> {
  const allowed = (key: string): boolean =>
    key === 'NVIDIA_API_KEY' || key.startsWith('SKILL_EVAL_');
  const values: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return values;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!allowed(key)) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) values[key] = value;
  }
  return values;
}

function resolveKey(): ResolvedKey | null {
  const fromEnv = process.env.NVIDIA_API_KEY?.trim();
  if (fromEnv) return { value: fromEnv, source: 'environment' };
  const fromFile = readEnvFile(ENV_FILE).NVIDIA_API_KEY;
  return fromFile ? { value: fromFile, source: 'file' } : null;
}

/**
 * Child env: provider is always explicit (ambiguous multi-key resolution fails
 * otherwise) and competing provider keys are removed so nv_build is used.
 */
function buildChildEnv(key: ResolvedKey | null): NodeJS.ProcessEnv {
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
  };
  delete childEnv.OPENAI_API_KEY;
  delete childEnv.ANTHROPIC_API_KEY;
  // File values may set other SKILL_EVAL_* knobs, but provider selection is
  // enforced here: an ambiguous/unset provider fails resolution outright.
  Object.assign(childEnv, readEnvFile(ENV_FILE), {
    SKILL_EVAL_LLM_PROVIDER: 'nv_build',
    SKILL_EVAL_EMBEDDING_PROVIDER: 'nv_build',
  });
  if (key) childEnv.NVIDIA_API_KEY = key.value;
  return childEnv;
}

function buildArgs(options: Options, outDir: string): string[] {
  const reportArgs = ['-r', 'json', '-r', 'html', '-o', outDir];

  if (options.mode === 'dedup') {
    return [
      '--python',
      PYTHON_VERSION,
      '--from',
      packageSpec(options.mode),
      'skillevaluator',
      'tier2',
      'similarity-check',
      options.target,
      '--type',
      'skill',
      ...reportArgs,
      ...options.extra,
    ];
  }

  return [
    '--python',
    PYTHON_VERSION,
    '--from',
    packageSpec(options.mode),
    'skillevaluator',
    'validate',
    options.target,
    '--type',
    'skill',
    '--tiers',
    '1',
    '--continue-on-failure',
    ...(options.mode === 'llm' ? ['--llm', '--llm-verify'] : []),
    ...(options.checks ? ['--checks', options.checks] : []),
    ...reportArgs,
    ...options.extra,
  ];
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const target = path.resolve(REPO_ROOT, options.target);
  if (!fs.existsSync(target)) fail(`target path does not exist: ${target}`);
  if (options.mode === 'dedup' && options.checks) {
    fail(
      '--checks applies to static/llm only; pass Tier 2 flags as extra args',
    );
  }

  const needsKey = options.mode !== 'static';
  const key = resolveKey();
  const childEnv = buildChildEnv(key);

  if (options.printEnv) {
    // Variable NAMES only; values (and the key) never reach stdout. Runs
    // before the key gate so provider sanitization is inspectable keyless.
    for (const name of Object.keys(childEnv).sort()) console.log(name);
    return;
  }

  const outDir = path.resolve(
    REPO_ROOT,
    options.out ??
      path.join(
        'artifacts',
        'skillevaluator',
        `${options.mode}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      ),
  );

  const args = buildArgs({ ...options, target }, outDir);

  if (options.dryRun) {
    // argv only; env values (including the key) never reach stdout.
    console.log(['uvx', ...args].join(' '));
    return;
  }

  if (needsKey && !key) {
    console.error(`skillevaluator: ${options.mode} mode needs a model key.`);
    console.error(`skillevaluator: ${KEY_HELP}`);
    process.exit(2);
  }

  fs.mkdirSync(outDir, { recursive: true });

  console.log(
    `skillevaluator: mode=${options.mode} pin=${packageSpec(options.mode)} ` +
      `out=${path.relative(REPO_ROOT, outDir)}` +
      (key ? ` key=${key.source}` : ' key=none'),
  );

  const result = spawnSync('uvx', args, {
    cwd: REPO_ROOT,
    env: childEnv,
    stdio: 'inherit',
  });

  if (result.error) fail(result.error.message);
  if (result.signal) fail(`child terminated by ${result.signal}`);
  process.exit(result.status ?? 1);
}

main();
