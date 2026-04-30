# Chart Engine Sandbox — Complete Architecture & Implementation Guide

> **Purpose:** This document is the single source of truth for understanding how the Chart Engine Sandbox works end-to-end, and how to implement any new chart type (using Sunburst as the worked example).

---

## Table of Contents

1. [Big Picture: What This System Does](#1-big-picture)
2. [Architecture: The Three Layers](#2-architecture-the-three-layers)
3. [Complete File Directory & Responsibilities](#3-file-directory)
4. [End-to-End Data Flow: From CSV Upload to Rendered Chart](#4-end-to-end-data-flow)
5. [The Drill-Down State Machine](#5-the-drill-down-state-machine)
6. [The Chart Registry Pattern (Why & How)](#6-the-chart-registry-pattern)
7. [Implementing a New Chart: Sunburst (Step-by-Step)](#7-implementing-sunburst)

---

## 1. Big Picture

The Chart Engine Sandbox is a **browser-only, CSV-powered hierarchical analytics engine**. There is no backend database — all processing happens 100% in the browser using JavaScript.

### What it does, exactly:
1. User uploads a CSV file.
2. The engine automatically **classifies** every column as either a *dimension* (categorical) or a *metric* (numeric).
3. It **builds a pre-aggregated hierarchical tree** where each node holds the groups at one level (e.g., Gender → Education Level → Employment Type → Country).
4. The user **visualizes and drills through** this tree interactively by clicking on chart elements. Each click narrows the view to just that segment's data.

### Why browser-only?
In a real product, this would involve a server-side query engine. For a sandbox, doing everything in-browser lets us rapidly prototype, validate data models, and measure rendering performance without infrastructure overhead.

---

## 2. Architecture: The Three Layers

The system follows a clean **3-layer architecture** inspired by the Adapter/Strategy pattern:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: DATA PIPELINE (services/global-formatter)         │
│  CSV → column classification → tree build → globalData      │
└────────────────────────┬────────────────────────────────────┘
                         │ produces globalData (tree, rows, dims, metrics)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: STATE MACHINE (store/features/drill)              │
│  drillPath, chartTypeByDepth, drillInto, drillBackTo        │
└────────────────────────┬────────────────────────────────────┘
                         │ drives
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: RENDERING PIPELINE                                │
│                                                             │
│  DrillDownRenderer                                          │
│    → reads state → computes availableDepth                  │
│    → looks up CHART_ADAPTERS[chartType]                     │
│    → passes { currentNode, rows, drillPath, ... }           │
│         ↓                                                   │
│    ChartAdapter (e.g. BarAdapter, HeatmapAdapter)           │
│    → calls formatForChart() (engine)                        │
│    → passes formatted props to the ECharts UI Component     │
│         ↓                                                   │
│    PureChart Component (e.g. BarChart, HeatmapChart)        │
│    → renders ECharts option → fires click → handleClick()   │
└─────────────────────────────────────────────────────────────┘
```

**Why three layers?** Each layer has one job:
- Layer 1 never knows about React or charts.
- Layer 2 never knows about data structures or chart rendering.
- Layer 3 never knows about CSV parsing or state management.

Keeping them separate means you can swap any component without breaking the others.

---

## 3. File Directory & Responsibilities

### `services/global-formatter/index.js`
**The Data Pipeline Engine.** This is the most important non-UI file.

| Function | Job |
|---|---|
| `preprocessDates()` | Detects date columns via regex and buckets them to `YYYY-MM` strings |
| `detectColumns()` | Classifies each column: **metric** (≥80% numeric, high-cardinality) or **dimension** (categorical, 2–500 unique values) |
| `applyFallbackBucketing()` | If no dimensions found, buckets high-cardinality columns to Top-N + "Other" |
| `buildTree()` | **Recursively** groups rows by each dimension in order, computing `value` (avg of primary metric), `count` (rows), and `children` |
| `formatCSV(rows)` | **Public export.** Orchestrates all phases. Returns `{ tree, dimensions, metrics, rows, rejected }` |

### `store/features/drill/index.js`
**The Drill-Down State Machine.** Uses Zustand.

| State / Action | Job |
|---|---|
| `drillPath: []` | Array of `{ column, value }` objects representing where we are in the hierarchy |
| `chartTypeByDepth: {}` | Map of `{ depth: chartType }` — which chart to use at each level |
| `drillInto(name, column)` | Pushes a new step onto drillPath and inherits the parent's chart type for the child level |
| `drillBack()` | Pops the last step off drillPath |
| `drillBackTo(depth)` | Jumps back to any ancestor (used by breadcrumb clicks) |
| `setChartTypeAtDepth(depth, type)` | Called when user changes the dropdown to switch the chart at the current level |

### `libs/drill-down/constants/chartOptions.jsx`
**The Chart Type Registry Config.** Single source of truth for all chart metadata.

Every chart type declares:
```js
{
  value: 'heatmap',          // Internal key used everywhere in the system
  label: 'Heatmap',         // Displayed in UI
  icon: <LayoutGrid />,     // Lucide icon for toolbar + dropdown
  canDrill: true,           // Whether clicking an element triggers drillInto()
  minRemainingDepth: 2,     // How many more dimension levels are needed to render
}
```

> **Why `minRemainingDepth`?** It's declarative. The renderer simply checks `option.minRemainingDepth <= availableDepth` to decide if an option is valid. Adding a new chart never requires touching the renderer's filtering logic.

### `libs/drill-down/hooks/engine/index.js`
**The Engine Public API.** A thin routing layer.

| Export | Job |
|---|---|
| `getNodeAtPath(tree, drillPath)` | Traverses the pre-built tree following drillPath to find the current node |
| `isLeaf(node)` | Returns `true` if node has no children |
| `filterRows(rows, drillPath)` | Filters raw CSV rows to match the current drillPath (handles both categorical steps and `__hist__` bin steps) |
| `formatForChart(node, chartType, ...)` | Delegates to the formatter registry. Returns chart-ready data |
| `computeHistogramBins` | Re-exported from histogramFormatter for direct use |

### `libs/drill-down/hooks/engine/formatters/`
**The Data Formatters.** One file per chart type that has non-trivial math.

| File | What it produces |
|---|---|
| `standardFormatter.js` | `[{ name, value, count }]` — used by Bar, Line, Pie |
| `bubbleFormatter.js` | `[{ name, x, y, size, count }]` — 2D with size |
| `multilineFormatter.js` | `{ xAxisLabels[], series[{ name, data[] }] }` — cross-dimension series |
| `heatmapFormatter.js` | `{ xCategories[], yCategories[], cells[{x,y,value,...}] }` — matrix |
| `histogramFormatter.js` | `{ labels[], counts[], binRows[][], min, max, binSize }` — frequency bins |
| `correlationFormatter.js` | `{ columns[], matrix[{x,y,value}] }` — Pearson `r` for all metric pairs |
| `scatterFormatter.js` | `{ rawData[], xCol, yCol }` — raw filtered rows |
| `index.js` | **Registry router.** Routes `formatForChart(node, chartType, ...)` calls to the right formatter |

### `libs/drill-down/ui/chart-adapters/`
**The Adapters (Bridges).** One adapter per chart type.

Each adapter's job is to:
1. Call `formatForChart()` with the right `chartType`.
2. Handle the empty state (e.g., "Not enough depth").
3. Translate click events into `handleClick(name)` calls.
4. Pass correctly named props to the pure UI component.

| File | Bridges to |
|---|---|
| `StandardAdapter.jsx` | `BarChart`, `PieChart`, `LineChart` |
| `BubbleAdapter.jsx` | `BubbleChart` |
| `ScatterAdapter.jsx` | `ScatterChart` |
| `HeatmapAdapter.jsx` | `HeatmapChart` |
| `MultilineAdapter.jsx` | `MultilineChart` |
| `HistogramAdapter.jsx` | `HistogramChart` |
| `CorrelationAdapter.jsx` | `CorrelationChart` |
| `index.js` | Barrel exports all adapters |

### `libs/drill-down/ui/drill-down-renderer/index.jsx`
**The Orchestrator.** The only component that knows about both state and rendering.

Its jobs:
1. Subscribe to the Zustand store (drillPath, chartTypeByDepth, globalData).
2. Compute `availableDepth = dimensions.length - categoricalDepth`.
3. Filter chart options: `availableOptions = DRILL_CHART_OPTIONS.filter(o => o.minRemainingDepth <= availableDepth)`.
4. Look up `CHART_ADAPTERS[chartType]` and render it with shared props.
5. Render the toolbar (badge + dropdown) and breadcrumb.

### `components/<chart-name>/index.jsx`
**Pure Presentation Components.** They only know about ECharts.
- Receive formatted data as props.
- Produce an ECharts `option` object inside `useMemo`.
- Fire callbacks (`onBarClick`, `onNodeClick`, etc.) when user interacts.
- Know nothing about drill state, Redux, tree traversal, or CSV.

---

## 4. End-to-End Data Flow

### Step 1: User Uploads CSV

**File:** `components/upload-csv/index.jsx`

The `<UploadCSV>` component reads the file via `FileReader`, uses `Papa.parse()` to convert it to an array of row objects, then calls:
```js
store.setGlobalData(formatCSV(rows));
```

### Step 2: Global Formatter Runs (in-browser)

**File:** `services/global-formatter/index.js`, line 221: `formatCSV()`

**Phase 1 — Date bucketing (`preprocessDates`, line 40):**
Samples the first 500 rows. If ≥60% of values in a column look like dates, it converts every value to `YYYY-MM` string format. This makes date columns useful as dimensions.

**Phase 2 — Column classification (`detectColumns`, line 74):**
- If ≥80% numeric AND unique count ≤ 25 → **dimension** (e.g., rating: 1–5)
- If ≥80% numeric AND unique count > 25 → **metric** (e.g., salary)
- If mostly text AND 2–500 unique values → **dimension** (e.g., gender, country)
- Dimensions are sorted by cardinality (fewest unique values first = outermost ring).
- A maximum of 4 dimensions are kept (`MAX_HIERARCHY_DEPTH = 4`).

**Phase 3 — Tree build (`buildTree`, line 183):**
Recursively groups rows by `dimensions[depth]`, computing for each group:
- `name`: the unique value of that group (e.g., "Male")
- `value`: avg of the primary metric across all rows in the group
- `count`: number of raw rows in the group
- `children`: the result of recursing into the next dimension

**Output stored in Zustand:**
```js
{
  tree: { name: 'root', count: 200000, children: [...] },
  dimensions: ['gender', 'education_level', 'employment_type', 'country'],
  metrics: ['age', 'salary', 'satisfaction_score'],
  rows: [...rawCSVRows],   // kept in memory for scatter, histogram, correlation
  rejected: [...]
}
```

### Step 3: DrillDownRenderer Computes State

**File:** `libs/drill-down/ui/drill-down-renderer/index.jsx`

On mount and on every state change:
```js
// Line 63: traverse the tree to the current drill position
const currentNode = getNodeAtPath(tree, drillPath);

// Line 68: how many categorical dimensions have been consumed
const categoricalDepth = drillPath.filter(s => !s.column.startsWith('__hist__')).length;

// Line 71: how many dimension levels remain for further drill
const availableDepth = dimensions.length - categoricalDepth;
```

### Step 4: Chart Adapter Is Resolved

```js
// CHART_ADAPTERS registry lookup (line ~20)
const ChartAdapter = CHART_ADAPTERS[chartType]; // e.g., HeatmapAdapter

// Adapter is rendered with shared props
<ChartAdapter
  currentNode={currentNode}
  rows={rows}
  drillPath={drillPath}
  metrics={metrics}
  dimensions={dimensions}
  currentColumn={currentColumn}
  categoricalDepth={categoricalDepth}
  atLeaf={atLeaf}
  handleClick={handleClick}
  onChartReady={onChartReady}
/>
```

### Step 5: Adapter Calls Formatter

**Example: `HeatmapAdapter.jsx`**
```js
const heatData = useMemo(() => {
  return formatForChart(currentNode, 'heatmap', rows, drillPath, metrics, dimensions);
}, [currentNode, rows, drillPath, metrics, dimensions]);
```

The formatter (`heatmapFormatter.js`) runs:
1. Takes `currentNode.children` → X-axis categories.
2. Gathers all unique grandchildren (children's children) → Y-axis categories.
3. Builds the `cells[]` matrix of `{ x, y, value, xLabel, yLabel }`.

### Step 6: Pure Chart Renders via ECharts

The UI component receives clean, chart-ready props and builds the ECharts `option` object inside `useMemo`. ECharts takes care of all the SVG/Canvas rendering.

### Step 7: User Clicks → Drill Down

User clicks "Male" bar in the Bar chart:
```js
// StandardAdapter click handler
onBarClick={handleClick}   // handleClick is passed from DrillDownRenderer

// handleClick in DrillDownRenderer (line ~90):
const handleClick = useCallback((name) => {
  if (!atLeaf && name && currentColumn) drillInto(name, currentColumn);
}, [atLeaf, currentColumn, drillInto]);

// drillInto in store (drill/index.js line 5):
drillInto: (childName, column) =>
  set((state) => ({
    drillPath: [...state.drillPath, { column, value: childName }],
    chartTypeByDepth: { ...state.chartTypeByDepth, [depth+1]: parentType },
  }))
```

Zustand state updates → React re-renders → `DrillDownRenderer` re-reads state → `getNodeAtPath` traverses tree to the "Male" node → new chart renders.

---

## 5. The Drill-Down State Machine

```
State: drillPath = []
       chartTypeByDepth = { 0: 'bar' }

User clicks "Male" bar
  → drillInto("Male", "gender")
  → drillPath = [{ column: "gender", value: "Male" }]
  → chartTypeByDepth = { 0: 'bar', 1: 'bar' }  ← inherits parent

User changes dropdown to "Pie" at depth 1
  → setChartTypeAtDepth(1, 'pie')
  → chartTypeByDepth = { 0: 'bar', 1: 'pie' }

User clicks breadcrumb "All Data"
  → drillBackTo(0)
  → drillPath = []
  → chartTypeByDepth = { 0: 'bar' }  ← depth 1 is cleaned up
```

**Key design principle:** Each depth level has its own persistent chart type. If you drill back up and then drill into "Female" instead, you'll get the exact same chart types you configured per level. The types are remembered per depth slot.

### Histogram Drill-Down (Special Case)

Histogram introduces the `__hist__` sentinel pattern. Because a histogram bin is a **numeric range filter**, not a categorical dimension, drilling into a histogram bin should NOT advance the `categoricalDepth` counter.

```js
// When user clicks bin "50k – 60k":
drillInto("50k – 60k", "__hist__salary")
// drillPath = [{ column: "__hist__salary", value: "50k – 60k" }]

// getNodeAtPath SKIPS __hist__ steps (line 10 in engine/index.js):
if (step.column.startsWith('__hist__')) continue;

// filterRows handles __hist__ steps by range-parsing (line 26):
if (step.column.startsWith('__hist__')) {
  const metricCol = step.column.slice('__hist__'.length); // "salary"
  const range = parseHistBinRange(step.value);            // {lo: 50000, hi: 60000}
  const v = Number(row[metricCol]);
  return !isNaN(v) && v >= range.lo && v < range.hi;
}
```

---

## 6. The Chart Registry Pattern (Why & How)

### The Problem (before refactoring)

Before the refactoring, `DrillDownRenderer` was a 415-line "God Component":
```jsx
// OLD: Giant if/else — adds a new chart = touch the renderer
if (chartType === 'bar') { /* ... 30 lines ... */ }
else if (chartType === 'pie') { /* ... 30 lines ... */ }
else if (chartType === 'heatmap') { /* ... 30 lines ... */ }
// ...
```

Every new chart type required modifying the same massive file. There was no separation of concerns.

### The Solution (current architecture)

**`CHART_ADAPTERS` registry in `DrillDownRenderer`:**
```js
const CHART_ADAPTERS = {
  bar: StandardAdapter,
  pie: StandardAdapter,
  line: StandardAdapter,
  scatter: ScatterAdapter,
  bubble: BubbleAdapter,
  heatmap: HeatmapAdapter,
  multiline: MultilineAdapter,
  histogram: HistogramAdapter,
  correlation: CorrelationAdapter,
};
```

**The renderer now does just this:**
```jsx
const ChartAdapter = CHART_ADAPTERS[chartType];
return <ChartAdapter {...sharedProps} />;
```

**Adding a new chart type NEVER requires editing `DrillDownRenderer`** (only the registry line). Every new chart is fully self-contained in its adapter and formatter files.

---

## 7. Implementing Sunburst Chart (Step-by-Step)

The `SunburstChart` component already exists at `components/sunburst-chart/index.jsx`. We need to wire it into the system by following the 4-step pattern.

### Understanding What `SunburstChart` Expects

Looking at `components/sunburst-chart/index.jsx`:
```jsx
// Props it needs:
data = [],             // Array of tree-structured nodes: [{ name, value, children: [...] }]
measureCol = '',       // Name of the metric column (for tooltip label)
aggregationMethod = 'sum', // 'sum' | 'avg' | 'count'
title = '',
drillPath = [],        // Current path (to adjust ring radius)
maxDepth = 4,
onNodeClick,           // (name, depth, treePathInfo) => void
onCenterClick,         // () => void — clicking center goes back
```

The Sunburst is unique: it doesn't need a *flat* formatted data array. It needs a **subtree of the current node** to display all depths simultaneously.

### Step 1: Create the Formatter

**File to create:** `src/libs/drill-down/hooks/engine/formatters/sunburstFormatter.js`

The Sunburst chart needs to show the `currentNode` and all its children and grandchildren. The formatter's job is to convert our tree node format into a format the SunburstChart component understands.

```js
// sunburstFormatter.js

export function formatSunburstData(node, limit) {
  if (!node || !node.children || node.children.length === 0) {
    return [];
  }

  // Recursively convert tree nodes to Sunburst format
  function convert(n, depth) {
    if (!n) return null;
    const hasChildren = n.children && n.children.length > 0;
    
    return {
      name: n.name,
      value: n.value,
      sum: n.value * n.count,  // SunburstChart uses 'sum' for the 'sum' agg method
      count: n.count,
      children: hasChildren
        ? n.children.slice(0, depth === 0 ? limit : 30).map(c => convert(c, depth + 1))
        : undefined,
    };
  }

  return node.children.slice(0, limit).map(c => convert(c, 0));
}
```

**Register it in `formatters/index.js`:**
```js
import { formatSunburstData } from './sunburstFormatter';

// Add inside formatForChartRegistry():
if (chartType === 'sunburst') {
  return formatSunburstData(node, limit);
}
```

### Step 2: Create the Adapter

**File to create:** `src/libs/drill-down/ui/chart-adapters/SunburstAdapter.jsx`

```jsx
import React, { useMemo } from 'react';
import SunburstChart from '../../../../components/sunburst-chart';
import { formatForChart } from '../../hooks/engine';

export default function SunburstAdapter({
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  atLeaf,
  title,
  handleClick,
  onChartReady,
  drillInto,
  drillBackTo
}) {
  const sunburstData = useMemo(() => {
    return formatForChart(currentNode, 'sunburst', rows, drillPath, metrics, dimensions);
  }, [currentNode, rows, drillPath, metrics, dimensions]);

  if (!sunburstData || sunburstData.length === 0) {
    return (
      <div className='empty-state'>
        No data to display in Sunburst chart.
      </div>
    );
  }

  return (
    <SunburstChart
      data={sunburstData}
      measureCol={metrics[0] ?? ''}
      aggregationMethod='avg'
      title={title}
      drillPath={drillPath}
      maxDepth={dimensions.length}
      height='100%'
      onNodeClick={(name) => handleClick(name)}
      onCenterClick={() => drillBackTo(Math.max(0, drillPath.length - 1))}
      onChartReady={onChartReady}
    />
  );
}
```

**Register the adapter in `chart-adapters/index.js`:**
```js
export { default as SunburstAdapter } from './SunburstAdapter';
```

### Step 3: Register in `chartOptions.jsx`

Add the chart definition to `DRILL_CHART_OPTIONS` in `constants/chartOptions.jsx`:

```js
import { Sun } from 'lucide-react'; // add to imports at top

{
  value: 'sunburst',
  label: 'Sunburst',
  icon: <Sun size={16} />,
  desc: 'Hierarchical ring chart.',
  detail: 'Shows all dimension levels as concentric rings. Click a segment to drill in.',
  canDrill: true,
  minRemainingDepth: 1,   // Needs at least one child level to render rings
},
```

### Step 4: Register in `DrillDownRenderer`

In `drill-down-renderer/index.jsx`:

```js
// Add to imports:
import { SunburstAdapter, ... } from '../chart-adapters';

// Add to CHART_ADAPTERS registry:
const CHART_ADAPTERS = {
  sunburst: SunburstAdapter,
  // ... existing entries
};
```

### Step 5: Verify It Works

1. Start the dev server.
2. Upload your CSV.
3. Select "Sunburst" from the toolbar or the dropdown.
4. You should see a multi-ring sunburst chart where the outermost ring is the first dimension and inner rings are deeper dimensions.
5. Click any arc segment → it should call `handleClick(name)` → `drillInto` → the chart re-renders centered on that selection.
6. Click the center circle → it should call `drillBackTo` to go up one level.

---

## Summary: Adding Any New Chart — The 4-File Checklist

| Step | File | What to do |
|---|---|---|
| **1. Formatter** | `formatters/<name>Formatter.js` | Write the math. Import + register in `formatters/index.js`. |
| **2. Adapter** | `chart-adapters/<Name>Adapter.jsx` | Call formatter, handle empty state, wire click → `handleClick`. Export from `chart-adapters/index.js`. |
| **3. Options** | `constants/chartOptions.jsx` | Add `{ value, label, icon, canDrill, minRemainingDepth }` entry. |
| **4. Registry** | `drill-down-renderer/index.jsx` | Import adapter. Add `chartType: Adapter` to `CHART_ADAPTERS`. |

> **You never need to touch anything else.** The renderer, the state machine, the breadcrumb, the toolbar, and the depth filtering all work automatically because they read from the shared `DRILL_CHART_OPTIONS` configuration.
