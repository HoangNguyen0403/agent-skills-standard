import { describe, expect, it } from 'vitest';
import {
  hasTomlMcpServer,
  removeTomlMcpServer,
  renderTomlMcpServer,
  upsertTomlMcpServer,
} from '../codexTomlMcp';

const N = 'agent-skills-standard';
const E = { command: 'npx', args: ['-y', 'agent-skills-standard-mcp@1.2.3'] };
const TABLE =
  '[mcp_servers.agent-skills-standard]\ncommand = "npx"\nargs = ["-y", "agent-skills-standard-mcp@1.2.3"]\n';

describe('codexTomlMcp', () => {
  it('renders the table', () => {
    expect(renderTomlMcpServer(N, E)).toBe(TABLE);
  });
  it('adds to an empty file', () => {
    expect(upsertTomlMcpServer('', N, E)).toEqual({
      content: TABLE,
      action: 'added',
    });
  });
  it('appends after foreign content, preserving it byte-for-byte', () => {
    const foreign =
      'sandbox_mode = "workspace-write"\n# keep me\n[mcp_servers.other]\ncommand = "x"\n';
    const r = upsertTomlMcpServer(foreign, N, E);
    expect(r.action).toBe('added');
    expect(r.content).toBe(foreign + '\n' + TABLE);
  });
  it('is idempotent', () => {
    const first = upsertTomlMcpServer('a = 1\n', N, E).content;
    expect(upsertTomlMcpServer(first, N, E)).toEqual({
      content: first,
      action: 'skipped-existing',
    });
  });
  it('replaces a stale table and its subtables, keeping foreign tables', () => {
    const stale =
      'a = 1\n\n[mcp_servers.agent-skills-standard]\ncommand = "old"\n\n[mcp_servers.agent-skills-standard.env]\nX = "1"\n\n[mcp_servers.other]\ncommand = "x"\n';
    const r = upsertTomlMcpServer(stale, N, E);
    expect(r.action).toBe('updated');
    expect(r.content).toContain('[mcp_servers.other]\ncommand = "x"\n');
    expect(r.content).not.toContain('command = "old"');
    expect(r.content).not.toContain('.env]');
    expect(r.content.endsWith(TABLE)).toBe(true);
  });
  it('recognizes a quoted table key', () => {
    expect(
      hasTomlMcpServer(
        '[mcp_servers."agent-skills-standard"]\ncommand = "x"\n',
        N,
      ),
    ).toBe(true);
  });
  it('removes only our tables', () => {
    const r = removeTomlMcpServer('a = 1\n' + TABLE + '[b]\nc = 2\n', N);
    expect(r).toEqual({ content: 'a = 1\n[b]\nc = 2\n', removed: true });
    expect(removeTomlMcpServer('a = 1\n', N)).toEqual({
      content: 'a = 1\n',
      removed: false,
    });
  });
  it('escapes quotes and backslashes in args', () => {
    expect(
      renderTomlMcpServer(N, { command: 'n"px', args: ['a\\b'] }),
    ).toContain('command = "n\\"px"\nargs = ["a\\\\b"]');
  });
});
