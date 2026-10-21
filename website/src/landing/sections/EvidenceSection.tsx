import React from "react";
import { content, sourceLinks } from "../content";
import styles from "../landing.module.css";

export function EvidenceSection(): React.JSX.Element {
  return (
    <section
      id="evidence"
      tabIndex={-1}
      className={`${styles.paperSection} ${styles.evidenceSection} ${styles.anchorTarget}`}
      aria-labelledby="evidence-heading"
    >
      <div className={styles.container}>
        <div className={styles.evidenceHeader}>
          <p className={styles.kickerInk}>06 / EVIDENCE, WITH LIMITS</p>
          <h2 id="evidence-heading" className={styles.sectionHeading}>
            {content.evidence.title}
          </h2>
          <p className={`${styles.subtitleInk} ${styles.headerSubtitle}`}>
            Understand what was measured before turning a result into a promise.
          </p>
        </div>

        <div className={styles.evidenceGrid}>
          <div className={styles.evidenceCard}>
            <h3 className={styles.subsectionHeading}>
              {content.evidence.syntheticTitle}
            </h3>
            <p className={`${styles.bodyText} ${styles.cardBodyText}`}>
              {content.evidence.syntheticDesc} Measures skill size against
              synthetic instruction-volume references—not real-world runtime
              savings.
            </p>
            <div>
              <a href={sourceLinks.benchmark} className={styles.textLinkInk}>
                <span>Read benchmark report</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className={styles.evidenceCard}>
            <h3 className={styles.subsectionHeading}>
              {content.evidence.evalsTitle}
            </h3>
            <p className={`${styles.bodyText} ${styles.cardBodyText}`}>
              {content.evidence.evalsDesc} Compares baseline and with-skill
              outcomes over reported test cases.
            </p>
            <div>
              <a href={sourceLinks.evals} className={styles.textLinkInk}>
                <span>Read eval report</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>

        <div
          className={styles.evidenceCaveat}
          role="note"
          aria-label="Evidence caveat"
        >
          <span className={styles.caveatLabel}>EVAL STATUS &amp; SCOPE</span>
          <p className={styles.caveatText}>
            {content.evidence.readinessCaveat}
          </p>
        </div>
      </div>
    </section>
  );
}
