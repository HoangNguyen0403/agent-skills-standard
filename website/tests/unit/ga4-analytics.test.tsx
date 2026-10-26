import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { validateGA4Config } from '@/landing/analytics/ga4-predicate.mjs';
import {
  getGA4Config,
  isGA4Configured,
  type GA4Config,
} from '@/landing/analytics/ga4-config';
import {
  normalizeEventInput,
  buildGA4EventParams,
  sendGA4Event,
} from '@/landing/analytics/ga4-client';
import {
  GA4Provider,
  useGA4,
} from '@/landing/analytics/GA4Context';
import { ConsentBanner } from '@/landing/ConsentBanner.client';
import { DemoPlayer } from '@/landing/DemoPlayer';
import { CopyCommand } from '@/landing/CopyCommand.client';

function callField(entry: unknown, index: number): unknown {
  const call = Array.isArray(entry) ? entry : Array.from(entry as IArguments);
  return call[index];
}

describe('GA4 Configuration & Predicate (SDK boundary)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('ValidateGA4Config_WhenFieldsMissingOrDisabled_ReturnsNull', () => {
    expect(validateGA4Config(null)).toBeNull();
    expect(validateGA4Config({})).toBeNull();
    expect(
      validateGA4Config({
        enabled: 'false',
        operatorApproval: 'approved',
        measurementId: 'G-TEST123456',
        pageUrl: 'https://test-site.org/',
      }),
    ).toBeNull();
  });

  it('ValidateGA4Config_WhenEnabledWithoutOperatorApproval_ReturnsNull', () => {
    expect(
      validateGA4Config({
        enabled: 'true',
        measurementId: 'G-TEST123456',
        pageUrl: 'https://test-site.org/',
      }),
    ).toBeNull();
  });

  it('ValidateGA4Config_WhenMeasurementIdIsInvalid_ReturnsNull', () => {
    // Missing G- prefix
    expect(
      validateGA4Config({
        enabled: 'true',
        operatorApproval: 'approved',
        measurementId: 'UA-123456-1',
        pageUrl: 'https://test-site.org/',
      }),
    ).toBeNull();

    // Contains whitespace or invalid characters
    expect(
      validateGA4Config({
        enabled: 'true',
        operatorApproval: 'approved',
        measurementId: 'G-123 456',
        pageUrl: 'https://test-site.org/',
      }),
    ).toBeNull();
  });

  it('ValidateGA4Config_WhenPageUrlIsNotHttpsOrHasQueryOrFragment_ReturnsNull', () => {
    expect(
      validateGA4Config({
        enabled: 'true',
        operatorApproval: 'approved',
        measurementId: 'G-TEST123456',
        pageUrl: 'http://test-site.org/',
      }),
    ).toBeNull();

    expect(
      validateGA4Config({
        enabled: 'true',
        operatorApproval: 'approved',
        measurementId: 'G-TEST123456',
        pageUrl: 'https://test-site.org/?utm_campaign=test',
      }),
    ).toBeNull();

    expect(
      validateGA4Config({
        enabled: 'true',
        operatorApproval: 'approved',
        measurementId: 'G-TEST123456',
        pageUrl: 'https://test-site.org/#anchor',
      }),
    ).toBeNull();
  });

  it('ValidateGA4Config_WhenValidAndApproved_ReturnsExactTagUrlAndPageDetails', () => {
    const config = validateGA4Config({
      enabled: 'true',
      operatorApproval: 'approved',
      measurementId: 'G-TEST123456',
      pageUrl: 'https://synthetic-test.org/',
    });

    expect(config).toEqual({
      enabled: true,
      measurementId: 'G-TEST123456',
      pageUrl: 'https://synthetic-test.org/',
      pageTitle: 'Agent Skills Standard',
      tagUrl: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123456',
      operatorApproved: true,
    });
  });

  it('GetGA4Config_ReadsStaticNextPublicEnvVariables', () => {
    process.env.NEXT_PUBLIC_GA4_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GA4_OPERATOR_APPROVAL = 'approved';
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = 'G-TEST123456';
    process.env.NEXT_PUBLIC_GA4_PAGE_URL = 'https://synthetic-test.org/';

    const config = getGA4Config();
    expect(config).not.toBeNull();
    expect(isGA4Configured()).toBe(true);
  });
});

describe('GA4 Field Normalization & Event Params (SDK boundary)', () => {
  const syntheticConfig: GA4Config = {
    enabled: true,
    measurementId: 'G-SYNTHETIC01',
    pageUrl: 'https://synthetic-test.org/',
    pageTitle: 'Agent Skills Standard',
    tagUrl: 'https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC01',
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
    const normalized = normalizeEventInput({
      event_name: 'demo_play',
      campaign_id: 'standards-demo-01',
      asset_id: 'demo-01', // synthetic only; falls back to unknown
      placement: 'quickstart_demo',
    });

    expect(normalized.campaign_id).toBe('standards-demo-01');
    expect(normalized.asset_id).toBe('unknown');
    expect(normalized.placement).toBe('quickstart_demo');
  });

  it('BuildGA4EventParams_ContainsExactlyFourClosedProperties', () => {
    const params = buildGA4EventParams({
      event_name: 'github_click',
      campaign_id: 'standards-demo-01',
      asset_id: 'announcement-github-01',
      placement: 'header_github',
    });

    // Exact four application parameters only (no send_to, no dynamic location/referrer)
    expect(params).toEqual({
      schema_version: 1,
      campaign_id: 'standards-demo-01',
      asset_id: 'announcement-github-01',
      placement: 'header_github',
    });
  });

  it('SendGA4Event_DispatchesToGlobalGtagWithoutSwallowingErrors', () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    const result = sendGA4Event(
      {
        event_name: 'github_click',
        campaign_id: 'standards-demo-01',
        asset_id: 'announcement-github-01',
        placement: 'header_github',
      },
      syntheticConfig,
    );

    expect(result).toBe(true);
    expect(mockGtag).toHaveBeenCalledWith('event', 'github_click', {
      schema_version: 1,
      campaign_id: 'standards-demo-01',
      asset_id: 'announcement-github-01',
      placement: 'header_github',
    });
  });
});

describe('GA4 Context Lifecycle & Basic Consent (SDK boundary)', () => {
  const syntheticConfig: GA4Config = {
    enabled: true,
    measurementId: 'G-SYNTHETIC01',
    pageUrl: 'https://synthetic-test.org/',
    pageTitle: 'Agent Skills Standard',
    tagUrl: 'https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC01',
    operatorApproved: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.gtag;
    delete window.dataLayer;
    delete window['ga-disable-G-SYNTHETIC01'];
    const existingScript = document.getElementById('ga4-tag-script');
    if (existingScript) {
      existingScript.remove();
    }
  });

  afterEach(() => {
    delete window.gtag;
    delete window.dataLayer;
    delete window['ga-disable-G-SYNTHETIC01'];
    const existingScript = document.getElementById('ga4-tag-script');
    if (existingScript) {
      existingScript.remove();
    }
  });

  function TestConsumer(): React.JSX.Element {
    const {
      isConfigured,
      consentStatus,
      hasConsent,
      tagFailed,
      acceptConsent,
      withdrawConsent,
      getConsentSnapshot,
      trackEvent,
    } = useGA4();

    return (
      <div>
        <span data-testid="is-configured">{isConfigured ? 'yes' : 'no'}</span>
        <span data-testid="consent-status">{consentStatus}</span>
        <span data-testid="has-consent">{hasConsent ? 'yes' : 'no'}</span>
        <span data-testid="tag-failed">{tagFailed ? 'yes' : 'no'}</span>
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

  it('GA4Context_DefaultsToUndecidedAndInjectsNoTagBeforeOptIn', () => {
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('undecided');
    expect(screen.getByTestId('has-consent')).toHaveTextContent('no');
    expect(document.getElementById('ga4-tag-script')).toBeNull();
    expect(window.gtag).toBeUndefined();
  });

  it('GA4Context_AcceptConsentInjectsTagAndAppliesPrivacySessionConfig', async () => {
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    expect(screen.getByTestId('consent-status')).toHaveTextContent('granted');
    expect(screen.getByTestId('has-consent')).toHaveTextContent('yes');
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(false);

    // Verify script tag injection
    const tagScript = document.getElementById('ga4-tag-script') as HTMLScriptElement;
    expect(tagScript).not.toBeNull();
    expect(tagScript.src).toBe(syntheticConfig.tagUrl);

    // Verify recorded gtag commands
    expect(window.dataLayer).toBeDefined();
    const recordedCalls = window.dataLayer as unknown[][];

    // Full denied default is seeded before the grant
    const consentDefaults = recordedCalls.filter(
      (call) => call[0] === 'consent' && call[1] === 'default',
    );
    expect(consentDefaults).toHaveLength(1);
    expect(consentDefaults[0]?.[2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });

    // Every grant update carries the complete consent set
    const consentUpdate = recordedCalls.find(
      (call) => call[0] === 'consent' && call[1] === 'update',
    );
    expect(consentUpdate).toBeDefined();
    expect(consentUpdate?.[2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });

    // Check feature restrictions: allow_google_signals: false, allow_ad_personalization_signals: false
    const setCall = recordedCalls.find(
      (call) => call[0] === 'set' && typeof call[1] === 'object',
    );
    expect(setCall).toBeDefined();
    expect(setCall?.[1]).toEqual({
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    expect((setCall?.[1] as Record<string, unknown>)?.restricted_data_processing).toBeUndefined();
    // Check config command: session-only cookie_expires: 0, cookie_domain: 'none', fixed page fields
    const configCall = recordedCalls.find(
      (call) => call[0] === 'config' && call[1] === 'G-SYNTHETIC01',
    );
    expect(configCall).toBeDefined();
    expect(configCall?.[2]).toEqual({
      send_page_view: false,
      cookie_expires: 0,
      cookie_domain: 'none',
      cookie_path: '/',
      cookie_flags: 'SameSite=Lax;Secure',
      page_location: 'https://synthetic-test.org/',
      page_title: 'Agent Skills Standard',
      page_referrer: '',
    });
  });

  it('GA4Context_WithdrawConsentDisablesInPlaceAndRetainsSdkConsumer', async () => {
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    // Opt in
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(false);

    // Emulate an already-running SDK consumer that captured the exact array and
    // patched push before withdrawal.
    const observedLayer = window.dataLayer as unknown[];
    const forwardedCalls: unknown[] = [];
    const nativePush = observedLayer.push;
    observedLayer.push = (...items: unknown[]) => {
      forwardedCalls.push(...items);
      return nativePush.call(observedLayer, ...items);
    };

    // Queue an event while script not loaded
    await act(async () => {
      fireEvent.click(screen.getByTestId('track-btn'));
    });

    // Withdraw
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-btn'));
    });
    expect(screen.getByTestId('consent-status')).toHaveTextContent('denied');
    expect(screen.getByTestId('has-consent')).toHaveTextContent('no');

    // Synchronous disable flag must be set
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);

    // Purge mutates the retained record instead of replacing it
    expect(window.dataLayer).toBe(observedLayer);

    const recordedCalls = window.dataLayer as unknown[][];
    const hasStaleConfig = recordedCalls.some((c) => c[0] === 'config');
    const hasStaleEvent = recordedCalls.some((c) => c[0] === 'event');
    const hasStaleGrantedConsent = recordedCalls.some(
      (c) => c[0] === 'consent' && (c[2] as Record<string, unknown>)?.analytics_storage === 'granted',
    );
    expect(hasStaleConfig).toBe(false);
    expect(hasStaleEvent).toBe(false);
    expect(hasStaleGrantedConsent).toBe(false);

    // The seeded full-denied default survives for the first SDK load
    const consentDefaults = recordedCalls.filter(
      (call) => call[0] === 'consent' && call[1] === 'default',
    );
    expect(consentDefaults).toHaveLength(1);
    expect(consentDefaults[0]?.[2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });

    // Denial update is recorded and reaches the retained SDK consumer
    const updateCall = recordedCalls.find(
      (call) => call[0] === 'consent' && call[1] === 'update',
    );
    expect(updateCall).toBeDefined();
    expect(updateCall?.[2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    const forwardedUpdate = forwardedCalls.find(
      (entry) => callField(entry, 0) === 'consent' && callField(entry, 1) === 'update',
    );
    expect(forwardedUpdate).toBeDefined();
    expect(callField(forwardedUpdate, 2)).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });

  it('GA4Context_RegrantAfterWithdrawalKeepsFullDeniedDefaultAndGrantsAllConsentFields', async () => {
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    // 1. Initial opt in
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    // 2. Withdraw
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-btn'));
    });

    // 3. Re-grant
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    const recordedCalls = window.dataLayer as unknown[][];

    // Exactly one surviving default, fully denied
    const consentDefaults = recordedCalls.filter(
      (call) => call[0] === 'consent' && call[1] === 'default',
    );
    expect(consentDefaults).toHaveLength(1);
    expect(consentDefaults[0]?.[2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });

    // Latest transition is an update granting analytics with the ad denials explicit
    const consentUpdates = recordedCalls.filter(
      (call) => call[0] === 'consent' && call[1] === 'update',
    );
    const latestUpdate = consentUpdates[consentUpdates.length - 1];
    expect(latestUpdate?.[2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
  });

  it('GA4Context_UnmountDisablesTagAndPurgesPendingWork', async () => {
    const { unmount } = render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(false);

    // Unmount
    unmount();

    // Unmount must disable tag and purge pending work
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);
    const recordedCalls = window.dataLayer as unknown[][];
    const hasStaleConfig = recordedCalls.some((c) => c[0] === 'config');
    expect(hasStaleConfig).toBe(false);
  });

  it('GA4Context_ScriptErrorTerminallyFailsClosedWithoutRegrantCommands', async () => {
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    const tagScript = document.getElementById('ga4-tag-script') as HTMLScriptElement;
    expect(tagScript).not.toBeNull();

    // Trigger script error
    await act(async () => {
      tagScript.onerror?.(new Event('error'));
    });

    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);
    const layerAfterFailure = window.dataLayer as unknown[];
    const callsAfterFailure = layerAfterFailure.length;
    const scriptsAfterFailure = document.querySelectorAll('#ga4-tag-script').length;
    expect(scriptsAfterFailure).toBe(1);

    // Withdraw then opt in again: no grant, config, reactivation, or queueing
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-btn'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    expect(screen.getByTestId('consent-status')).toHaveTextContent('denied');
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);
    expect((window.dataLayer as unknown[]).length).toBe(callsAfterFailure);
    expect(document.querySelectorAll('#ga4-tag-script')).toHaveLength(1);

    // Primary tracking still fails closed
    await act(async () => {
      fireEvent.click(screen.getByTestId('track-btn'));
    });

    const recordedCalls = window.dataLayer as unknown[][];
    const hasEvent = recordedCalls.some((c) => c[0] === 'event');
    const hasConfig = recordedCalls.some((c) => c[0] === 'config');
    expect(hasEvent).toBe(false);
    expect(hasConfig).toBe(false);
  });

  it('GA4Context_RemountAfterScriptErrorAdoptsOrphanedTagAsTerminallyFailed', async () => {
    const firstMount = render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });
    const tagScript = document.getElementById('ga4-tag-script') as HTMLScriptElement;
    await act(async () => {
      tagScript.onerror?.(new Event('error'));
    });
    expect(screen.getByTestId('tag-failed')).toHaveTextContent('yes');

    firstMount.unmount();

    // Fresh provider instance sees the orphaned tag: it must not reactivate it
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    expect(screen.getByTestId('tag-failed')).toHaveTextContent('yes');
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);

    const layerBeforeAccept = (window.dataLayer as unknown[]).length;
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    expect(screen.getByTestId('consent-status')).toHaveTextContent('undecided');
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);
    expect((window.dataLayer as unknown[]).length).toBe(layerBeforeAccept);
    expect(document.querySelectorAll('#ga4-tag-script')).toHaveLength(1);
  });

  it('GA4Context_RemountWhileTagLoadPendingAdoptsOrphanWithoutReactivation', async () => {
    const firstMount = render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });
    const orphanedScript = document.getElementById('ga4-tag-script') as HTMLScriptElement;
    expect(orphanedScript).not.toBeNull();

    // Remount while the previous load is still pending
    firstMount.unmount();
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    expect(screen.getByTestId('tag-failed')).toHaveTextContent('yes');
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);
    const layerBeforeAccept = (window.dataLayer as unknown[]).length;

    // The dead owner's callback must not resurrect or double-handle the tag
    await act(async () => {
      orphanedScript.onerror?.(new Event('error'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    expect(screen.getByTestId('consent-status')).toHaveTextContent('undecided');
    expect(window['ga-disable-G-SYNTHETIC01']).toBe(true);
    expect((window.dataLayer as unknown[]).length).toBe(layerBeforeAccept);
    expect(document.querySelectorAll('#ga4-tag-script')).toHaveLength(1);
    const recordedCalls = (window.dataLayer ?? []) as unknown[][];
    expect(recordedCalls.some((c) => c[0] === 'config')).toBe(false);
    expect(recordedCalls.some((c) => c[0] === 'event')).toBe(false);
  });

  it('GA4Context_WithdrawConsentClearsOnlyOwnedCookies', async () => {
    // Set cookies including an unrelated property cookie
    document.cookie = '_ga=GA1.1.123456; Path=/;';
    document.cookie = '_ga_SYNTHETIC01=GS1.1.123456; Path=/;';
    document.cookie = '_ga_OTHERPROPERTY=GS1.1.789012; Path=/;';

    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <TestConsumer />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-btn'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-btn'));
    });

    // Owned cookies cleared
    expect(document.cookie).not.toContain('_ga_SYNTHETIC01=GS1.1.123456');
    // Unrelated property cookie preserved
    expect(document.cookie).toContain('_ga_OTHERPROPERTY=GS1.1.789012');
  });
});

describe('CopyCommand Deferred Clipboard Write with GA4 (SDK boundary)', () => {
  const syntheticConfig: GA4Config = {
    enabled: true,
    measurementId: 'G-SYNTHETIC01',
    pageUrl: 'https://synthetic-test.org/',
    pageTitle: 'Agent Skills Standard',
    tagUrl: 'https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC01',
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
    const { acceptConsent, withdrawConsent } = useGA4();
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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete window.gtag;
    delete window.dataLayer;
    delete window['ga-disable-G-SYNTHETIC01'];
    const existingScript = document.getElementById('ga4-tag-script');
    if (existingScript) existingScript.remove();
  });

  it('CopyCommand_WhenCopyBegunPreConsentResolvesAfterOptIn_DoesNotTransmit', async () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    const deferredWrite = deferred<void>();
    const mockWriteText = vi.fn().mockReturnValue(deferredWrite.promise);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </GA4Provider>,
    );

    // 1. User clicks copy while undecided
    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // 2. User opts in while write is in flight
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 3. Write resolves
    await act(async () => {
      deferredWrite.resolve();
    });

    // 4. Must NOT transmit
    const eventCalls = mockGtag.mock.calls.filter((c) => c[0] === 'event');
    expect(eventCalls).toHaveLength(0);
  });

  it('CopyCommand_WhenConsentWithdrawnWhileCopyInFlight_DoesNotTransmit', async () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    const deferredWrite = deferred<void>();
    const mockWriteText = vi.fn().mockReturnValue(deferredWrite.promise);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </GA4Provider>,
    );

    // 1. Opt in first
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 2. Click copy
    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // 3. Withdraw consent while in flight
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-consent'));
    });

    // 4. Write resolves
    await act(async () => {
      deferredWrite.resolve();
    });

    // 5. Must NOT transmit
    const eventCalls = mockGtag.mock.calls.filter((c) => c[0] === 'event');
    expect(eventCalls).toHaveLength(0);
  });

  it('CopyCommand_WhenConsentWithdrawnAndRegrantedWhileInFlight_DoesNotTransmit', async () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    const deferredWrite = deferred<void>();
    const mockWriteText = vi.fn().mockReturnValue(deferredWrite.promise);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </GA4Provider>,
    );

    // 1. Opt in
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 2. Click copy
    const copyBtn = screen.getByRole('button', { name: /copy init command/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // 3. Withdraw and re-grant
    await act(async () => {
      fireEvent.click(screen.getByTestId('withdraw-consent'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    // 4. Write resolves
    await act(async () => {
      deferredWrite.resolve();
    });

    // 5. Epoch mismatch: must NOT transmit
    const eventCalls = mockGtag.mock.calls.filter((c) => c[0] === 'event');
    expect(eventCalls).toHaveLength(0);
  });

  it('CopyCommand_WhenGrantedAndResolvesUnderSameEpoch_TransmitsEvent', async () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <CopyCommandTestHarness />
      </GA4Provider>,
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

    expect(mockGtag).toHaveBeenCalledWith('event', 'install_command_copy', {
      schema_version: 1,
      campaign_id: 'standards-demo-01',
      asset_id: 'unknown',
      placement: 'quickstart_init',
    });
  });
});

describe('DemoPlayer Playing Negatives with GA4 (SDK boundary)', () => {
  const syntheticConfig: GA4Config = {
    enabled: true,
    measurementId: 'G-SYNTHETIC01',
    pageUrl: 'https://synthetic-test.org/',
    pageTitle: 'Agent Skills Standard',
    tagUrl: 'https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC01',
    operatorApproved: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete window.gtag;
    delete window.dataLayer;
    delete window['ga-disable-G-SYNTHETIC01'];
    const existingScript = document.getElementById('ga4-tag-script');
    if (existingScript) existingScript.remove();
  });

  function DemoPlayerTestHarness(): React.JSX.Element {
    const { acceptConsent } = useGA4();
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
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <DemoPlayerTestHarness />
      </GA4Provider>,
    );

    expect(mockGtag).not.toHaveBeenCalled();
  });

  it('DemoPlayer_ProgrammaticPlayAloneWithoutUserIntent_EmitsZeroEvents', async () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <DemoPlayerTestHarness />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('accept-consent'));
    });

    const video = screen.getByLabelText(/Demonstration: Synchronizing agent skills/i);

    // Synthetic/programmatic 'playing' event without explicit user activation
    await act(async () => {
      fireEvent.playing(video);
    });

    const eventCalls = mockGtag.mock.calls.filter((c) => c[0] === 'event');
    expect(eventCalls).toHaveLength(0);
  });
});

describe('Accessible Consent Control UI (ConsentBanner)', () => {
  const syntheticConfig: GA4Config = {
    enabled: true,
    measurementId: 'G-SYNTHETIC01',
    pageUrl: 'https://synthetic-test.org/',
    pageTitle: 'Agent Skills Standard',
    tagUrl: 'https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC01',
    operatorApproved: true,
  };

  beforeEach(() => {
    delete window.gtag;
    delete window.dataLayer;
    delete window['ga-disable-G-SYNTHETIC01'];
    const existingScript = document.getElementById('ga4-tag-script');
    if (existingScript) existingScript.remove();
  });

  it('ConsentBanner_WhenUnconfigured_RendersNothing', () => {
    const { container } = render(
      <GA4Provider overrideConfig={null}>
        <ConsentBanner />
      </GA4Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('ConsentBanner_OptInAndWithdrawTransitionsUpdateAccessibleControl', async () => {
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <ConsentBanner />
      </GA4Provider>,
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

  it('ConsentBanner_AfterScriptFailure_ShowsTerminalNoticeInsteadOfDeadOptIn', async () => {
    render(
      <GA4Provider overrideConfig={syntheticConfig}>
        <ConsentBanner />
      </GA4Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /accept analytics and opt in/i }));
    });

    const tagScript = document.getElementById('ga4-tag-script') as HTMLScriptElement;
    await act(async () => {
      tagScript.onerror?.(new Event('error'));
    });

    const notice = screen.getByText(/collection stays off/i);
    expect(notice).toHaveAttribute('role', 'status');

    // Withdrawal remains available after terminal failure
    expect(
      screen.getByRole('button', { name: /withdraw analytics consent/i }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /withdraw analytics consent/i }));
    });

    // No dead opt-in control is offered once the tag has terminally failed
    expect(
      screen.queryByRole('button', { name: /opt in to analytics/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/collection stays off/i)).toBeInTheDocument();
  });
});
