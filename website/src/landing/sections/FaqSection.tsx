import React from "react";
import { faq } from "../content";
import styles from "../landing.module.css";

export function FaqSection(): React.JSX.Element {
  return (
    <section
      className={`${styles.paperSection} ${styles.faqSection}`}
      aria-labelledby="faq-heading"
    >
      <div className={styles.container}>
        <div className={styles.faqHeader}>
          <p className={styles.kickerInk}>08 / QUESTIONS</p>
          <h2 id="faq-heading" className={styles.sectionHeading}>
            A few things worth knowing.
          </h2>
        </div>

        <div className={styles.faqList}>
          {faq.map((item, index) => (
            <details
              key={item.id}
              className={styles.faqItem}
              open={index === 0 ? true : undefined}
            >
              <summary className={styles.faqSummary}>
                <span>{item.question}</span>
                <span className={styles.faqToggleIcon} aria-hidden="true" />
              </summary>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
