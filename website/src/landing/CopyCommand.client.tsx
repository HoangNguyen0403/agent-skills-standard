"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ActionIcon } from "./ActionIcon";
import styles from "./interaction.module.css";

export interface CopyCommandProps {
  id: "init" | "sync";
  command: string;
}

type CopyStatus = "idle" | "pending" | "copied" | "failed";

export function CopyCommand({
  id,
  command,
}: CopyCommandProps): React.JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  const [status, setStatus] = useState<CopyStatus>("idle");

  const codeRef = useRef<HTMLElement>(null);
  const resetTimerRef = useRef<number | NodeJS.Timeout | null>(null);
  const operationIdRef = useRef<number>(0);

  const recoveryMessage =
    "Copy failed. Select the command to copy it manually, or retry.";

  useEffect(() => {
    operationIdRef.current++;
    clearTimeout(resetTimerRef.current ?? undefined);
    resetTimerRef.current = null;
    setStatus("idle");
  }, [id, command]);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Invalidate outstanding operation identity and timer on unmount
      operationIdRef.current++;
      clearTimeout(resetTimerRef.current ?? undefined);
      resetTimerRef.current = null;
    };
  }, []);

  const handleCopy = useCallback(async () => {
    // Disable duplicate pending writes
    if (status === "pending") {
      return;
    }

    clearTimeout(resetTimerRef.current ?? undefined);
    resetTimerRef.current = null;

    const currentOpId = ++operationIdRef.current;
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
  }, [command, status]);

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

  return (
    <div className={styles.commandRow} data-command={command}>
      {/* Semantic pre/code element with manual select preservation */}
      <div className={styles.commandContent}>
        <pre
          className={styles.commandPre}
          tabIndex={0}
          aria-label={`${id} command`}
        >
          <code ref={codeRef} className={styles.commandCode}>
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
          // No-JS baseline: do not expose an inert interactive button before client hydration
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
