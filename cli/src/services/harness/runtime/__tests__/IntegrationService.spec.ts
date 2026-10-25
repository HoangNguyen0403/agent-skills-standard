import { execFile as nodeExecFile, spawn, spawnSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HarnessDiscoveryService } from '../../HarnessDiscoveryService';
import type { HarnessProjectCheckout } from '../../HarnessDiscoveryService';
import { HarnessSetupService } from '../../HarnessSetupService';
import { FleetPolicyService } from '../FleetPolicyService';
import {
  generateOmpLoaderScript,
  getJsonPointerValue,
  IntegrationService,
  setJsonPointerValue,
  shellEscape,
  valuesEqual,
} from '../IntegrationService';
import { ReleaseService } from '../ReleaseService';
import { RuntimeStore } from '../RuntimeStore';
import { FleetConfig } from '../RuntimeTypes';
import type { IntegrationInstallResult } from '../IntegrationService';
import { createFleetTestConfig } from './FleetTestFixtures';
import { readBoundedJsonFile } from '../../../../commands/fleet';

const execFileAsync = promisify(nodeExecFile);

const FAKE_OMP_SOURCE = `#!/bin/sh
if [ "$1" = "--version" ]; then
  target_dir=\${0%/*}
  cat "$target_dir/version.txt"
  exit "$(cat "$target_dir/version-exit.txt")"
fi
if [ -n "$AGS_FAKE_SIGNAL" ]; then
  trap 'printf "%s\\n" SIGTERM >> "$AGS_FAKE_SIGNAL"; exit 143' TERM
fi
if [ -n "$AGS_FAKE_READY" ]; then : > "$AGS_FAKE_READY"; fi
printf '%s\\n' "$@" > "$AGS_FAKE_ARGV"
if [ "\${AGS_FAKE_STDIN:-no}" = "yes" ]; then cat > "$AGS_FAKE_STDIN_OUT"; fi
if [ "\${AGS_FAKE_WAIT:-no}" = "yes" ]; then
  i=0
  while [ $i -lt 100 ]; do sleep 0.05; i=$((i+1)); done
fi
printf '%s\\n' fake-omp-stdout
printf '%s\\n' fake-omp-stderr >&2
exit "\${AGS_FAKE_EXIT:-7}"
`;
interface FakeOmpTargetOptions {
  filename?: string;
  version?: string;
  versionExit?: string;
  source?: string;
}

async function createFakeOmpTarget(
  directory: string,
  options: FakeOmpTargetOptions = {},
): Promise<string> {
  await fs.ensureDir(directory);
  const target = path.join(directory, options.filename ?? 'omp');
  await fs.writeFile(target, options.source ?? FAKE_OMP_SOURCE, {
    mode: 0o755,
  });
  await fs.writeFile(
    path.join(directory, 'version.txt'),
    `${options.version ?? '18.12.6'}\n`,
  );
  await fs.writeFile(
    path.join(directory, 'version-exit.txt'),
    `${options.versionExit ?? '0'}\n`,
  );
  return target;
}

const FAKE_BUN_INTERPRETER_SOURCE = `#!/bin/sh
if [ "$1" = "-e" ] || { [ "$1" = "--no-install" ] && [ "$3" = "-e" ]; }; then
  printf '{"releaseName":"bun","bunVersion":"1.3.14"}'
  exit 0
fi
if [ "$1" = "--no-install" ]; then shift; fi
if [ "$1" = "--no-env-file" ]; then shift; fi
target="$1"
shift
if [ "$1" = "--version" ]; then
  target_dir=\${target%/*}
  cat "$target_dir/version.txt"
  exit "$(cat "$target_dir/version-exit.txt")"
fi
exit 1
`;

const FAKE_CLI_SOURCE = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const base = __dirname;
const args = process.argv.slice(2);
const cwd = args[args.indexOf('--cwd') + 1] || '';
const stateDir = args[args.indexOf('--state-dir') + 1] || '';
const fixture = JSON.parse(fs.readFileSync(path.join(stateDir, 'loader-fixture.json'), 'utf8'));
const projectA = fixture.projectA;
const projectB = fixture.projectB;
let physicalCwd = '';
try {
  physicalCwd = fs.realpathSync(cwd);
} catch {}
const logical = projectA && (physicalCwd === projectA || physicalCwd.startsWith(projectA + '/'))
  ? 'logical-a'
  : projectB && (physicalCwd === projectB || physicalCwd.startsWith(projectB + '/'))
    ? 'logical-b'
    : null;
const scope = (id) => id === 'logical-a'
  ? { hostId: 'host-1', projectId: 'p-a', logicalProjectId: id, rootPath: projectA }
  : { hostId: 'host-1', projectId: 'p-b', logicalProjectId: id, rootPath: projectB };
if (args.includes('--scope-only')) {
  fs.appendFileSync(path.join(base, 'calls.txt'), 'scope:' + (logical || 'none') + '\\n');
  process.stdout.write(JSON.stringify({ success: Boolean(logical), scope: logical ? scope(logical) : null }, null, 2) + '\\n');
  process.exit(0);
}

fs.appendFileSync(path.join(base, 'calls.txt'), 'context:' + (logical || 'none') + '\\n');
const mode = fs.readFileSync(path.join(base, 'mode.txt'), 'utf8').trim();
fs.appendFileSync(path.join(base, 'calls.txt'), 'pin:' + mode + '\\n');
const scenario = fs.readFileSync(path.join(base, 'scenario.txt'), 'utf8').trim();
if (scenario === 'malformed') {
  process.stdout.write('{broken\\n');
} else if (scenario === 'extra') {
  process.stdout.write('unexpected output\\n' + JSON.stringify({ success: true, context: { releaseDigest: 'rel-A', guidance: 'GUIDANCE-A', scope: scope(logical) } }, null, 2) + '\\n');
} else {
  const contextScope = scenario === 'scope-b'
    ? scope('logical-b')
    : scenario === 'alias-bypass'
      ? { hostId: 'host-1', projectId: 'p-other', logicalProjectId: 'logical-a', rootPath: projectB }
      : scope(logical);
  const context = scenario === 'no-guidance' ? null : {
    releaseDigest: 'rel-' + mode,
    guidance: 'GUIDANCE-' + mode,
    scope: contextScope,
  };
  process.stdout.write(JSON.stringify({ success: true, context }, null, 2) + '\\n');
}
`;

const LOADER_RUNNER_SOURCE = `import { pathToFileURL } from 'node:url';
import { writeFileSync, unlinkSync, symlinkSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const { default: loader } = await import(pathToFileURL(process.env.AGS_LOADER_PATH).href);

const observed = new Map();
loader({
  on(event, handler) {
    const list = observed.get(event) || [];
    list.push(handler);
    observed.set(event, list);
  },
});

const start = observed.get('before_agent_start')[0];
const shutdown = (observed.get('session_shutdown') || [])[0];
const projectA = process.env.AGS_PROJECT_A;
const projectB = process.env.AGS_PROJECT_B;
const results = [];
const callPath = join(process.env.AGS_CLI_DIR, 'calls.txt');
const callSnapshots = [];
const snapshotCalls = () => {
  if (!existsSync(callPath)) return [];
  return readFileSync(callPath, 'utf8').trim().split('\\n').filter(Boolean);
};
const recordCalls = () => callSnapshots.push(snapshotCalls());

const ctxFor = (id, cwd) => ({
  cwd,
  sessionManager: { getSessionId: () => id },
});
const scenario = process.env.AGS_SCENARIO;

if (scenario === 'symlink-retarget') {
  const alias = process.env.AGS_ALIAS_CWD;
  results.push(await start({ systemPrompt: ['base-1'] }, ctxFor('session-A', alias)));
  recordCalls();
  unlinkSync(alias);
  symlinkSync(projectB, alias, 'dir');
  writeFileSync(join(process.env.AGS_CLI_DIR, 'mode.txt'), 'B');
  results.push(await start({ systemPrompt: ['base-2'] }, ctxFor('session-A', alias)));
  recordCalls();
  results.push(await start({ systemPrompt: ['base-3'] }, ctxFor('session-A', alias)));
  recordCalls();
  process.stdout.write(JSON.stringify({ results, callSnapshots }));
  process.exit(0);
}

results.push(await start({ systemPrompt: ['base-1'] }, ctxFor('session-A', projectA + '/nested')));
recordCalls();
writeFileSync(join(process.env.AGS_CLI_DIR, 'mode.txt'), 'B');
results.push(await start({ systemPrompt: ['base-2'] }, ctxFor('session-A', projectA + '/nested/deeper')));
recordCalls();
results.push(await start({ systemPrompt: ['base-3'] }, ctxFor('session-A', projectA + '/nested')));
recordCalls();
results.push(await start({ systemPrompt: ['base-4'] }, ctxFor('session-A', projectB)));
recordCalls();
results.push(await start({ systemPrompt: ['base-5'] }, { cwd: projectA }));
recordCalls();
results.push(await start({ systemPrompt: ['base-6'] }, ctxFor('session-B', projectA)));
recordCalls();
if (shutdown) {
  shutdown({ type: 'session_shutdown' }, ctxFor('session-A', projectA));
}
results.push(await start({ systemPrompt: ['base-7'] }, ctxFor('session-A', projectA)));
recordCalls();

process.stdout.write(JSON.stringify({ results, callSnapshots }));
`;

interface TestProject {
  projectId: string;
  name: string;
  path: string;
  kind: string;
  checkouts?: HarnessProjectCheckout[];
  projectKey?: string;
}

interface TestHost {
  hostKey: string;
  status: 'reachable' | 'unreachable' | 'unsupported';
  serverId?: string;
  projects: TestProject[];
  error?: string;
}

interface TestInventory {
  schemaVersion: 1;
  complete: boolean;
  hosts: TestHost[];
}

describe('IntegrationService', () => {
  let tempStateDir: string;
  let tempPaseoHome: string;
  let paseoConfigPath: string;
  let store: RuntimeStore;
  let setupService: HarnessSetupService;
  let fakeOmpDir: string;
  let fakeOmp: string;
  let fakeCliPath: string;
  let service: IntegrationService;

  const writePaseoConfig = async (config: unknown): Promise<void> => {
    await fs.writeFile(
      paseoConfigPath,
      JSON.stringify(config, null, 2) + '\n',
      'utf8',
    );
  };

  const readPaseoConfig = async (): Promise<Record<string, unknown>> =>
    JSON.parse(await fs.readFile(paseoConfigPath, 'utf8')) as Record<
      string,
      unknown
    >;

  const installWithPlan = async (): Promise<IntegrationInstallResult> =>
    service.install({ apply: true });

  beforeEach(async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-integ-state-'));
    tempPaseoHome = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-integ-paseo-$x-`tick`-'),
    );
    paseoConfigPath = path.join(tempPaseoHome, 'config.json');

    setupService = new HarnessSetupService(tempStateDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    });
    store = new RuntimeStore(tempStateDir, setupService);

    fakeOmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-fake-omp-$x-`tick`-'),
    );
    fakeOmp = await createFakeOmpTarget(fakeOmpDir);

    fakeCliPath = path.join(tempStateDir, 'fake-cli.cjs');
    await fs.writeFile(fakeCliPath, '#!/usr/bin/env node\n', { mode: 0o644 });

    service = new IntegrationService(store, {
      paseoHome: tempPaseoHome,
      setupService,
      cliPath: fakeCliPath,
      nodeCommand: process.execPath,
      ompBinary: fakeOmp,
      ompVersion: '18.12.6',
    });
  });

  afterEach(async () => {
    await fs.remove(tempStateDir);
    await fs.remove(tempPaseoHome);
    await fs.remove(fakeOmpDir);
  });

  describe('Trusted launcher inputs', () => {
    it('refuses to guess a CLI entrypoint from source execution', async () => {
      await writePaseoConfig({
        agents: { providers: { omp: { command: [fakeOmp] } } },
      });
      const unbound = new IntegrationService(store, {
        paseoHome: tempPaseoHome,
        setupService,
        nodeCommand: process.execPath,
        ompVersion: '18.12.6',
      });
      await expect(unbound.plan()).rejects.toThrow(
        'Trusted CLI entrypoint must be a built JavaScript file',
      );
    });

    it('refuses an explicit TypeScript source entrypoint', async () => {
      await writePaseoConfig({
        agents: { providers: { omp: { command: [fakeOmp] } } },
      });
      const badService = new IntegrationService(store, {
        paseoHome: tempPaseoHome,
        setupService,
        cliPath: path.join(tempStateDir, 'index.ts'),
        nodeCommand: process.execPath,
        ompVersion: '18.12.6',
      });
      await expect(badService.plan()).rejects.toThrow(
        'must be a built JavaScript file',
      );
    });

    it('derives the OMP version from the actual target binary', async () => {
      await writePaseoConfig({
        agents: { providers: { omp: { command: [fakeOmp] } } },
      });
      const detected = new IntegrationService(store, {
        paseoHome: tempPaseoHome,
        setupService,
        cliPath: fakeCliPath,
        nodeCommand: process.execPath,
      });
      const plan = await detected.plan();
      expect(plan.launcher.ompVersion).toBe('18.12.6');
      expect(plan.launcher.ompVersionSource).toBe('binary');
    });
    it('pins a verified env-Bun OMP interpreter beside the isolated Node runtime', async () => {
      const targetDir = await fs.mkdtemp(
        path.join(tempStateDir, 'omp-env-bun-target-'),
      );
      const bunDir = await fs.mkdtemp(
        path.join(tempStateDir, 'omp-env-bun-runtime-'),
      );
      const target = await createFakeOmpTarget(targetDir, {
        source: FAKE_OMP_SOURCE.replace('#!/bin/sh', '#!/usr/bin/env bun'),
      });
      const bunPath = path.join(bunDir, 'bun');
      await fs.writeFile(bunPath, FAKE_BUN_INTERPRETER_SOURCE, { mode: 0o755 });
      await writePaseoConfig({
        agents: { providers: { omp: { command: [target] } } },
      });
      const detected = new IntegrationService(store, {
        paseoHome: tempPaseoHome,
        setupService,
        cliPath: fakeCliPath,
        nodeCommand: process.execPath,
        ompRuntimeCommand: bunPath,
      });

      const plan = await detected.plan();
      expect(plan.launcher.auxiliaryRuntimeKind).toBe('node');
      expect(plan.launcher.ompInterpreters).toEqual([
        { kind: 'bun', path: await fs.realpath(bunPath) },
      ]);
      expect(plan.launcher.ompTargetInterpreters).toEqual([
        {
          targetBinary: await fs.realpath(target),
          kind: 'bun',
          path: await fs.realpath(bunPath),
        },
      ]);
      await fs.remove(targetDir);
      await fs.remove(bunDir);
    });

    it('refuses targets that report conflicting actual versions', async () => {
      const otherDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'ags-fake-omp-b-'),
      );
      const otherOmp = await createFakeOmpTarget(otherDir, {
        version: '18.12.5',
      });
      try {
        await fs.writeFile(
          paseoConfigPath,
          JSON.stringify({
            agents: {
              providers: {
                omp: { command: [fakeOmp] },
                'omp-alt': { extends: 'omp', command: [otherOmp] },
              },
            },
          }),
          'utf8',
        );
        const detected = new IntegrationService(store, {
          paseoHome: tempPaseoHome,
          setupService,
          cliPath: fakeCliPath,
          nodeCommand: process.execPath,
        });
        // Distinct real subprocess outputs, no mocked resolver.
        await expect(detected.plan()).rejects.toThrow(
          'report different versions',
        );
      } finally {
        await fs.remove(otherDir);
      }
    });

    it('refuses a target whose version cannot be established', async () => {
      const silentDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'ags-fake-omp-silent-'),
      );
      const silentOmp = await createFakeOmpTarget(silentDir, { version: '' });
      try {
        await writePaseoConfig({
          agents: { providers: { omp: { command: [silentOmp] } } },
        });
        const detected = new IntegrationService(store, {
          paseoHome: tempPaseoHome,
          setupService,
          cliPath: fakeCliPath,
          nodeCommand: process.execPath,
        });
        await expect(detected.plan()).rejects.toThrow(
          'Could not establish the installed OMP version',
        );
      } finally {
        await fs.remove(silentDir);
      }
    });

    it('treats an expected version as a check against the actual target', async () => {
      const mismatchDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'ags-fake-omp-mismatch-'),
      );
      const mismatchOmp = await createFakeOmpTarget(mismatchDir, {
        version: '18.12.5',
      });
      try {
        await writePaseoConfig({
          agents: { providers: { omp: { command: [mismatchOmp] } } },
        });
        const detected = new IntegrationService(store, {
          paseoHome: tempPaseoHome,
          setupService,
          cliPath: fakeCliPath,
          nodeCommand: process.execPath,
          ompVersion: '18.12.6',
        });
        await expect(detected.plan()).rejects.toThrow(
          'does not match the actual target version',
        );
      } finally {
        await fs.remove(mismatchDir);
      }
    });

    it('accepts a package-managed omp symlink onto a declared package bin target', async () => {
      const packageRoot = path.join(tempStateDir, 'fake-omp-package');
      const distDir = path.join(packageRoot, 'dist');
      const binDir = path.join(tempStateDir, 'fake-bin');
      const packageBinary = await createFakeOmpTarget(distDir, {
        filename: 'cli.js',
      });
      await fs.ensureDir(binDir);
      await fs.writeFile(
        path.join(packageRoot, 'package.json'),
        JSON.stringify({
          name: '@oh-my-pi/pi-coding-agent',
          bin: { omp: 'dist/cli.js' },
        }),
        'utf8',
      );
      const lexicalOmp = path.join(binDir, 'omp');
      await fs.symlink(packageBinary, lexicalOmp);

      await writePaseoConfig({
        agents: { providers: { omp: { command: [lexicalOmp] } } },
      });
      const plan = await service.plan();
      expect(plan.wrappers).toHaveLength(1);
      expect(plan.wrappers[0].targetOmpBin).toBe(
        await fs.realpath(packageBinary),
      );
      expect(plan.jsonPointers[0].plannedValue).toEqual([
        plan.wrappers[0].path,
      ]);
    });
  });

  describe('Paseo configuration boundaries', () => {
    it('rejects a string provider command before planning writes', async () => {
      await writePaseoConfig({
        agents: { providers: { omp: { command: fakeOmp } } },
      });
      await expect(service.plan()).rejects.toThrow(
        'must be a non-empty string[] command prefix',
      );
    });

    it('refuses unknown custom executables instead of wrapping them', async () => {
      await writePaseoConfig({
        agents: {
          providers: { omp: { command: ['/custom/untrusted/wrapper.sh'] } },
        },
      });
      await expect(service.plan()).rejects.toThrow('OMP binary');
    });

    it('preserves each provider original binary and prefix arguments', async () => {
      const secondDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'ags-fake-omp-c-'),
      );
      const secondOmp = await createFakeOmpTarget(secondDir, {
        source: FAKE_OMP_SOURCE.replace(
          'fake-omp-stdout',
          'fake-omp-second-stdout',
        ),
      });
      try {
        await writePaseoConfig({
          agents: {
            providers: {
              omp: { command: [fakeOmp] },
              'omp-work': {
                extends: 'omp',
                command: [secondOmp, '--profile', 'work'],
              },
            },
          },
        });

        const plan = await service.plan();
        const base = plan.jsonPointers.find(
          (entry) => entry.pointer === '/agents/providers/omp/command',
        );
        const derived = plan.jsonPointers.find(
          (entry) => entry.pointer === '/agents/providers/omp-work/command',
        );

        expect(plan.wrappers).toHaveLength(2);
        const baseWrapper = plan.wrappers.find((wrapper) =>
          wrapper.pointers.includes('/agents/providers/omp/command'),
        );
        const derivedWrapper = plan.wrappers.find((wrapper) =>
          wrapper.pointers.includes('/agents/providers/omp-work/command'),
        );
        expect(baseWrapper?.targetOmpBin).toBe(await fs.realpath(fakeOmp));
        expect(derivedWrapper?.targetOmpBin).toBe(await fs.realpath(secondOmp));

        expect(base?.plannedValue).toEqual([baseWrapper!.path]);
        expect(Array.isArray(derived?.plannedValue)).toBe(true);
        const derivedValue = derived?.plannedValue as string[];
        expect(derivedValue).toEqual([
          derivedWrapper!.path,
          '--profile',
          'work',
        ]);

        // Executing each owned wrapper must reach its own original binary.
        const install = await service.install({ apply: true });
        expect(install.applied).toBe(true);
        const baseRec = await fs.mkdtemp(
          path.join(os.tmpdir(), 'ags-rec-base-'),
        );
        const derivedRec = await fs.mkdtemp(
          path.join(os.tmpdir(), 'ags-rec-derived-'),
        );
        try {
          const baseRun = spawnSync(baseWrapper!.path, [], {
            encoding: 'utf8',
            env: {
              ...process.env,
              AGS_FAKE_ARGV: path.join(baseRec, 'argv.txt'),
              AGS_FAKE_STDIN: 'no',
            },
          });
          const derivedRun = spawnSync(derivedWrapper!.path, [], {
            encoding: 'utf8',
            env: {
              ...process.env,
              AGS_FAKE_ARGV: path.join(derivedRec, 'argv.txt'),
              AGS_FAKE_STDIN: 'no',
            },
          });
          expect(baseRun.stdout.trim()).toBe('fake-omp-stdout');
          expect(derivedRun.stdout.trim()).toBe('fake-omp-second-stdout');
          const baseArgv = (
            await fs.readFile(path.join(baseRec, 'argv.txt'), 'utf8')
          ).trim();
          const derivedArgv = (
            await fs.readFile(path.join(derivedRec, 'argv.txt'), 'utf8')
          ).trim();
          expect(baseArgv).toBe(`-e\n${install.loaderPath}`);
          expect(derivedArgv).toBe(`-e\n${install.loaderPath}`);
        } finally {
          await fs.remove(baseRec);
          await fs.remove(derivedRec);
        }
      } finally {
        await fs.remove(secondDir);
      }
    });

    it('leaves an omitted alias command absent so it inherits the wrapped base', async () => {
      await writePaseoConfig({
        agents: {
          providers: {
            omp: { command: [fakeOmp, '--profile', 'base-account'] },
            work: { extends: 'omp', label: 'Work' },
          },
        },
      });

      const plan = await service.plan();
      expect(plan.jsonPointers).toHaveLength(1);
      const basePointer = plan.jsonPointers[0];
      expect(basePointer.pointer).toBe('/agents/providers/omp/command');
      expect(basePointer.plannedValue).toEqual([
        plan.wrappers[0].path,
        '--profile',
        'base-account',
      ]);
      expect(plan.coverage.inheritedProviders).toEqual(['work']);
      expect(
        plan.jsonPointers.some((pointer) => pointer.pointer.includes('/work/')),
      ).toBe(false);

      await service.install({ apply: true });
      const installed = await readPaseoConfig();
      const providers = (installed.agents as Record<string, unknown>)
        .providers as Record<string, Record<string, unknown>>;
      // The alias keeps inheriting the base command; no explicit override is written.
      expect(providers.work.command).toBeUndefined();
      expect(providers.omp.command).toEqual([
        plan.wrappers[0].path,
        '--profile',
        'base-account',
      ]);
    });

    it('excludes a provider whose chain has no OMP ancestry', async () => {
      await writePaseoConfig({
        agents: {
          providers: {
            omp: { command: [fakeOmp] },
            broken: { extends: 'missing-provider', label: 'Broken' },
          },
        },
      });
      // 'broken' has no OMP ancestry, so it is excluded rather than wrapped.
      const plan = await service.plan();
      expect(plan.coverage.excludedProviders).toEqual(['broken']);
    });

    it('does not treat an arbitrary /omp suffix as a trusted binary', async () => {
      await writePaseoConfig({
        daemon: {
          terminalProfiles: [{ id: 'p', name: 'Pi', command: '/no/such/omp' }],
        },
      });
      await expect(service.plan()).rejects.toThrow('does not exist');
    });
  });

  describe('Input safety', () => {
    it('rejects a FIFO configuration without blocking', async () => {
      const fifoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-fifo-'));
      const fifoPath = path.join(fifoDir, 'config.json');
      const mkfifo = spawnSync('mkfifo', [fifoPath], { encoding: 'utf8' });
      if (mkfifo.status !== 0) {
        await fs.remove(fifoDir);
        return;
      }
      try {
        await expect(
          service.plan({ targetConfigPath: fifoPath }),
        ).rejects.toThrow('must be a regular file');
        await expect(readBoundedJsonFile(fifoPath)).rejects.toThrow(
          'must be a regular file',
        );
      } finally {
        await fs.remove(fifoDir);
      }
    });
  });

  describe('Wrapper execution', () => {
    const recordDir = async (): Promise<string> =>
      fs.mkdtemp(path.join(os.tmpdir(), 'ags-fake-rec-'));

    it('executes the pinned default target with argv, streams, and exit code preserved', async () => {
      await writePaseoConfig({
        agents: { providers: { omp: { command: [fakeOmp] } } },
      });
      const install = await installWithPlan();
      expect(install.applied).toBe(true);
      const wrapperPath = install.wrapperPaths![0];
      const rec = await recordDir();
      try {
        const result = spawnSync(wrapperPath, ['--flag', 'value with space'], {
          encoding: 'utf8',
          input: '',
          env: {
            ...process.env,
            AGS_FAKE_ARGV: path.join(rec, 'argv.txt'),
            AGS_FAKE_EXIT: '7',
            AGS_FAKE_STDIN: 'yes',
            AGS_FAKE_STDIN_OUT: path.join(rec, 'stdin.txt'),
          },
        });

        expect(result.stdout.trim()).toBe('fake-omp-stdout');
        expect(result.stderr.trim()).toBe('fake-omp-stderr');
        expect(result.status).toBe(7);

        const argvLines = (
          await fs.readFile(path.join(rec, 'argv.txt'), 'utf8')
        )
          .trim()
          .split('\n');
        expect(argvLines).toEqual([
          '-e',
          install.loaderPath,
          '--flag',
          'value with space',
        ]);

        const stdinCapture = await fs.readFile(
          path.join(rec, 'stdin.txt'),
          'utf8',
        );
        expect(stdinCapture).toBe('');
      } finally {
        await fs.remove(rec);
      }
    });

    it('forwards stdin and preserves SIGTERM delivery through exec', async () => {
      await writePaseoConfig({
        agents: { providers: { omp: { command: [fakeOmp] } } },
      });
      const install = await installWithPlan();
      const wrapperPath = install.wrapperPaths![0];
      const rec = await recordDir();
      try {
        const ready = path.join(rec, 'ready');
        const signals = path.join(rec, 'signals.txt');
        const child = spawn(wrapperPath, ['--interactive'], {
          env: {
            ...process.env,
            AGS_FAKE_ARGV: path.join(rec, 'argv.txt'),
            AGS_FAKE_READY: ready,
            AGS_FAKE_SIGNAL: signals,
            AGS_FAKE_WAIT: 'yes',
            AGS_FAKE_STDIN: 'yes',
            AGS_FAKE_STDIN_OUT: path.join(rec, 'stdin.txt'),
          },
        });

        if (!child.stdin) {
          throw new Error('spawned wrapper has no stdin pipe');
        }
        child.stdin.write('task-input');
        child.stdin.end();

        const exited = Promise.withResolvers<number | null>();
        child.on('exit', (code) => exited.resolve(code));

        for (
          let attempt = 0;
          attempt < 200 && !(await fs.pathExists(ready));
          attempt += 1
        ) {
          await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 25));
        }
        expect(await fs.pathExists(ready)).toBe(true);

        child.kill('SIGTERM');
        expect(await exited.promise).toBe(143);
        expect((await fs.readFile(signals, 'utf8')).trim()).toBe('SIGTERM');
        expect(
          (await fs.readFile(path.join(rec, 'stdin.txt'), 'utf8')).trim(),
        ).toBe('task-input');
      } finally {
        await fs.remove(rec);
      }
    });

    it('shell-escapes interpolated state paths instead of expanding them', async () => {
      const escaped = shellEscape('a\'b $HOME `tick` "dq"');
      expect(escaped).toBe("'a'\\''b $HOME `tick` \"dq\"'");
    });
  });

  describe('Loader session lifecycle', () => {
    const runLoader = async (options?: {
      declaredVersion?: string;
      targetVersion?: string;
      targetVersionExit?: string;
      scenario?:
        | 'valid'
        | 'malformed'
        | 'extra'
        | 'scope-b'
        | 'alias-bypass'
        | 'no-guidance'
        | 'symlink-retarget';
    }): Promise<{
      results: Array<{ systemPrompt?: string[] } | null>;
      calls: string[];
      callSnapshots: string[][];
    }> => {
      const runtimeDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'ags-loader-run-'),
      );
      const projectA = path.join(runtimeDir, 'project-a');
      const projectB = path.join(runtimeDir, 'project-b');
      await fs.ensureDir(projectA);
      await fs.ensureDir(path.join(projectA, 'nested', 'deeper'));
      await fs.ensureDir(projectB);
      const canonicalProjectA = await fs.realpath(projectA);
      const canonicalProjectB = await fs.realpath(projectB);
      const aliasCwd = path.join(runtimeDir, 'project-alias');
      if (options?.scenario === 'symlink-retarget') {
        await fs.symlink(projectA, aliasCwd, 'dir');
      }
      const cliDir = path.join(runtimeDir, 'cli');
      await fs.ensureDir(cliDir);
      const cliPath = path.join(cliDir, 'fake-cli.cjs');
      await fs.writeFile(cliPath, FAKE_CLI_SOURCE, { mode: 0o755 });
      await fs.writeFile(path.join(cliDir, 'mode.txt'), 'A');
      await fs.writeFile(
        path.join(runtimeDir, 'loader-fixture.json'),
        JSON.stringify({
          projectA: canonicalProjectA,
          projectB: canonicalProjectB,
        }),
        { mode: 0o600 },
      );
      await fs.writeFile(
        path.join(cliDir, 'scenario.txt'),
        options?.scenario ?? 'valid',
      );

      const targetPath = path.join(runtimeDir, 'omp');
      await fs.writeFile(
        targetPath,
        FAKE_OMP_SOURCE.replace('#!/bin/sh', '#!/usr/bin/env bun'),
        { mode: 0o755 },
      );
      await fs.writeFile(
        path.join(runtimeDir, 'version.txt'),
        `${options?.targetVersion ?? '18.12.6'}\n`,
      );
      await fs.writeFile(
        path.join(runtimeDir, 'version-exit.txt'),
        `${options?.targetVersionExit ?? '0'}\n`,
      );
      const interpreterDir = path.join(runtimeDir, 'verified-interpreters');
      await fs.ensureDir(interpreterDir);
      const bunPath = path.join(interpreterDir, 'bun');
      await fs.writeFile(bunPath, FAKE_BUN_INTERPRETER_SOURCE, { mode: 0o755 });

      const loaderPath = path.join(runtimeDir, 'loader.mjs');
      const trustedHome = await fs.realpath(os.userInfo().homedir);
      const auxiliaryRuntimePath = await fs.realpath(
        path.dirname(process.execPath),
      );
      await fs.writeFile(
        loaderPath,
        generateOmpLoaderScript({
          cliPath,
          nodeCommand: process.execPath,
          stateDir: runtimeDir,
          platform: 'darwin',
          ompVersion: options?.declaredVersion ?? '18.12.6',
          targetBinaries: [targetPath],
          auxiliaryRuntimeKind: process.versions.bun ? 'bun' : 'node',
          auxiliaryRuntimePath,
          ompInterpreters: [{ kind: 'bun', path: bunPath }],
          ompTargetInterpreters: [
            { targetBinary: targetPath, kind: 'bun', path: bunPath },
          ],
          auxiliaryHome: trustedHome,
          paseoHome: runtimeDir,
        }),
      );
      const runnerPath = path.join(runtimeDir, 'runner.mjs');
      await fs.writeFile(runnerPath, LOADER_RUNNER_SOURCE);

      try {
        const runnerArgs = process.versions.bun
          ? ['--no-install', '--no-env-file', runnerPath]
          : [runnerPath];
        const { stdout } = await execFileAsync(process.execPath, runnerArgs, {
          cwd: runtimeDir,
          env: {
            HOME: trustedHome,
            PATH: `${auxiliaryRuntimePath}:/usr/bin:/bin:/usr/sbin:/sbin`,
            AGS_LOADER_PATH: loaderPath,
            AGS_CLI_DIR: cliDir,
            AGS_PROJECT_A: canonicalProjectA,
            AGS_PROJECT_B: canonicalProjectB,
            AGS_SCENARIO: options?.scenario ?? 'valid',
            AGS_ALIAS_CWD: aliasCwd,
          },
        });
        const output = JSON.parse(String(stdout)) as {
          results: Array<{ systemPrompt?: string[] } | null>;
          callSnapshots: string[][];
        };
        const callsPath = path.join(cliDir, 'calls.txt');
        const calls = (await fs.pathExists(callsPath))
          ? (await fs.readFile(callsPath, 'utf8')).trim().split('\n')
          : [];
        return {
          results: output.results,
          calls,
          callSnapshots: output.callSnapshots,
        };
      } finally {
        await fs.remove(runtimeDir);
      }
    };

    it('freezes guidance per session and full physical scope identity', async () => {
      const { results, calls } = await runLoader();

      expect(results[0]?.systemPrompt).toEqual(['base-1', 'GUIDANCE-A']);
      expect(results[1]?.systemPrompt).toEqual(['base-2', 'GUIDANCE-A']);
      expect(results[2]?.systemPrompt).toEqual(['base-3', 'GUIDANCE-A']);
      expect(results[3]?.systemPrompt).toEqual(['base-4', 'GUIDANCE-B']);
      expect(results[4]).toBeNull();
      expect(results[5]?.systemPrompt).toEqual(['base-6', 'GUIDANCE-B']);
      expect(results[6]?.systemPrompt).toEqual(['base-7', 'GUIDANCE-B']);
      expect(calls).toEqual([
        'scope:logical-a',
        'context:logical-a',
        'pin:A',
        'scope:logical-a',
        'scope:logical-b',
        'context:logical-b',
        'pin:B',
        'scope:logical-a',
        'context:logical-a',
        'pin:B',
        'scope:logical-a',
        'context:logical-a',
        'pin:B',
      ]);
    });

    it.each(['malformed', 'extra'] as const)(
      'injects nothing when the context command emits %s stdout',
      async (scenario) => {
        const { results, calls } = await runLoader({ scenario });
        expect(results.every((result) => result === null)).toBe(true);
        expect(calls).toContain('context:logical-a');
      },
    );

    it('does not cache guidance whose canonical identity differs from metadata scope', async () => {
      const { results, calls } = await runLoader({ scenario: 'scope-b' });
      expect(results.slice(0, 3).every((result) => result === null)).toBe(true);
      expect(results[3]?.systemPrompt).toEqual(['base-4', 'GUIDANCE-B']);
      expect(results[5]).toBeNull();
      expect(calls).toContain('scope:logical-a');
      expect(calls).toContain('pin:A');
      expect(calls).toContain('context:logical-a');
    });

    it('does not let an approved logical alias bypass physical scope identity', async () => {
      const { results, calls } = await runLoader({ scenario: 'alias-bypass' });
      expect(results.every((result) => result === null)).toBe(true);
      expect(calls).toContain('context:logical-a');
    });
    it('caches null guidance within a session and refreshes it for new sessions', async () => {
      const { results, callSnapshots } = await runLoader({
        scenario: 'no-guidance',
      });
      expect(results.every((result) => result === null)).toBe(true);

      const pinCount = (snapshot: string[], mode: string): number =>
        snapshot.filter((call) => call === `pin:${mode}`).length;
      expect(pinCount(callSnapshots[0], 'A')).toBe(1);
      expect(pinCount(callSnapshots[1], 'A')).toBe(
        pinCount(callSnapshots[0], 'A'),
      );
      expect(pinCount(callSnapshots[2], 'A')).toBe(
        pinCount(callSnapshots[1], 'A'),
      );
      expect(pinCount(callSnapshots[3], 'B')).toBe(1);
      expect(pinCount(callSnapshots[5], 'B')).toBe(
        pinCount(callSnapshots[3], 'B') + 1,
      );
      expect(pinCount(callSnapshots[6], 'B')).toBe(
        pinCount(callSnapshots[5], 'B') + 1,
      );
    });

    it('re-resolves metadata when a symlink cwd is retargeted and reuses cached scope guidance', async () => {
      const { results, calls } = await runLoader({
        scenario: 'symlink-retarget',
      });
      expect(results[0]?.systemPrompt).toEqual(['base-1', 'GUIDANCE-A']);
      expect(results[1]?.systemPrompt).toEqual(['base-2', 'GUIDANCE-B']);
      expect(results[2]?.systemPrompt).toEqual(['base-3', 'GUIDANCE-B']);
      expect(calls).toEqual([
        'scope:logical-a',
        'context:logical-a',
        'pin:A',
        'scope:logical-b',
        'context:logical-b',
        'pin:B',
      ]);
    });

    it('injects nothing when a pinned target no longer matches the declared version', async () => {
      const { results, calls } = await runLoader({ targetVersion: '18.12.5' });
      expect(results.every((result) => result === null)).toBe(true);
      expect(calls).toEqual([]);
    });
    it('does not authorize guidance when the target version probe exits unsuccessfully', async () => {
      const { results, calls } = await runLoader({ targetVersionExit: '1' });
      expect(results.every((result) => result === null)).toBe(true);
      expect(calls).toEqual([]);
    });
  });

  describe('install()', () => {
    const baseConfig = () => ({
      version: 1,
      daemon: {
        terminalProfiles: [{ id: 'omp', name: 'Oh my pi', command: fakeOmp }],
      },
      agents: {
        providers: {
          omp: { enabled: true, command: [fakeOmp] },
          'omp-work': {
            enabled: true,
            extends: 'omp',
            command: [fakeOmp, '--verbose'],
          },
          claude: { enabled: true, command: ['claude'] },
        },
      },
    });

    it('performs a read-only dry run by default', async () => {
      await writePaseoConfig(baseConfig());
      const before = await fs.readFile(paseoConfigPath, 'utf8');
      const result = await service.install({ apply: false });
      expect(result.applied).toBe(false);
      expect(result.plan).toBeDefined();
      expect(await fs.readFile(paseoConfigPath, 'utf8')).toBe(before);
      expect(await fs.pathExists(path.join(tempStateDir, 'integration'))).toBe(
        false,
      );
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-receipt.json'),
        ),
      ).toBe(false);
    });
    it('refuses oversized serialized ownership state before changing config or owned files', async () => {
      const prefixArgument = 'é'.repeat(100_000);
      const providers = Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => [
          `omp-alias-${index}`,
          { extends: 'omp', command: [fakeOmp, prefixArgument] },
        ]),
      );
      const config = {
        version: 1,
        agents: {
          providers: {
            omp: { command: [fakeOmp] },
            ...providers,
          },
        },
      };
      const originalConfig = JSON.stringify(config, null, 2) + '\n';
      expect(Buffer.byteLength(originalConfig, 'utf8')).toBeLessThan(
        4 * 1024 * 1024,
      );
      expect(
        Buffer.byteLength(prefixArgument, 'utf8') * 12 * 2,
      ).toBeGreaterThan(4 * 1024 * 1024);
      await writePaseoConfig(config);

      const stateFilesBefore = (await fs.readdir(tempStateDir)).sort();
      const stateBytesBefore = new Map(
        await Promise.all(
          stateFilesBefore.map(
            async (filename) =>
              [
                filename,
                await fs.readFile(path.join(tempStateDir, filename)),
              ] as const,
          ),
        ),
      );

      await expect(installWithPlan()).rejects.toMatchObject({
        code: 'INTEGRATION_STATE_TOO_LARGE',
      });

      expect(await fs.readFile(paseoConfigPath, 'utf8')).toBe(originalConfig);
      expect((await fs.readdir(tempStateDir)).sort()).toEqual(stateFilesBefore);
      for (const [filename, bytes] of stateBytesBefore) {
        expect(await fs.readFile(path.join(tempStateDir, filename))).toEqual(
          bytes,
        );
      }
      expect(await fs.pathExists(path.join(tempStateDir, 'integration'))).toBe(
        false,
      );
      expect(await fs.pathExists(path.join(tempStateDir, 'backups'))).toBe(
        false,
      );
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-receipt.json'),
        ),
      ).toBe(false);
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-journal.json'),
        ),
      ).toBe(false);
    });
    it('reserves uninstall phase bytes before admitting an install journal at the reader limit', async () => {
      const stateLimitBytes = 4 * 1024 * 1024;
      const aliasCount = 48;
      const aliasIds = Array.from(
        { length: aliasCount },
        (_, index) => `omp-alias-${index}`,
      );
      const configFor = (prefixArguments: string[]) => ({
        version: 1,
        agents: {
          providers: {
            omp: { command: [fakeOmp] },
            ...Object.fromEntries(
              aliasIds.map((id, index) => [
                id,
                {
                  extends: 'omp',
                  command: [fakeOmp, prefixArguments[index] ?? ''],
                },
              ]),
            ),
          },
        },
      });

      await writePaseoConfig(configFor(Array(aliasCount).fill('x')));
      await installWithPlan();
      const receiptPath = path.join(tempStateDir, 'integration-receipt.json');
      const baseReceipt = JSON.parse(
        await fs.readFile(receiptPath, 'utf8'),
      ) as {
        installedAt: number;
        targetConfigPath: string;
        targetConfigSha256Before: string;
        targetConfigSha256After: string;
        jsonPointers: Array<{
          pointer: string;
          previousValue?: unknown;
          installedValue: unknown;
        }>;
      };
      const journalBytes = (
        phase: 'install' | 'uninstall',
        receipt: typeof baseReceipt,
      ) => {
        const journal = {
          schemaVersion: 3,
          owner: 'agent-skills-standard/integration-journal',
          phase,
          createdAt: baseReceipt.installedAt,
          targetConfigPath: baseReceipt.targetConfigPath,
          expectedBeforeSha256:
            phase === 'install'
              ? baseReceipt.targetConfigSha256Before
              : baseReceipt.targetConfigSha256After,
          expectedAfterSha256:
            phase === 'install'
              ? baseReceipt.targetConfigSha256After
              : baseReceipt.targetConfigSha256Before,
          receipt,
        };
        return Buffer.byteLength(
          JSON.stringify(journal, null, 2) + '\n',
          'utf8',
        );
      };
      const baseInstallBytes = journalBytes('install', baseReceipt);
      const targetInstallBytes =
        baseInstallBytes % 2 === stateLimitBytes % 2
          ? stateLimitBytes
          : stateLimitBytes - 1;
      const extraCharacters = (targetInstallBytes - baseInstallBytes) / 2;
      expect(Number.isInteger(extraCharacters)).toBe(true);

      const perAlias = Math.floor(extraCharacters / aliasCount);
      const remainder = extraCharacters % aliasCount;
      const prefixArguments = Array.from({ length: aliasCount }, (_, index) =>
        'x'.repeat(1 + perAlias + (index < remainder ? 1 : 0)),
      );
      const candidateReceipt = {
        ...baseReceipt,
        jsonPointers: baseReceipt.jsonPointers.map((pointer) => {
          const match = /^\/agents\/providers\/omp-alias-(\d+)\/command$/.exec(
            pointer.pointer,
          );
          if (!match) {
            return pointer;
          }
          const prefix = prefixArguments[Number(match[1])] ?? '';
          const replaceArgument = (value: unknown): unknown => {
            if (Array.isArray(value) && value[value.length - 1] === 'x') {
              return [...value.slice(0, -1), prefix];
            }
            return value;
          };
          return {
            ...pointer,
            previousValue: replaceArgument(pointer.previousValue),
            installedValue: replaceArgument(pointer.installedValue),
          };
        }),
      };
      expect(
        candidateReceipt.jsonPointers.filter((pointer) =>
          pointer.pointer.startsWith('/agents/providers/omp-alias-'),
        ),
      ).toHaveLength(aliasCount);
      expect(journalBytes('install', candidateReceipt)).toBe(
        targetInstallBytes,
      );
      expect(journalBytes('uninstall', candidateReceipt)).toBe(
        targetInstallBytes + 2,
      );
      expect(journalBytes('uninstall', candidateReceipt)).toBeGreaterThan(
        stateLimitBytes,
      );
      expect(
        Buffer.byteLength(
          JSON.stringify(candidateReceipt, null, 2) + '\n',
          'utf8',
        ),
      ).toBeLessThan(stateLimitBytes);

      await service.uninstall({ apply: true });
      const config = configFor(prefixArguments);
      const originalConfig = JSON.stringify(config, null, 2) + '\n';
      expect(Buffer.byteLength(originalConfig, 'utf8')).toBeLessThan(
        stateLimitBytes,
      );
      await writePaseoConfig(config);
      const stateFilesBefore = (await fs.readdir(tempStateDir)).sort();
      const stateBytesBefore = new Map(
        await Promise.all(
          stateFilesBefore.map(
            async (filename) =>
              [
                filename,
                await fs.readFile(path.join(tempStateDir, filename)),
              ] as const,
          ),
        ),
      );

      await expect(installWithPlan()).rejects.toMatchObject({
        code: 'INTEGRATION_STATE_TOO_LARGE',
      });

      expect(await fs.readFile(paseoConfigPath, 'utf8')).toBe(originalConfig);
      expect((await fs.readdir(tempStateDir)).sort()).toEqual(stateFilesBefore);
      for (const [filename, bytes] of stateBytesBefore) {
        expect(await fs.readFile(path.join(tempStateDir, filename))).toEqual(
          bytes,
        );
      }
      expect(await fs.pathExists(path.join(tempStateDir, 'integration'))).toBe(
        false,
      );
      expect(await fs.pathExists(path.join(tempStateDir, 'backups'))).toBe(
        false,
      );
      expect(await fs.pathExists(receiptPath)).toBe(false);
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-journal.json'),
        ),
      ).toBe(false);
    });

    it('installs string terminal commands and string[] provider prefixes with private modes', async () => {
      await writePaseoConfig(baseConfig());
      const configModeBefore = (await fs.stat(paseoConfigPath)).mode & 0o777;
      const result = await installWithPlan();
      expect((await fs.stat(paseoConfigPath)).mode & 0o777).toBe(
        configModeBefore,
      );
      expect(result.applied).toBe(true);
      expect(result.saved).toBe(true);
      expect(result.daemonReloadRequired).toBe(true);

      const updated = await readPaseoConfig();
      const terminal = (updated.daemon as Record<string, unknown>)
        .terminalProfiles as Array<Record<string, unknown>>;
      const providers = (updated.agents as Record<string, unknown>)
        .providers as Record<string, Record<string, unknown>>;
      expect(typeof terminal[0].command).toBe('string');
      expect(terminal[0].command).toBe(result.wrapperPaths![0]);
      expect(providers.omp.command).toEqual([result.wrapperPaths![0]]);
      expect(providers['omp-work'].command).toEqual([
        result.wrapperPaths![0],
        '--verbose',
      ]);
      expect(providers.claude.command).toEqual(['claude']);

      const loaderStat = await fs.stat(result.loaderPath!);
      expect(loaderStat.mode & 0o777).toBe(0o600);
      for (const wrapperPath of result.wrapperPaths!) {
        const wrapperStat = await fs.stat(wrapperPath);
        expect(wrapperStat.mode & 0o777).toBe(0o700);
      }
      expect((await fs.stat(result.backupPath!)).mode & 0o777).toBe(0o600);
      expect(
        (await fs.stat(path.join(tempStateDir, 'integration-receipt.json')))
          .mode & 0o777,
      ).toBe(0o600);

      // Provider prefix args are preserved, and only the base provider's wrapper is shared.
      expect(result.jsonPointers).toHaveLength(3);
    });

    it('is idempotent and preserves the original backup when owned bytes are unchanged', async () => {
      await writePaseoConfig(baseConfig());
      const first = await installWithPlan();
      const receiptBefore = await fs.readFile(
        path.join(tempStateDir, 'integration-receipt.json'),
        'utf8',
      );
      const wrapperBefore = await fs.readFile(first.wrapperPaths![0], 'utf8');

      const second = await installWithPlan();
      expect(second.alreadyInstalled).toBe(true);
      expect(second.backupPath).toBe(first.backupPath);
      expect(await fs.readFile(first.wrapperPaths![0], 'utf8')).toBe(
        wrapperBefore,
      );
      expect(
        await fs.readFile(
          path.join(tempStateDir, 'integration-receipt.json'),
          'utf8',
        ),
      ).toBe(receiptBefore);
      expect(await fs.readdir(path.join(tempStateDir, 'backups'))).toHaveLength(
        1,
      );
    });

    it('refuses a reinstall after owned wrapper bytes were edited', async () => {
      await writePaseoConfig(baseConfig());
      const first = await installWithPlan();
      await fs.appendFile(first.wrapperPaths![0], '\n# edited\n');

      await expect(installWithPlan()).rejects.toThrow('OWNERSHIP');
    });

    it('refuses to adopt a preexisting loader with unsafe permissions', async () => {
      await writePaseoConfig({
        agents: { providers: { omp: { command: [fakeOmp] } } },
      });
      const plan = await service.plan();
      const integrationDir = path.join(tempStateDir, 'integration');
      await fs.ensureDir(integrationDir, { mode: 0o700 });
      await fs.chmod(integrationDir, 0o700);

      const loaderContent = generateOmpLoaderScript({
        cliPath: fakeCliPath,
        nodeCommand: process.execPath,
        stateDir: tempStateDir,
        platform: process.platform,
        ompVersion: '18.12.6',
        targetBinaries: [await fs.realpath(fakeOmp)],
        auxiliaryRuntimeKind: plan.launcher.auxiliaryRuntimeKind,
        auxiliaryRuntimePath: plan.launcher.auxiliaryRuntimePath,
        auxiliaryHome: plan.launcher.auxiliaryHome,
        paseoHome: plan.launcher.paseoHome,
      });
      await fs.writeFile(plan.loaderPath, loaderContent, { mode: 0o644 });
      await fs.chmod(plan.loaderPath, 0o644);

      await expect(service.install({ apply: true })).rejects.toThrow(
        'refusing to adopt',
      );
      const untouched = await readPaseoConfig();
      expect(
        (
          untouched.agents as Record<
            string,
            Record<string, Record<string, unknown>>
          >
        ).providers.omp.command,
      ).toEqual([fakeOmp]);
      expect((await fs.stat(plan.loaderPath)).mode & 0o777).toBe(0o644);
    });

    it('fails closed on a corrupt ownership receipt', async () => {
      await writePaseoConfig(baseConfig());
      await installWithPlan();
      await fs.writeFile(
        path.join(tempStateDir, 'integration-receipt.json'),
        '{ not json',
        'utf8',
      );
      await expect(installWithPlan()).rejects.toThrow('corrupted');
    });
    it('rejects ownership receipts with non-private descriptor permissions', async () => {
      await writePaseoConfig(baseConfig());
      await installWithPlan();
      const receiptPath = path.join(tempStateDir, 'integration-receipt.json');
      await fs.chmod(receiptPath, 0o644);

      await expect(service.install({ apply: true })).rejects.toThrow(
        'private 0600 permissions',
      );
      expect((await fs.stat(receiptPath)).mode & 0o777).toBe(0o644);
    });

    it('refuses to overwrite a foreign loader without an ownership receipt', async () => {
      await writePaseoConfig(baseConfig());
      const integrationDir = path.join(tempStateDir, 'integration');
      await fs.ensureDir(integrationDir, { mode: 0o700 });
      await fs.chmod(integrationDir, 0o700);
      await fs.writeFile(
        path.join(integrationDir, 'omp-harness-loader.mjs'),
        '// foreign\n',
        {
          mode: 0o600,
        },
      );
      await expect(installWithPlan()).rejects.toThrow(
        'not the expected owned artifact',
      );
    });

    it('recovers a journaled install whose config commit completed', async () => {
      await writePaseoConfig(baseConfig());
      const installed = await installWithPlan();
      const receiptPath = path.join(tempStateDir, 'integration-receipt.json');
      const receipt = JSON.parse(
        await fs.readFile(receiptPath, 'utf8'),
      ) as Record<string, unknown>;
      await fs.remove(receiptPath);
      await fs.writeFile(
        path.join(tempStateDir, 'integration-journal.json'),
        JSON.stringify({
          schemaVersion: 3,
          owner: 'agent-skills-standard/integration-journal',
          phase: 'install',
          createdAt: Date.now(),
          targetConfigPath: installed.targetConfigPath,
          expectedBeforeSha256: receipt.targetConfigSha256Before,
          expectedAfterSha256: receipt.targetConfigSha256After,
          receipt,
        }),
        { mode: 0o600 },
      );

      const recovered = await installWithPlan();
      expect(recovered.recovered).toBe(true);
      expect(await fs.pathExists(receiptPath)).toBe(true);
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-journal.json'),
        ),
      ).toBe(false);
    });

    it('refuses a concurrent mutation while the owned lock is held', async () => {
      await writePaseoConfig(baseConfig());
      await fs.writeFile(
        path.join(tempStateDir, 'integration.lock'),
        '{"pid":1}',
        { mode: 0o600 },
      );
      await expect(installWithPlan()).rejects.toThrow(
        'Stale locks require manual removal',
      );
    });
  });

  describe('uninstall()', () => {
    const baseConfig = () => ({
      version: 1,
      daemon: {
        terminalProfiles: [{ id: 'omp', name: 'Oh my pi', command: fakeOmp }],
      },
      agents: { providers: { omp: { enabled: true, command: [fakeOmp] } } },
      unrelated: { keep: true },
    });

    it('dry run reports planned restoration without mutating anything', async () => {
      await writePaseoConfig(baseConfig());
      const installed = await installWithPlan();
      const before = await fs.readFile(paseoConfigPath, 'utf8');

      const result = await service.uninstall({ apply: false });
      expect(result.applied).toBe(false);
      expect(await fs.readFile(paseoConfigPath, 'utf8')).toBe(before);
      expect(await fs.pathExists(installed.wrapperPaths![0])).toBe(true);
      expect(
        await fs.pathExists(path.join(tempStateDir, 'integration.lock')),
      ).toBe(false);
    });

    it('restores owned pointers, user fields, and removes owned artifacts', async () => {
      await writePaseoConfig(baseConfig());
      const installed = await installWithPlan();
      const result = await service.uninstall({ apply: true });
      expect(result.applied).toBe(true);

      const restored = await readPaseoConfig();
      const terminal = (restored.daemon as Record<string, unknown>)
        .terminalProfiles as Array<Record<string, unknown>>;
      expect(terminal[0].command).toBe(fakeOmp);
      expect(
        (
          restored.agents as Record<
            string,
            Record<string, Record<string, unknown>>
          >
        ).providers.omp.command,
      ).toEqual([fakeOmp]);
      expect(restored.unrelated).toEqual({ keep: true });
      expect(await fs.pathExists(installed.wrapperPaths![0])).toBe(false);
      expect(await fs.pathExists(installed.loaderPath!)).toBe(false);
      expect(await fs.pathExists(installed.backupPath!)).toBe(false);
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-receipt.json'),
        ),
      ).toBe(false);
    });

    it('dry run reports a pending journaled transition without mutating owned state', async () => {
      await writePaseoConfig(baseConfig());
      const installed = await installWithPlan();
      const receiptPath = path.join(tempStateDir, 'integration-receipt.json');
      const receipt = JSON.parse(
        await fs.readFile(receiptPath, 'utf8'),
      ) as Record<string, unknown>;
      const journalPath = path.join(tempStateDir, 'integration-journal.json');
      await fs.writeFile(
        journalPath,
        JSON.stringify({
          schemaVersion: 3,
          owner: 'agent-skills-standard/integration-journal',
          phase: 'uninstall',
          createdAt: Date.now(),
          targetConfigPath: installed.targetConfigPath,
          expectedBeforeSha256: receipt.targetConfigSha256After,
          expectedAfterSha256: receipt.targetConfigSha256After,
          receipt,
        }),
        { mode: 0o600 },
      );
      const configBefore = await fs.readFile(paseoConfigPath, 'utf8');

      const result = await service.uninstall({ apply: false });
      expect(result.applied).toBe(false);
      expect(result.pendingRecovery).toBe(true);
      expect(result.recoveryPhase).toBe('uninstall');

      // No recovery, deletion, receipt removal, or lock acquisition occurred.
      expect(await fs.readFile(paseoConfigPath, 'utf8')).toBe(configBefore);
      expect(await fs.pathExists(installed.wrapperPaths![0])).toBe(true);
      expect(await fs.pathExists(installed.loaderPath!)).toBe(true);
      expect(await fs.pathExists(installed.backupPath!)).toBe(true);
      expect(await fs.pathExists(receiptPath)).toBe(true);
      expect(await fs.pathExists(journalPath)).toBe(true);
      expect(
        await fs.pathExists(path.join(tempStateDir, 'integration.lock')),
      ).toBe(false);
      await fs.chmod(journalPath, 0o644);
      await expect(service.uninstall({ apply: false })).rejects.toThrow(
        'private 0600 permissions',
      );
      expect(await fs.pathExists(journalPath)).toBe(true);
    });

    it('refuses to delete an edited backup', async () => {
      await writePaseoConfig(baseConfig());
      const installed = await installWithPlan();
      await fs.appendFile(installed.backupPath!, '\n');
      await expect(service.uninstall({ apply: true })).rejects.toThrow(
        'Backup file',
      );
    });

    it('refuses when unrelated Paseo configuration changed since installation', async () => {
      await writePaseoConfig(baseConfig());
      await installWithPlan();
      const current = await readPaseoConfig();
      current.version = 2;
      await writePaseoConfig(current);
      await expect(service.uninstall({ apply: true })).rejects.toThrow(
        'changed outside owned pointers',
      );
    });

    it('removes a synthesized provider override without leaving empty residue', async () => {
      await writePaseoConfig({ version: 1 });
      const installed = await installWithPlan();
      expect(installed.applied).toBe(true);
      const receipt = JSON.parse(
        await fs.readFile(
          path.join(tempStateDir, 'integration-receipt.json'),
          'utf8',
        ),
      ) as { jsonPointers: Array<Record<string, unknown>> };
      expect(
        receipt.jsonPointers.every(
          (pointer) =>
            !Object.prototype.hasOwnProperty.call(pointer, 'previousValue'),
        ),
      ).toBe(true);
      const installedConfig = await readPaseoConfig();
      await service.install({ apply: true });
      expect(await readPaseoConfig()).toEqual(installedConfig);

      await service.uninstall({ apply: true });
      expect(await readPaseoConfig()).toEqual({ version: 1 });
    });

    it('restores an existing provider with an omitted command after idempotent reinstall', async () => {
      const original = {
        version: 1,
        agents: { providers: { omp: { label: 'OMP' } } },
      };
      await writePaseoConfig(original);
      const installed = await installWithPlan();
      const receipt = JSON.parse(
        await fs.readFile(
          path.join(tempStateDir, 'integration-receipt.json'),
          'utf8',
        ),
      ) as { jsonPointers: Array<Record<string, unknown>> };
      expect(receipt.jsonPointers).toHaveLength(1);
      expect(
        Object.prototype.hasOwnProperty.call(
          receipt.jsonPointers[0],
          'previousValue',
        ),
      ).toBe(false);
      await service.install({ apply: true });
      await service.uninstall({ apply: true });
      expect(await readPaseoConfig()).toEqual(original);
      expect(await fs.pathExists(installed.receiptPath!)).toBe(false);
    });
    it('recovers its serialized journal with omitted command provenance', async () => {
      await writePaseoConfig({ version: 1 });
      const installed = await installWithPlan();
      const receiptPath = path.join(tempStateDir, 'integration-receipt.json');
      const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8')) as {
        targetConfigSha256Before: string;
        targetConfigSha256After: string;
        targetConfigPath: string;
      };
      await fs.writeFile(
        path.join(tempStateDir, 'integration-journal.json'),
        JSON.stringify({
          schemaVersion: 3,
          owner: 'agent-skills-standard/integration-journal',
          phase: 'install',
          createdAt: Date.now(),
          targetConfigPath: receipt.targetConfigPath,
          expectedBeforeSha256: receipt.targetConfigSha256Before,
          expectedAfterSha256: receipt.targetConfigSha256After,
          receipt: JSON.parse(await fs.readFile(receiptPath, 'utf8')),
        }),
        { mode: 0o600 },
      );
      await fs.remove(receiptPath);

      await service.install({ apply: true });
      expect(await fs.pathExists(receiptPath)).toBe(true);
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-journal.json'),
        ),
      ).toBe(false);
      await service.uninstall({ apply: true });
      expect(await readPaseoConfig()).toEqual({ version: 1 });
      expect(await fs.pathExists(installed.loaderPath!)).toBe(false);
    });

    it('refuses when owned pointer values were edited', async () => {
      await writePaseoConfig(baseConfig());
      await installWithPlan();
      const current = await readPaseoConfig();
      const terminal = (current.daemon as Record<string, unknown>)
        .terminalProfiles as Array<Record<string, unknown>>;
      terminal[0].command = '/user/modified/omp';
      await writePaseoConfig(current);
      await expect(service.uninstall({ apply: true })).rejects.toThrow(
        'modified by user at pointer',
      );
    });
  });

  describe('context()', () => {
    let projectRoot: string;
    let fleetConfig: FleetConfig;

    beforeEach(async () => {
      projectRoot = await fs.realpath(
        await fs.mkdtemp(path.join(os.tmpdir(), 'ags-ctx-proj-')),
      );
      await fs.ensureDir(path.join(projectRoot, 'nested'));
      fleetConfig = createFleetTestConfig(projectRoot, {
        accounts: [
          {
            id: 'acc-test',
            provider: 'codex',
            model: 'gpt-5.4',
            thinking: 'standard',
            environmentKeys: ['OPENAI_API_KEY'],
            allowedDomains: ['personal'],
            allowedProviderEndpoints: ['https://api.openai.com/v1'],
          },
        ],
        domains: [
          { id: 'personal', hostIds: ['*'], pathPrefixes: [projectRoot] },
        ],
        rules: [
          {
            id: 'rule1',
            domain: 'personal',
            hostIds: ['*'],
            pathPrefixes: [projectRoot],
            accountId: 'acc-test',
            allowModelData: true,
            enabled: true,
          },
        ],
        projectAliases: [
          {
            hostId: 'srv-local',
            projectId: 'proj-1',
            logicalProjectId: 'logical-1',
            domain: 'personal',
            accountId: 'acc-test',
          },
        ],
      });
      const policyService = new FleetPolicyService(store);
      await policyService.configure(fleetConfig);
    });

    afterEach(async () => {
      await fs.remove(projectRoot);
    });

    const buildService = (
      inventory: unknown,
      releaseGuidance: string | null = 'Approved guidance',
      releaseRoots?: string[],
    ): IntegrationService => {
      const discovery = {
        discover: async () => inventory,
      } as unknown as HarnessDiscoveryService;
      const release = {
        context: async (project: { rootPath: string }) => {
          releaseRoots?.push(project.rootPath);
          return releaseGuidance
            ? { releaseDigest: 'sha256:rel-1', guidance: releaseGuidance }
            : null;
        },
      } as unknown as ReleaseService;
      return new IntegrationService(store, {
        paseoHome: tempPaseoHome,
        setupService,
        policyService: new FleetPolicyService(store),
        discoveryService: discovery,
        releaseService: release,
      });
    };

    const originInventory = (overrides?: Partial<TestHost>): TestInventory => ({
      schemaVersion: 1,
      complete: true,
      hosts: [
        {
          hostKey: 'local',
          status: 'reachable',
          serverId: 'srv-local',
          projects: [
            {
              projectId: 'proj-1',
              name: 'project',
              path: projectRoot,
              kind: 'git',
              projectKey: 'display-only-key',
            },
          ],
          ...overrides,
        },
      ],
    });

    it('resolves guidance for the canonical local project identity', async () => {
      const ctx = await buildService(originInventory()).context(
        path.join(projectRoot, 'nested'),
        'darwin',
        '18.12.6',
      );
      expect(ctx).toEqual({
        releaseDigest: 'sha256:rel-1',
        guidance: 'Approved guidance',
        scope: {
          hostId: 'srv-local',
          projectId: 'proj-1',
          logicalProjectId: 'logical-1',
          rootPath: projectRoot,
        },
      });
    });

    it('uses a registered checkout root under the global path policy', async () => {
      const checkoutParent = await fs.realpath(
        await fs.mkdtemp(path.join(os.tmpdir(), 'ags-ctx-global-checkouts-')),
      );
      const checkoutRoot = path.join(checkoutParent, 'registered-checkout');
      await fs.ensureDir(path.join(checkoutRoot, 'nested'));
      const allowedRoots = [projectRoot, checkoutParent];
      await new FleetPolicyService(store).configure({
        ...fleetConfig,
        generation: fleetConfig.generation + 1,
        domains: fleetConfig.domains.map((domain) => ({
          ...domain,
          pathPrefixes: allowedRoots,
        })),
        rules: fleetConfig.rules.map((rule) => ({
          ...rule,
          pathPrefixes: allowedRoots,
        })),
      });

      const inventory = originInventory();
      inventory.hosts[0].projects[0].checkouts = [
        { workspaceId: 'workspace-1', path: checkoutRoot, kind: 'worktree' },
        {
          workspaceId: 'workspace-duplicate',
          path: checkoutRoot,
          kind: 'directory',
        },
      ];
      try {
        const releaseRoots: string[] = [];
        const context = await buildService(
          inventory,
          'Approved guidance',
          releaseRoots,
        ).context(path.join(checkoutRoot, 'nested'), 'darwin', '18.12.6');
        expect(context).toEqual({
          releaseDigest: 'sha256:rel-1',
          guidance: 'Approved guidance',
          scope: {
            hostId: 'srv-local',
            projectId: 'proj-1',
            logicalProjectId: 'logical-1',
            rootPath: checkoutRoot,
          },
        });
        expect(releaseRoots).toEqual([checkoutRoot]);
      } finally {
        await fs.remove(checkoutParent);
      }
    });

    it('denies checkout paths outside global policy and ambiguous project associations', async () => {
      const outsideRoot = await fs.realpath(
        await fs.mkdtemp(
          path.join(os.tmpdir(), 'ags-ctx-unapproved-checkout-'),
        ),
      );
      await fs.ensureDir(path.join(outsideRoot, 'nested'));
      let ambiguousRoot: string | undefined;
      try {
        const inventory = originInventory();
        inventory.hosts[0].projects[0].checkouts = [
          {
            workspaceId: 'workspace-outside',
            path: outsideRoot,
            kind: 'checkout',
          },
        ];
        const deniedReleaseRoots: string[] = [];
        expect(
          await buildService(
            inventory,
            'Approved guidance',
            deniedReleaseRoots,
          ).context(path.join(outsideRoot, 'nested'), 'darwin', '18.12.6'),
        ).toBeNull();
        expect(deniedReleaseRoots).toEqual([]);

        ambiguousRoot = await fs.realpath(
          await fs.mkdtemp(
            path.join(projectRoot, 'ags-ctx-ambiguous-checkout-'),
          ),
        );
        await fs.ensureDir(path.join(ambiguousRoot, 'nested'));
        const ambiguous = originInventory();
        ambiguous.hosts[0].projects[0].checkouts = [
          {
            workspaceId: 'workspace-ambiguous',
            path: ambiguousRoot,
            kind: 'checkout',
          },
        ];
        ambiguous.hosts[0].projects.push({
          projectId: 'proj-2',
          name: 'same-checkout',
          path: ambiguousRoot,
          kind: 'directory',
        });
        const ambiguousReleaseRoots: string[] = [];
        expect(
          await buildService(
            ambiguous,
            'Approved guidance',
            ambiguousReleaseRoots,
          ).context(path.join(ambiguousRoot, 'nested'), 'darwin', '18.12.6'),
        ).toBeNull();
        expect(ambiguousReleaseRoots).toEqual([]);
      } finally {
        await fs.remove(outsideRoot);
        if (ambiguousRoot) {
          await fs.remove(ambiguousRoot);
        }
      }
    });

    it('requires a definite origin server identity', async () => {
      const inventory = originInventory({ serverId: undefined });
      const ctx = await buildService(inventory).context(
        projectRoot,
        'darwin',
        '18.12.6',
      );
      expect(ctx).toBeNull();
    });

    it('denies an origin host whose project inventory is partial or failed', async () => {
      const inventory = originInventory({ error: 'PROJECT_LIMIT_EXCEEDED' });
      const ctx = await buildService(inventory).context(
        projectRoot,
        'darwin',
        '18.12.6',
      );
      expect(ctx).toBeNull();

      const unreachable = originInventory({ status: 'unreachable' });
      expect(
        await buildService(unreachable).context(
          projectRoot,
          'darwin',
          '18.12.6',
        ),
      ).toBeNull();
    });

    it('does not let an offline remote host block the local origin', async () => {
      const inventory: TestInventory = {
        ...originInventory(),
        complete: false,
      };
      const ctx = await buildService(inventory).context(
        projectRoot,
        'darwin',
        '18.12.6',
      );
      expect(ctx).not.toBeNull();
    });

    it('rejects a nonlocal configured origin instead of realpathing remote roots', async () => {
      const remoteSetup = {
        load: async () => ({
          schemaVersion: 1 as const,
          paseoCommand: '/usr/local/bin/paseo',
          origin: 'some-remote-host',
        }),
      } as unknown as HarnessSetupService;
      const discovery = {
        discover: async () => originInventory(),
      } as unknown as HarnessDiscoveryService;
      const release = {
        context: async () => ({
          releaseDigest: 'sha256:rel-1',
          guidance: 'Approved guidance',
        }),
      } as unknown as ReleaseService;
      const remoteService = new IntegrationService(store, {
        paseoHome: tempPaseoHome,
        setupService: remoteSetup,
        policyService: new FleetPolicyService(store),
        discoveryService: discovery,
        releaseService: release,
      });
      const ctx = await remoteService.context(projectRoot, 'darwin', '18.12.6');
      expect(ctx).toBeNull();
    });

    it('rejects equal-length canonical root matches', async () => {
      const inventory = originInventory();
      inventory.hosts[0].projects.push({
        projectId: 'proj-2',
        name: 'project-copy',
        path: projectRoot,
        kind: 'git',
      });
      const ctx = await buildService(inventory).context(
        projectRoot,
        'darwin',
        '18.12.6',
      );
      expect(ctx).toBeNull();
    });

    it('ignores unrelated hosts with an identical path', async () => {
      const inventory = originInventory();
      inventory.hosts.push({
        hostKey: 'other-machine',
        status: 'reachable',
        serverId: 'srv-remote',
        projects: [
          {
            projectId: 'proj-9',
            name: 'remote',
            path: projectRoot,
            kind: 'git',
          },
        ],
      });
      const ctx = await buildService(inventory).context(
        projectRoot,
        'darwin',
        '18.12.6',
      );
      expect(ctx).not.toBeNull();
    });

    it('returns null when policy denies or no release is approved', async () => {
      expect(
        await buildService(originInventory(), null).context(
          projectRoot,
          'darwin',
          '18.12.6',
        ),
      ).toBeNull();

      const denied = createFleetTestConfig(projectRoot, {
        domains: [
          {
            id: 'personal',
            hostIds: ['*'],
            pathPrefixes: ['/nonexistent-root'],
          },
        ],
        rules: [],
        projectAliases: [],
      });
      await new FleetPolicyService(store).configure({
        ...denied,
        generation: 2,
      });
      expect(
        await buildService(originInventory()).context(
          projectRoot,
          'darwin',
          '18.12.6',
        ),
      ).toBeNull();
    });

    it('denies context without a verified OMP version', async () => {
      const svc = buildService(originInventory());
      expect(await svc.context(projectRoot, 'darwin', '')).toBeNull();
      expect(await svc.context(projectRoot, 'darwin', 'latest')).toBeNull();
    });
  });

  describe('Serialization helpers', () => {
    it('round-trips JSON pointer values and deep equality', () => {
      const doc: Record<string, unknown> = {};
      setJsonPointerValue(doc, '/agents/providers/a~1b/command', ['x']);
      expect(
        getJsonPointerValue(doc, '/agents/providers/a~1b/command'),
      ).toEqual(['x']);
      expect(valuesEqual(['x'], ['x'])).toBe(true);
      expect(valuesEqual(['x'], ['y'])).toBe(false);
    });
  });
});
