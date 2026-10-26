import React from "react";
import { content, sourceLinks } from "../content";
import { ActionIcon } from "../ActionIcon";
import actionStyles from "../action.module.css";
import { PlausibleLink } from "../analytics/PlausibleLink.client";
import styles from "../landing.module.css";

export function CommunitySection(): React.JSX.Element {
  return (
    <section
      className={`${styles.darkSection} ${styles.communitySection}`}
      aria-labelledby="community-heading"
    >
      <div className={styles.container}>
        <div className={styles.communityHeader}>
          <p className={styles.kickerLime}>09 / BUILT IN THE OPEN</p>
          <h2 id="community-heading" className={styles.sectionHeading}>
            {content.community.title}
          </h2>
          <p className={`${styles.subtitle} ${styles.headerSubtitle}`}>
            {content.community.description}
          </p>

          <div className={styles.communityActions}>
            <a
              href="#quick-start"
              className={`${actionStyles.primary} ${actionStyles.trailing}`}
            >
              <span>Get started</span>
              <ActionIcon name="forward" />
            </a>

            <a href={sourceLinks.contributing} className={styles.textLinkPaper}>
              <span>Contribute a skill</span>
              <span aria-hidden="true">↗</span>
            </a>

            <PlausibleLink
              href={sourceLinks.github}
              className={styles.textLinkPaper}
              event={{
                event_name: "github_click",
                campaign_id: "standards-demo-01",
                asset_id: "showcase-community-01",
                placement: "community_github",
              }}
            >
              <span>View on GitHub</span>
              <span aria-hidden="true">↗</span>
            </PlausibleLink>
          </div>
        </div>
      </div>
    </section>
  );
}
