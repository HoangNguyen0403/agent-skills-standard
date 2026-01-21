import { SkillValidator } from '../services/SkillValidator';

export class ValidateCommand {
  async run(options: { all?: boolean } = {}) {
    const validator = new SkillValidator();
    const exitCode = await validator.run(options.all ?? false);
    process.exit(exitCode);
  }
}
