/**
 * Context documents checked for regex assertion alignment.
 */
export interface RegexAlignmentSources {
  strippedContent?: string;
  prompt?: string;
  expectedOutput?: string;
}

/**
 * Evaluates whether a compiled RegExp matches any of the independent source documents:
 * stripped skill content, actual prompt, or actual expected output.
 *
 * Each document is tested independently without artificial concatenation, preserving
 * document boundaries for anchored patterns and line counts.
 *
 * Actual documents are tested if present (typeof string), preserving empty string documents.
 */
export function checkRegexAlignment(
  re: RegExp,
  sources: RegexAlignmentSources,
): boolean {
  if (
    typeof sources.strippedContent === "string" &&
    re.test(sources.strippedContent)
  ) {
    return true;
  }
  if (typeof sources.prompt === "string" && re.test(sources.prompt)) {
    return true;
  }
  if (
    typeof sources.expectedOutput === "string" &&
    re.test(sources.expectedOutput)
  ) {
    return true;
  }
  return false;
}
