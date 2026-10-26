/**
 * Canonical GA4 configuration predicate.
 *
 * Single shared source of truth for both the client application and the static
 * export security header generator (`scripts/generate-headers.mjs`).
 *
 * Validates ONLY canonical public build inputs:
 * - NEXT_PUBLIC_GA4_ENABLED === 'true'
 * - NEXT_PUBLIC_GA4_OPERATOR_APPROVAL === 'approved'
 * - NEXT_PUBLIC_GA4_MEASUREMENT_ID: valid G-* format (e.g. G-XXXXXXXXXX)
 * - NEXT_PUBLIC_GA4_PAGE_URL: valid absolute HTTPS constant URL without query or hash
 */

export const EXACT_GA4_TAG_SRC = 'https://www.googletagmanager.com/gtag/js';
export const EXACT_GA4_COLLECT_ENDPOINTS = [
  'https://www.google-analytics.com/g/collect',
  'https://region1.google-analytics.com/g/collect',
];
export const FIXED_PAGE_TITLE = 'Agent Skills Standard';

export function validateGA4Config(fields) {
  if (!fields) return null;

  const isEnabled = fields.enabled === 'true';
  const operatorApproval = fields.operatorApproval?.trim();
  const measurementId = fields.measurementId?.trim();
  const pageUrl = fields.pageUrl?.trim();

  // Explicit build flag alone is not authorization: require operator approval gate
  if (!isEnabled || operatorApproval !== 'approved') {
    return null;
  }

  // Measurement ID must match valid G-* pattern (G- followed by alphanumeric characters)
  if (!measurementId || !/^G-[A-Za-z0-9]+$/.test(measurementId)) {
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
    measurementId,
    pageUrl: parsedPageUrl.origin + parsedPageUrl.pathname,
    pageTitle: FIXED_PAGE_TITLE,
    tagUrl: `${EXACT_GA4_TAG_SRC}?id=${encodeURIComponent(measurementId)}`,
    operatorApproved: true,
  };
}
