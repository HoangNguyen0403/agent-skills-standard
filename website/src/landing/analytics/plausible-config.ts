import {
  validatePlausibleConfig,
  EXACT_PLAUSIBLE_ENDPOINT,
} from './plausible-predicate.mjs';

/**
 * Plausible Analytics configuration and enablement gate.
 *
 * Requirements:
 * 1. Default-off: Without explicit configuration, analytics is disabled.
 * 2. Enabling build flag is NOT proof of human approval: Requires explicit valid
 *    non-secret site ID, fixed HTTPS URL, and operator approval gate.
 * 3. Never guess production domain: Clearly fictional synthetic config in tests only.
 * 4. Hardcoded endpoint only: https://plausible.io/api/event (no generic self-host or apiHost option).
 * 5. Static Next.js public env references: Must access `process.env.NEXT_PUBLIC_*` directly
 *    so Next compiler can inline values at build time in client components.
 */

export interface PlausibleConfig {
  readonly enabled: boolean;
  readonly siteId: string;
  readonly pageUrl: string;
  readonly endpoint: string;
  readonly operatorApproved: boolean;
}

export { EXACT_PLAUSIBLE_ENDPOINT };

export function getPlausibleConfig(): PlausibleConfig | null {
  // Static member access required for Next.js build-time bundling
  return validatePlausibleConfig({
    enabled: process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED,
    operatorApproval: process.env.NEXT_PUBLIC_PLAUSIBLE_OPERATOR_APPROVAL,
    siteId: process.env.NEXT_PUBLIC_PLAUSIBLE_SITE_ID,
    pageUrl: process.env.NEXT_PUBLIC_PLAUSIBLE_PAGE_URL,
  });
}

export function isPlausibleConfigured(): boolean {
  return getPlausibleConfig() !== null;
}
