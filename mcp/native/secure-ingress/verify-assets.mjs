import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = join(packageRoot, 'native', 'secure-ingress', 'secure_ingress.c');
const targets = {
  'darwin-arm64': {
    minimumOsVersion: '11.0',
    minimumGlibcVersion: null,
    minimumKernelVersion: null,
  },
  'darwin-x64': {
    minimumOsVersion: '10.15',
    minimumGlibcVersion: null,
    minimumKernelVersion: null,
  },
  'linux-arm64-gnu': {
    minimumOsVersion: null,
    minimumGlibcVersion: '2.28',
    minimumKernelVersion: '4.18',
  },
  'linux-x64-gnu': {
    minimumOsVersion: null,
    minimumGlibcVersion: '2.28',
    minimumKernelVersion: '4.18',
  },
};
const manifestKeys = [
  'schemaVersion',
  'apiVersion',
  'napiVersion',
  'target',
  'sourceSha256',
  'binarySha256',
  'compiler',
  'sdk',
  'compatibility',
  'buildFlags',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hasExactKeys = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const isSafeLabel = (value) =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.includes('/') && !value.includes('\\') && !value.includes('\0');

async function readRequiredFile(path, description) {
  try {
    return await readFile(path);
  } catch {
    throw new Error(`${description} is missing or unreadable`);
  }
}

function verifyBinaryTarget(target, binary) {
  if (target.startsWith('darwin-')) {
    const expectedCpuType = target === 'darwin-arm64' ? 0x0100000c : 0x01000007;
    if (
      binary.length < 8 ||
      binary.readUInt32LE(0) !== 0xfeedfacf ||
      binary.readUInt32LE(4) !== expectedCpuType
    ) {
      throw new Error(`${target}: binary is not a matching 64-bit Mach-O image`);
    }
    return;
  }

  const expectedMachine = target === 'linux-arm64-gnu' ? 183 : 62;
  if (
    binary.length < 20 ||
    binary[0] !== 0x7f ||
    binary[1] !== 0x45 ||
    binary[2] !== 0x4c ||
    binary[3] !== 0x46 ||
    binary[4] !== 2 ||
    binary[5] !== 1 ||
    binary.readUInt16LE(16) !== 3 ||
    binary.readUInt16LE(18) !== expectedMachine
  ) {
    throw new Error(`${target}: binary is not a matching 64-bit little-endian ELF shared object`);
  }
}

const targetArgs = process.argv.slice(2);
if (
  targetArgs.length !== 0 &&
  (targetArgs.length !== 2 ||
    targetArgs[0] !== '--target' ||
    !Object.hasOwn(targets, targetArgs[1]))
) {
  console.error(
    `Usage: node verify-assets.mjs [--target ${Object.keys(targets).join('|')}]`,
  );
  process.exit(2);
}
const targetsToVerify =
  targetArgs.length === 2
    ? [[targetArgs[1], targets[targetArgs[1]]]]
    : Object.entries(targets);

async function verifyTarget(target, expectedCompatibility, sourceSha256) {
  const assetDirectory = join(packageRoot, 'prebuilds', target);
  const binaryPath = join(assetDirectory, 'secure_ingress.node');
  const manifestPath = join(assetDirectory, 'manifest.json');
  const [binary, manifestBytes] = await Promise.all([
    readRequiredFile(binaryPath, `${target}: secure_ingress.node`),
    readRequiredFile(manifestPath, `${target}: manifest.json`),
  ]);
  verifyBinaryTarget(target, binary);

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    throw new Error(`${target}: manifest.json is not valid JSON`);
  }

  if (!hasExactKeys(manifest, manifestKeys)) {
    throw new Error(`${target}: manifest fields do not match schema version 1`);
  }
  if (
    manifest.schemaVersion !== 1 ||
    manifest.apiVersion !== 1 ||
    manifest.napiVersion !== 8 ||
    manifest.target !== target
  ) {
    throw new Error(`${target}: manifest schema, API, N-API, or target mismatch`);
  }
  if (
    !/^[a-f0-9]{64}$/.test(manifest.sourceSha256) ||
    manifest.sourceSha256 !== sourceSha256 ||
    !/^[a-f0-9]{64}$/.test(manifest.binarySha256) ||
    manifest.binarySha256 !== sha256(binary)
  ) {
    throw new Error(`${target}: source or binary SHA-256 does not match`);
  }
  if (
    !hasExactKeys(manifest.compiler, ['name', 'version']) ||
    !isSafeLabel(manifest.compiler.name) ||
    !isSafeLabel(manifest.compiler.version) ||
    !hasExactKeys(manifest.sdk, ['name', 'version']) ||
    !isSafeLabel(manifest.sdk.name) ||
    !isSafeLabel(manifest.sdk.version)
  ) {
    throw new Error(`${target}: compiler or SDK provenance is invalid`);
  }
  if (
    !hasExactKeys(manifest.compatibility, [
      'minimumOsVersion',
      'minimumGlibcVersion',
      'minimumKernelVersion',
    ]) ||
    Object.entries(expectedCompatibility).some(
      ([key, expected]) => manifest.compatibility[key] !== expected,
    )
  ) {
    throw new Error(`${target}: compatibility baseline does not match the approved target`);
  }
  if (
    !Array.isArray(manifest.buildFlags) ||
    manifest.buildFlags.some((flag) => !isSafeLabel(flag))
  ) {
    throw new Error(`${target}: build flags are invalid or contain an absolute path`);
  }
}

try {
  const source = await readRequiredFile(sourcePath, 'Native source');
  const sourceSha256 = sha256(source);
  for (const [target, compatibility] of targetsToVerify) {
    await verifyTarget(target, compatibility, sourceSha256);
  }
  console.log(`Verified native assets for ${targetsToVerify.map(([target]) => target).join(', ')}`);
} catch (error) {
  console.error(`Native asset verification failed: ${error.message}`);
  process.exitCode = 1;
}
