/**
 * Result of a single validation rule check.
 */
export interface RuleResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interface for a validation rule that can be applied to a skill file.
 */
export interface ValidationRule {
  /** The name of the rule for reporting purposes */
  name: string;
  /**
   * Validates the content of a skill file.
   * @param content The full text content of the skill file
   * @param filePath The absolute path to the skill file
   */
  validate(content: string, filePath: string): Promise<RuleResult>;
}
