const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const os=require('node:os');
const assert=require('node:assert/strict');
const [root, binary]=process.argv.slice(2);
if(!root)throw Error('TestGuard repo required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'testguard-assurance-smoke-'));
try {
 fs.writeFileSync(path.join(dir,'sum_test.go'),'package smoke\nimport "testing"\nfunc TestArithmeticContract(t *testing.T) { if 2 + 2 != 4 { t.Error("wrong sum") } }\n');
 fs.writeFileSync(path.join(dir,'unsupported.txt'),'not a test\n');
 fs.mkdirSync(path.join(dir,'empty'));
 const run=(args,exit,status)=>{
  const p=binary?cp.spawnSync(binary,args,{cwd:root,encoding:'utf8'}):cp.spawnSync('go',['run','./cmd/testguard',...args],{cwd:root,encoding:'utf8'});
  const report=JSON.parse(p.stdout);
  assert.equal(report.schema_version,1,'Expected versioned object, not a findings array');
  assert.equal(report.analysis.status,status);
  assert.equal(report.exit_code,exit);
  if(binary)assert.equal(p.status,exit);
  else assert.equal(p.status,exit===0?0:1,'go run translates program nonzero exits to 1');
  assert(Array.isArray(report.findings));
  assert.equal(report.analysis.analyzed_files,report.scope.files.length);
  console.log(JSON.stringify({args,process_exit:p.status,report_exit:report.exit_code,status:report.analysis.status,findings:report.findings.length}));
  return report;
 };
 const complete=run(['--json',path.join(dir,'sum_test.go')],0,'complete');
 assert(complete.analysis.analyzed_tests>0);
 run(['--json',path.join(dir,'unsupported.txt')],2,'incomplete');
 run(['--json',path.join(dir,'empty')],2,'incomplete');
 run(['--json','--allow-empty',path.join(dir,'empty')],3,'not_applicable');
 run(['--json','--diff',path.join(dir,'sum_test.go')],2,'error');
 console.log('TestGuard scan verdict smoke passed');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
