const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.cwd(),receipt=JSON.parse(fs.readFileSync('artifacts/ai-test-assurance/evidence/export-receipt.json','utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');let packaged=0;
for(const entry of receipt.copied_files){
 const active=fs.readFileSync(path.join(root,entry.path)),stage=fs.readFileSync(path.join(receipt.stage_dir,entry.path));
 assert.deepEqual(active,stage,entry.path);assert.equal(sha(active),entry.sha256_after||entry.sha256);
 const match=entry.path.match(/^\.(?:agents|claude|github|codex)\/skills\/(common\/common-tdd|quality-engineering\/quality-engineering-test-healing)\/((?:references|scripts|assets)\/.+)$/);
 if(match){assert.deepEqual(active,fs.readFileSync(path.join(root,'skills',match[1],match[2])),`canonical packaged resource ${entry.path}`);packaged++;}
}
assert.equal(receipt.evidence_preserved,true);assert.equal(receipt.canonical_sources_preserved,true);assert.equal(fs.existsSync('.skills-lock.json'),false,'Do not copy stage ownership lock into active worktree');
console.log(JSON.stringify({exports_compared:receipt.copied_files.length,canonical_resources_compared:packaged,written:receipt.written_count,unchanged:receipt.unchanged_count,evidence_preserved:receipt.evidence_preserved,canonical_sources_preserved:receipt.canonical_sources_preserved,active_ownership_lock_absent:true,limit:'No index metadata changed; no generated category indices copied, no population/index coverage claim'}));
