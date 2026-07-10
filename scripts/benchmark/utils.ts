import fs from 'fs-extra';
import * as path from 'path';
import { encode } from 'gpt-tokenizer';
import { CHARS_PER_TOKEN } from './constants';

const BEHAVIOR_GUARDRAIL_SKILL = /(tdd|debug|verify|protocol|review|skill-creator|workflow|security-audit)/i;
const FRONTMATTER_GUARDRAIL_FLAG = /^guardrail:\s*true\s*$/m;

/**
 * Whether a skill is a "guardrail" skill (enforces agent behavior under
 * pressure, e.g. TDD, verification, protocol adherence) rather than a plain
 * knowledge/reference skill. Prefers an explicit `guardrail: true`
 * frontmatter flag; falls back to a name-based heuristic for skills that
 * haven't been annotated yet. Shared by the benchmark quality rubric and the
 * live eval-run manifest builder (scripts/evals/manifest.ts).
 */
export function isGuardrailApplicable(
  category: string,
  skillId: string,
  skillMdContent: string,
): boolean {
  return (
    FRONTMATTER_GUARDRAIL_FLAG.test(skillMdContent) ||
    BEHAVIOR_GUARDRAIL_SKILL.test(`${category}/${skillId}`)
  );
}

interface SkillEvalAssertion {
  type: string;
  value: string;
}

interface PressureScenario {
  prompt?: string;
  failure_mode?: string;
  behavior_assertions?: string[];
}

interface EvalsJson {
  evals?: Array<{ assertions?: SkillEvalAssertion[] }>;
  should_not_trigger?: string[];
  pressure_scenarios?: PressureScenario[];
  rationalizations?: string[];
  red_flags?: string[];
}

/**
 * Real cl100k_base-family tokenization via `gpt-tokenizer`. Falls back to the
 * chars/4 approximation only if encoding throws (e.g. exotic binary content).
 */
export function countTokensForText(content: string): number {
  try {
    return encode(content).length;
  } catch {
    return Math.ceil(content.length / CHARS_PER_TOKEN);
  }
}

export function countTokens(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf-8');
  return countTokensForText(content);
}

export function costUSD(tokens: number, pricePerMillion: number): number {
  return (tokens / 1_000_000) * pricePerMillion;
}

/**
 * Tokens contributed by a skill's frontmatter alone (name + description).
 * This is the portion that is loaded into every session regardless of
 * whether the skill body is ever read — the real "always-on" overhead.
 */
export function countFrontmatterTokens(skillMdPath: string): number {
  if (!fs.existsSync(skillMdPath)) return 0;
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return 0;
  return countTokensForText(match[1]);
}

export function scoreQuality(
  skillDir: string,
  skillMdPath: string,
): {
  score: number;
  detail: string[];
  behaviorGuardrailApplicable: boolean;
  behaviorQualityScore: number;
  behaviorDetail: string[];
  evalCount: number;
  evalAlignmentPct: number;
} {
  const detail: string[] = [];
  let score = 0;
  const content = fs.existsSync(skillMdPath)
    ? fs.readFileSync(skillMdPath, 'utf-8')
    : '';
  const behaviorDetail: string[] = [];
  let behaviorQualityScore = 0;

  const lines = content.split('\n').length;
  const skillId = path.basename(skillDir);
  const category = path.basename(path.dirname(skillDir));
  const behaviorGuardrailApplicable = isGuardrailApplicable(
    category,
    skillId,
    content,
  );

  // 1. Actionable Constraints
  const bulletLines = (content.match(/^\s*[-*]\s+.+/gm) || []).length;
  if (bulletLines >= 3) {
    score += 2;
    detail.push('✅ Actionable constraints (≥ 3 bullets)');
  } else {
    detail.push('❌ Missing actionable constraints');
  }

  // 2. Explicit Anti-Patterns
  // Matches: dedicated section heading, legacy 🚫 emoji boilerplate, or updated **No X** inline format
  const hasAntiPatterns =
    /##\s+.*Anti-Pattern/i.test(content) ||
    /🚫.*Anti-Pattern/i.test(content) ||
    /\*\*No\s+\w/i.test(content);
  if (hasAntiPatterns) {
    score += 2;
    detail.push('✅ Explicit Anti-Patterns found');
  } else {
    detail.push('❌ Missing Anti-patterns (add ## Anti-Patterns or **No X**: lines)');
  }

  // 3. Context Architecture (Progressive Disclosure OR Extreme Density)
  // A link only counts if the target file actually exists and is non-empty —
  // a dangling `](references/foo.md)` is not "progressive disclosure".
  const referenceLinkMatches = [
    ...content.matchAll(/\]\(references\/([^)]+\.md)\)/gi),
  ];
  const referenceLinkTargets = referenceLinkMatches.map((m) =>
    path.join(skillDir, 'references', m[1]),
  );
  const verifiedReferenceLinks = referenceLinkTargets.filter((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).size > 0;
    } catch {
      return false;
    }
  });
  const brokenReferenceLinks = referenceLinkTargets.length - verifiedReferenceLinks.length;
  const hasVerifiedReferenceLinks =
    referenceLinkTargets.length > 0 && brokenReferenceLinks === 0;

  if (hasVerifiedReferenceLinks) {
    score += 2;
    detail.push(
      `✅ Progressive Disclosure (${verifiedReferenceLinks.length} verified references/ link(s))`,
    );
  } else if (brokenReferenceLinks > 0) {
    detail.push(
      `❌ Broken references/ link(s): ${brokenReferenceLinks} of ${referenceLinkTargets.length} target(s) missing or empty`,
    );
  } else if (lines <= 60) {
    score += 2;
    detail.push('✅ Efficiency Mastery (ultra-dense ≤ 60 lines)');
  } else {
    detail.push('❌ Bloat Risk (>60 lines with no references linked)');
  }

  // 4. Token Optimality
  if (lines <= 100) {
    score += 2;
    detail.push(`✅ Token optimal (${lines} lines)`);
  } else {
    detail.push(`❌ Too long (${lines} lines)`);
  }

  // 5. Eval Coverage & Alignment (replaces Inline Triggers check)
  //    Measures: do evals exist, are they thorough, and does SKILL.md actually
  //    teach what the evals test? This is the static proxy for "with vs without skill".
  const evalsPath = path.join(skillDir, 'evals', 'evals.json');
  let evalCount = 0;
  let evalAlignmentPct = -1; // -1 = n/a (no evals, or no contains assertions)

  if (fs.existsSync(evalsPath)) {
    const evalsData = fs.readJSONSync(evalsPath) as EvalsJson;
    const evals: Array<{
      assertions?: Array<{ type: string; value: string }>;
    }> = evalsData.evals || [];
    evalCount = evals.length;

    const hasNotTrigger =
      Array.isArray(evalsData.should_not_trigger) &&
      evalsData.should_not_trigger.length > 0;
    const totalAssertions = evals.reduce(
      (s, e) => s + (e.assertions?.length || 0),
      0,
    );
    const avgAssertions = evalCount > 0 ? totalAssertions / evalCount : 0;

    // Eval alignment: % of "contains" assertion values that appear in SKILL.md.
    // A high alignment means the skill actually teaches what the evals test —
    // the closest static proxy for "with skill > without skill" effectiveness.
    let containsAssertions = 0;
    let alignedAssertions = 0;
    for (const ev of evals) {
      for (const assertion of ev.assertions || []) {
        if (assertion.type === 'contains') {
          containsAssertions++;
          if (
            content.toLowerCase().includes(assertion.value.toLowerCase())
          ) {
            alignedAssertions++;
          }
        }
      }
    }
    // Sentinel -1 means "no contains assertions to check" (n/a), distinct
    // from a legitimate 0% alignment score.
    evalAlignmentPct =
      containsAssertions > 0
        ? Math.round((alignedAssertions / containsAssertions) * 100)
        : -1;

    const missingParts: string[] = [];
    if (!hasNotTrigger) missingParts.push('should_not_trigger');
    if (avgAssertions < 2) missingParts.push('≥2 assertions/eval');

    const alignmentLabel =
      evalAlignmentPct >= 0 ? `${evalAlignmentPct}% aligned` : 'n/a aligned (no contains assertions)';

    if (evalCount >= 3 && hasNotTrigger && avgAssertions >= 2) {
      score += 2;
      detail.push(
        `✅ Eval Coverage (${evalCount} evals, ${avgAssertions.toFixed(1)} assertions/eval, ${alignmentLabel})`,
      );
    } else if (evalCount > 0) {
      score += 1;
      detail.push(
        `⚠️ Partial Eval Coverage (${evalCount} evals, missing: ${missingParts.join(', ')}, ${alignmentLabel})`,
      );
    } else {
      detail.push('❌ Missing evals/evals.json — add eval prompts to measure with/without-skill delta');
    }

    if (behaviorGuardrailApplicable) {
      const pressureScenarios = evalsData.pressure_scenarios || [];
      const rationalizations = evalsData.rationalizations || [];
      const redFlags = evalsData.red_flags || [];
      const behaviorAssertions = pressureScenarios.reduce(
        (sum, scenario) => sum + (scenario.behavior_assertions?.length || 0),
        0,
      );

      if (pressureScenarios.length >= 2) {
        behaviorQualityScore += 1;
        behaviorDetail.push(`✅ Pressure scenarios (${pressureScenarios.length})`);
      } else {
        behaviorDetail.push('❌ Missing pressure scenarios (need ≥2)');
      }

      if (rationalizations.length >= 2) {
        behaviorQualityScore += 1;
        behaviorDetail.push(`✅ Rationalizations (${rationalizations.length})`);
      } else {
        behaviorDetail.push('❌ Missing rationalizations (need ≥2)');
      }

      if (redFlags.length >= 2) {
        behaviorQualityScore += 1;
        behaviorDetail.push(`✅ Red flags (${redFlags.length})`);
      } else {
        behaviorDetail.push('❌ Missing red flags (need ≥2)');
      }

      if (behaviorAssertions >= 2) {
        behaviorQualityScore += 1;
        behaviorDetail.push(`✅ Behavior assertions (${behaviorAssertions})`);
      } else {
        behaviorDetail.push('❌ Missing behavior assertions (need ≥2)');
      }
    }
  } else {
    detail.push('❌ Missing evals/evals.json — add eval prompts to measure with/without-skill delta');
    if (behaviorGuardrailApplicable) {
      behaviorDetail.push('❌ Missing evals/evals.json for guardrail skill');
    }
  }

  return {
    score,
    detail,
    behaviorGuardrailApplicable,
    behaviorQualityScore,
    behaviorDetail,
    evalCount,
    evalAlignmentPct,
  };
}
