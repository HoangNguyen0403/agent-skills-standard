import hashlib,json,pathlib,subprocess,time,sys
root=pathlib.Path.cwd();out=root/'.agent/sdd/context-aware-delegation'
label=sys.argv[1] if len(sys.argv)>1 else 'run2'
previous=out/'final-smoke-result.json'; archived=out/'final-smoke-result-run1.json'
if previous.exists() and not archived.exists():archived.write_bytes(previous.read_bytes())
paths=set()
for n in (1,2,3):
    for p in json.loads((out/f'assignment-{n}.json').read_text())['owned_paths']:
        target=root/p
        paths.update(str(f.relative_to(root)) for f in target.rglob('*') if f.is_file()) if target.is_dir() else paths.add(p)
for p in json.loads((out/'assignment-4-integration.json').read_text())['owned_paths']:
    if not p.startswith('artifacts/') and (root/p).is_file():paths.add(p)
hashes={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in sorted(paths)}
commands=[
 ['pnpm','exec','tsx','.agent/sdd/context-aware-delegation/final-smoke.ts'],
 ['python3','-B','.agent/sdd/context-aware-delegation/index-discovery-smoke.py'],
 ['pnpm','--filter','./mcp','test','--','test/SkillIndex.spec.ts'],
 ['python3','-B','-m','unittest','discover','-s','scripts/skill-tests/common-subagent-driven-development','-p','test_*.py'],
 ['pnpm','test:evals'],
 ['pnpm','--filter','./cli','test','src/services/utils/__tests__/WorkflowTransformer.spec.ts','-t','keeps checked-in workflow wrappers in parity with .agents/workflows sources'],
 ['pnpm','test:harness'],
 ['pnpm','evals:audit'],['pnpm','audit:keywords'],['pnpm','audit:skills'],['pnpm','audit:sdlc'],['pnpm','check-alignment'],['pnpm','validate'],['pnpm','docs:capabilities:check'],
]
rows=[]
for n,command in enumerate(commands,1):
    start=time.time();r=subprocess.run(['rtk','proxy',*command],capture_output=True,text=True)
    log=out/f'final-{label}-check-{n:02}.log';log.write_text(r.stdout+r.stderr)
    row={'command':['rtk','proxy',*command],'exit':r.returncode,'seconds':round(time.time()-start,2),'log':str(log.relative_to(root))}
    rows.append(row);print(json.dumps(row),flush=True)
changed=[p for p,h in hashes.items() if not (root/p).is_file() or hashlib.sha256((root/p).read_bytes()).hexdigest()!=h]
result={'checks':rows,'source_sha256':hashes,'source_changes_during_checks':changed,'all_commands_exit_zero':all(r['exit']==0 for r in rows),'scope':'settled local verification; audit warnings require classification; not live model efficacy or host activation'}
(out/f'final-{label}-checks-result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'commands':len(rows),'nonzero':[r for r in rows if r['exit']!=0],'source_changes_during_checks':changed},indent=2))
if changed:raise SystemExit(2)
