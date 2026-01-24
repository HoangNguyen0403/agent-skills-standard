import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import { DEFAULT_REGISTER } from '../constants';
import { InitAnswers, InitService } from '../services/InitService';
import { RegistryService } from '../services/RegistryService';

export class InitCommand {
  private initService: InitService;
  private registryService: RegistryService;

  constructor(initService?: InitService, registryService?: RegistryService) {
    this.initService = initService || new InitService();
    this.registryService = registryService || new RegistryService();
  }

  async run() {
    const configPath = path.join(process.cwd(), '.skillsrc');

    // 1. Check for existing config
    if (await fs.pathExists(configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '.skillsrc already exists. Do you want to overwrite it?',
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(pc.yellow('Aborted.'));
        return;
      }
    }

    // 2. Gather context data
    const context = await this.initService.getInitializationContext();
    const { categories, metadata } =
      await this.registryService.discoverRegistry(DEFAULT_REGISTER);

    // 3. Prepare Choices
    const { frameworkChoices, agentChoices, defaultFramework } =
      this.initService.getPromptChoices(context, categories);

    // 4. Prompt User
    const answers = await inquirer.prompt<InitAnswers>([
      {
        type: 'list',
        name: 'framework',
        message: 'Select Framework:',
        choices: frameworkChoices,
        default: defaultFramework,
      },
      {
        type: 'checkbox',
        name: 'agents',
        message: 'Select AI Agents you use:',
        choices: agentChoices,
      },
      {
        type: 'input',
        name: 'registry',
        message: 'Skills Registry URL:',
        default: DEFAULT_REGISTER,
      },
    ]);

    // 5. Build and Save
    await this.initService.buildAndSaveConfig(answers, metadata);

    console.log(pc.green('\n✅ Initialized .skillsrc with your preferences!'));
    console.log(pc.gray(`   Selected framework: ${answers.framework}`));
    console.log(
      pc.cyan(
        '\nNext step: Run `agent-skills-standard sync` to generate rule files.',
      ),
    );
  }
}
