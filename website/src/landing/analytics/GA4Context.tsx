"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  getGA4Config,
  type GA4Config,
} from "./ga4-config";
import {
  type RawEventInput,
  sendGA4Event,
} from "./ga4-client";

export type ConsentStatus = "undecided" | "granted" | "denied";

export interface ConsentSnapshot {
  readonly status: ConsentStatus;
  readonly epoch: number;
}

export interface GA4ContextValue {
  readonly isConfigured: boolean;
  readonly config: GA4Config | null;
  readonly consentStatus: ConsentStatus;
  readonly hasConsent: boolean;
  readonly tagFailed: boolean;
  readonly acceptConsent: () => void;
  readonly withdrawConsent: () => void;
  readonly getConsentSnapshot: () => ConsentSnapshot;
  readonly trackEvent: (
    input: RawEventInput,
    actionEpoch?: number,
  ) => Promise<boolean>;
}

const GA4Context = createContext<GA4ContextValue | null>(null);

const GA4_SCRIPT_ID = "ga4-tag-script";

// Every consent command carries the complete advertising denial set. A partial
// `analytics_storage`-only update would leave Google's ad defaults implicit.
const DENIED_CONSENT = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

function clearOwnedAnalyticsCookies(measurementId: string): void {
  if (typeof document === "undefined" || !document.cookie) {
    return;
  }
  try {
    const containerId = measurementId.replace(/^G-/, "");
    const ownedCookieNames = new Set(["_ga", `_ga_${containerId}`]);

    const cookieParts = document.cookie.split(";");
    for (const part of cookieParts) {
      const name = part.split("=")[0]?.trim();
      if (name && ownedCookieNames.has(name)) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
      }
    }
  } catch {
    // Ignore cookie errors in restricted or sandboxed environments
  }
}

function isAppOwnedAnalyticsCommand(entry: unknown): boolean {
  const args = Array.isArray(entry) ? entry : Array.from(entry as IArguments);
  const command = args[0];

  // Commands queued by this provider while consent was granted.
  if (
    command === "config" ||
    command === "event" ||
    command === "js" ||
    command === "set"
  ) {
    return true;
  }

  // Consent updates are app-owned grant/denial transitions. The seeded
  // `default` denial is deliberately retained for the first SDK load.
  return command === "consent" && args[1] === "update";
}

function purgeAppPendingCommandsFromDataLayer(): void {
  if (typeof window === "undefined") {
    return;
  }

  const dataLayer = window.dataLayer;
  if (!Array.isArray(dataLayer)) {
    return;
  }

  // Mutate the existing record in place: a Google tag (or any consumer) may
  // already hold this exact array and a patched push reference. Reassigning
  // `window.dataLayer` would detach both and leave stale grants/config visible.
  for (let index = dataLayer.length - 1; index >= 0; index -= 1) {
    if (isAppOwnedAnalyticsCommand(dataLayer[index])) {
      dataLayer.splice(index, 1);
    }
  }
}

export function GA4Provider({
  children,
  overrideConfig,
}: {
  children: React.ReactNode;
  overrideConfig?: GA4Config | null;
}): React.JSX.Element {
  const [config] = useState<GA4Config | null>(() =>
    overrideConfig !== undefined ? overrideConfig : getGA4Config(),
  );

  // In-memory ONLY consent state: defaults to undecided on every page load.
  // Strictly no sessionStorage, localStorage, or cookies for consent persistence.
  const [consentStatus, setConsentStatus] =
    useState<ConsentStatus>("undecided");
  const consentEpochRef = useRef<number>(0);
  const consentRef = useRef<ConsentSnapshot>({
    status: "undecided",
    epoch: 0,
  });
  const unmountedRef = useRef<boolean>(false);
  const hasSeededConsentDefaultRef = useRef<boolean>(false);
  const isScriptFailedRef = useRef<boolean>(false);
  const ownsTagScriptRef = useRef<boolean>(false);
  const [tagFailed, setTagFailed] = useState<boolean>(false);

  useEffect(() => {
    unmountedRef.current = false;

    if (config && typeof window !== "undefined") {
      const existingTag =
        typeof document !== "undefined"
          ? document.getElementById(GA4_SCRIPT_ID)
          : null;

      if (existingTag && !ownsTagScriptRef.current) {
        // A tag script left by an earlier provider instance (remount without a
        // page reload) is not owned here. Adopt it as terminally failed rather
        // than reactivating or reloading it: its callbacks belong to the dead
        // owner, so this page load cannot safely attribute or count anything.
        isScriptFailedRef.current = true;
        setTagFailed(true);
        window[`ga-disable-${config.measurementId}`] = true;
        purgeAppPendingCommandsFromDataLayer();
      } else if (
        consentRef.current.status === "granted" &&
        !isScriptFailedRef.current
      ) {
        // StrictMode re-mount on the same instance: restore un-disabled state.
        window[`ga-disable-${config.measurementId}`] = false;
      }
    }

    return () => {
      unmountedRef.current = true;
      // Invalidate any in-flight actions, including the live snapshot epoch
      const nextEpoch = consentEpochRef.current + 1;
      consentEpochRef.current = nextEpoch;
      consentRef.current = {
        status: consentRef.current.status,
        epoch: nextEpoch,
      };

      // Disable Google tag synchronously on unmount
      if (config && typeof window !== "undefined") {
        window[`ga-disable-${config.measurementId}`] = true;
      }

      // Discard owned pending work from dataLayer
      purgeAppPendingCommandsFromDataLayer();
    };
  }, [config]);

  // Terminal failure policy: a tag that failed to load is never retried or
  // reactivated in this page load. Collection stays off until a reload.
  const failClosed = useCallback(() => {
    if (isScriptFailedRef.current) {
      return;
    }
    isScriptFailedRef.current = true;
    setTagFailed(true);

    if (typeof window !== "undefined") {
      if (config) {
        window[`ga-disable-${config.measurementId}`] = true;
      }
      purgeAppPendingCommandsFromDataLayer();
    }
  }, [config]);

  const acceptConsent = useCallback(() => {
    if (!config) {
      return;
    }

    // Terminal failure: no grant, config, reactivation, or new queued commands.
    if (isScriptFailedRef.current) {
      return;
    }

    // A tag script not created by this instance belongs to a dead owner; adopt
    // it as terminally failed instead of reactivating it.
    if (typeof document !== "undefined") {
      const foreignTag = document.getElementById(GA4_SCRIPT_ID);
      if (foreignTag && !ownsTagScriptRef.current) {
        failClosed();
        return;
      }
    }

    const nextEpoch = consentEpochRef.current + 1;
    consentEpochRef.current = nextEpoch;
    consentRef.current = { status: "granted", epoch: nextEpoch };
    setConsentStatus("granted");

    if (typeof window === "undefined") {
      return;
    }

    // Reactivate: clear disable flag for current generation
    window[`ga-disable-${config.measurementId}`] = false;

    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
    }

    // Seed the complete denied default exactly once, before any grant, so a
    // surviving first-load queue always carries explicit advertising denials.
    if (!hasSeededConsentDefaultRef.current) {
      window.gtag("consent", "default", DENIED_CONSENT);
      hasSeededConsentDefaultRef.current = true;
    }

    // Every grant states the whole consent set, never analytics_storage alone.
    window.gtag("consent", "update", {
      ...DENIED_CONSENT,
      analytics_storage: "granted",
    });

    // Disable Google signals and ad personalization signals (no Ads linked)
    window.gtag("set", {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    window.gtag("js", new Date());

    // Config command with session-only cookie, host-only domain, and fixed page fields
    window.gtag("config", config.measurementId, {
      send_page_view: false,
      cookie_expires: 0,
      cookie_domain: "none",
      cookie_path: "/",
      cookie_flags: "SameSite=Lax;Secure",
      page_location: config.pageUrl,
      page_title: config.pageTitle,
      page_referrer: "",
    });

    // Basic loading: inject direct Google tag script only after explicit opt-in
    if (typeof document !== "undefined") {
      const existingScript = document.getElementById(GA4_SCRIPT_ID);
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = GA4_SCRIPT_ID;
        script.async = true;
        script.src = config.tagUrl;
        script.onerror = () => {
          if (unmountedRef.current) {
            return;
          }
          failClosed();
        };
        ownsTagScriptRef.current = true;
        document.head.appendChild(script);
      }
    }
  }, [config, failClosed]);

  const withdrawConsent = useCallback(() => {
    const nextEpoch = consentEpochRef.current + 1;
    consentEpochRef.current = nextEpoch;
    consentRef.current = { status: "denied", epoch: nextEpoch };
    setConsentStatus("denied");

    if (typeof window !== "undefined") {
      if (config) {
        // Synchronously set disable flag BEFORE any other tag commands
        window[`ga-disable-${config.measurementId}`] = true;
      }

      // Discard app-owned pending commands/actions while SDK not loaded
      purgeAppPendingCommandsFromDataLayer();

      // After a terminal load failure no further commands are queued.
      if (
        !isScriptFailedRef.current &&
        typeof window.gtag === "function"
      ) {
        window.gtag("consent", "update", DENIED_CONSENT);
      }

      // Remove owned analytics cookies scoped to this measurement ID
      if (config) {
        clearOwnedAnalyticsCookies(config.measurementId);
      }
    }
  }, [config]);

  const getConsentSnapshot = useCallback((): ConsentSnapshot => {
    return consentRef.current;
  }, []);

  const trackEvent = useCallback(
    async (
      input: RawEventInput,
      actionEpoch?: number,
    ): Promise<boolean> => {
      if (unmountedRef.current) {
        return false;
      }

      // Fail closed if script loading has failed
      if (isScriptFailedRef.current) {
        return false;
      }

      // Always inspect live in-memory consent, never stale closure
      const currentSnapshot = consentRef.current;

      // Unconfigured or absent consent: zero transport calls
      if (!config || currentSnapshot.status !== "granted") {
        return false;
      }

      // Action began before consent or under an invalidated consent epoch
      if (
        actionEpoch !== undefined &&
        actionEpoch !== currentSnapshot.epoch
      ) {
        return false;
      }

      return sendGA4Event(input, config);
    },
    [config],
  );

  const isConfigured = config !== null;
  const hasConsent = isConfigured && consentStatus === "granted";

  const value = useMemo<GA4ContextValue>(
    () => ({
      isConfigured,
      config,
      consentStatus,
      hasConsent,
      tagFailed,
      acceptConsent,
      withdrawConsent,
      getConsentSnapshot,
      trackEvent,
    }),
    [
      isConfigured,
      config,
      consentStatus,
      hasConsent,
      tagFailed,
      acceptConsent,
      withdrawConsent,
      getConsentSnapshot,
      trackEvent,
    ],
  );

  return <GA4Context.Provider value={value}>{children}</GA4Context.Provider>;
}

export function useGA4(): GA4ContextValue {
  const context = useContext(GA4Context);
  if (!context) {
    return {
      isConfigured: false,
      config: null,
      consentStatus: "undecided",
      hasConsent: false,
      tagFailed: false,
      acceptConsent: () => {},
      withdrawConsent: () => {},
      getConsentSnapshot: () => ({ status: "undecided", epoch: 0 }),
      trackEvent: async () => false,
    };
  }
  return context;
}
