# ChartSandbox Technical Handoff (For Refactor + New Features)

This document is a complete technical handoff for AI-assisted refactoring and feature development.
Use this as context when sharing the project with Claude Sonnet.

## 1) Project Purpose

ChartSandbox is a full-stack sandbox that:
- Uploads CSV-like files to a FastAPI backend
- Parses and profiles tabular data
- Generates a mock AI chart recommendation
- Renders the same dataset with multiple chart libraries in React
- Compares render behavior and timing across chart engines

Current chart engines in UI:
- Apache ECharts
- Plotly.js
- Recharts

## 2) Tech Stack

Backend:
- Python + FastAPI
- Uvicorn
- Pandas
- Pydantic
- python-multipart

Frontend:
- React 18 + Vite
- Zustand (state)
- Axios (API calls)
- echarts + echarts-for-react
- plotly.js-dist-min + react-plotly.js
- recharts
- lucide-react

## 3) Current Repository Layout

Root:
- backend/
- frontend/
- myenv/ (local virtual environment)
- test.csv (sample input)
- README.md (basic run guide)
- README_CLAUDE.md (this file)

Backend key files:
- backend/app/main.py
- backend/app/routes/upload.py
- backend/app/schemas/chart_schema.py
- backend/app/services/ai_mock.py
- backend/app/services/data_profile.py
- backend/app/services/correlation.py
- backend/requirements.txt

Frontend key files:
- frontend/package.json
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/components/UploadCSV.jsx
- frontend/src/components/LibrarySwitcher.jsx
- frontend/src/components/ChartRenderer.jsx
- frontend/src/services/api.js
- frontend/src/store/useStore.js

## 4) Environment and Prerequisites

- Python 3.10+ recommended
- Node.js 18+ recommended
- npm
- Windows PowerShell (or CMD) / macOS / Linux shell

## 5) Local Setup and Run Commands

### 5.1 Backend Setup (Windows PowerShell)

```powershell
cd backend
..\myenv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2 Backend Setup (Windows CMD)

```bat
cd backend
..\myenv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5.3 Backend Setup (macOS/Linux)

```bash
cd backend
python -m venv ../myenv
source ../myenv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5.4 Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL:
- http://localhost:5173

Backend base URL used by frontend:
- http://localhost:8000

## 6) API Contract

### 6.1 Health Endpoint

- Method: GET
- Path: /
- Response:

```json
{
  "message": "Chart Engine Evaluation Sandbox API is running"
}
```

### 6.2 Upload Endpoint

- Method: POST
- Path: /upload
- Content-Type: multipart/form-data
- Form field: file

Accepted extensions:
- .csv
- .data
- .txt

Special-case dataset handling:
- If filename is processed.cleveland.data, backend uses explicit Cleveland columns and drops rows with "?" values.
- For all other files, Pandas auto-detects delimiter using sep=None and engine='python'.

Success response model (DatasetMetadata):

```json
{
  "columns": ["string"],
  "rows": [{ "col": "value" }],
  "chart_config": {
    "chart_type": "line | bar | scatter | heatmap | histogram",
    "x_axis": "string",
    "y_axis": "string",
    "title": "string",
    "correlation_score": 0.0
  }
}
```

Validation constraints:
- correlation_score is limited to [-1.0, 1.0]

Error behavior:
- 400: invalid extension or parse failure
- 500: AI mock config references non-existing columns

## 7) Frontend State Model (Zustand)

Store fields:
- dataset
- chartConfig
- selectedLibrary (default: echarts)
- isLoading
- error
- lastRenderTime

Store actions:
- setDataset
- setChartConfig
- setSelectedLibrary
- setLoading
- setError
- setRenderTime

Debug utility:
- Store is exposed on window.__zustand_store__ for console inspection.

## 8) Runtime Flow

1. User uploads file in UploadCSV component.
2. Frontend validates extension client-side.
3. Frontend sends multipart POST /upload.
4. Backend parses and normalizes dataset.
5. Backend generates mock chart suggestion.
6. Backend returns columns, rows (first 1000 rows), and chart_config.
7. Frontend stores dataset + chartConfig in Zustand.
8. ChartRenderer maps same data into ECharts / Plotly / Recharts.
9. Render timing is measured and displayed in dashboard metrics.

## 9) Important Implementation Notes

- CORS is currently fully open (allow_origins=["*"]).
- API base URL is hardcoded in frontend/src/services/api.js.
- Backend currently imports get_dataset_profile and ChartConfig in upload route but does not fully use both.
- ai_mock.py contains unreachable fallback code after a return statement.
- chart type from mock is currently scatter most of the time.
- Upload route limits preview payload to first 1000 rows.

## 10) Known Gaps and Refactor Targets

High-value refactor opportunities:
- Introduce environment variables (.env) for backend URL and runtime config.
- Replace hardcoded CORS wildcard with environment-based allowlist.
- Add structured logging and request tracing.
- Move file parsing logic to dedicated parser service with test coverage.
- Remove dead code and unused imports (especially in ai_mock/upload route).
- Add backend unit tests for upload parsing and schema validation.
- Add frontend component tests for upload/error/render states.
- Add optional async task queue if future AI inference becomes expensive.

Data quality and robustness:
- Handle very large CSV files (streaming or chunked parsing).
- Improve delimiter and encoding detection.
- Add explicit validation for missing x/y fields and non-numeric scatter axes.

Architecture improvements:
- Introduce service interfaces for chart recommendation engine.
- Split monolithic ChartRenderer into library adapters.
- Centralize chart config mapping to avoid duplicated transformation logic.

## 11) Suggested Feature Backlog

Near-term features:
- Chart type selector override in UI
- Column picker for x/y axis
- Dataset summary panel (dtypes, null counts, min/max)
- Correlation matrix heatmap view
- Download chart as image

Medium-term features:
- Pluggable AI recommendation service (real LLM endpoint)
- Saved sessions (persist upload + config)
- Side-by-side chart comparison mode
- Performance benchmark history and export

Long-term features:
- Multi-file join/merge workflows
- Team collaboration annotations
- Role-based access with authenticated API

## 12) Development Conventions to Keep

- Keep backend response schema stable unless versioned.
- Prefer thin route handlers and service-layer logic.
- Keep frontend library switch behavior deterministic using shared data source.
- Avoid introducing chart-library-specific state into global store unless required.

## 13) Quick Verification Checklist

After changes, verify:
- Backend starts and GET / returns health JSON.
- Frontend starts and reaches API without CORS errors.
- Uploading test.csv returns data and chart config.
- All 3 chart libraries render from the same dataset.
- Render timing still updates when library is switched.
- Error UI appears on invalid file upload.

## 14) Example Test Input

Use root file:
- test.csv

Sample columns currently include:
- age
- chol
- heart_rate
- blood_pressure

## 15) Claude Prompt Starter (Copy/Paste)

Use this prompt with Claude Sonnet:

"You are helping me refactor a React + FastAPI chart sandbox. Read README_CLAUDE.md as source of truth. First produce a phased refactor plan with no behavior regressions. Then implement Phase 1: (1) environment-based config for frontend API URL and backend CORS, (2) remove dead/unused code in backend services and routes, (3) add baseline tests for upload endpoint and chart config schema, (4) keep API response contract unchanged. After implementation, provide changed files, migration notes, and a rollback plan."

## 16) Current Status Snapshot

- Backend and frontend run locally.
- API endpoint contract exists and is consumed by UI.
- Project is functional for demo and benchmarking.
- Codebase is ready for a structured refactor sprint.
