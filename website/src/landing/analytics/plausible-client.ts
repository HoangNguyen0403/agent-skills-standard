import {
  type PlausibleConfig,
  EXACT_PLAUSIBLE_ENDPOINT,
} from './plausible-config';

/**
 * Plausible Direct Events Client & Field Normalization
 *
 * Implements SRS-009 / plausible-collection-contract.md:
 * - Direct browser POST to `https://plausible.io/api/event` without tracker SDK
 * - Closed application fields: schema_version: 1, event_name, campaign_id, asset_id, placement
 * - Exactly 4 allowed events: demo_play, setup_guide_open, install_command_copy, github_click
 * - Map: name (event_name), domain (siteId), url (constant approved HTTPS URL), props (other 4 fields)
 * - URL is NEVER location.href, query, fragment, or destination
 * - Request options: JSON body, Content-Type: text/plain, credentials: omit, referrerPolicy: no-referrer
 * - Hardcoded Plausible endpoint: no generic self-host or apiHost override
 * - Reject unregistered campaign/asset association and unapproved placement -> 'unknown'
 * - Authoritative sources: actual campaign frontmatter only (no synthetic demo-01 registration)
 * - Failure never delays or prevents primary actions
 */

export type PlausibleEventName =
  | 'demo_play'
  | 'setup_guide_open'
  | 'install_command_copy'
  | 'github_click';

export const ALLOWED_EVENTS: readonly PlausibleEventName[] = [
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

export type PlausiblePlacement = (typeof ALLOWED_PLACEMENTS)[number] | 'unknown';

export interface RawEventInput {
  schema_version?: number;
  event_name: PlausibleEventName;
  campaign_id?: string;
  asset_id?: string;
  placement?: string;
}

export interface PlausibleEventPayload {
  readonly name: PlausibleEventName;
  readonly domain: string;
  readonly url: string;
  readonly props: {
    readonly schema_version: 1;
    readonly campaign_id: string;
    readonly asset_id: string;
    readonly placement: string;
  };
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

export function buildPlausiblePayload(
  input: RawEventInput,
  config: PlausibleConfig,
): PlausibleEventPayload {
  const normalized = normalizeEventInput(input);

  return {
    name: input.event_name,
    domain: config.siteId,
    // Approved constant HTTPS origin/path, never location.href, query string, or clicked destination
    url: config.pageUrl,
    props: {
      schema_version: 1,
      campaign_id: normalized.campaign_id,
      asset_id: normalized.asset_id,
      placement: normalized.placement,
    },
  };
}

export async function sendPlausibleEvent(
  input: RawEventInput,
  config: PlausibleConfig,
): Promise<boolean> {
  if (!ALLOWED_EVENTS.includes(input.event_name)) {
    return false;
  }

  const payload = buildPlausiblePayload(input, config);

  try {
    const response = await fetch(EXACT_PLAUSIBLE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return response.ok;
  } catch {
    // Transport failure never delays or prevents primary actions
    return false;
  }
}
