import hashlib,json,pathlib,re
root=pathlib.Path.cwd();out=root/'.agent/sdd/context-aware-delegation'
expected={p.parent.name for p in (root/'skills/common').glob('*/SKILL.md')}
rows=[]
for host in ('.agents','.github','.codex','.claude'):
    category=root/host/'skills/common'
    installed={p.parent.name for p in category.glob('*/SKILL.md')}
    index=category/'_INDEX.md'
    content=index.read_text()
    indexed=set(re.findall(r'^\|\s*(?:\*\*)?([a-z0-9][a-z0-9-]+)(?:\*\*)?\s*\|',content,re.M))
    missing=sorted(expected-indexed)
    extra=sorted(indexed-expected)
    capability=next((line.lower() for line in content.splitlines() if 'common-task-complexity-routing' in line),'')
    delegation=next((line.lower() for line in content.splitlines() if 'common-subagent-driven-development' in line),'')
    row={'host':host,'canonical_count':len(expected),'installed_count':len(installed),'indexed_count':len(indexed),'missing':missing,'extra':extra,'installed_matches_canonical':installed==expected,'capability_terms_present':all(term in capability for term in ('model routing','thinking level','llm model selection','model tier')),'delegation_terms_present':all(term in delegation for term in ('subagent','implement plan')),'index_sha256':hashlib.sha256(index.read_bytes()).hexdigest()}
    row['passed']=not missing and not extra and row['installed_matches_canonical'] and row['capability_terms_present'] and row['delegation_terms_present']
    rows.append(row)
result={'scope':'actual installed non-MCP category-index discovery inventory, all common skills plus changed trigger terms','hosts':rows,'passed':all(row['passed'] for row in rows)}
(out/'index-discovery-smoke-result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
if not result['passed']:raise SystemExit(1)
