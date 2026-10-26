import React from "react";
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

export function DemoPlayer(): React.JSX.Element {
  return (
    <figure
      className={styles.demoContainer}
      aria-labelledby="demo-player-heading"
    >
      <div className={styles.demoHeader}>
        <p className={styles.demoKicker}>
          EDITED 56s PRESENTATION · LOCAL CANDIDATE EXECUTION · NO TELEMETRY
        </p>
        <h3 id="demo-player-heading" className={styles.demoTitle}>
          Syncing Agent Skills Across Multi-Agent Projects
        </h3>
        <p className={styles.demoDescription}>
          Edited 56s presentation of captured local candidate command output on
          snapshot candidate a2228857 (tree ee18d7f5, context
          ctx-rev-20261025-capture-ee18d7f5). Demonstrates .skillsrc
          configuration, ags sync across Claude, Cursor, and Codex, generated
          AGENTS.md router index, and secondary measurement appendix. Remote
          release gate (AC-16) remains open; candidate categories are served
          locally in testing.
        </p>
      </div>

      <div className={styles.videoWrapper}>
        <video
          className={styles.videoElement}
          controls
          preload="metadata"
          playsInline
          aria-label="Demonstration: Synchronizing agent skills across Claude, Cursor, and Codex with ags sync"
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
      </div>

      <div className={styles.demoMeta}>
        <span className={styles.demoScopeTag}>
          Edited 56s presentation of captured local candidate command output · Candidate a2228857 · Tree ee18d7f5 · Zero tracking
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
