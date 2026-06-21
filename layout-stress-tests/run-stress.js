const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --border: #e2e8f0;
    --foreground: #0f172a;
    --muted-foreground: #64748b;
    --card: #ffffff;
    --primary: #2563eb;
    --accent: #dc2626;
  }

  body {
    margin: 0;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f8fafc;
  }

  /* Card CSS matching ledgr-ui primitives */
  .card-lg {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    padding-bottom: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title-group svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .card-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--foreground);
    line-height: 1.2;
  }

  .card-subtitle {
    margin: 0;
    margin-top: 2px;
    font-size: 11px;
    color: var(--muted-foreground);
    line-height: 1.2;
  }

  .action-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Mock action controls */
  .legend-container {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .select-mock {
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #fff;
    min-width: 90px;
  }

  .segmented-mock {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    background: #f1f5f9;
  }

  .segmented-btn {
    font-size: 11px;
    padding: 4px 8px;
    border: none;
    background: transparent;
    cursor: pointer;
  }
  .segmented-btn.active {
    background: #fff;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
</style>
</head>
<body>

  <!-- Scenario 1: Income vs Expense with horizontal legend and Select dropdown -->
  <div class="card-lg" id="card-income-expense">
    <div class="card-header" id="header-income-expense">
      <div class="title-group" id="title-income-expense">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        <div>
          <h2 class="card-title">Income vs Expense</h2>
          <p class="card-subtitle">Period totals and the resulting net cashflow</p>
        </div>
      </div>
      <div class="action-wrapper" id="action-income-expense">
        <div class="legend-container">
          <div class="legend-item">
            <div class="legend-dot" style="background-color: var(--primary);"></div>
            <span>Income</span>
            <span style="font-weight: 500;">₹1,20,000.00</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background-color: var(--accent);"></div>
            <span>Expense</span>
            <span style="font-weight: 500;">₹80,000.00</span>
          </div>
        </div>
        <select class="select-mock"><option>Monthly</option></select>
      </div>
    </div>
    <div style="height: 100px; background: #f8fafc; border: 1px dashed var(--border); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--muted-foreground); font-size: 12px;">Donut Chart Area</div>
  </div>

  <!-- Scenario 2: Spending by Category with long title and Select dropdown -->
  <div class="card-lg" id="card-spending-category">
    <div class="card-header" id="header-spending-category">
      <div class="title-group" id="title-spending-category">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
        <div>
          <h2 class="card-title">Spending by Category (This Month)</h2>
          <p class="card-subtitle">Tap a slice to drill into its transactions</p>
        </div>
      </div>
      <div class="action-wrapper" id="action-spending-category">
        <!-- Legend list scrollable wrapper -->
        <div style="display: flex; gap: 8px; overflow-x: auto; max-width: 300px;">
          <div class="legend-item" style="padding: 2px 8px; border-radius: 4px; background: #f1f5f9;">
            <div class="legend-dot" style="background-color: var(--primary);"></div>
            <span>Food</span>
            <span style="font-weight: 500;">35%</span>
          </div>
          <div class="legend-item" style="padding: 2px 8px; border-radius: 4px; background: transparent;">
            <div class="legend-dot" style="background-color: var(--accent);"></div>
            <span>Rent</span>
            <span style="font-weight: 500;">25%</span>
          </div>
          <div class="legend-item" style="padding: 2px 8px; border-radius: 4px; background: transparent;">
            <div class="legend-dot" style="background-color: #eab308;"></div>
            <span>Bills</span>
            <span style="font-weight: 500;">20%</span>
          </div>
        </div>
        <select class="select-mock"><option>Monthly</option></select>
      </div>
    </div>
    <div style="height: 100px; background: #f8fafc; border: 1px dashed var(--border); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--muted-foreground); font-size: 12px;">Pie Chart Area</div>
  </div>

  <!-- Scenario 3: Budget Tracking with legend + segmented control -->
  <div class="card-lg" id="card-budget-tracking">
    <div class="card-header" id="header-budget-tracking">
      <div class="title-group" id="title-budget-tracking">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <div>
          <h2 class="card-title">Budget Tracking</h2>
          <p class="card-subtitle">Actual spent vs allocated limit</p>
        </div>
      </div>
      <div class="action-wrapper" id="action-budget-tracking">
        <div class="legend-container">
          <div class="legend-item">
            <div class="legend-dot" style="background-color: var(--primary);"></div>
            <span>Budget</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background-color: var(--accent);"></div>
            <span>Actual</span>
          </div>
        </div>
        <div class="segmented-mock">
          <button class="segmented-btn">D</button>
          <button class="segmented-btn">W</button>
          <button class="segmented-btn" class="active">M</button>
          <button class="segmented-btn">Y</button>
          <button class="segmented-btn">All</button>
        </div>
      </div>
    </div>
    <div style="height: 100px; background: #f8fafc; border: 1px dashed var(--border); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--muted-foreground); font-size: 12px;">Line Chart Area</div>
  </div>

</body>
</html>
`;

async function runTest() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const widths = [1200, 768, 480, 375, 320];
  const results = [];

  for (const width of widths) {
    await page.setViewport({ width, height: 800 });
    await page.setContent(HTML_CONTENT);

    const data = await page.evaluate((currentWidth) => {
      const scenarios = ['income-expense', 'spending-category', 'budget-tracking'];
      const scenarioResults = [];

      for (const id of scenarios) {
        const card = document.getElementById(`card-${id}`);
        const header = document.getElementById(`header-${id}`);
        const title = document.getElementById(`title-${id}`);
        const action = document.getElementById(`action-${id}`);

        if (!card || !header || !title || !action) continue;

        const cardRect = card.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        const actionRect = action.getBoundingClientRect();

        // 1. Check if title group and action wrap or overlap
        // Overlap condition: boxes intersect in 2D space
        const overlap = !(
          titleRect.right < actionRect.left ||
          titleRect.left > actionRect.right ||
          titleRect.bottom < actionRect.top ||
          titleRect.top > actionRect.bottom
        );

        // 2. Check if action overflows the card header boundary
        // Card has 24px padding on each side.
        // If action.right > cardRect.right - 24, it means it overflows the padding area.
        const actionOverflowsHeaderRight = actionRect.right > (cardRect.right - 24 + 1); // 1px tolerance

        // 3. Check if Title text wraps excessively or has squished text
        // Let's get the title element's height. The base line-height: 1.2 with 14px size is ~17px height.
        // If the h2 title wraps into multiple lines, its height will increase significantly.
        const titleTextEl = title.querySelector('.card-title');
        const titleTextRect = titleTextEl.getBoundingClientRect();
        const isTitleWrapped = titleTextRect.height > 18; // base line is ~17px

        // 4. Check alignment
        // Verify if action controls align parallel to the card header
        // i.e., vertical centering check: absolute diff of midpoints
        const headerMidY = headerRect.top + headerRect.height / 2;
        const actionMidY = actionRect.top + actionRect.height / 2;
        const titleMidY = titleRect.top + titleRect.height / 2;
        const verticalAlignDiff = Math.abs(actionMidY - titleMidY);

        scenarioResults.push({
          scenario: id,
          viewportWidth: currentWidth,
          cardWidth: cardRect.width,
          headerWidth: headerRect.width,
          titleRect: { left: titleRect.left, right: titleRect.right, width: titleRect.width, height: titleRect.height },
          actionRect: { left: actionRect.left, right: actionRect.right, width: actionRect.width, height: actionRect.height },
          overlap,
          actionOverflowsHeaderRight,
          isTitleWrapped,
          verticalAlignDiff,
          titleHeight: titleTextRect.height,
        });
      }

      return scenarioResults;
    }, width);

    results.push(...data);
  }

  await browser.close();

  // Print results
  console.log("=== CARD HEADER LAYOUT STRESS TEST RESULTS ===");
  console.log(JSON.stringify(results, null, 2));

  // Write results to JSON
  fs.writeFileSync(
    path.join(__dirname, 'stress-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Generate markdown report tables
  let md = "# Card Header Layout Stress Test Report\n\n";
  md += "This report summarizes the empirical layout, wrapping, and overlap checks executed on standardized Card components using headless browser automation.\n\n";
  
  for (const id of ['income-expense', 'spending-category', 'budget-tracking']) {
    md += `## Scenario: ${id}\n\n`;
    md += "| Viewport Width | Card Width | Header Width | Title Wrapped | Action Overflow | Overlap | Vertical Alignment Diff |\n";
    md += "| --- | --- | --- | --- | --- | --- | --- |\n";

    const scenarioRows = results.filter(r => r.scenario === id);
    for (const r of scenarioRows) {
      md += `| ${r.viewportWidth}px | ${r.cardWidth.toFixed(1)}px | ${r.headerWidth.toFixed(1)}px | ${r.isTitleWrapped ? '❌ YES (Wrapped)' : '✅ NO'} | ${r.actionOverflowsHeaderRight ? '❌ OVERFLOW' : '✅ OK'} | ${r.overlap ? '🚨 OVERLAPPING' : '✅ OK'} | ${r.verticalAlignDiff.toFixed(1)}px |\n`;
    }
    md += "\n";
  }

  fs.writeFileSync(path.join(__dirname, 'report.md'), md);
  console.log("Report saved to report.md");
}

runTest().catch(console.error);
