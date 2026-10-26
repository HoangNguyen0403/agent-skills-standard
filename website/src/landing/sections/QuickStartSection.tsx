import React from "react";
import { content, commands, sourceLinks } from "../content";
import { CopyCommand } from "../CopyCommand.client";
import { DemoPlayer } from "../DemoPlayer";
import { GA4Link } from "../analytics/GA4Link.client";
import styles from "../landing.module.css";
export function QuickStartSection(): React.JSX.Element {
  const initCmd = commands.find((c) => c.id === "init") ?? commands[0];
  const syncCmd = commands.find((c) => c.id === "sync") ?? commands[1];

  return (
    <section
      id="quick-start"
      tabIndex={-1}
      className={`${styles.darkSection} ${styles.quickStartSection} ${styles.anchorTarget}`}
      aria-labelledby="quickstart-heading"
    >
      <div className={styles.container}>
        <div className={styles.quickStartHeader}>
          <p className={styles.kickerLime}>07 / GET STARTED</p>
          <h2 id="quickstart-heading" className={styles.sectionHeading}>
            {content.quickStart.title}
          </h2>
          <p className={`${styles.subtitle} ${styles.headerSubtitle}`}>
            {content.quickStart.subtitle}
          </p>
        </div>

        <div className={styles.quickStartCommands}>
          <CopyCommand id="init" command={initCmd.command} />
          <CopyCommand id="sync" command={syncCmd.command} />
        </div>

        <div className={styles.quickStartMeta}>
          <span className={styles.quickStartPrereq}>
            {content.quickStart.prerequisite}
          </span>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <GA4Link
              href={sourceLinks.docs}
              className={styles.textLinkLime}
              event={{
                event_name: "setup_guide_open",
                campaign_id: "standards-demo-01",
                asset_id: "tutorial-standards-adoption-01",
                placement: "quickstart_docs",
              }}
            >
              <span>Read setup docs before you sync</span>
              <span aria-hidden="true">↗</span>
            </GA4Link>

            <GA4Link
              href={sourceLinks.tutorial}
              className={styles.textLinkLime}
              event={{
                event_name: "setup_guide_open",
                campaign_id: "standards-demo-01",
                asset_id: "tutorial-standards-adoption-01",
                placement: "quickstart_tutorial",
              }}
            >
              <span>Follow step-by-step tutorial</span>
              <span aria-hidden="true">↗</span>
            </GA4Link>
          </div>
        </div>

        <DemoPlayer />
      </div>
    </section>
  );
}
