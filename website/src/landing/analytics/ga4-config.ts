import {
  validateGA4Config,
  EXACT_GA4_TAG_SRC,
  EXACT_GA4_COLLECT_ENDPOINTS,
  FIXED_PAGE_TITLE,
} from './ga4-predicate.mjs';

/**
 * GA4 configuration and enablement gate.
 *
 * Requirements:
 * 1. Default-off: Without explicit configuration, analytics is disabled.
 * 2. Enabling build flag is NOT proof of human approval: Requires explicit valid
 *    non-secret Measurement ID (G-*), fixed HTTPS URL, and operator approval gate.
 * 3. Static Next.js public env references: Must access `process.env.NEXT_PUBLIC_*` directly
 *    so Next compiler can inline values at build time in client components.
 */

export interface GA4Config {
  readonly enabled: boolean;
  readonly measurementId: string;
  readonly pageUrl: string;
  readonly pageTitle: string;
  readonly tagUrl: string;
  readonly operatorApproved: boolean;
}

export { EXACT_GA4_TAG_SRC, EXACT_GA4_COLLECT_ENDPOINTS, FIXED_PAGE_TITLE };

export function getGA4Config(): GA4Config | null {
  // Static member access required for Next.js build-time bundling
  return validateGA4Config({
    enabled: process.env.NEXT_PUBLIC_GA4_ENABLED,
    operatorApproval: process.env.NEXT_PUBLIC_GA4_OPERATOR_APPROVAL,
    measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
    pageUrl: process.env.NEXT_PUBLIC_GA4_PAGE_URL,
  });
}

export function isGA4Configured(): boolean {
  return getGA4Config() !== null;
}
