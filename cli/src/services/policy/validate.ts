import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { normalizePath } from './match';
import { PolicyDocument } from './schema';

export function validatePolicy(
  doc: PolicyDocument,
  rootDir: string,
): { conflicts: string[]; stale: string[] } {
  const conflicts: string[] = [];
  const stale: string[] = [];

  const pathPatterns = new Map<string, Array<{ id: string; action: string }>>();
  const commandExecutables = new Map<
    string,
    Array<{ id: string; action: string; rewrite_to?: string }>
  >();

  for (const rule of doc.rules) {
    if (rule.source.origin === 'compiled' && rule.action === 'block') {
      conflicts.push(`Compiled rule "${rule.id}" cannot have action "block".`);
    }

    if (rule.kind === 'protected_path') {
      for (const rawPat of rule.paths) {
        const pat = normalizePath(rawPat);
        const entries = pathPatterns.get(pat) ?? [];
        entries.push({ id: rule.id, action: rule.action });
        pathPatterns.set(pat, entries);
      }
    } else if (rule.kind === 'command') {
      for (const exe of rule.executables) {
        const entries = commandExecutables.get(exe) ?? [];
        entries.push({
          id: rule.id,
          action: rule.action,
          rewrite_to: rule.action === 'rewrite' ? rule.rewrite_to : undefined,
        });
        commandExecutables.set(exe, entries);
      }
    }

    if (rule.source.origin === 'compiled') {
      if (!rule.source.file) {
        stale.push(`Compiled rule "${rule.id}" is missing source.file.`);
        continue;
      }

      const filePath = path.join(rootDir, rule.source.file);
      if (!fs.existsSync(filePath)) {
        stale.push(
          `Compiled rule "${rule.id}" source file "${rule.source.file}" not found.`,
        );
        continue;
      }

      const lineNum = rule.source.line;
      if (!lineNum || lineNum < 1) {
        stale.push(
          `Compiled rule "${rule.id}" has invalid line number ${lineNum}.`,
        );
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        if (lineNum > lines.length) {
          stale.push(
            `Compiled rule "${rule.id}" line ${lineNum} out of range in "${rule.source.file}" (${lines.length} lines).`,
          );
          continue;
        }

        const currentLine = lines[lineNum - 1];
        const trimmedCurrent = currentLine.trim();
        const currentDigest = crypto
          .createHash('sha256')
          .update(trimmedCurrent)
          .digest('hex');

        let isStale = false;
        if (rule.source.digest && currentDigest !== rule.source.digest) {
          isStale = true;
        } else if (
          rule.source.text &&
          trimmedCurrent !== rule.source.text.trim()
        ) {
          isStale = true;
        }

        if (isStale) {
          stale.push(
            `Compiled rule "${rule.id}" is stale: source text at ${rule.source.file}:${lineNum} has changed.`,
          );
        }
      } catch (err) {
        stale.push(
          `Compiled rule "${rule.id}" could not read source file "${rule.source.file}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  for (const [pat, entries] of pathPatterns) {
    const actions = new Set(entries.map((e) => e.action));
    if (actions.size > 1) {
      const details = entries
        .map((e) => `rule "${e.id}" (${e.action})`)
        .join(', ');
      conflicts.push(
        `Conflicting actions for protected_path pattern "${pat}": ${details}.`,
      );
    }
  }

  for (const [exe, entries] of commandExecutables) {
    const actions = new Set(entries.map((e) => e.action));
    if (actions.size > 1) {
      const details = entries
        .map((e) => `rule "${e.id}" (${e.action})`)
        .join(', ');
      conflicts.push(
        `Conflicting actions for command executable "${exe}": ${details}.`,
      );
      continue;
    }

    const rewriteRules = entries.filter((e) => e.action === 'rewrite');
    if (rewriteRules.length > 1) {
      const targets = new Set(rewriteRules.map((e) => e.rewrite_to));
      if (targets.size > 1) {
        const details = rewriteRules
          .map((e) => `rule "${e.id}" -> "${e.rewrite_to}"`)
          .join(', ');
        conflicts.push(
          `Conflicting rewrite targets for command executable "${exe}": ${details}.`,
        );
      }
    }
  }

  return { conflicts, stale };
}
