# Advanced Chart Types — Implementation Plan
## Chart-Engine-Sandbox · `frontend/src`

> **Role:** Senior Software Architect  
> **Scope:** Adding Bubble, Heatmap, Correlation, Multiline, Histogram to the drill-down engine  
> **Prerequisite:** Step 1 fixes (drillInto inheritance + handleChartTypeSelect reset) ✅

---

## Current Architecture (reference baseline)

```
ChartToolbar  ──onSelect──▶  DrillDownPage.handleChartTypeSelect
                                   │ resetDrill() + setChartTypeAtDepth(0, type)
                                   ▼
                            Zustand: chartTypeByDepth{ 0:'bar', 1:'pie', … }
                                   │
                                   ▼
                         DrillDownRenderer
                           chartType = chartTypeByDepth[drillPath.length] ?? 'bar'
                                   │
                   ┌───────────────┼──────────────────┐
                   ▼               ▼                  ▼
           formatForChart()   renderChart()     renderTable()
            engine/index.js    switch block      <table>
```

**Data shapes the engine already produces:**

| Chart | Format | Source |
|-------|--------|--------|
| Bar / Pie / Line | `[{ name, value, count }]` | `node.children` |
| Scatter | `{ rawData, xCol, yCol }` | `filterRows(rows, drillPath)` |
| Table | `[{ name, value, count }]` | `node.children` |

---

## New Chart Types — Data Contracts

### 🔵 Bubble Chart
```jsonc
// formatForChart output for chartType = 'bubble'
[
  { "name": "Engineering",  "x": 72000, "y": 4.1, "size": 1500, "count": 230 },
  { "name": "Marketing",    "x": 65000, "y": 3.8, "size": 420,  "count": 87  }
]
// x = avg(metrics[0]), y = avg(metrics[1]), size = sum(metrics[0])
// Source: node.children (each child must have multi-metric aggregates)
```
**Drill-down:** Clicking a bubble calls `handleClick(bubble.name)` → same as Bar.

---

### 🟥 Heatmap Chart
```jsonc
// formatForChart output for chartType = 'heatmap'
{
  "xCategories": ["Engineering", "Marketing", "Sales"],
  "yCategories": ["High", "Medium", "Low"],
  "cells": [
    { "x": 0, "y": 0, "xLabel": "Engineering", "yLabel": "High", "value": 84.2, "count": 45 }
  ]
}
// x = index in xCategories, y = index in yCategories
// xAxis = dimensions[drillPath.length]  (current level)
// yAxis = dimensions[drillPath.length + 1]  (next level, peek-ahead)
// value = avg(metrics[0]) aggregated over (xAxis × yAxis)
// Source: cross-tabulate filtered rows
```
**Drill-down:** Clicking a cell calls `drillInto(xLabel, currentColumn)` → drills on the X axis only.  
*(Drilling on both axes simultaneously would require multi-step drillInto — deferred to a future phase.)*

---

### 🟩 Correlation Chart
```jsonc
// formatForChart output for chartType = 'correlation'
{
  "columns": ["salary", "satisfaction_score", "years_at_company"],
  "matrix": [
    { "x": "salary",             "y": "salary",             "value": "1.00" },
    { "x": "salary",             "y": "satisfaction_score", "value": "0.34" },
    { "x": "satisfaction_score", "y": "salary",             "value": "0.34" }
  ]
}
// Source: filterRows(rows, drillPath) then Pearson correlation on all metrics pairs
```
**Drill-down:** ❌ No drill-down. Correlation is an **analytical view** only.  
The chart always reflects the current filtered state — drilling deeper via breadcrumb re-computes it.  
The click handler is a no-op.

---

### 🟦 Multiline Chart
```jsonc
// formatForChart output for chartType = 'multiline'
{
  "quarters": ["2021-Q1", "2021-Q2", "2022-Q1", "2022-Q2"],
  "series": [
    { "name": "Engineering", "data": [71000, 72500, 74000, 76000] },
    { "name": "Marketing",   "data": [63000, 64000, 65500, 66000] }
  ]
}
// quarters  = unique sorted values of timeColumn (auto-detected or first date-like col)
// series    = one line per child of currentNode
// data      = avg(metrics[0]) for that child × that quarter
// Source: filterRows(rows, drillPath) + cross-tab (child × quarter)
```
**Drill-down:** Clicking a line series name calls `handleClick(seriesName)` → same as Bar.

---

### 🟪 Histogram Chart
```jsonc
// formatForChart output for chartType = 'histogram'
{
  "labels": ["0–20k", "20k–40k", "40k–60k", "60k–80k", "80k–100k+"],
  "counts": [120, 340, 870, 530, 210],
  "columnName": "salary"
}
// columnName = metrics[0] (the first numeric column in the current view)
// bins       = 10 equal-width bins across min→max of that column in filtered rows
// Source: filterRows(rows, drillPath), bin metrics[0]
```
**Drill-down:** ❌ No drill-down on histogram bars (bins aren't categories).  
Click handler is a no-op. The histogram re-bins automatically when user navigates via breadcrumb.

---

## Implementation Steps

---

### Phase 1 — Toolbar: Add New Chart Type Buttons

**File:** `libs/drill-down/ui/chart-toolbar/index.jsx`

> [!NOTE]
> `drill-down-selector/index.jsx` already has a second DRILL_TYPES array and a second `DrillDownSelector` export — that file has a duplication bug (two `const DRILL_TYPES` and two `export default`). We should ignore this file for now and only update `chart-toolbar/index.jsx` which is what `DrillDownPage` actually uses.

**Add to `CHART_OPTIONS`:**
```js
import { BarChart3, PieChart, LineChart, ScatterChart,
         Table2, CircleDot, LayoutGrid, GitCommit, TrendingUp } from 'lucide-react';

const CHART_OPTIONS = [
  { value: 'bar',         label: 'Bar',         icon: <BarChart3 size={16} /> },
  { value: 'pie',         label: 'Pie',         icon: <PieChart size={16} /> },
  { value: 'line',        label: 'Line',        icon: <LineChart size={16} /> },
  { value: 'scatter',     label: 'Scatter',     icon: <ScatterChart size={16} /> },
  { value: 'bubble',      label: 'Bubble',      icon: <CircleDot size={16} /> },       // NEW
  { value: 'heatmap',     label: 'Heatmap',     icon: <LayoutGrid size={16} /> },      // NEW
  { value: 'correlation', label: 'Correlation', icon: <GitCommit size={16} /> },       // NEW
  { value: 'multiline',   label: 'Multi-Line',  icon: <TrendingUp size={16} /> },      // NEW
  { value: 'histogram',   label: 'Histogram',   icon: <BarChart3 size={16} /> },       // NEW
  { value: 'table',       label: 'Table',       icon: <Table2 size={16} /> },
];
```

**Checklist:**
- [ ] Update `CHART_OPTIONS` array in `chart-toolbar/index.jsx`
- [ ] Import new Lucide icons
- [ ] Verify pill buttons render correctly (no CSS overflow)

---

### Phase 2 — Engine: Expand `formatForChart`

**File:** `libs/drill-down/hooks/engine/index.js`

This is the most critical change. Add a new branch per chart type.

```js
export function formatForChart(node, chartType, rows, drillPath, metrics, dimensions, limit = 50) {
  if (!node) return [];

  // ── existing ──────────────────────────────────────
  if (chartType === 'scatter') { ... }

  // ── NEW: bubble ───────────────────────────────────
  if (chartType === 'bubble') {
    return formatBubble(node, rows, drillPath, metrics, limit);
  }

  // ── NEW: heatmap ──────────────────────────────────
  if (chartType === 'heatmap') {
    return formatHeatmap(rows, drillPath, dimensions, metrics);
  }

  // ── NEW: correlation ──────────────────────────────
  if (chartType === 'correlation') {
    return formatCorrelation(rows, drillPath, metrics);
  }

  // ── NEW: multiline ────────────────────────────────
  if (chartType === 'multiline') {
    return formatMultiline(node, rows, drillPath, metrics, dimensions, limit);
  }

  // ── NEW: histogram ────────────────────────────────
  if (chartType === 'histogram') {
    return formatHistogram(rows, drillPath, metrics);
  }

  // ── existing: bar / pie / line / table ────────────
  const children = (node.children || []).map(c => ({ name: c.name, value: c.value, count: c.count }));
  if (limit !== null && children.length > limit) {
    return children.sort((a, b) => b.value - a.value).slice(0, limit);
  }
  return children;
}
```

**New helper functions to add inside engine/index.js:**

```js
// ── Bubble: avg x, avg y, sum size per child ──────
function formatBubble(node, rows, drillPath, metrics, limit) {
  const xCol = metrics[0] ?? '';
  const yCol = metrics[1] ?? metrics[0] ?? '';
  const children = node.children || [];
  const filtered = filterRows(rows, drillPath);

  return children.slice(0, limit).map(child => {
    const childRows = filtered.filter(r => String(r[child.column] ?? '') === child.name);
    const xs = childRows.map(r => Number(r[xCol]) || 0);
    const ys = childRows.map(r => Number(r[yCol]) || 0);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      name: child.name,
      x: avg(xs),
      y: avg(ys),
      size: xs.reduce((a, b) => a + b, 0),
      count: childRows.length,
    };
  });
}

// ── Heatmap: cross-tab currentDim × nextDim ───────
function formatHeatmap(rows, drillPath, dimensions, metrics) {
  const xDim = dimensions[drillPath.length] ?? '';
  const yDim = dimensions[drillPath.length + 1] ?? dimensions[0] ?? '';
  const valueCol = metrics[0] ?? '';
  const filtered = filterRows(rows, drillPath);

  const xCats = [...new Set(filtered.map(r => String(r[xDim] ?? '')))].sort();
  const yCats = [...new Set(filtered.map(r => String(r[yDim] ?? '')))].sort();

  const cells = [];
  xCats.forEach((xLabel, xi) => {
    yCats.forEach((yLabel, yi) => {
      const group = filtered.filter(r =>
        String(r[xDim] ?? '') === xLabel && String(r[yDim] ?? '') === yLabel
      );
      if (!group.length) return;
      const avg = group.reduce((s, r) => s + (Number(r[valueCol]) || 0), 0) / group.length;
      cells.push({ x: xi, y: yi, xLabel, yLabel, value: avg, count: group.length });
    });
  });

  return { xCategories: xCats, yCategories: yCats, cells };
}

// ── Correlation: Pearson matrix on filtered rows ──
function formatCorrelation(rows, drillPath, metrics) {
  const filtered = filterRows(rows, drillPath);
  const cols = metrics.filter(m => filtered.some(r => !isNaN(Number(r[m]))));
  const mean = col => filtered.reduce((s, r) => s + (Number(r[col]) || 0), 0) / filtered.length;
  const pearson = (a, b) => {
    const ma = mean(a), mb = mean(b);
    let num = 0, da = 0, db = 0;
    filtered.forEach(r => {
      const da_ = (Number(r[a]) || 0) - ma;
      const db_ = (Number(r[b]) || 0) - mb;
      num += da_ * db_; da += da_ * da_; db += db_ * db_;
    });
    return da && db ? +(num / Math.sqrt(da * db)).toFixed(2) : 0;
  };
  const matrix = [];
  cols.forEach(a => cols.forEach(b => matrix.push({ x: a, y: b, value: pearson(a, b) })));
  return { columns: cols, matrix };
}

// ── Multiline: series per child across time col ───
function formatMultiline(node, rows, drillPath, metrics, dimensions, limit) {
  const currentDim = dimensions[drillPath.length] ?? '';
  // Auto-detect a time/sequence column (contains 'year', 'quarter', 'date', 'month', 'week')
  const allCols = rows.length ? Object.keys(rows[0]) : [];
  const timeKeywords = ['year', 'quarter', 'date', 'month', 'week', 'period', 'time'];
  const timeCol = allCols.find(c =>
    timeKeywords.some(kw => c.toLowerCase().includes(kw)) && c !== currentDim
  ) ?? allCols.find(c => c !== currentDim && c !== metrics[0]) ?? '';

  const valueCol = metrics[0] ?? '';
  const filtered = filterRows(rows, drillPath);
  const quarters = [...new Set(filtered.map(r => String(r[timeCol] ?? '')))].sort();
  const children = (node.children || []).slice(0, limit);

  const series = children.map(child => {
    const childRows = filtered.filter(r => String(r[currentDim] ?? '') === child.name);
    const data = quarters.map(q => {
      const qRows = childRows.filter(r => String(r[timeCol] ?? '') === q);
      const avg = qRows.length
        ? qRows.reduce((s, r) => s + (Number(r[valueCol]) || 0), 0) / qRows.length
        : null;
      return avg !== null ? +avg.toFixed(2) : null;
    });
    return { name: child.name, data };
  });

  return { quarters, series };
}

// ── Histogram: bin metrics[0] into N buckets ──────
function formatHistogram(rows, drillPath, metrics) {
  const valueCol = metrics[0] ?? '';
  const filtered = filterRows(rows, drillPath);
  const values = filtered.map(r => Number(r[valueCol])).filter(v => !isNaN(v));
  if (!values.length) return { labels: [], counts: [], columnName: valueCol };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const BINS = 10;
  const step = (max - min) / BINS || 1;

  const counts = Array(BINS).fill(0);
  values.forEach(v => {
    const i = Math.min(Math.floor((v - min) / step), BINS - 1);
    counts[i]++;
  });

  const fmt = n => n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));
  const labels = Array.from({ length: BINS }, (_, i) =>
    `${fmt(min + i * step)}–${fmt(min + (i + 1) * step)}`
  );

  return { labels, counts, columnName: valueCol };
}
```

**Checklist:**
- [ ] Add `dimensions` parameter to `formatForChart` signature
- [ ] Add all 5 helper functions
- [ ] Export `formatForChart` with new signature

> [!IMPORTANT]
> `formatForChart` currently does NOT receive `dimensions`. The call sites in `DrillDownRenderer` must be updated to pass `dimensions` as a 6th argument.

---

### Phase 3 — Renderer: Add Switch Cases

**File:** `libs/drill-down/ui/drill-down-renderer/index.jsx`

**Add imports at top:**
```js
import BubbleChart      from '../../../../components/bubble-chart';
import HeatmapChart     from '../../../../components/heatmap-chart';
import CorrelationChart from '../../../../components/correlation-chart';
import MultilineChart   from '../../../../components/multiline-chart';
import HistogramChart   from '../../../../components/histogram-chart';
```

**Update `formatForChart` call site to pass `dimensions`:**
```js
// Every call to formatForChart needs the extra arg:
formatForChart(currentNode, chartType, rows, drillPath, metrics, dimensions)
```

**Add to `renderChart()` switch:**
```js
if (chartType === 'bubble') {
  const bubbleData = formatForChart(currentNode, 'bubble', rows, drillPath, metrics, dimensions);
  return (
    <BubbleChart
      data={bubbleData}
      xCol={metrics[0]}
      yCol={metrics[1] ?? metrics[0]}
      sizeCol={metrics[0]}
      title={title}
      isLeaf={atLeaf}
      height='100%'
      onBubbleClick={handleClick}     // same as bar
      onChartReady={onChartReady}
    />
  );
}

if (chartType === 'heatmap') {
  const { xCategories, yCategories, cells } = formatForChart(
    currentNode, 'heatmap', rows, drillPath, metrics, dimensions
  );
  return (
    <HeatmapChart
      xCategories={xCategories}
      yCategories={yCategories}
      cells={cells}
      xCol={dimensions[drillPath.length]}
      yCol={dimensions[drillPath.length + 1]}
      measureCol={metrics[0]}
      title={title}
      isLeaf={atLeaf}
      height='100%'
      onCellClick={(xi, cell) => handleClick(cell?.xLabel)}  // drill on X axis
      onChartReady={onChartReady}
    />
  );
}

if (chartType === 'correlation') {
  const { columns, matrix } = formatForChart(
    currentNode, 'correlation', rows, drillPath, metrics, dimensions
  );
  return (
    <CorrelationChart
      columns={columns}
      matrix={matrix}
      title={title}
      height='100%'
      // no onCellClick — correlation is read-only
      onChartReady={onChartReady}
    />
  );
}

if (chartType === 'multiline') {
  const { quarters, series } = formatForChart(
    currentNode, 'multiline', rows, drillPath, metrics, dimensions
  );
  return (
    <MultilineChart
      quarters={quarters}
      series={series}
      title={title}
      yAxisLabel={yLabel}
      height='100%'
      onSeriesClick={handleClick}    // clicking a line drills into that group
      onChartReady={onChartReady}
    />
  );
}

if (chartType === 'histogram') {
  const { labels, counts, columnName } = formatForChart(
    currentNode, 'histogram', rows, drillPath, metrics, dimensions
  );
  return (
    <HistogramChart
      labels={labels}
      counts={counts}
      columnName={columnName}
      title={title}
      height='100%'
      // no onBarClick — histogram bars are bins, not categories
      onChartReady={onChartReady}
    />
  );
}
```

**Also update the inner dropdown** (the `<select>` inside `DrillDownRenderer`) to include the new types:
```js
const CHART_OPTIONS = [
  { value: 'bar',         label: 'Bar'         },
  { value: 'pie',         label: 'Pie'         },
  { value: 'line',        label: 'Line'        },
  { value: 'scatter',     label: 'Scatter'     },
  { value: 'bubble',      label: 'Bubble'      },
  { value: 'heatmap',     label: 'Heatmap'     },
  { value: 'correlation', label: 'Correlation' },
  { value: 'multiline',   label: 'Multi-Line'  },
  { value: 'histogram',   label: 'Histogram'   },
  { value: 'table',       label: 'Table'       },
];
```

**Checklist:**
- [ ] Import 5 new chart components
- [ ] Update all `formatForChart()` calls to pass `dimensions`
- [ ] Add 5 new `if (chartType === ...)` blocks in `renderChart()`
- [ ] Update `CHART_OPTIONS` array in renderer

---

### Phase 4 — Drill Interaction Summary Table

| Chart Type | Drill-down on click? | Click triggers | Notes |
|------------|----------------------|----------------|-------|
| Bar | ✅ Yes | `drillInto(name)` | Original behavior |
| Pie | ✅ Yes | `drillInto(name)` | Click slice |
| Line | ✅ Yes | `drillInto(name)` | Click point |
| Scatter | ❌ No | — | Raw rows, no groups |
| **Bubble** | ✅ Yes | `drillInto(name)` | Click bubble → drill |
| **Heatmap** | ✅ Partial | `drillInto(xLabel)` | Drill on X axis only |
| **Correlation** | ❌ No | — | Analytical view only |
| **Multiline** | ✅ Yes | `drillInto(seriesName)` | Click line → drill |
| **Histogram** | ❌ No | — | Bins ≠ categories |
| Table | ❌ No | — | Read-only grid |

---

### Phase 5 — Testing Checklist

- [ ] Bar → Bubble → switch back to Bar (breadcrumb navigation works)
- [ ] Bubble chart renders at depth 0 and depth 1
- [ ] Heatmap renders cross-tab with correct xCategories / yCategories
- [ ] Clicking a heatmap cell drills on X axis dimension
- [ ] Correlation shows all metric columns; re-computes on depth change
- [ ] Multiline: auto-detects time column; one line per child group
- [ ] Histogram: bins `metrics[0]`; no crash if column missing
- [ ] All new types appear in the top pill toolbar AND the inner `<select>`
- [ ] Switching chart type at depth > 0 resets to depth 0 (existing fix)
- [ ] `drillInto` inherits chart type to child depth (existing fix)

---

## Known Issues / Tech Debt

> [!WARNING]
> `drill-down-selector/index.jsx` currently has **two `const DRILL_TYPES`** and **two `export default DrillDownSelector`** declarations — this is a dead-code duplicate that will cause a runtime error if that file is ever imported. It is not currently used by `DrillDownPage` (which uses `chart-toolbar` instead). Should be cleaned up in a separate PR.

> [!NOTE]
> `BubbleChart` component props use `data` (array of `{name,x,y,size,count}`), not the original `xCol/yCol` scatter format. Verify the component accepts this shape before wiring.

---

## Step 2 Preview — Dynamic Drill-Down Depth

> *(To be discussed after Step 1 implementation is verified)*

**Current problem:** `drillBack` / `drillBackTo` clean up `chartTypeByDepth` but the max depth is implicitly `dimensions.length`. The tree built by the backend may not have children all the way down, and the UI doesn't communicate when you've hit a leaf.

**Solution approach:**
1. `isLeaf(currentNode)` already exists in `engine/index.js` — use it to **disable** drill-down clicks when `atLeaf === true`
2. The `handleClick` in `DrillDownRenderer` already guards: `if (!atLeaf && name && currentColumn) drillInto(...)` ✅
3. The issue is the **toolbar pill** doesn't visually communicate "you're at a leaf — no more levels"
4. Improvement: show a `"Leaf — no more levels"` badge in the breadcrumb when `atLeaf && drillPath.length > 0`
5. For truly dynamic depth: depth = `dimensions.length` from the server response — this is already the real max since `currentColumn = dimensions[drillPath.length]` returns `''` at the bottom, which prevents `drillInto` from firing
