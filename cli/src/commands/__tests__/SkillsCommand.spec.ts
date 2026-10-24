import fs from 'fs-extra';
import inquirer from 'inquirer';
import * as yaml from 'js-yaml';
import os from 'os';
import path from 'path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mock,
  vi,
  type MockInstance,
} from 'vitest';
import { Agent } from '../../constants';
import { SkillsCommand } from '../skills';
import { ConfigService, ConfigSnapshot } from '../../services/ConfigService';
import {
  SkillCatalogService,
  SkillCatalogError,
} from '../../services/SkillCatalogService';
import type { ResolvedRefs } from '../../services/install/RefResolver';
import type {
  PreparedSkillChange,
  SkillApplyResult,
  SkillSelectionApplyService,
} from '../../services/SkillSelectionApplyService';
import { SkillConfig } from '../../models/config';
import { skillSelectionFingerprint } from '../../services/SkillSelectionService';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

const REGISTRY = 'https://github.com/acme/registry';
const DEFAULT_BRANCH = 'trunk';
const REACT_V1 = 'react-v1.0.0';
const REACT_V2 = 'react-v1.2.0';
const COMMON_V1 = 'common-v1.0.0';
const PM_V1 = 'product-management-v1.1.0';

const sha = (char: string) => char.repeat(40);
const COMMITS: Record<string, string> = {
  [REACT_V1]: sha('1'),
  [REACT_V2]: sha('2'),
  [COMMON_V1]: sha('3'),
  [PM_V1]: sha('4'),
};

const skillFile = (name: string, description: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`;

function registryFiles(): Map<string, string> {
  const files = new Map<string, string>();
  const add = (ref: string, filePath: string, content: string) => {
    files.set(`${ref}:${filePath}`, content);
  };

  add(
    DEFAULT_BRANCH,
    'skills/metadata.json',
    JSON.stringify({
      categories: {
        common: { version: '1.0.0', tag_prefix: 'common-v' },
        react: { version: '1.2.0', tag_prefix: 'react-v' },
        'product-management': {
          version: '1.1.0',
          tag_prefix: 'product-management-v',
        },
        specialists: { version: '1.0.0', tag_prefix: 'specialists-v' },
      },
    }),
  );
  for (const skill of [
    'common/common-tdd',
    'common/common-documentation',
    'react/state-management',
    'react/signals',
    'product-management/product-business-requirements',
    'product-management/product-requirements',
    'product-management/product-evidence',
    'specialists/specialist-dive',
  ]) {
    const name = skill.split('/')[1];
    add(
      DEFAULT_BRANCH,
      `skills/${skill}/SKILL.md`,
      skillFile(name, `${name} guidance`),
    );
  }

  add(
    COMMITS[REACT_V1],
    'skills/react/state-management/SKILL.md',
    skillFile('state-management', 'State management guidance'),
  );
  add(
    COMMITS[REACT_V2],
    'skills/react/state-management/SKILL.md',
    skillFile('state-management', 'State management guidance'),
  );
  add(
    COMMITS[REACT_V2],
    'skills/react/signals/SKILL.md',
    skillFile('signals', 'Reactive signals guidance'),
  );
  add(
    COMMITS[REACT_V2],
    'skills/react/zustand-store/SKILL.md',
    skillFile('zustand-state', 'External store guidance'),
  );
  // A declaring category fetches its whole tree, so imported categories are
  // listed at the declaring ref too.
  add(
    COMMITS[COMMON_V1],
    'skills/react/state-management/SKILL.md',
    skillFile('state-management', 'State management guidance'),
  );
  add(
    COMMITS[COMMON_V1],
    'skills/react/signals/SKILL.md',
    skillFile('signals', 'Reactive signals guidance'),
  );
  add(
    COMMITS[COMMON_V1],
    'skills/common/common-tdd/SKILL.md',
    skillFile('common-tdd', 'TDD guidance'),
  );
  add(
    COMMITS[COMMON_V1],
    'skills/common/common-documentation/SKILL.md',
    skillFile('common-documentation', 'Documentation guidance'),
  );
  for (const skill of [
    'product-business-requirements',
    'product-requirements',
    'product-evidence',
  ]) {
    add(
      COMMITS[PM_V1],
      `skills/product-management/${skill}/SKILL.md`,
      skillFile(skill, `${skill} guidance`),
    );
  }
  return files;
}

/** Minimal real-shape GitHub transport; the catalog does the interpreting. */
class FakeCatalogTransport {
  constructor(private readonly files: Map<string, string>) {}

  private resolveRef(ref: string): string {
    return COMMITS[ref] ?? ref;
  }

  async getRepoInfo() {
    return { default_branch: DEFAULT_BRANCH };
  }

  async getRepoTree(_owner: string, _repo: string, ref: string) {
    const resolvedRef = this.resolveRef(ref);
    const paths = new Set<string>();
    for (const key of this.files.keys()) {
      const prefix = `${resolvedRef}:`;
      if (!key.startsWith(prefix)) continue;
      const filePath = key.slice(prefix.length);
      const segments = filePath.split('/');
      for (let index = 1; index < segments.length; index += 1) {
        paths.add(segments.slice(0, index).join('/'));
      }
      paths.add(filePath);
    }
    const tree = [...paths].sort().map((entryPath) => {
      const isBlob = this.files.has(`${resolvedRef}:${entryPath}`);
      return {
        path: entryPath,
        type: isBlob ? ('blob' as const) : ('tree' as const),
        sha: isBlob ? sha('a') : sha('b'),
        url: 'https://api.github.test/tree',
      };
    });
    return { sha: sha('c'), url: 'https://api.github.test/tree', tree, truncated: false as const };
  }

  async getRawFile(_owner: string, _repo: string, ref: string, filePath: string) {
    return this.files.get(`${this.resolveRef(ref)}:${filePath}`) ?? null;
  }

  async resolveCommit(_owner: string, _repo: string, ref: string) {
    return COMMITS[ref] ?? null;
  }

  async downloadFilesConcurrent(
    tasks: { ref: string; path: string }[],
  ) {
    return {
      ok: tasks.map((task) => ({
        path: task.path,
        content:
          this.files.get(`${this.resolveRef(task.ref)}:${task.path}`) ?? '',
      })),
      failed: [],
    };
  }
}

type ApplyBehavior = 'complete' | 'fail-after-save' | 'conflict';

/**
 * Contract-faithful apply double. Configuration persistence is the real
 * ConfigService; only package installation is replaced so the command's
 * save/retry/reload flow can be driven deterministically.
 */
class RecordingApplyService {
  readonly prepareCalls: { snapshot: ConfigSnapshot; proposed: SkillConfig }[] = [];
  readonly applyCalls: PreparedSkillChange[] = [];
  readonly behaviors: ApplyBehavior[] = [];
  prepareError: Error | null = null;
  planUnknown: string[] = [];
  private readonly configService: ConfigService;

  constructor(configService: ConfigService, behaviors: ApplyBehavior[] = []) {
    this.configService = configService;
    this.behaviors = behaviors;
  }

  async prepare(
    snapshot: ConfigSnapshot,
    proposed: SkillConfig,
  ): Promise<PreparedSkillChange> {
    this.prepareCalls.push({ snapshot, proposed });
    if (this.prepareError) throw this.prepareError;
    const selectionChanged =
      skillSelectionFingerprint(snapshot.config.skills ?? {}) !==
      skillSelectionFingerprint(proposed.skills ?? {});
    return {
      snapshot,
      config: {
        ...proposed,
        skills_mode: selectionChanged ? 'explicit' : proposed.skills_mode,
      },
      skills: [],
      completedCategories: Object.keys(proposed.skills),
      resolvedRefs: emptyResolvedRefs(),
    };
  }

  async apply(prepared: PreparedSkillChange): Promise<SkillApplyResult> {
    this.applyCalls.push(prepared);
    const behavior = this.behaviors.shift() ?? 'complete';

    if (behavior === 'conflict') {
      const conflicted = { ...prepared.config, prune: false };
      await fs.writeFile(
        path.join(process.cwd(), '.skillsrc'),
        yaml.dump(conflicted),
      );
      return {
        status: 'incomplete',
        stage: 'saving',
        saved: false,
        snapshot: prepared.snapshot,
        message: 'Configuration changed on disk since it was opened.',
      };
    }

    const saved = await this.configService.saveSelection(
      prepared.snapshot,
      prepared.config,
    );
    if (behavior === 'fail-after-save') {
      return {
        status: 'incomplete',
        stage: 'installing',
        saved: true,
        snapshot: saved,
        message: 'Permission denied while writing agent skill files.',
      };
    }
    return {
      status: 'complete',
      snapshot: saved,
      plan: {
        added: [],
        updated: [],
        unchanged: [],
        kept: [],
        unknown: [...this.planUnknown],
        pruned: [],
        keptOrphans: [],
        backupId: null,
      },
    };
  }
}

function emptyResolvedRefs(): ResolvedRefs {
  return {
    workflows: { ref: DEFAULT_BRANCH, commit: null, pinned: false },
    specialists: { ref: DEFAULT_BRANCH, commit: null, pinned: false },
    skills: {},
    newPins: {},
    warnings: [],
  };
}

function baseConfig(): SkillConfig {
  return {
    registry: REGISTRY,
    agents: [Agent.Claude, Agent.Cursor],
    skills: { common: { ref: COMMON_V1 } },
  };
}

interface PromptChoice {
  name?: string;
  value?: unknown;
  checked?: boolean;
}

interface PromptQuestion {
  name?: string;
  type?: string;
  choices?: PromptChoice[];
  source?: (
    term: string | undefined,
  ) => PromptChoice[] | Promise<PromptChoice[]>;
}
async function resolveSemanticAnswer(
  questions: unknown,
  answer: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const promptQuestions = (
    Array.isArray(questions) ? questions : []
  ) as PromptQuestion[];
  const checkboxQuestion = promptQuestions.find(
    (question) => question.type === 'checkbox' && question.name === 'skills',
  );
  if (
    Array.isArray(answer.skillIds) &&
    checkboxQuestion?.choices
  ) {
    const selectedValues = answer.skillIds.map((skillId) => {
      const option = checkboxQuestion.choices?.find(
        (choice) =>
          choice.value === skillId || choice.name?.includes(String(skillId)),
      );
      if (!option) {
        throw new Error(`No visible skill choice matches ${String(skillId)}`);
      }
      return option.value;
    });
    const rest = { ...answer };
    delete rest.skillIds;
    return { ...rest, skills: selectedValues };
  }
  const rawUncheckSkillIds = answer.uncheckSkillIds;
  if (Array.isArray(rawUncheckSkillIds) && checkboxQuestion?.choices) {
    const uncheckSkillIds: string[] = [];
    for (const skillId of rawUncheckSkillIds as unknown[]) {
      if (typeof skillId !== 'string') {
        throw new Error('Uncheck skill IDs must be strings');
      }
      uncheckSkillIds.push(skillId);
    }
    for (const skillId of uncheckSkillIds) {
      const visible = checkboxQuestion.choices.some(
        (choice) =>
          choice.value === skillId || choice.name?.includes(skillId),
      );
      if (!visible) {
        throw new Error(`No visible skill choice matches ${skillId}`);
      }
    }
    const selectedValues = checkboxQuestion.choices
      .filter(
        (choice) =>
          choice.checked &&
          !uncheckSkillIds.some(
            (skillId) =>
              choice.value === skillId || choice.name?.includes(skillId),
          ),
      )
      .map((choice) => choice.value);
    const rest = { ...answer };
    delete rest.uncheckSkillIds;
    return { ...rest, skills: selectedValues };
  }

  const searchQuestion = promptQuestions.find(
    (question) => question.type === 'search' && question.name === 'skill',
  );
  const skillId = answer.skillId;
  if (typeof skillId === 'string' && searchQuestion?.source) {
    const options = await searchQuestion.source(skillId);
    const option = options.find(
      (choice) =>
        choice.value === skillId || choice.name?.includes(skillId),
    );
    if (!option) {
      throw new Error(`No visible search result matches ${skillId}`);
    }
    const rest = { ...answer };
    delete rest.skillId;
    return { ...rest, skill: option.value };
  }

  return answer;
}

const promptMock = inquirer.prompt as unknown as Mock;
let answers: Record<string, unknown>[] = [];
let tempDir: string;
let originalCwd: string;
let originalExitCode: string | number | null | undefined;
let logSpy: MockInstance;
let errorSpy: MockInstance;

beforeEach(async () => {
  originalCwd = process.cwd();
  originalExitCode = process.exitCode;
  process.exitCode = 0;
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-skills-test-'));
  process.chdir(tempDir);
  answers = [];
  promptMock.mockReset();
  promptMock.mockImplementation(async (questions: unknown) => {
    const next = answers.shift();
    if (!next) throw new Error('Unexpected prompt: no answer queued');
    return resolveSemanticAnswer(questions, next);
  });
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  promptMock.mockReset();
  process.chdir(originalCwd);
  process.exitCode = originalExitCode;
  await fs.remove(tempDir);
});

function configPath(): string {
  return path.join(tempDir, '.skillsrc');
}

async function seedConfig(config: SkillConfig, fileName = '.skillsrc') {
  await fs.writeFile(path.join(tempDir, fileName), yaml.dump(config));
}

async function readConfig(fileName = '.skillsrc'): Promise<SkillConfig> {
  return yaml.load(
    await fs.readFile(path.join(tempDir, fileName), 'utf8'),
  ) as SkillConfig;
}

function buildCommand(
  applyService: RecordingApplyService,
  options: { interactive?: boolean } = {},
): SkillsCommand {
  const configService = new ConfigService();
  const catalogService = new SkillCatalogService(
    new FakeCatalogTransport(registryFiles()) as never,
  );
  return new SkillsCommand(
    configService,
    catalogService,
    applyService as unknown as SkillSelectionApplyService,
    () => options.interactive ?? true,
  );
}

describe('SkillsCommand category flow', () => {
  it('enables a new category at its published release and preserves existing pins', async () => {
    await seedConfig(baseConfig());
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.react.ref).toBe(REACT_V2);
    expect(saved.skills.common.ref).toBe(COMMON_V1);
    expect(saved.skills_mode).toBe('explicit');
    expect(applyService.applyCalls).toHaveLength(1);
    expect(process.exitCode).toBe(0);
  });

  it('uses only the shared Product Management foundation defaults', async () => {
    await seedConfig({ ...baseConfig(), skills: {} });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['product-management'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills['product-management']).toEqual({
      ref: PM_V1,
      include: ['product-business-requirements', 'product-requirements'],
    });
  });

  it('retains a configured category the catalog cannot describe when its row stays checked', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: {
        common: { ref: COMMON_V1 },
        flutter: { ref: 'flutter-v1.0.0', exclude: ['bloc'] },
      },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react', 'flutter'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.flutter).toEqual({
      ref: 'flutter-v1.0.0',
      exclude: ['bloc'],
    });
    expect(saved.skills.react.ref).toBe(REACT_V2);
  });

  it('removes an unavailable category while applying a valid category change', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: {
        common: { ref: COMMON_V1 },
        flutter: { ref: 'flutter-v1.0.0', exclude: ['bloc'] },
      },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.flutter).toBeUndefined();
    expect(saved.skills.react.ref).toBe(REACT_V2);
    expect(applyService.prepareCalls[0]?.proposed.skills).not.toHaveProperty(
      'flutter',
    );
  });
  it('excludes non-skill specialist directories from the saved selection', async () => {
    await seedConfig({ ...baseConfig(), skills: {} });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react', 'specialists'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.specialists).toBeUndefined();
    expect(saved.skills.react.ref).toBe(REACT_V2);
    expect(applyService.applyCalls).toHaveLength(1);
  });
});

describe('SkillsCommand advanced customization', () => {
  it('adds one exact exclusion to a category-wide selection', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: { react: { ref: REACT_V2 } },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['react'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'react' });
    answers.push({ action: 'toggle' });
    answers.push({ uncheckSkillIds: ['react/signals'] });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.react).toEqual({
      ref: REACT_V2,
      exclude: ['signals'],
    });
  });

  it('toggles a searched skill without disturbing other selections', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: {
        react: { ref: REACT_V2, exclude: ['signals'] },
        common: { ref: COMMON_V1 },
      },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['react', 'common'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'react' });
    answers.push({ action: 'search' });
    answers.push({ skillId: 'react/signals' });
    answers.push({ include: true });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.react).toEqual({ ref: REACT_V2 });
    expect(saved.skills.common).toEqual({ ref: COMMON_V1 });
  });

  it('only offers imports already declared in include and preserves qualified identity', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: {
        common: {
          ref: COMMON_V1,
          include: ['common-tdd', 'react/state-management'],
        },
      },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'common' });
    answers.push({ action: 'toggle' });
    answers.push({ skills: ['common/common-tdd'] });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.common).toEqual({
      ref: COMMON_V1,
      include: ['common-tdd'],
    });
  });

  it('excludes one wildcard-imported member while keeping the wildcard expression', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: { common: { ref: COMMON_V1, include: ['react/*'] } },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'common' });
    answers.push({ action: 'toggle' });
    answers.push({ uncheckSkillIds: ['react/signals'] });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.common).toEqual({
      ref: COMMON_V1,
      include: ['react/*'],
      exclude: ['react/signals'],
    });
  });

  it('re-enables an imported member that had an exact exclusion', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: {
        common: {
          ref: COMMON_V1,
          include: ['react/state-management'],
          exclude: ['react/state-management'],
        },
      },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'common' });
    answers.push({ action: 'toggle' });
    answers.push({ skillIds: ['react/state-management'] });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.common).toEqual({
      ref: COMMON_V1,
      include: ['react/state-management'],
    });
  });

  it('keys allowlist membership by folder id when the frontmatter name differs', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: { react: { ref: REACT_V2, include: ['zustand-store'] } },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['react'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'react' });
    answers.push({ action: 'toggle' });
    answers.push({ skillIds: [] });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.react).toEqual({ ref: REACT_V2, include: [] });
  });

  it('reports unowned collisions as retained instead of implying full replacement', async () => {
    await seedConfig(baseConfig());
    const applyService = new RecordingApplyService(new ConfigService());
    applyService.planUnknown = ['react/signals/SKILL.md'];
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const output = logSpy.mock.calls
      .map((call) => String(call[0]))
      .join('\n');
    expect(output).toContain(
      'left untouched (not owned by ags): react/signals/SKILL.md',
    );
    expect(output).toContain('not every path was replaced');
  });
  it('changes an existing category to the published release only when explicitly selected', async () => {
    await seedConfig({
      ...baseConfig(),
      skills: { react: { ref: REACT_V1 } },
    });
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['react'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'react' });
    answers.push({ action: 'release' });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });
    answers.push({ apply: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.react.ref).toBe(REACT_V2);
  });
});

describe('SkillsCommand write boundaries', () => {
  it('does not write on cancel', async () => {
    await seedConfig(baseConfig());
    const before = await fs.readFile(configPath());
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'cancel' });

    await command.run();

    expect(await fs.readFile(configPath())).toEqual(before);
    expect(applyService.prepareCalls).toHaveLength(0);
  });

  it('does not write when the selection is unchanged', async () => {
    await seedConfig(baseConfig());
    const before = await fs.readFile(configPath());
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common'] });
    answers.push({ next: 'review' });

    await command.run();

    expect(await fs.readFile(configPath())).toEqual(before);
    expect(applyService.prepareCalls).toHaveLength(0);
    expect(process.exitCode).toBe(0);
  });
  it('keeps a legacy allowlist byte-identical after disabling and re-enabling a member', async () => {
    await seedConfig(
      {
        ...baseConfig(),
        skills: {
          react: {
            ref: REACT_V2,
            include: ['signals', 'state-management'],
          },
        },
      },
      '.skillsrc.yaml',
    );
    const legacyPath = path.join(tempDir, '.skillsrc.yaml');
    const before = await fs.readFile(legacyPath);
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['react'] });
    answers.push({ next: 'customize' });
    answers.push({ category: 'react' });
    answers.push({ action: 'toggle' });
    answers.push({ skillIds: ['react/state-management'] });
    answers.push({ action: 'back' });
    answers.push({ next: 'customize' });
    answers.push({ category: 'react' });
    answers.push({ action: 'toggle' });
    answers.push({
      skillIds: ['react/state-management', 'react/signals'],
    });
    answers.push({ action: 'back' });
    answers.push({ next: 'review' });

    await command.run();

    expect(await fs.readFile(legacyPath)).toEqual(before);
    expect(await fs.pathExists(configPath())).toBe(false);
    expect(applyService.prepareCalls).toHaveLength(0);
    expect(applyService.applyCalls).toHaveLength(0);
  });


  it('keeps a legacy filename untouched when the manager is cancelled', async () => {
    await seedConfig(baseConfig(), '.skillsrc.yaml');
    const before = await fs.readFile(
      path.join(tempDir, '.skillsrc.yaml'),
    );
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'cancel' });

    await command.run();

    expect(await fs.exists(configPath())).toBe(false);
    expect(
      await fs.readFile(path.join(tempDir, '.skillsrc.yaml')),
    ).toEqual(before);
  });

  it('exits nonzero without writing when the terminal is not interactive', async () => {
    await seedConfig(baseConfig());
    const before = await fs.readFile(configPath());
    const applyService = new RecordingApplyService(new ConfigService());
    const command = buildCommand(applyService, { interactive: false });

    await command.run();

    expect(process.exitCode).toBe(1);
    expect(await fs.readFile(configPath())).toEqual(before);
    expect(applyService.prepareCalls).toHaveLength(0);
  });

  it('keeps selection mode unchanged after failed preparation is reverted', async () => {
    await seedConfig(baseConfig());
    const before = await fs.readFile(configPath());
    const applyService = new RecordingApplyService(new ConfigService());
    applyService.prepareError = new SkillCatalogError(
      'Release react-v1.2.0 does not contain category "react"',
    );
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });
    answers.push({ categories: ['common'] });
    answers.push({ next: 'review' });

    await command.run();

    expect(await fs.readFile(configPath())).toEqual(before);
    expect(applyService.prepareCalls).toHaveLength(1);
    expect(applyService.applyCalls).toHaveLength(0);
  });
});

describe('SkillsCommand retry and reload', () => {
  it('converges after an in-command retry without a separate sync command', async () => {
    await seedConfig(baseConfig());
    const applyService = new RecordingApplyService(new ConfigService(), [
      'fail-after-save',
      'complete',
    ]);
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });
    answers.push({ retry: true });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.react.ref).toBe(REACT_V2);
    expect(applyService.prepareCalls).toHaveLength(1);
    expect(applyService.applyCalls[1].skills).toBe(
      applyService.applyCalls[0].skills,
    );
    expect(applyService.applyCalls[1].resolvedRefs).toBe(
      applyService.applyCalls[0].resolvedRefs,
    );
    expect(process.exitCode).toBe(0);
  });

  it('exits nonzero and retains the saved selection when retry is refused', async () => {
    await seedConfig(baseConfig());
    const applyService = new RecordingApplyService(new ConfigService(), [
      'fail-after-save',
    ]);
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });
    answers.push({ retry: false });

    await command.run();

    const saved = await readConfig();
    expect(saved.skills.react.ref).toBe(REACT_V2);
    expect(applyService.applyCalls).toHaveLength(1);
    expect(process.exitCode).toBe(1);
  });

  it('reloads instead of overwriting a configuration changed on disk', async () => {
    await seedConfig(baseConfig());
    const applyService = new RecordingApplyService(new ConfigService(), [
      'conflict',
    ]);
    const command = buildCommand(applyService);

    answers.push({ categories: ['common', 'react'] });
    answers.push({ next: 'review' });
    answers.push({ apply: true });
    answers.push({ retry: true });
    // After the reload the draft reflects the conflicted file; leave it alone.
    answers.push({ categories: ['common'] });
    answers.push({ next: 'cancel' });

    await command.run();

    const saved = await readConfig();
    expect(saved.prune).toBe(false);
    expect(saved.skills.react?.ref).toBe(REACT_V2);
    expect(applyService.applyCalls).toHaveLength(1);
    expect(process.exitCode).toBe(0);
  });
});
