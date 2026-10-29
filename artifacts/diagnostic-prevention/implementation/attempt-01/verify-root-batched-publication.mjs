import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = '/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention';
if (await fs.realpath(process.cwd()) !== root) throw new Error('Wrong root');
const a = path.join(root,'artifacts/diagnostic-prevention/implementation/attempt-01');
const attempt = 'artifacts/generation-logs/attempt-2026-10-29T13-12-12-450Z-7b1806';
const output = path.resolve(process.argv[2]);
if (!output.startsWith(a+path.sep)) throw new Error('Evidence outside A');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(await fs.readFile(path.join(root,attempt,'receipt.json')));
const baseline = JSON.parse(await fs.readFile(path.join(a,'root-before-batched-reapply-02.json')));
const lockBytes = await fs.readFile(path.join(root,'.skills-lock.json'));
const lock = JSON.parse(lockBytes);
const auditBytes = await fs.readFile(path.join(a,'root-interrupted-effect-audit-01.json'));
if (hash(auditBytes)!=='6294f5b5c8afbd4ef680d6f2a8e94b57f14df8948cc55035dbd6afd4f780d7e5') throw new Error('Audit pin');
const audit = JSON.parse(auditBytes);
const failures=[]; const check=(ok,label)=>{if(!ok) failures.push(label);};
const outputs=receipt.copiedBackFiles.filter(p=>p!=='.skills-lock.json');
check(receipt.status==='APPLIED'&&!receipt.checkOnly,'APPLIED receipt');
check(receipt.declaredFiles.length===1996,'1996 declared');
check(outputs.length===95 && new Set(outputs).size===95,'95 unique outputs');
check(JSON.stringify([...receipt.copiedBackFiles].sort())===JSON.stringify([...receipt.verifiedFiles].sort()),'copied/verified equality');
check(receipt.copiedBackFiles.at(-1)==='.skills-lock.json','ledger last');
check(JSON.stringify([...outputs].sort())===JSON.stringify(audit.files.filter(p=>p.path!=='.skills-lock.json').map(p=>p.path).sort()),'exact approved95 output set');
const files=[];
for(const relative of outputs){
 const parts=relative.split('/');for(let i=1;i<parts.length;i++){const st=await fs.lstat(path.join(root,...parts.slice(0,i)));check(st.isDirectory()&&!st.isSymbolicLink(),`ancestor:${relative}`);}
 const absolute=path.join(root,relative);const st=await fs.lstat(absolute);check(st.isFile()&&!st.isSymbolicLink(),`regular:${relative}`);
 const sha256=hash(await fs.readFile(absolute));const entry=lock.entries[relative]??lock.generation?.entries[relative];check(entry?.sha256===sha256,`ownership digest:${relative}`);
 check(receipt.declaredFiles.includes(relative),`declared:${relative}`);
 files.push({path:relative,sha256,kind:lock.entries[relative]?'cli':'generation',owner:entry?.owner??null,source:entry?.source??null,agent:entry?.agent??null});
}
check(Object.keys(lock.entries).length===94,'94 ordinary entries');check(Object.keys(lock.generation.entries).length===1,'one generation entry');
const currentMetadata=JSON.parse(await fs.readFile(path.join(root,'skills/metadata.json')));
const beforeMetadata=JSON.parse(await fs.readFile(path.join(root,'artifacts/generation-logs/attempt-2026-10-29T07-41-49-505Z-fd751a/publication-before/skills/metadata.json')));
function nonmetric(value){const copy=structuredClone(value);for(const category of Object.values(copy.categories)) delete category.token_metrics;return copy;}
check(JSON.stringify(nonmetric(currentMetadata))===JSON.stringify(nonmetric(beforeMetadata)),'metadata nonmetric preserved');
const indexHash=hash(await fs.readFile(baseline.indexPath));check(indexHash===baseline.indexFileSha256,'full raw Git index preserved');
const env={...process.env,GIT_OPTIONAL_LOCKS:'0'};
check(execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:root,env,encoding:'utf8'}).trim()===baseline.head,'HEAD preserved');
for(const config of baseline.configConditions){try{const bytes=await fs.readFile(path.join(root,config.path));check(hash(bytes)===config.sha256,`config:${config.path}`);}catch(error){if(error.code!=='ENOENT')throw error;check(config.kind==='absent',`config missing:${config.path}`);}}
const record={kind:'ACTUAL_ROOT_BATCHED_PUBLICATION_AUDIT',passed:failures.length===0,failures,attempt,declared:receipt.declaredFiles.length,outputs:files.length,ordinary:files.filter(f=>f.kind==='cli').length,generation:files.filter(f=>f.kind==='generation').length,ledgerSha256:hash(lockBytes),rawIndexSha256:indexHash,metadataNonmetricPreserved:JSON.stringify(nonmetric(currentMetadata))===JSON.stringify(nonmetric(beforeMetadata)),files,limits:['Subsequent public root check supplies producer parity; this audit verifies actual effect/ownership and preservation.','No cross-file atomicity, host enforcement, historical RED or release claim.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,files:undefined},null,2));if(failures.length)process.exitCode=1;
