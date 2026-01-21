export enum Agent {
  Cursor = 'cursor',
  Trae = 'trae',
  Claude = 'claude',
  Copilot = 'copilot',
  Antigravity = 'antigravity',
  OpenAI = 'openai',
  OpenCode = 'opencode',
  Gemini = 'gemini',
  Roo = 'roo',
  Windsurf = 'windsurf',
}

export enum Framework {
  Flutter = 'flutter',
  NestJS = 'nestjs',
  Golang = 'golang',
  NextJS = 'nextjs',
  React = 'react',
  ReactNative = 'react-native',
  Angular = 'angular',
  Rails = 'rails',
}

export const UNIVERSAL_SKILLS = ['common'];

export interface AgentDefinition {
  id: Agent;
  name: string;
  path: string;
  detectionFiles: string[];
}

export interface FrameworkDefinition {
  id: Framework;
  name: string;
  languages: string[];
  detectionFiles: string[];
  detectionDependencies?: string[];
}

export const getAgentDefinition = (id: Agent): AgentDefinition => {
  switch (id) {
    case Agent.Cursor:
      return {
        id,
        name: 'Cursor',
        path: '.cursor/skills',
        detectionFiles: ['.cursor', '.cursorrules'],
      };
    case Agent.Trae:
      return {
        id,
        name: 'Trae',
        path: '.trae/skills',
        detectionFiles: ['.trae'],
      };
    case Agent.Claude:
      return {
        id,
        name: 'Claude Code',
        path: '.claude/skills',
        detectionFiles: ['.claude', 'CLAUDE.md'],
      };
    case Agent.Copilot:
      return {
        id,
        name: 'GitHub Copilot',
        path: '.github/skills',
        detectionFiles: ['.github'],
      };
    case Agent.Antigravity:
      return {
        id,
        name: 'Antigravity',
        path: '.agent/skills',
        detectionFiles: ['.agent'],
      };
    case Agent.OpenAI:
      return {
        id,
        name: 'OpenAI',
        path: '.codex/skills',
        detectionFiles: ['.codex'],
      };
    case Agent.OpenCode:
      return {
        id,
        name: 'OpenCode',
        path: '.opencode/skills',
        detectionFiles: ['.opencode'],
      };
    case Agent.Gemini:
      return {
        id,
        name: 'Gemini',
        path: '.gemini/skills',
        detectionFiles: ['.gemini'],
      };
    case Agent.Roo:
      return {
        id,
        name: 'Roo Code',
        path: '.roo/skills',
        detectionFiles: ['.roo'],
      };
    case Agent.Windsurf:
      return {
        id,
        name: 'Windsurf',
        path: '.windsurf/skills',
        detectionFiles: ['.windsurf', '.windsurfrules'],
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
      };
    case Framework.React:
      return {
        id,
        name: 'React',
        languages: ['typescript', 'javascript'],
        detectionFiles: [],
        detectionDependencies: ['react', 'react-dom'],
      };
    case Framework.ReactNative:
      return {
        id,
        name: 'React Native',
        languages: ['typescript', 'javascript'],
        detectionFiles: ['metro.config.js'],
        detectionDependencies: ['react-native'],
      };
    case Framework.Angular:
      return {
        id,
        name: 'Angular',
        languages: ['typescript'],
        detectionFiles: ['angular.json'],
      };
    case Framework.Rails:
      return {
        id,
        name: 'Ruby on Rails',
        languages: ['ruby'],
        detectionFiles: [
          'Gemfile',
          'config/application.rb',
          'config/environment.rb',
          'bin/rails',
        ],
        detectionDependencies: ['rails'],
      };
  }
};

export const SUPPORTED_AGENTS: AgentDefinition[] =
  Object.values(Agent).map(getAgentDefinition);

export const SUPPORTED_FRAMEWORKS: FrameworkDefinition[] = Object.values(
  Framework,
).map(getFrameworkDefinition);

export { SKILL_DETECTION_REGISTRY, SkillDetection } from './skills';
