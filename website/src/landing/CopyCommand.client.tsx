"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ActionIcon } from "./ActionIcon";
import type { CommandId } from "./content";
import styles from "./interaction.module.css";
import motionStyles from "./command-motion.module.css";
import { useGA4 } from "./analytics/GA4Context";

export type { CommandId };

export interface CopyCommandProps {
  id: CommandId;
  command: string;
  delay?: number;
}

type CopyStatus = "idle" | "pending" | "copied" | "failed";
type RevealState = "pending" | "typing" | "complete";

export function CopyCommand({
  id,
  command,
  delay = 0,
}: CopyCommandProps): React.JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [revealState, setRevealState] = useState<RevealState>("pending");
  const { trackEvent, getConsentSnapshot } = useGA4();

  const rowRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const resetTimerRef = useRef<number | NodeJS.Timeout | null>(null);
  const delayTimerRef = useRef<number | NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<number | NodeJS.Timeout | null>(null);
  const operationIdRef = useRef<number>(0);
  const hasAnimatedRef = useRef<boolean>(false);

  const recoveryMessage =
    "Copy failed. Select the command to copy it manually, or retry.";

  useEffect(() => {
    operationIdRef.current++;
    clearTimeout(resetTimerRef.current ?? undefined);
    resetTimerRef.current = null;
    setStatus("idle");
  }, [id, command]);

  // Unmount-only cleanup: invalidate any in-flight write and drop its reset timer.
  useEffect(() => {
    return () => {
      operationIdRef.current++;
      clearTimeout(resetTimerRef.current ?? undefined);
      resetTimerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let unmounted = false;
    setMounted(true);

    const reducedMotionQuery =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const hasIntersectionObserver =
      typeof window !== "undefined" &&
      typeof window.IntersectionObserver !== "undefined";

    const handleReducedMotionChange = (
      e: MediaQueryListEvent | MediaQueryList,
    ) => {
      if (e.matches) {
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }
        if (completeTimerRef.current) {
          clearTimeout(completeTimerRef.current);
          completeTimerRef.current = null;
        }
        if (!unmounted) {
          setRevealState("complete");
        }
        hasAnimatedRef.current = true;
      }
    };

    if (
      reducedMotionQuery?.matches ||
      !hasIntersectionObserver ||
      hasAnimatedRef.current
    ) {
      setRevealState("complete");
      hasAnimatedRef.current = true;
    }

    if (reducedMotionQuery) {
      reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    }

    const rowEl = rowRef.current;
    if (
      !rowEl ||
      reducedMotionQuery?.matches ||
      !hasIntersectionObserver ||
      hasAnimatedRef.current
    ) {
      return () => {
        unmounted = true;
        if (reducedMotionQuery) {
          reducedMotionQuery.removeEventListener(
            "change",
            handleReducedMotionChange,
          );
        }
        clearTimeout(delayTimerRef.current ?? undefined);
        delayTimerRef.current = null;
        clearTimeout(completeTimerRef.current ?? undefined);
        completeTimerRef.current = null;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (unmounted) return;
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          observer.disconnect();
          hasAnimatedRef.current = true;

          if (delay > 0) {
            delayTimerRef.current = setTimeout(() => {
              if (!unmounted) {
                setRevealState("typing");
              }
            }, delay);
          } else {
            setRevealState("typing");
          }
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(rowEl);

    return () => {
      unmounted = true;
      observer.disconnect();
      if (reducedMotionQuery) {
        reducedMotionQuery.removeEventListener(
          "change",
          handleReducedMotionChange,
        );
      }
      clearTimeout(delayTimerRef.current ?? undefined);
      delayTimerRef.current = null;
      clearTimeout(completeTimerRef.current ?? undefined);
      completeTimerRef.current = null;
    };
  }, [delay]);

  // When typing begins, schedule bounded completion safety timer
  useEffect(() => {
    if (revealState === "typing") {
      const typeDuration = Math.min(Math.max(command.length * 32, 450), 1400);
      completeTimerRef.current = setTimeout(() => {
        setRevealState("complete");
      }, typeDuration + 1500);
    }
  }, [revealState, command.length]);

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLElement>) => {
      if (
        e.animationName.includes("Blink") ||
        e.animationName.includes("Typewriter")
      ) {
        if (e.animationName.includes("Blink")) {
          setRevealState("complete");
          clearTimeout(completeTimerRef.current ?? undefined);
          completeTimerRef.current = null;
        }
      }
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    // Disable duplicate pending writes
    if (status === "pending") {
      return;
    }

    clearTimeout(resetTimerRef.current ?? undefined);
    resetTimerRef.current = null;

    const currentOpId = ++operationIdRef.current;

    // Capture granted consent epoch at START of action
    const consentAtStart = getConsentSnapshot();
    const actionConsentEpoch =
      consentAtStart.status === "granted" ? consentAtStart.epoch : null;

    setStatus("pending");
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("Clipboard API is not available");
      }

      await navigator.clipboard.writeText(command);

      // Stale operation guard: do not set state or schedule timers if invalidated
      if (operationIdRef.current !== currentOpId) {
        return;
      }

      setStatus("copied");

      // Only transmit if consent was granted at start and remains valid under the same epoch
      if (actionConsentEpoch !== null) {
        const placement =
          id === "init" || id === "npx-init"
            ? "quickstart_init"
            : id === "sync" || id === "npx-sync"
              ? "quickstart_sync"
              : "unknown";

        trackEvent(
          {
            event_name: "install_command_copy",
            campaign_id: "standards-demo-01",
            asset_id: "unknown",
            placement,
          },
          actionConsentEpoch,
        ).catch(() => {});
      }
      resetTimerRef.current = setTimeout(() => {
        if (operationIdRef.current === currentOpId) {
          setStatus("idle");
        }
      }, 2500);
    } catch {
      // Do not expose browser-specific exception text in the fixed recovery footprint.
      if (operationIdRef.current !== currentOpId) {
        return;
      }

      setStatus("failed");
    }
  }, [command, id, status, getConsentSnapshot, trackEvent]);

  const handleSelectCode = useCallback(() => {
    if (!codeRef.current || typeof window === "undefined") {
      return;
    }
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(codeRef.current);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const accessibleLabel =
    status === "failed" ? `Retry copy ${id} command` : `Copy ${id} command`;

  const liveAnnouncement =
    status === "copied"
      ? `Copied ${id} command to clipboard`
      : status === "failed"
        ? `Failed to copy ${id} command. Manual selection available.`
        : status === "pending"
          ? `Copying ${id} command...`
          : "";

  const motionClass =
    !mounted || revealState === "complete"
      ? motionStyles.complete
      : revealState === "typing"
        ? motionStyles.typing
        : motionStyles.pending;

  const typeDuration = Math.min(Math.max(command.length * 32, 450), 1400);

  return (
    <div
      ref={rowRef}
      className={styles.commandRow}
      data-command={command}
      data-revealed={revealState}
    >
      {/* Semantic pre/code element with manual select preservation */}
      <div className={styles.commandContent}>
        <pre
          className={styles.commandPre}
          tabIndex={0}
          aria-label={`${id} command`}
        >
          <code
            ref={codeRef}
            className={`${styles.commandCode} ${motionClass}`}
            data-motion-state={revealState}
            style={
              {
                "--char-count": command.length,
                "--type-duration": `${typeDuration}ms`,
              } as React.CSSProperties
            }
            onAnimationEnd={handleAnimationEnd}
          >
            {command}
          </code>
        </pre>

        {/* The reserved status slot keeps recovery controls within the row footprint. */}
        <div
          className={styles.statusSlot}
          aria-live="polite"
          aria-atomic="true"
        >
          {status === "failed" ? (
            <div className={styles.failureControls}>
              <button
                type="button"
                className={styles.selectCommandButton}
                onClick={handleSelectCode}
                aria-label={`Select ${id} command text`}
              >
                Select command
              </button>
              <p className={styles.statusMessage} role="alert">
                {recoveryMessage}
              </p>
            </div>
          ) : (
            <div className={styles.srOnly} role="status">
              {liveAnnouncement}
            </div>
          )}
        </div>
      </div>

      <div className={styles.controlArea}>
        {!mounted ? (
          // No-JS baseline: do not expose an interactive button before client hydration
          <span className={styles.noJsNotice} aria-hidden="true" />
        ) : (
          <button
            type="button"
            className={`${styles.copyButton} ${
              status === "pending"
                ? styles.copyPending
                : status === "copied"
                  ? styles.copySuccess
                  : status === "failed"
                    ? styles.copyError
                    : styles.copyIdle
            }`}
            onClick={handleCopy}
            disabled={status === "pending"}
            aria-label={accessibleLabel}
          >
            {status === "pending" ? (
              <span>Copying...</span>
            ) : status === "copied" ? (
              <>
                <ActionIcon name="check" />
                <span>Copied</span>
              </>
            ) : status === "failed" ? (
              <>
                <ActionIcon name="copy" />
                <span>Retry</span>
              </>
            ) : (
              <>
                <ActionIcon name="copy" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
