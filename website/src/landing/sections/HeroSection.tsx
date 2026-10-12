import React from "react";
import { content, sourceLinks } from "../content";
import { ActionIcon } from "../ActionIcon";
import { RoutingFigure } from "../RoutingFigure.client";
import actionStyles from "../action.module.css";
import motionStyles from "../motion.module.css";
import styles from "../landing.module.css";

export function HeroSection(): React.JSX.Element {
  return (
    <section
      className={`${styles.darkSection} ${styles.heroSection}`}
      aria-label="Introduction"
    >
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            {/* Standalone decorative hero accent with motion hook */}
            <div
              className={`${styles.heroAccent} ${motionStyles.hero}`}
              data-motion="hero"
              data-motion-state="idle"
              aria-hidden="true"
            />

            <p className={styles.kickerLime}>
              KEEP YOUR AGENT. SHARE YOUR STANDARDS.
            </p>

            <h1 className={styles.displayHeading}>{content.hero.title}</h1>

            <p className={styles.subtitle}>{content.hero.subtitle}</p>

            <div className={styles.heroActions}>
              <a
                href="#quick-start"
                className={`${actionStyles.primary} ${actionStyles.trailing}`}
              >
                <span>{content.hero.primaryCta}</span>
                <ActionIcon name="forward" />
              </a>

              <a
                href={sourceLinks.skills}
                className={`${actionStyles.secondary} ${actionStyles.trailing}`}
              >
                <span>{content.hero.secondaryCta}</span>
                <ActionIcon name="forward" />
              </a>
            </div>

            <p className={styles.microcopy}>{content.hero.microcopy}</p>
          </div>

          <div className={styles.heroVisual}>
            <RoutingFigure />
          </div>
        </div>
      </div>
    </section>
  );
}
