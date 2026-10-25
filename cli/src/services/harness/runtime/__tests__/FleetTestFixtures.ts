import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { FleetConfig } from '../RuntimeTypes';

export interface TestKeys {
  approverPublic: string;
  coordinatorPublic: string;
  workerPublic: string;
}

/**
 * Generates synthetic Ed25519 keys strictly distinct across approver, coordinator, and worker roles.
 */
export function generateTestKeys(): TestKeys {
  const approverPair = crypto.generateKeyPairSync('ed25519');
  const coordPair = crypto.generateKeyPairSync('ed25519');
  const workerPair = crypto.generateKeyPairSync('ed25519');

  return {
    approverPublic: approverPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
    coordinatorPublic: coordPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
    workerPublic: workerPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
  };
}

/**
 * Creates a fully valid FleetConfig with complete schema fields, valid distinct keys,
 * and absolute directory boundaries for test harnesses.
 */
export function createFleetTestConfig(
  workspaceRoot: string,
  overrides?: Partial<FleetConfig>,
  testKeys?: TestKeys,
): FleetConfig {
  // Policy authority is canonical-only: fixture roots must match realpath output.
  let normRoot = path.resolve(workspaceRoot);
  try {
    normRoot = fs.realpathSync(normRoot);
  } catch {
    // Roots created after fixture construction are matched when they exist.
  }
  const keys = testKeys ?? generateTestKeys();

  const base: FleetConfig = {
    schemaVersion: 1,
    generation: 1,
    runtime: {
      nodeCommand: '/usr/local/bin/node',
      bunCommand: '/usr/local/bin/bun',
      sdkModule: '/opt/sdk/index.js',
      dockerCommand: '/usr/local/bin/docker',
      image: 'ags-fleet-worker:latest',
      ompVersion: '0.13.0',
      sdkDigest: 'sha256-sdk-digest-mock',
      gitCommand: '/usr/bin/git',
      manifestFile: path.join(normRoot, 'manifest.json'),
      manifestDigest: 'sha256-manifest-digest-mock',
    },
    accounts: [
      {
        id: 'acc-test',
        provider: 'codex',
        model: 'gpt-5.4',
        thinking: 'standard',
        environmentKeys: ['OPENAI_API_KEY'],
        allowedDomains: ['domain-default', 'personal'],
        allowedProviderEndpoints: ['https://api.openai.com/v1'],
      },
    ],
    domains: [
      {
        id: 'domain-default',
        hostIds: ['host-local', '*'],
        pathPrefixes: [normRoot],
      },
    ],
    stacks: [
      {
        id: 'stack-default',
        hostIds: ['*'],
        pathPrefixes: [normRoot],
      },
    ],
    rules: [
      {
        id: 'rule-default',
        domain: 'domain-default',
        hostIds: ['*'],
        pathPrefixes: [normRoot],
        accountId: 'acc-test',
        enabled: true,
        allowModelData: true,
      },
    ],
    projectAliases: [
      {
        hostId: 'host-local',
        projectId: 'project-default',
        logicalProjectId: 'logical-default',
        domain: 'domain-default',
        accountId: 'acc-test',
      },
    ],
    limits: {
      maxConcurrent: 4,
      maxAttempts: 10,
      maxDurationMs: 300000,
      maxToolCalls: 50,
      perHost: 2,
      perProject: 2,
      perAccount: 2,
    },
    approvers: [
      {
        id: 'approver-1',
        publicKey: keys.approverPublic,
      },
    ],
    coordinators: [
      {
        id: 'coordinator-1',
        publicKey: keys.coordinatorPublic,
      },
    ],
    hosts: [
      {
        serverId: 'host-local',
        nodeCommand: '/usr/local/bin/node',
        cliPath: '/opt/ags/dist/index.js',
        stateDir: path.join(normRoot, 'state'),
        workspaceId: 'ws-default',
        workerPublicKey: keys.workerPublic,
        signingKeyFile: path.join(normRoot, 'worker.key'),
      },
    ],
    evaluation: {
      minImprovement: 0.05,
      maxRegressions: 0,
    },
  };

  return {
    ...base,
    ...overrides,
    limits: {
      ...base.limits,
      ...(overrides?.limits ?? {}),
    },
    runtime: {
      ...base.runtime,
      ...(overrides?.runtime ?? {}),
    },
  };
}
