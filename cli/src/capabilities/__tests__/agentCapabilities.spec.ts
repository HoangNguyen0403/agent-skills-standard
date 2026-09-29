import { describe, expect, it } from 'vitest';
import { Agent } from '../../constants/enums';
import { AGENT_CAPABILITIES, disclosureLines, unsupportedSurfaces } from '../agentCapabilities';

describe('unsupportedSurfaces', () => {
  it('lists what Trae cannot use', () => {
    expect(unsupportedSurfaces(AGENT_CAPABILITIES[Agent.Trae])).toEqual(['specialists', 'hooks']);
  });
  it('is empty for Claude', () => {
    expect(unsupportedSurfaces(AGENT_CAPABILITIES[Agent.Claude])).toEqual([]);
  });
});

describe('disclosureLines', () => {
  it('prints once for a new agent and records it', () => {
    const r = disclosureLines([Agent.Trae, Agent.Claude], undefined);
    expect(r.lines).toEqual(['Trae: specialists, hooks not supported']);
    expect(r.next).toEqual({ [Agent.Trae]: ['specialists', 'hooks'], [Agent.Claude]: [] });
  });
  it('prints nothing when unchanged', () => {
    const prev = { [Agent.Trae]: ['specialists', 'hooks'] };
    expect(disclosureLines([Agent.Trae], prev).lines).toEqual([]);
  });
  it('prints again when the set changes', () => {
    const prev = { [Agent.Trae]: ['hooks'] };
    expect(disclosureLines([Agent.Trae], prev).lines).toEqual(['Trae: specialists, hooks not supported']);
  });
  it('prints nothing when the set becomes empty', () => {
    const prev = { [Agent.Claude]: ['hooks'] };
    expect(disclosureLines([Agent.Claude], prev).lines).toEqual([]);
  });
});
