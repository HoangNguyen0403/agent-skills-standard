"use client";

import React from "react";
import { usePlausible } from "./analytics/PlausibleContext";
import styles from "./consent-banner.module.css";

export function ConsentBanner(): React.JSX.Element | null {
  const { isConfigured, consentStatus, acceptConsent, withdrawConsent } =
    usePlausible();

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
              Privacy &amp; Analytics Notice (Plausible Analytics)
            </h2>
            <p className={styles.body}>
              Analytics collection is <strong>disabled by default</strong>. If
              you choose to opt in, direct browser events (demo playback,
              command copy, setup guide links, and GitHub links) are sent to{" "}
              <code>https://plausible.io/api/event</code>.
            </p>
            <p className={styles.body}>
              Plausible processes your browser IP address and User-Agent to
              calculate a daily unique visitor hash using a daily rotating salt
              (deleted every 24 hours). Individual event and session records are
              stored (not aggregate-only storage) with up to 5-year retention
              under Plausible Business terms; 24-hour salt lifetime is not data
              retention. We do <strong>not</strong> claim completely anonymous
              or identifier-free operation, as browser IP, User-Agent, and
              Origin are disclosed in network transmission. No persistent
              cookies or visitor IDs are stored. See the{" "}
              <a
                href="https://plausible.io/data-policy"
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "var(--lime, #c7f36b)", textDecoration: "underline" }}
              >
                Plausible Data Policy
              </a>{" "}
              for limitations. You may withdraw consent at any time to
              immediately stop future event collection.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.acceptButton}
              onClick={acceptConsent}
              aria-label="Accept analytics and opt in"
            >
              Accept analytics
            </button>
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
        {consentStatus === "granted" ? (
          <button
            type="button"
            className={styles.linkButton}
            onClick={withdrawConsent}
            aria-label="Withdraw analytics consent"
          >
            Withdraw consent
          </button>
        ) : (
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
