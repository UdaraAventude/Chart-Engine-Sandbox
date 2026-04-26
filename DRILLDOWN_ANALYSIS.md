# Drill-Down Analysis: employee_survey_200k.csv

This document outlines the specific variables and mechanisms used to implement hierarchical drill-down for the 200,000-row employee survey dataset.

## 1. Key Variables

### Backend (Python/Pandas)
Defined in `backend/app/services/aggregations.py`:
- `DRILL_HIERARCHY`: `['country', 'department', 'seniority_level', 'education_level']`
    - Defines the fixed path for data exploration.
- `MEASURE_COL`: `'monthly_salary'`
    - The primary numerical metric used for the "Value" in Bar, Pie, and Sunburst charts.
- `SUNBURST_MEASURE`: `'monthly_salary'`
    - Specifically used to build the recursive Sunburst JSON tree.
- `TIMESERIES_COL`: `'overall_satisfaction'`
    - Used for the trend analysis shown in the Multiline drill chart.

### Frontend (React/Zustand)
Defined in `frontend/src/store/useStore.js`:
- `aggregations`: Stores the complete pre-aggregated payload.
    - `aggregations.drill_flat`: A dictionary where keys are drill paths (e.g., `""`, `"Sweden"`, `"Sweden|Engineering"`) and values are arrays of child aggregates.
    - `aggregations.drill_tree`: The nested JSON structure for Sunburst charts.
- `currentPath`: (Managed in `DrillDownContainer.jsx`)
    - Tracks the current location in the hierarchy (e.g., `"Sweden|Sales|Senior"`).
- `drillChartType`: Controls the current visualization mode (e.g., `'drill-bar'`, `'drill-pie'`, `'drill-sunburst'`).

## 2. Core Mechanisms

### High-Performance "Pre-Aggregation"
To avoid the lag of scanning 200,000 rows on every user click, the backend uses a **Single-Pass Groupby Strategy**:
1.  **Groupby Max Depth**: `df.groupby(['country', 'department', 'seniority_level', 'education_level'])['monthly_salary'].agg(['sum', 'mean', 'count'])`.
2.  **Derive Levels**: All higher-level summaries (e.g., just Country or Country+Dept) are derived by aggregating *upward* from this small 1000-row summary table.
3.  **Flat Lookup Table**: The results are stored in a "Flat" dictionary for O(1) retrieval by the frontend.

### Frontend Event Orchestration
1.  **ECharts Click Handling**: 
    - When a bar is clicked, the `onChartClick` event extracts the `name` of the segment.
    - The `currentPath` is updated: `newPath = currentPath ? `${currentPath}|${name}` : name`.
2.  **State-Driven Re-rendering**:
    - The update to `currentPath` triggers a re-selection of data from `aggregations.drill_flat[newPath]`.
    - ECharts performs a "morph" animation (transitioning bars/slices) to show the new level.
3.  **Breadcrumb Synchronization**:
    - The `DrillDownBreadcrumb` component splits the `currentPath` by `|` and renders a clickable trail, allowing users to "pop" the path stack and return to parent levels.
