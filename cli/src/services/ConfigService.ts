import {
  Framework,
  SKILL_DETECTION_REGISTRY,
  SUPPORTED_FRAMEWORKS,
  UNIVERSAL_SKILLS,
} from '../constants';
import { SkillConfig, SkillEntry } from '../models/config';
import { RegistryMetadata } from '../models/types';

export class ConfigService {
  buildInitialConfig(
    framework: string,
    agents: string[],
    registry: string,
    metadata: Partial<RegistryMetadata>,
  ): SkillConfig {
    const selectedFramework = SUPPORTED_FRAMEWORKS.find(
      (f) => f.id === framework,
    );
    const neededSkills = new Set<string>();

    UNIVERSAL_SKILLS.forEach((s) => neededSkills.add(s));
    neededSkills.add(framework);

    if (selectedFramework) {
      selectedFramework.languages.forEach((l) => neededSkills.add(l));
    }

    // Special cases
    if (framework === Framework.NextJS || framework === Framework.ReactNative) {
      neededSkills.add(Framework.React);
    }

    const frameworkSkills = SKILL_DETECTION_REGISTRY[framework] || [];
    frameworkSkills.forEach((s) => neededSkills.add(s.id));

    const config: SkillConfig = {
      registry,
      agents,
      skills: {},
      custom_overrides: [],
    };

    const allKnownCategories = this.getAllKnownCategories();

    for (const skill of [...new Set(allKnownCategories)]) {
      if (neededSkills.has(skill)) {
        config.skills[skill] = this.createSkillEntry(skill, metadata);
      }
    }

    return config;
  }

  private getAllKnownCategories(): string[] {
    return [
      ...UNIVERSAL_SKILLS,
      ...SUPPORTED_FRAMEWORKS.map((f) => f.id),
      ...SUPPORTED_FRAMEWORKS.flatMap((f) => f.languages),
      ...Object.values(SKILL_DETECTION_REGISTRY).flatMap((skills) =>
        skills.map((s) => s.id),
      ),
    ];
  }

  private createSkillEntry(
    skill: string,
    metadata: Partial<RegistryMetadata>,
  ): SkillEntry {
    const skillMeta = metadata.categories?.[skill];
    let refStr: string | undefined;

    if (skillMeta?.version && skillMeta?.tag_prefix) {
      refStr = `${skillMeta.tag_prefix}${skillMeta.version}`;
    }

    return {
      ref: refStr,
    };
  }

  applyDependencyExclusions(
    config: SkillConfig,
    framework: string,
    projectDeps: Set<string>,
  ): void {
    const frameworkSkills = SKILL_DETECTION_REGISTRY[framework] || [];

    for (const skill of frameworkSkills) {
      const entry = config.skills[skill.id];
      if (!entry) continue;

      const used = skill.packages.some((p) => projectDeps.has(p));

      if (!used) {
        // Add to parent's exclude list
        const parent = config.skills[framework] || {};
        const excludes = parent.exclude ? [...parent.exclude] : [];
        if (!excludes.includes(skill.id)) excludes.push(skill.id);
        parent.exclude = excludes;
        config.skills[framework] = parent;

        // Remove the unused sub-skill from top-level skills
        delete config.skills[skill.id];
      }
    }
  }
}
