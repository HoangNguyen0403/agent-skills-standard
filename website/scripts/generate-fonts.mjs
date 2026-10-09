import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteDirectory = path.resolve(scriptDirectory, '..');
const fontsDirectory = path.resolve(websiteDirectory, 'src/fonts');
const fontFiles = [
  'space-grotesk-600.ttf',
  'source-sans-3-400.ttf',
  'source-sans-3-600.ttf',
  'ibm-plex-mono-400.ttf',
];
const coverageFiles = [
  path.resolve(fontsDirectory, 'font-subset-extra.txt'),
  path.resolve(websiteDirectory, 'src/landing/content.ts'),
];
const subsetter = process.env.PYFTSUBSET ?? path.resolve(
  websiteDirectory,
  '.asset-venv',
  process.platform === 'win32' ? 'Scripts/pyftsubset.exe' : 'bin/pyftsubset'
);
const python = path.resolve(
  websiteDirectory,
  '.asset-venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'
);
const renameScript = path.resolve(scriptDirectory, 'rename-font-family.py');
const fontRenamingFamilies = {
  heading: 'AGS Display',
  'body-regular': 'AGS Text',
  'body-semibold': 'AGS Text',
  'mono-code': 'AGS Code',
};
const manifestRoles = [
  ['heading', 'Space Grotesk', '600', 'space-grotesk-600.ttf', 'space-grotesk-600.woff2', 'space-grotesk-OFL.txt'],
  ['body-regular', 'Source Sans 3', '400', 'source-sans-3-400.ttf', 'source-sans-3-400.woff2', 'source-sans-3-OFL.txt'],
  ['body-semibold', 'Source Sans 3', '600', 'source-sans-3-600.ttf', 'source-sans-3-600.woff2', 'source-sans-3-OFL.txt'],
  ['mono-code', 'IBM Plex Mono', '400', 'ibm-plex-mono-400.ttf', 'ibm-plex-mono-400.woff2', 'ibm-plex-mono-OFL.txt'],
];
const sha256 = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

for (const inputPath of [...fontFiles.map((name) => path.resolve(fontsDirectory, name)), ...coverageFiles]) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Required local font subset input is missing: ${path.relative(websiteDirectory, inputPath)}`);
  }
}

if (!fs.existsSync(subsetter) && !process.env.PYFTSUBSET) {
  throw new Error('pyftsubset is unavailable. Run "pnpm --filter @ags/website assets:setup" or set PYFTSUBSET.');
}
if (!fs.existsSync(python) || !fs.existsSync(renameScript)) {
  throw new Error('The local fontTools Python environment or family-renaming script is unavailable. Run "pnpm --filter @ags/website assets:setup".');
}

const entries = [];
for (const [role, family, weight, sourceFile, outputFile, license] of manifestRoles) {
  const sourcePath = path.resolve(fontsDirectory, sourceFile);
  const outputPath = path.resolve(fontsDirectory, outputFile);
  const args = [
    sourcePath,
    `--output-file=${outputPath}`,
    '--flavor=woff2',
    '--layout-features=*',
    ...coverageFiles.map((filePath) => `--text-file=${filePath}`),
  ];
  const result = spawnSync(subsetter, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pyftsubset failed for ${sourceFile}:\n${result.stderr || result.stdout}`);
  }

  const renamed = spawnSync(python, [renameScript, outputPath, fontRenamingFamilies[role]], { encoding: 'utf8' });
  if (renamed.error) throw renamed.error;
  if (renamed.status !== 0) {
    throw new Error(`Font family rename failed for ${outputFile}:\n${renamed.stderr || renamed.stdout}`);
  }
  console.log(renamed.stdout.trim());

  const output = fs.statSync(outputPath);
  if (output.size === 0) throw new Error(`pyftsubset produced an empty font: ${outputFile}`);
  entries.push({
    role,
    family,
    modifiedFamily: fontRenamingFamilies[role],
    weight,
    style: 'normal',
    file: outputFile,
    sourceTtf: sourceFile,
    license,
    subset: {
      sourceSha256: sha256(sourcePath),
      outputSha256: sha256(outputPath),
      bytes: output.size,
    },
  });
  console.log(`Subset and rename ${sourceFile} -> ${outputFile} (${output.size} bytes, family ${fontRenamingFamilies[role]}, sha256 ${entries.at(-1).subset.outputSha256}).`);
}

const manifest = {
  version: '3.0.0',
  description: 'Locally reproducible Unicode-subset WOFF2 fonts for Next.js next/font/local.',
  provenance: {
    upstream: 'Google Fonts Open Font License repository',
    sourceDirectory: 'website/src/fonts',
    coverageSources: ['website/src/landing/content.ts', 'website/src/fonts/font-subset-extra.txt'],
    outputDirectory: 'website/src/fonts',
  },
  subsetSettings: {
    tool: 'fonttools pyftsubset',
    flavor: 'woff2',
    layoutFeatures: '*',
    glyphClosure: 'FontTools default composite and layout dependency closure',
    unicodeCoverage: 'All characters in reviewed landing copy plus UI/status/retry text, exact commands, and punctuation/symbols in font-subset-extra.txt',
    renamedFamilies: fontRenamingFamilies,
    reservedFontNameHandling: 'Modified subsets are renamed to AGS Display, AGS Text, or AGS Code.',
  },
  roles: entries,
};
fs.writeFileSync(path.resolve(fontsDirectory, 'fonts-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Font subsets and provenance manifest written to ${path.relative(websiteDirectory, fontsDirectory)}.`);
