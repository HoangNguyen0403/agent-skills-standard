import type { GA4Config } from './ga4-config';

/**
 * GA4 Direct Tag Client & Field Normalization
 *
 * Implements approved GA4 clean cutover contract:
 * - Direct Google tag dispatch without GTM container or external backend proxy
 * - Exactly 4 allowed events: demo_play, setup_guide_open, install_command_copy, github_click
 * - Closed application fields: schema_version: 1, campaign_id, asset_id, placement
 * - Reject unregistered campaign/asset association and unapproved placement -> 'unknown'
 * - Authoritative sources: actual campaign frontmatter only (unregistered demo/copy fall back to 'unknown')
 * - Failure never delays or prevents primary actions
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean;
  }
}

export type GA4EventName =
  | 'demo_play'
  | 'setup_guide_open'
  | 'install_command_copy'
  | 'github_click';

export const ALLOWED_EVENTS: readonly GA4EventName[] = [
  'demo_play',
  'setup_guide_open',
  'install_command_copy',
  'github_click',
] as const;

export const REGISTERED_CAMPAIGNS = ['standards-demo-01'] as const;

/**
 * Authoritative registered asset identifiers from actual campaign frontmatter.
 * demo-01 is synthetic-only; unregistered demo/copy actions fall back to 'unknown'.
 */
export const REGISTERED_ASSETS_BY_CAMPAIGN: Record<string, readonly string[]> = {
  'standards-demo-01': [
    'tutorial-standards-adoption-01',
    'announcement-github-01',
    'showcase-community-01',
  ],
};

export const ALLOWED_PLACEMENTS = [
  'quickstart_demo',
  'quickstart_init',
  'quickstart_sync',
  'quickstart_docs',
  'quickstart_tutorial',
  'header_github',
  'community_github',
  'footer_github',
] as const;

export type GA4Placement = (typeof ALLOWED_PLACEMENTS)[number] | 'unknown';

export interface RawEventInput {
  schema_version?: number;
  event_name: GA4EventName;
  campaign_id?: string;
  asset_id?: string;
  placement?: string;
}

export interface GA4AppEventParams {
  readonly schema_version: 1;
  readonly campaign_id: string;
  readonly asset_id: string;
  readonly placement: string;
}

export function normalizeEventInput(input: RawEventInput): {
  campaign_id: string;
  asset_id: string;
  placement: string;
} {
  const rawCampaign = input.campaign_id?.trim() ?? '';
  const rawAsset = input.asset_id?.trim() ?? '';
  const rawPlacement = input.placement?.trim() ?? '';

  let validCampaign = 'unknown';
  let validAsset = 'unknown';

  if (REGISTERED_CAMPAIGNS.includes(rawCampaign as (typeof REGISTERED_CAMPAIGNS)[number])) {
    validCampaign = rawCampaign;
    const allowedAssets = REGISTERED_ASSETS_BY_CAMPAIGN[rawCampaign] ?? [];
    if (allowedAssets.includes(rawAsset)) {
      validAsset = rawAsset;
    }
  }

  const validPlacement = ALLOWED_PLACEMENTS.includes(
    rawPlacement as (typeof ALLOWED_PLACEMENTS)[number],
  )
    ? rawPlacement
    : 'unknown';

  return {
    campaign_id: validCampaign,
    asset_id: validAsset,
    placement: validPlacement,
  };
}

export function buildGA4EventParams(input: RawEventInput): GA4AppEventParams {
  const normalized = normalizeEventInput(input);

  return {
    schema_version: 1,
    campaign_id: normalized.campaign_id,
    asset_id: normalized.asset_id,
    placement: normalized.placement,
  };
}

export function sendGA4Event(
  input: RawEventInput,
  config: GA4Config,
): boolean {
  if (!ALLOWED_EVENTS.includes(input.event_name)) {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  // If collection is disabled via disable flag, fail closed
  if (window[`ga-disable-${config.measurementId}`] === true) {
    return false;
  }

  const params = buildGA4EventParams(input);

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', input.event_name, params);
      return true;
    }
  } catch {
    // Transport failure never delays or prevents primary actions
  }

  return false;
}
