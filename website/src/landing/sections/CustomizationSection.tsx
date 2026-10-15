import React from "react";
import { content, sourceLinks } from "../content";
import styles from "../landing.module.css";

export function CustomizationSection(): React.JSX.Element {
  return (
    <section
      className={`${styles.paperSection} ${styles.customizationSection}`}
      aria-labelledby="customization-heading"
    >
      <div className={styles.container}>
        <div className={styles.customizationHeader}>
          <p className={styles.kickerInk}>05 / MAKE IT YOURS</p>
          <h2 id="customization-heading" className={styles.sectionHeading}>
            {content.customization.title}
          </h2>
          <p className={`${styles.subtitleInk} ${styles.headerSubtitle}`}>
            {content.customization.description}
          </p>
        </div>

        <div className={styles.customizationGrid}>
          <div className={styles.customizationCard}>
            <span className={styles.codeLabel}>.skillsrc</span>
            <p className={`${styles.bodyText} ${styles.cardBodyText}`}>
              Choose the agents and skills your project needs. Keep the
              configuration alongside your code.
            </p>
          </div>

          <div className={styles.customizationCard}>
            <span className={styles.codeLabel}>custom_overrides</span>
            <p className={`${styles.bodyText} ${styles.cardBodyText}`}>
              Protect project-specific modifications when you sync shared
              standards across environments.
            </p>
          </div>
        </div>

        <div className={styles.customizationActionWrapper}>
          <a href={sourceLinks.configuration} className={styles.textLinkInk}>
            <span>Read customization docs</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
