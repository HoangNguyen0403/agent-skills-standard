"use client";

import React from "react";
import { useGA4 } from "./analytics/GA4Context";
import styles from "./consent-banner.module.css";

export function ConsentBanner(): React.JSX.Element | null {
  const {
    isConfigured,
    consentStatus,
    tagFailed,
    acceptConsent,
    withdrawConsent,
  } = useGA4();

  // In default unconfigured or disabled builds: zero UI intrusion, no prompts
  if (!isConfigured) {
    return null;
  }

  // When collection is enabled and approved, but user has not decided: show opt-in notice
  if (consentStatus === "undecided") {
    return (
      <aside
        className={styles.banner}
        role="region"
        aria-label="Analytics consent settings"
        aria-labelledby="consent-banner-heading"
      >
        <div className={styles.container}>
          <div className={styles.content}>
            <h2 id="consent-banner-heading" className={styles.title}>
              Privacy &amp; Analytics Notice (Google Analytics 4)
            </h2>
            <p className={styles.body}>
              Analytics collection is <strong>disabled by default</strong>. If
              you choose to opt in, Google Analytics 4 (via Google tag) is loaded
              to measure four explicit user actions: demo playback, command
              copy, setup documentation links, and GitHub repository links.
            </p>
            <p className={styles.body}>
              Google sets session-only analytics cookies (<code>cookie_expires: 0</code>,{" "}
              <code>cookie_domain: &apos;none&apos;</code>) and processes your browser IP
              address, User-Agent, and session identifiers. Advertising features,
              Google Signals, and ad personalization are disabled. We do{" "}
              <strong>not</strong> claim completely anonymous or identifier-free
              operation, as browser and network metadata are processed by Google.
              See{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "var(--lime, #c7f36b)", textDecoration: "underline" }}
              >
                Google Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="https://support.google.com/analytics/answer/6004245"
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "var(--lime, #c7f36b)", textDecoration: "underline" }}
              >
                Google Analytics Data Privacy
              </a>{" "}
              for vendor processing details. You may withdraw consent at any time
              to immediately disable collection and remove session cookies.
            </p>
          </div>

          <div className={styles.actions}>
            {tagFailed ? (
              <span className={styles.dockedStatus} role="status">
                Analytics could not load; collection stays off until this page
                is reloaded.
              </span>
            ) : (
              <button
                type="button"
                className={styles.acceptButton}
                onClick={acceptConsent}
                aria-label="Accept analytics and opt in"
              >
                Accept analytics
              </button>
            )}
            <button
              type="button"
              className={styles.declineButton}
              onClick={withdrawConsent}
              aria-label="Decline analytics"
            >
              Decline
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // When user has made an explicit choice: provide accessible docked preference management
  return (
    <aside
      className={styles.dockedBar}
      role="region"
      aria-label="Analytics preferences"
    >
      <div className={styles.dockedContainer}>
        <span className={styles.dockedStatus}>
          Analytics: {consentStatus === "granted" ? "Opted in" : "Opted out"}
        </span>
        {tagFailed ? (
          <span className={styles.dockedStatus} role="status">
            Analytics could not load; collection stays off until this page is
            reloaded.
          </span>
        ) : null}
        {consentStatus === "granted" ? (
          <button
            type="button"
            className={styles.linkButton}
            onClick={withdrawConsent}
            aria-label="Withdraw analytics consent"
          >
            Withdraw consent
          </button>
        ) : tagFailed ? null : (
          <button
            type="button"
            className={styles.linkButton}
            onClick={acceptConsent}
            aria-label="Opt in to analytics"
          >
            Opt in
          </button>
        )}
      </div>
    </aside>
  );
}
