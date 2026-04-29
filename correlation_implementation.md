# Correlation Chart — Implementation Guide

## What Was Built

A **Correlation Chart** (heatmap matrix) that calculates and visualizes the Pearson correlation coefficient between all numeric columns in the dataset at the current drill depth.
Since `canDrill: false` was set for this chart type in `chartOptions.jsx`, this acts purely as a read-only analytical view.

---

## Files Changed (Using New Architecture)

Because we refactored the engine to use a modular Strategy/Adapter pattern, adding this chart was extremely simple and isolated. We didn't have to touch the core `engine/index.js` traversal logic or bloat the `DrillDownRenderer`.

| File | What changed |
|------|-------------|
| `formatters/correlationFormatter.js` | **New file.** Computes the Pearson correlation matrix. |
| `formatters/index.js` | Routed `chartType === 'correlation'` to the new formatter. |
| `chart-adapters/CorrelationAdapter.jsx` | **New file.** Maps the formatter's output to the `CorrelationChart` component props. |
| `chart-adapters/index.js` | Exported the new adapter. |
| `drill-down-renderer/index.jsx` | Added `correlation: CorrelationAdapter` to the `CHART_ADAPTERS` registry. |

---

## Architecture: Pearson Correlation Math

The `computeCorrelationData` function performs the heavy lifting:

1. **Filtering:** It takes the raw `rows` and applies `filterRows(rows, drillPath)` to ensure we only correlate data within the current drill-down context (e.g., only correlating metrics for "Male" employees if we drilled into Male).
2. **Parsing:** It isolates all `metrics` (numeric columns) and parses them into memory for fast access.
3. **Pearson Math:** It runs a nested loop over the metric pairs (e.g., `age` vs `salary`, `satisfaction` vs `salary`). For each pair, it calculates:
   *   Sum of X
   *   Sum of Y
   *   Sum of X * Y
   *   Sum of X² and Y²
   *   Applies the standard Pearson formula:  
       `r = (n(Σxy) - (Σx)(Σy)) / sqrt([nΣx² - (Σx)²][nΣy² - (Σy)²])`
4. **Formatting:** The result is pushed into a `matrix` array formatted as `{x: "salary", y: "age", value: 0.85}`.

### Edge Cases Handled
*   If the dataset has fewer than 2 numeric metrics, it gracefully renders an empty state: "Needs at least two numeric columns."
*   If the standard deviation of a column is zero (e.g., all values are identical), the denominator becomes zero. The formatter guards against this and defaults the correlation to `0.00`.

---

## Conclusion

With the Correlation chart finished, **all 10 chart types** outlined in the `chartOptions.jsx` specification are now fully implemented, functional, and deeply integrated into the hierarchical drill-down engine!
