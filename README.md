# Chart Engine Sandbox — Frontend

Version: 0.1.0 | Architecture: React SPA (Vite) + Chart Engine API

---

## Overview

Chart Engine Sandbox is a frontend playground containing a collection of reusable React chart components, utilities, and a lightweight drill-down rendering engine. It's designed for experimenting with chart types, CSV data ingestion, and client-side data pipelines.

Key ideas:

- Fast prototyping of chart UI and interactions
- CSV upload to Chart Engine API (SSE progress)
- Drill-down adapters and breadcrumb navigation
- Pluggable rendering engine used by multiple chart components

---

## Features

- Multiple chart types: bar, line, pie, scatter, heatmap, histogram, bubble, correlation, multiline, sunburst
- CSV upload UI backed by server-side processing
- Drill-down & breadcrumb navigation for hierarchical charts
- Chart type and axis selectors as reusable UI primitives
- Mock AI output and rendering hooks for experimentation

---

## Quick Start

Prerequisites:

- Node.js (LTS recommended)
- Chart Engine API running at `http://localhost:5110` (see `chart-engine-server`)

Install and run development server:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server typically runs at http://localhost:5173.

Build and preview production artifacts:

```bash
npm run build
npm run preview
```

---

## Environment

This project reads a small set of Vite environment variables for API integration and dev features. Example `.env` values (create in `frontend/` if needed):

```
# Dev: Vite proxies /api to localhost:5110
VITE_API_BASE_URL=/api/v1

# Production build against API directly:
# VITE_API_BASE_URL=http://localhost:5110/api/v1
```

---

## Project Layout (key files)

- App entry: [frontend/src/main.jsx](frontend/src/main.jsx#L1)
- Root app component: [frontend/src/App.jsx](frontend/src/App.jsx#L1)
- Chart components: [frontend/src/components](frontend/src/components#L1)
- Drill-down renderer: [frontend/src/libs/drill-down/ui/drill-down-renderer/index.jsx](frontend/src/libs/drill-down/ui/drill-down-renderer/index.jsx#L1)
- Chart builder / engine hooks: [frontend/src/libs/chart-builder](frontend/src/libs/chart-builder#L1)
- API services: [frontend/src/services/api](frontend/src/services/api)
- Upload CSV UI: [frontend/src/components/upload-csv/index.jsx](frontend/src/components/upload-csv/index.jsx#L1)

See the `src/` tree for additional modules and utilities.

---

## Scripts

Run these from the `frontend` folder:

- `npm run dev` — start dev server
- `npm run build` — build production bundle
- `npm run preview` — preview production build
- `npm run lint` — run project linter (if configured)

---

## Development Notes

- See [INTEGRATION.md](INTEGRATION.md) for full-stack setup and smoke tests.
- Upload and chart data come from the Chart Engine API (SSE + REST). The local CSV worker is legacy and unused.
- The drill-down UI fetches `GET /documents/visual` on path/chart/aggregation changes.

---
