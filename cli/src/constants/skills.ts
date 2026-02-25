import { Framework } from './enums';

/**
 * SkillDetection defines how to automatically enable a skill based on project dependencies.
 */
export interface SkillDetection {
  /** The skill ID as defined in the registry (e.g., 'riverpod-state-management') */
  id: string;
  /** List of npm or pub packages that indicate this skill is used */
  packages: string[];
  /** Optional list of root folder/file paths (relative to cwd). If any exist, the skill is detected. */
  files?: string[];
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
      id: 'dependency-injection',
      packages: ['get_it', 'injectable'],
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
      files: ['android', 'build.gradle', 'build.gradle.kts'],
    },
    {
      id: 'navigation',
      packages: ['androidx.navigation:navigation-compose'],
      files: ['android', 'build.gradle', 'build.gradle.kts'],
    },
    {
      id: 'legacy-navigation',
      packages: [
        'androidx.navigation:navigation-fragment',
        'androidx.navigation:navigation-ui',
      ],
      files: ['android', 'build.gradle', 'build.gradle.kts'],
    },
    {
      id: 'di',
      packages: ['hilt-android', 'dagger-android'],
      files: ['android', 'build.gradle', 'build.gradle.kts'],
    },
    {
      id: 'persistence',
      packages: ['androidx.room:room-runtime'],
      files: ['android', 'build.gradle', 'build.gradle.kts'],
    },
    {
      id: 'networking',
      packages: ['retrofit'],
      files: ['android', 'build.gradle', 'build.gradle.kts'],
    },
    {
      id: 'concurrency',
      packages: ['kotlinx-coroutines-android'],
      files: ['android', 'build.gradle', 'build.gradle.kts'],
    },
  ],
  [Framework.iOS]: [
    {
      id: 'networking',
      packages: ['Alamofire', 'Moya'],
      files: ['ios', 'Podfile', 'Package.swift'],
    },
    {
      id: 'dependency-injection',
      packages: ['Swinject', 'Resolver'],
      files: ['ios', 'Podfile', 'Package.swift'],
    },
    {
      id: 'persistence',
      packages: ['Realm', 'CoreData', 'SQLite.swift'],
      files: ['ios', 'Podfile', 'Package.swift'],
    },
    {
      id: 'state-management',
      packages: ['ComposableArchitecture', 'CombineRuntime'],
      files: ['ios', 'Podfile', 'Package.swift'],
    },
    {
      id: 'ui-navigation',
      packages: ['Coordinator', 'Router'],
      files: ['ios', 'Podfile', 'Package.swift'],
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
    {
      id: 'database-expert',
      packages: ['laravel/framework'], // Always present, but used for sub-skill mapping
    },
  ],
  [Framework.NextJS]: [
    {
      id: 'pages-router',
      packages: [],
      files: ['pages', 'src/pages'],
    },
    {
      id: 'server-components',
      packages: [],
      files: ['app', 'src/app'],
    },
    {
      id: 'server-actions',
      packages: [],
      files: ['app', 'src/app'],
    },
    {
      id: 'data-fetching',
      packages: [],
      files: ['app', 'src/app'],
    },
    {
      id: 'i18n',
      packages: ['next-intl', 'react-intl', 'next-translate', 'i18next'],
      files: [
        'middleware.ts',
        'app/[lang]',
        'pages/[locale]',
        'next.config.js',
      ],
    },
  ],
  [Framework.React]: [
    {
      id: 'styling',
      packages: ['tailwind', 'antd', 'sass', 'styled-components', 'emotion'],
    },
    {
      id: 'state-management',
      packages: [
        'redux',
        '@reduxjs/toolkit',
        'zustand',
        'mobx',
        'recoil',
        'jotai',
      ],
    },
    {
      id: 'testing',
      packages: [
        'jest',
        'vitest',
        '@testing-library/react',
        'cypress',
        'playwright',
      ],
    },
  ],
  database: [
    {
      id: 'postgresql',
      packages: ['pg', 'pgx', 'postgres', 'sequelize', 'typeorm', 'prisma'],
    },
    {
      id: 'mongodb',
      packages: ['mongodb', 'mongoose'],
    },
    {
      id: 'redis',
      packages: ['redis', 'ioredis', 'predis'],
    },
  ],
};
