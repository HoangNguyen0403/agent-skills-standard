import { SKILL_DETECTION_REGISTRY } from '../constants';
import { RegistryService } from './RegistryService';

export interface SkillWithStatus {
  name: string;
  status: 'detected' | 'not-detected' | 'no-rule';
}

export class SkillService {
  private registryService = new RegistryService();

  async getSkillsWithStatus(
    framework: string,
    registryUrl: string,
    projectDeps: Set<string>,
  ): Promise<SkillWithStatus[]> {
    // 1. Get available skills (Remote + Fallback)
    let skillFolders = await this.registryService.getFrameworkSkills(
      registryUrl,
      framework,
    );

    const detectRules = SKILL_DETECTION_REGISTRY[framework] || [];

    // Fallback: use detection registry skill ids if remote fetch returned nothing
    if (!skillFolders || skillFolders.length === 0) {
      skillFolders = detectRules.map((s) => s.id);
    }

    // 2. Map to Status
    const skills = skillFolders.sort().map((skillName) => {
      const rule = detectRules.find((x) => x.id === skillName);

      let status: SkillWithStatus['status'] = 'no-rule';
      if (rule) {
        const isPresent = rule.packages.some((p) =>
          Array.from(projectDeps).some((d) =>
            d.toLowerCase().includes(p.toLowerCase()),
          ),
        );
        status = isPresent ? 'detected' : 'not-detected';
      }

      return { name: skillName, status };
    });

    return skills;
  }
}
