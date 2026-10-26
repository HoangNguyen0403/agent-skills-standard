import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  validatePlausibleConfig,
  EXACT_PLAUSIBLE_ENDPOINT,
} from '@/landing/analytics/plausible-predicate.mjs';
import {
  getPlausibleConfig,
  isPlausibleConfigured,
  type PlausibleConfig,
} from '@/landing/analytics/plausible-config';
import {
  normalizeEventInput,
  buildPlausiblePayload,
  sendPlausibleEvent,
} from '@/landing/analytics/plausible-client';
import {
  PlausibleProvider,
  usePlausible,
} from '@/landing/analytics/PlausibleContext';
import { PlausibleLink } from '@/landing/analytics/PlausibleLink.client';
import { ConsentBanner } from '@/landing/ConsentBanner.client';
import { DemoPlayer } from '@/landing/DemoPlayer';
import { CopyCommand } from '@/landing/CopyCommand.client';

describe('Plausible Analytics Configuration & Predicate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('ValidatePlausibleConfig_WhenFieldsMissingOrDisabled_ReturnsNull', () => {
    expect(validatePlausibleConfig(null)).toBeNull();
    expect(validatePlausibleConfig({})).toBeNull();
    expect(
      validatePlausibleConfig({
        enabled: 'false',
        operatorApproval: 'approved',
        siteId: 'test-site.org',
        pageUrl: 'https://test-site.org/',
      }),
    ).toBeNull();
  });

  it('ValidatePlausibleConfig_WhenEnabledWithoutOperatorApproval_ReturnsNull', () => {
    expect(
      validatePlausibleConfig({
        enabled: 'true',
        siteId: 'test-site.org',
        pageUrl: 'https://test-site.org/',
      }),
    ).toBeNull();
  });

  it('ValidatePlausibleConfig_WhenSiteIdIsInvalidOrHasScheme_ReturnsNull', () => {
    expect(
      validatePlausibleConfig({
        enabled: 'true',
        operatorApproval: 'approved',
        siteId: 'https://test-site.org',
        pageUrl: 'https://test-site.org/',
      }),
    ).toBeNull();
  });

  it('ValidatePlausibleConfig_WhenPageUrlIsNotHttpsOrHasQueryOrFragment_ReturnsNull', () => {
    expect(
      validatePlausibleConfig({
        enabled: 'true',
        operatorApproval: 'approved',
        siteId: 'test-site.org',
        pageUrl: 'http://test-site.org/',
      }),
    ).toBeNull();

    expect(
      validatePlausibleConfig({
        enabled: 'true',
        operatorApproval: 'approved',
        siteId: 'test-site.org',
        pageUrl: 'https://test-site.org/?utm_campaign=test',
      }),
    ).toBeNull();

    expect(
      validatePlausibleConfig({
        enabled: 'true',
        operatorApproval: 'approved',
        siteId: 'test-site.org',
        pageUrl: 'https://test-site.org/#anchor',
      }),
    ).toBeNull();
  });

  it('ValidatePlausibleConfig_WhenValidAndApproved_ReturnsExactHardcodedEndpoint', () => {
    const config = validatePlausibleConfig({
      enabled: 'true',
      operatorApproval: 'approved',
      siteId: 'synthetic-test.org',
      pageUrl: 'https://synthetic-test.org/',
    });

    expect(config).toEqual({
      enabled: true,
      siteId: 'synthetic-test.org',
      pageUrl: 'https://synthetic-test.org/',
      endpoint: EXACT_PLAUSIBLE_ENDPOINT,
      operatorApproved: true,
    });
    expect(config?.endpoint).toBe('https://plausible.io/api/event');
  });

  it('GetPlausibleConfig_ReadsStaticNextPublicEnvVariables', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = 'true';
    process.env.NEXT_PUBLIC_PLAUSIBLE_OPERATOR_APPROVAL = 'approved';
    process.env.NEXT_PUBLIC_PLAUSIBLE_SITE_ID = 'synthetic-test.org';
    process.env.NEXT_PUBLIC_PLAUSIBLE_PAGE_URL = 'https://synthetic-test.org/';

    const config = getPlausibleConfig();
    expect(config).not.toBeNull();
    expect(isPlausibleConfigured()).toBe(true);
  });
});

describe('Field Normalization & Closed Application Schema (plausible-client)', () => {
  const syntheticConfig: PlausibleConfig = {
    enabled: true,
    siteId: 'synthetic-test.org',
    pageUrl: 'https://synthetic-test.org/',
    endpoint: EXACT_PLAUSIBLE_ENDPOINT,
    operatorApproved: true,
  };

  it('NormalizeInput_PreservesAuthoritativeFrontmatterAssets', () => {
    const normalized = normalizeEventInput({
      event_name: 'setup_guide_open',
      campaign_id: 'standards-demo-01',
      asset_id: 'tutorial-standards-adoption-01',
      placement: 'quickstart_docs',
    });

    expect(normalized).toEqual({
      campaign_id: 'standards-demo-01',
      asset_id: 'tutorial-standards-adoption-01',
      placement: 'quickstart_docs',
    });
  });

  it('NormalizeInput_NormalizesUnregisteredDemoAndCopyActionsToUnknownAsset', () => {
    // demo-01 is synthetic-only; unregistered actions fall back to unknown
    const normalized = normalizeEventInput({
      event_name: 'demo_play',
      campaign_id: 'standards-demo-01',
      asset_id: 'demo-01',
      placement: 'quickstart_demo',
    });

    expect(normalized.campaign_id).toBe('standards-demo-01');
    expect(normalized.asset_id).toBe('unknown');
    expect(normalized.placement).toBe('quickstart_demo');
  });

  it('NormalizeInput_NormalizesUnregisteredCampaignToUnknown', () => {
    const normalized = normalizeEventInput({
      event_name: 'demo_play',
      campaign_id: 'rogue-unregistered-campaign',
      asset_id: 'tutorial-standards-adoption-01',
      placement: 'quickstart_demo',
    });

    expect(normalized.campaign_id).toBe('unknown');
    expect(normalized.asset_id).toBe('unknown');
  });

  it('NormalizeInput_NormalizesUnapprovedPlacementToUnknown', () => {
    const normalized = normalizeEventInput({
      event_name: 'demo_play',
      campaign_id: 'standards-demo-01',
      asset_id: 'unknown',
      placement: 'unapproved_sidebar_widget',
    });

    expect(normalized.placement).toBe('unknown');
  });

  it('BuildPlausiblePayload_MapsToConstantFixedUrlWithoutQueryOrReferrer', () => {
    const payload = buildPlausiblePayload(
      {
        event_name: 'demo_play',
        campaign_id: 'standards-demo-01',
        asset_id: 'unknown',
        placement: 'quickstart_demo',
      },
      syntheticConfig,
    );

    expect(payload).toEqual({
      name: 'demo_play',
      domain: 'synthetic-test.org',
      url: 'https://synthetic-test.org/',
      props: {
        schema_version: 1,
        campaign_id: 'standards-demo-01',
        asset_id: 'unknown',
        placement: 'quickstart_demo',
      },
    });
  });

  it('SendPlausibleEvent_DispatchesPostToHardcodedPlausibleEndpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    global.fetch = mockFetch;

    const result = await sendPlausibleEvent(
      {
        event_name: 'demo_play',
        campaign_id: 'standards-demo-01',
        asset_id: 'unknown',
        placement: 'quickstart_demo',
      },
      syntheticConfig,
    );

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://plausible.io/api/event');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'text/plain' });
    expect(options.credentials).toBe('omit');
    expect(options.referrerPolicy).toBe('no-referrer');
  });
});

describe('In-Memory Consent & Live Epoch Validation (PlausibleContext)', () => {
  const syntheticConfig: PlausibleConfig = {
    enabled: true,
    siteId: 'synthetic-test.org',
    pageUrl: 'https://synthetic-test.org/',
    endpoint: EXACT_PLAUSIBLE_ENDPOINT,
    operatorApproved: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function TestConsumer(): React.JSX.Element {
    const {
      isConfigured,
      consentStatus,
      hasConsent,
      acceptConsent,
      withdrawConsent,
      getConsentSnapshot,
      trackEvent,
    } = usePlausible();

    return (
      <div>
        <span data-testid="is-configured">{isConfigured ? 'yes' : 'no'}</span>
        <span data-testid="consent-status">{consentStatus}</span>
        <span data-testid="has-consent">{hasConsent ? 'yes' : 'no'}</span>
        <span data-testid="consent-epoch">{getConsentSnapshot().epoch}</span>
        <button type="button" onClick={acceptConsent} data-testid="accept-btn">
          Accept
        </button>
        <button type="button" onClick={withdrawConsent} data-testid="withdraw-btn">
          Withdraw
        </button>
        <button
          type="button"
          onClick={() =>
            trackEvent({
              event_name: 'demo_play',
              campaign_id: 'standards-demo-01',
              asset_id: 'unknown',
              placement: 'quickstart_demo',
            })
          }
          data-testid="track-btn"
        >
          Track Demo
        </button>
      </div>
    );
  }

  it('PlausibleContext_DefaultsToUndecidedOnMountWithoutStorage', () => {
    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </PlausibleProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('undecided');
    expect(screen.getByTestId('has-consent')).toHaveTextContent('no');
    expect(screen.getByTestId('consent-epoch')).toHaveTextContent('0');
  });

  it('PlausibleContext_DoesNotTrackWhenUndecidedOrDenied', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </PlausibleProvider>,
    );

    // Track while undecided
    await act(async () => {
      fireEvent.click(screen.getByTestId('track-btn'));
    });
    expect(mockFetch).not.toHaveBeenCalled();

    // Withdraw explicitly
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-btn'));
    });
    expect(screen.getByTestId('consent-status')).toHaveTextContent('denied');

    // Track while denied
    await act(async () => {
      fireEvent.click(screen.getByTestId('track-btn'));
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('PlausibleContext_AcceptConsentIncrementsEpochAndEnablesTrack', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </PlausibleProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });
    expect(screen.getByTestId('consent-status')).toHaveTextContent('granted');
    expect(screen.getByTestId('has-consent')).toHaveTextContent('yes');
    expect(screen.getByTestId('consent-epoch')).toHaveTextContent('1');

    await act(async () => {
      fireEvent.click(screen.getByTestId('track-btn'));
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('PlausibleContext_WithdrawConsentImmediatelyHaltsFutureSends', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </PlausibleProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });
    expect(screen.getByTestId('has-consent')).toHaveTextContent('yes');

    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-btn'));
    });
    expect(screen.getByTestId('consent-status')).toHaveTextContent('denied');
    expect(screen.getByTestId('has-consent')).toHaveTextContent('no');

    await act(async () => {
      fireEvent.click(screen.getByTestId('track-btn'));
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('Accessible Consent Control (ConsentBanner)', () => {
  const syntheticConfig: PlausibleConfig = {
    enabled: true,
    siteId: 'synthetic-test.org',
    pageUrl: 'https://synthetic-test.org/',
    endpoint: EXACT_PLAUSIBLE_ENDPOINT,
    operatorApproved: true,
  };

  it('ConsentBanner_WhenUnconfigured_RendersNothing', () => {
    const { container } = render(
      <PlausibleProvider overrideConfig={null}>
        <ConsentBanner />
      </PlausibleProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('ConsentBanner_OptInAndWithdrawTransitionsUpdateAccessibleControl', async () => {
    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <ConsentBanner />
      </PlausibleProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /accept analytics and opt in/i }));
    });
    expect(screen.getByRole('button', { name: /withdraw analytics consent/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /withdraw analytics consent/i }));
    });
    expect(screen.getByRole('button', { name: /opt in to analytics/i })).toBeInTheDocument();
  });
});

describe('CopyCommand Deferred Clipboard Write Lifecycle', () => {
  const syntheticConfig: PlausibleConfig = {
    enabled: true,
    siteId: 'synthetic-test.org',
    pageUrl: 'https://synthetic-test.org/',
    endpoint: EXACT_PLAUSIBLE_ENDPOINT,
    operatorApproved: true,
  };

  function deferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
  } {
    if (typeof Promise.withResolvers === 'function') {
      return Promise.withResolvers<T>();
    }
    let resolvePromise: (value: T) => void = () => undefined;
    let rejectPromise: (reason?: unknown) => void = () => undefined;
    const promise = new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    return { promise, resolve: resolvePromise, reject: rejectPromise };
  }

  function CopyCommandTestHarness(): React.JSX.Element {
    const { acceptConsent, withdrawConsent } = usePlausible();
    return (
      <div>
        <button type="button" onClick={acceptConsent} data-testid="accept-consent">
          Opt In
        </button>
        <button type="button" onClick={withdrawConsent} data-testid="withdraw-consent">
          Withdraw
        </button>
        <CopyCommand id="init" command="npx @ags/cli init" />
      </div>
    );
  }

  it('CopyCommand_WhenCopyBegunPreConsentResolvesAfterOptIn_DoesNotTransmit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    const deferredWrite = deferred<void>();
    const mockWriteText = vi.fn().mockReturnValue(deferredWrite.promise);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </PlausibleProvider>,
    );

    // 1. User clicks copy while consent is undecided (pre-consent)
    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(mockWriteText).toHaveBeenCalled();

    // 2. User opts in while clipboard write is still in flight
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 3. In-flight clipboard write resolves
    await act(async () => {
      deferredWrite.resolve();
    });

    // 4. Pre-consent action MUST NOT replay or transmit
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('CopyCommand_WhenConsentWithdrawnWhileCopyInFlight_DoesNotTransmit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    const deferredWrite = deferred<void>();
    const mockWriteText = vi.fn().mockReturnValue(deferredWrite.promise);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </PlausibleProvider>,
    );

    // 1. Opt in first
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 2. User clicks copy while granted
    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // 3. User withdraws consent while write is in flight
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-consent'));
    });

    // 4. In-flight write resolves
    await act(async () => {
      deferredWrite.resolve();
    });

    // 5. Action was invalidated by withdrawal; MUST NOT transmit
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('CopyCommand_WhenConsentWithdrawnAndRegrantedWhileInFlight_DoesNotTransmit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    const deferredWrite = deferred<void>();
    const mockWriteText = vi.fn().mockReturnValue(deferredWrite.promise);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </PlausibleProvider>,
    );

    // 1. Opt in (epoch 1)
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 2. Click copy under epoch 1
    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // 3. User withdraws (epoch 2) and re-grants (epoch 3)
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-consent'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 4. In-flight write resolves
    await act(async () => {
      deferredWrite.resolve();
    });

    // 5. Epoch mismatch; MUST NOT transmit
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('CopyCommand_WhenGrantedAndResolvesUnderSameEpoch_TransmitsWithUnknownAsset', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </PlausibleProvider>,
    );

    // Opt in
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // Click copy
    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.name).toBe('install_command_copy');
    expect(body.props.campaign_id).toBe('standards-demo-01');
    expect(body.props.asset_id).toBe('unknown');
    expect(body.props.placement).toBe('quickstart_init');

    // Never includes command text or clipboard payload
    expect(JSON.stringify(body)).not.toContain('npx @ags/cli init');
  });

  it('CopyCommand_WhenClipboardRejects_EmitsZeroEventsAndEntersFailureRecovery', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard denied'));
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </PlausibleProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByText(/Copy failed/i)).toBeInTheDocument();
  });
});

describe('DemoPlayer Programmatic Play Negatives & Lifecycle', () => {
  const syntheticConfig: PlausibleConfig = {
    enabled: true,
    siteId: 'synthetic-test.org',
    pageUrl: 'https://synthetic-test.org/',
    endpoint: EXACT_PLAUSIBLE_ENDPOINT,
    operatorApproved: true,
  };

  function DemoPlayerTestHarness(): React.JSX.Element {
    const { acceptConsent } = usePlausible();
    return (
      <div>
        <button type="button" onClick={acceptConsent} data-testid="accept-consent">
          Opt In
        </button>
        <DemoPlayer />
      </div>
    );
  }

  it('DemoPlayer_RenderAlone_EmitsZeroEvents', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <DemoPlayerTestHarness />
      </PlausibleProvider>,
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('DemoPlayer_ProgrammaticPlayAloneWithoutUserIntent_EmitsZeroEvents', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <DemoPlayerTestHarness />
      </PlausibleProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    const video = screen.getByLabelText(/Demonstration: Synchronizing agent skills/i);

    // Synthetic/programmatic 'playing' event dispatched without user pointer/keyboard intent
    await act(async () => {
      fireEvent.playing(video);
    });

    // Must be rejected because no trusted native pointer/keyboard intent was recorded
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('PlausibleLink Non-Blocking Navigation', () => {
  const syntheticConfig: PlausibleConfig = {
    enabled: true,
    siteId: 'synthetic-test.org',
    pageUrl: 'https://synthetic-test.org/',
    endpoint: EXACT_PLAUSIBLE_ENDPOINT,
    operatorApproved: true,
  };

  it('PlausibleLink_WhenClicked_DispatchesEventWithExactPlacement', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    render(
      <PlausibleProvider overrideConfig={syntheticConfig}>
        <PlausibleLink
          href="https://example.com/docs"
          event={{
            event_name: 'setup_guide_open',
            campaign_id: 'standards-demo-01',
            asset_id: 'tutorial-standards-adoption-01',
            placement: 'quickstart_docs',
          }}
        >
          Setup docs
        </PlausibleLink>
      </PlausibleProvider>,
    );

    // Opt in via context
    const link = screen.getByRole('link', { name: /setup docs/i });
    await act(async () => {
      fireEvent.click(link);
    });

    // Link click when undecided does not transmit
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
