import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../ConfigService';

vi.mock('fs-extra');

const mockCwd = '/mock/cwd';
const primaryPath = path.join(mockCwd, '.skillsrc');

function mockPrimaryConfig(content: string): void {
  vi.mocked(fs.pathExists).mockImplementation((target) =>
    Promise.resolve(target === primaryPath),
  );
  vi.mocked(fs.readFile).mockImplementation(() =>
    Promise.resolve(content as unknown as Buffer),
  );
}

describe('ConfigService selection validation', () => {
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    configService = new ConfigService();
  });

  describe('valid membership preserved (AC-19)', () => {
    it('preserves block include/exclude membership from valid YAML', async () => {
      mockPrimaryConfig(`registry: https://example.com
agents:
  - cursor
skills:
  typescript:
    ref: typescript-v1.3.4
  common:
    ref: common-v2.9.4
    include:
      - common-tdd
    exclude:
      - common-accessibility
`);

      const snapshot = await configService.readSnapshot(mockCwd);

      expect(snapshot?.config.skills).toEqual({
        typescript: { ref: 'typescript-v1.3.4' },
        common: {
          ref: 'common-v2.9.4',
          include: ['common-tdd'],
          exclude: ['common-accessibility'],
        },
      });
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('retains a custom category and its extension key without an allowlist', async () => {
      mockPrimaryConfig(`registry: https://example.com
agents:
  - cursor
skills:
  team-rules:
    ref: team-rules-v1.0.0
    include:
      - local-only
    owner: platform
  exclude-rules:
    ref: exclude-rules-v2.0.0
`);

      const snapshot = await configService.readSnapshot(mockCwd);

      expect(snapshot?.config.skills['team-rules']).toEqual({
        ref: 'team-rules-v1.0.0',
        include: ['local-only'],
      });
      expect(snapshot?.config.skills['exclude-rules']).toEqual({
        ref: 'exclude-rules-v2.0.0',
      });
      expect(Object.keys(snapshot?.config.skills ?? {})).toEqual([
        'team-rules',
        'exclude-rules',
      ]);
    });

    it('parses a legacy block-form exclusion under its category, not as a category', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
  exclude:
  - common-accessibility
  common:
  ref: common-v2.0.5
  workflows:
- sdlc
`);

      const snapshot = await configService.readSnapshot(mockCwd);

      expect(snapshot?.config.skills).toEqual({
        typescript: {
          ref: 'typescript-v1.3.3',
          exclude: ['common-accessibility'],
        },
        common: { ref: 'common-v2.0.5' },
      });
      expect(snapshot?.config.skills).not.toHaveProperty('exclude');
      expect(fs.outputFile).not.toHaveBeenCalled();
    });
  });

  describe('reserved keys rejected with a precise path (AC-20)', () => {
    it.each(['include', 'exclude', 'ref'])(
      'rejects %s in category position before any write',
      async (reserved) => {
        mockPrimaryConfig(`registry: https://example.com
agents:
  - cursor
skills:
  ${reserved}:
    - common-accessibility
  typescript:
    ref: typescript-v1.3.4
`);

        const failure = configService.readSnapshot(mockCwd);

        await expect(failure).rejects.toThrow(
          new RegExp(`${primaryPath}.*skills\\.${reserved}`),
        );
        await expect(failure).rejects.toThrow(/reserved selection key/);
        expect(fs.outputFile).not.toHaveBeenCalled();
        expect(fs.remove).not.toHaveBeenCalled();
      },
    );

    it('rejects a reserved key through loadConfig without rewriting the file', async () => {
      mockPrimaryConfig(`registry: https://example.com
agents:
  - cursor
skills:
  exclude:
    - common-accessibility
`);

      await expect(configService.loadConfig(mockCwd)).rejects.toThrow(
        /skills\.exclude/,
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('rejects a malformed category value with its own path', async () => {
      mockPrimaryConfig(`registry: https://example.com
agents:
  - cursor
skills:
  typescript:
    - hooks
`);

      const failure = configService.readSnapshot(mockCwd);

      await expect(failure).rejects.toThrow(
        new RegExp(`${primaryPath}.*skills\\.typescript`),
      );
      await expect(failure).rejects.toThrow(/mapping/);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('refuses to guess a category for a legacy pre-category exclusion', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  exclude:
  - common-accessibility
  typescript:
  ref: typescript-v1.3.3
  workflows:
- sdlc
`);

      const failure = configService.readSnapshot(mockCwd);

      await expect(failure).rejects.toThrow(/cannot infer which category/);
      await expect(failure).rejects.toThrow(/skills\.<category>\.exclude/);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('rejects a global-looking exclusion placed above the category indent', async () => {
      mockPrimaryConfig(`registry: https://example.com
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
exclude:
- common-accessibility
`);

      const failure = configService.readSnapshot(mockCwd);

      await expect(failure).rejects.toThrow(/cannot infer which category/);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });
  });

  describe('legacy fallback boundaries', () => {
    async function loadPersistedDocument(): Promise<Record<string, unknown>> {
      const config = await configService.loadConfig(mockCwd);
      expect(config).not.toBeNull();
      const written = vi.mocked(fs.outputFile).mock.calls.at(-1)?.[1];
      if (typeof written !== 'string') {
        throw new Error('expected a written configuration document');
      }
      return yaml.load(written) as Record<string, unknown>;
    }

    it('keeps a nested extension property instead of fetching it as a category', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
    owner: platform
  custom_overrides: []
  workflows:
- sdlc
`);

      const persisted = await loadPersistedDocument();
      const skills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(skills).not.toHaveProperty('owner');
      expect(skills.typescript).toEqual({
        ref: 'typescript-v1.3.3',
        owner: 'platform',
      });
    });

    it('rejects a nonempty inline value in category position', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  common: [hooks]
  typescript:
  ref: typescript-v1.3.3
  custom_overrides: []
  workflows:
- sdlc
`);

      const failure = configService.readSnapshot(mockCwd);

      await expect(failure).rejects.toThrow(
        new RegExp(`${primaryPath}.*skills\\.common`),
      );
      await expect(failure).rejects.toThrow(/mapping/);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('rejects a list item shallower than the key that opened the list', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
  exclude:
- common-accessibility
  common:
  ref: common-v2.0.5
  workflows:
- sdlc
`);

      const failure = configService.readSnapshot(mockCwd);

      await expect(failure).rejects.toThrow(
        new RegExp(`skills\\.typescript\\.exclude`),
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('rejects a nested mapping where a block list was opened', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
  exclude:
    runtime: x
  custom_overrides: []
  workflows:
- sdlc
`);

      const failure = configService.readSnapshot(mockCwd);

      await expect(failure).rejects.toThrow(
        /skills\.typescript\.exclude.*nested key/,
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('keeps the YAML meaning of a quoted extension scalar', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
    owner: "platform"
  custom_overrides: []
  workflows:
- sdlc
`);

      const persisted = await loadPersistedDocument();
      const skills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(skills.typescript.owner).toBe('platform');
    });

    it('keeps a flow mapping extension as a mapping', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
    options: {team: platform, retries: 2}
  custom_overrides: []
  workflows:
- sdlc
`);

      const persisted = await loadPersistedDocument();
      const skills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(skills.typescript.options).toEqual({
        team: 'platform',
        retries: 2,
      });
    });

    it('keeps the YAML meaning of extension list items', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
    tags:
    - "alpha"
    - beta
  custom_overrides: []
  workflows:
- sdlc
`);

      const persisted = await loadPersistedDocument();
      const skills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(skills.typescript.tags).toEqual(['alpha', 'beta']);
    });

    it('refuses an inline extension value that is not a supported YAML shape', async () => {
      mockPrimaryConfig(`registry: <https://example.com>
agents:

- codex
  skills:
  typescript:
  ref: typescript-v1.3.3
    owner: foo: bar
  custom_overrides: []
  workflows:
- sdlc
`);

      const failure = configService.readSnapshot(mockCwd);

      await expect(failure).rejects.toThrow(
        new RegExp(`${primaryPath}.*skills\\.typescript\\.owner`),
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });
  });

  describe('migration publication', () => {
    it('retains unrelated root and category extension fields when writing', async () => {
      const original = `registry: https://example.com
agents:
  - codex
skills:
  typescript:
  team-rules:
    ref: team-rules-v1.0.0
    include:
      - local-only
    owner: platform
extension_root:
  owner: team
custom_overrides:
  - safe.md
`;
      mockPrimaryConfig(original);

      const snapshot = await configService.readSnapshot(mockCwd);
      expect(
        (snapshot?.raw.skills as Record<string, Record<string, unknown>>)[
          'team-rules'
        ].owner,
      ).toBe('platform');
      expect(
        (snapshot?.raw.extension_root as Record<string, unknown>).owner,
      ).toBe('team');

      await configService.loadConfig(mockCwd);

      const written = vi.mocked(fs.outputFile).mock.calls.at(-1)?.[1];
      if (typeof written !== 'string') {
        throw new Error('expected a written configuration document');
      }
      const persisted = yaml.load(written) as Record<string, unknown>;
      const skills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(skills.typescript).toEqual({});
      expect(skills['team-rules']).toEqual({
        ref: 'team-rules-v1.0.0',
        include: ['local-only'],
        owner: 'platform',
      });
      expect(persisted.extension_root).toEqual({ owner: 'team' });
      expect(persisted.custom_overrides).toEqual(['safe.md']);
    });
  });

  describe('saveReviewedConfig', () => {
    const original = `registry: https://example.com
agents:
  - cursor
skills:
  typescript:
    ref: typescript-v1.3.3
    owner: platform
  team-rules:
    ref: team-rules-v1.0.0
    include:
      - local-only
workflows:
  - sdlc
workflows_ref: workflows-v1.0.0
specialists_ref: specialists-v1.0.0
extension_root:
  owner: team
mcp:
  enabled: false
  scope: snippets-only
  prompted: true
  team_extension: keep
  settings:
    mode: loose
custom_overrides:
  - safe.md
`;

    function persistedDocument(): Record<string, unknown> {
      const written = vi.mocked(fs.outputFile).mock.calls.at(-1)?.[1];
      if (typeof written !== 'string') {
        throw new Error('expected a written configuration document');
      }
      return yaml.load(written) as Record<string, unknown>;
    }

    it('persists accepted pins and workflows while retaining extensions', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      const saved = await configService.saveReviewedConfig(
        snapshot,
        {
          ...snapshot.config,
          skills: {
            typescript: { ref: 'typescript-v1.3.4' },
            'team-rules': { ref: 'team-rules-v1.0.0', include: ['local-only'] },
          },
          workflows: ['sdlc', 'code-review'],
          workflows_ref: 'workflows-v1.1.0',
          specialists_ref: 'specialists-v1.1.0',
        },
        mockCwd,
      );

      const persisted = persistedDocument();
      const skills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(skills.typescript).toEqual({
        ref: 'typescript-v1.3.4',
        owner: 'platform',
      });
      expect(skills['team-rules']).toEqual({
        ref: 'team-rules-v1.0.0',
        include: ['local-only'],
      });
      expect(persisted.workflows).toEqual(['sdlc', 'code-review']);
      expect(persisted.workflows_ref).toBe('workflows-v1.1.0');
      expect(persisted.specialists_ref).toBe('specialists-v1.1.0');
      expect(persisted.extension_root).toEqual({ owner: 'team' });
      expect(persisted.custom_overrides).toEqual(['safe.md']);
      expect(persisted.registry).toBe('https://example.com');
      expect(persisted.agents).toEqual(['cursor']);
      expect(persisted.mcp).toEqual({
        enabled: false,
        scope: 'snippets-only',
        prompted: true,
        team_extension: 'keep',
        settings: { mode: 'loose' },
      });

      expect(saved.sourcePath).toBe(primaryPath);
      expect(saved.config.workflows_ref).toBe('workflows-v1.1.0');
      expect(saved.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(saved.raw.extension_root).toEqual({ owner: 'team' });
    });

    it('applies an MCP consent update without dropping MCP or root extensions', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      await configService.saveReviewedConfig(
        snapshot,
        {
          ...snapshot.config,
          mcp: { enabled: true, scope: 'project', prompted: true },
        },
        mockCwd,
      );

      const persisted = persistedDocument();

      expect(persisted.mcp).toEqual({
        enabled: true,
        scope: 'project',
        prompted: true,
        team_extension: 'keep',
        settings: { mode: 'loose' },
      });
      expect(persisted.extension_root).toEqual({ owner: 'team' });
      expect(
        (persisted.skills as Record<string, Record<string, unknown>>)
          .typescript,
      ).toEqual({ ref: 'typescript-v1.3.3', owner: 'platform' });
    });

    it('refuses a conflicting snapshot before writing anything', async () => {
      vi.mocked(fs.pathExists).mockImplementation((target) =>
        Promise.resolve(target === primaryPath),
      );
      vi.mocked(fs.readFile)
        .mockImplementationOnce(() => Promise.resolve(original))
        .mockImplementationOnce(() =>
          Promise.resolve(`${original}# changed on disk\n`),
        );

      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      await expect(
        configService.saveReviewedConfig(
          snapshot,
          { ...snapshot.config, workflows_ref: 'workflows-v9.9.9' },
          mockCwd,
        ),
      ).rejects.toThrow('changed on disk');
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('rejects an invalid next config before writing', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      await expect(
        configService.saveReviewedConfig(
          snapshot,
          {
            ...snapshot.config,
            skills: {
              ...snapshot.config.skills,
              exclude: { ref: 'nope' },
            },
          },
          mockCwd,
        ),
      ).rejects.toThrow(/skills\.exclude/);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('keeps saveSelection limited to skills and skills_mode', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      await configService.saveSelection(
        snapshot,
        { ...snapshot.config, workflows_ref: 'workflows-v9.9.9' },
        mockCwd,
      );

      const persisted = persistedDocument();

      expect(persisted.workflows_ref).toBe('workflows-v1.0.0');
      expect(persisted.extension_root).toEqual({ owner: 'team' });
    });

    it('persists an in-place pin mutation made through the snapshot projection', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      const inPlace = snapshot.config;
      inPlace.workflows_ref = 'workflows-v1.1.0';
      inPlace.skills.typescript.ref = 'typescript-v1.3.4';

      const saved = await configService.saveReviewedConfig(
        snapshot,
        inPlace,
        mockCwd,
      );

      const persisted = persistedDocument();
      const skills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(persisted.workflows_ref).toBe('workflows-v1.1.0');
      expect(skills.typescript).toEqual({
        ref: 'typescript-v1.3.4',
        owner: 'platform',
      });
      expect(saved.config.workflows_ref).toBe('workflows-v1.1.0');
      expect(saved.config.skills.typescript.ref).toBe('typescript-v1.3.4');
    });

    it('persists a shallow-aliased MCP in-place update', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      const next = { ...snapshot.config };
      next.mcp = snapshot.config.mcp;
      if (!next.mcp) throw new Error('expected mcp config');
      next.mcp.enabled = true;
      next.mcp.scope = 'project';

      const saved = await configService.saveReviewedConfig(
        snapshot,
        next,
        mockCwd,
      );

      const persisted = persistedDocument();

      expect(persisted.mcp).toEqual({
        enabled: true,
        scope: 'project',
        prompted: true,
        team_extension: 'keep',
        settings: { mode: 'loose' },
      });
      expect(saved.config.mcp?.enabled).toBe(true);
    });

    it('ignores caller mutations of the snapshot raw document', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      snapshot.raw.workflows_ref = 'workflows-v9.9.9';
      const skills = snapshot.raw.skills as Record<
        string,
        Record<string, unknown>
      >;
      skills.typescript.ref = 'typescript-v9.9.9';

      await configService.saveReviewedConfig(
        snapshot,
        { ...snapshot.config, custom_overrides: ['safe.md'] },
        mockCwd,
      );

      const persisted = persistedDocument();
      const persistedSkills = persisted.skills as Record<
        string,
        Record<string, unknown>
      >;

      expect(persisted.workflows_ref).toBe('workflows-v1.0.0');
      expect(persistedSkills.typescript).toEqual({
        ref: 'typescript-v1.3.3',
        owner: 'platform',
      });
    });

    it('returns a projection that matches a reload of the persisted file', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      const saved = await configService.saveReviewedConfig(
        snapshot,
        {
          ...snapshot.config,
          skills: {
            typescript: { ref: 'typescript-v1.3.4' },
            'team-rules': { ref: 'team-rules-v1.0.0', include: ['local-only'] },
          },
          workflows_ref: 'workflows-v1.1.0',
        },
        mockCwd,
      );

      const written = vi.mocked(fs.outputFile).mock.calls.at(-1)?.[1];
      if (typeof written !== 'string') {
        throw new Error('expected a written configuration document');
      }
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(written as unknown as Buffer),
      );

      const reloaded = await configService.readSnapshot(mockCwd);

      expect(reloaded?.config).toEqual(saved.config);
      expect(reloaded?.raw).toEqual(saved.raw);
    });

    it('refuses to remove an MCP block that still has unknown extension keys', async () => {
      mockPrimaryConfig(original);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      await expect(
        configService.saveReviewedConfig(
          snapshot,
          { ...snapshot.config, mcp: undefined },
          mockCwd,
        ),
      ).rejects.toThrow(/mcp.*unrecognized extension keys/i);
      expect(fs.outputFile).not.toHaveBeenCalled();
      expect(fs.remove).not.toHaveBeenCalled();
    });

    it('allows removing a known-only MCP block', async () => {
      mockPrimaryConfig(`registry: https://example.com
agents:
  - cursor
skills:
  typescript:
    ref: typescript-v1.3.3
workflows_ref: workflows-v1.0.0
mcp:
  enabled: false
  scope: snippets-only
  prompted: true
`);
      const snapshot = await configService.readSnapshot(mockCwd);
      if (!snapshot) throw new Error('expected configuration snapshot');

      await configService.saveReviewedConfig(
        snapshot,
        { ...snapshot.config, mcp: undefined },
        mockCwd,
      );

      const persisted = persistedDocument();

      expect(persisted).not.toHaveProperty('mcp');
      expect(persisted.workflows_ref).toBe('workflows-v1.0.0');
    });
  });
});
