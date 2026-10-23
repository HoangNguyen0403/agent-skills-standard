import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { Agent } from '../../constants';
import { HookService } from '../HookService';
import { McpConfigService } from '../McpConfigService';

const AGENTS = Object.values(Agent);

describe('capability config golden', () => {
  it.each(['darwin', 'linux', 'win32'] as const)(
    'mcp targets on %s',
    (platform) => {
      const original = process.platform;
      Object.defineProperty(process, 'platform', { value: platform });
      try {
        const svc = new McpConfigService();
        svc.setHomeForTesting('/home/u');
        // The target table is internal to the service; only the rendered configs are public.
        const internals = svc as unknown as { getTargets(): unknown };
        const targets = internals.getTargets();
        expect(JSON.parse(JSON.stringify(targets))).toMatchSnapshot();
      } finally {
        Object.defineProperty(process, 'platform', { value: original });
      }
    },
  );

  it('hook install file sets', async () => {
    const result: Record<string, unknown> = {};
    for (const agent of AGENTS) {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-hooks-'));
      try {
        const report = await new HookService().install({
          rootDir: root,
          agents: [agent],
        });
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
