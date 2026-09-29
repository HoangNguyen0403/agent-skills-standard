import fs from "fs-extra";
import { minimatch } from "minimatch";
import path from "path";
import { z } from "zod";

export type PolicyAction = "block" | "warn" | "rewrite";

export interface PolicySource {
  origin: "declared" | "compiled";
  file?: string;
  line?: number;
  text?: string;
  digest?: string;
}

export interface ProtectedPathRule {
  id: string;
  kind: "protected_path";
  paths: string[];
  action: "block" | "warn";
  reason: string;
  source: PolicySource;
}

export interface CommandRule {
  id: string;
  kind: "command";
  executables: string[];
  action: "block" | "warn" | "rewrite";
  rewrite_to?: string;
  reason: string;
  source: PolicySource;
}

export interface RequiredCheckRule {
  id: string;
  kind: "required_check";
  when_changed: string[];
  checks: string[];
  action: "block" | "warn";
  reason: string;
  source: PolicySource;
}

export type PolicyRule = ProtectedPathRule | CommandRule | RequiredCheckRule;

export interface PolicyDocument {
  schema_version: 1;
  rules: PolicyRule[];
}

const idRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const policySourceSchema = z
  .object({
    origin: z.enum(["declared", "compiled"]),
    file: z.string().optional(),
    line: z.number().int().positive().optional(),
    text: z.string().optional(),
    digest: z.string().optional(),
  })
  .strict();

const protectedPathRuleSchema = z
  .object({
    id: z.string().regex(idRegex, "id must match ^[a-z0-9]+(-[a-z0-9]+)*$"),
    kind: z.literal("protected_path"),
    paths: z.array(z.string().min(1)).min(1),
    action: z.enum(["block", "warn"]).default("warn"),
    reason: z.string().min(1),
    source: policySourceSchema,
  })
  .strict();

const commandRuleSchema = z
  .object({
    id: z.string().regex(idRegex, "id must match ^[a-z0-9]+(-[a-z0-9]+)*$"),
    kind: z.literal("command"),
    executables: z.array(z.string().min(1)).min(1),
    action: z.enum(["block", "warn", "rewrite"]).default("warn"),
    rewrite_to: z.string().min(1).optional(),
    reason: z.string().min(1),
    source: policySourceSchema,
  })
  .strict();

const requiredCheckRuleSchema = z
  .object({
    id: z.string().regex(idRegex, "id must match ^[a-z0-9]+(-[a-z0-9]+)*$"),
    kind: z.literal("required_check"),
    when_changed: z.array(z.string().min(1)).min(1),
    checks: z.array(z.string().min(1)).min(1),
    action: z.enum(["block", "warn"]).default("warn"),
    reason: z.string().min(1),
    source: policySourceSchema,
  })
  .strict();

const policyRuleSchema = z.discriminatedUnion("kind", [
  protectedPathRuleSchema,
  commandRuleSchema,
  requiredCheckRuleSchema,
]);

export const policyDocumentSchema = z
  .object({
    schema_version: z.literal(1),
    rules: z.array(policyRuleSchema),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const seenIds = new Set<string>();
    for (let i = 0; i < doc.rules.length; i++) {
      const rule = doc.rules[i];
      if (seenIds.has(rule.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate rule id: ${rule.id}`,
          path: ["rules", i, "id"],
        });
      }
      seenIds.add(rule.id);

      if (rule.source.origin === "compiled" && rule.action === "block") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Compiled rule '${rule.id}' cannot use action 'block'`,
          path: ["rules", i, "action"],
        });
      }

      if (
        rule.kind === "command" &&
        rule.action === "rewrite" &&
        !rule.rewrite_to
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Command rule '${rule.id}' with action 'rewrite' requires 'rewrite_to'`,
          path: ["rules", i, "rewrite_to"],
        });
      }
    }
  });

export function parsePolicyDocument(
  json: unknown,
): { ok: true; doc: PolicyDocument } | { ok: false; errors: string[] } {
  const result = policyDocumentSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues;
    const errors = issues.map((e) => {
      const pathStr = e.path.length > 0 ? e.path.join(".") + ": " : "";
      return `${pathStr}${e.message}`;
    });
    return { ok: false, errors };
  }
  return { ok: true, doc: result.data as PolicyDocument };
}

export function detectConflicts(doc: PolicyDocument): string[] {
  const conflicts: string[] = [];

  // 1. Same protected_path pattern with different actions
  const patternActions = new Map<string, { id: string; action: string }>();
  for (const rule of doc.rules) {
    if (rule.kind === "protected_path") {
      for (const rawPattern of rule.paths) {
        const pattern = normalizePath(rawPattern);
        const existing = patternActions.get(pattern);
        if (existing) {
          if (existing.action !== rule.action) {
            conflicts.push(
              `Conflict on protected_path '${pattern}': rule '${existing.id}' specifies '${existing.action}' while rule '${rule.id}' specifies '${rule.action}'`,
            );
          }
        } else {
          patternActions.set(pattern, { id: rule.id, action: rule.action });
        }
      }
    }
  }

  // 2. Same command executable with different actions or rewrite_to
  const exeMap = new Map<
    string,
    { id: string; action: string; rewrite_to?: string }
  >();
  for (const rule of doc.rules) {
    if (rule.kind === "command") {
      for (const exe of rule.executables) {
        const existing = exeMap.get(exe);
        if (existing) {
          if (existing.action !== rule.action) {
            conflicts.push(
              `Conflict on executable '${exe}': rule '${existing.id}' specifies '${existing.action}' while rule '${rule.id}' specifies '${rule.action}'`,
            );
          } else if (
            existing.action === "rewrite" &&
            existing.rewrite_to !== rule.rewrite_to
          ) {
            conflicts.push(
              `Conflict on executable '${exe}': rule '${existing.id}' rewrites to '${existing.rewrite_to}' while rule '${rule.id}' rewrites to '${rule.rewrite_to}'`,
            );
          }
        } else {
          exeMap.set(exe, {
            id: rule.id,
            action: rule.action,
            rewrite_to: rule.rewrite_to,
          });
        }
      }
    }
  }

  return conflicts;
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function matchesPattern(pattern: string, relPath: string): boolean {
  const normPattern = normalizePath(pattern);
  const normPath = normalizePath(relPath);
  const matchBase = !normPattern.includes("/");
  return minimatch(normPath, normPattern, { dot: true, matchBase });
}

export interface PolicyView {
  loaded: boolean;
  problem: string | null;
  pathRules(
    relPath: string,
  ): Array<{ id: string; action: string; reason: string }>;
  requiredChecks(
    relPaths: string[],
  ): Array<{ id: string; action: string; checks: string[]; reason: string }>;
}

class PolicyViewImpl implements PolicyView {
  private projectRoot: string;
  private policyPath: string;
  private lastMtimeMs: number | null = null;
  private _loaded = false;
  private _problem: string | null = null;
  private _doc: PolicyDocument | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.policyPath = path.join(projectRoot, ".ags", "policy.json");
    this.sync();
  }

  private sync(): void {
    try {
      if (!fs.existsSync(this.policyPath)) {
        this.lastMtimeMs = null;
        this._loaded = false;
        this._problem = null;
        this._doc = null;
        return;
      }

      const stat = fs.statSync(this.policyPath);
      if (this.lastMtimeMs !== null && this.lastMtimeMs === stat.mtimeMs) {
        return;
      }
      this.lastMtimeMs = stat.mtimeMs;

      let raw: unknown;
      try {
        const text = fs.readFileSync(this.policyPath, "utf8");
        raw = JSON.parse(text);
      } catch (err: unknown) {
        this._loaded = false;
        this._problem = `Failed to parse JSON in ${this.policyPath}: ${err instanceof Error ? err.message : String(err)}`;
        this._doc = null;
        return;
      }

      const parsed = parsePolicyDocument(raw);
      if (!parsed.ok) {
        this._loaded = false;
        this._problem = `Policy validation error: ${parsed.errors.join("; ")}`;
        this._doc = null;
        return;
      }

      const conflicts = detectConflicts(parsed.doc);
      if (conflicts.length > 0) {
        this._loaded = false;
        this._problem = `Policy conflict: ${conflicts.join("; ")}`;
        this._doc = null;
        return;
      }

      this._loaded = true;
      this._problem = null;
      this._doc = parsed.doc;
    } catch (err: unknown) {
      this.lastMtimeMs = null;
      this._loaded = false;
      this._problem = `Error reading policy file: ${err instanceof Error ? err.message : String(err)}`;
      this._doc = null;
    }
  }

  get loaded(): boolean {
    this.sync();
    return this._loaded;
  }

  get problem(): string | null {
    this.sync();
    return this._problem;
  }

  pathRules(
    relPath: string,
  ): Array<{ id: string; action: string; reason: string }> {
    this.sync();
    if (!this._loaded || !this._doc) return [];
    const results: Array<{ id: string; action: string; reason: string }> = [];
    for (const rule of this._doc.rules) {
      if (rule.kind === "protected_path") {
        const matched = rule.paths.some((p) => matchesPattern(p, relPath));
        if (matched) {
          results.push({
            id: rule.id,
            action: rule.action,
            reason: rule.reason,
          });
        }
      }
    }
    return results;
  }

  requiredChecks(
    relPaths: string[],
  ): Array<{ id: string; action: string; checks: string[]; reason: string }> {
    this.sync();
    if (!this._loaded || !this._doc) return [];
    const results: Array<{
      id: string;
      action: string;
      checks: string[];
      reason: string;
    }> = [];
    for (const rule of this._doc.rules) {
      if (rule.kind === "required_check") {
        const matched = relPaths.some((rp) =>
          rule.when_changed.some((pattern) => matchesPattern(pattern, rp)),
        );
        if (matched) {
          results.push({
            id: rule.id,
            action: rule.action,
            checks: [...rule.checks],
            reason: rule.reason,
          });
        }
      }
    }
    return results;
  }
}

export function loadPolicyView(projectRoot: string): PolicyView {
  return new PolicyViewImpl(projectRoot);
}
