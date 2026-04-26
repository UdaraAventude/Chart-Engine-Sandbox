# Project Documentation: Chart Engine Evaluation Sandbox

## 1. Project Overview
The **Chart Engine Evaluation Sandbox** is a high-performance R&D application designed to benchmark data visualization libraries (specifically **Apache ECharts**) against large datasets (e.g., 200,000+ rows). It aims to prove the suitability of ECharts for complex, hierarchical data exploration and drill-down analytics.

## 2. Technical Architecture

### Frontend (Modern SPA)
- **Framework**: React (Vite)
- **State Management**: **Zustand** (Atomic and reactive state handling)
- **Visualization**: **Apache ECharts** (Primary engine)
- **Styling**: Vanilla CSS with a focus on premium aesthetics (glassmorphism, gradients).

### Backend (Data Processing Engine)
- **Framework**: FastAPI (Python)
- **Data Handling**: **Pandas** (Vectorized operations for aggregation)
- **Performance Optimization**: Single-pass groupby strategy to minimize full-dataset scans.

## 3. Core Workflow

1.  **Data Intake**: The user uploads a CSV (e.g., `employee_survey_200k.csv`).
2.  **Server-Side Aggregation**: 
    - The backend parses the file and identifies numeric vs. categorical columns.
    - It computes a hierarchical "Drill Tree" and "Drill Flat" structure based on a predefined hierarchy (`country` > `dept` > `seniority` > `edu`).
    - It generates secondary analytics: Correlation matrices, Heatmaps, and Multi-line timeseries.
3.  **State Hydration**: The frontend receives a comprehensive JSON payload containing all pre-computed aggregations, allowing for near-instant drill-down without further network calls.
4.  **Interactive Rendering**: 
    - The UI renders the chart based on the `currentPath` (e.g., `"Sweden|Engineering"`).
    - Clicking a chart element (Bar/Sunburst segment) updates the path.
    - The `DrillDownCharts.js` utility dynamically builds the ECharts option object.

## 4. Key Implementation Details

### Performance
- **Aggregations**: The backend achieves <1s processing time for 200k rows by grouping by the *max-depth* of the hierarchy once and aggregating *upward* from that result, rather than re-scanning the 200k rows for every level.
- **Frontend**: ECharts is used for its ability to handle large data points via `canvas` rendering and efficient animation loops.

### UX Features
- **Breadcrumb Navigation**: Tracks the user's location in the hierarchy and allows jumping back to any parent level.
- **Dynamic Chart Types**: Supports switching between Bar, Pie, Multiline, and Sunburst views for the same hierarchical data.
- **Rich Aesthetic Customization**: Custom HTML tooltips, linear/radial gradients, and smooth "cubicOut" animations.
