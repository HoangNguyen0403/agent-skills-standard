/**
 * Canonical assertion semantics, shared in behaviour by three consumers:
 * `scripts/evals/scorer.ts`, this CLI verifier, and the MCP verifier.
 *
 * The three cannot import one module — `mcp/tsconfig.json` pins `rootDir: src`
 * and each package bundles independently — so the file is duplicated verbatim
 * and `scripts/evals/assertion-parity.test.ts` fails the build if the copies
 * ever diverge. Change all three together.
 */
export type AssertionSemanticsVersion = 1 | 2;

export type AssertionType =
  | 'contains'
  | 'contains_any'
  | 'not_contains'
  | 'regex'
  | 'file_reference';

export interface Assertion {
  type: AssertionType;
  value: string | string[];
}

const SEMANTIC_STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'use', 'via', 'with',
]);

function normalizedText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value: string): string {
  return normalizedText(value).replace(/\s+/g, '');
}

function semanticTokens(value: string): string[] {
  return (
    normalizedText(value)
      .replace(/[-_/]/g, ' ')
      .match(/@[a-z][a-z0-9]*|[a-z][a-z0-9]*|\d+/g) ?? []
  ).filter((token) => !SEMANTIC_STOP_WORDS.has(token) && token.length > 2);
}

function tokenVariants(value: string): Set<string> {
  const variants = new Set([value]);
  const stemmed = value.replace(/(ing|ed|es|s)$/, '');
  variants.add(stemmed);
  if (value.endsWith('ing')) variants.add(`${stemmed}e`);
  if (stemmed.endsWith('e')) variants.add(stemmed.slice(0, -1));
  return variants;
}

function containsV2(value: string, transcript: string): boolean {
  const needle = normalizedText(value);
  const haystack = normalizedText(transcript);
  if (haystack.includes(needle)) return true;

  // Markdown and line wrapping must not change the meaning of a code example.
  if (/[{}[\]@/:?<>$%()]/.test(value)) {
    if (compactText(transcript).includes(compactText(value))) return true;
  }

  // Concrete literals (status codes, versions, amounts, paths) remain exact.
  if (/\d/.test(value)) return false;

  // Syntax-specific equivalence for examples whose placeholder names vary.
  if (/[{}[\]@/:?<>$%()]/.test(value)) {
    const genericFunction = value.match(
      /^([a-z_$][a-z0-9_$]*)\s*<[^>]+>\s*\(\s*\)$/i,
    );
    if (genericFunction)
      return new RegExp(`${genericFunction[1]}\\s*(?:<[^>]+>)?\\s*\\(`, 'i').test(
        transcript,
      );

    const constructorShape = value.match(
      /\b([A-Z][A-Za-z0-9_]*)\s*\(\s*val\s+([A-Za-z_][A-Za-z0-9_]*)/,
    );
    if (constructorShape)
      return new RegExp(
        `${constructorShape[1]}\\s*\\([\\s\\S]*?${constructorShape[2]}`,
        'i',
      ).test(transcript);

    // Angular control-flow examples use arbitrary variable names; preserve
    // the stable syntax and tracking identity instead of the placeholder names.
    if (/^@for\s*\(/i.test(value))
      return (
        /@for\s*\(/i.test(transcript) &&
        /\btrack\b/i.test(transcript) &&
        /(?:\.\s*id|\bid\b)/i.test(transcript)
      );
    if (/^@if\s*\(/i.test(value)) return /@if\s*\(/i.test(transcript);
    if (/^@empty\b/i.test(value)) return /@empty\b/i.test(transcript);
    // A function name is the stable contract when the answer supplies a
    // concrete argument rather than the empty example's parentheses.
    const functionName = value.match(/^([a-z_$][a-z0-9_$]*)\(\s*\)$/i)?.[1];
    if (functionName)
      return new RegExp(`${functionName}\\s*\\(`, 'i').test(transcript);
  }

  const required = semanticTokens(value);
  const available = new Set(
    semanticTokens(transcript).flatMap((token) => [...tokenVariants(token)]),
  );
  if (required.length === 1) {
    const variants = tokenVariants(required[0]);
    return [...variants].some((variant) => available.has(variant));
  }
  if (required.length === 0) return false;
  return required.every((token) => {
    const variants = tokenVariants(token);
    return [...variants].some(
      (variant) =>
        available.has(variant) ||
        [...available].some(
          (candidate) =>
            candidate.startsWith(variant) || variant.startsWith(candidate),
        ),
    );
  });
}

/** Basename without importing `path`, so the module stays runtime-agnostic. */
function basename(value: string): string {
  const parts = value.split(/[\\/]/);
  return parts[parts.length - 1] ?? value;
}

export function checkAssertion(
  assertion: Assertion,
  transcript: string,
  semanticsVersion: AssertionSemanticsVersion = 1,
): boolean {
  const haystack = transcript.toLowerCase();
  switch (assertion.type) {
    case 'contains':
      return semanticsVersion === 2
        ? containsV2(String(assertion.value), transcript)
        : haystack.includes(String(assertion.value).toLowerCase());
    case 'contains_any': {
      const values = Array.isArray(assertion.value)
        ? assertion.value
        : [assertion.value];
      return values.some((value) =>
        semanticsVersion === 2
          ? containsV2(String(value), transcript)
          : haystack.includes(String(value).toLowerCase()),
      );
    }
    case 'not_contains':
      return !haystack.includes(String(assertion.value).toLowerCase());
    case 'regex': {
      try {
        return new RegExp(String(assertion.value), 'i').test(transcript);
      } catch {
        return false;
      }
    }
    case 'file_reference': {
      const value = String(assertion.value).toLowerCase();
      return haystack.includes(value) || haystack.includes(basename(value));
    }
    default:
      return false;
  }
}
