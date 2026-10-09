import React from "react";
import { content, sourceLinks } from "../content";
import motionStyles from "../motion.module.css";
import styles from "../landing.module.css";

const STAGE_SUBTITLES: Record<string, string> = {
  Brainstorm: "Clarify outcome",
  Plan: "Define scope",
  Design: "Set contracts",
  Implement: "Build change",
  Verify: "Prove behavior",
};

export function WorkflowSection(): React.JSX.Element {
  return (
    <section
      className={`${styles.darkSection} ${styles.workflowSection}`}
      aria-labelledby="workflow-heading"
    >
      <div className={styles.container}>
        <div className={styles.workflowHeader}>
          <p className={styles.kickerLime}>04 / MORE THAN CODE RULES</p>
          <h2 id="workflow-heading" className={styles.sectionHeading}>
            {content.workflow.title}
          </h2>
          <p className={`${styles.subtitle} ${styles.headerSubtitle}`}>
            {content.workflow.description}
          </p>
        </div>

        <div className={styles.workflowTrack}>
          {/* Connecting line with motion hook */}
          <div
            className={`${styles.workflowConnector} ${motionStyles.workflow}`}
            data-motion="workflow"
            data-motion-state="idle"
            aria-hidden="true"
          />

          {content.workflow.stages.map((stage) => (
            <div key={stage} className={styles.workflowStage}>
              <div className={styles.workflowDot} aria-hidden="true">
                <div className={styles.workflowDotInner} />
              </div>
              <div className={styles.workflowStageText}>
                <span className={styles.workflowStageName}>{stage}</span>
                <span className={styles.workflowStageDesc}>
                  {STAGE_SUBTITLES[stage] ?? "SDLC stage"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.workflowFooterLink}>
          <a href={sourceLinks.workflow} className={styles.textLinkLime}>
            <span>Read the SDLC workflow guide</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
