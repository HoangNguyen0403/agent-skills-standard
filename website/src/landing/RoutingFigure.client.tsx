"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./motion.module.css";

/**
 * RoutingFigure renders the approved FIG. 01 technical panel.
 * Illustrates the logical three-node agent routing flow:
 * Editing a TypeScript file / AGENTS.md -> Category index / typescript/_INDEX.md -> Matching skill / SKILL.md.
 * Provides a user-initiated Replay walkthrough control that respects reduced motion.
 */
export function RoutingFigure(): React.JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  const figureRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReplay = () => {
    const el = figureRef.current;
    if (!el) return;
    el.dispatchEvent(
      new CustomEvent("motion-replay", { bubbles: true, cancelable: true }),
    );
  };

  return (
    <figure
      ref={figureRef}
      className={styles.routing}
      data-motion="routing"
      data-motion-state="idle"
      aria-label="Agent routing illustrative walkthrough"
    >
      {/* Decorative technical grid background */}
      <svg
        className={styles.gridOverlay}
        aria-hidden="true"
        focusable="false"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="routing-grid-pattern"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="rgba(187, 195, 186, 0.06)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#routing-grid-pattern)" />
      </svg>

      {/* Panel Header */}
      <div className={styles.routingHeader}>
        <div className={styles.routingFigBadge}>FIG. 01</div>
        <div className={styles.routingFigTitle}>Illustrative walkthrough</div>
      </div>

      {/* Nodes and Connectors */}
      <div className={styles.routingNodes}>
        {/* Node 1: File Trigger */}
        <div className={styles.routingNode}>
          <div className={styles.routingNodeTitle}>
            Editing a TypeScript file
          </div>
          <div className={styles.routingNodeTrigger}>AGENTS.md</div>
        </div>

        {/* Connector 1 */}
        <div className={styles.routingConnector} aria-hidden="true">
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <line
              x1="12"
              y1="0"
              x2="12"
              y2="24"
              stroke="currentColor"
              strokeWidth="1.75"
              className={styles.routingConnectorLine}
            />
            <polyline
              points="6,18 12,24 18,18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Node 2: Category Index */}
        <div className={styles.routingNode}>
          <div className={styles.routingNodeTitle}>Category index</div>
          <div className={styles.routingNodeTrigger}>typescript/_INDEX.md</div>
        </div>

        {/* Connector 2 */}
        <div className={styles.routingConnector} aria-hidden="true">
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <line
              x1="12"
              y1="0"
              x2="12"
              y2="24"
              stroke="currentColor"
              strokeWidth="1.75"
              className={styles.routingConnectorLine}
            />
            <polyline
              points="6,18 12,24 18,18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Node 3: Matching Skill */}
        <div className={`${styles.routingNode} ${styles.routingNodeActive}`}>
          <div className={styles.routingNodeTitle}>Matching skill</div>
          <div
            className={`${styles.routingNodeTrigger} ${styles.routingNodeTriggerLime}`}
          >
            SKILL.md
          </div>
        </div>
      </div>

      {/* Accessible Figcaption */}
      <figcaption className={styles.routingCaption}>
        The agent selects guidance using file and task triggers.
        <div className={styles.routingFootnote}>
          Illustrative walkthrough, not live execution.
        </div>
      </figcaption>

      {/* Action Area: Replay walkthrough control */}
      <div className={styles.routingActionArea}>
        {mounted ? (
          <button
            type="button"
            onClick={handleReplay}
            className={styles.replayButton}
            aria-label="Replay illustrative routing walkthrough"
          >
            Replay walkthrough
          </button>
        ) : (
          <div className={styles.replayPlaceholder} aria-hidden="true" />
        )}
      </div>
    </figure>
  );
}
