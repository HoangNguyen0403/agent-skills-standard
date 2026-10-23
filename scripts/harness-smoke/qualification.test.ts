import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  assessSupport,
  checkDelegationQualification,
  loadConformanceRecords,
  summarizeLifecycle,
  type ConformanceRecord,
  type SupportClaim,
} from './qualification';
import { computeExitCode, renderResults } from './checks';

const roots: string[] = [];

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qualification-'));
  roots.push(root);
  return root;
}

test.afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

interface ArtifactRef {
  trace: string;
  digest: string;
}

function artifact(
  root: string,
  relativePath: string,
  lines: readonly unknown[],
): ArtifactRef {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const body = lines.map((line) => JSON.stringify(line)).join('\n') + '\n';
  fs.writeFileSync(absolute, body);
  return {
    trace: relativePath,
    digest: createHash('sha256').update(body).digest('hex'),
  };
}

function recordIndex(
  root: string,
  relativePath: string,
  records: readonly ConformanceRecord[],
): string {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(
    absolute,
    records.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
  );
  return absolute;
}

function record(
  ref: ArtifactRef,
  overrides: Partial<ConformanceRecord> = {},
): ConformanceRecord {
  return {
    host: 'codex',
    surface: 'codex-subagents',
    version: '0.48.0',
    revision: '7f3c1a2',
    operation: 'dispatch',
    layer: 'execution',
    executor: 'live',
    controls: [],
    scenario: 'synthetic-dispatch',
    outcome: 'observed_pass',
    trace: ref.trace,
    digest: ref.digest,
    ...overrides,
  };
}

const claimBase: Omit<SupportClaim, 'records' | 'evidenceRoot'> = {
  host: 'codex',
  surface: 'codex-subagents',
  version: '0.48.0',
  revision: '7f3c1a2',
  operation: 'dispatch',
  controls: ['tool_allowlist', 'filesystem_scope'],
};

test('loadConformanceRecords validates path containment and record shape', () => {
  const root = tempRoot();
  const ref = artifact(root, 'evidence/execution.jsonl', [{ event: 'dispatch' }]);
  const index = recordIndex(root, 'records/valid.jsonl', [record(ref)]);
  const loaded = loadConformanceRecords(index, root);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].operation, 'dispatch');
  assert.equal(loaded[0].layer, 'execution');

  for (const trace of ['/absolute/execution.jsonl', '../outside.jsonl']) {
    const bad = recordIndex(root, `records/bad-${trace.length}.jsonl`, [
      record({ trace, digest: ref.digest }),
    ]);
    assert.throws(
      () => loadConformanceRecords(bad, root),
      /relative|absolute|escape|inside/i,
      `expected rejection for ${trace}`,
    );
  }

  const unknown = recordIndex(root, 'records/unknown.jsonl', [
    {
      ...record(ref),
      operation: 'spawn_forever',
    } as unknown as ConformanceRecord,
  ]);
  assert.throws(() => loadConformanceRecords(unknown, root), /operation/i);

  const surfaceKind = recordIndex(root, 'records/surface-kind.jsonl', [
    { ...record(ref), surface: 'native-agent' },
  ]);
  assert.throws(() => loadConformanceRecords(surfaceKind, root), /surface/i);

  const malformed = path.join(root, 'records/malformed.jsonl');
  fs.writeFileSync(malformed, 'not json\n');
  assert.throws(
    () => loadConformanceRecords(malformed, root),
    /JSON/i,
  );
});

test('loadConformanceRecords rejects missing artifacts and digest mismatches', () => {
  const root = tempRoot();
  const missing = recordIndex(root, 'records/missing.jsonl', [
    record({ trace: 'evidence/absent.jsonl', digest: 'a'.repeat(64) }),
  ]);
  assert.throws(
    () => loadConformanceRecords(missing, root),
    /artifact|missing|open/i,
  );

  const ref = artifact(root, 'evidence/execution.jsonl', [{ event: 'dispatch' }]);
  const tampered = recordIndex(root, 'records/tampered.jsonl', [
    record({ trace: ref.trace, digest: '0'.repeat(64) }),
  ]);
  assert.throws(() => loadConformanceRecords(tampered, root), /digest/i);
});

test('promotes a surface only from retained live traces with per-control denial', () => {
  const root = tempRoot();
  const discovery = artifact(root, 'evidence/discovery.jsonl', [
    { event: 'discovery' },
  ]);
  const execution = artifact(root, 'evidence/execution.jsonl', [
    { event: 'execution' },
  ]);
  const denyTools = artifact(root, 'evidence/deny-tools.jsonl', [
    { event: 'denied-tools' },
  ]);
  const denyFilesystem = artifact(root, 'evidence/deny-filesystem.jsonl', [
    { event: 'denied-filesystem' },
  ]);
  const records = [
    record(discovery, { layer: 'discovery' }),
    record(execution),
    record(denyTools, { layer: 'denial', controls: ['tool_allowlist'] }),
    record(denyFilesystem, {
      layer: 'denial',
      controls: ['filesystem_scope'],
    }),
  ];

  const assessment = assessSupport({
    ...claimBase,
    records,
    evidenceRoot: root,
  });
  assert.equal(assessment.status, 'supported');
  assert.equal(assessment.provenance, 'native');
  assert.deepEqual(assessment.missingEvidence, []);
  assert.match(assessment.limitations.join(' '), /not authenticated/i);

  fs.rmSync(path.join(root, 'evidence/deny-filesystem.jsonl'));
  const unretained = assessSupport({
    ...claimBase,
    records,
    evidenceRoot: root,
  });
  assert.equal(unretained.status, 'not_verified');
  assert.ok(
    unretained.missingEvidence.some((item) =>
      item.includes('deny-filesystem'),
    ),
    `expected missing denial artifact, saw ${JSON.stringify(unretained.missingEvidence)}`,
  );
});

test('never certifies support from a declared live executor without a retained artifact', () => {
  const root = tempRoot();
  const absent = { trace: 'evidence/absent.jsonl', digest: 'a'.repeat(64) };
  const assessment = assessSupport({
    ...claimBase,
    controls: [],
    records: [
      record(absent, { layer: 'discovery' }),
      record(absent, { layer: 'execution' }),
    ],
    evidenceRoot: root,
  });

  assert.equal(assessment.status, 'not_verified');
  assert.ok(
    assessment.missingEvidence.some((item) => item.includes('absent.jsonl')),
    `expected absent artifact gap, saw ${JSON.stringify(assessment.missingEvidence)}`,
  );
});

test('keeps synthetic unit fixtures out of native evidence', () => {
  const root = tempRoot();
  const ref = artifact(root, 'evidence/synthetic.jsonl', [
    { event: 'synthetic' },
  ]);
  const records = [
    record(ref, { layer: 'discovery', executor: 'synthetic' }),
    record(ref, { layer: 'execution', executor: 'synthetic' }),
  ];

  const assessment = assessSupport({
    ...claimBase,
    controls: [],
    records,
    evidenceRoot: root,
  });
  assert.equal(assessment.status, 'not_verified');
  assert.equal(assessment.provenance, 'fixture');
  assert.ok(
    assessment.missingEvidence.some((item) => item.includes('live execution')),
  );
});

test('rejects tampered digests and stale revisions at the report boundary', () => {
  const root = tempRoot();
  const ref = artifact(root, 'evidence/execution.jsonl', [
    { event: 'execution' },
  ]);
  const discovery = artifact(root, 'evidence/discovery.jsonl', [
    { event: 'discovery' },
  ]);

  const tampered = assessSupport({
    ...claimBase,
    controls: [],
    records: [
      record(discovery, { layer: 'discovery' }),
      record({ trace: ref.trace, digest: '0'.repeat(64) }),
    ],
    evidenceRoot: root,
  });
  assert.equal(tampered.status, 'not_verified');
  assert.ok(tampered.missingEvidence.some((item) => item.includes('digest')));

  const stale = assessSupport({
    ...claimBase,
    controls: [],
    records: [
      record(discovery, { layer: 'discovery' }),
      record(ref, { revision: 'rev-old' }),
    ],
    evidenceRoot: root,
  });
  assert.equal(stale.status, 'not_verified');
  assert.ok(stale.missingEvidence.some((item) => item.includes('revision')));
});

test('marks an unenforced required control unsupported', () => {
  const root = tempRoot();
  const ref = artifact(root, 'evidence/execution.jsonl', [
    { event: 'execution' },
  ]);
  const discovery = artifact(root, 'evidence/discovery.jsonl', [
    { event: 'discovery' },
  ]);
  const denyFs = artifact(root, 'evidence/deny-filesystem.jsonl', [
    { event: 'prohibited-write-succeeded' },
  ]);

  const assessment = assessSupport({
    ...claimBase,
    records: [
      record(discovery, { layer: 'discovery' }),
      record(ref),
      record(denyFs, {
        layer: 'denial',
        controls: ['filesystem_scope'],
        outcome: 'observed_fail',
      }),
      record(ref, { layer: 'denial', controls: ['tool_allowlist'] }),
    ],
    evidenceRoot: root,
  });
  assert.equal(assessment.status, 'unsupported');
  assert.match(assessment.reasons.join(' '), /filesystem_scope/);
});

test('keeps an operation without its own trace not_verified', () => {
  const root = tempRoot();
  const ref = artifact(root, 'evidence/execution.jsonl', [
    { event: 'execution' },
  ]);
  const assessment = assessSupport({
    ...claimBase,
    operation: 'receive_completion',
    controls: [],
    records: [
      record(ref, { layer: 'discovery' }),
      record(ref, { layer: 'execution' }),
    ],
    evidenceRoot: root,
  });
  assert.equal(assessment.status, 'not_verified');
  assert.ok(
    assessment.missingEvidence.some((item) =>
      item.includes('receive_completion'),
    ),
  );
});

function lifecycleRecords(
  root: string,
  name: string,
  steps: Array<Partial<ConformanceRecord>>,
): ConformanceRecord[] {
  const ref = artifact(root, `evidence/${name}.jsonl`, [{ event: name }]);
  const index = recordIndex(
    root,
    `records/${name}.jsonl`,
    steps.map((step) => record(ref, step)),
  );
  return loadConformanceRecords(index, root);
}

test('derives cancelled and timed-out receipts from recorded traces', () => {
  const root = tempRoot();
  const cancelled = summarizeLifecycle(
    lifecycleRecords(root, 'cancelled', [
      {
        operation: 'dispatch',
        taskId: 'task-1',
        attemptId: 'attempt-1',
        authority: 'authority-a',
        actor: 'worker-1',
      },
      { operation: 'cancel', taskId: 'task-1', attemptId: 'attempt-1' },
      {
        operation: 'collect_receipt',
        taskId: 'task-1',
        attemptId: 'attempt-1',
      },
    ]),
  );
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.completed, false);
  assert.equal(cancelled.verified, false);
  assert.equal(cancelled.collected, true);

  const timedOut = summarizeLifecycle(
    lifecycleRecords(root, 'timed-out', [
      {
        operation: 'dispatch',
        taskId: 'task-2',
        attemptId: 'attempt-1',
        authority: 'authority-b',
        actor: 'worker-2',
      },
      {
        operation: 'cancel',
        taskId: 'task-2',
        attemptId: 'attempt-1',
        reason: 'timeout',
      },
    ]),
  );
  assert.equal(timedOut.status, 'timed_out');
  assert.equal(timedOut.completed, false);
  assert.equal(timedOut.verified, false);
});

test('rejects resume traces whose authority changes', () => {
  const root = tempRoot();
  const records = lifecycleRecords(root, 'resume', [
    {
      operation: 'dispatch',
      taskId: 'task-1',
      attemptId: 'attempt-1',
      authority: 'authority-a',
      actor: 'worker-1',
    },
    {
      operation: 'resume',
      taskId: 'task-1',
      attemptId: 'attempt-2',
      authority: 'authority-b',
    },
  ]);
  assert.throws(() => summarizeLifecycle(records), /authority/i);
});

test('ignores completion, receipt and acceptance recorded for another task', () => {
  const root = tempRoot();
  const summary = summarizeLifecycle(
    lifecycleRecords(root, 'other-task', [
      {
        operation: 'dispatch',
        taskId: 'task-1',
        attemptId: 'attempt-1',
        authority: 'authority-a',
        actor: 'worker-1',
      },
      {
        operation: 'receive_completion',
        taskId: 'task-2',
        attemptId: 'attempt-1',
      },
      {
        operation: 'collect_receipt',
        taskId: 'task-2',
        attemptId: 'attempt-1',
      },
      {
        operation: 'verify_acceptance',
        taskId: 'task-2',
        attemptId: 'attempt-1',
        reviewer: 'reviewer-1',
      },
    ]),
  );

  assert.equal(summary.status, 'running');
  assert.equal(summary.completed, false);
  assert.equal(summary.collected, false);
  assert.equal(summary.verified, false);
});

test('does not replace the active attempt after a failed resume', () => {
  const root = tempRoot();
  const summary = summarizeLifecycle(
    lifecycleRecords(root, 'failed-resume', [
      {
        operation: 'dispatch',
        taskId: 'task-1',
        attemptId: 'attempt-1',
        authority: 'authority-a',
        actor: 'worker-1',
      },
      {
        operation: 'resume',
        taskId: 'task-1',
        attemptId: 'attempt-2',
        authority: 'authority-a',
        outcome: 'observed_fail',
      },
      {
        operation: 'receive_completion',
        taskId: 'task-1',
        attemptId: 'attempt-2',
      },
    ]),
  );

  assert.equal(summary.attemptId, 'attempt-1');
  assert.equal(summary.status, 'running');
  assert.equal(summary.completed, false);
});
test('requires successful resumes to bind an execution attempt', () => {
  const root = tempRoot();
  const terminalRecords: Partial<ConformanceRecord>[] = [
    { operation: 'receive_completion', taskId: 'task-1' },
    { operation: 'collect_receipt', taskId: 'task-1' },
    {
      operation: 'verify_acceptance',
      taskId: 'task-1',
      reviewer: 'reviewer-1',
    },
  ];
  const anonymousAttempt = summarizeLifecycle(
    lifecycleRecords(root, 'anonymous-resume-attempt', [
      {
        operation: 'dispatch',
        taskId: 'task-1',
        attemptId: 'attempt-1',
        authority: 'authority-a',
        actor: 'worker-1',
      },
      {
        operation: 'resume',
        taskId: 'task-1',
        authority: 'authority-a',
      },
      ...terminalRecords,
    ]),
  );

  assert.equal(anonymousAttempt.status, 'not_verified');
  assert.equal(anonymousAttempt.completed, false);
  assert.equal(anonymousAttempt.collected, false);
  assert.equal(anonymousAttempt.verified, false);
});

test('does not make non-execution resumes active attempts', () => {
  const root = tempRoot();
  for (const layer of ['discovery', 'denial'] as const) {
    const summary = summarizeLifecycle(
      lifecycleRecords(root, `non-execution-resume-${layer}`, [
        {
          operation: 'dispatch',
          taskId: 'task-1',
          attemptId: 'attempt-1',
          authority: 'authority-a',
          actor: 'worker-1',
        },
        {
          operation: 'resume',
          layer,
          taskId: 'task-1',
          attemptId: 'attempt-2',
          authority: 'authority-a',
        },
        {
          operation: 'receive_completion',
          taskId: 'task-1',
          attemptId: 'attempt-2',
        },
        {
          operation: 'collect_receipt',
          taskId: 'task-1',
          attemptId: 'attempt-2',
        },
        {
          operation: 'verify_acceptance',
          taskId: 'task-1',
          attemptId: 'attempt-2',
          reviewer: 'reviewer-1',
        },
      ]),
    );

    assert.equal(summary.status, 'not_verified', layer);
    assert.equal(summary.attemptId, 'attempt-1', layer);
    assert.equal(summary.completed, false, layer);
    assert.equal(summary.collected, false, layer);
    assert.equal(summary.verified, false, layer);
  }
});


test('requires a known dispatching actor for independent acceptance', () => {

  const root = tempRoot();
  const summary = summarizeLifecycle(
    lifecycleRecords(root, 'unknown-actor', [
      {
        operation: 'dispatch',
        taskId: 'task-1',
        attemptId: 'attempt-1',
        authority: 'authority-a',
      },
      {
        operation: 'receive_completion',
        taskId: 'task-1',
        attemptId: 'attempt-1',
      },
      {
        operation: 'collect_receipt',
        taskId: 'task-1',
        attemptId: 'attempt-1',
      },
      {
        operation: 'verify_acceptance',
        taskId: 'task-1',
        attemptId: 'attempt-1',
        reviewer: 'reviewer-1',
      },
    ]),
  );

  assert.equal(summary.completed, true);
  assert.equal(summary.verified, false);
  assert.match(summary.limitations.join(' '), /independent|identity/i);
});
test('rejects lifecycle truth without a complete successful execution dispatch', () => {
  const root = tempRoot();
  const validDispatch: Partial<ConformanceRecord> = {
    operation: 'dispatch',
    layer: 'execution',
    outcome: 'observed_pass',
    taskId: 'task-1',
    attemptId: 'attempt-1',
    authority: 'authority-a',
    actor: 'worker-1',
  };
  const terminalSteps: Partial<ConformanceRecord>[] = [
    { operation: 'receive_completion', taskId: 'task-1', attemptId: 'attempt-1' },
    { operation: 'collect_receipt', taskId: 'task-1', attemptId: 'attempt-1' },
    {
      operation: 'verify_acceptance',
      taskId: 'task-1',
      attemptId: 'attempt-1',
      reviewer: 'reviewer-1',
    },
  ];

  const cases = [
    ...(['taskId', 'attemptId', 'authority'] as const).map((field) => {
      const dispatch = { ...validDispatch };
      delete dispatch[field];
      return [`missing-${field}`, dispatch] as const;
    }),
    [
      'failed-dispatch',
      { ...validDispatch, outcome: 'observed_fail' as const },
    ],
    ['nonexecution-dispatch', { ...validDispatch, layer: 'discovery' as const }],
  ] as const;
  for (const [name, dispatch] of cases) {
    const summary = summarizeLifecycle(
      lifecycleRecords(root, name, [dispatch, ...terminalSteps]),
    );
    assert.equal(summary.status, 'not_verified', name);
    assert.equal(summary.completed, false, name);
    assert.equal(summary.collected, false, name);
    assert.equal(summary.verified, false, name);
  }
});

test('rejects trace artifacts that resolve outside the evidence root through a symlink', () => {
  const root = tempRoot();
  const outside = fs.mkdtempSync(
    path.join(os.tmpdir(), 'qualification-outside-'),
  );
  try {
    const outsideFile = path.join(outside, 'execution.jsonl');
    fs.writeFileSync(outsideFile, '{"event":"outside"}\n');
    const digest = createHash('sha256')
      .update(fs.readFileSync(outsideFile))
      .digest('hex');
    fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
    fs.symlinkSync(outsideFile, path.join(root, 'evidence/link.jsonl'));

    const index = recordIndex(root, 'records/link.jsonl', [
      record({ trace: 'evidence/link.jsonl', digest }),
    ]);
    assert.throws(
      () => loadConformanceRecords(index, root),
      /outside the evidence root/i,
    );

    const assessment = assessSupport({
      ...claimBase,
      controls: [],
      records: [record({ trace: 'evidence/link.jsonl', digest })],
      evidenceRoot: root,
    });
    assert.equal(assessment.status, 'not_verified');
    assert.ok(
      assessment.missingEvidence.some((item) =>
        /outside the evidence root/.test(item),
      ),
      `expected symlink escape gap, saw ${JSON.stringify(assessment.missingEvidence)}`,
    );
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('rejects claim record indexes that resolve outside the root through a symlink', () => {
  const root = tempRoot();
  const outside = fs.mkdtempSync(
    path.join(os.tmpdir(), 'qualification-outside-index-'),
  );
  try {
    const outsideIndex = path.join(outside, 'records.jsonl');
    fs.writeFileSync(outsideIndex, '{"host":"codex"}\n');
    fs.mkdirSync(path.join(root, 'records'), { recursive: true });
    fs.symlinkSync(outsideIndex, path.join(root, 'records/link.jsonl'));
    const claimPath = path.join(root, 'claim.json');
    fs.writeFileSync(
      claimPath,
      JSON.stringify({
        ...claimBase,
        controls: [],
        records: ['records/link.jsonl'],
      }),
    );

    const result = checkDelegationQualification(root, claimPath);
    assert.equal(result.status, 'not_verified');
    assert.match(result.evidence, /outside the evidence root/i);
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('fails the harness check when recorded lifecycle evidence is invalid', () => {
  const root = tempRoot();
  const ref = artifact(root, 'evidence/dispatch.jsonl', [{ event: 'dispatch' }]);
  recordIndex(root, 'records/invalid-lifecycle.jsonl', [
    record(ref, { layer: 'discovery' }),
    record(ref, {
      taskId: 'task-1',
      attemptId: 'attempt-1',
      authority: 'authority-a',
    }),
    record(ref, {
      operation: 'resume',
      taskId: 'task-1',
      attemptId: 'attempt-2',
      authority: 'authority-b',
    }),
  ]);
  const claimPath = path.join(root, 'claim.json');
  fs.writeFileSync(
    claimPath,
    JSON.stringify({
      ...claimBase,
      controls: [],
      records: ['records/invalid-lifecycle.jsonl'],
    }),
  );

  const result = checkDelegationQualification(root, claimPath);
  assert.equal(result.status, 'fail');
  assert.match(result.evidence, /lifecycle=invalid/);
});

test('requires an independent reviewer record before acceptance is verified', () => {
  const root = tempRoot();
  const steps = (reviewer: string) => [
    {
      operation: 'dispatch' as const,
      taskId: 'task-1',
      attemptId: 'attempt-1',
      authority: 'authority-a',
      actor: 'worker-1',
    },
    {
      operation: 'receive_completion' as const,
      taskId: 'task-1',
      attemptId: 'attempt-1',
    },
    {
      operation: 'collect_receipt' as const,
      taskId: 'task-1',
      attemptId: 'attempt-1',
    },
    {
      operation: 'verify_acceptance' as const,
      taskId: 'task-1',
      attemptId: 'attempt-1',
      reviewer,
    },
  ];

  const selfAccepted = summarizeLifecycle(
    lifecycleRecords(root, 'self-accepted', steps('worker-1')),
  );
  assert.equal(selfAccepted.completed, true);
  assert.equal(selfAccepted.verified, false);
  assert.match(selfAccepted.limitations.join(' '), /independent/i);

  const independentlyAccepted = summarizeLifecycle(
    lifecycleRecords(root, 'independently-accepted', steps('reviewer-1')),
  );
  assert.equal(independentlyAccepted.verified, true);
});

test('keeps a cancelled trace cancelled even when completion was recorded later', () => {
  const root = tempRoot();
  const summary = summarizeLifecycle(
    lifecycleRecords(root, 'cancel-then-complete', [
      {
        operation: 'dispatch',
        taskId: 'task-1',
        attemptId: 'attempt-1',
        authority: 'authority-a',
        actor: 'worker-1',
      },
      { operation: 'cancel', taskId: 'task-1', attemptId: 'attempt-1' },
      {
        operation: 'receive_completion',
        taskId: 'task-1',
        attemptId: 'attempt-1',
      },
      {
        operation: 'collect_receipt',
        taskId: 'task-1',
        attemptId: 'attempt-1',
      },
    ]),
  );
  assert.equal(summary.status, 'cancelled');
  assert.equal(summary.completed, false);
  assert.equal(summary.verified, false);
});

test('harness qualification check reports support status without live proof', () => {
  const root = tempRoot();
  const empty = checkDelegationQualification(root, null);
  assert.equal(empty.status, 'not_verified');
  assert.match(empty.evidence, /no .*claim/i);

  const claimPath = path.join(root, 'claim.json');
  const writeClaim = (records: string[]) =>
    fs.writeFileSync(
      claimPath,
      JSON.stringify({
        ...claimBase,
        controls: [],
        records,
      }),
    );

  const syntheticRef = artifact(root, 'evidence/synthetic.jsonl', [
    { event: 'synthetic' },
  ]);
  recordIndex(root, 'records/synthetic.jsonl', [
    record(syntheticRef, { layer: 'discovery', executor: 'synthetic' }),
    record(syntheticRef, { executor: 'synthetic' }),
  ]);
  writeClaim(['records/synthetic.jsonl']);
  const syntheticResult = checkDelegationQualification(root, claimPath);
  assert.equal(syntheticResult.status, 'not_verified');
  assert.match(syntheticResult.evidence, /fixture|synthetic/i);

  const discoveryRef = artifact(root, 'evidence/discovery.jsonl', [
    { event: 'discovery' },
  ]);
  const liveRef = artifact(root, 'evidence/execution.jsonl', [
    { event: 'execution' },
  ]);
  recordIndex(root, 'records/live.jsonl', [
    record(discoveryRef, { layer: 'discovery' }),
    record(liveRef),
  ]);
  writeClaim(['records/live.jsonl']);
  const supported = checkDelegationQualification(root, claimPath);
  assert.equal(supported.status, 'pass');

  writeClaim(['records/absent.jsonl']);
  const missing = checkDelegationQualification(root, claimPath);
  assert.equal(missing.status, 'not_verified');
  assert.match(missing.evidence, /evidence|artifact|open/i);

  assert.equal(computeExitCode([{ ...supported, status: 'unsupported' }]), 1);
  assert.equal(computeExitCode([supported]), 0);
  assert.match(
    renderResults([syntheticResult], { date: '2026-10-23', commit: 'abc1234' }),
    /not_verified/,
  );
});
