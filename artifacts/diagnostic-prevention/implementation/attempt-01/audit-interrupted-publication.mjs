import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd();
const attempt = path.join(root, 'artifacts/generation-logs/attempt-2026-10-29T07-41-49-505Z-fd751a');
const stage = '/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-stage-wR2SO5';
const hash = value => createHash('sha256').update(value).digest('hex');
async function digest(file) { try { const stat = await fs.lstat(file); if (!stat.isFile()) throw new Error(`Nonregular audit input ${file}`); return hash(await fs.readFile(file)); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
const raw = await fs.readFile(path.join(attempt, 'publication-before/proof.json'));
const proof = JSON.parse(raw);
const files = [];
for (const before of proof.records) {
  const relative = before.path;
  if (path.isAbsolute(relative) || relative.split('/').includes('..')) throw new Error('Unsafe audit path');
  const activeSha256 = await digest(path.join(root, relative));
  if (relative === '.skills-lock.json') { files.push({ path: relative, beforeSha256: before.sha256, activeSha256, state: activeSha256 === before.sha256 ? 'LEDGER_UNCHANGED' : 'LEDGER_CHANGED_REQUIRES_REVIEW' }); continue; }
  const archivedSha256 = await digest(path.join(attempt, 'publication-before', relative));
  const candidateSha256 = await digest(path.join(stage, relative));
  const beforeIntact = archivedSha256 === before.sha256;
  const state = !beforeIntact ? 'ARCHIVE_MISMATCH' : activeSha256 === candidateSha256 && activeSha256 !== before.sha256 ? 'PUBLISHED_CANDIDATE' : activeSha256 === before.sha256 ? 'ORIGINAL_BEFORE' : 'UNEXPECTED_ACTIVE_BYTES';
  files.push({ path: relative, beforeSha256: before.sha256, archivedSha256, candidateSha256, activeSha256, state });
}
const counts = Object.fromEntries([...new Set(files.map(file => file.state))].map(state => [state, files.filter(file => file.state === state).length]));
const record = { schemaVersion: 1, kind: 'INTERRUPTED_PUBLICATION_ACTUAL_EFFECT_AUDIT_NOT_COMPLETION', attempt: path.relative(root, attempt), stage, publicationBeforeProofSha256: hash(raw), counts, files, limits: ['Read-only current-byte classification after the external 1200-second deadline; no resume, rollback, ownership adoption or completion receipt supplied.', 'Stage manifest is not active authority. Existing adoption proof and before-images must be independently qualified for any recovery.'] };
await fs.writeFile(process.argv[2], JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ counts, auditedPaths: files.length }));
