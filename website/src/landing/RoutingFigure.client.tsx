"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  HERO_SKILL_EXAMPLES,
  DEFAULT_HERO_SKILL_EXAMPLE,
  type SkillExample,
} from "./hero-examples.data";
import styles from "./motion.module.css";
import routingStyles from "./hero-routing.module.css";

export function RoutingFigure(): React.JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    DEFAULT_HERO_SKILL_EXAMPLE.id,
  );
  const figureRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentExample: SkillExample =
    HERO_SKILL_EXAMPLES.find((ex) => ex.id === selectedSkillId) ??
    DEFAULT_HERO_SKILL_EXAMPLE;

  const handleSelect = (id: string) => {
    setSelectedSkillId(id);
  };

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

      <div className={styles.routingHeader}>
        <div className={styles.routingFigBadge}>FIG. 01</div>
        <div className={styles.routingFigTitle}>Illustrative walkthrough</div>
      </div>

      <div
        className={routingStyles.selectorContainer}
        role="group"
        aria-label="Select sample file trigger"
      >
        <span
          id="trigger-selector-label"
          className={routingStyles.selectorLabel}
        >
          Select Trigger Example
        </span>
        <div
          className={routingStyles.selectorOptions}
          aria-labelledby="trigger-selector-label"
        >
          {HERO_SKILL_EXAMPLES.map((example) => {
            const isSelected = example.id === currentExample.id;
            return (
              <button
                key={example.id}
                type="button"
                onClick={() => handleSelect(example.id)}
                disabled={!mounted}
                className={`${routingStyles.selectorPill} ${
                  isSelected ? routingStyles.selectorPillActive : ""
                }`}
                aria-pressed={isSelected}
                aria-label={`Select ${example.label} example with ${example.sampleFile}`}
              >
                {example.label} ({example.sampleFile})
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={routingStyles.srOnly}
        aria-live="polite"
        aria-atomic="true"
      >
        Showing illustrative agent routing for {currentExample.sampleFile} to{" "}
        {currentExample.skillName}.
      </div>

      <div className={styles.routingNodes}>
        {/* Node 1: File Trigger stack */}
        <div className={routingStyles.nodeStack}>
          {HERO_SKILL_EXAMPLES.map((example) => {
            const isActive = example.id === currentExample.id;
            return (
              <div
                key={example.id}
                className={`${styles.routingNode} ${routingStyles.nodeStackLayer} ${
                  isActive ? routingStyles.nodeStackLayerActive : ""
                }`}
                aria-hidden={!isActive}
              >
                <div className={styles.routingNodeTitle}>
                  {example.fileTriggerDescription}
                </div>
                <div
                  className={`${styles.routingNodeTrigger} ${routingStyles.pathWrap}`}
                >
                  <span
                    className={routingStyles.sampleFile}
                    data-sample-file={example.sampleFile}
                  >
                    {example.sampleFile}
                  </span>{" "}
                  ({example.filePattern}) &rarr; AGENTS.md
                </div>
              </div>
            );
          })}
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

        {/* Node 2: Category Index stack */}
        <div className={routingStyles.nodeStack}>
          {HERO_SKILL_EXAMPLES.map((example) => {
            const isActive = example.id === currentExample.id;
            return (
              <div
                key={example.id}
                className={`${styles.routingNode} ${routingStyles.nodeStackLayer} ${
                  isActive ? routingStyles.nodeStackLayerActive : ""
                }`}
                aria-hidden={!isActive}
              >
                <div className={styles.routingNodeTitle}>
                  Category index ({example.categoryName})
                </div>
                <div
                  className={`${styles.routingNodeTrigger} ${routingStyles.pathWrap}`}
                >
                  {example.categoryIndex}
                </div>
              </div>
            );
          })}
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

        {/* Node 3: Matching Skill stack */}
        <div className={routingStyles.nodeStack}>
          {HERO_SKILL_EXAMPLES.map((example) => {
            const isActive = example.id === currentExample.id;
            return (
              <div
                key={example.id}
                className={`${styles.routingNode} ${styles.routingNodeActive} ${routingStyles.nodeStackLayer} ${
                  isActive ? routingStyles.nodeStackLayerActive : ""
                }`}
                aria-hidden={!isActive}
              >
                <div className={styles.routingNodeTitle}>
                  Matching skill: {example.skillName}
                </div>
                <div
                  className={`${styles.routingNodeTrigger} ${styles.routingNodeTriggerLime} ${routingStyles.pathWrap}`}
                >
                  {example.skillPath}
                </div>
                <div className={routingStyles.ruleExcerptBox}>
                  <strong>{example.ruleTitle}:</strong> {example.ruleExcerpt}
                </div>
                <a
                  href={example.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={isActive ? undefined : -1}
                  className={routingStyles.ruleSourceLink}
                  aria-label={`View ${example.skillName} SKILL.md source on GitHub`}
                >
                  View SKILL.md &rarr;
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <figcaption className={styles.routingCaption}>
        The agent selects guidance using file and task triggers.
        <div className={styles.routingFootnote}>
          Illustrative walkthrough, not live execution.
        </div>
      </figcaption>

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
