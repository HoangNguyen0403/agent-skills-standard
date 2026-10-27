const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const os=require('node:os');
const assert=require('node:assert/strict');
const ags=path.resolve(__dirname,'../../..');
const testguardBinary=process.argv[2];
const work=fs.mkdtempSync(path.join(os.tmpdir(),'ags-assurance-smoke-'));
const repo=path.join(work,'repo'), evidence=path.join(work,'evidence');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const save=(p,text)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);};
const json=(p,data)=>save(p,JSON.stringify(data,null,2)+'\n');
const artifact=p=>({path:p,sha256:hash(fs.readFileSync(path.join(evidence,p)))});
try {
 save(path.join(repo,'src/calc.js'),'exports.add = (a,b) => a+b;\n');
 save(path.join(repo,'tests/calc.test.js'),'const test=require("node:test");\nconst assert=require("node:assert/strict");\nconst {add}=require("../src/calc");\ntest("addition preserves algebraic sum",()=>{assert.equal(add(2,3),5,"ORACLE_ADD_SUM");});\n');
 save(path.join(repo,'package.json'),'{"private":true,"type":"commonjs","dependencies":{}}\n');
 save(path.join(repo,'runner.json'),'{"runner":"node:test","timeout_ms":5000}\n');
 save(path.join(evidence,'oracle.md'),'Synthetic smoke contract, not a production requirement: add(a,b) returns the algebraic sum. For (2,3), expected 5 independently of implementation.\n');
 const groups={source:['src/calc.js'],tests:['tests/calc.test.js'],dependencies:['package.json'],config:['runner.json']};
 const snapshot=()=>({repository:'synthetic-smoke-no-git',commit:'0'.repeat(40),dirty:true,inputs:Object.fromEntries(Object.entries(groups).map(([k,files])=>[k,{roots:k==='source'?['src']:k==='tests'?['tests']:files,files:files.map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(repo,p)))}))}]))});
 const command='node --test tests/calc.test.js';
 const runTest=()=>{const start=Date.now();const r=cp.spawnSync(process.execPath,['--test','tests/calc.test.js'],{cwd:repo,encoding:'utf8',timeout:5000});return {r,duration:Date.now()-start,output:(r.stdout||'')+(r.stderr||'')};};
 const baseSnapshot=snapshot();
 const passed=runTest();assert.equal(passed.r.status,0);save(path.join(evidence,'baseline.log'),passed.output);
 save(path.join(repo,'src/calc.js'),'exports.add = (a,b) => a-b;\n');
 const badSnapshot=snapshot();
 const failed=runTest();assert.notEqual(failed.r.status,0);assert(failed.output.includes('ORACLE_ADD_SUM'));save(path.join(evidence,'challenge.log'),failed.output);
 save(path.join(repo,'src/calc.js'),'exports.add = (a,b) => a+b;\n');
 const variant={schema_version:1,changes:[{path:'src/calc.js',before_sha256:baseSnapshot.inputs.source.files[0].sha256,after_sha256:badSnapshot.inputs.source.files[0].sha256}]};
 json(path.join(evidence,'variant.json'),variant);
 const intent={id:'INTENT-ADD',requirements:['SMOKE-ADD'],owner:'orchestrator-synthetic-smoke',contract:'Addition returns algebraic sum',fault:'Subtraction replaces addition',layer:'unit',cases:['2 + 3 equals 5'],command,oracle:{ref:artifact('oracle.md'),basis:'independently_reviewed_example',owner:'orchestrator-synthetic-smoke',rationale:'Arithmetic expected value defined independently; smoke only'},boundaries:{real:['Node test runner','addition module'],mocked:[],justification:'No external dependencies'}};
 const environment={os:process.platform,arch:process.arch,runner:'node:test',runner_version:process.version};
 const baseline={id:'EXEC-BASE',intent_id:intent.id,snapshot:baseSnapshot,environment,command,outcome:'passed',exit_code:0,duration_ms:passed.duration,artifacts:[artifact('baseline.log')],failure:null};
 const challengeExecution={id:'EXEC-FAULT',intent_id:intent.id,snapshot:badSnapshot,environment,command,outcome:'assertion_failed',exit_code:failed.r.status,duration_ms:failed.duration,artifacts:[artifact('challenge.log')],failure:{test:'tests/calc.test.js',oracle_ref:'oracle.md',artifact_path:'challenge.log',marker:'ORACLE_ADD_SUM'}};
 const declared={schema_version:1,trust:'local-untrusted',intent,baseline:null,challenge:null,static_report:null,review:null};
 const executed={...declared,baseline};
 const fault={...executed,challenge:{fault_id:'SMOKE-SUBTRACTION',description:'Controlled synthetic addition-to-subtraction variant',variant:artifact('variant.json'),execution:challengeExecution,adjudication:{reviewer:'orchestrator-synthetic-smoke',oracle_ref:'oracle.md',artifact_path:'challenge.log',marker:'ORACLE_ADD_SUM',classification:'intended_assertion'}}};
 json(path.join(work,'current.json'),baseSnapshot);
 const runValidator=(name,bundle,level,expected)=>{
  const bundlePath=path.join(evidence,name+'.json');json(bundlePath,bundle);
  const r=cp.spawnSync(process.execPath,['--import','tsx','scripts/test-assurance/index.ts','--bundle',bundlePath,'--evidence-root',evidence,'--repo-root',repo,'--current',path.join(work,'current.json'),'--require',level,'--json'],{cwd:ags,encoding:'utf8',timeout:10000});
  const result=JSON.parse(r.stdout);
  assert.equal(r.status,expected,`${name}: ${r.stdout} ${r.stderr}`);assert.equal(result.exit_code,expected);
  console.log(JSON.stringify({scenario:name,process_exit:r.status,...result}));
  return result;
 };
 runValidator('declared',declared,'declared',0);
 runValidator('declared-not-executed',declared,'executed',1);
 runValidator('executed',executed,'executed',0);
 runValidator('actual-named-fault',fault,'fault',0);
 if(testguardBinary){
  const scanDir=path.join(work,'scan');fs.mkdirSync(scanDir);
  const good=path.join(scanDir,'sum_test.go'),bad=path.join(scanDir,'broken_test.go'),empty=path.join(scanDir,'empty');
  save(good,'package smoke\nimport "testing"\nfunc TestSum(t *testing.T){ if 2+2!=4 { t.Error("wrong sum") } }\n');
  save(bad,'package smoke\nfunc TestBroken( {\n');fs.mkdirSync(empty);
  for(const [name,args,exit,status,dimension] of [
   ['complete',[good],0,'complete','complete'],
   ['incomplete',[good,bad],2,'incomplete','incomplete'],
   ['allowed-empty',['--allow-empty',empty],3,'not_applicable','not_applicable']
  ]){
   const scan=cp.spawnSync(testguardBinary,['--json',...args],{cwd:scanDir,encoding:'utf8',timeout:10000});
   assert.equal(scan.status,exit,scan.stdout+scan.stderr);const report=JSON.parse(scan.stdout);assert.equal(report.analysis.status,status);
   const file=`scan-${name}.json`;save(path.join(evidence,file),scan.stdout);
   const result=runValidator(`actual-scan-${name}`,{...declared,static_report:artifact(file)},'declared',0);
   assert.equal(result.static,dimension);assert.equal(result.execution,'absent');assert.equal(result.fault,'absent');
   if(name==='complete'){const combined=runValidator('actual-scan-and-named-fault',{...fault,static_report:artifact(file)},'fault',0);assert.equal(combined.static,'complete');assert.equal(combined.fault,'demonstrated');}
  }
  console.log(`Actual TestGuard binary SHA-256: ${hash(fs.readFileSync(testguardBinary))}`);
 }
 save(path.join(repo,'src/calc.js'),'exports.add = (a,b) => a+b+1;\n');
 runValidator('stale-source',executed,'executed',1);
 save(path.join(evidence,'baseline.log'),'tampered output\n');
 runValidator('tampered-output-over-stale',executed,'executed',2);
 console.log('Actual validator CLI smoke passed; synthetic local-untrusted consistency proof only, not T7 pilot or production protection. Snapshot commit is a synthetic all-zero fixture identifier, not a real Git commit.');
} finally {fs.rmSync(work,{recursive:true,force:true});}
