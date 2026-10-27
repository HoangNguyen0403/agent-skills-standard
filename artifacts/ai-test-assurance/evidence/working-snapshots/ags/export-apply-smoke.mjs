import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { runApply, deriveAllowlist, captureCanonicalSources, captureEvidence, captureDestinationsInventory, enumerateStagedAllowlist } from './prepare-exports.mjs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const put = (base, rel, value) => { const p=path.join(base,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,value); };
const top=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ags-apply-smoke-')));
try {
 for(const scenario of ['valid','traversal','canonical-target','duplicate','omitted','later-hash','appearing-destination','added-source','changed-staged-workflow','wrong-binding']) {
  const parent=path.join(top,scenario);fs.mkdirSync(parent);const repo=path.join(parent,'repo'),stage=path.join(parent,'stage');fs.mkdirSync(repo);fs.mkdirSync(stage);
  const config=JSON.stringify({agents:['claude']});put(repo,'.skillsrc',config);
  put(repo,'.agent/sdd/ai-test-assurance/frozen.md','synthetic evidence sentinel');
  const sourcePaths=['skills/common/common-tdd/SKILL.md','skills/quality-engineering/quality-engineering-test-healing/SKILL.md','.agents/workflows/test-loop.md'];
  for(const rel of sourcePaths){put(repo,rel,`frozen input ${rel}`);put(stage,rel,`frozen input ${rel}`);}
  const derived=deriveAllowlist({agents:['claude']});
  const targets=[...derived.skillDirs.map(p=>`${p}/SKILL.md`),...derived.workflowWrappers];
  for(const rel of targets){put(repo,rel,'old export');put(stage,rel,`new export ${rel}`);}
  const sources=captureCanonicalSources(repo),evidence=captureEvidence(repo),dest=captureDestinationsInventory(repo,derived);
  const snapshot={schema_version:2,repo_root:repo,skillsrc_sha256:sha(config),configured_agents:derived.configuredAgents,skill_dirs:derived.skillDirs,workflow_wrappers:derived.workflowWrappers,canonical_workflow:'.agents/workflows/test-loop.md',evidence_file_list:evidence.files,evidence:evidence.hashes,sources_file_list:sources.files,sources:sources.hashes,destination_roots:dest.rootStates,destinations_file_list:dest.files,destinations:dest.hashes};
  const snapshotInPath=path.join(parent,'snapshot.json');fs.writeFileSync(snapshotInPath,JSON.stringify(snapshot));
  const copies=enumerateStagedAllowlist(stage,derived).map(e=>({...e,active_before_sha256:dest.hashes[e.path]??null}));
  const manifest={schema_version:2,repo_root:repo,stage_dir:stage,skillsrc_sha256:sha(config),skill_dirs:derived.skillDirs,workflow_wrappers:derived.workflowWrappers,pre_snapshot_sha256:sha(fs.readFileSync(snapshotInPath)),allowlisted_copies_count:copies.length,allowlisted_copies:copies,generator_runs:[],dependency_links:[],changed_generated_collateral:[]};
  if(scenario==='traversal')copies[0].path='../escape';
  if(scenario==='canonical-target')copies[0].path=sourcePaths[0];
  if(scenario==='duplicate'){copies.push({...copies[0]});manifest.allowlisted_copies_count=copies.length;}
  if(scenario==='omitted'){copies.pop();manifest.allowlisted_copies_count=copies.length;}
  if(scenario==='later-hash')copies[copies.length-1].staged_sha256='0'.repeat(64);
  if(scenario==='appearing-destination')put(repo,`${derived.skillDirs[0]}/references/new.md`,'concurrent owner');
  if(scenario==='added-source')put(repo,'skills/common/common-tdd/references/new.md','new approved input');
  if(scenario==='changed-staged-workflow')put(stage,'.agents/workflows/test-loop.md','altered generator input');
  if(scenario==='wrong-binding')manifest.repo_root=stage;
  put(stage,'stage-manifest.json',JSON.stringify(manifest));
  const before=targets.map(rel=>fs.readFileSync(path.join(repo,rel),'utf8'));
  const call=()=>runApply({repoRoot:repo,stageDir:stage,snapshotInPath,receiptOutPath:path.join(parent,'receipt.json')});
  if(scenario==='valid'){
   await call();for(const rel of targets)assert.equal(fs.readFileSync(path.join(repo,rel),'utf8'),`new export ${rel}`);
   console.log('valid: three synthetic fixture exports copied with unchanged canonical inputs');
  }else{
   await assert.rejects(call());assert.deepEqual(targets.map(rel=>fs.readFileSync(path.join(repo,rel),'utf8')),before);
   assert.equal(fs.existsSync(path.join(parent,'receipt.json')),false);console.log(`${scenario}: refused before any destination write`);
  }
 }
}finally{fs.rmSync(top,{recursive:true,force:true});}
