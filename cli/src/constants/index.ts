import { Agent, Framework } from './enums';

export { Agent, Framework };

export const UNIVERSAL_SKILLS = ['common'];
export const BACKEND_FRAMEWORKS: Framework[] = [
  Framework.NestJS,
  Framework.Golang,
  Framework.SpringBoot,
  Framework.Laravel,
  Framework.Python,
];

export const FRONTEND_FRAMEWORKS: Framework[] = [
  Framework.React,
  Framework.NextJS,
  Framework.Angular,
];

export const MOBILE_FRAMEWORKS: Framework[] = [
  Framework.Flutter,
  Framework.Android,
  Framework.iOS,
  Framework.ReactNative,
];

export const FRONTEND_REACT_FRAMEWORKS: Framework[] = [
  Framework.NextJS,
  Framework.ReactNative,
];

/**
 * Sub-skills to exclude from the `common` category based on the selected framework type.
 * Backend: exclude web-only and mobile-only skills.
 * Frontend: exclude backend-only and mobile-only skills.
 * Mobile: exclude web-only and backend-only skills.
 */
export const COMMON_SKILL_EXCLUDES: Record<
  'backend' | 'frontend' | 'mobile',
  string[]
> = {
  backend: [
    'common-accessibility',
    'common-mobile-animation',
    'common-mobile-ux-core',
    'common-store-changelog',
    'common-ui-design',
  ],
  frontend: [
    'common-observability',
    'common-mobile-animation',
    'common-mobile-ux-core',
    'common-store-changelog',
  ],
  mobile: ['common-accessibility', 'common-api-design', 'common-observability'],
};

/**
 * Classifies a framework ID into its platform type for skill exclusion purposes.
 * Returns null for unknown/hybrid frameworks — no exclusions are applied.
 */
export function getFrameworkType(
  framework: string,
): 'backend' | 'frontend' | 'mobile' | null {
  if (BACKEND_FRAMEWORKS.includes(framework as Framework)) return 'backend';
  if (MOBILE_FRAMEWORKS.includes(framework as Framework)) return 'mobile';
  if (FRONTEND_FRAMEWORKS.includes(framework as Framework)) return 'frontend';
  return null;
}

export const DEFAULT_REGISTER =
  'https://github.com/HoangNguyen0403/agent-skills-standard';

export const DEFAULT_WORKFLOWS = [
  'sdlc',
  'brainstorm-feature',
  'code-review',
  'codebase-review',
  'system-design-session',
  'review-system-design',
  'design-solution',
  'deploy-release',
  'plan-feature',
  'implementation-readiness',
  'review-ticket',
  'traceability-audit',
  'session-report',
  'publish-notes',
  'retro-learn',
  'skill-benchmark',
  'pentest',
  'dev-fix',
  'implement-feature',
  'verify-work',
  'verify-bug',
  'test-loop',
  'security-test',
  'uat-signoff',
  'incident-hotfix',
  'monitor-respond',
];

/**
 * Workflows that must never be synced to a consumer project, regardless of
 * `.skillsrc` (even `workflows: true`). These depend on agent-skills-standard's
 * own repo-root tooling (e.g. `scripts/evals/*` and its `pnpm evals:*` scripts,
 * `benchmarks/evals/`) which is never distributed to consumers — the workflow
 * would be broken/non-functional outside this monorepo.
 */
export const INTERNAL_ONLY_WORKFLOWS = ['evals-run'];

export type {
  AgentDefinition,
  WorkflowFormat,
  SpecialistFormat,
  HookKind,
  McpSpec,
} from '../capabilities/agentCapabilities';
import { AGENT_CAPABILITIES } from '../capabilities/agentCapabilities';
import type { AgentDefinition } from '../capabilities/agentCapabilities';
export { AGENT_CAPABILITIES };

export interface FrameworkDefinition {
  id: Framework;
  name: string;
  languages: string[];
  detectionFiles: string[];
  detectionDependencies?: string[];
  languageDetection?: Record<string, string[]>;
}

export const getAgentDefinition = (id: Agent): AgentDefinition =>
  AGENT_CAPABILITIES[id];

export const getFrameworkDefinition = (id: Framework): FrameworkDefinition => {
  switch (id) {
    case Framework.Flutter:
      return {
        id,
        name: 'Flutter',
        languages: ['dart'],
        detectionFiles: ['pubspec.yaml'],
      };
    case Framework.NestJS:
      return {
        id,
        name: 'NestJS',
        languages: ['typescript', 'javascript'],
        detectionFiles: ['nest-cli.json'],
        detectionDependencies: ['@nestjs/core'],
        languageDetection: {
          typescript: ['tsconfig.json'],
          javascript: ['jsconfig.json'],
        },
      };
    case Framework.Golang:
      return {
        id,
        name: 'Go (Golang)',
        languages: ['go'],
        detectionFiles: ['go.mod'],
      };
    case Framework.NextJS:
      return {
        id,
        name: 'Next.js',
        languages: ['typescript', 'javascript'],
        detectionFiles: ['next.config.js', 'next.config.mjs'],
        detectionDependencies: ['next'],
        languageDetection: {
          typescript: ['tsconfig.json'],
          javascript: ['jsconfig.json'],
        },
      };
    case Framework.React:
      return {
        id,
        name: 'React',
        languages: ['typescript', 'javascript'],
        detectionFiles: [],
        detectionDependencies: ['react', 'react-dom'],
        languageDetection: {
          typescript: ['tsconfig.json'],
          javascript: ['jsconfig.json'],
        },
      };
    case Framework.ReactNative:
      return {
        id,
        name: 'React Native',
        languages: ['typescript', 'javascript'],
        detectionFiles: ['metro.config.js'],
        detectionDependencies: ['react-native'],
        languageDetection: {
          typescript: ['tsconfig.json'],
          javascript: ['jsconfig.json'],
        },
      };
    case Framework.Angular:
      return {
        id,
        name: 'Angular',
        languages: ['typescript'],
        detectionFiles: ['angular.json'],
      };
    case Framework.SpringBoot:
      return {
        id,
        name: 'Spring Boot',
        languages: ['java', 'kotlin'],
        detectionFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
        languageDetection: {
          kotlin: ['src/main/kotlin', 'build.gradle.kts'],
          java: ['src/main/java'],
        },
      };
    case Framework.Android:
      return {
        id,
        name: 'Android',
        languages: ['kotlin', 'java'],
        detectionFiles: [
          'build.gradle',
          'build.gradle.kts',
          'AndroidManifest.xml',
        ],
        languageDetection: {
          kotlin: ['src/main/kotlin', 'build.gradle.kts'],
          java: ['src/main/java'],
        },
      };
    case Framework.iOS:
      return {
        id,
        name: 'iOS (Swift/SwiftUI)',
        languages: ['swift'],
        detectionFiles: [
          'Podfile',
          'Package.swift',
          'project.pbxproj',
          'Info.plist',
        ],
        languageDetection: {
          swift: ['.swift'],
        },
      };
    case Framework.Laravel:
      return {
        id,
        name: 'Laravel',
        languages: ['php', 'javascript'],
        detectionFiles: ['composer.json', 'artisan'],
        detectionDependencies: ['laravel/framework'],
        languageDetection: {
          php: ['.php'],
          javascript: ['resources/js', 'vite.config.js'],
        },
      };
    case Framework.Python:
      return {
        id,
        name: 'Python',
        languages: ['python'],
        detectionFiles: [
          'pyproject.toml',
          'requirements.txt',
          'setup.py',
          'setup.cfg',
          'Pipfile',
          'poetry.lock',
          'uv.lock',
        ],
      };
  }
};

export const SUPPORTED_AGENTS: AgentDefinition[] =
  Object.values(Agent).map(getAgentDefinition);

export const SUPPORTED_FRAMEWORKS: FrameworkDefinition[] = Object.values(
  Framework,
).map(getFrameworkDefinition);

export { SKILL_DETECTION_REGISTRY } from './skills';
export type { SkillDetection } from './skills';
