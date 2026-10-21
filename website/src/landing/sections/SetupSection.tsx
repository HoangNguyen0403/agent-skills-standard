import React from "react";
import { content } from "../content";
import styles from "../landing.module.css";

export function SetupSection(): React.JSX.Element {
  return (
    <section
      id="how-it-works"
      tabIndex={-1}
      className={`${styles.paperSection} ${styles.setupSection} ${styles.anchorTarget}`}
      aria-labelledby="setup-heading"
    >
      <div className={styles.container}>
        <div className={styles.setupHeader}>
          <p className={styles.kickerInk}>02 / HOW IT WORKS</p>
          <h2 id="setup-heading" className={styles.sectionHeading}>
            {content.setup.title}
          </h2>
          <p className={`${styles.subtitleInk} ${styles.headerSubtitle}`}>
            Set up once. Work where you already work.
          </p>
        </div>

        <div className={styles.setupGrid}>
          {content.setup.steps.map((stepItem) => (
            <div key={stepItem.step} className={styles.setupCard}>
              <span className={styles.stepNumber}>
                {stepItem.step} &nbsp; {stepItem.title.toUpperCase()}
              </span>
              <h3 className={styles.subsectionHeading}>{stepItem.title}</h3>
              <p className={`${styles.bodyText} ${styles.cardBodyText}`}>
                {stepItem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
