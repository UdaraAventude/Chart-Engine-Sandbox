# ECharts Drill-Down System: Technical Deep-Dive

This document is a presentation-ready deep-dive into the Apache ECharts drill-down architecture used in this repo, with exact file/function anchors for engineering review.

## Scope and Source Map

Primary implementation files:

- `frontend/src/components/DrillDownRenderer.jsx`
- `frontend/src/utils/DrillDownCharts.js`
- `frontend/src/utils/DrillDownManager.js`
- `frontend/src/DrillDown.css`
- `frontend/src/services/localAnalytics.js`

## AREA 1 - ANIMATIONS: THE ENGINE OF FLUIDITY

### 1. animationDuration definitions

Where animation behavior is defined:

- `frontend/src/utils/DrillDownCharts.js`
    - `buildDrillBar` (line 24):
        - `animationDuration: 1000` (line 96)
        - `animationEasing: 'cubicOut'` (line 97)
    - `buildDrillSunburst` (line 528): no explicit `animationDuration`; uses ECharts defaults.
    - `buildDrillPie` (line 100): no explicit animation override; uses defaults.
    - `buildDrillScatter` (line 444):
        - `animation: false` in grouped series (line 464)
        - `animation: false` in fallback series (line 475)
    - Histogram and bubble use default animation behavior (no explicit disable).

### 2. Easing functions and visual physics

Current explicit easing usage:

- `frontend/src/utils/DrillDownCharts.js` line 97: `cubicOut` in `buildDrillBar`.

Swap location:

- Change `animationEasing` in the returned option object inside any `buildDrill...` function.

### 3. Re-render lifecycle (bar/pie/line/bubble/scatter)

Execution path:

1. ECharts emits click event.
2. `handleChartClick` runs in `frontend/src/components/DrillDownRenderer.jsx` line 446.
3. Drill state updates via `setDrillPath(prev => drillInto(...))` across click branches (lines 474, 517, 525, 536, 545, 559, 586).
4. React recalculates chart options in `option = useMemo(...)` (line 292).
5. Chart data builders run (`getBarDataForPath`, `getHeatmapData`, etc.).
6. `ReactECharts` receives a new `option` and redraws.

### 4. `notMerge` and `lazyUpdate`

In `frontend/src/components/DrillDownRenderer.jsx`:

- `notMerge={true}` at line 688.
- `lazyUpdate={false}` at line 689.

This enforces full option replacement with immediate redraw.

### 5. Universal Transition (morphing)

Current state:

- No `universalTransition` flag is defined in `DrillDownCharts.js`.

If needed, add in each morph-target series:

```javascript
universalTransition: { enabled: true, divideShape: 'clone' },
id: 'drill-master-series'
```

### 6. CSS animations in chrome layer

In `frontend/src/DrillDown.css`:

- `.drill-container` line 33: `transition: all 0.3s`.
- `.agg-btn` line 103: `transition: all 0.2s`.
- `.level-dot` line 232: `transition: all 0.3s`.

Pattern: CSS handles toolbar/badges/chrome while canvas animation is handled by ECharts.

### 7. Floating depth badge

In `frontend/src/components/DrillDownRenderer.jsx`:

- Badge render appears when `drillPath.length > 0` (line 694).

In `frontend/src/DrillDown.css`:

- `.floating-depth-badge` styling begins at line 528.

### 8. Stagger animation (bar-by-bar)

Current state:

- `buildDrillBar` has no `animationDelay`.

To add staggering in `frontend/src/utils/DrillDownCharts.js` inside bar series:

```javascript
animationDelay: idx => idx * 50
```

## AREA 2 - DRILL-DOWN: FULL IMPLEMENTATION AUDIT

### 9. `drillPath` state shape

Ownership:

- `frontend/src/components/DrillDownRenderer.jsx` line 160:
    - `const [drillPath, setDrillPath] = useState([]);`

Shape:

```javascript
[
    { column: 'country', value: 'Norway' },
    { column: 'department', value: 'Marketing' },
    { column: 'seniority_level', value: 'Mid' }
]
```

### 10. Trace: bar click "Sweden"

Flow details:

1. Click bar in ECharts.
2. Bar branch in `handleChartClick` (line 523).
3. Calls `drillInto` via `setDrillPath` (line 525).
4. Filter stage uses `filterByDrillPath` from `frontend/src/utils/DrillDownManager.js` line 50.
5. Bar data selection uses `getBarDataForPath` in `DrillDownRenderer.jsx` line 212.
6. Chart option rebuild runs in `option useMemo` (line 292).
7. `buildDrillBar` in `DrillDownCharts.js` line 24 builds the next level option.

### 11. Trace: sunburst traversal

Key logic:

- `getSubtreeForPath` helper in `DrillDownRenderer.jsx` line 34 traverses `children` arrays.
- Click handling in sunburst branch (lines 450-477).
- `treeDepth` comes from `params.treePathInfo?.length` (line 451).
- Column index math: `colIndex = drillPath.length + (treeDepth - 2)` (line 472).

### 12. Pre-aggregation strategy (`aggregations.py`)

Backend pipeline:

- `compute_all_aggregations` at line 37 does one max-depth groupby (lines 52-58).
- `drill_flat` built by `_build_drill_flat` at line 107.
- `drill_tree` built by `_build_drill_tree` at line 229.
- `drill_timeseries` built by `_build_drill_timeseries` at line 168.

Hierarchy and measure constants:

- `DRILL_HIERARCHY` line 20.
- `MEASURE_COL` line 21.

### 13. Heatmap versus bar drill-down

Heatmap click path:

- Heatmap branch in `handleChartClick` starts at line 485.
- Label parsing via `parseRangeLabel` at line 53 with regex `/\d+\.?\d*/g` (line 55).
- Bin filtering + mode selection occur in lines 506-518.

### 14. Line chart: real timeseries versus fallback

Line option branch:

- `drill-line` option logic starts at line 364.
- Checks `aggregations.drill_timeseries.data[pathKey]` (lines 368-370).
- If present: uses `buildDrillMultiline`.
- If missing: sets fallback flag (line 384) and returns `buildDrillBar` fallback (lines 388-391).

### 15. Breadcrumb and navigation

- `drillBackTo` utility in `frontend/src/utils/DrillDownManager.js` line 198.
- Breadcrumb navigate handler in renderer line 677:
    - `setDrillPath(drillBackTo(drillPath, depth))`
- One-level sunburst back: `setDrillPath(prev => prev.slice(0, -1))` in sunburst branch (lines 457, 465).

### 16. `isLeafLevel` and indicators

- Leaf check utility: `isLeafLevel` in `DrillDownManager.js` line 202.
- Used in renderer as `atLeaf` (line 204).
- Leaf visual in bar chart (`DrillDownCharts.js`):
    - `borderColor: isLeaf ? '#d97706' : 'transparent'` (line 78)
    - `borderWidth: isLeaf ? 2 : 0` (line 79)
- Leaf navigation guard for non-sunburst flows: `if (atLeaf) return;` (line 480).

## AREA 3 - UI/UX, TOOLTIPS, AND CUSTOMIZATION

### 17. Tooltip audit (`DrillDownCharts.js`)

Tooltip triggers by chart:

- Bar (`buildDrillBar`): `trigger: 'axis'` at line 33.
- Pie (`buildDrillPie`): `trigger: 'item'` at line 107.
- Heatmap (`buildDrillHeatmap`): custom item formatter (line 321).
- Bubble (`buildDrillBubble`): custom formatter (line 408).
- Sunburst (`buildDrillSunburst`): `trigger: 'item'` at line 560.

### 18. `COMMON_THEME` and global styles

Theme object:

- `COMMON_THEME` starts at line 6.
- Tooltip border color is defined at line 14.

All builders spread `...COMMON_THEME` to inherit baseline look-and-feel.

### 19. Color system

- `PALETTE` line 3.
- `SUNBURST_PALETTE` line 4.
- Bar gradient in `buildDrillBar` lines 75-76.
- Bubble radial gradient in `buildDrillBubble` lines 393-396.

Dark mode adaptation would require CSS variable updates in `frontend/src/DrillDown.css` and theme color updates in `COMMON_THEME`.

### 20. Aggregation switcher

Toolbar location in renderer:

- Aggregation switcher (bar/pie) block begins line 631.
- Methods are rendered from `['sum', 'avg', 'count', 'min', 'max']` (line 634).

Note:

- Heatmap currently does not expose aggregation method switching in chart build path.

### 21. Drill toolbar and counter

- Engine badge root at line 620.
- Chart type label derived from `drillChartType.split('-')[1]` (lines 624-626).
- Depth counter at line 665: `DEPTH: {drillPath.length} / {hierarchy.length}`.

### 22. Visual affordances (drill cues)

Current cues:

- Leaf border highlight in bar chart (lines 78-79).
- Tooltip hint for drillability in bar formatter (line 42).
- Sunburst subtitle hint "click segment to drill" (line 554).
- ECharts click cursor behavior is implicit by chart interaction and overlay elements.

### 23. `dataZoom` scrollbar

- Bar dataZoom threshold is in `buildDrillBar` line 85:
    - `names.length > 15 ? [...] : []`

To lower threshold, change `15` to the desired value.

### 24. Customization reference table

| Feature | File | Function | Anchor |
| --- | --- | --- | --- |
| Bar Gradient | `frontend/src/utils/DrillDownCharts.js` | `buildDrillBar` | lines 75-76 |
| Donut Hole | `frontend/src/utils/DrillDownCharts.js` | `buildDrillPie` | line 120 (`radius: ['40%', '70%']`) |
| Sunburst Radius | `frontend/src/utils/DrillDownCharts.js` | `buildDrillSunburst` | line 569 |
| Heatmap Color Ramp | `frontend/src/utils/DrillDownCharts.js` | `buildDrillHeatmap` | line 361 |
| Animation Duration | `frontend/src/utils/DrillDownCharts.js` | `buildDrillBar` | line 96 |
| Animation Easing | `frontend/src/utils/DrillDownCharts.js` | `buildDrillBar` | line 97 |
| Primary Palette | `frontend/src/utils/DrillDownCharts.js` | `PALETTE` | line 3 |
| Breadcrumb Active Color | `frontend/src/DrillDown.css` | `.breadcrumb-btn.active` | line 171 |
| Floating Depth Badge | `frontend/src/DrillDown.css` | `.floating-depth-badge` | line 528 |
| Zoom Height (scatter slider) | `frontend/src/utils/DrillDownCharts.js` | `buildDrillScatter` | line 502 |

## Appendix: Important Accuracy Notes

- Pie tooltip trigger is `item`, not `axis`.
- Heatmap drill chooses the most frequent next-level category in the selected bin.
- `notMerge={true}` and `lazyUpdate={false}` are already enabled in the renderer.
- Universal transition morphing is currently not enabled and must be explicitly added.
