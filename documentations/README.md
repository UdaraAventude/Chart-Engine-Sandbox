# Chart Engine Evaluation Sandbox

This project lets you upload CSV-style datasets and compare chart rendering behavior across multiple frontend chart libraries.
CSV parsing and aggregation run entirely in the browser.

## Technical Deep-Dive

For a senior-engineering deep-dive into the ECharts drill-down architecture (animation lifecycle, traversal logic, and UX internals), see:

- `DRILLDOWN_ANALYSIS.md`

## Project Structure

- `frontend/`: React + Vite UI for upload and chart visualization
- `test.csv`: Sample dataset for quick testing

## Prerequisites

- Node.js 18+
- npm

## 1. Run Frontend (React + Vite)

Open a terminal in the project root and run:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on Vite default URL:

```text
http://localhost:5173
```

## 2. Quick Test Flow

1. Start frontend (`npm run dev`).
2. Open `http://localhost:5173`.
3. Upload `test.csv` or `employee_survey_200k.csv`.
4. Switch chart libraries and inspect render metrics.

## Helpful Commands

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Troubleshooting

- If CSV parsing fails, verify the file is `.csv`, `.data`, or `.txt` with a valid structure.
- If processing large files feels slow, wait for local aggregation to complete.
- If Node install fails, run `npm cache verify` and retry `npm install`.
