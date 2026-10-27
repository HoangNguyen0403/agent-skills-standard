const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const [root,binary]=process.argv.slice(2);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tg-report-extra-'));
try {
 const bad=path.join(dir,'empty_test.go'),malformed=path.join(dir,'broken_test.go');
 fs.writeFileSync(bad,'package smoke\nimport "testing"\nfunc TestMissingOracle(t *testing.T) {}\n');
 fs.writeFileSync(malformed,'package smoke\nfunc TestBroken( {\n');
 const check=(args,exit,status)=>{
  const p=cp.spawnSync(binary,args,{cwd:root,encoding:'utf8'});
  assert.equal(p.status,exit,JSON.stringify({args,stdout:p.stdout,stderr:p.stderr}));
  const r=JSON.parse(p.stdout); assert.equal(r.exit_code,exit);assert.equal(r.analysis.status,status);
  assert.equal(p.stdout.trim().split('\n').length,1);assert(Array.isArray(r.scope.files));
  console.log(JSON.stringify({args,exit,status,blockers:r.policy.blocker_count,failed:r.analysis.failed_files}));return r;
 };
 const blocker=check(['--json',bad],1,'complete');assert(blocker.findings.some(f=>f.rule_id==='GUARD-UNIV-ZERO'));
 const mixed=check(['--json',bad,malformed],2,'incomplete');assert(mixed.findings.some(f=>f.rule_id==='GUARD-UNIV-ZERO'));assert.equal(mixed.analysis.failed_files,1);
 const unique=check(['--json',bad,path.relative(root,bad),bad],1,'complete');assert.deepEqual(unique.scope.files,blocker.scope.files);assert.deepEqual(unique.findings,blocker.findings);
 check(['-fjson','--top','not-a-number'],2,'error');
 check(['--json=invalid-bool'],2,'error');
 check(['--json','--output='],2,'error');
 const consoleError=cp.spawnSync(binary,['--json=false','--unknown'],{cwd:root,encoding:'utf8'});assert.equal(consoleError.status,2);assert.equal(consoleError.stdout,'');assert(consoleError.stderr.includes('unknown flag'));
 console.log('Retained blockers, unique scope, parser errors and explicit output restrictions verified');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
