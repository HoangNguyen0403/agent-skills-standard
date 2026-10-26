"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGA4 } from "./analytics/GA4Context";
import actionStyles from "./action.module.css";
import styles from "./demo-player.module.css";

interface SceneTranscript {
  readonly time: string;
  readonly title: string;
  readonly command?: string;
  readonly summary: string;
  readonly caption: string;
}

const scenes: readonly SceneTranscript[] = [
  {
    time: "00:00 - 00:07",
    title: "Configuring .skillsrc for Multi-Agent Projects",
    command: "cat .skillsrc",
    summary:
      "Defines target agents (Claude, Cursor, Codex) and pinned skill versions (typescript-v1.3.4, product-management-v1.0.1) with MCP and telemetry explicitly disabled.",
    caption:
      "Define the target agents and pinned skill versions once in .skillsrc.",
  },
  {
    time: "00:07 - 00:15",
    title: "Synchronizing Pinned Skills with ags sync",
    command: "ags sync",
    summary:
      "Fetches only pinned skill categories and prepares native mirrors for each configured agent without installing unpinned skills.",
    caption:
      "ags sync fetches only the pinned categories and writes native mirrors for each agent.",
  },
  {
    time: "00:15 - 00:23",
    title: "Native Mirrors, Lockfile, and No MCP Writes",
    command: "ags sync",
    summary:
      "Writes agent directories (.claude/skills, .cursor/skills, .codex/skills), command workflows, and .skills-lock.json. No MCP configuration is altered while MCP remains disabled.",
    caption:
      "Native directories and lockfile are written; no MCP runtime config is touched while MCP stays disabled.",
  },
  {
    time: "00:23 - 00:31",
    title: "Generated AGENTS.md: Agent Skills Index",
    command: "head -n 28 AGENTS.md",
    summary:
      "Opens with the Agent Skills Index and read guidance instructing agents to read matching SKILL.md rules before generating code.",
    caption:
      "Generated AGENTS.md opens with the Agent Skills Index and guidance to read matching SKILL.md files.",
  },
  {
    time: "00:31 - 00:39",
    title: "Generated AGENTS.md: MCP Section (Disabled)",
    command: "head -n 28 AGENTS.md",
    summary:
      "Documents MCP tools and runtime instructions; when MCP is disabled, informs developers how to enable it explicitly.",
    caption:
      "The MCP section states when it applies and, with MCP disabled, tells you to enable it explicitly.",
  },
  {
    time: "00:39 - 00:49",
    title: "Secondary Appendix: Synthetic Cohort Scorecard",
    summary:
      "Calculates synthetic offline cohort counts and reports recommendation: inconclusive — proving honest arithmetic without fabricated conversion or ROI.",
    caption:
      "The scorecard reports synthetic cohort counts and recommendation: inconclusive — no ROI is fabricated.",
  },
  {
    time: "00:49 - 00:56",
    title: "Compliance Caveat and Prepared State",
    summary:
      "Standards files provide structured context, but AI models remain probabilistic. CI test gates and evaluation suites remain mandatory.",
    caption:
      "Standards files provide context, but AI models remain probabilistic. CI test gates remain essential.",
  },
];

type StartStatus = "idle" | "starting" | "started" | "error";

interface PendingStart {
  readonly consentEpoch: number | null;
}

export function DemoPlayer(): React.JSX.Element {
  const { trackEvent, getConsentSnapshot, isConfigured } = useGA4();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [startStatus, setStartStatus] = useState<StartStatus>("idle");

  // Set by the explicit entry activation and consumed by the first decoded
  // `playing` (or by a failure/interruption). Identity doubles as the stale
  // attempt guard, so a superseded play() rejection cannot overwrite state.
  const pendingStartRef = useRef<PendingStart | null>(null);
  const focusPlayerOnStartRef = useRef<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (isConfigured && video && !video.paused) {
      // Native playback began before hydration took over the controls: adopt
      // the started UI without attribution and without reloading media.
      setStartStatus("started");
    }
    setIsClient(true);
  }, [isConfigured]);

  // Configured collection builds use an explicit accessible first start, so an
  // operator-approved artifact never counts an unattributable native start.
  // Default builds and no-JS/SSR keep the native controlled player.
  const requiresExplicitStart = isConfigured;
  const showStartControl =
    requiresExplicitStart && isClient && startStatus !== "started";

  const handleStart = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Only a genuine user activation may start primary media.
      if (!event.nativeEvent.isTrusted) {
        return;
      }

      const video = videoRef.current;
      if (!video) {
        return;
      }

      // Playback that already began before this activation (for example via the
      // server-rendered native controls before hydration) is revealed but never
      // attributed to this activation or counted.
      if (!video.paused) {
        focusPlayerOnStartRef.current = true;
        setStartStatus("started");
        return;
      }

      const consent = getConsentSnapshot();
      const pendingStart: PendingStart = {
        consentEpoch: consent.status === "granted" ? consent.epoch : null,
      };
      pendingStartRef.current = pendingStart;
      setStartStatus("starting");

      // The promise resolves when playback begins, not when frames decode, so
      // only the native `playing` handler may count or reveal the controls.
      video.play().catch(() => {
        if (pendingStartRef.current !== pendingStart) {
          return;
        }
        pendingStartRef.current = null;
        setStartStatus("error");
      });
    },
    [getConsentSnapshot],
  );

  const abandonPendingStart = useCallback(() => {
    if (!pendingStartRef.current) {
      return;
    }
    pendingStartRef.current = null;
    setStartStatus("idle");
  }, []);

  const handleStartError = useCallback(() => {
    if (!pendingStartRef.current) {
      return;
    }
    pendingStartRef.current = null;
    setStartStatus("error");
  }, []);

  const handlePlaying = useCallback(() => {
    // Only the explicit first start is a counted entry. Pause/resume through
    // the revealed native controls never counts.
    const pendingStart = pendingStartRef.current;
    if (!pendingStart) {
      // Playback began outside the explicit entry (for example through the
      // server-rendered native controls before hydration swapped the UI).
      // Adopt the started UI without attributing or counting it.
      if (isConfigured) {
        setStartStatus("started");
      }
      return;
    }

    pendingStartRef.current = null;
    focusPlayerOnStartRef.current = true;
    setStartStatus("started");

    // Started without consent: playback proceeds, nothing is replayed later.
    if (pendingStart.consentEpoch === null) {
      return;
    }

    // Live consent check: must still be granted under the epoch captured at the
    // explicit start activation.
    const currentConsent = getConsentSnapshot();
    if (
      currentConsent.status !== "granted" ||
      currentConsent.epoch !== pendingStart.consentEpoch
    ) {
      return;
    }

    trackEvent(
      {
        event_name: "demo_play",
        campaign_id: "standards-demo-01",
        asset_id: "unknown",
        placement: "quickstart_demo",
      },
      pendingStart.consentEpoch,
    ).catch(() => {});
  }, [getConsentSnapshot, isConfigured, trackEvent]);

  // The explicit entry unmounts on successful start; move focus onto the
  // revealed native player only for that explicit transition (never for a
  // mount-time adoption of pre-hydration playback).
  useEffect(() => {
    if (!focusPlayerOnStartRef.current || startStatus !== "started") {
      return;
    }
    focusPlayerOnStartRef.current = false;
    videoRef.current?.focus();
  }, [startStatus]);

  return (
    <figure
      className={styles.demoContainer}
      aria-labelledby="demo-player-heading"
    >
      <div className={styles.demoHeader}>
        <p className={styles.demoKicker}>
          EDITED 56s PRESENTATION · LOCAL CANDIDATE EXECUTION · CAPTURED
          WITHOUT TELEMETRY
        </p>
        <h3 id="demo-player-heading" className={styles.demoTitle}>
          Syncing Agent Skills Across Multi-Agent Projects
        </h3>
        <p className={styles.demoDescription}>
          Edited 56s presentation of captured local candidate command output on
          snapshot candidate a2228857 (tree ee18d7f5, context
          ctx-rev-20261025-capture-ee18d7f5). This recording used an isolated
          local registry fixture, not a remote release; the formal remote
          release gate (AC-16) remains open. Demonstrates .skillsrc
          configuration, ags sync across Claude, Cursor, and Codex, generated
          AGENTS.md router index, and secondary measurement appendix.
        </p>
      </div>

      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          className={styles.videoElement}
          controls={
            requiresExplicitStart ? !isClient || startStatus === "started" : true
          }
          preload="metadata"
          playsInline
          aria-label="Demonstration: Synchronizing agent skills across Claude, Cursor, and Codex with ags sync"
          onPause={abandonPendingStart}
          onEmptied={abandonPendingStart}
          onAbort={abandonPendingStart}
          onError={handleStartError}
          onPlaying={handlePlaying}
        >
          <source src="/media/standards-demo-01.mp4" type="video/mp4" />
          <track
            kind="captions"
            src="/media/standards-demo-01.vtt"
            srcLang="en"
            label="English"
            default
          />
          <div className={styles.videoFallback}>
            <p>
              Your browser does not support HTML5 video playback. You can{" "}
              <a href="/media/standards-demo-01.mp4" className={styles.demoLink}>
                download the MP4 video directly (56s, 1080p)
              </a>
              , read the{" "}
              <a
                href="/media/standards-demo-01-transcript.md"
                className={styles.demoLink}
              >
                full video transcript (Markdown)
              </a>
              , or view the scene summary below.
            </p>
          </div>
        </video>

        {showStartControl ? (
          <div className={styles.demoStartOverlay}>
            <button
              type="button"
              className={actionStyles.primary}
              onClick={handleStart}
              aria-describedby="demo-start-hint"
            >
              {startStatus === "error"
                ? "Retry demo playback"
                : "Play demo (56s)"}
            </button>
            <p
              id="demo-start-hint"
              className={styles.demoStartHint}
              aria-live="polite"
            >
              {startStatus === "error"
                ? "Playback did not start. Retry, or read the scene summary and transcript below."
                : "Starts the demo. Native video controls, captions, and keyboard controls appear once playback begins."}
            </p>
          </div>
        ) : null}
      </div>

      <div className={styles.demoMeta}>
        <span className={styles.demoScopeTag}>
          Edited 56s presentation of captured local candidate command output · Candidate a2228857 · Tree ee18d7f5 · Captured without telemetry
        </span>

        <div className={styles.demoActions}>
          <a
            href="/media/standards-demo-01.mp4"
            className={styles.demoLink}
            download="standards-demo-01.mp4"
          >
            <span>Download video (MP4)</span>
            <span aria-hidden="true">↓</span>
          </a>

          <a
            href="/media/standards-demo-01.vtt"
            className={styles.demoLink}
            download="standards-demo-01.vtt"
          >
            <span>Captured video excerpts and captions (WebVTT)</span>
            <span aria-hidden="true">↓</span>
          </a>

          <a
            href="/media/standards-demo-01-transcript.md"
            className={styles.demoLink}
          >
            <span>Full video transcript (Markdown)</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <details className={styles.transcriptDetails}>
        <summary className={styles.transcriptSummary}>
          <span aria-hidden="true">▶</span>
          <span>Read scene summary (7 scenes, 56s)</span>
        </summary>
        <div className={styles.transcriptContent}>
          {scenes.map((scene, idx) => (
            <div key={idx} className={styles.sceneItem}>
              <div className={styles.sceneHeader}>
                <span className={styles.sceneTime}>[{scene.time}]</span>
                <span className={styles.sceneTitle}>{scene.title}</span>
              </div>
              <p className={styles.sceneText}>
                {scene.command ? <strong>$ {scene.command} — </strong> : null}
                {scene.summary}
              </p>
              <p className={styles.sceneText}>
                <em>Caption: &ldquo;{scene.caption}&rdquo;</em>
              </p>
            </div>
          ))}

          <div className={styles.caveatNote}>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>Operational Limitation:</strong> Standards files provide
              structured context to AI agents; they do not enforce LLM compliance.
              CI evaluation gates and automated regression testing remain mandatory.
            </p>
            <p style={{ margin: "0 0 8px 0" }}>
              The linked transcript is the accepted video transcript: sanitized
              captured-output excerpts with caption timings, not a complete
              command log. The complete sanitized capture is a separate campaign
              artifact (<code>command-capture.log</code>).
            </p>
            <p style={{ margin: 0 }}>
              <a
                href="/media/standards-demo-01-transcript.md"
                className={styles.demoLink}
              >
                <span>Full video transcript (Markdown)</span>
                <span aria-hidden="true">↗</span>
              </a>
            </p>
          </div>
        </div>
      </details>
    </figure>
  );
}
