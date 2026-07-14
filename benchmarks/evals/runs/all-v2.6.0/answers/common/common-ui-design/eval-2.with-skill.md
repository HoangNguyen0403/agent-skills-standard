Assumption: Next.js App Router with React and CSS Modules. The dashboard serves an operations team tracking growth, conversion, and channel performance.

Design direction:

- Purpose: provide a fast daily view of business health and anomalies.
- Tone: industrial/utilitarian, dark, dense, and precise.
- Differentiation: an acid-lime “signal rail” that highlights the most important metric.
- Typography: Space Grotesk for display text and IBM Plex Sans for readable data labels.

`app/dashboard/page.tsx`

```tsx
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import styles from "./dashboard.module.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const body = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-body" });

const revenue = [42, 48, 44, 58, 54, 66, 61, 74, 70, 82, 78, 91];

const channels = [
  ["Organic search", "42.8%", "$84,320", "+18.4%"],
  ["Paid social", "27.1%", "$53,420", "+9.7%"],
  ["Direct", "18.6%", "$36,690", "+14.2%"],
  ["Referral", "11.5%", "$22,680", "+6.1%"],
];

const activity = [
  ["INV-2048", "Northstar Labs", "$12,400", "Paid"],
  ["INV-2047", "Morrow Studio", "$8,920", "Pending"],
  ["INV-2046", "Atlas Systems", "$6,780", "Paid"],
  ["INV-2045", "Orbital Works", "$4,320", "Review"],
];

function AreaChart() {
  const points = revenue
    .map((value, index) => `${index * 70},${120 - value}`)
    .join(" ");

  return (
    <svg className={styles.areaChart} viewBox="0 0 770 140" role="img" aria-label="Revenue trend">
      <defs>
        <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c7f36b" stopOpacity=".35" />
          <stop offset="100%" stopColor="#c7f36b" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[30, 60, 90, 120].map((y) => (
        <line key={y} x1="0" x2="770" y1={y} y2={y} className={styles.gridLine} />
      ))}

      <polygon points={`0,140 ${points} 770,140`} fill="url(#fill)" />
      <polyline points={points} fill="none" stroke="#c7f36b" strokeWidth="3" />

      {revenue.map((value, index) => (
        <circle
          key={value}
          cx={index * 70}
          cy={120 - value}
          r="4"
          fill="#101311"
          stroke="#c7f36b"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <main className={`${display.variable} ${body.variable} ${styles.shell}`}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>NORTH / 04</div>

        <nav>
          <a className={styles.active} href="#overview">Overview</a>
          <a href="#analytics">Analytics</a>
          <a href="#customers">Customers</a>
          <a href="#invoices">Invoices</a>
        </nav>

        <div className={styles.sidebarFooter}>
          <span className={styles.statusDot} />
          Systems nominal
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>MONITORING / 07.14.2026</p>
            <h1>Good morning, Alex.</h1>
          </div>

          <button className={styles.exportButton}>Export report ↗</button>
        </header>

        <section className={styles.kpiGrid} id="overview">
          <article className={`${styles.card} ${styles.signalCard}`}>
            <p className={styles.label}>Net revenue</p>
            <strong>$197,110</strong>
            <span className={styles.positive}>↗ 16.8% vs last month</span>
          </article>

          <article className={styles.card}>
            <p className={styles.label}>Active customers</p>
            <strong>2,841</strong>
            <span className={styles.muted}>+184 this month</span>
          </article>

          <article className={styles.card}>
            <p className={styles.label}>Conversion rate</p>
            <strong>8.42%</strong>
            <span className={styles.positive}>↗ 2.1% improvement</span>
          </article>

          <article className={styles.card}>
            <p className={styles.label}>Avg. order value</p>
            <strong>$284.60</strong>
            <span className={styles.muted}>Stable over 30 days</span>
          </article>
        </section>

        <section className={styles.chartGrid} id="analytics">
          <article className={`${styles.panel} ${styles.revenuePanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>PERFORMANCE</p>
                <h2>Revenue velocity</h2>
              </div>
              <span className={styles.period}>Last 12 months ▾</span>
            </div>

            <div className={styles.chartValue}>$197,110</div>
            <AreaChart />
            <div className={styles.axis}>
              {["AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL"].map(
                (month) => <span key={month}>{month}</span>,
              )}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>ACQUISITION</p>
                <h2>Channel mix</h2>
              </div>
              <span className={styles.period}>This month</span>
            </div>

            <div className={styles.donutWrap}>
              <div className={styles.donut}>
                <div>
                  <strong>100%</strong>
                  <span>tracked</span>
                </div>
              </div>
            </div>

            <div className={styles.legend}>
              <span><i className={styles.lime} /> Organic search <b>42.8%</b></span>
              <span><i className={styles.orange} /> Paid social <b>27.1%</b></span>
              <span><i className={styles.blue} /> Direct <b>18.6%</b></span>
              <span><i className={styles.gray} /> Referral <b>11.5%</b></span>
            </div>
          </article>
        </section>

        <section className={styles.tableGrid}>
          <article className={`${styles.panel} ${styles.tablePanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>REVENUE SOURCES</p>
                <h2>Top channels</h2>
              </div>
              <button className={styles.textButton}>View all →</button>
            </div>

            <table>
              <thead>
                <tr><th>Channel</th><th>Share</th><th>Revenue</th><th>Growth</th></tr>
              </thead>
              <tbody>
                {channels.map(([name, share, amount, growth]) => (
                  <tr key={name}>
                    <td>{name}</td><td>{share}</td><td>{amount}</td><td className={styles.positive}>{growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className={`${styles.panel} ${styles.tablePanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>LATEST TRANSACTIONS</p>
                <h2>Invoice activity</h2>
              </div>
              <button className={styles.textButton}>View all →</button>
            </div>

            <table>
              <thead>
                <tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {activity.map(([invoice, customer, amount, status]) => (
                  <tr key={invoice}>
                    <td>{invoice}</td>
                    <td>{customer}</td>
                    <td>{amount}</td>
                    <td><span className={`${styles.badge} ${styles[status.toLowerCase()]}`}>{status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      </section>
    </main>
  );
}
```

`app/dashboard/dashboard.module.css`

```css
.shell {
  --bg: #101311;
  --panel: #171b18;
  --line: #2d352f;
  --text: #f3f5ed;
  --muted: #89948c;
  --lime: #c7f36b;
  --orange: #ff9b5c;
  --blue: #75b9ff;

  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(circle at 80% 0%, #26331f 0, transparent 32rem),
    var(--bg);
  color: var(--text);
  font-family: var(--font-body), sans-serif;
  letter-spacing: -.01em;
}

.sidebar {
  width: 220px;
  border-right: 1px solid var(--line);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.logo,
.eyebrow,
.label,
.period,
.axis,
.sidebarFooter {
  font-family: var(--font-display), sans-serif;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.logo {
  color: var(--lime);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 72px;
}

nav {
  display: grid;
  gap: 8px;
}

nav a {
  color: var(--muted);
  padding: 12px;
  text-decoration: none;
  border-left: 2px solid transparent;
}

nav a:hover,
nav .active {
  color: var(--text);
  border-left-color: var(--lime);
  background: #20271f;
}

.sidebarFooter {
  margin-top: auto;
  color: var(--muted);
  font-size: 10px;
}

.statusDot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--lime);
  box-shadow: 0 0 12px var(--lime);
}

.content {
  width: min(1500px, 100%);
  padding: 48px clamp(24px, 5vw, 76px);
}

.header,
.panelHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.header {
  margin-bottom: 42px;
}

h1,
h2 {
  margin: 0;
  font-family: var(--font-display), sans-serif;
  letter-spacing: -.06em;
}

h1 {
  font-size: clamp(32px, 5vw, 58px);
  font-weight: 500;
}

h2 {
  font-size: 22px;
  font-weight: 500;
}

.eyebrow,
.label {
  color: var(--muted);
  font-size: 10px;
  margin: 0 0 10px;
}

.exportButton,
.textButton {
  color: var(--bg);
  background: var(--lime);
  border: 0;
  padding: 12px 16px;
  font: inherit;
  cursor: pointer;
}

.textButton {
  color: var(--lime);
  background: transparent;
  padding: 0;
}

.kpiGrid,
.chartGrid,
.tableGrid {
  display: grid;
  gap: 16px;
}

.kpiGrid {
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 16px;
}

.chartGrid {
  grid-template-columns: 1.8fr 1fr;
  margin-bottom: 16px;
}

.tableGrid {
  grid-template-columns: 1fr 1fr;
}

.card,
.panel {
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
}

.card {
  min-height: 142px;
  padding: 22px;
  animation: rise .6s both;
}

.card:nth-child(2) { animation-delay: .08s; }
.card:nth-child(3) { animation-delay: .16s; }
.card:nth-child(4) { animation-delay: .24s; }

.signalCard {
  border-top: 3px solid var(--lime);
}

.card strong {
  display: block;
  margin: 20px 0 8px;
  font-family: var(--font-display), sans-serif;
  font-size: 30px;
  letter-spacing: -.07em;
}

.positive {
  color: var(--lime);
}

.muted {
  color: var(--muted);
  font-size: 12px;
}

.panel {
  padding: 24px;
  animation: rise .7s .25s both;
}

.panelHeader {
  margin-bottom: 26px;
}

.period {
  color: var(--muted);
  font-size: 10px;
}

.chartValue {
  font: 500 34px var(--font-display), sans-serif;
  letter-spacing: -.08em;
  margin-bottom: 16px;
}

.areaChart {
  width: 100%;
  height: 180px;
  overflow: visible;
}

.gridLine {
  stroke: var(--line);
  stroke-dasharray: 3 6;
}

.axis {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 9px;
  margin-top: 8px;
}

.donutWrap {
  display: grid;
  place-items: center;
  min-height: 180px;
}

.donut {
  display: grid;
  place-items: center;
  width: 146px;
  height: 146px;
  border-radius: 50%;
  background: conic-gradient(var(--lime) 0 43%, var(--orange) 43% 70%, var(--blue) 70% 89%, #58615b 89%);
}

.donut::before {
  content: "";
  grid-area: 1 / 1;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: var(--panel);
}

.donut div {
  z-index: 1;
  display: grid;
  text-align: center;
}

.donut strong {
  font: 26px var(--font-display), sans-serif;
}

.donut span {
  color: var(--muted);
  font-size: 10px;
  text-transform: uppercase;
}

.legend {
  display: grid;
  gap: 12px;
  font-size: 12px;
}

.legend span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend b {
  margin-left: auto;
  font-weight: 400;
}

.legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.lime { background: var(--lime); }
.orange { background: var(--orange); }
.blue { background: var(--blue); }
.gray { background: #58615b; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th {
  color: var(--muted);
  font: 10px var(--font-display), sans-serif;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .08em;
}

td,
th {
  padding: 14px 8px;
  border-bottom: 1px solid var(--line);
}

td:first-child,
th:first-child {
  padding-left: 0;
}

td:last-child,
th:last-child {
  text-align: right;
  padding-right: 0;
}

.badge {
  padding: 5px 8px;
  font-size: 10px;
}

.paid {
  color: var(--lime);
  background: #27351d;
}

.pending {
  color: var(--orange);
  background: #39291e;
}

.review {
  color: var(--blue);
  background: #1d3040;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .sidebar { width: 72px; padding: 24px 12px; }
  .logo { writing-mode: vertical-rl; margin: 0 auto 48px; }
  nav a { font-size: 0; }
  nav a::before { content: "•"; font-size: 20px; }
  .kpiGrid,
  .chartGrid,
  .tableGrid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 620px) {
  .content { padding: 28px 16px; }
  .kpiGrid,
  .chartGrid,
  .tableGrid { grid-template-columns: 1fr; }
  .header { display: block; }
  .exportButton { margin-top: 20px; }
  .tablePanel { overflow-x: auto; }
  table { min-width: 480px; }
}
```
