import React from "react";
import { content, sourceLinks } from "../content";
import styles from "../landing.module.css";

export function Footer(): React.JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} ${styles.footerInner}`}>
        <div className={styles.footerTop}>
          <a
            href="#main-content"
            className={styles.wordmark}
            aria-label="Agent Skills Standard homepage"
          >
            <span className={styles.wordmarkGlyph} aria-hidden="true">
              [·]
            </span>
            <span>Agent Skills Standard</span>
          </a>

          <ul className={styles.footerLinks} aria-label="Footer links">
            <li>
              <a href={sourceLinks.github} className={styles.footerLink}>
                <span>GitHub</span>
                <span aria-hidden="true">&nbsp;↗</span>
              </a>
            </li>
            <li>
              <a href={sourceLinks.docs} className={styles.footerLink}>
                <span>Docs</span>
                <span aria-hidden="true">&nbsp;↗</span>
              </a>
            </li>
            <li>
              <a href={sourceLinks.workflow} className={styles.footerLink}>
                <span>Workflow guide</span>
                <span aria-hidden="true">&nbsp;↗</span>
              </a>
            </li>
            <li>
              <a href={sourceLinks.contributing} className={styles.footerLink}>
                <span>Contributing</span>
                <span aria-hidden="true">&nbsp;↗</span>
              </a>
            </li>
            <li>
              <a href={sourceLinks.license} className={styles.footerLink}>
                <span>MIT license</span>
                <span aria-hidden="true">&nbsp;↗</span>
              </a>
            </li>
          </ul>
        </div>

        <div className={styles.footerBottom}>
          <span>{content.footer.attribution}</span>
          <span>{content.footer.licenseNotice}</span>
        </div>
      </div>
    </footer>
  );
}
