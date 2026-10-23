import { describe, expect, it } from 'vitest';
import { Agent } from '../../constants/enums';
import {
  AGENT_CAPABILITIES,
  DELEGATION_OPERATIONS,
  delegationStatus,
  delegationSurface,
  disclosureLines,
  unsupportedSurfaces,
} from '../agentCapabilities';
import type {
  DelegationSurfaceKind,
  RuntimeEvidence,
} from '../agentCapabilities';

describe('unsupportedSurfaces', () => {
  it('lists what Trae cannot use', () => {
    expect(unsupportedSurfaces(AGENT_CAPABILITIES[Agent.Trae])).toEqual([
      'specialists',
      'hooks',
    ]);
  });
  it('is empty for Claude', () => {
    expect(unsupportedSurfaces(AGENT_CAPABILITIES[Agent.Claude])).toEqual([]);
  });
});

describe('disclosureLines', () => {
  it('prints once for a new agent and records it', () => {
    const r = disclosureLines([Agent.Trae, Agent.Claude], undefined);
    expect(r.lines).toEqual(['Trae: specialists, hooks not supported']);
    expect(r.next).toEqual({
      [Agent.Trae]: ['specialists', 'hooks'],
      [Agent.Claude]: [],
    });
  });
  it('prints nothing when unchanged', () => {
    const prev = { [Agent.Trae]: ['specialists', 'hooks'] };
    expect(disclosureLines([Agent.Trae], prev).lines).toEqual([]);
  });
  it('prints again when the set changes', () => {
    const prev = { [Agent.Trae]: ['hooks'] };
    expect(disclosureLines([Agent.Trae], prev).lines).toEqual([
      'Trae: specialists, hooks not supported',
    ]);
  });
  it('prints nothing when the set becomes empty', () => {
    const prev = { [Agent.Claude]: ['hooks'] };
    expect(disclosureLines([Agent.Claude], prev).lines).toEqual([]);
  });
});

describe('Copilot native custom-agent surface', () => {
  it('targets the documented .github/agents/.agent.md surface, not broad instructions', () => {
    const def = AGENT_CAPABILITIES[Agent.Copilot];
    expect(def.agentPath).toBe('.github/agents');
    expect(def.specialistFormat).toBe('copilot-agent-md');
    expect(delegationSurface(def)).toEqual({
      kind: 'native-agent',
      surface: 'copilot-custom-agents',
    });
  });
});

describe('delegationSurface', () => {
  it.each<[Agent, string | null, DelegationSurfaceKind]>([
    [Agent.Claude, 'claude-code-subagents', 'native-agent'],
    [Agent.Codex, 'codex-subagents', 'native-agent'],
    [Agent.Gemini, 'gemini-cli-subagents', 'native-agent'],
    [Agent.OpenCode, 'opencode-agents', 'native-agent'],
    [Agent.Cursor, null, 'instruction-only'],
    [Agent.Kiro, null, 'instruction-only'],
    [Agent.Trae, null, 'none'],
    [Agent.Antigravity, null, 'none'],
  ])('%s declares %s as %s', (agent, surface, kind) => {
    expect(delegationSurface(AGENT_CAPABILITIES[agent])).toEqual({
      kind,
      surface,
    });
  });

  it('keeps an instruction-only persona distinct from an absent surface', () => {
    expect(delegationSurface(AGENT_CAPABILITIES[Agent.Cursor])).toEqual({
      kind: 'instruction-only',
      surface: null,
    });
    expect(delegationSurface(AGENT_CAPABILITIES[Agent.Trae])).toEqual({
      kind: 'none',
      surface: null,
    });
  });
});

describe('delegationStatus', () => {
  const evidence = (over: Partial<RuntimeEvidence> = {}): RuntimeEvidence => ({
    host: Agent.Claude,
    surface: 'claude-code-subagents',
    version: '2.1.289',
    revision: 'rev-a',
    operation: 'dispatch',
    layer: 'execution',
    executor: 'live',
    outcome: 'observed_pass',
    trace: 'traces/execution.jsonl',
    controls: [],
    ...over,
  });

  it('reports not_verified for every lifecycle operation when no evidence exists', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    for (const operation of DELEGATION_OPERATIONS) {
      expect(delegationStatus(def, operation)).toBe('not_verified');
    }
  });

  it('reports unsupported when the host has no delegation surface at all', () => {
    const def = AGENT_CAPABILITIES[Agent.Trae];
    expect(delegationStatus(def, 'dispatch')).toBe('unsupported');
    expect(
      delegationStatus(def, 'resume', {
        version: '1',
        revision: 'rev-a',
        requiredControls: [],
        evidence: [],
      }),
    ).toBe('unsupported');
  });

  it('reports unsupported for an instruction-only persona surface', () => {
    const def = AGENT_CAPABILITIES[Agent.Cursor];
    expect(delegationStatus(def, 'dispatch')).toBe('unsupported');
  });

  it('does not promote synthetic or non-execution observations to supported', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    for (const record of [
      evidence({ executor: 'synthetic' }),
      evidence({ layer: 'serialization' }),
      evidence({ layer: 'discovery' }),
      evidence({ trace: '  ' }),
    ]) {
      expect(
        delegationStatus(def, 'dispatch', {
          version: '2.1.289',
          revision: 'rev-a',
          requiredControls: [],
          evidence: [record],
        }),
      ).toBe('not_verified');
    }
  });

  it('accepts evidence only for the exact host, surface, version and operation', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    const query = {
      version: '2.1.289',
      revision: 'rev-a',
      requiredControls: [],
      evidence: [evidence()],
    };
    expect(delegationStatus(def, 'dispatch', query)).toBe('supported');
    expect(delegationStatus(def, 'resume', query)).toBe('not_verified');
    expect(
      delegationStatus(def, 'dispatch', {
        version: '2.1.290',
        revision: 'rev-a',
        requiredControls: [],
        evidence: [evidence()],
      }),
    ).toBe('not_verified');
    expect(
      delegationStatus(def, 'dispatch', {
        version: '2.1.289',
        revision: 'rev-a',
        requiredControls: [],
        evidence: [evidence({ surface: 'codex-subagents' })],
      }),
    ).toBe('not_verified');
    expect(
      delegationStatus(def, 'dispatch', {
        version: '2.1.289',
        revision: 'rev-a',
        requiredControls: [],
        evidence: [evidence({ host: Agent.Codex })],
      }),
    ).toBe('not_verified');
  });

  it('does not let evidence from an earlier revision promote the current one', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    const earlierPass = evidence({ revision: 'rev-a' });

    expect(
      delegationStatus(def, 'dispatch', {
        version: '2.1.289',
        revision: 'rev-a',
        requiredControls: [],
        evidence: [earlierPass],
      }),
    ).toBe('supported');
    expect(
      delegationStatus(def, 'dispatch', {
        version: '2.1.289',
        revision: 'rev-b',
        requiredControls: [],
        evidence: [earlierPass],
      }),
    ).toBe('not_verified');
  });

  it('ignores a failure recorded for an earlier revision', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    const currentPass = evidence({
      revision: 'rev-b',
      controls: ['tool_allowlist'],
    });
    const staleFailure = evidence({
      revision: 'rev-a',
      outcome: 'observed_fail',
      controls: ['tool_allowlist'],
    });

    expect(
      delegationStatus(def, 'dispatch', {
        version: '2.1.289',
        revision: 'rev-b',
        requiredControls: ['tool_allowlist'],
        evidence: [currentPass, staleFailure],
      }),
    ).toBe('supported');
  });

  it('requires evidence to cover every required control', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    const withoutControls = evidence({ controls: [] });
    const withControls = evidence({
      controls: ['tool_allowlist', 'filesystem_scope'],
    });
    const query = (
      requiredControls: readonly string[],
      evidenceList: readonly RuntimeEvidence[],
    ) => ({
      version: '2.1.289',
      revision: 'rev-a',
      requiredControls,
      evidence: evidenceList,
    });

    expect(
      delegationStatus(
        def,
        'dispatch',
        query(['tool_allowlist'], [withoutControls]),
      ),
    ).toBe('not_verified');
    expect(
      delegationStatus(
        def,
        'dispatch',
        query(['tool_allowlist', 'filesystem_scope'], [withControls]),
      ),
    ).toBe('supported');
    expect(
      delegationStatus(
        def,
        'dispatch',
        query(['network_scope'], [withControls]),
      ),
    ).toBe('not_verified');

    const unrelatedFailure = evidence({
      outcome: 'observed_fail',
      controls: ['network_scope'],
    });
    expect(
      delegationStatus(
        def,
        'dispatch',
        query(['tool_allowlist'], [unrelatedFailure]),
      ),
    ).toBe('not_verified');
    const mixedScopePass = evidence({
      controls: ['tool_allowlist', 'filesystem_scope'],
    });
    const requiredControlFailure = evidence({
      outcome: 'observed_fail',
      controls: ['tool_allowlist'],
    });
    expect(
      delegationStatus(
        def,
        'dispatch',
        query(
          ['tool_allowlist', 'filesystem_scope'],
          [mixedScopePass, requiredControlFailure],
        ),
      ),
    ).toBe('unsupported');

    const unrelatedControlFailure = evidence({
      outcome: 'observed_fail',
      controls: ['network_scope'],
    });
    expect(
      delegationStatus(
        def,
        'dispatch',
        query(
          ['tool_allowlist', 'filesystem_scope'],
          [mixedScopePass, unrelatedControlFailure],
        ),
      ),
    ).toBe('supported');
  });

  it('reports observed failed evidence as unsupported', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    expect(
      delegationStatus(def, 'cancel', {
        version: '2.1.289',
        revision: 'rev-a',
        requiredControls: [],
        evidence: [evidence({ operation: 'cancel', outcome: 'observed_fail' })],
      }),
    ).toBe('unsupported');
  });

  it('stays unsupported when passing and failing evidence disagree for one scope', () => {
    const def = AGENT_CAPABILITIES[Agent.Claude];
    expect(
      delegationStatus(def, 'dispatch', {
        version: '2.1.289',
        revision: 'rev-a',
        requiredControls: [],
        evidence: [
          evidence(),
          evidence({ outcome: 'observed_fail', revision: 'rev-a' }),
        ],
      }),
    ).toBe('unsupported');
  });

  it('does not require evidence for a host without a surface', () => {
    const def = AGENT_CAPABILITIES[Agent.Roo];
    expect(delegationStatus(def, 'prepare')).toBe('unsupported');
  });
});
