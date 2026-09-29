import { z } from 'zod';

export type PolicyAction = 'block' | 'warn' | 'rewrite';

export interface PolicySource {
  origin: 'declared' | 'compiled';
  file?: string;
  line?: number;
  text?: string;
  digest?: string;
}

export type PolicyRule =
  | {
      id: string;
      kind: 'protected_path';
      paths: string[];
      action: 'block' | 'warn';
      reason: string;
      source: PolicySource;
    }
  | {
      id: string;
      kind: 'command';
      executables: string[];
      action: 'block' | 'warn' | 'rewrite';
      rewrite_to?: string;
      reason: string;
      source: PolicySource;
    }
  | {
      id: string;
      kind: 'required_check';
      when_changed: string[];
      checks: string[];
      action: 'block' | 'warn';
      reason: string;
      source: PolicySource;
    };

export interface PolicyDocument {
  schema_version: 1;
  rules: PolicyRule[];
}

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must match ^[a-z0-9]+(-[a-z0-9]+)*$');

export const policySourceSchema = z
  .object({
    origin: z.enum(['declared', 'compiled']),
    file: z.string().optional(),
    line: z.number().int().positive().optional(),
    text: z.string().optional(),
    digest: z.string().optional(),
  })
  .strict();

export const protectedPathRuleSchema = z
  .object({
    id: idSchema,
    kind: z.literal('protected_path'),
    paths: z.array(z.string()),
    action: z.enum(['block', 'warn']).default('warn'),
    reason: z.string(),
    source: policySourceSchema,
  })
  .strict();

export const commandRuleSchema = z
  .object({
    id: idSchema,
    kind: z.literal('command'),
    executables: z.array(z.string()),
    action: z.enum(['block', 'warn', 'rewrite']).default('warn'),
    rewrite_to: z.string().optional(),
    reason: z.string(),
    source: policySourceSchema,
  })
  .strict();

export const requiredCheckRuleSchema = z
  .object({
    id: idSchema,
    kind: z.literal('required_check'),
    when_changed: z.array(z.string()),
    checks: z.array(z.string()),
    action: z.enum(['block', 'warn']).default('warn'),
    reason: z.string(),
    source: policySourceSchema,
  })
  .strict();

export const policyRuleSchema = z
  .discriminatedUnion('kind', [
    protectedPathRuleSchema,
    commandRuleSchema,
    requiredCheckRuleSchema,
  ])
  .superRefine((data, ctx) => {
    if (
      data.kind === 'command' &&
      data.action === 'rewrite' &&
      !data.rewrite_to
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rewrite action requires rewrite_to',
        path: ['rewrite_to'],
      });
    }
    if (data.source.origin === 'compiled' && data.action === 'block') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'compiled rule cannot have block action',
        path: ['action'],
      });
    }
  });

export const policyDocumentSchema: z.ZodType<PolicyDocument> = z
  .object({
    schema_version: z.literal(1),
    rules: z.array(policyRuleSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.rules.forEach((r, idx) => {
      if (seen.has(r.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate rule id: ${r.id}`,
          path: ['rules', idx, 'id'],
        });
      }
      seen.add(r.id);
    });
  }) as unknown as z.ZodType<PolicyDocument>;

export function parsePolicy(
  json: unknown,
): { ok: true; doc: PolicyDocument } | { ok: false; errors: string[] } {
  const result = policyDocumentSchema.safeParse(json);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const p = issue.path.join('.');
      return p ? `${p}: ${issue.message}` : issue.message;
    });
    return { ok: false, errors };
  }
  return { ok: true, doc: result.data };
}
