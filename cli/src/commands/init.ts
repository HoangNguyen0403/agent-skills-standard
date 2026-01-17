import fs from 'fs-extra';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import path from 'path';
import pc from 'picocolors';
import { SUPPORTED_AGENTS, SUPPORTED_FRAMEWORKS } from '../constants';
import { SkillConfig } from '../models/config';
import {
  GitHubTreeItem,
  GitHubTreeResponse,
  RegistryMetadata,
} from '../models/types';

export class InitCommand {
  async run() {
    const configPath = path.join(process.cwd(), '.skillsrc');

    // Project detection
    const detectionResults: Record<string, boolean> = {};
    for (const framework of SUPPORTED_FRAMEWORKS) {
      let detected = false;
      for (const file of framework.detectionFiles) {
        if (await fs.pathExists(file)) {
          detected = true;
          break;
        }
      }
      detectionResults[framework.id] = detected;
    }

    // Agent detection
    const agentDetection: Record<string, boolean> = {};
    for (const agent of SUPPORTED_AGENTS) {
      let detected = false;
      for (const file of agent.detectionFiles) {
        if (await fs.pathExists(file)) {
          detected = true;
          break;
        }
      }
      agentDetection[agent.id] = detected;
    }

    const anyAgentDetected = Object.values(agentDetection).some((d) => d);

    // Helper to determine if an agent should be pre-selected
    const shouldCheck = (id: string) =>
      anyAgentDetected ? agentDetection[id] : true;

    // Supported categories are now determined by the registry contents if possible
    // Default to a sane list if registry is unreachable
    let supportedCategories = ['flutter', 'dart'];
    let metadata: Partial<RegistryMetadata> = {};

    const treeUrl =
      'https://api.github.com/repos/HoangNguyen0403/agent-skills-standard/git/trees/main?recursive=1';
    const metadataUrl =
      'https://raw.githubusercontent.com/HoangNguyen0403/agent-skills-standard/main/skills/metadata.json';

    try {
      const [treeRes, metadataRes] = await Promise.all([
        fetch(treeUrl, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        }),
        fetch(metadataUrl),
      ]);

      if (metadataRes.ok) {
        metadata = (await metadataRes.json()) as RegistryMetadata;
      }

      if (treeRes.ok) {
        const treeData = (await treeRes.json()) as GitHubTreeResponse;
        const allFiles = treeData.tree || [];
        // Extract top-level folders in skills/
        const categories = new Set<string>();
        allFiles.forEach((f: GitHubTreeItem) => {
          if (f.path.startsWith('skills/') && f.type === 'tree') {
            const parts = f.path.split('/');
            if (parts.length === 2) {
              categories.add(parts[1]);
            }
          }
        });
        if (categories.size > 0) {
          supportedCategories = Array.from(categories);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        pc.red(`❌ Failed to fetch registry metadata or tree: ${msg}`),
      );
    }

    const choices = SUPPORTED_FRAMEWORKS.map((f) => {
      const isSupported = supportedCategories.includes(f.id);
      return {
        name: isSupported ? f.name : `${f.name} (Coming Soon)`,
        value: f.id,
      };
    });

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

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'framework',
        message: 'Select Framework:',
        choices: choices,
        default:
          SUPPORTED_FRAMEWORKS.find((f) => detectionResults[f.id])?.id ||
          'flutter',
      },
      {
        type: 'checkbox',
        name: 'agents',
        message: 'Select AI Agents you use:',
        choices: SUPPORTED_AGENTS.map((a) => ({
          name: `${a.name} (${a.path}/)`,
          value: a.id,
          checked: shouldCheck(a.id),
        })),
      },
      {
        type: 'input',
        name: 'registry',
        message: 'Skills Registry URL:',
        default: 'https://github.com/HoangNguyen0403/agent-skills-standard',
      },
    ]);

    const frameworkId = answers.framework as string;
    const selectedFramework = SUPPORTED_FRAMEWORKS.find(
      (f) => f.id === frameworkId,
    );
    const isSupported = supportedCategories.includes(frameworkId);

    if (!isSupported) {
      console.log(
        pc.yellow(
          `\nNotice: Skills for ${frameworkId} are not yet strictly defined and will be added soon.`,
        ),
      );
      console.log(
        pc.gray(
          'The CLI will still generate rule files with global standards.\n',
        ),
      );
    }

    const neededSkills = new Set<string>();
    neededSkills.add(frameworkId);
    if (selectedFramework) {
      selectedFramework.languages.forEach((l) => neededSkills.add(l));
    }

    const config: SkillConfig = {
      registry: answers.registry,
      agents: answers.agents,
      skills: {},
      custom_overrides: [],
    };

    // Initialize all potential skills from the registry folders we know
    // This will be expanded as more frameworks are added to the repo
    const allKnownCategories = [
      ...SUPPORTED_FRAMEWORKS.map((f) => f.id),
      ...SUPPORTED_FRAMEWORKS.flatMap((f) => f.languages),
    ];

    for (const skill of [...new Set(allKnownCategories)]) {
      if (neededSkills.has(skill)) {
        const skillMeta = metadata.categories?.[skill];
        let refStr: string | undefined;

        if (skillMeta?.version && skillMeta?.tag_prefix) {
          refStr = `${skillMeta.tag_prefix}${skillMeta.version}`;
        }

        config.skills[skill] = {
          enabled: true,
          ref: refStr,
        };
      }
    }

    await fs.writeFile(configPath, yaml.dump(config));
    console.log(pc.green('\n✅ Initialized .skillsrc with your preferences!'));
    console.log(pc.gray(`   Selected framework: ${frameworkId}`));
    console.log(
      pc.gray(
        `   Auto-enabled languages: ${
          Array.from(neededSkills)
            .filter((s) => s !== frameworkId)
            .join(', ') || 'none'
        }`,
      ),
    );
    console.log(
      pc.cyan('\nNext step: Run `agent-skills sync` to generate rule files.'),
    );
  }
}
