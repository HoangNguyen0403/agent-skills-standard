import inquirer from 'inquirer';
import pc from 'picocolors';
import { Framework, SUPPORTED_FRAMEWORKS } from '../constants';
import { ConfigService } from '../services/ConfigService';
import { DetectionService } from '../services/DetectionService';
import { SkillService } from '../services/SkillService';

export class ListSkillsCommand {
  private configService: ConfigService;
  private detectionService: DetectionService;
  private skillService: SkillService;

  constructor(
    configService?: ConfigService,
    detectionService?: DetectionService,
    skillService?: SkillService,
  ) {
    this.configService = configService || new ConfigService();
    this.detectionService = detectionService || new DetectionService();
    this.skillService = skillService || new SkillService();
  }

  async run() {
    // 1. Get framework choice from user
    const choices = SUPPORTED_FRAMEWORKS.map((f) => ({
      name: f.name,
      value: f.id,
    }));

    const { framework } = await inquirer.prompt([
      {
        type: 'list',
        name: 'framework',
        message: 'Select framework to list available skills for:',
        choices,
        default: choices.find((c) => c.value === Framework.Flutter)?.value,
      },
    ]);

    // 2. Load context
    const projectDeps = await this.detectionService.getProjectDeps();
    const registryUrl = await this.configService.getRegistryUrl();

    console.log(pc.green(`\nAvailable skills for ${framework}:`));

    // 3. Fetch skills with status
    const skills = await this.skillService.getSkillsWithStatus(
      framework,
      registryUrl,
      projectDeps,
    );

    // 4. Output results
    for (const skill of skills) {
      const mark =
        skill.status === 'no-rule'
          ? pc.yellow('no-rule')
          : skill.status === 'detected'
            ? pc.green('detected')
            : pc.gray('not-detected');

      console.log(`- ${skill.name} (${mark})`);
    }

    console.log(
      '\nTip: Use the .skillsrc exclude array to disable/enable sub-skills before running sync.',
    );
  }
}
