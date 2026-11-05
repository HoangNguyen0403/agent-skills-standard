import { escapeTomlString } from './tomlEscape';

export interface McpServerEntry {
  command: string;
  args: string[];
}

/** Structural equality for the server entry we generate and re-read. */
export function sameMcpEntry(a: McpServerEntry, b: McpServerEntry): boolean {
  return (
    a.command === b.command &&
    a.args.length === b.args.length &&
    a.args.every((arg, index) => arg === b.args[index])
  );
}

// Matches `[table]` and `[[array.of.tables]]` header lines.
// Known limit: a header-looking line inside a multi-line string is treated as a header.
const HEADER_RE = /^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*(#.*)?$/;

function normalizeKey(raw: string): string {
  return raw
    .split('.')
    .map((s) =>
      s
        .trim()
        .replace(/^"(.*)"$/, '$1')
        .replace(/^'(.*)'$/, '$1'),
    )
    .join('.');
}

function isOurTable(key: string, name: string): boolean {
  const base = `mcp_servers.${name}`;
  return key === base || key.startsWith(`${base}.`);
}

/** [start, end) line ranges covering our table and its subtables. */
function findOurRanges(lines: string[], name: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let start: number | null = null;
  lines.forEach((line, i) => {
    const m = HEADER_RE.exec(line);
    if (!m) return;
    const ours = isOurTable(normalizeKey(m[1]), name);
    if (start !== null && !ours) {
      ranges.push([start, i]);
      start = null;
    }
    if (start === null && ours) start = i;
  });
  if (start !== null) ranges.push([start, lines.length]);
  return ranges;
}

function dropRanges(
  lines: string[],
  ranges: Array<[number, number]>,
): string[] {
  const out = [...lines];
  for (const [s, e] of [...ranges].reverse()) out.splice(s, e - s);
  return out;
}

export function renderTomlMcpServer(
  name: string,
  entry: McpServerEntry,
): string {
  const args = entry.args.map((a) => `"${escapeTomlString(a)}"`).join(', ');
  return `[mcp_servers.${name}]\ncommand = "${escapeTomlString(entry.command)}"\nargs = [${args}]\n`;
}

export function hasTomlMcpServer(content: string, name: string): boolean {
  return findOurRanges(content.split('\n'), name).length > 0;
}

function parseTomlStringLiteral(raw: string): string | null {
  const value = raw.trim();
  if (value.length < 2) return null;
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return null;
}

const STRING_TOKEN_RE = /("(?:\\.|[^"\\])*"|'[^']*')/g;

/**
 * Reads the `[mcp_servers.<name>]` table emitted by `renderTomlMcpServer`.
 * Returns null when the table is absent or either `command` / `args` is
 * missing or malformed. Only the exact table block is inspected, so
 * unrelated tables (and subtables) are ignored.
 */
export function readTomlMcpServer(
  content: string,
  name: string,
): McpServerEntry | null {
  const lines = content.split('\n');
  const base = `mcp_servers.${name}`;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const m = HEADER_RE.exec(lines[i]);
    if (m && normalizeKey(m[1]) === base) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let command: string | null = null;
  let args: string[] | null = null;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (HEADER_RE.test(line)) break;
    const commandMatch =
      /^\s*command\s*=\s*((?:"(?:\\.|[^"\\])*")|(?:'[^']*'))\s*(?:#.*)?$/.exec(
        line,
      );
    if (commandMatch) {
      command = parseTomlStringLiteral(commandMatch[1]);
      continue;
    }
    const argsMatch = /^\s*args\s*=\s*\[(.*)\]\s*(?:#.*)?$/.exec(line);
    if (argsMatch) {
      const tokens = argsMatch[1].match(STRING_TOKEN_RE) ?? [];
      const remainder = argsMatch[1]
        .replace(STRING_TOKEN_RE, '')
        .replace(/[\s,]/g, '');
      if (remainder.length > 0) return null;
      const parsed: string[] = [];
      for (const token of tokens) {
        const value = parseTomlStringLiteral(token);
        if (value === null) return null;
        parsed.push(value);
      }
      args = parsed;
    }
  }

  if (command === null || args === null) return null;
  return { command, args };
}

export function removeTomlMcpServer(
  content: string,
  name: string,
): { content: string; removed: boolean } {
  const lines = content.split('\n');
  const ranges = findOurRanges(lines, name);
  if (ranges.length === 0) return { content, removed: false };
  return { content: dropRanges(lines, ranges).join('\n'), removed: true };
}

export function upsertTomlMcpServer(
  content: string,
  name: string,
  entry: McpServerEntry,
): { content: string; action: 'added' | 'updated' | 'skipped-existing' } {
  const rendered = renderTomlMcpServer(name, entry);
  const lines = content.split('\n');
  const ranges = findOurRanges(lines, name);
  if (ranges.length === 1) {
    const [s, e] = ranges[0];
    if (lines.slice(s, e).join('\n').trim() === rendered.trim()) {
      return { content, action: 'skipped-existing' };
    }
  }
  let base = ranges.length ? dropRanges(lines, ranges).join('\n') : content;
  if (base.length > 0 && !base.endsWith('\n')) base += '\n';
  if (base.length > 0 && !base.endsWith('\n\n')) base += '\n';
  return {
    content: base + rendered,
    action: ranges.length ? 'updated' : 'added',
  };
}
