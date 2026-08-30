import { describe, expect, it } from 'vitest';
import {
  checkAssertion,
  type Assertion,
} from '../assertion-semantics';

/**
 * This matcher decides whether a committed eval run verifies, so its branches
 * are worth covering directly. It is duplicated in `scripts/evals/scorer.ts` and
 * `mcp/src/services/assertion-semantics.ts`; `scripts/evals/assertion-parity.test.ts`
 * asserts all three stay in step.
 */
const a = (type: Assertion['type'], value: string | string[]): Assertion => ({
  type,
  value,
});

describe('checkAssertion', () => {
  describe('v1 semantics (literal)', () => {
    it('matches a case-insensitive substring', () => {
      expect(checkAssertion(a('contains', 'Peak QPS'), 'we sized peak qps')).toBe(
        true,
      );
    });

    it('fails when the literal is absent', () => {
      expect(checkAssertion(a('contains', 'peak QPS'), 'we drew boxes')).toBe(
        false,
      );
    });

    it('does not apply fuzzy matching', () => {
      expect(
        checkAssertion(a('contains', 'replicating the record'), 'we replicate the records'),
      ).toBe(false);
    });
  });

  describe('contains_any', () => {
    it('passes when any value matches', () => {
      expect(
        checkAssertion(a('contains_any', ['saga', 'compensation']), 'define a compensation'),
      ).toBe(true);
    });

    it('fails when no value matches', () => {
      expect(
        checkAssertion(a('contains_any', ['saga', 'outbox']), 'a plain sync call'),
      ).toBe(false);
    });

    it('accepts a single non-array value', () => {
      expect(checkAssertion(a('contains_any', 'outbox'), 'use the outbox')).toBe(
        true,
      );
    });

    it('uses v2 semantics for each candidate when requested', () => {
      expect(
        checkAssertion(a('contains_any', ['stale reads']), 'stale read is accepted', 2),
      ).toBe(true);
    });
  });

  describe('not_contains', () => {
    it('passes when the value is absent', () => {
      expect(
        checkAssertion(a('not_contains', 'multi-region'), 'single region, multi-AZ'),
      ).toBe(true);
    });

    it('fails when the value is present', () => {
      expect(
        checkAssertion(a('not_contains', 'multi-region'), 'go multi-region now'),
      ).toBe(false);
    });

    it('stays literal even under v2', () => {
      expect(
        checkAssertion(a('not_contains', 'sharding'), 'we shard the table', 2),
      ).toBe(true);
    });
  });

  describe('regex', () => {
    it('matches case-insensitively', () => {
      expect(
        checkAssertion(a('regex', 'RPO\\s*and\\s*RTO'), 'state rpo and rto first'),
      ).toBe(true);
    });

    it('fails closed on an invalid pattern', () => {
      expect(checkAssertion(a('regex', '([unclosed'), 'anything')).toBe(false);
    });
  });

  describe('file_reference', () => {
    it('matches the full path', () => {
      expect(
        checkAssertion(a('file_reference', 'references/scorecard.md'), 'see references/scorecard.md'),
      ).toBe(true);
    });

    it('matches the basename alone', () => {
      expect(
        checkAssertion(a('file_reference', 'references/scorecard.md'), 'see scorecard.md'),
      ).toBe(true);
    });

    it('fails when neither appears', () => {
      expect(
        checkAssertion(a('file_reference', 'references/scorecard.md'), 'no reference here'),
      ).toBe(false);
    });
  });

  it('fails closed on an unknown assertion type', () => {
    expect(
      checkAssertion(
        { type: 'matches_regex' as Assertion['type'], value: 'x' },
        'x',
      ),
    ).toBe(false);
  });

  describe('v2 semantics (normalized)', () => {
    it('ignores markdown emphasis and collapsed whitespace', () => {
      expect(
        checkAssertion(a('contains', 'transactional outbox'), 'a **transactional  outbox** row', 2),
      ).toBe(true);
    });

    it('matches a code example across line wrapping', () => {
      expect(
        checkAssertion(a('contains', 'useState()'), 'call use\nState( )', 2),
      ).toBe(true);
    });

    it('keeps values containing digits exact', () => {
      expect(
        checkAssertion(a('contains', '99.9% availability'), 'availability near 99.95 percent', 2),
      ).toBe(false);
    });

    it('matches a generic function call with a type argument', () => {
      expect(
        checkAssertion(a('contains', 'inject<T>()'), 'const x = inject<AuthService>(TOKEN);', 2),
      ).toBe(true);
    });

    it('matches a constructor shape with a different property name', () => {
      expect(
        checkAssertion(a('contains', 'State(val count'), 'data class State(val counter: Int)', 2),
      ).toBe(true);
    });

    it('matches Angular control flow by syntax and tracking identity', () => {
      expect(
        checkAssertion(a('contains', '@for (item of items; track item.id)'), '@for (row of rows; track row.id) {}', 2),
      ).toBe(true);
    });

    it('requires track for @for', () => {
      expect(
        checkAssertion(a('contains', '@for (item of items; track item.id)'), '@for (row of rows) {}', 2),
      ).toBe(false);
    });

    it('matches @if and @empty blocks', () => {
      expect(checkAssertion(a('contains', '@if (ready)'), '@if (isReady) {}', 2)).toBe(true);
      expect(checkAssertion(a('contains', '@empty'), '@empty { nothing }', 2)).toBe(true);
    });

    it('matches a bare function name when the answer passes an argument', () => {
      expect(
        checkAssertion(a('contains', 'computed()'), 'const total = computed(() => 1);', 2),
      ).toBe(true);
    });

    it('matches a single prose token through stemming', () => {
      expect(checkAssertion(a('contains', 'sharding'), 'we shard the table', 2)).toBe(
        true,
      );
    });

    it('requires every token of a multi-token phrase', () => {
      expect(
        checkAssertion(a('contains', 'reversal trigger'), 'we recorded a reversal for it', 2),
      ).toBe(false);
    });

    it('fails when the value carries no semantic tokens', () => {
      expect(checkAssertion(a('contains', 'a of the'), 'anything at all', 2)).toBe(
        false,
      );
    });
  });
});
