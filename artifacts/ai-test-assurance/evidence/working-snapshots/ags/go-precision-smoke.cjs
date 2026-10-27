const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const [root,binary]=process.argv.slice(2);const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tg-go-precision-'));
const invoke=args=>cp.spawnSync(binary,args,{cwd:root,encoding:'utf8'});
try {
 const original=invoke(['--json','pkg/rules/golang/rules_test.go']);const r=JSON.parse(original.stdout);assert.equal(r.analysis.status,'complete');
 for(const id of ['GUARD-GO-02','GUARD-GO-03'])assert.equal(r.findings.filter(f=>f.rule_id===id).length,0,JSON.stringify(r.findings));
 console.log(JSON.stringify({scenario:'original-quoted-fixture',exit:original.status,counts:Object.fromEntries(['GUARD-GO-02','GUARD-GO-03'].map(id=>[id,r.findings.filter(f=>f.rule_id===id).length]))}));
 const file=path.join(temp,'service_test.go');fs.writeFileSync(file,'package service\nimport ("testing"; sqlmock "github.com/DATA-DOG/go-sqlmock")\nfunc TestRealPort(t *testing.T) {\n db, mock, err := sqlmock.New()\n _ = db; _ = mock; _ = err\n if 2+2!=4 { t.Error("wrong") }\n}\n');
 const actual=invoke(['--json',file]);const report=JSON.parse(actual.stdout);const hit=report.findings.find(f=>f.rule_id==='GUARD-GO-02');assert(hit,actual.stdout);assert.equal(hit.line_number,4);console.log(JSON.stringify({scenario:'real-executable-call',exit:actual.status,rule:hit.rule_id,line:hit.line_number}));
 for(const args of [['-sfjson','--top','nope'],['-sf=json','--top','nope'],['-f=json','--top','nope']]){const p=invoke(args);assert.equal(p.status,2);assert.equal(JSON.parse(p.stdout).analysis.reason,'invalid_usage');console.log(`${args.join(' ')}: JSON error2`);}
 for(const args of [['-so','--json','--unknown'],['-so=--json','--unknown'],['--json=FALSE','--unknown'],['-f','json','explain','NOT-A-RULE']]){const p=invoke(args);assert.equal(p.status,2);assert.equal(p.stdout,'');assert(p.stderr.length>0);console.log(`${args.join(' ')}: visible non-JSON error2`);}
 const injected='missing\n##vso[task.complete result=Succeeded;]\r%]';const azure=invoke(['-f','azure',injected]);assert.equal(azure.status,2);for(const line of azure.stdout.split('\n').filter(l=>l.startsWith('##vso[')))assert(line.startsWith('##vso[task.logissue '));assert(!azure.stdout.includes('\r'));assert(azure.stdout.includes('%0A'));console.log('Azure newline-bearing target: no injected command lines');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
