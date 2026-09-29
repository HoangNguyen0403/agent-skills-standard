import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { CANDIDATES_FILE } from './load';
import { PolicyDocument, PolicyRule } from './schema';

const PROTECT_RE =
  /(?:never|do not|don't)\s+(?:edit|modify|change|touch|write to)\s+`([^`]+)`/i;

const REWRITE_RE =
  /(?:^|\b)use\s+(?:`([^`]+)`|([a-zA-Z0-9_-]+))\s+instead\s+of\s+(?:`([^`]+)`|([a-zA-Z0-9_-]+))/i;

const CHECK_RE =
  /(?:^|\b)(?:run|must run)\s+`([^`]+)`\s+(?:after|when)\s+(?:changing|editing|modifying)\s+`([^`]+)`/i;

function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item';
}

function deduplicateId(seenIds: Set<string>, baseId: string): string {
  let id = baseId;
  let counter = 2;
  while (seenIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }
  seenIds.add(id);
  return id;
}

function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function compileRulesFromText(
  content: string,
  filename: string,
  seenIds: Set<string> = new Set<string>(),
): PolicyRule[] {
  const rules: PolicyRule[] = [];
  const lines = content.split(/\r?\n/);
  let inCodeBlock = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || !trimmed) {
      continue;
    }

    const lineNum = idx + 1;
    const digest = sha256Hex(trimmed);

    const protectMatch = trimmed.match(PROTECT_RE);
    if (protectMatch) {
      const glob = protectMatch[1].trim();
      const id = deduplicateId(seenIds, `protect-${slugify(glob)}`);
      rules.push({
        id,
        kind: 'protected_path',
        paths: [glob],
        action: 'warn',
        reason: trimmed,
        source: {
          origin: 'compiled',
          file: filename,
          line: lineNum,
          text: trimmed,
          digest,
        },
      });
      continue;
    }

    const rewriteMatch = trimmed.match(REWRITE_RE);
    if (rewriteMatch) {
      const target = (rewriteMatch[1] ?? rewriteMatch[2]).trim();
      const exe = (rewriteMatch[3] ?? rewriteMatch[4]).trim();
      const id = deduplicateId(
        seenIds,
        `use-${slugify(target)}-not-${slugify(exe)}`,
      );
      rules.push({
        id,
        kind: 'command',
        executables: [exe],
        action: 'rewrite',
        rewrite_to: target,
        reason: trimmed,
        source: {
          origin: 'compiled',
          file: filename,
          line: lineNum,
          text: trimmed,
          digest,
        },
      });
      continue;
    }

    const checkMatch = trimmed.match(CHECK_RE);
    if (checkMatch) {
      const command = checkMatch[1].trim();
      const glob = checkMatch[2].trim();
      const id = deduplicateId(seenIds, `check-${slugify(glob)}`);
      rules.push({
        id,
        kind: 'required_check',
        when_changed: [glob],
        checks: [command],
        action: 'warn',
        reason: trimmed,
        source: {
          origin: 'compiled',
          file: filename,
          line: lineNum,
          text: trimmed,
          digest,
        },
      });
      continue;
    }
  }

  return rules;
}

export async function compilePolicy(
  rootDir: string,
): Promise<{ candidates: PolicyRule[]; written: boolean }> {
  const targetFiles = ['AGENTS.md', 'CLAUDE.md'];
  const candidates: PolicyRule[] = [];
  const seenIds = new Set<string>();

  for (const filename of targetFiles) {
    const filePath = path.join(rootDir, filename);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf8');
      const compiled = compileRulesFromText(content, filename, seenIds);
      candidates.push(...compiled);
    }
  }

  const doc: PolicyDocument = {
    schema_version: 1,
    rules: candidates,
  };

  const candidatesPath = path.join(rootDir, CANDIDATES_FILE);
  await fs.ensureDir(path.dirname(candidatesPath));
  await fs.writeJson(candidatesPath, doc, { spaces: 2 });

  return { candidates, written: true };
}
