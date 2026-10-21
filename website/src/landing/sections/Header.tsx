import React from "react";
import { navigation } from "../content";
import { MobileMenu } from "../MobileMenu.client";
import actionStyles from "../action.module.css";
import styles from "../landing.module.css";

export function Header(): React.JSX.Element {
  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
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

        {/* Desktop primary navigation (hidden on mobile to keep single nav in tab order) */}
        <div className={styles.desktopNavContainer}>
          <nav aria-label="Main navigation">
            <ul className={styles.desktopNav}>
              {navigation.map((item) => (
                <li key={item.id}>
                  <a href={item.href} className={styles.desktopNavLink}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.headerActions}>
          <a
            href="#quick-start"
            className={`${actionStyles.primary} ${actionStyles.compact}`}
          >
            Get started
          </a>

          {/* Mobile menu disclosure (hidden on desktop to keep single nav in tab order) */}
          <div className={styles.mobileMenuContainer}>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
