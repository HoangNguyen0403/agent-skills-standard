Assumption: a standalone responsive HTML dashboard using Chart.js.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #f5f7fb;
      --card: #fff;
      --text: #172033;
      --muted: #718096;
      --line: #e7ebf3;
      --primary: #5b5ce2;
      --green: #16a673;
      --orange: #ed9b3a;
      --red: #dc5c69;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font: 15px/1.5 Inter, system-ui, sans-serif;
      color: var(--text);
      background: var(--bg);
    }

    .layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }

    aside {
      padding: 28px 18px;
      color: #cbd0ff;
      background: #20234b;
    }

    .brand {
      margin: 0 12px 42px;
      color: #fff;
      font-size: 21px;
      font-weight: 800;
    }

    nav a {
      display: block;
      margin: 6px 0;
      padding: 12px 14px;
      color: inherit;
      text-decoration: none;
      border-radius: 10px;
    }

    nav a.active, nav a:hover {
      color: #fff;
      background: #353a79;
    }

    main { padding: 32px; }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }

    h1, h2, p { margin-top: 0; }
    h1 { margin-bottom: 4px; font-size: 28px; }
    .subtitle { color: var(--muted); }

    button, select {
      padding: 10px 14px;
      color: var(--text);
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 8px;
      cursor: pointer;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-bottom: 22px;
    }

    .card, .metric {
      padding: 20px;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 4px 18px #24315b08;
    }

    .metric-label { color: var(--muted); }
    .metric-value {
      margin: 8px 0;
      font-size: 27px;
      font-weight: 800;
    }

    .trend { color: var(--green); font-size: 13px; }
    .trend.down { color: var(--red); }

    .charts {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 22px;
      margin-bottom: 22px;
    }

    .chart-card h2, .table-card h2 {
      margin-bottom: 18px;
      font-size: 17px;
    }

    .chart-wrap {
      position: relative;
      height: 280px;
    }

    .table-card { overflow-x: auto; }

    table {
      width: 100%;
      min-width: 650px;
      border-collapse: collapse;
    }

    th, td {
      padding: 15px 12px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .status {
      display: inline-block;
      padding: 4px 9px;
      font-size: 12px;
      border-radius: 999px;
    }

    .status.completed { color: #087b56; background: #dff7ed; }
    .status.pending { color: #9a6419; background: #fff0d7; }
    .status.cancelled { color: #a33e4a; background: #fde3e6; }

    @media (max-width: 1000px) {
      .layout { grid-template-columns: 1fr; }
      aside { display: none; }
      main { padding: 22px; }
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .charts { grid-template-columns: 1fr; }
    }

    @media (max-width: 560px) {
      .topbar { align-items: flex-start; flex-direction: column; }
      .metrics { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand">PulseBoard</div>
      <nav aria-label="Main navigation">
        <a class="active" href="#">Overview</a>
        <a href="#">Analytics</a>
        <a href="#">Customers</a>
        <a href="#">Transactions</a>
        <a href="#">Settings</a>
      </nav>
    </aside>

    <main>
      <header class="topbar">
        <div>
          <h1>Overview</h1>
          <p class="subtitle">Monitor your business performance.</p>
        </div>
        <select aria-label="Reporting period">
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This year</option>
        </select>
      </header>

      <section class="metrics" aria-label="Key metrics">
        <article class="metric">
          <div class="metric-label">Total Revenue</div>
          <div class="metric-value">$84,240</div>
          <div class="trend">↑ 12.8% vs previous period</div>
        </article>
        <article class="metric">
          <div class="metric-label">Orders</div>
          <div class="metric-value">2,481</div>
          <div class="trend">↑ 8.4% vs previous period</div>
        </article>
        <article class="metric">
          <div class="metric-label">Customers</div>
          <div class="metric-value">18,492</div>
          <div class="trend">↑ 5.2% vs previous period</div>
        </article>
        <article class="metric">
          <div class="metric-label">Refund Rate</div>
          <div class="metric-value">2.4%</div>
          <div class="trend down">↓ 0.6% vs previous period</div>
        </article>
      </section>

      <section class="charts">
        <article class="card chart-card">
          <h2>Revenue Overview</h2>
          <div class="chart-wrap"><canvas id="revenueChart"></canvas></div>
        </article>

        <article class="card chart-card">
          <h2>Traffic Sources</h2>
          <div class="chart-wrap"><canvas id="trafficChart"></canvas></div>
        </article>
      </section>

      <article class="card table-card">
        <h2>Recent Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Order ID</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Olivia Martin</td>
              <td>#ORD-1048</td>
              <td>Jul 14, 2026</td>
              <td>$420.00</td>
              <td><span class="status completed">Completed</span></td>
            </tr>
            <tr>
              <td>Liam Johnson</td>
              <td>#ORD-1047</td>
              <td>Jul 13, 2026</td>
              <td>$185.50</td>
              <td><span class="status pending">Pending</span></td>
            </tr>
            <tr>
              <td>Emma Williams</td>
              <td>#ORD-1046</td>
              <td>Jul 13, 2026</td>
              <td>$760.00</td>
              <td><span class="status completed">Completed</span></td>
            </tr>
            <tr>
              <td>Noah Brown</td>
              <td>#ORD-1045</td>
              <td>Jul 12, 2026</td>
              <td>$92.25</td>
              <td><span class="status cancelled">Cancelled</span></td>
            </tr>
          </tbody>
        </table>
      </article>
    </main>
  </div>

  <script>
    new Chart(document.getElementById("revenueChart"), {
      type: "line",
      data: {
        labels: ["Jun 15", "Jun 20", "Jun 25", "Jun 30", "Jul 5", "Jul 10", "Jul 14"],
        datasets: [{
          label: "Revenue",
          data: [9200, 11600, 10400, 14500, 13200, 17100, 18240],
          borderColor: "#5b5ce2",
          backgroundColor: "#5b5ce21a",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: "#edf0f6" } } }
      }
    });

    new Chart(document.getElementById("trafficChart"), {
      type: "doughnut",
      data: {
        labels: ["Organic", "Direct", "Social", "Referral"],
        datasets: [{
          data: [42, 28, 18, 12],
          backgroundColor: ["#5b5ce2", "#16a673", "#ed9b3a", "#dc5c69"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: { legend: { position: "bottom" } }
      }
    });
  </script>
</body>
</html>
```
