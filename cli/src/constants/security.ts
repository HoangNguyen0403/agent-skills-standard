/**
 * Centralized patterns for detecting and sanitizing prompt injection.
 * Shared between the CLI and CI scanning scripts.
 */

/** Applied to the SKILL.md frontmatter `description` field. Always error-level. */
export const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|previous\s+|prior\s+)*(?:instructions?|rules?|guidance)/gi,
  /you\s+(?:must|should|shall|will)\s+(?:now|immediately)\b/gi,
  /^(?:system|user|assistant)\s*:/gim,
  /(?:^|\n)\s*-{3,}\s*(?:\n|$)/g,
  /<(?:script|iframe|style)[^>]*\s*>[\s\S]*?<\/(?:script|iframe|style)[^>]*\s*>/gi,
];

/**
 * Zero-width / bidi control code points that render invisibly in a diff but
 * can hide instructions from a human reviewer while an LLM still reads them.
 * Built from numeric code points (not regex-literal escapes) so no literal
 * control character ends up embedded in this source file.
 */
const ZERO_WIDTH_BIDI_CODEPOINTS = [
  0x200b, 0x200c, 0x200d, 0x200e, 0x200f, // zero-width space/joiners, LTR/RTL marks
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, // bidi embedding/override
  0x2066, 0x2067, 0x2068, 0x2069, // bidi isolates
  0xfeff, // BOM / zero-width no-break space
];
const zeroWidthBidiPattern = new RegExp(
  `[${ZERO_WIDTH_BIDI_CODEPOINTS.map((cp) => String.fromCodePoint(cp)).join('')}]`,
  'g',
);

/**
 * Applied to SKILL.md body + references/*.md. Warn-level by default (--strict
 * promotes to error) since body text legitimately discusses these terms far
 * more often than a one-line description does. Deliberately excludes the
 * horizontal-rule pattern from INJECTION_PATTERNS — a `---` divider is normal
 * Markdown and would false-positive on nearly every reference doc.
 */
export const BODY_INJECTION_PATTERNS: RegExp[] = [
  zeroWidthBidiPattern,
  // HTML comments carrying imperative override language.
  /<!--[\s\S]*?(?:ignore|override|disregard|system)[\s\S]*?-->/gi,
  // Large base64 blobs (>= ~150 bytes decoded).
  /(?:[A-Za-z0-9+/]{4}){50,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g,
  // Fetch-and-execute.
  /(?:curl|wget)\s+[^\n|]*\|\s*(?:sudo\s+)?(?:ba)?sh\b/gi,
  // Reads of identity/secret material paired with an exfil-shaped verb.
  /(?:cat|read|dump|exfiltrate|upload|send)\b[^\n]{0,60}\b(?:SOUL\.md|MEMORY\.md|\.env(?:\.\w+)?|~\/\.ssh)/gi,
];

export type InjectionScanMode = 'description' | 'body';

export interface InjectionFinding {
  mode: InjectionScanMode;
  pattern: string;
}

/** Tests `text` against the pattern set for `mode`, resetting each regex's lastIndex before and after use. */
export function scanContent(
  text: string,
  mode: InjectionScanMode,
): InjectionFinding[] {
  const patterns =
    mode === 'description' ? INJECTION_PATTERNS : BODY_INJECTION_PATTERNS;
  const findings: InjectionFinding[] = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      findings.push({ mode, pattern: pattern.toString() });
    }
    pattern.lastIndex = 0;
  }
  return findings;
}
