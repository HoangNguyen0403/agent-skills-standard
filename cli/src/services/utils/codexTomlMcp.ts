import { escapeTomlString } from './tomlEscape';

export interface McpServerEntry {
  command: string;
  args: string[];
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
