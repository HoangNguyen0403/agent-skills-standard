import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { Agent, getAgentDefinition } from '../../constants';
import { HookService } from '../HookService';
import { McpConfigService } from '../McpConfigService';

const AGENTS = Object.values(Agent);
const ORIGINAL_KEYS = [
  'id', 'name', 'path', 'ruleFile', 'ruleExtension', 'ruleFileName',
  'frontmatterStyle', 'detectionFiles', 'workflowFormat', 'workflowPath',
  'agentPath', 'hookScriptPath', 'hookConfigPath',
] as const;
const plain = (v: unknown) => JSON.parse(JSON.stringify(v));

describe('capability golden (must never change during T3)', () => {
  it('agent definitions (original fields)', () => {
    const projected = AGENTS.map((a) => {
      const def = getAgentDefinition(a) as unknown as Record<string, unknown>;
      return Object.fromEntries(ORIGINAL_KEYS.filter((k) => k in def).map((k) => [k, def[k]]));
    });
    expect(plain(projected)).toMatchSnapshot();
  });

  it.each(['darwin', 'linux', 'win32'] as const)('mcp targets on %s', (platform) => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: platform });
    try {
      const svc = new McpConfigService();
      svc.setHomeForTesting('/home/u');
      const targets = (svc as unknown as { getTargets(): unknown }).getTargets();
      expect(plain(targets)).toMatchSnapshot();
    } finally {
      Object.defineProperty(process, 'platform', { value: original });
    }
  });

  it('hook install file sets', async () => {
    const result: Record<string, unknown> = {};
    for (const agent of AGENTS) {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-hooks-'));
      try {
        const report = await new HookService().install({ rootDir: root, agents: [agent] });
        result[agent] = {
          writes: report.writes.map((w) => `${w.file}:${w.action}`),
          unsupported: report.unsupported,
        };
      } finally {
        await fs.remove(root);
      }
    }
    expect(result).toMatchSnapshot();
  });
});
