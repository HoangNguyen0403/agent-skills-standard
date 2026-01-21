import { Framework } from './enums';

/**
 * SkillDetection defines how to automatically enable a skill based on project dependencies.
 */
export interface SkillDetection {
  /** The skill ID as defined in the registry (e.g., 'riverpod-state-management') */
  id: string;
  /** List of npm or pub packages that indicate this skill is used */
  packages: string[];
}

/**
 * Registry of automatic skill detection rules grouped by framework.
 */
export const SKILL_DETECTION_REGISTRY: Record<string, SkillDetection[]> = {
  [Framework.Flutter]: [
    {
      id: 'riverpod-state-management',
      packages: ['flutter_riverpod', 'riverpod'],
    },
    {
      id: 'bloc-state-management',
      packages: ['flutter_bloc', 'bloc'],
    },
    {
      id: 'auto-route-navigation',
      packages: ['auto_route'],
    },
    {
      id: 'go-router-navigation',
      packages: ['go_router'],
    },
    {
      id: 'getx-navigation',
      packages: ['get'],
    },
    {
      id: 'getx-state-management',
      packages: ['get'],
    },
    {
      id: 'localization',
      packages: ['easy_localization'],
    },
    {
      id: 'retrofit-networking',
      packages: ['retrofit'],
    },
  ],
  [Framework.NestJS]: [
    {
      id: 'caching',
      packages: ['@nestjs/cache-manager', 'cache-manager'],
    },
    {
      id: 'database',
      packages: ['@nestjs/typeorm', '@nestjs/prisma', '@nestjs/mongoose'],
    },
    {
      id: 'security',
      packages: ['@nestjs/passport', 'passport', 'helmet'],
    },
  ],
};
