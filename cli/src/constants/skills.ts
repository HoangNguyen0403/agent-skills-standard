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
      packages: ['get'], // Special handling for exact match required
    },
    {
      id: 'getx-state-management',
      packages: ['get'], // Special handling for exact match required
    },
    {
      id: 'localization',
      packages: ['easy_localization'],
    },
    {
      id: 'retrofit-networking',
      packages: ['retrofit'],
    },
    {
      id: 'navigator-v1-navigation',
      packages: ['flutter'], // Always enabled for Flutter
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
  [Framework.Android]: [
    {
      id: 'compose',
      packages: ['androidx.compose.ui'],
    },
    {
      id: 'navigation',
      packages: ['androidx.navigation:navigation-compose'],
    },
    {
      id: 'legacy-navigation',
      packages: [
        'androidx.navigation:navigation-fragment',
        'androidx.navigation:navigation-ui',
      ],
    },
    {
      id: 'di',
      packages: ['hilt-android', 'dagger-android'],
    },
    {
      id: 'persistence',
      packages: ['androidx.room:room-runtime'],
    },
    {
      id: 'networking',
      packages: ['retrofit'],
    },
    {
      id: 'concurrency',
      packages: ['kotlinx-coroutines-android'],
    },
  ],
  [Framework.iOS]: [
    {
      id: 'networking',
      packages: ['Alamofire', 'Moya'],
    },
    {
      id: 'dependency-injection',
      packages: ['Swinject', 'Resolver'],
    },
    {
      id: 'persistence',
      packages: ['Realm', 'CoreData', 'SQLite.swift'],
    },
    {
      id: 'state-management',
      packages: ['ComposableArchitecture', 'CombineRuntime'],
    },
    {
      id: 'ui-navigation',
      packages: ['Coordinator', 'Router'],
    },
  ],
  [Framework.ReactNative]: [
    {
      id: 'navigation',
      packages: ['@react-navigation/native'],
    },
    {
      id: 'state-management',
      packages: ['zustand', '@reduxjs/toolkit'],
    },
    {
      id: 'deployment',
      packages: ['react-native-code-push', 'expo-updates'],
    },
    {
      id: 'security',
      packages: ['react-native-keychain', 'react-native-ssl-pinning'],
    },
    {
      id: 'performance',
      packages: ['react-native-fast-image'],
    },
  ],
  [Framework.Laravel]: [
    {
      id: 'api',
      packages: ['laravel/sanctum', 'laravel/passport'],
    },
    {
      id: 'background-processing',
      packages: ['laravel/horizon'],
    },
    {
      id: 'testing',
      packages: ['pestphp/pest', 'phpunit/phpunit'],
    },
    {
      id: 'tooling',
      packages: ['laravel/pint', 'laravel/sail'],
    },
  ],
};
