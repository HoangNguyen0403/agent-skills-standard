"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  getPlausibleConfig,
  type PlausibleConfig,
} from "./plausible-config";
import {
  type RawEventInput,
  sendPlausibleEvent,
} from "./plausible-client";

export type ConsentStatus = "undecided" | "granted" | "denied";

export interface ConsentSnapshot {
  readonly status: ConsentStatus;
  readonly epoch: number;
}

export interface PlausibleContextValue {
  readonly isConfigured: boolean;
  readonly config: PlausibleConfig | null;
  readonly consentStatus: ConsentStatus;
  readonly hasConsent: boolean;
  readonly acceptConsent: () => void;
  readonly withdrawConsent: () => void;
  readonly getConsentSnapshot: () => ConsentSnapshot;
  readonly trackEvent: (
    input: RawEventInput,
    actionEpoch?: number,
  ) => Promise<boolean>;
}

const PlausibleContext = createContext<PlausibleContextValue | null>(null);

export function PlausibleProvider({
  children,
  overrideConfig,
}: {
  children: React.ReactNode;
  overrideConfig?: PlausibleConfig | null;
}): React.JSX.Element {
  const [config] = useState<PlausibleConfig | null>(() =>
    overrideConfig !== undefined ? overrideConfig : getPlausibleConfig(),
  );

  // In-memory ONLY state: defaults to undecided on every page load.
  // Strictly no sessionStorage, localStorage, or cookies.
  const [consentStatus, setConsentStatus] =
    useState<ConsentStatus>("undecided");
  const consentEpochRef = useRef<number>(0);
  const consentRef = useRef<ConsentSnapshot>({
    status: "undecided",
    epoch: 0,
  });

  const acceptConsent = useCallback(() => {
    const nextEpoch = consentEpochRef.current + 1;
    consentEpochRef.current = nextEpoch;
    consentRef.current = { status: "granted", epoch: nextEpoch };
    setConsentStatus("granted");
  }, []);

  const withdrawConsent = useCallback(() => {
    const nextEpoch = consentEpochRef.current + 1;
    consentEpochRef.current = nextEpoch;
    consentRef.current = { status: "denied", epoch: nextEpoch };
    setConsentStatus("denied");
  }, []);

  const getConsentSnapshot = useCallback((): ConsentSnapshot => {
    return consentRef.current;
  }, []);

  const trackEvent = useCallback(
    async (
      input: RawEventInput,
      actionEpoch?: number,
    ): Promise<boolean> => {
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

      return sendPlausibleEvent(input, config);
    },
    [config],
  );

  const isConfigured = config !== null;
  const hasConsent = isConfigured && consentStatus === "granted";

  const value = useMemo<PlausibleContextValue>(
    () => ({
      isConfigured,
      config,
      consentStatus,
      hasConsent,
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
      acceptConsent,
      withdrawConsent,
      getConsentSnapshot,
      trackEvent,
    ],
  );

  return (
    <PlausibleContext.Provider value={value}>
      {children}
    </PlausibleContext.Provider>
  );
}

export function usePlausible(): PlausibleContextValue {
  const context = useContext(PlausibleContext);
  if (!context) {
    return {
      isConfigured: false,
      config: null,
      consentStatus: "undecided",
      hasConsent: false,
      acceptConsent: () => {},
      withdrawConsent: () => {},
      getConsentSnapshot: () => ({ status: "undecided", epoch: 0 }),
      trackEvent: async () => false,
    };
  }
  return context;
}
