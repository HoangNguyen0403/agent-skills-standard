import { Agent, Framework } from './enums';

export { Agent, Framework };

export const UNIVERSAL_SKILLS = ['common'];
export const BACKEND_FRAMEWORKS: Framework[] = [
  Framework.NestJS,
  Framework.Golang,
  Framework.SpringBoot,
  Framework.Laravel,
];

export const DEFAULT_REGISTER =
  'https://github.com/HoangNguyen0403/agent-skills-standard';

export const DEFAULT_WORKFLOWS = [
  'code-review',
  'codebase-review',
  'plan-feature',
];

// Configurable via ENV or hardcoded for production convenience
export interface AgentDefinition {
  id: Agent;
  name: string;
  path: string;
  ruleFile: string;
  ruleExtension: string;
  ruleFileName?: string;
  frontmatterStyle: 'cursor' | 'copilot' | 'none';
  detectionFiles: string[];
}

export interface FrameworkDefinition {
  id: Framework;
  name: string;
  languages: string[];
  detectionFiles: string[];
  detectionDependencies?: string[];
  languageDetection?: Record<string, string[]>;
}

export const getAgentDefinition = (id: Agent): AgentDefinition => {
  switch (id) {
    case Agent.Cursor:
      return {
        id,
        name: 'Cursor',
        path: '.cursor/skills',
        ruleFile: '.cursor/rules',
        ruleExtension: '.mdc',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.cursor', '.cursorrules'],
      };
    case Agent.Trae:
      return {
        id,
        name: 'Trae',
        path: '.trae/skills',
        ruleFile: '.trae/rules',
        ruleExtension: '.mdc',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.trae'],
      };
    case Agent.Claude:
      return {
        id,
        name: 'Claude Code',
        path: '.claude/skills',
        ruleFile: '.', // Root directory for CLAUDE.md
        ruleExtension: '.md',
        ruleFileName: 'CLAUDE.md',
        frontmatterStyle: 'none',
        detectionFiles: ['.claude', 'CLAUDE.md'],
      };
    case Agent.Copilot:
      return {
        id,
        name: 'GitHub Copilot',
        path: '.github/skills',
        ruleFile: '.github/instructions',
        ruleExtension: '.instructions.md',
        frontmatterStyle: 'copilot',
        detectionFiles: ['.github'],
      };
    case Agent.Antigravity:
      return {
        id,
        name: 'Antigravity',
        path: '.agent/skills',
        ruleFile: '.agent/rules',
        ruleExtension: '.md',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.agent'],
      };
    case Agent.OpenAI:
      return {
        id,
        name: 'OpenAI',
        path: '.codex/skills',
        ruleFile: '.codex/rules',
        ruleExtension: '.md',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.codex'],
      };
    case Agent.OpenCode:
      return {
        id,
        name: 'OpenCode',
        path: '.opencode/skills',
        ruleFile: '.opencode/rules',
        ruleExtension: '.md',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.opencode'],
      };
    case Agent.Gemini:
      return {
        id,
        name: 'Gemini',
        path: '.gemini/skills',
        ruleFile: '.gemini/rules',
        ruleExtension: '.md',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.gemini'],
      };
    case Agent.Roo:
      return {
        id,
        name: 'Roo Code',
        path: '.roo/skills',
        ruleFile: '.roo/rules',
        ruleExtension: '.md',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.roo'],
      };
    case Agent.Windsurf:
      return {
        id,
        name: 'Windsurf',
        path: '.windsurf/skills',
        ruleFile: '.windsurf/rules',
        ruleExtension: '.md',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.windsurf', '.windsurfrules'],
      };
    case Agent.Kiro:
      return {
        id,
        name: 'Kiro',
        path: '.kiro/skills',
        ruleFile: '.kiro/rules', // Changed from steering to match AGENT_CONFIGS
        ruleExtension: '.md',
        frontmatterStyle: 'cursor',
        detectionFiles: ['.kiro'],
      };
  }
};

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
  }
};

export const SUPPORTED_AGENTS: AgentDefinition[] =
  Object.values(Agent).map(getAgentDefinition);

export const SUPPORTED_FRAMEWORKS: FrameworkDefinition[] = Object.values(
  Framework,
).map(getFrameworkDefinition);

export { SKILL_DETECTION_REGISTRY } from './skills';
export type { SkillDetection } from './skills';
