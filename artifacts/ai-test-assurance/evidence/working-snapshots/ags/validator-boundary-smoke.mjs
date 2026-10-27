import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { setupSampleRepo, createValidDeclaredBundle, createValidFaultBundle } from '../../../scripts/test-assurance/__fixtures__/fixture-helper.ts';
const root=process.cwd(),top=fs.mkdtempSync(path.join(os.tmpdir(),'ags-validator-boundary-'));
const cli=path.join(root,'scripts/test-assurance/index.ts');
try {
 for(const name of ['fifo','deep-tree','oversized-roots','malformed-intent','terminal-key']){
  const dir=path.join(top,name),repo=path.join(dir,'repo'),evidence=path.join(dir,'evidence');fs.mkdirSync(repo,{recursive:true});fs.mkdirSync(evidence);
  setupSampleRepo(repo);
  const {bundle,bundlePath,currentPath}=name==='malformed-intent'?createValidFaultBundle(evidence,repo):createValidDeclaredBundle(evidence,repo);
  const invoke=(human=false)=>cp.spawnSync(process.execPath,['--import','tsx',cli,'--bundle',bundlePath,'--current',currentPath,'--repo-root',repo,'--evidence-root',evidence,'--require',name==='malformed-intent'?'fault':'declared',...(human?[]:['--json'])],{cwd:root,encoding:'utf8',timeout:5000});
  const initial=invoke();assert.equal(initial.status,0,JSON.stringify({name,stdout:initial.stdout,stderr:initial.stderr}));
  if(name==='fifo'){
   const made=cp.spawnSync('rtk',['proxy','mkfifo',path.join(repo,'src','pipe')],{encoding:'utf8'});assert.equal(made.status,0,made.stderr);
  }
  if(name==='deep-tree')fs.mkdirSync(path.join(repo,'src',...Array.from({length:65},(_,i)=>`d${i}`)),{recursive:true});
  if(name==='oversized-roots'){const current=JSON.parse(fs.readFileSync(currentPath,'utf8'));current.inputs.source.roots=Array.from({length:129},(_,i)=>`root${String(i).padStart(3,'0')}`);fs.writeFileSync(currentPath,JSON.stringify(current));}
  if(name==='malformed-intent'){bundle.intent.oracle=null;fs.writeFileSync(bundlePath,JSON.stringify(bundle));}
  if(name==='terminal-key'){bundle['SENTINEL\n\x1b[31m']=true;fs.writeFileSync(bundlePath,JSON.stringify(bundle));}
  const p=invoke();assert.equal(p.error,undefined);assert.equal(p.status,2,p.stdout+p.stderr);
  const result=JSON.parse(p.stdout);assert.equal(result.satisfied,false);assert.equal(result.exit_code,2);assert.equal(p.stderr,'');assert.equal(p.stdout.trim().split('\n').length,1);
  if(name==='fifo')assert(result.issues.some(i=>i.code==='UNSAFE_PATH'));
  if(name==='deep-tree')assert(result.issues.some(i=>i.code==='INPUT_TOO_LARGE'));
  if(name==='terminal-key'){assert(!p.stdout.includes('SENTINEL'));const human=invoke(true);assert.equal(human.status,2);assert(!human.stdout.includes('SENTINEL'));assert(!human.stdout.includes('\x1b'));}
  console.log(`${name}: valid precondition passed, mutation rejected2 with satisfied:false and structured output`);
 }
 console.log('Synthetic receipt consistency fixtures only; no recorded command was executed.');
}finally{fs.rmSync(top,{recursive:true,force:true});}
