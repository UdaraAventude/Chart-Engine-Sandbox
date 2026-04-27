# Chart Engine Evaluation Sandbox

This project lets you upload CSV-style datasets and compare chart rendering behavior across multiple frontend chart libraries.

## Technical Deep-Dive

For a senior-engineering deep-dive into the ECharts drill-down architecture (animation lifecycle, traversal logic, and UX internals), see:

- `DRILLDOWN_ANALYSIS.md`

## Project Structure

- `backend/`: FastAPI API for file upload and chart config generation
- `frontend/`: React + Vite UI for upload and chart visualization
- `test.csv`: Sample dataset for quick testing

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## 1. Run Backend (FastAPI)

Open a terminal in the project root and run:

### Windows (PowerShell)

```powershell
cd backend
..\myenv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Windows (CMD)

```bat
cd backend
..\myenv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### macOS/Linux

```bash
cd backend
python -m venv ../myenv
source ../myenv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API health check:

```text
GET http://localhost:8000/
```

Upload endpoint:

```text
POST http://localhost:8000/upload
```

## 2. Run Frontend (React + Vite)

Open a second terminal in the project root and run:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on Vite default URL:

```text
http://localhost:5173
```

The frontend is preconfigured to call the backend at:

```text
http://localhost:8000
```

## 3. Quick Test Flow

1. Start backend (`uvicorn ...`).
2. Start frontend (`npm run dev`).
3. Open `http://localhost:5173`.
4. Upload `test.csv`.
5. Switch chart libraries and inspect render metrics.

## Helpful Commands

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

### Backend

```bash
uvicorn app.main:app --reload
```

## Troubleshooting

- If CORS/API errors appear, confirm backend is running on port `8000`.
- If `uvicorn` is not found, ensure virtual environment is activated before running backend commands.
- If Node install fails, run `npm cache verify` and retry `npm install`.
