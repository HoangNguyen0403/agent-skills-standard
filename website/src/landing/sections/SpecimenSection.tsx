import React from "react";
import { content, sourceLinks, sourceRevision } from "../content";
import motionStyles from "../motion.module.css";
import styles from "../landing.module.css";

export function SpecimenSection(): React.JSX.Element {
  const shortSha = sourceRevision.slice(0, 7);

  return (
    <section
      id="skills"
      tabIndex={-1}
      className={`${styles.darkSection} ${styles.specimenSection} ${styles.anchorTarget}`}
      aria-labelledby="specimen-heading"
    >
      <div className={styles.container}>
        <div className={styles.specimenGrid}>
          <div className={styles.specimenIntro}>
            <p className={styles.kickerLime}>03 / OPEN THE SPECIMEN</p>
            <h2 id="specimen-heading" className={styles.sectionHeading}>
              {content.specimen.title}
            </h2>
            <p className={styles.subtitle}>
              Not a black box. Read the rules, inspect their source, and decide
              what fits your project.
            </p>

            <div className={styles.specimenActions}>
              <a href={sourceLinks.skill} className={styles.textLinkLime}>
                <span>View source</span>
                <span aria-hidden="true">↗</span>
              </a>

              <a href={sourceLinks.skills} className={styles.textLinkPaper}>
                <span>Browse skills</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <p className={styles.specimenRevision}>
              SOURCE REVISION / <a href={sourceLinks.skill}>{shortSha}</a>
            </p>
          </div>

          <div
            className={`${styles.specimenPanel} ${motionStyles.skill}`}
            data-motion="skill"
            data-motion-state="idle"
          >
            <div className={styles.specimenPanelHeader}>
              <span className={styles.specimenPath}>
                {content.specimen.path}
              </span>
              <span className={styles.specimenLabel}>
                {content.specimen.label}
              </span>
            </div>

            <pre className={styles.specimenBody}>
              <div className={styles.specimenExcerptBlock}>
                {content.specimen.excerpts.map((excerpt, idx) => (
                  <div key={idx} className={styles.specimenExcerptItem}>
                    <code>{excerpt}</code>
                  </div>
                ))}
              </div>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
