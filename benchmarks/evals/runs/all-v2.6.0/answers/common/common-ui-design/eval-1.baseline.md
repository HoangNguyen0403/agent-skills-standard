Assumption: the SaaS product is named “Flowdash,” a workflow automation platform. Save this as `index.html`.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flowdash — Ship work faster</title>
  <meta
    name="description"
    content="Flowdash helps modern teams automate repetitive work and ship faster."
  />
  <style>
    :root {
      --ink: #14213d;
      --muted: #64748b;
      --primary: #635bff;
      --primary-dark: #5048e5;
      --surface: #f7f8fc;
      --line: #e8eaf2;
      --white: #fff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      background: var(--white);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      line-height: 1.5;
    }

    a { color: inherit; text-decoration: none; }
    .container { width: min(1120px, calc(100% - 40px)); margin: auto; }

    header {
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,.85);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    nav {
      height: 76px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -.04em;
    }

    .logo-mark {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      color: white;
      border-radius: 10px;
      background: linear-gradient(135deg, #8b83ff, var(--primary));
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 30px;
      color: var(--muted);
      font-size: .92rem;
    }

    .nav-links a:hover { color: var(--ink); }
    .nav-cta { display: flex; align-items: center; gap: 18px; }

    .button {
      border: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      padding: 13px 19px;
      font-weight: 700;
      transition: .2s ease;
    }

    .button-primary {
      color: white;
      background: var(--primary);
      box-shadow: 0 8px 20px rgba(99,91,255,.22);
    }

    .button-primary:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
    }

    .button-ghost {
      color: var(--ink);
      background: transparent;
    }

    .hero {
      overflow: hidden;
      padding: 100px 0 90px;
      text-align: center;
      background:
        radial-gradient(circle at 50% 0%, #e8e6ff 0, transparent 38%),
        var(--surface);
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      color: var(--primary-dark);
      border: 1px solid #d9d6ff;
      border-radius: 999px;
      background: #f2f1ff;
      font-size: .82rem;
      font-weight: 700;
    }

    .eyebrow span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #35c77a;
    }

    h1 {
      max-width: 780px;
      margin: 22px auto;
      font-size: clamp(2.8rem, 7vw, 5.5rem);
      line-height: .98;
      letter-spacing: -.075em;
    }

    .hero p {
      max-width: 590px;
      margin: 0 auto 30px;
      color: var(--muted);
      font-size: 1.15rem;
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .dashboard {
      max-width: 920px;
      margin: 70px auto 0;
      padding: 10px;
      border: 1px solid #dfe1eb;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 30px 70px rgba(30, 37, 68, .14);
      text-align: left;
    }

    .dashboard-bar {
      display: flex;
      gap: 7px;
      padding: 7px 10px 14px;
    }

    .dashboard-bar i {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #d8dbe6;
    }

    .dashboard-content {
      display: grid;
      grid-template-columns: 180px 1fr;
      min-height: 310px;
      overflow: hidden;
      border-radius: 11px;
      background: #f8f9fd;
    }

    .sidebar {
      padding: 20px 14px;
      border-right: 1px solid var(--line);
      background: #fff;
    }

    .side-label {
      margin: 0 8px 14px;
      color: #a0a7b8;
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .side-item {
      padding: 9px 10px;
      margin-bottom: 5px;
      border-radius: 7px;
      color: var(--muted);
      font-size: .8rem;
    }

    .side-item.active {
      color: var(--primary-dark);
      background: #eeedff;
      font-weight: 700;
    }

    .main-panel { padding: 24px; }
    .panel-title { margin: 0 0 18px; font-size: 1.15rem; }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .stat, .activity {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: white;
    }

    .stat small, .activity small {
      color: var(--muted);
      font-size: .7rem;
    }

    .stat strong {
      display: block;
      margin-top: 5px;
      font-size: 1.35rem;
    }

    .activity {
      margin-top: 14px;
    }

    .activity-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 0;
      border-bottom: 1px solid var(--line);
      font-size: .78rem;
    }

    .activity-row:last-child { border: 0; }
    .badge { color: #13945b; font-size: .72rem; font-weight: 700; }

    section { padding: 90px 0; }
    .section-heading { max-width: 620px; margin-bottom: 38px; }
    .section-heading h2 {
      margin: 0 0 12px;
      font-size: clamp(2rem, 4vw, 3.2rem);
      line-height: 1.05;
      letter-spacing: -.06em;
    }
    .section-heading p { margin: 0; color: var(--muted); }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .feature {
      padding: 26px;
      border: 1px solid var(--line);
      border-radius: 16px;
    }

    .feature-icon {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      margin-bottom: 22px;
      color: var(--primary);
      border-radius: 11px;
      background: #eeedff;
      font-size: 1.3rem;
    }

    .feature h3 { margin: 0 0 8px; font-size: 1.05rem; }
    .feature p { margin: 0; color: var(--muted); font-size: .92rem; }

    .pricing-section { background: var(--surface); }
    .pricing {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .price-card {
      padding: 28px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: white;
    }

    .price-card.featured {
      color: white;
      background: var(--ink);
      border-color: var(--ink);
      transform: translateY(-8px);
    }

    .price-card h3 { margin: 0 0 8px; }
    .price-card p { color: var(--muted); font-size: .88rem; }
    .featured p { color: #b9c0d1; }

    .price {
      margin: 22px 0;
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: -.06em;
    }

    .price span { color: var(--muted); font-size: .85rem; font-weight: 500; }
    .featured .price span { color: #b9c0d1; }

    .price-card ul {
      padding: 0;
      margin: 0 0 25px;
      list-style: none;
      color: var(--muted);
      font-size: .88rem;
    }

    .featured ul { color: #d8dce7; }
    .price-card li { margin: 12px 0; }
    .price-card li::before { content: "✓"; margin-right: 9px; color: #35c77a; font-weight: 800; }

    .quote {
      max-width: 780px;
      margin: auto;
      text-align: center;
    }

    blockquote {
      margin: 0 0 22px;
      font-size: clamp(1.5rem, 3vw, 2.3rem);
      font-weight: 700;
      letter-spacing: -.04em;
      line-height: 1.2;
    }

    .quote cite { color: var(--muted); font-size: .9rem; font-style: normal; }

    .final-cta {
      padding: 76px 30px;
      color: white;
      border-radius: 22px;
      background: linear-gradient(120deg, #5149df, #8179ff);
      text-align: center;
    }

    .final-cta h2 {
      margin: 0 auto 12px;
      font-size: clamp(2rem, 4vw, 3.3rem);
      letter-spacing: -.06em;
    }

    .final-cta p { margin: 0 auto 25px; color: #e5e3ff; }
    .final-cta .button { color: var(--primary-dark); background: white; }

    footer {
      padding: 28px 0;
      color: var(--muted);
      border-top: 1px solid var(--line);
      font-size: .85rem;
    }

    .footer-inner { display: flex; justify-content: space-between; gap: 20px; }
    .footer-links { display: flex; gap: 20px; }

    @media (max-width: 760px) {
      .container { width: min(100% - 28px, 560px); }
      .nav-links { display: none; }
      .hero { padding: 70px 0 60px; }
      .dashboard-content { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .stats, .features, .pricing { grid-template-columns: 1fr; }
      .price-card.featured { transform: none; }
      section { padding: 65px 0; }
      .footer-inner { flex-direction: column; }
    }
  </style>
</head>
<body>
  <header>
    <nav class="container">
      <a class="logo" href="#">
        <span class="logo-mark">✦</span>
        flowdash
      </a>

      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#customers">Customers</a>
      </div>

      <div class="nav-cta">
        <a class="button button-ghost" href="#">Sign in</a>
        <a class="button button-primary" href="#start">Get started</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <div class="eyebrow"><span></span> Automate the busywork</div>
        <h1>Make work flow.<br /><em>Ship more.</em></h1>
        <p>
          Flowdash brings your tools, tasks, and team into one calm workspace
          built for getting meaningful work done.
        </p>

        <div class="hero-actions">
          <a class="button button-primary" href="#start">Start for free →</a>
          <a class="button button-ghost" href="#features">See how it works</a>
        </div>

        <div class="dashboard" aria-label="Flowdash product preview">
          <div class="dashboard-bar"><i></i><i></i><i></i></div>
          <div class="dashboard-content">
            <aside class="sidebar">
              <p class="side-label">Workspace</p>
              <div class="side-item active">Overview</div>
              <div class="side-item">Automations</div>
              <div class="side-item">Projects</div>
              <div class="side-item">Team</div>
            </aside>
            <div class="main-panel">
              <h3 class="panel-title">Good morning, Alex</h3>
              <div class="stats">
                <div class="stat"><small>Tasks completed</small><strong>248</strong></div>
                <div class="stat"><small>Hours saved</small><strong>36.5</strong></div>
                <div class="stat"><small>Active flows</small><strong>18</strong></div>
              </div>
              <div class="activity">
                <small>Recent activity</small>
                <div class="activity-row"><span>New lead added to CRM</span><span class="badge">Automated</span></div>
                <div class="activity-row"><span>Weekly report generated</span><span class="badge">Automated</span></div>
                <div class="activity-row"><span>Design review scheduled</span><span class="badge">Automated</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="features">
      <div class="container">
        <div class="section-heading">
          <h2>Your team’s unfair advantage.</h2>
          <p>Everything you need to turn scattered processes into a repeatable operating system.</p>
        </div>

        <div class="features">
          <article class="feature">
            <div class="feature-icon">⚡</div>
            <h3>Automate anything</h3>
            <p>Connect your favorite tools and eliminate repetitive tasks with simple visual workflows.</p>
          </article>
          <article class="feature">
            <div class="feature-icon">◈</div>
            <h3>See the whole picture</h3>
            <p>Track projects, owners, and deadlines from one clear, real-time command center.</p>
          </article>
          <article class="feature">
            <div class="feature-icon">◎</div>
            <h3>Work together better</h3>
            <p>Keep conversations, decisions, and next steps connected to the work that matters.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="customers">
      <div class="container quote">
        <blockquote>
          “Flowdash gave us back an entire day every week—and finally made our process feel manageable.”
        </blockquote>
        <cite>Jordan Lee · COO, Northstar</cite>
      </div>
    </section>

    <section id="pricing" class="pricing-section">
      <div class="container">
        <div class="section-heading">
          <h2>Simple pricing that scales.</h2>
          <p>Start free, then upgrade when your team is ready.</p>
        </div>

        <div class="pricing">
          <article class="price-card">
            <h3>Starter</h3>
            <p>For individuals and small projects.</p>
            <div class="price">$0 <span>/ forever</span></div>
            <ul>
              <li>3 active workflows</li>
              <li>Unlimited tasks</li>
              <li>Basic integrations</li>
            </ul>
            <a class="button button-ghost" href="#start">Get started</a>
          </article>

          <article class="price-card featured">
            <h3>Team</h3>
            <p>For growing teams that move fast.</p>
            <div class="price">$12 <span>/ user / month</span></div>
            <ul>
              <li>Unlimited workflows</li>
              <li>Advanced integrations</li>
              <li>Team analytics</li>
            </ul>
            <a class="button button-primary" href="#start">Start free trial</a>
          </article>

          <article class="price-card">
            <h3>Scale</h3>
            <p>For organizations with complex needs.</p>
            <div class="price">Custom</div>
            <ul>
              <li>Priority support</li>
              <li>Advanced security</li>
              <li>Custom onboarding</li>
            </ul>
            <a class="button button-ghost" href="#start">Talk to sales</a>
          </article>
        </div>
      </div>
    </section>

    <section id="start">
      <div class="container final-cta">
        <h2>Ready to make work flow?</h2>
        <p>Join 4,000+ teams spending less time managing work and more time doing it.</p>
        <a class="button" href="#">Create your free account →</a>
      </div>
    </section>
  </main>

  <footer>
    <div class="container footer-inner">
      <span>© 2026 Flowdash, Inc.</span>
      <div class="footer-links">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Contact</a>
      </div>
    </div>
  </footer>
</body>
</html>
```
