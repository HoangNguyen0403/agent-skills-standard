import React from "react";
import {
  content,
  primaryCommands,
  secondaryCommands,
  sourceLinks,
} from "../content";
import { CopyCommand } from "../CopyCommand.client";
import landingStyles from "../landing.module.css";
import styles from "./QuickStart.module.css";
import { DemoPlayer } from "../DemoPlayer";
import { PlausibleLink } from "../analytics/PlausibleLink.client";
export function QuickStartSection(): React.JSX.Element {
  const installCmd =
    primaryCommands.find((c) => c.id === "install")?.command ??
    primaryCommands[0].command;
  const initCmd =
    primaryCommands.find((c) => c.id === "init")?.command ??
    primaryCommands[1].command;
  const syncCmd =
    primaryCommands.find((c) => c.id === "sync")?.command ??
    primaryCommands[2].command;

  const npxInitCmd =
    secondaryCommands.find((c) => c.id === "npx-init")?.command ??
    secondaryCommands[0].command;
  const npxSyncCmd =
    secondaryCommands.find((c) => c.id === "npx-sync")?.command ??
    secondaryCommands[1].command;

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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <PlausibleLink
              href={sourceLinks.docs}
              className={landingStyles.textLinkLime}
              event={{
                event_name: "setup_guide_open",
                campaign_id: "standards-demo-01",
                asset_id: "tutorial-standards-adoption-01",
                placement: "quickstart_docs",
              }}
            >
              <span>Read setup docs before you sync</span>
              <span aria-hidden="true">↗</span>
            </PlausibleLink>

            <PlausibleLink
              href={sourceLinks.tutorial}
              className={landingStyles.textLinkLime}
              event={{
                event_name: "setup_guide_open",
                campaign_id: "standards-demo-01",
                asset_id: "tutorial-standards-adoption-01",
                placement: "quickstart_tutorial",
              }}
            >
              <span>Follow step-by-step tutorial</span>
              <span aria-hidden="true">↗</span>
            </PlausibleLink>
          </div>
        </div>

        <ol className={styles.stepsList} role="list">
          <li className={styles.stepItem} role="listitem">
            <div className={styles.stepHeader}>
              <span className={styles.stepBadge}>01</span>
              <div className={styles.stepMeta}>
                <h3 className={styles.stepTitle}>Install CLI globally</h3>
                <p className={styles.stepPurpose}>
                  Install the canonical{" "}
                  <code className={styles.inlineCode}>
                    agent-skills-standard
                  </code>{" "}
                  binary and{" "}
                  <code className={styles.inlineCode}>ags</code> alias.
                </p>
              </div>
            </div>
            <div className={styles.stepCommand}>
              <CopyCommand id="install" command={installCmd} delay={100} />
            </div>
          </li>

          <li className={styles.stepItem} role="listitem">
            <div className={styles.stepHeader}>
              <span className={styles.stepBadge}>02</span>
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
              <CopyCommand id="init" command={initCmd} delay={450} />
            </div>
          </li>

          <li className={styles.stepItem} role="listitem">
            <div className={styles.stepHeader}>
              <span className={styles.stepBadge}>03</span>
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
              <CopyCommand id="sync" command={syncCmd} delay={800} />
            </div>
          </li>
        </ol>

        <div className={styles.secondaryContainer}>
          <div className={styles.secondaryHeader}>
            <h3 className={styles.secondaryTitle}>
              Zero-install alternative (npx)
            </h3>
            <p className={styles.secondaryPurpose}>
              Prefer not to install globally? Run the CLI directly using npx:
            </p>
          </div>

          <ol className={styles.secondaryList} role="list">
            <li className={styles.secondaryItem} role="listitem">
              <div className={styles.secondaryMeta}>
                <span className={styles.secondaryBadge}>Alt 01</span>
                <span className={styles.secondaryLabel}>
                  Initialize repository:
                </span>
              </div>
              <div className={styles.stepCommand}>
                <CopyCommand id="npx-init" command={npxInitCmd} delay={0} />
              </div>
            </li>

            <li className={styles.secondaryItem} role="listitem">
              <div className={styles.secondaryMeta}>
                <span className={styles.secondaryBadge}>Alt 02</span>
                <span className={styles.secondaryLabel}>
                  Sync standards &amp; instructions:
                </span>
              </div>
              <div className={styles.stepCommand}>
                <CopyCommand id="npx-sync" command={npxSyncCmd} delay={200} />
              </div>
            </li>
          </ol>
        </div>

        <DemoPlayer />
      </div>
    </section>
  );
}
