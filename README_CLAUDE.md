# ChartSandbox Technical Handoff (Frontend-Only)

This document captures the current architecture after backend removal.

## 1) Project Purpose

ChartSandbox is a frontend-only sandbox that:
- Parses CSV-like files in the browser
- Computes chart aggregations locally
- Generates a mock chart recommendation from dataset columns
- Renders the same dataset with multiple chart libraries
- Compares render behavior and timing across chart engines

Current chart engines in UI:
- Apache ECharts
- Plotly.js
- Recharts

## 2) Tech Stack

Frontend:
- React 18 + Vite
- Zustand (state)
- PapaParse (CSV parsing)
- echarts + echarts-for-react
- plotly.js-dist-min + react-plotly.js
- recharts
- lucide-react

## 3) Current Repository Layout

Root:
- frontend/
- employee_survey_200k.csv
- README.md
- README_CLAUDE.md

Frontend key files:
- frontend/package.json
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/components/UploadCSV.jsx
- frontend/src/components/DrillDownRenderer.jsx
- frontend/src/components/ChartRenderer.jsx
- frontend/src/services/api.js
- frontend/src/services/localAnalytics.js
- frontend/src/store/useStore.js

## 4) Environment and Prerequisites

- Node.js 18+ recommended
- npm
- Windows PowerShell (or CMD) / macOS / Linux shell

## 5) Local Setup and Run Commands

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL:
- http://localhost:5173

## 6) Local Data Contract

`uploadCSV()` returns a payload with this shape:

```json
{
  "columns": ["string"],
  "rows": [{ "col": "value" }],
  "total_rows": 0,
  "file_size_mb": 0,
  "processing_ms": 0,
  "chart_config": {
    "chart_type": "string",
    "x_axis": "string",
    "y_axis": "string",
    "title": "string",
    "correlation_score": 0
  },
  "aggregations": {}
}
```

## 7) Runtime Flow

1. User uploads file in `UploadCSV`.
2. Frontend validates extension client-side.
3. PapaParse parses file in browser.
4. `localAnalytics` computes chart config + aggregations.
5. Frontend stores dataset + chartConfig + aggregations in Zustand.
6. Chart renderers use local aggregations for drilldown and complex charts.

## 8) Notes

- Accepted extensions: `.csv`, `.data`, `.txt`.
- `processed.cleveland.data` keeps explicit Cleveland column mapping behavior.
- The first 2000 rows are stored for preview while totals/aggregations use full parsed rows.
- Keep frontend library switch behavior deterministic using shared data source.
- Avoid introducing chart-library-specific state into global store unless required.

