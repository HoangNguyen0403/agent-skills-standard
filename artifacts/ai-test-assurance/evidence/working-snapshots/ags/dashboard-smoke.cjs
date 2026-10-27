const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const [repo,binary]=process.argv.slice(2);
const doc=fs.readFileSync(path.join(repo,'QUICKSTART.md'),'utf8');
const match=doc.match(/### Automated Pipeline Parsing & Exit Handling[\s\S]*?```bash\n([\s\S]*?)```/);assert(match,'Exact dashboard snippet missing');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tg-dashboard-'));
try {
 const script=path.join(temp,'dashboard.sh');fs.writeFileSync(script,match[1]);
 for(const [name,expected,fixture,args,shim] of [
  ['clean',0,'package s\nimport "testing"\nfunc TestGood(t *testing.T){if 2+2!=4{t.Error("bad")}}\n',[]],
  ['blocker',1,'package s\nimport "testing"\nfunc TestNoOracle(t *testing.T){}\n',[]],
  ['incomplete',2,'package s\nfunc TestBroken( {\n',[]],
  ['allowed-empty',3,null,['--allow-empty']],
  ['malformed-output',2,null,[],'printf "broken JSON\\n"; exit 2'],
  ['exit-mismatch',2,null,[],`printf '%s\\n' '{"schema_version":1,"exit_code":0,"analysis":{"status":"complete"}}'; exit 1`]
 ]){
  const dir=path.join(temp,name),bin=path.join(temp,`${name}-bin`);fs.mkdirSync(dir);fs.mkdirSync(bin);
  if(fixture)fs.writeFileSync(path.join(dir,'sample_test.go'),fixture);
  const command=shim || `exec ${JSON.stringify(binary)} ${args.join(' ')} "$@"`;
  fs.writeFileSync(path.join(bin,'testguard'),`#!/bin/sh\n${command}\n`,{mode:0o755});
  const p=cp.spawnSync('bash',[script],{cwd:dir,env:{...process.env,PATH:`${bin}:${process.env.PATH}`},encoding:'utf8',timeout:10000});
  assert.equal(p.status,expected,JSON.stringify({name,stdout:p.stdout,stderr:p.stderr}));
  if(name==='malformed-output')assert(p.stderr.includes('malformed JSON'));
  if(name==='exit-mismatch')assert(p.stderr.includes('Exit code mismatch'));
  console.log(`${name}: exact documented script returned ${p.status}${shim?' (explicit malformed-report shim)':' (real fresh CLI)'}`);
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
