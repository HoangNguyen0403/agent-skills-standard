"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { navigation } from "./content";
import styles from "./interaction.module.css";

export function MobileMenu(): React.JSX.Element {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const closeMenu = useCallback(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDetailsElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        summaryRef.current?.focus();
      }
    },
    [closeMenu],
  );

  const handleLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      // Invalidate any previously queued RAF focus callback
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // If it's an in-page hash link
      if (href.startsWith("#")) {
        closeMenu();

        const targetId = href.slice(1);
        const destination = document.getElementById(targetId);

        if (destination) {
          // Keep normal anchor URL scroll/history, and move focus to destination element
          const originalTabIndex = destination.getAttribute("tabindex");
          if (originalTabIndex === null) {
            destination.setAttribute("tabindex", "-1");
          }

          rafIdRef.current = requestAnimationFrame(() => {
            destination.focus({ preventScroll: false });
            rafIdRef.current = null;
          });
        }
      } else {
        // External link: close disclosure and allow standard navigation
        closeMenu();
      }
    },
    [closeMenu],
  );

  // Close disclosure when clicking outside if JavaScript is active
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        detailsRef.current?.open &&
        event.target instanceof Node &&
        !detailsRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [closeMenu]);

  return (
    <div className={styles.menuContainer}>
      <details
        ref={detailsRef}
        className={styles.menuDetails}
        onKeyDown={handleKeyDown}
      >
        <summary
          ref={summaryRef}
          className={styles.menuSummary}
          aria-label="Menu"
        >
          <span>Menu</span>
          <svg
            className={styles.chevronIcon}
            viewBox="0 0 18 18"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M4.5 6.75L9 11.25l4.5-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>

        <nav className={styles.menuNav} aria-label="Mobile navigation">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={styles.navLink}
              onClick={(e) => handleLinkClick(e, item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </details>
    </div>
  );
}
