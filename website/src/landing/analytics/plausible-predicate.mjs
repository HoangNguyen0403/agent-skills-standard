/**
 * Canonical Plausible Analytics configuration predicate.
 *
 * Single shared source of truth for both the client application and the static
 * export security header generator (`scripts/generate-headers.mjs`).
 *
 * Accepts explicit field values rather than dynamic process.env to ensure Next.js
 * build-time static inlining of `process.env.NEXT_PUBLIC_*` strings in the client.
 */

export const EXACT_PLAUSIBLE_ENDPOINT = 'https://plausible.io/api/event';

export function validatePlausibleConfig(fields) {
  if (!fields) return null;

  const isEnabled = fields.enabled === 'true';
  const operatorApproval = fields.operatorApproval?.trim();
  const siteId = fields.siteId?.trim();
  const pageUrl = fields.pageUrl?.trim();

  // Explicit build flag alone is not authorization: require operator approval gate
  if (!isEnabled || operatorApproval !== 'approved') {
    return null;
  }

  // Non-secret site ID must be non-empty domain/alphanumeric without protocols or paths
  if (!siteId || !/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$|^[a-zA-Z0-9.-]+$/.test(siteId)) {
    return null;
  }

  // Fixed constant HTTPS URL must be valid absolute HTTPS origin + path without query or hash
  if (!pageUrl) {
    return null;
  }

  let parsedPageUrl;
  try {
    parsedPageUrl = new URL(pageUrl);
  } catch {
    return null;
  }

  if (
    parsedPageUrl.protocol !== 'https:' ||
    parsedPageUrl.username ||
    parsedPageUrl.password ||
    parsedPageUrl.search ||
    parsedPageUrl.hash
  ) {
    return null;
  }

  return {
    enabled: true,
    siteId,
    pageUrl: parsedPageUrl.origin + parsedPageUrl.pathname,
    endpoint: EXACT_PLAUSIBLE_ENDPOINT,
    operatorApproved: true,
  };
}
