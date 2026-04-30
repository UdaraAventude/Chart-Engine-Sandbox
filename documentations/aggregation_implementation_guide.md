# Aggregation Selector — Implementation Guide

## Goal

Add an **Aggregation Method dropdown** (Avg, Sum, Min, Max, Count) to the drill-down toolbar. The selected method should change the `value` used by every chart type in real-time, without re-uploading or re-parsing the CSV.

---

## The Core Problem You Must Understand First

### Where does the current `value` come from?

Right now, `global-formatter/index.js` builds the tree **once on upload** and hard-codes:
```js
// buildTree() — line 200
value = sum_of_metric / groupRows.length   // ← always AVG
```

So every node in the tree has `node.value = avg(primaryMetric)` and `node.count = rowCount`.

### How do we support Sum, Min, Max without rebuilding the tree?

**Option A (Rebuild the tree on aggregation change):**
Re-run `buildTree` on the 200k row dataset every time the user switches the dropdown.
- ❌ Slow (100–500ms per re-build)
- ❌ Blocks the main thread → UI freezes

**Option B (Store ALL aggregations in the tree once):**
During the initial tree build, compute and store `avg`, `sum`, `min`, and `max` for every metric in every node. At render time, just read the right pre-computed value.
- ✅ Instant switching — zero re-computation
- ✅ Single tree build cost, amortized across all interaction
- ✅ No changes to the formatting/adapter layers beyond reading a different field

**We use Option B. This is the correct approach.**

---

## Architecture Change Overview

```
BEFORE (today):
  Tree node: { name, value (avg), count, children }
  All formatters read: node.value

AFTER (aggregation):
  Tree node: { name, count, aggs: { avg, sum, min, max }, children }
  Zustand: aggregation = 'avg'  ← selected by user
  All formatters read: node.aggs[aggregation]
```

---

## Phase 1: Enhance the Tree — `global-formatter/index.js`

### Step 1.1 — Replace `aggregateMetrics()` with `aggregateAllMethods()`

The current function only computes `avg`. We need to compute all four aggregations per metric.

**Find** `aggregateMetrics` (line 171) and **replace** with:

```js
// Computes all aggregation methods for each metric column
// Returns: { salary: { avg, sum, min, max, count }, age: { ... }, ... }
function aggregateAllMethods(rows, metrics) {
  const result = {};
  for (const m of metrics) {
    const vals = rows.map(r => parseFloat(r[m])).filter(v => !isNaN(v));
    if (!vals.length) {
      result[m] = { avg: 0, sum: 0, min: 0, max: 0, count: 0 };
      continue;
    }
    const sum = vals.reduce((s, v) => s + v, 0);
    let min = vals[0];
    let max = vals[0];
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] < min) min = vals[i];
      if (vals[i] > max) max = vals[i];
    }
    result[m] = {
      avg: parseFloat((sum / vals.length).toFixed(4)),
      sum: parseFloat(sum.toFixed(4)),
      min: parseFloat(min.toFixed(4)),
      max: parseFloat(max.toFixed(4)),
      count: vals.length,
    };
  }
  return result;
}
```

> **Why iterative loop for min/max?** Same reason as the histogram fix — `Math.min(...vals)` uses spread and will stack-overflow on 200k rows. Iterative loops are O(n) and safe at any scale.

### Step 1.2 — Update `buildTree()` to store `aggs` instead of `value`

**Find** `buildTree` (line 183) and update the returned node shape:

```js
function buildTree(rows, dimensions, metrics, depth = 0) {
  if (depth >= dimensions.length || !rows.length) return [];

  const col = dimensions[depth];
  const groups = new Map();

  for (const row of rows) {
    const key = String(row[col] ?? 'Unknown').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const primaryMetric = metrics[0];

  return Array.from(groups.entries()).map(([name, groupRows]) => {
    const children = buildTree(groupRows, dimensions, metrics, depth + 1);
    const aggs = aggregateAllMethods(groupRows, metrics);

    // 'value' is kept for backward compatibility —
    // adapters that haven't been updated yet will still read avg.
    const primaryAggs = primaryMetric ? aggs[primaryMetric] : null;
    const value = primaryAggs ? primaryAggs.avg : groupRows.length;

    return {
      name,
      value,              // ← legacy: still avg, safe fallback
      count: groupRows.length,
      aggs,               // ← NEW: full aggregation map
      children,
    };
  });
}
```

Also update the root node in `formatCSV()`:

```js
const rootAggs = aggregateAllMethods(finalRows, metrics);
const tree = {
  name: 'root',
  value: 0,
  count: rows.length,
  aggs: rootAggs,        // ← add this
  children: buildTree(finalRows, dimensions, metrics, 0),
};
```

> **Why keep `value`?** Backward compatibility. Some formatters (like scatter, correlation) still reference `node.value` or the raw rows directly. This ensures nothing breaks if you miss updating a formatter. The explicit `aggs` field is the primary source going forward.

---

## Phase 2: Add Aggregation to the Zustand Store

Add a new slice or extend the drill slice in `store/features/drill/index.js`:

```js
export const createDrillSlice = (set, get) => ({
  drillPath: [],
  chartTypeByDepth: {},
  aggregation: 'avg',    // ← NEW: global aggregation method

  // ... existing drillInto, drillBack, drillBackTo, resetDrill ...

  setChartTypeAtDepth: (depth, type) =>
    set((state) => ({
      chartTypeByDepth: { ...state.chartTypeByDepth, [depth]: type },
    })),

  setAggregation: (method) => set({ aggregation: method }), // ← NEW
});
```

> **Why a single global aggregation instead of per-depth?** Because "I want to see Sum" is a data question, not a visualization question. When the user says "show me Sum", they mean it at every level. Per-depth aggregation would create confusing inconsistencies in the breadcrumb (e.g., "you are viewing Sum at level 2 but Avg at level 1").

---

## Phase 3: Create an Aggregation Utility

Create a new file: `libs/drill-down/hooks/engine/aggregation.js`

This file centralises all aggregation-related logic so it can be imported by any formatter without duplication.

```js
// libs/drill-down/hooks/engine/aggregation.js

export const AGGREGATION_OPTIONS = [
  { value: 'avg',   label: 'Avg',   symbol: 'x̄' },
  { value: 'sum',   label: 'Sum',   symbol: 'Σ' },
  { value: 'min',   label: 'Min',   symbol: '↓' },
  { value: 'max',   label: 'Max',   symbol: '↑' },
  { value: 'count', label: 'Count', symbol: '#' },
];

/**
 * Reads the correct aggregated value for a given metric from a tree node.
 *
 * @param {object} node        - A tree node (must have node.aggs or node.count)
 * @param {string} metricCol   - The metric column name (e.g. 'salary')
 * @param {string} aggregation - One of: 'avg' | 'sum' | 'min' | 'max' | 'count'
 * @returns {number}
 */
export function resolveNodeValue(node, metricCol, aggregation) {
  if (!node) return 0;
  if (aggregation === 'count') return node.count ?? 0;

  // Prefer the new 'aggs' map (set by updated buildTree)
  if (node.aggs && node.aggs[metricCol]) {
    return node.aggs[metricCol][aggregation] ?? node.value ?? 0;
  }

  // Fallback to legacy 'value' (avg) for nodes built before the upgrade
  if (aggregation === 'avg') return node.value ?? 0;

  // If aggs not present and method != avg, we can't compute — return 0
  return 0;
}
```

> **Why a utility function?** Every formatter would otherwise have its own version of this `if/else` logic. By centralising it, changing how aggregation works (e.g., adding a `median` method) requires changing only one file.

---

## Phase 4: Update All Formatters

Every formatter that reads `node.value` or `c.value` must be updated to call `resolveNodeValue`.

### `formatters/standardFormatter.js`

```js
import { resolveNodeValue } from '../aggregation';

export function formatStandard(node, limit, aggregation = 'avg', primaryMetric = '') {
  if (!node) return [];

  const children = (node.children || []).map(c => ({
    name: c.name,
    value: resolveNodeValue(c, primaryMetric, aggregation),
    count: c.count,
  }));

  if (limit !== null && children.length > limit) {
    return children.sort((a, b) => b.value - a.value).slice(0, limit);
  }

  return children;
}
```

### `formatters/multilineFormatter.js`

```js
import { resolveNodeValue } from '../aggregation';

export function computeMultilineData(node, limit, aggregation = 'avg', primaryMetric = '') {
  // ... same structure ...

  const series = node.children.slice(0, limit).map(child => {
    const gcMap = {};
    (child.children || []).forEach(gc => {
      gcMap[gc.name] = resolveNodeValue(gc, primaryMetric, aggregation); // ← updated
    });
    const data = xAxisLabels.map(x => gcMap[x] ?? 0);
    return { name: child.name, data };
  });

  return { xAxisLabels, series };
}
```

### `formatters/heatmapFormatter.js`

```js
import { resolveNodeValue } from '../aggregation';

export function computeHeatmapData(node, limit, aggregation = 'avg', primaryMetric = '') {
  // ... xCategories, yCategories same ...

  node.children.slice(0, limit).forEach((child, xIndex) => {
    (child.children || []).forEach(gc => {
      const yIndex = yCategories.indexOf(gc.name);
      if (yIndex !== -1) {
        cells.push({
          x: xIndex,
          y: yIndex,
          value: resolveNodeValue(gc, primaryMetric, aggregation), // ← updated
          xLabel: child.name,
          yLabel: gc.name,
          count: gc.count,
        });
      }
    });
  });

  return { xCategories, yCategories, cells };
}
```

### `formatters/bubbleFormatter.js`

The bubble formatter currently works from raw rows (it re-filters from scratch). For Sum/Min/Max, the most accurate approach is to still use raw rows:

```js
export function formatBubble(node, rows, drillPath, metrics, dimensions, limit, filterRows, aggregation = 'avg') {
  // ... same setup ...

  return children.slice(0, limit).map(child => {
    const childRows = filtered.filter(...);
    const xs = childRows.map(r => Number(r[xCol]) || 0);
    const ys = childRows.map(r => Number(r[yCol]) || 0);

    // Compute x and y using the selected aggregation method
    function aggregate(arr) {
      if (!arr.length) return 0;
      if (aggregation === 'sum') return arr.reduce((a, b) => a + b, 0);
      if (aggregation === 'count') return arr.length;
      if (aggregation === 'min') return Math.min(...arr);
      if (aggregation === 'max') return Math.max(...arr);
      return arr.reduce((a, b) => a + b, 0) / arr.length; // avg default
    }

    return {
      name: child.name,
      x: aggregate(xs),
      y: aggregate(ys),
      size: xs.reduce((a, b) => a + b, 0),
      count: childRows.length,
    };
  });
}
```

### `formatters/index.js` (the registry)

Pass `aggregation` and `primaryMetric` through to every formatter:

```js
export function formatForChartRegistry(
  node, chartType, rows, drillPath,
  metrics, dimensions, limit, filterRowsFn,
  aggregation = 'avg'   // ← NEW parameter
) {
  const primaryMetric = metrics[0] ?? '';

  if (chartType === 'scatter') return formatScatter(rows, drillPath, metrics, filterRowsFn);
  if (chartType === 'bubble')  return formatBubble(node, rows, drillPath, metrics, dimensions, limit, filterRowsFn, aggregation);
  if (chartType === 'multiline') return computeMultilineData(node, limit, aggregation, primaryMetric);
  if (chartType === 'heatmap')   return computeHeatmapData(node, limit, aggregation, primaryMetric);
  if (chartType === 'correlation') return computeCorrelationData(rows, drillPath, metrics, filterRowsFn);
  // histogram uses raw rows, doesn't use aggregation

  return formatStandard(node, limit, aggregation, primaryMetric);
}
```

> **Why don't Scatter, Correlation, and Histogram use aggregation?**
> - **Scatter** — plots every raw individual row as a point. There is nothing to aggregate.
> - **Correlation** — computes Pearson correlation coefficients from raw rows. Adding aggregation would distort the statistical result.
> - **Histogram** — distributes raw values into frequency bins. Binning pre-aggregated values is statistically meaningless.

---

## Phase 5: Thread Aggregation Through the Engine Public API

Update `engine/index.js` to accept and pass the `aggregation` param:

```js
export function formatForChart(
  node, chartType, rows, drillPath,
  metrics, dimensions,
  limit = CHART_TOP_N,
  aggregation = 'avg'    // ← NEW
) {
  return formatForChartRegistry(
    node, chartType, rows, drillPath,
    metrics, dimensions, limit,
    filterRows,
    aggregation            // ← pass through
  );
}
```

---

## Phase 6: Update All Adapters

Each adapter must read `aggregation` from props and pass it to `formatForChart`.

### Example: `StandardAdapter.jsx`

```jsx
const data = useMemo(() => {
  return formatForChart(
    currentNode, chartType, rows, drillPath,
    metrics, dimensions, 50,
    aggregation    // ← pass through
  );
}, [currentNode, chartType, rows, drillPath, metrics, dimensions, aggregation]);
```

All adapters receive `aggregation` as a prop from `DrillDownRenderer`.

---

## Phase 7: Update `DrillDownRenderer`

### Read the new state:

```jsx
const aggregation      = useStore(s => s.aggregation);
const setAggregation   = useStore(s => s.setAggregation);
```

### Pass to adapters:

```jsx
<ChartAdapter
  ...sharedProps
  aggregation={aggregation}    // ← NEW prop
/>
```

### Add the Aggregation Dropdown to the toolbar:

Place this **before** the chart type dropdown in the `drill-toolbar` div:

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

  {/* Aggregation Selector */}
  <select
    value={aggregation}
    onChange={e => setAggregation(e.target.value)}
    style={{
      padding: '6px 10px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      background: '#f8fafc',
      fontSize: '13px',
      fontWeight: 600,
      color: '#334155',
      cursor: 'pointer',
    }}
  >
    {AGGREGATION_OPTIONS.map(o => (
      <option key={o.value} value={o.value}>
        {o.symbol} {o.label}
      </option>
    ))}
  </select>

  {/* Chart Type Selector — unchanged */}
  <select value={chartType} onChange={...}>
    ...
  </select>

</div>
```

Import `AGGREGATION_OPTIONS` from the new aggregation utility:
```js
import { AGGREGATION_OPTIONS } from '../../hooks/engine/aggregation';
```

---

## Phase 8: Handle Chart-Type Compatibility

Some chart types (Scatter, Correlation, Histogram) don't use aggregation. When those are selected, the aggregation dropdown should be visually disabled/grayed out with a tooltip to communicate why.

Add `supportsAggregation` to `chartOptions.jsx`:

```js
{ value: 'bar',         supportsAggregation: true  },
{ value: 'pie',         supportsAggregation: true  },
{ value: 'line',        supportsAggregation: true  },
{ value: 'scatter',     supportsAggregation: false }, // raw rows
{ value: 'bubble',      supportsAggregation: true  },
{ value: 'heatmap',     supportsAggregation: true  },
{ value: 'correlation', supportsAggregation: false }, // Pearson math
{ value: 'multiline',   supportsAggregation: true  },
{ value: 'histogram',   supportsAggregation: false }, // bin frequency
{ value: 'sunburst',    supportsAggregation: true  },
{ value: 'table',       supportsAggregation: false }, // shows raw rows
```

Then in the toolbar:
```jsx
const aggDisabled = !currentOption?.supportsAggregation;

<select
  value={aggregation}
  disabled={aggDisabled}
  title={aggDisabled ? `Aggregation is not applicable for ${currentOption?.label} charts` : ''}
  style={{
    opacity: aggDisabled ? 0.4 : 1,
    cursor: aggDisabled ? 'not-allowed' : 'pointer',
    ...
  }}
  onChange={e => setAggregation(e.target.value)}
>
```

---

## Summary: Full Change Checklist

| Step | File | Change |
|---|---|---|
| **1a** | `services/global-formatter/index.js` | Replace `aggregateMetrics()` with `aggregateAllMethods()` |
| **1b** | `services/global-formatter/index.js` | Update `buildTree()` to store `node.aggs` |
| **1c** | `services/global-formatter/index.js` | Add `aggs` to root node in `formatCSV()` |
| **2** | `store/features/drill/index.js` | Add `aggregation: 'avg'` state + `setAggregation()` action |
| **3** | `libs/drill-down/hooks/engine/aggregation.js` | **New file.** `AGGREGATION_OPTIONS` + `resolveNodeValue()` util |
| **4a** | `formatters/standardFormatter.js` | Accept `aggregation` param, use `resolveNodeValue` |
| **4b** | `formatters/multilineFormatter.js` | Accept `aggregation` param, use `resolveNodeValue` |
| **4c** | `formatters/heatmapFormatter.js` | Accept `aggregation` param, use `resolveNodeValue` |
| **4d** | `formatters/bubbleFormatter.js` | Accept `aggregation` param, inline aggregation switch |
| **4e** | `formatters/index.js` | Pass `aggregation` to all formatters |
| **5** | `hooks/engine/index.js` | Accept + pass `aggregation` in `formatForChart()` |
| **6** | All `chart-adapters/*.jsx` | Accept `aggregation` prop, pass to `formatForChart()` |
| **7** | `drill-down-renderer/index.jsx` | Read `aggregation`, `setAggregation` from store; add dropdown to toolbar; pass `aggregation` to all adapters |
| **8** | `constants/chartOptions.jsx` | Add `supportsAggregation` field; disable dropdown when false |

---

## Edge Cases to Handle

| Edge Case | How to Handle |
|---|---|
| Node built before `aggs` upgrade (old tree) | `resolveNodeValue()` falls back to `node.value` (avg) |
| No numeric metrics (`metrics = []`) | `resolveNodeValue()` returns `0` gracefully |
| `count` aggregation | Returns `node.count` directly — no metric column needed |
| User switches aggregation mid-drill-down | All levels instantly re-render because `aggregation` is global state → all `useMemo` dependencies update |
| `min`/`max` on a node built before the upgrade | Returns `0` with fallback. User should re-upload to rebuild tree with full `aggs` |
