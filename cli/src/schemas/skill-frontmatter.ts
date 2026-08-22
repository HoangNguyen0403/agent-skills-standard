import { z } from 'zod';

/**
 * Optional Universal-Skill-Format-style fields a SKILL.md's frontmatter may
 * declare, per the OWASP Agentic Skills Top 10 (AST03 least-privilege
 * manifests / AST04 schema validation). All optional and additive: the
 * existing 281-skill corpus has none of these today and stays valid without
 * modification. `FrontmatterRule` validates whichever of these a skill
 * chooses to declare; nothing here is enforced yet by the sync/transform
 * pipeline — that's tracked as follow-up work (see docs/SECURITY.md's AST
 * table, AST03).
 */
export const RISK_TIERS = ['L0', 'L1', 'L2', 'L3'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;

export const skillPermissionsSchema = z
  .object({
    network: z
      .object({ allow: z.array(z.string()).default([]) })
      .strict()
      .optional(),
    filesystem: z
      .object({ deny: z.array(z.string()).default([]) })
      .strict()
      .optional(),
    exec: z.boolean().optional(),
  })
  .strict();

export const skillSignatureSchema = z
  .object({
    alg: z.literal('ed25519'),
    keyid: z.string().min(1),
    sig: z.string().min(1),
  })
  .strict();

/**
 * Validates only the *optional, additive* Universal-Skill-Format fields.
 * `name`/`description` (required, with legacy hand-rolled error messages)
 * are validated separately in FrontmatterRule to preserve exact wording an
 * existing test suite and tooling depend on.
 */
export const optionalSkillFieldsSchema = z.object({
  version: z
    .string()
    .regex(SEMVER_RE, 'version must be a semver string (e.g. "1.0.0")')
    .optional(),
  risk_tier: z
    .enum(RISK_TIERS, {
      errorMap: () => ({
        message: `risk_tier must be one of ${RISK_TIERS.join(', ')}`,
      }),
    })
    .optional(),
  'allowed-tools': z.array(z.string()).optional(),
  permissions: skillPermissionsSchema.optional(),
  content_hash: z
    .string()
    .regex(SHA256_RE, 'content_hash must match "sha256:<64 hex chars>"')
    .optional(),
  signature: skillSignatureSchema.optional(),
});

/**
 * L2/L3 declare meaningfully elevated capability (exec, broad network) — if
 * a skill claims that tier it should also say what it needs via
 * `permissions`, otherwise the tier declaration is decorative.
 */
export function validateRiskTierNeedsPermissions(fields: {
  risk_tier?: RiskTier;
  permissions?: unknown;
}): string | null {
  if (
    (fields.risk_tier === 'L2' || fields.risk_tier === 'L3') &&
    !fields.permissions
  ) {
    return `risk_tier ${fields.risk_tier} should declare a permissions block`;
  }
  return null;
}
