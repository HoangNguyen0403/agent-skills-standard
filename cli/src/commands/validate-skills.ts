import { SkillValidator } from '../services/SkillValidator';

/**
 * Command for validating the integrity and format of skills in the local directory.
 * Useful for development and CI/CD pipelines to ensure skills follow the standard.
 */
export class ValidateCommand {
  /**
   * Executes the validation flow.
   * @param options Command options, including `all` to validate all skills instead of only changed ones.
   */
  async run(options: { all?: boolean } = {}) {
    const validator = new SkillValidator();
    const exitCode = await validator.run(options.all ?? false);
    process.exit(exitCode);
  }
}
