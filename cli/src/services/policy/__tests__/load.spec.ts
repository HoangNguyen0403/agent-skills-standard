import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPolicy, POLICY_FILE } from '../load';

describe('policy load', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-load-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('returns doc null and empty problems when file is missing', async () => {
    const result = await loadPolicy(tempDir);
    expect(result.doc).toBeNull();
    expect(result.problems).toEqual([]);
  });

  it('loads valid policy file successfully', async () => {
    const policyPath = path.join(tempDir, POLICY_FILE);
    await fs.ensureDir(path.dirname(policyPath));
    await fs.writeJson(policyPath, {
      schema_version: 1,
      rules: [
        {
          id: 'rule-1',
          kind: 'protected_path',
          paths: ['secret/**'],
          action: 'block',
          reason: 'No secret edits',
          source: { origin: 'declared' },
        },
      ],
    });

    const result = await loadPolicy(tempDir);
    expect(result.doc).not.toBeNull();
    expect(result.doc?.rules).toHaveLength(1);
    expect(result.problems).toEqual([]);
  });

  it('returns doc null and problems for invalid JSON', async () => {
    const policyPath = path.join(tempDir, POLICY_FILE);
    await fs.ensureDir(path.dirname(policyPath));
    await fs.writeFile(policyPath, '{ invalid json');

    const result = await loadPolicy(tempDir);
    expect(result.doc).toBeNull();
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems[0]).toContain('JSON');
  });

  it('returns doc null and problems for schema errors', async () => {
    const policyPath = path.join(tempDir, POLICY_FILE);
    await fs.ensureDir(path.dirname(policyPath));
    await fs.writeJson(policyPath, {
      schema_version: 99,
      rules: [],
    });

    const result = await loadPolicy(tempDir);
    expect(result.doc).toBeNull();
    expect(result.problems.length).toBeGreaterThan(0);
  });

  it('returns doc null and problems when policy has conflicts', async () => {
    const policyPath = path.join(tempDir, POLICY_FILE);
    await fs.ensureDir(path.dirname(policyPath));
    await fs.writeJson(policyPath, {
      schema_version: 1,
      rules: [
        {
          id: 'rule-block',
          kind: 'protected_path',
          paths: ['src/**'],
          action: 'block',
          reason: 'Block',
          source: { origin: 'declared' },
        },
        {
          id: 'rule-warn',
          kind: 'protected_path',
          paths: ['src/**'],
          action: 'warn',
          reason: 'Warn',
          source: { origin: 'declared' },
        },
      ],
    });

    const result = await loadPolicy(tempDir);
    expect(result.doc).toBeNull();
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems[0]).toContain('src/**');
  });
});
