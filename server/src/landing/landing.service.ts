import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fs from 'fs';
import path from 'path';

interface SkillEntry {
  id: string;
  description: string;
}

interface FrameworkEntry {
  key: string;
  label: string;
  skillCount: number;
  skills: SkillEntry[];
}

@Injectable()
/**
 * Builds the public landing page from the generated skills index.
 */
export class LandingService {
  private readonly frameworkLabels: Record<string, string> = {
    golang: 'Go',
    ios: 'iOS',
    javascript: 'JavaScript',
    nestjs: 'NestJS',
    nextjs: 'Next.js',
    php: 'PHP',
    'quality-engineering': 'Quality Engineering',
    'react-native': 'React Native',
    'spring-boot': 'Spring Boot',
    typescript: 'TypeScript',
  };

  private readonly skillsIndexPath = path.resolve(
    __dirname,
    '../../../skills/index.json',
  );

  renderLandingPage(): string {
    const frameworks = this.getFrameworks();
    const totalSkills = frameworks.reduce(
      (sum, framework) => sum + framework.skillCount,
      0,
    );

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agent Skills Standard | AI Skill Registry for Teams</title>
    <meta
      name="description"
      content="Discover Agent Skills Standard: a CLI and registry that helps managers, IT teams, contributors, and new users adopt maintainable AI engineering standards."
    />
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --surface: #ffffff;
        --surface-alt: #eef3ff;
        --text: #14213d;
        --muted: #4a5b7a;
        --primary: #2952cc;
        --primary-dark: #173287;
        --border: #d6def3;
        --success: #1f7a4d;
        --shadow: 0 12px 32px rgba(20, 33, 61, 0.08);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
      }

      a {
        color: var(--primary-dark);
      }

      a:hover,
      a:focus-visible {
        color: var(--primary);
      }

      .page-shell {
        width: min(1160px, calc(100% - 2rem));
        margin: 0 auto;
      }

      .topbar {
        padding: 1rem 0 0;
      }

      .topbar nav {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .nav-link,
      .cta-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0.7rem 1rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        text-decoration: none;
        font-weight: 600;
      }

      .cta-link.primary {
        border-color: var(--primary);
        background: var(--primary);
        color: #fff;
      }

      .hero,
      .section-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: var(--shadow);
      }

      .hero {
        display: grid;
        gap: 2rem;
        padding: clamp(1.5rem, 4vw, 3rem);
        margin: 1rem 0 1.5rem;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        background: var(--surface-alt);
        color: var(--primary-dark);
        font-weight: 700;
      }

      h1,
      h2,
      h3 {
        margin: 0;
        line-height: 1.2;
      }

      h1 {
        font-size: clamp(2.2rem, 4vw, 4rem);
        max-width: 12ch;
      }

      h2 {
        font-size: clamp(1.6rem, 3vw, 2.35rem);
      }

      p {
        margin: 0;
      }

      .hero-copy {
        display: grid;
        gap: 1rem;
      }

      .hero-copy p {
        max-width: 65ch;
        color: var(--muted);
        font-size: 1.05rem;
      }

      .cta-row,
      .link-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .stats-grid,
      .audience-grid {
        display: grid;
        gap: 1rem;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .stat-card,
      .audience-card {
        padding: 1.2rem;
        border-radius: 20px;
        border: 1px solid var(--border);
        background: var(--surface-alt);
      }

      .stat-card strong {
        display: block;
        font-size: 2rem;
        color: var(--primary-dark);
      }

      main {
        display: grid;
        gap: 1.5rem;
        padding-bottom: 2rem;
      }

      .section-card {
        padding: clamp(1.25rem, 3vw, 2rem);
        display: grid;
        gap: 1.25rem;
      }

      .section-copy {
        display: grid;
        gap: 0.75rem;
        max-width: 72ch;
      }

      .section-copy p {
        color: var(--muted);
      }

      .benefits-list {
        margin: 0;
        padding-left: 1.25rem;
        display: grid;
        gap: 0.6rem;
      }

      .catalog-grid {
        display: grid;
        gap: 1rem;
      }

      details {
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface);
        overflow: hidden;
      }

      details[open] {
        background: #fbfcff;
      }

      summary {
        cursor: pointer;
        list-style: none;
        padding: 1rem 1.2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        font-weight: 700;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      .framework-summary {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
      }

      .framework-pill,
      .count-pill {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
      }

      .framework-pill {
        background: var(--surface-alt);
        color: var(--primary-dark);
      }

      .count-pill {
        background: #e7f6ed;
        color: var(--success);
        font-weight: 700;
      }

      .skills-list {
        margin: 0;
        padding: 0 1.2rem 1.2rem 2.4rem;
        display: grid;
        gap: 0.75rem;
      }

      .skills-list li::marker {
        color: var(--primary);
      }

      .skill-name {
        font-weight: 700;
      }

      footer {
        padding: 0 0 2.5rem;
        color: var(--muted);
      }

      @media (min-width: 860px) {
        .hero {
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
          align-items: start;
        }

        .audience-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .page-shell {
          width: min(100% - 1rem, 1160px);
        }
      }
    </style>
  </head>
  <body>
    <div class="page-shell">
      <header class="topbar">
        <nav aria-label="Primary">
          <a class="nav-link" href="#overview">Overview</a>
          <a class="nav-link" href="#audiences">Who it helps</a>
          <a class="nav-link" href="#contributors">Contributor flow</a>
          <a class="nav-link" href="#frameworks">Supported frameworks</a>
        </nav>
      </header>

      <section class="hero" id="overview">
        <div class="hero-copy">
          <span class="eyebrow">AI standards that stay practical</span>
          <h1>Ship one source of truth for your AI coding standards.</h1>
          <p>
            Agent Skills Standard is the CLI and registry that helps teams package
            engineering rules into reusable skills, sync them into projects, and
            keep every AI assistant aligned without bloating prompts.
          </p>
          <div class="cta-row">
            <a class="cta-link primary" href="https://www.npmjs.com/package/agent-skills-standard">Use the CLI</a>
            <a class="cta-link" href="https://github.com/HoangNguyen0403/agent-skills-standard">View on GitHub</a>
            <a class="cta-link" href="https://github.com/HoangNguyen0403/agent-skills-standard#-quick-start-get-running-in-60s">Quick start</a>
          </div>
          <div class="link-row">
            <a href="https://github.com/HoangNguyen0403/agent-skills-standard/blob/develop/README.md">README</a>
            <a href="https://github.com/HoangNguyen0403/agent-skills-standard/blob/develop/CONTRIBUTING.md">Contributing guide</a>
            <a href="https://github.com/HoangNguyen0403/agent-skills-standard/blob/develop/ARCHITECTURE.md">Architecture</a>
          </div>
        </div>
        <div class="stats-grid" aria-label="Registry stats">
          <article class="stat-card">
            <strong>${frameworks.length}</strong>
            <span>Supported frameworks and standards packs</span>
          </article>
          <article class="stat-card">
            <strong>${totalSkills}</strong>
            <span>Published skills available from the generated registry index</span>
          </article>
          <article class="stat-card">
            <strong>1 CLI</strong>
            <span>Initialize, sync, validate, and upgrade skills with one workflow</span>
          </article>
        </div>
      </section>

      <main>
        <section class="section-card" id="audiences">
          <div class="section-copy">
            <h2>Built for managers, IT teams, and non-IT users</h2>
            <p>
              The landing page explains the product in plain language first, then
              lets technical users drill into the exact frameworks and skills they
              care about.
            </p>
          </div>
          <div class="audience-grid">
            <article class="audience-card">
              <h3>Managers</h3>
              <p>
                Standardize AI output across teams, reduce review churn, and keep
                project-wide rules consistent regardless of which coding agent each
                person uses.
              </p>
            </article>
            <article class="audience-card">
              <h3>IT & engineering teams</h3>
              <p>
                Turn internal best practices into reusable, versioned skills that
                can be synced into projects without copying giant prompt templates.
              </p>
            </article>
            <article class="audience-card">
              <h3>Non-IT users</h3>
              <p>
                Start with the CLI and curated standards without needing to learn
                how every rule is authored internally. The framework catalog shows
                what is already supported.
              </p>
            </article>
            <article class="audience-card" id="contributors">
              <h3>Contributors</h3>
              <p>
                New skills and frameworks flow from the generated skills index, so
                the catalog stays current without manually rebuilding page content
                every time the registry expands.
              </p>
            </article>
          </div>
        </section>

        <section class="section-card">
          <div class="section-copy">
            <h2>Why the workflow stays maintainable</h2>
            <p>
              Contributors already update the registry source of truth. This page
              reuses that generated output instead of hardcoding framework cards by
              hand, so discoverability improves without creating another content
              surface to maintain.
            </p>
          </div>
          <ul class="benefits-list">
            <li>One registry index drives the supported-framework catalog.</li>
            <li>Each framework card expands to show the skills available today.</li>
            <li>Skill descriptions are reused from the generated skill index.</li>
            <li>Navigation stays simple: overview, audiences, contributor flow, and catalog.</li>
          </ul>
        </section>

        <section class="section-card" id="frameworks">
          <div class="section-copy">
            <h2>Supported frameworks</h2>
            <p>
              Browse every supported framework or standards pack and expand a card
              to see the skills it currently includes.
            </p>
          </div>
          <div class="catalog-grid">
            ${frameworks
              .map(
                (framework) => `<details>
              <summary>
                <span class="framework-summary">
                  <span class="framework-pill">${this.escapeHtml(framework.label)}</span>
                  <span>${this.escapeHtml(
                    framework.skills[0]?.description ??
                      'Skill standards available in this pack.',
                  )}</span>
                </span>
                <span class="count-pill">${framework.skillCount} skills</span>
              </summary>
              <ol class="skills-list">
                ${framework.skills
                  .map(
                    (skill) => `<li>
                  <span class="skill-name">${this.escapeHtml(skill.id)}</span><br />
                  <span>${this.escapeHtml(skill.description)}</span>
                </li>`,
                  )
                  .join('')}
              </ol>
            </details>`,
              )
              .join('')}
          </div>
        </section>
      </main>

      <footer>
        <p>
          Explore the registry, CLI, and contributor docs on GitHub to add new
          standards without rebuilding this catalog by hand.
        </p>
      </footer>
    </div>
  </body>
</html>`;
  }

  private getFrameworks(): FrameworkEntry[] {
    const rawIndex = this.readSkillsIndex();

    return Object.entries(rawIndex)
      .map(([framework, markdown]) => {
        const skills = markdown
          .split('\n')
          .map((line) => this.parseSkillLine(line))
          .filter((skill): skill is SkillEntry => skill !== null);

        return {
          key: framework,
          label: this.formatFrameworkLabel(framework),
          skillCount: skills.length,
          skills,
        };
      })
      .filter((framework) => framework.skillCount > 0)
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  private readSkillsIndex(): Record<string, string> {
    try {
      const file = fs.readFileSync(this.skillsIndexPath, 'utf8');
      const parsed = JSON.parse(file) as unknown;

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('skills index must be an object');
      }

      return parsed as Record<string, string>;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to load skills index: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private parseSkillLine(line: string): SkillEntry | null {
    const match = line.match(/^- \*\*\[([^\]]+)\]\*\*: (.+?) \(triggers:/);

    if (!match) {
      return null;
    }

    const [, id, description] = match;

    return {
      id,
      description,
    };
  }

  private formatFrameworkLabel(framework: string): string {
    const mappedLabel = this.frameworkLabels[framework];

    if (mappedLabel) {
      return mappedLabel;
    }

    return framework
      .split('-')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
