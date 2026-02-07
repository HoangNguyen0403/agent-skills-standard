import { SKILL_DETECTION_REGISTRY } from '../constants';
import { RegistryService } from './RegistryService';

/**
 * Represents a skill with its detection status in the current project.
 */
export interface SkillWithStatus {
  /** The name/ID of the skill */
  name: string;
  /**
   * Status of the skill:
   * - detected: Required dependencies found
   * - not-detected: Required dependencies missing
   * - no-rule: No automated detection rule exists for this skill
   */
  status: 'detected' | 'not-detected' | 'no-rule';
}

/**
 * Service for managing skill status and availability.
 * Maps registry skills to project dependencies to determine detection status.
 */
export class SkillService {
  private registryService = new RegistryService();

  /**
   * Retrieves a list of skills for a framework with their detection status.
   * @param framework The framework to filter by
   * @param registryUrl The registry URL
   * @param projectDeps Set of detected project dependencies
   * @returns Array of skills with validated status
   */
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
