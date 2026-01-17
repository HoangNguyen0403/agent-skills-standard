export interface AgentDefinition {
  id: string;
  name: string;
  path: string;
  detectionFiles: string[];
}

export interface FrameworkDefinition {
  id: string;
  name: string;
  languages: string[];
  detectionFiles: string[];
}

export const SUPPORTED_AGENTS: AgentDefinition[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    path: '.cursor/skills',
    detectionFiles: ['.cursor', '.cursorrules'],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    path: '.claude/skills',
    detectionFiles: ['.claude', 'CLAUDE.md'],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    path: '.github/skills',
    detectionFiles: ['.github'],
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    path: '.agent/skills',
    detectionFiles: ['.agent'],
  },
  {
    id: 'openai',
    name: 'OpenAI/Generic',
    path: '.codex/skills',
    detectionFiles: ['.codex'],
  },
];

export const SUPPORTED_FRAMEWORKS: FrameworkDefinition[] = [
  {
    id: 'flutter',
    name: 'Flutter',
    languages: ['dart'],
    detectionFiles: ['pubspec.yaml'],
  },
  {
    id: 'nestjs',
    name: 'NestJS',
    languages: ['typescript', 'javascript'],
    detectionFiles: ['package.json'], // Can be improved with scanning package.json contents
  },
  {
    id: 'golang',
    name: 'Go (Golang)',
    languages: ['go'],
    detectionFiles: ['go.mod'],
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    languages: ['typescript', 'javascript'],
    detectionFiles: ['next.config.js', 'next.config.mjs'],
  },
  {
    id: 'react',
    name: 'React',
    languages: ['typescript', 'javascript'],
    detectionFiles: ['package.json'],
  },
  {
    id: 'react-native',
    name: 'React Native',
    languages: ['typescript', 'javascript'],
    detectionFiles: [],
  },
  {
    id: 'angular',
    name: 'Angular',
    languages: ['typescript'],
    detectionFiles: ['angular.json'],
  },
];
