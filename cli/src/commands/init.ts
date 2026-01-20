import fs from 'fs-extra';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import path from 'path';
import pc from 'picocolors';
import {
  Framework,
  SKILL_DETECTION_REGISTRY,
  SUPPORTED_AGENTS,
  SUPPORTED_FRAMEWORKS,
} from '../constants';
import { SkillConfig } from '../models/config';
import { GitHubTreeItem, RegistryMetadata } from '../models/types';
import { fetchRepoTree, parseRegistryUrl } from '../utils/github';
import { buildProjectDeps } from '../utils/project';

export class InitCommand {
  async run() {
    const configPath = path.join(process.cwd(), '.skillsrc');

    // Load package.json for dependency checks (for framework detection)
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let packageDeps: Record<string, string> = {};
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const pkg = await fs.readJson(packageJsonPath);
        packageDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      } catch (e) {
        console.error(
          pc.red(
            `❌ Failed to read package.json: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
      }
    }

    // Project detection
    const detectionResults: Record<string, boolean> = {};
    for (const framework of SUPPORTED_FRAMEWORKS) {
      let detected = false;

      // 1. Check characteristic files
      for (const file of framework.detectionFiles) {
        if (await fs.pathExists(file)) {
          detected = true;
          break;
        }
      }

      // 2. Check dependencies (if not yet detected)
      if (
        !detected &&
        framework.detectionDependencies &&
        framework.detectionDependencies.length > 0
      ) {
        detected = framework.detectionDependencies.some((dep) =>
          Object.prototype.hasOwnProperty.call(packageDeps, dep),
        );
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

    // Attempt to discover available categories and registry metadata from the canonical registry
    try {
      const defaultRegistry =
        'https://github.com/HoangNguyen0403/agent-skills-standard';
      const parsed = parseRegistryUrl(defaultRegistry);
      if (parsed) {
        const treeResult = await fetchRepoTree(parsed.owner, parsed.repo);
        if (treeResult && Array.isArray(treeResult.data.tree)) {
          const allFiles = treeResult.data.tree || [];
          const categories = new Set<string>();
          allFiles.forEach((f: GitHubTreeItem) => {
            if (f.path.startsWith('skills/') && f.type === 'tree') {
              const parts = f.path.split('/');
              if (parts.length === 2) categories.add(parts[1]);
            }
          });
          if (categories.size > 0) supportedCategories = Array.from(categories);

          // Try to fetch metadata.json at the resolved branch
          const metaUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${treeResult.branch}/skills/metadata.json`;
          const metaRes = await fetch(metaUrl);
          if (metaRes.ok) {
            metadata = (await metaRes.json()) as RegistryMetadata;
          }
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

    const framework = answers.framework as string;
    const selectedFramework = SUPPORTED_FRAMEWORKS.find(
      (f) => f.id === framework,
    );
    const isSupported = supportedCategories.includes(framework);

    if (!isSupported) {
      console.log(
        pc.yellow(
          `\nNotice: Skills for ${framework} are not yet strictly defined and will be added soon.`,
        ),
      );
      console.log(
        pc.gray(
          'The CLI will still generate rule files with global standards.\n',
        ),
      );
    }

    const neededSkills = new Set<string>();
    neededSkills.add('common'); // Universal best practices
    neededSkills.add(framework);
    if (selectedFramework) {
      selectedFramework.languages.forEach((l) => neededSkills.add(l));
    }

    // Special case: Next.js and React Native imply React
    if (framework === Framework.NextJS || framework === Framework.ReactNative) {
      neededSkills.add(Framework.React);
    }

    // Add framework-specific skills from the registry to potential skills
    const frameworkSkills = SKILL_DETECTION_REGISTRY[framework] || [];
    frameworkSkills.forEach((s) => neededSkills.add(s.id));

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
      ...Object.values(SKILL_DETECTION_REGISTRY).flatMap((skills) =>
        skills.map((s) => s.id),
      ),
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

    // Detect common framework skills and disable them if not used
    const projectDeps = await buildProjectDeps();

    for (const skill of frameworkSkills) {
      const entry = config.skills[skill.id];
      if (!entry) continue;

      // Only rely on declared dependencies for detection.
      const used = skill.packages.some((p) => projectDeps.has(p));

      // If not used, add to parent framework's exclude list so users
      // see which sub-skills were disabled by detection and can opt-in.
      if (!used) {
        const parent = config.skills[framework] || { enabled: true };
        const excludes = parent.exclude ? [...parent.exclude] : [];
        if (!excludes.includes(skill.id)) excludes.push(skill.id);
        parent.exclude = excludes;
        config.skills[framework] = parent;
      }
    }

    const commentHeader = `# Auto-detected configuration generated by agent-skills-standard init
#
# 'exclude': IDs of sub-skills to skip during sync (auto-populated with undetected skills).
# 'custom_overrides': IDs of skills to PROTECT. Use this if you have modified a standard 
# skill locally and don't want the CLI to overwrite it.
#
# Run 'ags list-skills' to view all available skills.
`;
    await fs.writeFile(configPath, commentHeader + yaml.dump(config));
    console.log(pc.green('\n✅ Initialized .skillsrc with your preferences!'));
    console.log(pc.gray(`   Selected framework: ${framework}`));
    console.log(
      pc.gray(
        `   Auto-enabled languages: ${
          Array.from(neededSkills)
            .filter((s) => s !== framework)
            .join(', ') || 'none'
        }`,
      ),
    );
    console.log(
      pc.cyan(
        '\nNext step: Run `agent-skills-standard sync` to generate rule files.',
      ),
    );
  }

  // project dependency discovery is handled by `cli/src/utils/project.buildProjectDeps`
}
