import React from "react";
import { content, compatibleAgents, sourceLinks } from "../content";
import motionStyles from "../motion.module.css";
import styles from "../landing.module.css";

export function CompatibilitySection(): React.JSX.Element {
  return (
    <section
      className={`${styles.darkSection} ${styles.compatibilitySection}`}
      aria-label="Agent Compatibility"
    >
      {/* Decorative divider trace with motion hook */}
      <div
        className={`${styles.rule} ${motionStyles.divider}`}
        data-motion="divider"
        data-motion-state="idle"
        aria-hidden="true"
      />

      <div className={`${styles.container} ${styles.compatibilityContainer}`}>
        <div className={styles.compatibilityInner}>
          <div className={styles.compatibilityLeft}>
            <p className={styles.kickerMuted}>WORKS WITH YOUR AGENT</p>
            <h2
              className={`${styles.sectionHeading} ${styles.compatibilityHeading}`}
            >
              {content.compatibility.title}
            </h2>
          </div>

          <ul className={styles.agentList} aria-label="Supported coding agents">
            {compatibleAgents.map((agent) => (
              <li key={agent} className={styles.agentItem}>
                {agent}
              </li>
            ))}
          </ul>

          <div>
            <a
              href={sourceLinks.capabilities}
              className={styles.compatibilityNotice}
            >
              <span>{content.compatibility.notice}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
