import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import cp from 'node:child_process';import crypto from 'node:crypto';import assert from 'node:assert/strict';import * as yaml from 'js-yaml';
const [repo,binary]=process.argv.slice(2);const config=yaml.load(fs.readFileSync(path.join(repo,'.github/workflows/ci.yml'),'utf8'));const step=config.jobs.test.steps.find(s=>s.name==='Observe full repository test quality scan (non-blocking)');assert.equal(step['continue-on-error'],true);
const top=fs.mkdtempSync(path.join(os.tmpdir(),'tg-ci-observe-'));
try{
 for(const [name,exit,source,extra,shim] of [
  ['clean',0,'package s\nimport "testing"\nfunc TestGood(t *testing.T){if 2+2!=4{t.Error("bad")}}\n',''],
  ['blocker',1,'package s\nimport "testing"\nfunc TestBad(t *testing.T){}\n',''],
  ['incomplete',2,'package s\nfunc TestBad( {\n',''],
  ['allowed-empty',3,null,'--allow-empty'],
  ['malformed',2,null,'','printf "broken JSON\\n"; exit 2'],
  ['missing',2,null,'',null]
 ]){
  const dir=path.join(top,name);fs.mkdirSync(path.join(dir,'bin'),{recursive:true});if(source)fs.writeFileSync(path.join(dir,'sample_test.go'),source);
  const wrapper=path.join(dir,'bin','testguard');if(name!=='missing')fs.writeFileSync(wrapper,`#!/bin/sh\n${shim||`exec ${JSON.stringify(binary)} ${extra} "$@"`}\n`,{mode:0o755});
  const script=step.run.replaceAll('${{ runner.os }}','macOS');const p=cp.spawnSync('bash',['--noprofile','--norc','-e','-o','pipefail','-c',script],{cwd:dir,encoding:'utf8',timeout:15000});
  if(name==='malformed'){assert.notEqual(p.status,0);assert(p.stderr.includes('malformed JSON'));}else assert.equal(p.status,exit,JSON.stringify({name,stdout:p.stdout,stderr:p.stderr}));
  if(name!=='missing'){
   assert.equal(fs.readFileSync(path.join(dir,'testguard-scan-exit.txt'),'utf8').trim(),String(exit));
   const expected=crypto.createHash('sha256').update(fs.readFileSync(wrapper)).digest('hex');assert(fs.readFileSync(path.join(dir,'testguard-binary-sha256.txt'),'utf8').startsWith(expected));
  }else assert(p.stderr.includes('binary not found'));
  console.log(`${name}: exact YAML run step exit ${p.status}; ${name==='missing'?'visible binary error':'actual scan exit and binary hash preserved'}`);
 }
 console.log('Local macOS Bash/Python execution only; Windows/Linux hosted runners and remote artifact upload unexecuted.');
}finally{fs.rmSync(top,{recursive:true,force:true});}
