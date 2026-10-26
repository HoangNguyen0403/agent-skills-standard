import React from "react";
import { content, commands, sourceLinks } from "../content";
import { CopyCommand } from "../CopyCommand.client";
import landingStyles from "../landing.module.css";
import styles from "./QuickStart.module.css";

export function QuickStartSection(): React.JSX.Element {
  const initCmd = commands.find((c) => c.id === "init") ?? commands[0];
  const syncCmd = commands.find((c) => c.id === "sync") ?? commands[1];

  return (
    <section
      id="quick-start"
      tabIndex={-1}
      className={`${landingStyles.darkSection} ${landingStyles.quickStartSection} ${landingStyles.anchorTarget}`}
      aria-labelledby="quickstart-heading"
    >
      <div className={landingStyles.container}>
        <div className={landingStyles.quickStartHeader}>
          <p className={landingStyles.kickerLime}>07 / GET STARTED</p>
          <h2 id="quickstart-heading" className={landingStyles.sectionHeading}>
            {content.quickStart.title}
          </h2>
          <p
            className={`${landingStyles.subtitle} ${landingStyles.headerSubtitle}`}
          >
            {content.quickStart.subtitle}
          </p>
        </div>

        <div className={styles.prereqNotice}>
          <p className={styles.prereqText}>{content.quickStart.prerequisite}</p>

          <a href={sourceLinks.docs} className={landingStyles.textLinkLime}>
            <span>Read setup docs before you sync</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>

        <ol className={styles.stepsList} role="list">
          <li className={styles.stepItem} role="listitem">
            <div className={styles.stepHeader}>
              <span className={styles.stepBadge}>01</span>
              <div className={styles.stepMeta}>
                <h3 className={styles.stepTitle}>Initialize repository</h3>
                <p className={styles.stepPurpose}>
                  Detect existing agents and create your repository&apos;s{" "}
                  <code className={styles.inlineCode}>.skillsrc</code>{" "}
                  configuration.
                </p>
              </div>
            </div>
            <div className={styles.stepCommand}>
              <CopyCommand id="init" command={initCmd.command} />
            </div>
          </li>

          <li className={styles.stepItem} role="listitem">
            <div className={styles.stepHeader}>
              <span className={styles.stepBadge}>02</span>
              <div className={styles.stepMeta}>
                <h3 className={styles.stepTitle}>
                  Sync standards &amp; instructions
                </h3>
                <p className={styles.stepPurpose}>
                  Generate native prompt rules and agent configurations in your
                  repository.
                </p>
              </div>
            </div>
            <div className={styles.stepCommand}>
              <CopyCommand id="sync" command={syncCmd.command} />
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
