import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HarnessSetupService } from '../../HarnessSetupService';
import {
  FleetPolicyService,
  matchesPathPrefix,
  resolveLogicalProjectId,
  resolveProjectAuthority,
  resolveStackIds,
} from '../FleetPolicyService';
import { RuntimeStore } from '../RuntimeStore';
import {
  FleetConfig,
  FleetProject,
  HarnessError,
  policyDigest,
} from '../RuntimeTypes';
import { createFleetTestConfig } from './FleetTestFixtures';

describe('FleetPolicyService', () => {
  let tempBaseDir: string;
  let stateDir: string;
  let testWorkspace: string;
  let store: RuntimeStore;
  let policyService: FleetPolicyService;

  beforeEach(async () => {
    tempBaseDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ags-policy-test-'),
    );
    stateDir = path.join(tempBaseDir, 'harness-state');
    testWorkspace = path.join(tempBaseDir, 'workspace');

    await fs.mkdirp(path.join(testWorkspace, 'personal', 'project-a'));
    await fs.mkdirp(
      path.join(testWorkspace, 'personal', 'airgapped', 'project-b'),
    );
    await fs.mkdirp(path.join(testWorkspace, 'vmo', 'project-c'));
    await fs.mkdirp(path.join(testWorkspace, 'private-outside', 'project-d'));

    const setupService = new HarnessSetupService(stateDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    });

    store = new RuntimeStore(stateDir, setupService);
    policyService = new FleetPolicyService(store);
  });

  afterEach(async () => {
    await fs.remove(tempBaseDir);
  });

  describe('matchesPathPrefix', () => {
    it('matches exact and nested segment boundaries', () => {
      expect(matchesPathPrefix('/a/b', '/a/b')).toBe(true);
      expect(matchesPathPrefix('/a/b/c', '/a/b')).toBe(true);
      expect(matchesPathPrefix('/a/b/c/d', '/a/b')).toBe(true);
    });

    it('rejects partial segment matches', () => {
      expect(matchesPathPrefix('/a/b-other', '/a/b')).toBe(false);
      expect(matchesPathPrefix('/a/bc', '/a/b')).toBe(false);
    });
  });

  describe('configure and load', () => {
    it('persists and loads FleetConfig atomically', async () => {
      const cfg = createFleetTestConfig(testWorkspace);
      await policyService.configure(cfg);

      const loaded = await policyService.load();
      expect(loaded.schemaVersion).toBe(1);
      expect(loaded.generation).toBe(1);
    });

    it('rejects stale or equal generation updates atomically (C5)', async () => {
      const cfg1 = createFleetTestConfig(testWorkspace, { generation: 5 });
      await policyService.configure(cfg1);

      const cfgStale = createFleetTestConfig(testWorkspace, { generation: 5 });
      await expect(policyService.configure(cfgStale)).rejects.toThrow(
        HarnessError,
      );

      const cfgOlder = createFleetTestConfig(testWorkspace, { generation: 4 });
      await expect(policyService.configure(cfgOlder)).rejects.toThrow(
        HarnessError,
      );

      const cfgNew = createFleetTestConfig(testWorkspace, { generation: 6 });
      await expect(policyService.configure(cfgNew)).resolves.not.toThrow();
    });
  });

  describe('resolve', () => {
    let cfg: FleetConfig;

    beforeEach(() => {
      cfg = createFleetTestConfig(testWorkspace, {
        accounts: [
          {
            id: 'acc-personal',
            provider: 'codex',
            model: 'gpt-5.4',
            thinking: 'standard',
            environmentKeys: ['OPENAI_API_KEY'],
            allowedDomains: ['personal'],
            allowedProviderEndpoints: ['https://api.openai.com/v1'],
          },
          {
            id: 'acc-restricted',
            provider: 'vmo',
            model: 'restricted-vmo-1',
            thinking: 'high',
            environmentKeys: ['VMO_KEY'],
            allowedDomains: ['vmo-internal'],
            allowedProviderEndpoints: ['https://api.vmo.com'],
          },
        ],
        domains: [
          {
            id: 'personal',
            hostIds: ['*'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
          },
          {
            id: 'vmo-internal',
            hostIds: ['host-vmo', '*'],
            pathPrefixes: [path.join(testWorkspace, 'vmo')],
          },
        ],
        rules: [
          {
            id: 'rule-personal',
            domain: 'personal',
            hostIds: ['*'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
            accountId: 'acc-personal',
            enabled: true,
            allowModelData: true,
          },
          {
            id: 'rule-personal-disabled-narrow',
            domain: 'personal',
            hostIds: ['*'],
            pathPrefixes: [path.join(testWorkspace, 'personal', 'airgapped')],
            accountId: 'acc-personal',
            enabled: false, // Explicitly disabled narrower rule (C3)
            allowModelData: true,
          },
          {
            id: 'rule-vmo',
            domain: 'vmo-internal',
            hostIds: ['*'],
            pathPrefixes: [path.join(testWorkspace, 'vmo')],
            accountId: 'acc-restricted',
            enabled: true,
            allowModelData: true,
          },
        ],
        projectAliases: [
          {
            hostId: 'host-1',
            projectId: 'project-a',
            logicalProjectId: 'logical-proj-a',
            domain: 'personal',
            accountId: 'acc-personal',
          },
        ],
      });
    });

    it('resolves eligible domain, rule, and account for a canonical project', async () => {
      await policyService.configure(cfg);

      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-a',
        rootPath: path.join(testWorkspace, 'personal', 'project-a'),
        logicalProjectId: 'logical-proj-a',
      };

      const result = await policyService.resolve(project);
      expect(result.domain).toBe('personal');
      expect(result.account.id).toBe('acc-personal');
      expect(result.policyDigest).toBe(policyDigest(cfg));
    });

    it('rejects symlink facade from personal path into outside directory (C2)', async () => {
      await policyService.configure(cfg);

      // Symlink located inside personal workspace pointing outside to unauthorized private directory
      const symlinkPath = path.join(
        testWorkspace,
        'personal',
        'symlink-to-outside',
      );
      const targetOutside = path.join(
        testWorkspace,
        'private-outside',
        'project-d',
      );
      await fs.promises.symlink(targetOutside, symlinkPath);

      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-d',
        rootPath: symlinkPath,
        logicalProjectId: 'host-1:project-d',
      };

      // Must NOT be authorized by personal domain; must resolve canonical root which is outside
      await expect(policyService.resolve(project)).rejects.toMatchObject({
        code: 'DOMAIN_NOT_FOUND',
      });
    });

    it('rejects ancestor symlinks that escape the authorized domain (C2)', async () => {
      await policyService.configure(cfg);

      const bridgePath = path.join(testWorkspace, 'personal', 'bridge');
      const targetOutside = path.join(testWorkspace, 'private-outside');
      await fs.promises.symlink(targetOutside, bridgePath);

      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-d',
        rootPath: path.join(bridgePath, 'project-d'),
        logicalProjectId: 'host-1:project-d',
      };

      // The ancestor symlink target is outside every authorized domain prefix.
      await expect(policyService.resolve(project)).rejects.toMatchObject({
        code: 'DOMAIN_NOT_FOUND',
      });
    });

    it('denies ambiguous symlinked policy prefixes instead of widening authority', async () => {
      const symlinkedDomainPath = path.join(testWorkspace, 'personal-link');
      await fs.promises.symlink(
        path.join(testWorkspace, 'personal'),
        symlinkedDomainPath,
      );

      const ambiguous = createFleetTestConfig(testWorkspace, {
        domains: [
          {
            id: 'personal',
            hostIds: ['*'],
            pathPrefixes: [symlinkedDomainPath],
          },
        ],
        rules: [
          {
            id: 'rule-personal',
            domain: 'personal',
            hostIds: ['*'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
            accountId: 'acc-test',
            enabled: true,
            allowModelData: true,
          },
        ],
        projectAliases: [],
      });
      await policyService.configure(ambiguous);

      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-a',
        rootPath: path.join(testWorkspace, 'personal', 'project-a'),
        logicalProjectId: 'host-1:project-a',
      };

      await expect(policyService.resolve(project)).rejects.toMatchObject({
        code: 'AMBIGUOUS_POLICY_PREFIX',
      });
    });

    it('rejects execution when most specific rule is disabled (C3 fail-closed)', async () => {
      await policyService.configure(cfg);

      // Project falls under narrower disabled rule path: personal/airgapped
      const airgappedProject: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-b',
        rootPath: path.join(
          testWorkspace,
          'personal',
          'airgapped',
          'project-b',
        ),
        logicalProjectId: 'host-1:project-b',
      };

      // Must fail closed with RULE_DISABLED and NOT fall back to broader rule-personal allow
      await expect(
        policyService.resolve(airgappedProject),
      ).rejects.toMatchObject({
        code: 'RULE_DISABLED',
      });
    });

    it('rejects unconfigured logicalProjectId mismatch (C4)', async () => {
      await policyService.configure(cfg);

      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-c', // No configured alias for project-c
        rootPath: path.join(testWorkspace, 'vmo', 'project-c'),
        logicalProjectId: 'unconfigured-fake-logical-id', // Does not match projectId
      };

      await expect(policyService.resolve(project)).rejects.toMatchObject({
        code: 'PROJECT_ALIAS_MISMATCH',
      });
    });

    it('rejects alias groups that span domains or accounts (C4)', async () => {
      cfg.projectAliases.push({
        hostId: 'host-vmo',
        projectId: 'project-vmo-checkout',
        logicalProjectId: 'logical-proj-a', // Spans both personal and vmo-internal
        domain: 'vmo-internal',
        accountId: 'acc-restricted',
      });
      await expect(policyService.configure(cfg)).rejects.toMatchObject({
        code: 'CROSS_DOMAIN_ALIAS_CONFLICT',
      });

      const accountConflict = createFleetTestConfig(testWorkspace);
      accountConflict.accounts.push({
        ...accountConflict.accounts[0],
        id: 'acc-other',
      });
      accountConflict.projectAliases.push({
        hostId: 'host-remote',
        projectId: 'project-remote',
        logicalProjectId: 'logical-default',
        domain: 'domain-default',
        accountId: 'acc-other',
      });
      await expect(
        policyService.configure(accountConflict),
      ).rejects.toMatchObject({
        code: 'ALIAS_AUTHORITY_MISMATCH',
      });
    });

    it('keeps the same projectId on different hosts as distinct logical identities (C4)', () => {
      const localProject: FleetProject = {
        hostId: 'host-1',
        projectId: 'repo',
        rootPath: testWorkspace,
        logicalProjectId: 'host-1:repo',
      };
      const remoteProject: FleetProject = {
        hostId: 'host-2',
        projectId: 'repo',
        rootPath: testWorkspace,
        logicalProjectId: 'host-2:repo',
      };

      expect(resolveLogicalProjectId(localProject, cfg)).toBe('host-1:repo');
      expect(resolveLogicalProjectId(remoteProject, cfg)).toBe('host-2:repo');
      expect(resolveLogicalProjectId(localProject, cfg)).not.toBe(
        resolveLogicalProjectId(remoteProject, cfg),
      );
    });

    it('rejects non-existent project roots with PROJECT_ROOT_NOT_FOUND', async () => {
      await policyService.configure(cfg);

      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'ghost',
        rootPath: path.join(testWorkspace, 'nonexistent-directory'),
        logicalProjectId: 'ghost',
      };

      await expect(policyService.resolve(project)).rejects.toMatchObject({
        code: 'PROJECT_ROOT_NOT_FOUND',
      });
    });
  });

  describe('resolveStackIds', () => {
    it('resolves matching stack IDs using segment boundary semantics', () => {
      const cfg = createFleetTestConfig(testWorkspace, {
        stacks: [
          {
            id: 'stack-node',
            hostIds: ['*'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
          },
          {
            id: 'stack-python',
            hostIds: ['host-1'],
            pathPrefixes: [path.join(testWorkspace, 'personal', 'project-a')],
          },
          {
            id: 'stack-other-host',
            hostIds: ['host-remote-only'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
          },
        ],
      });

      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-a',
        rootPath: path.join(testWorkspace, 'personal', 'project-a'),
        logicalProjectId: 'logical-proj-a',
      };

      const stackIds = resolveStackIds(project, cfg);
      expect(stackIds).toEqual(['stack-node', 'stack-python']);
    });
  });

  describe('resolveProjectAuthority', () => {
    it('returns a canonical root and sorted stack IDs for the executing host', async () => {
      const rootPath = path.join(testWorkspace, 'personal', 'project-a');
      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-a',
        rootPath,
        logicalProjectId: 'logical-proj-a',
      };
      const cfg = createFleetTestConfig(testWorkspace, {
        stacks: [
          {
            id: 'stack-z',
            hostIds: ['host-1'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
          },
          {
            id: 'stack-a',
            hostIds: ['*'],
            pathPrefixes: [rootPath],
          },
          {
            id: 'stack-other-host',
            hostIds: ['host-2'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
          },
        ],
      });

      const authority = await resolveProjectAuthority(project, cfg);
      expect(authority).toEqual({
        canonicalRootPath: await fs.promises.realpath(rootPath),
        stackIds: ['stack-a', 'stack-z'],
      });
    });

    it('does not grant lexical facade membership after resolving the physical root', async () => {
      const facade = path.join(testWorkspace, 'personal', 'stack-a-link');
      const target = path.join(testWorkspace, 'vmo', 'project-c');
      await fs.promises.symlink(target, facade);
      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-c',
        rootPath: facade,
        logicalProjectId: 'host-1:project-c',
      };
      const cfg = createFleetTestConfig(testWorkspace, {
        stacks: [
          {
            id: 'stack-a',
            hostIds: ['host-1'],
            pathPrefixes: [path.join(testWorkspace, 'personal')],
          },
        ],
      });

      const authority = await resolveProjectAuthority(project, cfg);
      expect(authority.canonicalRootPath).toBe(
        await fs.promises.realpath(target),
      );
      expect(authority.stackIds).toEqual([]);
    });

    it('rejects ambiguous symlinked stack prefixes', async () => {
      const symlinkedPrefix = path.join(testWorkspace, 'personal-link');
      await fs.promises.symlink(
        path.join(testWorkspace, 'personal'),
        symlinkedPrefix,
      );
      const project: FleetProject = {
        hostId: 'host-1',
        projectId: 'project-a',
        rootPath: path.join(testWorkspace, 'personal', 'project-a'),
        logicalProjectId: 'logical-proj-a',
      };
      const cfg = createFleetTestConfig(testWorkspace, {
        stacks: [
          {
            id: 'stack-link',
            hostIds: ['host-1'],
            pathPrefixes: [symlinkedPrefix],
          },
        ],
      });

      await expect(resolveProjectAuthority(project, cfg)).rejects.toMatchObject(
        {
          code: 'AMBIGUOUS_POLICY_PREFIX',
        },
      );
    });
  });
});
