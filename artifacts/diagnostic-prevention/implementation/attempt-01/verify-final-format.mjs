import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as prettier from 'prettier';
const root = process.cwd();
const archive = path.join(root, 'artifacts/diagnostic-prevention/implementation/attempt-01/task-1-qualified-preformat-source-01.tar');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const archiveSha256 = sha256(await fs.readFile(archive));
if (archiveSha256 !== '117e1c20ae1bcb17378a12cb772a25f1d6faf0c22b9307c94d65f792fa6b4953') throw new Error('Preformat archive identity mismatch');
const paths = ['scripts/generation/index.ts', 'scripts/generation/isolated-stage.ts', 'scripts/generation/isolated-stage.test.ts', 'cli/src/services/SyncService.ts', 'cli/src/services/__tests__/SyncInstallLifecycle.spec.ts', 'cli/src/services/utils/__tests__/WorkflowTransformer.spec.ts', 'cli/src/services/LockfileService.ts', 'cli/src/services/__tests__/LockfileService.spec.ts', 'cli/src/services/install/__tests__/UninstallService.spec.ts'];
const files = [];
for (const relative of paths) {
  const filepath = path.join(root, relative);
  const before = execFileSync('tar', ['-xOf', archive, relative], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const after = await fs.readFile(filepath, 'utf8');
  const config = await prettier.resolveConfig(filepath, { editorconfig: true });
  const expected = await prettier.format(before, { ...config, filepath });
  files.push({ path: relative, beforeSha256: sha256(before), afterSha256: sha256(after), exactFormatterOutput: after === expected });
}
const record = { schemaVersion: 1, kind: 'EXACT_PRETTIER_TRANSFORM_VERIFICATION', archiveSha256, prettierVersion: prettier.version, passed: files.every(file => file.exactFormatterOutput), files, limits: ['Exact formatter transformation, not a general semantic-equivalence theorem.', 'Behavioral and semantic checks are recorded separately.'] };
await fs.writeFile(process.argv[2], JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
if (!record.passed) process.exitCode = 1;
