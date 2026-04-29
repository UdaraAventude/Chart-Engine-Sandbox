# Cleanup & Restructuring Guide
## Chart-Engine-Sandbox — Before Feature Work

> Do these tasks **in order** before implementing any new chart types.  
> Each task is self-contained and safe to verify independently.

---

## 🔴 Part 1 — Critical Bug Fixes (do these first)

### Bug 1 — `drill-down-selector/index.jsx` has duplicate exports (Runtime Crash Risk)

**What's wrong:**  
The file contains **two complete component definitions** — two `const DRILL_TYPES`, two `const DrillDownSelector`, two `export default`. JavaScript will throw `SyntaxError: Identifier 'DRILL_TYPES' has already been declared` at runtime if this file is ever imported.

**Current state of the file:**
- Lines 1–88: First version (4 types: bar, pie, line, scatter)
- Lines 91–239: Second version (10 types: drill-bar, drill-pie, etc. with `drill-` prefixes)

**Is this file even used?**  
Check: Only `DrillDownPage` imports components. It imports `ChartToolbar` (not `DrillDownSelector`).  
→ `DrillDownSelector` is **currently unused** — it is dead code.

**Action:**  
Replace the entire file with a single clean component (keep the second version's richer type list, but remove the `drill-` prefix naming since the rest of the system uses plain names like `'bar'`, `'pie'`).

```
DECISION NEEDED: Do you want to keep DrillDownSelector for future use, or delete it?
```
→ **Recommended:** Keep it but fix it. It has a richer UI than ChartToolbar (shows descriptions, info strip). It could replace or supplement ChartToolbar.

---

### Bug 2 — `constants/index.js` uses `'drill-bar'` prefix keys — inconsistent with system

**What's wrong:**  
```js
// constants/index.js — uses 'drill-' prefix
export const DRILL_CHART_TYPES = {
  BAR: 'drill-bar',   // ← 'drill-bar'
  PIE: 'drill-pie',   // ← 'drill-pie'
  ...
};
```
But the store, renderer, and toolbar all use plain strings:
```js
// store/drill/index.js — no prefix
chartTypeByDepth: { 0: 'bar' }

// chart-toolbar/index.jsx — no prefix
{ value: 'bar', label: 'Bar' }
```
These constants are **never imported anywhere** (grep shows zero usages). They're dead code with the wrong values.

**Action:** Update `constants/index.js` to match the actual string values used throughout the system.

```js
// constants/index.js — AFTER fix
export const CHART_TYPES = {
  BAR:         'bar',
  PIE:         'pie',
  LINE:        'line',
  SCATTER:     'scatter',
  BUBBLE:      'bubble',
  HEATMAP:     'heatmap',
  CORRELATION: 'correlation',
  MULTILINE:   'multiline',
  HISTOGRAM:   'histogram',
  TABLE:       'table',
};

export const AGG_METHODS = ['sum', 'avg', 'count', 'min', 'max'];
export const CHART_TOP_N = 50;   // move this magic number out of engine/index.js
```

---

### Bug 3 — `DrillDownRenderer` has a hardcoded duplicate `CHART_OPTIONS` array

**What's wrong:**  
`drill-down-renderer/index.jsx` lines 12–18 define `CHART_OPTIONS` locally — identical to what `chart-toolbar/index.jsx` defines. This is copy-pasted code that will drift out of sync.

```js
// drill-down-renderer/index.jsx (inner <select> dropdown)
const CHART_OPTIONS = [
  { value: 'bar',     label: 'Bar'     },
  { value: 'pie',     label: 'Pie'     },
  { value: 'line',    label: 'Line'    },
  { value: 'scatter', label: 'Scatter' },
  { value: 'table',   label: 'Table'   },
];
```

**Action:** Move this to the new shared constants file (see Part 2) and import it in both places.

---

### Bug 4 — `utils/DrillDownCharts/index.js` is orphaned (716 lines of dead code)

**What it is:**  
A 716-line file of old ECharts option builders (`buildDrillBar`, `buildDrillPie`, `buildDrillBubble`, etc.) that pre-date the current component-based architecture. The current system uses the chart components directly (e.g. `<BarChart>`, `<PieChart>`), NOT these builder functions.

**Is it imported anywhere?** No. Zero imports found in the entire codebase.

**Action:** This file should be **deleted** — it is dead weight. However, it contains good logic for Bubble, Heatmap, Correlation, Histogram formatters that we will need for the engine. Before deleting:
- Copy the math/data formatting logic from `buildDrillBubble`, `buildDrillHeatmap`, `buildDrillCorrelation`, `buildDrillHistogram` into the new engine helpers (Phase 2 of the implementation plan).
- Then delete the file.

---

### Bug 5 — `DrillDownBreadcrumb` has inline styles (minor — flag for cleanup)

`drill-down-breadcrumb/index.jsx` lines 51–64 have inline styles on the Back button.  
→ Move to `DrillDown.css` after other cleanup is done.

---

## 🟡 Part 2 — Code Restructuring (shared constants)

The goal: **one source of truth** for chart type definitions.

### New file: `libs/drill-down/constants/chartOptions.js`

Create this file to be the single source for chart type metadata used by both the toolbar and the renderer dropdown.

```js
// libs/drill-down/constants/chartOptions.js
import React from 'react';
import {
  BarChart3, PieChart, LineChart, ScatterChart,
  CircleDot, LayoutGrid, GitCommit, TrendingUp,
  BarChart2, Table2,
} from 'lucide-react';

export const DRILL_CHART_OPTIONS = [
  {
    value: 'bar',
    label: 'Bar',
    icon: <BarChart3 size={16} />,
    desc: 'Aggregate dimensions into categorical bars.',
    detail: 'Best for hierarchical categorical data. Click a bar to drill into that group.',
    canDrill: true,
  },
  {
    value: 'pie',
    label: 'Pie',
    icon: <PieChart size={16} />,
    desc: 'Categorical share distribution.',
    detail: 'Shows proportional distribution. Click a slice to drill in.',
    canDrill: true,
  },
  {
    value: 'line',
    label: 'Line',
    icon: <LineChart size={16} />,
    desc: 'Trend across categories.',
    detail: 'Displays metric values as a trend. Click a point to drill.',
    canDrill: true,
  },
  {
    value: 'scatter',
    label: 'Scatter',
    icon: <ScatterChart size={16} />,
    desc: 'Point clustering analysis.',
    detail: 'Plots raw rows using two numeric columns.',
    canDrill: false,
  },
  {
    value: 'bubble',
    label: 'Bubble',
    icon: <CircleDot size={16} />,
    desc: 'Multi-dimensional group analysis.',
    detail: 'X, Y, and Size encode three metrics per group. Click to drill.',
    canDrill: true,
  },
  {
    value: 'heatmap',
    label: 'Heatmap',
    icon: <LayoutGrid size={16} />,
    desc: 'Cross-tab density map.',
    detail: 'Shows avg metric across two dimension axes. Click a cell to drill on X axis.',
    canDrill: true,
  },
  {
    value: 'correlation',
    label: 'Correlation',
    icon: <GitCommit size={16} />,
    desc: 'Metric relationship matrix.',
    detail: 'Pearson correlation between all numeric columns. Read-only analytical view.',
    canDrill: false,
  },
  {
    value: 'multiline',
    label: 'Multi-Line',
    icon: <TrendingUp size={16} />,
    desc: 'Time-series by group.',
    detail: 'One line per group across time/sequence. Click a series to drill.',
    canDrill: true,
  },
  {
    value: 'histogram',
    label: 'Histogram',
    icon: <BarChart2 size={16} />,
    desc: 'Frequency distribution.',
    detail: 'Distribution of a single numeric metric across bins. Read-only view.',
    canDrill: false,
  },
  {
    value: 'table',
    label: 'Table',
    icon: <Table2 size={16} />,
    desc: 'Raw data grid.',
    detail: 'Tabular view of the current level data.',
    canDrill: false,
  },
];
```

**Consumers after restructuring:**
- `chart-toolbar/index.jsx` → imports `DRILL_CHART_OPTIONS`, maps to pill buttons
- `drill-down-renderer/index.jsx` → imports `DRILL_CHART_OPTIONS`, maps to `<select>` options
- `drill-down-selector/index.jsx` (fixed) → imports `DRILL_CHART_OPTIONS`, maps to type grid

---

### Updated folder structure after cleanup

```
frontend/src/
├── components/
│   ├── _shared/
│   │   ├── chartTheme.js          ← theme tokens (keep as-is)
│   │   └── charts.css             ← shared echarts-wrapper CSS (already done ✅)
│   ├── bar-chart/
│   ├── bubble-chart/
│   ├── correlation-chart/
│   ├── heatmap-chart/
│   ├── histogram-chart/
│   ├── line-chart/
│   ├── multiline-chart/
│   ├── pie-chart/
│   ├── scatter-chart/
│   ├── sunburst-chart/
│   └── upload-csv/
│
├── constants/
│   └── index.js                   ← fix CHART_TYPES values (remove 'drill-' prefix)
│
├── libs/
│   └── drill-down/
│       ├── constants/
│       │   └── chartOptions.js    ← NEW: single source of DRILL_CHART_OPTIONS
│       ├── feature/
│       │   └── drill-down-page/
│       │       └── index.jsx      ← already fixed ✅
│       ├── hooks/
│       │   └── engine/
│       │       └── index.js       ← to be expanded later
│       └── ui/
│           ├── chart-toolbar/
│           │   └── index.jsx      ← import from constants/chartOptions.js
│           ├── drill-down-breadcrumb/
│           │   └── index.jsx      ← move inline styles to CSS
│           ├── drill-down-renderer/
│           │   └── index.jsx      ← import from constants/chartOptions.js
│           └── drill-down-selector/
│               └── index.jsx      ← fix duplicate exports bug
│
├── store/
│   ├── features/
│   │   ├── data/index.js
│   │   ├── drill/index.js         ← already fixed ✅
│   │   └── ui/index.js
│   └── index.js
│
└── utils/
    └── DrillDownCharts/
        └── index.js               ← DELETE after extracting logic to engine
```

---

## ✅ Cleanup Task Order (Checklist)

### Step A — Fix the duplicate export crash
- [ ] Open `drill-down-selector/index.jsx`
- [ ] Delete lines 91–239 (the entire second duplicate)
- [ ] Keep lines 1–88 (the first version)
- [ ] Update that first version's `DRILL_TYPES` to use plain names (no `'drill-'` prefix) and 10 entries from the plan

### Step B — Fix constants/index.js
- [ ] Remove `'drill-'` prefixes from `DRILL_CHART_TYPES`
- [ ] Rename to `CHART_TYPES`
- [ ] Add `CHART_TOP_N = 50` (move from engine/index.js line 1)
- [ ] Remove `DRILL_METRICS` (hardcoded to `['Satisfaction', 'Salary']` — wrong for dynamic data)

### Step C — Create `libs/drill-down/constants/chartOptions.js`
- [ ] Create file with `DRILL_CHART_OPTIONS` array (10 entries, as above)
- [ ] Include `canDrill` flag per type

### Step D — Update `chart-toolbar/index.jsx`
- [ ] Import `DRILL_CHART_OPTIONS` from `../constants/chartOptions`
- [ ] Remove local `CHART_OPTIONS` array
- [ ] Use `DRILL_CHART_OPTIONS` to render pills

### Step E — Update `drill-down-renderer/index.jsx`
- [ ] Import `DRILL_CHART_OPTIONS` from `../../constants/chartOptions`
- [ ] Remove local `CHART_OPTIONS` array (lines 12–18)
- [ ] Use `DRILL_CHART_OPTIONS` for the `<select>` options

### Step F — Fix `drill-down-breadcrumb` inline styles
- [ ] Move Back button inline styles to `DrillDown.css` under `.back-btn`

### Step G — Delete `utils/DrillDownCharts/index.js`
- [ ] Before deleting: note that `buildDrillBubble`, `buildDrillHeatmap`, `buildDrillCorrelation`, `buildDrillHistogram` contain data-formatting math that will be re-used in `engine/index.js`
- [ ] The ECharts option-builder logic is NOT needed (we use components now)
- [ ] Delete the file

### Step H — Verify the app still works
- [ ] Upload a CSV, confirm bar chart renders at root
- [ ] Click a bar, confirm drill-down inherits chart type
- [ ] Switch chart type via toolbar, confirm reset to root
- [ ] Navigate breadcrumbs, confirm depth tracking is correct

---

## 📊 Impact Summary

| Issue | Risk Level | Lines of Code | Action |
|-------|-----------|---------------|--------|
| Duplicate exports in drill-down-selector | 🔴 Runtime crash | 150 lines to delete | Fix/simplify |
| Wrong prefix in constants/index.js | 🟡 Confusing, unused | 12 lines | Fix values |
| Duplicate CHART_OPTIONS arrays | 🟡 Drift risk | ~10 lines duplicated | Extract to shared file |
| Dead utils/DrillDownCharts/index.js | 🟡 Confusion | 716 lines to delete | Delete after audit |
| Inline styles in Breadcrumb | 🟢 Cosmetic | 14 lines | Move to CSS |

> [!NOTE]
> After completing all cleanup tasks, the codebase will have a single source of truth for chart types, no dead code, and no duplicate export errors. Only then proceed to implement new chart types in the engine.
