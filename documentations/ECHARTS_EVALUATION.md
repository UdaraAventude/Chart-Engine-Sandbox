# Library Evaluation: Apache ECharts

This document evaluates **Apache ECharts** as the core visualization engine for the Chart Engine Evaluation Sandbox.

## 1. Proven Customizability (Code Evidence)

ECharts provides a highly granular configuration API. Below are specific lines in the project where ECharts has been customized to meet premium UI/UX standards:

### A. Advanced Visual Styling (Gradients & Borders)
In `frontend/src/utils/DrillDownCharts.js`, we implement linear and radial gradients to avoid the "flat" look of standard libraries.
```javascript
// Line 61: Linear Gradient for Bar Charts
color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: '#185FA5' },
  { offset: 1, color: '#93c5fd' }
]),
// Line 65: Rounded corners for modern aesthetics
borderRadius: [4, 4, 0, 0],
```

### B. Rich HTML Tooltips
Unlike SVG-based libraries that struggle with complex tooltips, ECharts allows raw HTML rendering:
```javascript
// Line 34: Custom HTML Formatter with dynamic logic
formatter: (params) => {
  const d = aggregated[params[0].dataIndex];
  return `
    <div style="font-weight: bold; ...">${d.name}</div>
    <div style="color: #374151">Salary: <span style="color: #185FA5;">${d.value.toLocaleString()}</span></div>
    ${!isLeaf ? '<div style="...">▲ Click to drill</div>' : ''}
  `;
}
```

### C. Complex Hierarchical Visuals (Sunburst)
ECharts' Sunburst implementation is highly flexible, allowing recursive value calculation and multi-level label rotation:
```javascript
// Line 527: Specialized Sunburst series
type: 'sunburst',
radius: ['15%', '90%'],
levels: [
  {}, // Root
  { r0: '15%', r: '35%', label: { rotate: 'radial' } }, // L1
  { r0: '55%', r: '72%', label: { rotate: 'tangential' } } // L3
]
```

## 2. Current Situation & Coverage

| Feature Category | Coverage Status | Implementation Detail |
| :--- | :--- | :--- |
| **Data Scalability** | ✅ 100% | Handles 200k rows via backend aggregation + ECharts canvas rendering. |
| **Chart Diversity** | ✅ 90% | Bar, Pie, Sunburst, Multiline, Heatmap, Scatter, Bubble, Correlation. |
| **Drill-Down Flow** | ✅ 100% | Full state-driven hierarchy navigation with breadcrumbs. |
| **Aesthetics** | ✅ 95% | Custom color palettes, gradients, and typography (system-ui). |
| **Animation** | ✅ 80% | Smooth transitions on drill-down, but lacks morphing between different chart types. |

## 3. Gap Analysis: What is Needed to Achieve "Proved Perfection"

While ECharts is clearly the frontrunner, the following features would solidify its dominance in the main project:

1.  **Cross-Chart Brushing (Filtering)**: Implement the ability to "select" a range on a Histogram and have the Bar Chart drill down to that specific subset in real-time.
2.  **Dataset Visual Mapping (Direct)**: Move from "Pre-Aggregated JSON" to using ECharts' `dataset` and `transform` API for client-side filtering of moderately sized data (50k rows).
3.  **Dynamic Hierarchy Selection**: Allow the user to drag-and-drop columns to change the drill order (e.g., `Dept > Country` instead of `Country > Dept`) and have ECharts re-render instantly.
4.  **Universal Morphing**: Utilizing ECharts 5.x "Universal Transition" to animate the transition *between* a Bar chart and a Pie chart during a library/mode swap.

## 4. Conclusion
Apache ECharts is the **most suitable** library because it combines the performance of a Canvas-based engine with the declarative flexibility of a JSON-driven configuration. It effectively bridges the gap between D3's "infinite flexibility" and Recharts' "simple constraints."
