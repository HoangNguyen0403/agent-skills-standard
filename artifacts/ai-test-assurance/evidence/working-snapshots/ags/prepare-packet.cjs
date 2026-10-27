const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ags = '/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala';
const plan = path.join(ags, 'docs/prd/prd-ai-test-assurance.md');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const root = spec.workspace_root || ags;
const base = path.join(root, '.agent/sdd/ai-test-assurance');
fs.mkdirSync(base, { recursive: true });
const task = spec.task_number;
const revision = cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root,encoding:'utf8'}).trim();
const contract=path.join(ags,'docs/srs/srs-ai-test-assurance.md');
if(task!==1 && fs.existsSync(contract)){
 const contractPath=path.join(base,`srs-ai-test-assurance-${sha(contract).slice(0,12)}.md`);
 fs.copyFileSync(contract,contractPath);
 spec.source_files=[...(spec.source_files || []),path.relative(root,contractPath)];
}
const manifest = {
 schema_version:1, task_id:spec.task_id || `T${task}`,task_number:task,goal:spec.goal,owner:spec.owner,
 project_domain:'Authorized personal repositories agent-skills-standard and testguard; no employer data',
 workspace_root:root,plan_sha256:sha(plan),non_goals:spec.non_goals || ['Unrelated edits','Release/deploy/merge','Recursive delegation','Premium calls'],
 authority:{allowed_operations:spec.allowed_operations || ['Read assigned repository sources','Edit owned paths','Prepare regression cases and verification commands'],forbidden_actions:['Commit','Push','Deploy','Delegate','Run builds/lint/tests/formatters mid-flight','Read employer repositories or credentials'],required_approvals:[]},
 global_invariants:['One owner per component; preserve existing user changes','No fabricated verification','Independent review required','No weakening assertions to obtain green'],
 owned_paths:spec.owned_paths,
 acceptance_criteria:spec.acceptance_criteria.map((x,i)=> typeof x==='string'?{id:`T${task}-${i+1}`,expectation:x}:x),
 verification:spec.verification || [{command:'Independent review of frozen deliverables and stated ACs',cwd:'.',expected:'No unresolved material findings'}],
 required_standards:(spec.required_standards || []).map(p=>({id:p,path:p,revision:sha(path.join(root,p))})),
 source_revision:revision,dirty_identity:cp.execFileSync('git',['diff','--no-ext-diff','--binary'],{cwd:root,maxBuffer:20000000}).toString('base64'),
 source_files:(spec.source_files || []).map(p=>fs.existsSync(path.join(root,p))?{path:p,sha256:sha(path.join(root,p))}:{path:p,state:'new'}),
 dependencies:[],output_contract:{receipt_destination:spec.report || `${base}/task-${task}-report.md`,status_vocabulary:['done','done_with_concerns','blocked','needs_context'],stop_conditions:['Material contract change','Missing prerequisite','Account ineligibility']},limits:{status:'advisory',attempts:1},
};
if (!manifest.dirty_identity) manifest.dirty_identity='No tracked diff at assignment preparation; untracked inputs bound by source_files';
const dest=path.join(base,`${manifest.task_id}-assignment.json`);
fs.writeFileSync(dest,JSON.stringify(manifest,null,2)+'\n');
const out=path.join(base,`${manifest.task_id}-brief.md`);
cp.execFileSync('python3',['-B',path.join(ags,'skills/common/common-subagent-driven-development/scripts/task_brief.py'),plan,String(task),'--assignment',dest,'--out',out],{cwd:root,stdio:'inherit'});
console.log('Packet: '+out);
