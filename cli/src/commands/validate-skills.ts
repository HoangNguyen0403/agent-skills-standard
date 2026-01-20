import { SkillValidator } from '../services/SkillValidator';

export class ValidateCommand {
  async run(options: { all?: boolean } = {}) {
    const validator = new SkillValidator();
    await validator.run(options.all ?? false);
  }
}
