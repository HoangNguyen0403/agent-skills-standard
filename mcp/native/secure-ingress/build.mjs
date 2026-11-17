import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { accessSync, constants, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = join(packageRoot, 'native', 'secure-ingress', 'secure_ingress.c');
const targets = {
  'darwin-arm64': { platform: 'darwin', arch: 'arm64', minimumOsVersion: '11.0', minimumGlibcVersion: null, minimumKernelVersion: null },
  'darwin-x64': { platform: 'darwin', arch: 'x64', minimumOsVersion: '10.15', minimumGlibcVersion: null, minimumKernelVersion: null },
  'linux-arm64-gnu': { platform: 'linux', arch: 'arm64', minimumOsVersion: null, minimumGlibcVersion: '2.28', minimumKernelVersion: '4.18' },
  'linux-x64-gnu': { platform: 'linux', arch: 'x64', minimumOsVersion: null, minimumGlibcVersion: '2.28', minimumKernelVersion: '4.18' },
};

export function supportsLinuxKernelRelease(release) {
  if (typeof release !== 'string') return false;
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?(?:[-+][0-9A-Za-z._+-]+)?$/.exec(release);
  if (match === null) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = match[3] === undefined ? 0 : Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return false;
  return major > 4 || (major === 4 && minor >= 18);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function parseArguments(args) {
  if (args.length !== 4) return null;
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if ((name !== '--target' && name !== '--node-include') || values.has(name)) return null;
    values.set(name, args[index + 1]);
  }
  const target = values.get('--target');
  const include = values.get('--node-include');
  if (typeof target !== 'string' || !Object.hasOwn(targets, target) || typeof include !== 'string') return null;
  return { target, include: resolve(include) };
}

const toolEnvironment = {
  PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
  LANG: 'C',
  LC_ALL: 'C',
};

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
    env: toolEnvironment,
  });
  return typeof output === 'string' ? output.trim() : '';
}

function versionParts(value) {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(value);
  if (match === null) throw new Error('toolchain version is not numeric');
  return match.slice(1).map((part) => Number(part ?? '0'));
}

function compareVersion(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function requireHeaders(includePath) {
  let metadata;
  try {
    metadata = statSync(includePath);
  } catch {
    throw new Error('--node-include must name an existing Node header directory');
  }
  if (!metadata.isDirectory()) throw new Error('--node-include must name an existing Node header directory');
  for (const header of ['node_api.h', 'js_native_api.h', 'js_native_api_types.h']) {
    try {
      accessSync(join(includePath, header), constants.R_OK);
    } catch {
      throw new Error('--node-include is missing required Node-API headers');
    }
  }
}

function currentGlibcVersion() {
  try {
    const version = process.report?.getReport().header.glibcVersionRuntime;
    if (typeof version !== 'string' || !/^\d+\.\d+(?:\.\d+)?$/.test(version)) return null;
    return version;
  } catch {
    return null;
  }
}

function binaryTargetMatches(target, bytes) {
  if (target.startsWith('darwin-')) {
    const cpu = target === 'darwin-arm64' ? 0x0100000c : 0x01000007;
    return bytes.length >= 8 && bytes.readUInt32LE(0) === 0xfeedfacf && bytes.readUInt32LE(4) === cpu;
  }
  const machine = target === 'linux-arm64-gnu' ? 183 : 62;
  return bytes.length >= 20 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c &&
    bytes[3] === 0x46 && bytes[4] === 2 && bytes[5] === 1 && bytes.readUInt16LE(16) === 3 &&
    bytes.readUInt16LE(18) === machine;
}

function verifyLinuxImports(binaryPath) {
  const symbols = run('readelf', ['--dyn-syms', '--wide', binaryPath]);
  for (const line of symbols.split('\n')) {
    if (!/\bUND\b/.test(line)) continue;
    if (/@GLIBC_PRIVATE\b/.test(line)) throw new Error('binary imports a private GLIBC symbol');
    for (const match of line.matchAll(/@GLIBC_(\d+)\.(\d+)/g)) {
      const version = `${match[1]}.${match[2]}`;
      if (compareVersion(version, '2.28') > 0) throw new Error('binary imports a GLIBC symbol newer than 2.28');
    }
  }
}

function verifyDarwinMinimum(binaryPath, expected) {
  const loadCommands = run('otool', ['-l', binaryPath]);
  const match = /\bminos\s+(\d+(?:\.\d+){1,2})\b/.exec(loadCommands);
  if (match === null || compareVersion(match[1], expected) !== 0) {
    throw new Error('Darwin deployment minimum does not match the selected target');
  }
}

function safeLabel(value) {
  return typeof value === 'string' && value.length > 0 &&
    !value.includes('/') && !value.includes('\\') && !value.includes('\0');
}

function buildDarwin(target, expected, includePath, outputPath) {
  const architecture = expected.arch === 'arm64' ? 'arm64' : 'x86_64';
  const compilerVersion = run('xcrun', ['--sdk', 'macosx', 'clang', '--version']).split('\n')[0];
  const sdkPath = run('xcrun', ['--sdk', 'macosx', '--show-sdk-path']);
  const sdkVersion = run('xcrun', ['--sdk', 'macosx', '--show-sdk-version']);
  if (!safeLabel(compilerVersion) || !/^\d+(?:\.\d+){1,2}$/.test(sdkVersion)) {
    throw new Error('Apple compiler or SDK metadata is invalid');
  }
  const flags = [
    '-std=c11', '-O2', '-fPIC', '-bundle', '-undefined', 'dynamic_lookup', '-pthread',
    `-mmacosx-version-min=${expected.minimumOsVersion}`, '-DNAPI_VERSION=8', '-Wall', '-Wextra', '-Werror',
  ];
  run('xcrun', [
    '--sdk', 'macosx', 'clang', ...flags, '-arch', architecture, '-isysroot', sdkPath,
    '-I', includePath, sourcePath, '-o', outputPath,
  ], { stdio: 'inherit' });
  const bytes = readFileSync(outputPath);
  if (!binaryTargetMatches(target, bytes)) throw new Error('built Mach-O architecture does not match target');
  verifyDarwinMinimum(outputPath, expected.minimumOsVersion);
  return {
    compiler: { name: 'Apple clang', version: compilerVersion.replace(/^Apple clang version\s+/, '') },
    sdk: { name: 'macOS SDK', version: sdkVersion },
    buildFlags: [...flags, `arch=${expected.arch}`, `sdk=${sdkVersion}`],
  };
}

function buildLinux(target, expected, includePath, outputPath, glibcVersion) {
  const compilerVersion = run('cc', ['--version']).split('\n')[0];
  if (!safeLabel(compilerVersion)) throw new Error('C compiler metadata is invalid');
  const flags = [
    '-std=c11', '-O2', '-fPIC', '-shared', '-pthread', '-DNAPI_VERSION=8',
    '-Wall', '-Wextra', '-Werror',
  ];
  run('cc', [...flags, '-I', includePath, sourcePath, '-o', outputPath, '-lm'], { stdio: 'inherit' });
  const bytes = readFileSync(outputPath);
  if (!binaryTargetMatches(target, bytes)) throw new Error('built ELF architecture does not match target');
  verifyLinuxImports(outputPath);
  return {
    compiler: { name: 'cc', version: compilerVersion },
    sdk: { name: 'glibc', version: glibcVersion },
    buildFlags: [...flags, '-lm', `glibc-minimum=${expected.minimumGlibcVersion}`, `kernel-minimum=${expected.minimumKernelVersion}`],
  };
}

function build(target, includePath) {
  const expected = targets[target];
  if (os.platform() !== expected.platform || process.arch !== expected.arch) {
    throw new Error('selected target must match the current build host');
  }
  if (expected.platform === 'linux' && !supportsLinuxKernelRelease(os.release())) {
    throw new Error('Linux build host kernel is below or cannot establish the 4.18 minimum');
  }
  requireHeaders(includePath);
  const glibcVersion = expected.platform === 'linux' ? currentGlibcVersion() : null;
  if (expected.platform === 'linux' && (glibcVersion === null || compareVersion(glibcVersion, '2.28') < 0)) {
    throw new Error('Linux build host must provide an identifiable glibc 2.28 or newer');
  }
  const outputDirectory = join(packageRoot, 'prebuilds', target);
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, 'secure_ingress.node');
  const provenance = expected.platform === 'darwin'
    ? buildDarwin(target, expected, includePath, outputPath)
    : buildLinux(target, expected, includePath, outputPath, glibcVersion);
  const source = readFileSync(sourcePath);
  const binary = readFileSync(outputPath);
  const manifest = {
    schemaVersion: 1,
    apiVersion: 1,
    napiVersion: 8,
    target,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    binarySha256: createHash('sha256').update(binary).digest('hex'),
    compiler: provenance.compiler,
    sdk: provenance.sdk,
    compatibility: {
      minimumOsVersion: expected.minimumOsVersion,
      minimumGlibcVersion: expected.minimumGlibcVersion,
      minimumKernelVersion: expected.minimumKernelVersion,
    },
    buildFlags: provenance.buildFlags,
  };
  writeFileSync(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
  process.stdout.write(`Built ${target} native ingress asset.\n`);
}

const isDirectExecution = process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed === null) {
    fail('Usage: node build.mjs --target <target> --node-include <existing-directory>');
  } else {
    try {
      build(parsed.target, parsed.include);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Native build failed';
      fail(message);
    }
  }
}
