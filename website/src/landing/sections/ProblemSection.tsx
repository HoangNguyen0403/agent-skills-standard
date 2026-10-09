import React from "react";
import { content } from "../content";
import styles from "../landing.module.css";

export function ProblemSection(): React.JSX.Element {
  return (
    <section
      className={`${styles.paperSection} ${styles.problemSection}`}
      aria-labelledby="problem-heading"
    >
      <div className={styles.container}>
        <div className={styles.problemHeader}>
          <p className={styles.kickerInk}>01 / THE CHANGE</p>
          <h2 id="problem-heading" className={styles.sectionHeading}>
            Stop repeating yourself.
          </h2>
          <p className={`${styles.subtitleInk} ${styles.headerSubtitle}`}>
            Turn repeated instructions into standards your team can inspect and
            share.
          </p>
        </div>

        <div className={styles.problemGrid}>
          <div className={styles.problemCard}>
            <h3 className={styles.subsectionHeading}>
              {content.problemChange.beforeTitle}
            </h3>
            <ul className={styles.pointList}>
              {content.problemChange.beforePoints.map((point) => (
                <li key={point} className={styles.pointItem}>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.problemCard}>
            <h3 className={styles.subsectionHeading}>
              {content.problemChange.afterTitle}
            </h3>
            <ul className={styles.pointList}>
              {content.problemChange.afterPoints.map((point) => (
                <li key={point} className={styles.pointItem}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
