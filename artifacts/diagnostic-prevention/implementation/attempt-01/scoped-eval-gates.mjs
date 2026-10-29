import fs from 'node:fs';
import path from 'node:path';
import { auditEvalDefinitions, auditAssertionAlignment } from '../../../../scripts/evals/quality.ts';
const root = process.cwd();
const selected = new Map([
  ['common/common-tdd', [4, 5, 7, 8, 9]],
  ['common/common-subagent-driven-development', [4, 5, 6, 7, 8, 9]],
  ['common/common-learning-log', [5]],
  ['common/common-session-retrospective', [5]],
  ['common/common-security-standards', [4, 5, 6, 7, 8, 9, 10, 11]],
  ['common/common-web-visual-testing', [3, 4, 5, 6]],
  ['common/common-telemetry', [3, 4, 5]],
  ['common/common-skill-creator', [3]],
]);
const inScope = (issue) => selected.get(`${issue.category}/${issue.skillName}`)?.includes(issue.evalId) ?? false;
const definitionIssues = auditEvalDefinitions(root).filter(inScope);
const alignmentIssues = auditAssertionAlignment(root, new Set(selected.keys())).filter(inScope);
const passed = !definitionIssues.some((issue) => issue.severity === 'error') && alignmentIssues.length === 0;
const record = { scope: Object.fromEntries(selected), definitionIssues, alignmentIssues, passed,
  qualification: 'Actual quality/audit and preflight APIs on changed cases only; not full-registry quality, scorer discrimination, model efficacy, or routing proof.' };
const out = path.resolve(process.argv[2]);
fs.writeFileSync(out, JSON.stringify(record, null, 2), { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
if (!passed) process.exitCode = 1;
