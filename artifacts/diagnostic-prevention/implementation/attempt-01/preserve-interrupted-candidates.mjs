import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const base = path.join(root, 'artifacts/diagnostic-prevention/implementation/attempt-01');
const stage = '/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-stage-wR2SO5';
const audit = JSON.parse(await fs.readFile(path.join(base, 'root-interrupted-effect-audit-01.json'), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const inputs = audit.files.map(file => file.path);
for (const file of audit.files.filter(file => file.path !== '.skills-lock.json')) {
  const bytes = await fs.readFile(path.join(stage, file.path));
  if (hash(bytes) !== file.candidateSha256) throw new Error(`Candidate changed after audit: ${file.path}`);
}
const archive = path.join(base, 'root-interrupted-candidates-01.tar');
const handle = await fs.open(archive, 'wx');
try { const result = spawnSync('tar', ['-cf', '/dev/fd/3', ...inputs], { cwd: stage, stdio: ['ignore', 'pipe', 'pipe', handle.fd], timeout: 30000 }); if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr.toString()); } finally { await handle.close(); }
await fs.chmod(archive, 0o444);
const record = { schemaVersion: 1, kind: 'RAW_INTERRUPTED_STAGE_CANDIDATES_NOT_ACTIVE_AUTHORITY', archive: path.relative(root, archive), sha256: hash(await fs.readFile(archive)), files: inputs.length, stageLockSha256: hash(await fs.readFile(path.join(stage, '.skills-lock.json'))), effectAudit: 'root-interrupted-effect-audit-01.json', limits: ['Preserves candidate bytes only; staged ownership is not active authority.', 'No resume, rollback, source fix, publication or fabricated completion receipt.'] };
await fs.writeFile(path.join(base, 'root-interrupted-candidates-01.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
