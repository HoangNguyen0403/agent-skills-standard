import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import {
  CANDIDATES_FILE,
  POLICY_FILE,
  PolicyDocument,
  PolicyRule,
  checkCommand,
  checkPath,
  compilePolicy,
  loadPolicy,
  parsePolicy,
  requiredChecks,
  validatePolicy,
} from '../services/policy';

export interface BuiltinHookRule {
  id: string;
  kind: 'protected_path';
  paths: string[];
  action: 'block';
  reason: string;
  origin: string;
}

export const BUILTIN_HOOK_RULES: BuiltinHookRule[] = [
  {
    id: 'builtin-deny-soul',
    kind: 'protected_path',
    paths: ['SOUL.md'],
    action: 'block',
    reason: 'Identity file (SOUL.md)',
    origin: 'built-in (active with ags hooks install --enforce)',
  },
  {
    id: 'builtin-deny-memory',
    kind: 'protected_path',
    paths: ['MEMORY.md'],
    action: 'block',
    reason: 'Memory file (MEMORY.md)',
    origin: 'built-in (active with ags hooks install --enforce)',
  },
  {
    id: 'builtin-deny-env',
    kind: 'protected_path',
    paths: ['.env', '.env.*'],
    action: 'block',
    reason: 'Environment/secret file (.env*)',
    origin: 'built-in (active with ags hooks install --enforce)',
  },
  {
    id: 'builtin-deny-ssh',
    kind: 'protected_path',
    paths: ['.ssh/**'],
    action: 'block',
    reason: 'SSH key directory (.ssh/)',
    origin: 'built-in (active with ags hooks install --enforce)',
  },
  {
    id: 'builtin-deny-credentials',
    kind: 'protected_path',
    paths: ['credentials*.json', 'credentials*.yaml', 'credentials*.yml'],
    action: 'block',
    reason: 'Credential files (credentials*.json|yaml)',
    origin: 'built-in (active with ags hooks install --enforce)',
  },
];

function defaultGetGitDiffFiles(rootDir: string): string[] {
  try {
    const diff = execSync('git diff --name-only HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const combined = `${diff}\n${untracked}`
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return Array.from(new Set(combined));
  } catch (err) {
    throw new Error(
      `Failed to get git diff: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

export interface PolicyStatusOptions {
  json?: boolean;
}

export interface PolicyCheckOptions {
  path?: string;
  command?: string;
  diff?: boolean;
  noBypass?: boolean;
  json?: boolean;
}

export interface PolicyValidateOptions {
  failOnStale?: boolean;
  json?: boolean;
}

export class PolicyCommand {
  constructor(
    private rootDir: string = process.cwd(),
    private getGitDiffFiles: (
      rootDir: string,
    ) => string[] = defaultGetGitDiffFiles,
    private exit: (code: number) => void = (code) => {
      process.exitCode = code;
    },
    private log: (msg: string) => void = console.log,
    private logError: (msg: string) => void = console.error,
  ) {}

  async status(options: PolicyStatusOptions = {}): Promise<void> {
    const { doc, problems } = await loadPolicy(this.rootDir);

    if (problems.length > 0) {
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.status',
              data: { ok: false, problems },
            },
            null,
            2,
          ),
        );
      } else {
        this.logError(pc.red(`Failed to load policy in ${this.rootDir}:`));
        for (const problem of problems) {
          this.logError(pc.red(`  - ${problem}`));
        }
      }
      this.exit(1);
      return;
    }

    const rules = doc?.rules ?? [];

    if (options.json) {
      this.log(
        JSON.stringify(
          {
            schema_version: 1,
            kind: 'policy.status',
            data: {
              ok: true,
              rules: rules.map((r) => ({
                id: r.id,
                kind: r.kind,
                action: r.action,
                reason: r.reason,
                source: r.source,
              })),
              builtin_rules: BUILTIN_HOOK_RULES,
            },
          },
          null,
          2,
        ),
      );
      return;
    }

    this.log(pc.bold('Project rules in force (.ags/policy.json):'));
    if (rules.length === 0) {
      this.log(pc.gray('  (no rules in force)'));
    } else {
      for (const rule of rules) {
        const originDesc =
          rule.source.origin === 'compiled'
            ? `compiled (${rule.source.file ?? 'unknown'}:${rule.source.line ?? '?'})`
            : 'declared';
        const actionColor =
          rule.action === 'block'
            ? pc.red
            : rule.action === 'rewrite'
              ? pc.cyan
              : pc.yellow;
        let details = '';
        if (rule.kind === 'protected_path') {
          details = ` [${rule.paths.join(', ')}]`;
        } else if (rule.kind === 'command') {
          details = ` [${rule.executables.join(', ')}]`;
        } else if (rule.kind === 'required_check') {
          details = ` [${rule.when_changed.join(', ')}]`;
        }
        this.log(
          `  - ${pc.bold(rule.id)} [${rule.kind}]${details} ${actionColor(rule.action)}: ${rule.reason} ${pc.gray(`(${originDesc})`)}`,
        );
      }
    }

    this.log('');
    this.log(
      pc.bold('Built-in hook rules (active with ags hooks install --enforce):'),
    );
    for (const builtin of BUILTIN_HOOK_RULES) {
      this.log(
        `  - ${pc.bold(builtin.id)} [${builtin.kind}] ${pc.red(builtin.action)}: ${builtin.reason} ${pc.gray('(built-in (active with ags hooks install --enforce))')}`,
      );
    }
  }

  async check(options: PolicyCheckOptions = {}): Promise<void> {
    const { doc, problems } = await loadPolicy(this.rootDir);

    if (problems.length > 0) {
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.check',
              data: { ok: false, problems },
            },
            null,
            2,
          ),
        );
      } else {
        this.logError(pc.red(`Failed to load policy: ${problems.join('; ')}`));
      }
      this.exit(1);
      return;
    }

    const effectiveDoc = doc ?? { schema_version: 1, rules: [] };
    const bypassOpts = options.noBypass ? { bypass: false } : undefined;

    if (options.diff) {
      let changedFiles: string[];
      try {
        changedFiles = this.getGitDiffFiles(this.rootDir);
      } catch (err) {
        if (options.json) {
          this.log(
            JSON.stringify(
              {
                schema_version: 1,
                kind: 'policy.check',
                data: {
                  ok: false,
                  error: err instanceof Error ? err.message : String(err),
                },
              },
              null,
              2,
            ),
          );
        } else {
          this.logError(
            pc.red(err instanceof Error ? err.message : String(err)),
          );
        }
        this.exit(1);
        return;
      }

      const checks = requiredChecks(effectiveDoc, changedFiles);
      const hasBlock = checks.some((c) => c.action === 'block');
      const outcome = hasBlock ? 'block' : checks.length > 0 ? 'warn' : 'allow';

      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.check',
              data: {
                type: 'diff',
                changed_files: changedFiles,
                checks,
                outcome,
              },
            },
            null,
            2,
          ),
        );
      } else if (checks.length === 0) {
        this.log(pc.green('✓ No required checks for changed files.'));
      } else {
        for (const check of checks) {
          const color = check.action === 'block' ? pc.red : pc.yellow;
          const label = check.action === 'block' ? 'Required' : 'Suggested';
          const msg = color(
            `${label} check [${check.id}]: ${check.reason} -> ${check.checks.join('; ')}`,
          );
          if (check.action === 'block') {
            this.logError(msg);
          } else {
            this.log(msg);
          }
        }
      }

      if (outcome === 'block') {
        this.exit(1);
      }
      return;
    }

    if (options.path !== undefined) {
      const decision = checkPath(effectiveDoc, options.path, bypassOpts);

      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.check',
              data: {
                type: 'path',
                path: options.path,
                ...decision,
              },
            },
            null,
            2,
          ),
        );
      } else {
        if (decision.outcome === 'block') {
          this.logError(pc.red(`❌ Blocked: ${options.path}`));
          for (const m of decision.matched) {
            this.logError(pc.red(`   [${m.id}] ${m.reason}`));
          }
        } else if (decision.outcome === 'warn') {
          this.log(pc.yellow(`⚠️ Warning: ${options.path}`));
          for (const m of decision.matched) {
            this.log(pc.yellow(`   [${m.id}] ${m.reason}`));
          }
        } else {
          this.log(pc.green(`✓ Allowed: ${options.path}`));
        }

        if (decision.bypassed) {
          this.log(
            pc.gray(
              `(Bypassed: waived ${decision.waived.join(', ') || 'none'})`,
            ),
          );
        }
      }

      if (decision.outcome === 'block') {
        this.exit(1);
      }
      return;
    }

    if (options.command !== undefined) {
      const decision = checkCommand(effectiveDoc, options.command, bypassOpts);

      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.check',
              data: {
                type: 'command',
                command: options.command,
                ...decision,
              },
            },
            null,
            2,
          ),
        );
      } else {
        if (decision.outcome === 'block') {
          this.logError(pc.red(`❌ Blocked: ${options.command}`));
          for (const m of decision.matched) {
            this.logError(pc.red(`   [${m.id}] ${m.reason}`));
          }
        } else if (decision.outcome === 'rewrite') {
          this.log(
            pc.cyan(`↻ Rewrite: ${options.command} -> ${decision.rewrite_to}`),
          );
          for (const m of decision.matched) {
            this.log(pc.cyan(`   [${m.id}] ${m.reason}`));
          }
        } else if (decision.outcome === 'warn') {
          this.log(pc.yellow(`⚠️ Warning: ${options.command}`));
          for (const m of decision.matched) {
            this.log(pc.yellow(`   [${m.id}] ${m.reason}`));
          }
        } else {
          this.log(pc.green(`✓ Allowed: ${options.command}`));
        }

        if (decision.bypassed) {
          this.log(
            pc.gray(
              `(Bypassed: waived ${decision.waived.join(', ') || 'none'})`,
            ),
          );
        }
      }

      if (decision.outcome === 'block') {
        this.exit(1);
      }
      return;
    }

    const err = 'One of --path, --command, or --diff is required.';
    if (options.json) {
      this.log(
        JSON.stringify(
          {
            schema_version: 1,
            kind: 'policy.check',
            data: { ok: false, error: err },
          },
          null,
          2,
        ),
      );
    } else {
      this.logError(pc.red(err));
    }
    this.exit(1);
  }

  async validate(options: PolicyValidateOptions = {}): Promise<void> {
    const { doc, problems } = await loadPolicy(this.rootDir);

    if (problems.length > 0) {
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.validate',
              data: {
                ok: false,
                problems,
                conflicts: problems,
                stale: [],
              },
            },
            null,
            2,
          ),
        );
      } else {
        this.logError(pc.red('Policy validation failed:'));
        for (const problem of problems) {
          this.logError(pc.red(`  - ${problem}`));
        }
      }
      this.exit(1);
      return;
    }

    if (!doc) {
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.validate',
              data: {
                ok: true,
                conflicts: [],
                stale: [],
                message: 'No policy file present.',
              },
            },
            null,
            2,
          ),
        );
      } else {
        this.log(pc.green('No policy file present. Nothing to validate.'));
      }
      return;
    }

    const validation = validatePolicy(doc, this.rootDir);
    const hasConflicts = validation.conflicts.length > 0;
    const hasStale = validation.stale.length > 0;
    const fail = hasConflicts || (Boolean(options.failOnStale) && hasStale);

    if (options.json) {
      this.log(
        JSON.stringify(
          {
            schema_version: 1,
            kind: 'policy.validate',
            data: {
              ok: !fail,
              conflicts: validation.conflicts,
              stale: validation.stale,
            },
          },
          null,
          2,
        ),
      );
    } else {
      if (hasConflicts) {
        this.logError(pc.red('Conflicts detected in policy:'));
        for (const conflict of validation.conflicts) {
          this.logError(pc.red(`  - ${conflict}`));
        }
      }
      if (hasStale) {
        const staleLog = options.failOnStale ? this.logError : this.log;
        const color = options.failOnStale ? pc.red : pc.yellow;
        staleLog(color('Stale compiled rules detected:'));
        for (const item of validation.stale) {
          staleLog(color(`  - ${item}`));
        }
      }
      if (!fail) {
        this.log(pc.green('✓ Policy valid.'));
      }
    }

    if (fail) {
      this.exit(1);
    }
  }
  async compile(options: { json?: boolean } = {}): Promise<void> {
    const { candidates } = await compilePolicy(this.rootDir);

    if (options.json) {
      this.log(
        JSON.stringify(
          {
            schema_version: 1,
            kind: 'policy.compile',
            data: {
              count: candidates.length,
              file: CANDIDATES_FILE,
              rules: candidates,
            },
          },
          null,
          2,
        ),
      );
      return;
    }

    this.log(
      pc.green(
        `Found ${candidates.length} candidate rule(s) from AGENTS.md / CLAUDE.md.`,
      ),
    );
    this.log(
      pc.gray(
        `Written to ${CANDIDATES_FILE}. Use 'ags policy adopt <id...>' to activate.`,
      ),
    );
    for (const rule of candidates) {
      this.log(
        `  - ${pc.bold(rule.id)} [${rule.kind}] (${rule.action}): ${rule.reason}`,
      );
    }
  }

  async adopt(ids: string[], options: { json?: boolean } = {}): Promise<void> {
    if (!ids || ids.length === 0) {
      const err = 'At least one rule id is required to adopt.';
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.adopt',
              data: { ok: false, error: err },
            },
            null,
            2,
          ),
        );
      } else {
        this.logError(pc.red(err));
      }
      this.exit(1);
      return;
    }

    const candPath = path.join(this.rootDir, CANDIDATES_FILE);
    if (!(await fs.pathExists(candPath))) {
      const err = `No candidates file found at ${CANDIDATES_FILE}. Run 'ags policy compile' first.`;
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.adopt',
              data: { ok: false, error: err },
            },
            null,
            2,
          ),
        );
      } else {
        this.logError(pc.red(err));
      }
      this.exit(1);
      return;
    }

    let candDoc: PolicyDocument;
    try {
      const candRaw = await fs.readJson(candPath);
      const parsedCand = parsePolicy(candRaw);
      if (!parsedCand.ok) {
        throw new Error(parsedCand.errors.join('; '));
      }
      candDoc = parsedCand.doc;
    } catch (err) {
      const msg = `Failed to parse ${CANDIDATES_FILE}: ${err instanceof Error ? err.message : String(err)}`;
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.adopt',
              data: { ok: false, error: msg },
            },
            null,
            2,
          ),
        );
      } else {
        this.logError(pc.red(msg));
      }
      this.exit(1);
      return;
    }

    const polPath = path.join(this.rootDir, POLICY_FILE);
    let existingDoc: PolicyDocument = { schema_version: 1, rules: [] };
    if (await fs.pathExists(polPath)) {
      try {
        const polRaw = await fs.readJson(polPath);
        const parsedPol = parsePolicy(polRaw);
        if (!parsedPol.ok) {
          throw new Error(parsedPol.errors.join('; '));
        }
        existingDoc = parsedPol.doc;
      } catch (err) {
        const msg = `Cannot adopt: existing ${POLICY_FILE} is invalid: ${err instanceof Error ? err.message : String(err)}`;
        if (options.json) {
          this.log(
            JSON.stringify(
              {
                schema_version: 1,
                kind: 'policy.adopt',
                data: { ok: false, error: msg },
              },
              null,
              2,
            ),
          );
        } else {
          this.logError(pc.red(msg));
        }
        this.exit(1);
        return;
      }
    }

    const adoptedRules: PolicyRule[] = [];
    for (const id of ids) {
      const candidate = candDoc.rules.find((r) => r.id === id);
      if (!candidate) {
        const msg = `Candidate id "${id}" not found in ${CANDIDATES_FILE}.`;
        if (options.json) {
          this.log(
            JSON.stringify(
              {
                schema_version: 1,
                kind: 'policy.adopt',
                data: { ok: false, error: msg },
              },
              null,
              2,
            ),
          );
        } else {
          this.logError(pc.red(msg));
        }
        this.exit(1);
        return;
      }

      if (existingDoc.rules.some((r) => r.id === id)) {
        const msg = `Rule id "${id}" already exists in ${POLICY_FILE}.`;
        if (options.json) {
          this.log(
            JSON.stringify(
              {
                schema_version: 1,
                kind: 'policy.adopt',
                data: { ok: false, error: msg },
              },
              null,
              2,
            ),
          );
        } else {
          this.logError(pc.red(msg));
        }
        this.exit(1);
        return;
      }

      adoptedRules.push(candidate);
    }

    const proposedDoc: PolicyDocument = {
      schema_version: 1,
      rules: [...existingDoc.rules, ...adoptedRules],
    };

    const validation = validatePolicy(proposedDoc, this.rootDir);
    if (validation.conflicts.length > 0) {
      if (options.json) {
        this.log(
          JSON.stringify(
            {
              schema_version: 1,
              kind: 'policy.adopt',
              data: {
                ok: false,
                error: 'Cannot adopt: resulting policy would have conflicts.',
                conflicts: validation.conflicts,
              },
            },
            null,
            2,
          ),
        );
      } else {
        this.logError(
          pc.red('Cannot adopt: resulting policy would have conflicts:'),
        );
        for (const conflict of validation.conflicts) {
          this.logError(pc.red(`  - ${conflict}`));
        }
      }
      this.exit(1);
      return;
    }

    await fs.ensureDir(path.dirname(polPath));
    await fs.writeJson(polPath, proposedDoc, { spaces: 2 });

    candDoc.rules = candDoc.rules.filter((r) => !ids.includes(r.id));
    await fs.writeJson(candPath, candDoc, { spaces: 2 });

    if (options.json) {
      this.log(
        JSON.stringify(
          {
            schema_version: 1,
            kind: 'policy.adopt',
            data: { ok: true, adopted: ids },
          },
          null,
          2,
        ),
      );
    } else {
      this.log(
        pc.green(`✓ Adopted ${ids.length} rule(s) into ${POLICY_FILE}.`),
      );
    }
  }
}
