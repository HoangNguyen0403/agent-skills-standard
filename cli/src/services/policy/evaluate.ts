import { matchesPattern } from './match';
import { PolicyAction, PolicyDocument, PolicySource } from './schema';

export interface Decision {
  outcome: 'allow' | 'warn' | 'block' | 'rewrite';
  matched: Array<{
    id: string;
    action: PolicyAction;
    reason: string;
    source: PolicySource;
  }>;
  rewrite_to?: string;
  bypassed: boolean;
  waived: string[];
}

export function bypassFromEnv(env?: NodeJS.ProcessEnv): boolean {
  const currentEnv = env ?? process.env;
  const val = currentEnv.AGS_POLICY_BYPASS;
  return val === '1' || val === 'true';
}

function resolveOutcome(
  matched: Array<{ action: PolicyAction }>,
  bypass: boolean,
): 'allow' | 'warn' | 'block' | 'rewrite' {
  if (bypass) {
    return 'allow';
  }
  if (matched.some((m) => m.action === 'block')) {
    return 'block';
  }
  if (matched.some((m) => m.action === 'rewrite')) {
    return 'rewrite';
  }
  if (matched.some((m) => m.action === 'warn')) {
    return 'warn';
  }
  return 'allow';
}

export function checkPath(
  doc: PolicyDocument,
  relPath: string,
  opts?: { bypass?: boolean },
): Decision {
  const bypass = opts?.bypass ?? bypassFromEnv();
  const matched: Decision['matched'] = [];

  for (const rule of doc.rules) {
    if (rule.kind !== 'protected_path') {
      continue;
    }
    const hit = rule.paths.some((p) => matchesPattern(p, relPath));
    if (hit) {
      matched.push({
        id: rule.id,
        action: rule.action,
        reason: rule.reason,
        source: rule.source,
      });
    }
  }

  const outcome = resolveOutcome(matched, bypass);
  return {
    outcome,
    matched,
    bypassed: bypass,
    waived: bypass ? matched.map((m) => m.id) : [],
  };
}

export function checkCommand(
  doc: PolicyDocument,
  executable: string,
  opts?: { bypass?: boolean },
): Decision {
  const bypass = opts?.bypass ?? bypassFromEnv();
  const matched: Decision['matched'] = [];
  let rewriteTo: string | undefined;

  for (const rule of doc.rules) {
    if (rule.kind !== 'command') {
      continue;
    }
    if (rule.executables.includes(executable)) {
      matched.push({
        id: rule.id,
        action: rule.action,
        reason: rule.reason,
        source: rule.source,
      });
      if (rule.action === 'rewrite' && !rewriteTo) {
        rewriteTo = rule.rewrite_to;
      }
    }
  }

  const outcome = resolveOutcome(matched, bypass);
  return {
    outcome,
    matched,
    rewrite_to: rewriteTo,
    bypassed: bypass,
    waived: bypass ? matched.map((m) => m.id) : [],
  };
}

export function requiredChecks(
  doc: PolicyDocument,
  changedPaths: string[],
): Array<{
  id: string;
  action: 'block' | 'warn';
  checks: string[];
  reason: string;
}> {
  const result: Array<{
    id: string;
    action: 'block' | 'warn';
    checks: string[];
    reason: string;
  }> = [];

  for (const rule of doc.rules) {
    if (rule.kind !== 'required_check') {
      continue;
    }
    const hit = rule.when_changed.some((pattern) =>
      changedPaths.some((changedPath) => matchesPattern(pattern, changedPath)),
    );
    if (hit) {
      result.push({
        id: rule.id,
        action: rule.action,
        checks: rule.checks,
        reason: rule.reason,
      });
    }
  }

  return result;
}
