import React from "react";
import {
  CAPABILITY_DISTINCTIONS,
  COVERAGE_META,
  CROSS_CUTTING_COVERAGE,
  FRAMEWORK_COVERAGE,
  LANGUAGE_COVERAGE,
  PRODUCT_MANAGEMENT_COVERAGE,
  QUALITY_ENGINEERING_COVERAGE,
  SPECIALIST_COVERAGE,
} from "../coverage.data";
import landingStyles from "../landing.module.css";
import styles from "./Coverage.module.css";

export interface CoverageSectionProps {
  readonly id?: string;
}

export function CoverageSection({
  id = "skills",
}: CoverageSectionProps): React.JSX.Element {
  return (
    <section
      id={id}
      tabIndex={-1}
      className={`${styles.coverageSection} ${landingStyles.anchorTarget}`}
      aria-labelledby="coverage-heading"
    >
      <div className={landingStyles.container}>
        {/* Section Header */}
        <header className={styles.headerBlock}>
          <p className={styles.kicker}>05 / SUPPORTED COVERAGE</p>
          <h2 id="coverage-heading" className={styles.title}>
            Comprehensive coverage across languages, frameworks, and roles
          </h2>
          <p className={styles.lead}>
            Agent Skills Standard is not limited to a single language or
            specimen. The canonical registry covers{" "}
            {COVERAGE_META.totalCategories} categories, pairing rule-based
            coding standards with specialized subagent personas and multi-phase
            SDLC workflows.
          </p>
        </header>

        {/* Mechanism distinction banner (AC-LP-06) */}
        <div className={styles.distinctionSection}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitleArea}>
              <h3 className={styles.groupHeading}>
                Three Distinct Capability Layers
              </h3>
              <span className={styles.groupBadge}>Architecture</span>
            </div>
            <a
              href={COVERAGE_META.workflowDocUrl}
              className={styles.groupCatalogLink}
            >
              <span>Workflow guide</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className={styles.groupDescription}>
            Understand how guidance skills, specialist subagents, and SDLC
            workflows operate together rather than treating all capabilities as
            identical prompt text.
          </p>

          <div className={styles.distinctionGrid}>
            {CAPABILITY_DISTINCTIONS.map((item) => (
              <article key={item.kind} className={styles.distinctionCard}>
                <span className={styles.distinctionKind}>{item.kind}</span>
                <h4 className={styles.distinctionTitle}>{item.title}</h4>
                <p className={styles.distinctionDesc}>{item.mechanism}</p>
                <div className={styles.distinctionFooter}>
                  <strong>Invocation:</strong> {item.invocation}
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Defaults & Installation Scope Notice (AC-LP-06) */}
        <div className={styles.noticeBanner}>
          <h4 className={styles.noticeTitle}>
            <span aria-hidden="true">[·]</span> Installation &amp; Customization
            Policy
          </h4>
          <p className={styles.noticeText}>
            Running <code>ags init</code> activates detected languages and
            frameworks plus core foundational standards. It does not install the
            entire catalog indiscriminately. You can selectively enable or
            customize categories in <code>.skillsrc</code>.
          </p>
          <div>
            <a
              href={COVERAGE_META.configurationDocUrl}
              className={styles.noticeLink}
            >
              <span>Read .skillsrc configuration documentation</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        {/* Group 1: Programming Languages (AC-LP-05) */}
        <div className={styles.groupSection}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitleArea}>
              <h3 className={styles.groupHeading}>Programming Languages</h3>
              <span className={styles.groupBadge}>
                {LANGUAGE_COVERAGE.length} Canonical Languages
              </span>
            </div>
            <a
              href={COVERAGE_META.catalogBrowseUrl}
              className={styles.groupCatalogLink}
            >
              <span>Browse language skills</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className={styles.groupDescription}>
            Base-language skills provide foundational language syntax, modern
            typing idioms, strict null safety, and clean code conventions for
            each runtime.
          </p>

          <ul
            className={styles.cardsGrid}
            aria-label="Supported programming languages"
          >
            {LANGUAGE_COVERAGE.map((lang) => (
              <li key={lang.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardHeaderRow}>
                    <h4 className={styles.cardName}>{lang.name}</h4>
                    <div className={styles.cardMeta}>
                      {lang.skillCount ? (
                        <span className={styles.cardCountTag}>
                          {lang.skillCount} skills
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className={styles.cardText}>{lang.description}</p>
                </div>

                <a
                  href={lang.sourceUrl}
                  className={styles.cardLink}
                  aria-label={`Inspect index: canonical ${lang.name} language skills`}
                >
                  <span>Inspect index</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Group 2: Frameworks & Platforms (AC-LP-05) */}
        <div className={styles.groupSection}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitleArea}>
              <h3 className={styles.groupHeading}>
                Frameworks &amp; Platforms
              </h3>
              <span className={styles.groupBadge}>
                {FRAMEWORK_COVERAGE.length} Frameworks &amp; Stacks
              </span>
            </div>
            <a
              href={COVERAGE_META.catalogBrowseUrl}
              className={styles.groupCatalogLink}
            >
              <span>Browse framework skills</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className={styles.groupDescription}>
            Opinionated architectural patterns, component composition, state
            management, and data persistence standards tailored to specific web,
            mobile, and backend frameworks.
          </p>

          <ul
            className={styles.cardsGrid}
            aria-label="Supported frameworks and platforms"
          >
            {FRAMEWORK_COVERAGE.map((framework) => (
              <li key={framework.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardHeaderRow}>
                    <h4 className={styles.cardName}>{framework.name}</h4>
                    <div className={styles.cardMeta}>
                      {framework.skillCount ? (
                        <span className={styles.cardCountTag}>
                          {framework.skillCount} skills
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className={styles.cardText}>{framework.description}</p>
                </div>

                <a
                  href={framework.sourceUrl}
                  className={styles.cardLink}
                  aria-label={`Inspect index: canonical ${framework.name} framework skills`}
                >
                  <span>Inspect index</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Group 3: Specialist Agents & Subagents (AC-LP-05, AC-LP-06) */}
        <div className={styles.groupSection}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitleArea}>
              <h3 className={styles.groupHeading}>Specialist Subagents</h3>
              <span className={styles.groupBadge}>
                {COVERAGE_META.specialistTotal} Specialized Roles
              </span>
            </div>
            <a
              href={COVERAGE_META.capabilitiesDocUrl}
              className={styles.groupCatalogLink}
            >
              <span>Agent dispatch matrix</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className={styles.groupDescription}>
            Focused persona definitions exported into host-native agent
            directories. Runtime dispatch support varies across hosts; see the
            capability matrix.
          </p>

          {/* Host dispatch caveat (AC-LP-06) */}
          <div className={styles.noticeBanner}>
            <h4 className={styles.noticeTitle}>
              <span aria-hidden="true">⚡</span> Host Dispatch Varies Across
              Agents
            </h4>
            <p className={styles.noticeText}>
              Different agent hosts support different delegation surfaces.
              Claude Code, Copilot, Codex, OpenCode, and Gemini provide native
              subagent surfaces; Cursor and Kiro operate instruction-only; and
              other hosts do not support specialist subagents. A serialized
              agent file is not proof of working runtime dispatch. Check the
              agent capability matrix for verified support.
            </p>
            <div>
              <a
                href={COVERAGE_META.capabilitiesDocUrl}
                className={styles.noticeLink}
              >
                <span>Review agent-capabilities.md matrix</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <ul
            className={styles.cardsGrid}
            aria-label="Supported specialist subagents"
          >
            {SPECIALIST_COVERAGE.map((specialist) => (
              <li key={specialist.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardHeaderRow}>
                    <h4 className={styles.cardName}>{specialist.name}</h4>
                    <span className={styles.groupBadgeMuted}>Subagent</span>
                  </div>
                  <p className={styles.cardText}>{specialist.description}</p>
                </div>

                <a
                  href={specialist.sourceUrl}
                  className={styles.cardLink}
                  aria-label={`Inspect role: ${specialist.name} subagent specification`}
                >
                  <span>Inspect role</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Group 4: Product Management (AC-LP-05, AC-LP-06) */}
        <div className={styles.groupSection}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitleArea}>
              <h3 className={styles.groupHeading}>Product Management</h3>
              <span className={styles.groupBadge}>
                {COVERAGE_META.productManagementTotal} PM Capabilities
              </span>
            </div>
            <a
              href={`${COVERAGE_META.catalogBrowseUrl}/product-management/_INDEX.md`}
              className={styles.groupCatalogLink}
            >
              <span>Browse PM index</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className={styles.groupDescription}>
            Structured requirements contracts connecting business goals to
            verifiable delivery. Distinguishes the shared foundation from opt-in
            advanced capabilities.
          </p>

          <div className={styles.pmContainer}>
            {/* Foundation Defaults */}
            <div>
              <div className={styles.pmSubHeader}>
                <h4 className={styles.pmSubTitle}>
                  {PRODUCT_MANAGEMENT_COVERAGE.foundationTitle}
                </h4>
                <p className={styles.pmSubDesc}>
                  {PRODUCT_MANAGEMENT_COVERAGE.foundationDescription}
                </p>
              </div>

              <ul
                className={styles.cardsGrid}
                aria-label="Default foundation product management skills"
              >
                {PRODUCT_MANAGEMENT_COVERAGE.foundationSkills.map((skill) => (
                  <li key={skill.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardHeaderRow}>
                        <h5 className={styles.cardName}>{skill.name}</h5>
                        <span className={styles.cardDefaultTag}>Default</span>
                      </div>
                      <p className={styles.cardText}>{skill.description}</p>
                    </div>

                    <a
                      href={skill.sourceUrl}
                      className={styles.cardLink}
                      aria-label={`Inspect skill: ${skill.name} standard`}
                    >
                      <span>Inspect skill</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Optional PM Capabilities */}
            <div>
              <div className={styles.pmSubHeader}>
                <h4 className={styles.pmSubTitle}>
                  {PRODUCT_MANAGEMENT_COVERAGE.optionalTitle}
                </h4>
                <p className={styles.pmSubDesc}>
                  {PRODUCT_MANAGEMENT_COVERAGE.optionalDescription}
                </p>
              </div>

              <ul
                className={styles.cardsGrid}
                aria-label="Optional product management capabilities"
              >
                {PRODUCT_MANAGEMENT_COVERAGE.optionalSkills.map((skill) => (
                  <li key={skill.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardHeaderRow}>
                        <h5 className={styles.cardName}>{skill.name}</h5>
                        <span className={styles.cardOptionalTag}>Optional</span>
                      </div>
                      <p className={styles.cardText}>{skill.description}</p>
                    </div>

                    <a
                      href={skill.sourceUrl}
                      className={styles.cardLink}
                      aria-label={`Inspect skill: ${skill.name} standard`}
                    >
                      <span>Inspect skill</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Group 5: Quality Engineering (AC-LP-05) */}
        <div className={styles.groupSection}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitleArea}>
              <h3 className={styles.groupHeading}>Quality Engineering</h3>
              <span className={styles.groupBadge}>
                {COVERAGE_META.qualityEngineeringTotal} Verification Skills
              </span>
            </div>
            <a
              href={`${COVERAGE_META.catalogBrowseUrl}/quality-engineering/_INDEX.md`}
              className={styles.groupCatalogLink}
            >
              <span>Browse QE index</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className={styles.groupDescription}>
            Full lifecycle test engineering: test planning, selector stability,
            test healing, API fuzzing, and coverage auditing.
          </p>

          <ul
            className={styles.cardsGrid}
            aria-label="Supported quality engineering skills"
          >
            {QUALITY_ENGINEERING_COVERAGE.map((qe) => (
              <li key={qe.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardHeaderRow}>
                    <h4 className={styles.cardName}>{qe.name}</h4>
                    <span className={styles.groupBadgeMuted}>QE</span>
                  </div>
                  <p className={styles.cardText}>{qe.description}</p>
                </div>

                <a
                  href={qe.sourceUrl}
                  className={styles.cardLink}
                  aria-label={`Inspect skill: ${qe.name} specification`}
                >
                  <span>Inspect skill</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Cross-Cutting Standards (Architecture & Security) */}
        <div className={styles.groupSection}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitleArea}>
              <h3 className={styles.groupHeading}>Cross-Cutting Standards</h3>
            </div>
            <a
              href={COVERAGE_META.catalogBrowseUrl}
              className={styles.groupCatalogLink}
            >
              <span>Browse common standards</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className={styles.groupDescription}>
            Cross-stack guidance is loaded when enabled categories and relevant
            file/task triggers match. System design and cybersecurity standards
            are context-triggered rather than unconditional.
          </p>

          <ul
            className={styles.cardsGrid}
            aria-label="Cross-cutting engineering standards"
          >
            {CROSS_CUTTING_COVERAGE.map((item) => (
              <li key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardHeaderRow}>
                    <h4 className={styles.cardName}>{item.name}</h4>
                    {item.skillCount ? (
                      <span className={styles.cardCountTag}>
                        {item.skillCount} skills
                      </span>
                    ) : null}
                  </div>
                  <p className={styles.cardText}>{item.description}</p>
                </div>

                <a
                  href={item.sourceUrl}
                  className={styles.cardLink}
                  aria-label={`Inspect index: ${item.name} standards`}
                >
                  <span>Inspect index</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Section Footer / Audit ledger */}
        <footer className={styles.coverageFooter}>
          <p className={styles.auditNote}>
            Source: Derived directly from <code>skills/metadata.json</code> and
            canonical registry indexes. No unverified headline counts.
          </p>
          <div className={styles.footerActions}>
            <a
              href={COVERAGE_META.catalogBrowseUrl}
              className={styles.footerLink}
            >
              <span>View complete GitHub registry</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href={COVERAGE_META.capabilitiesDocUrl}
              className={styles.footerLink}
            >
              <span>Inspect agent capability matrix</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}
