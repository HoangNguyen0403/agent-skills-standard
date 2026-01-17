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
  detectionDependencies?: string[];
}

export const SUPPORTED_AGENTS: AgentDefinition[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    path: '.cursor/skills',
    detectionFiles: ['.cursor', '.cursorrules'],
  },
  {
    id: 'trae',
    name: 'Trae',
    path: '.trae/skills',
    detectionFiles: ['.trae'],
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
    name: 'OpenAI',
    path: '.codex/skills',
    detectionFiles: ['.codex'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    path: '.opencode/skills',
    detectionFiles: ['.opencode'],
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
    detectionFiles: ['nest-cli.json'],
    detectionDependencies: ['@nestjs/core'],
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
    detectionDependencies: ['next'],
  },
  {
    id: 'react',
    name: 'React',
    languages: ['typescript', 'javascript'],
    detectionFiles: [],
    detectionDependencies: ['react', 'react-dom'],
  },
  {
    id: 'react-native',
    name: 'React Native',
    languages: ['typescript', 'javascript'],
    detectionFiles: ['metro.config.js'],
    detectionDependencies: ['react-native'],
  },
  {
    id: 'angular',
    name: 'Angular',
    languages: ['typescript'],
    detectionFiles: ['angular.json'],
  },
];
