# Chart Engine — Full-Stack Integration

## Prerequisites

1. **SQL Server** and **storage path** configured in `chart-engine-server/src/ChartEngine.API/appsettings.Development.json`
2. Run migrations:
   ```bash
   cd chart-engine-server
   dotnet ef database update --project src/ChartEngine.Infrastructure --startup-project src/ChartEngine.API
   ```
3. Start API:
   ```bash
   dotnet run --project src/ChartEngine.API
   ```
   Default: http://localhost:5110 — verify `GET /health`

## Start frontend

```bash
cd chart-engine-client/frontend
cp .env.example .env.development   # if needed
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/health` to port **5110**.

## Architecture

- **Upload:** `POST /api/v1/documents/upload` (SSE progress)
- **Metadata:** `GET /api/v1/documents/{id}/metadata`
- **Charts:** `GET /api/v1/documents/visual?id=&chartType=&aggregation=&drillPath=`
- **Datasets:** `GET/DELETE /api/v1/documents`
- **Export:** `POST /api/v1/datasets/{id}/export` → poll → download

## Chart-type selection (drill-down)

| Control | Behavior |
|---------|----------|
| **Top chart toolbar** | Resets drill path to overview and sets chart type at depth 0 |
| **In-chart dropdown** | Changes chart type at current drill depth only (path unchanged) |

## Smoke checklist

| Step | Action |
|------|--------|
| 1 | API health returns `{ status: "healthy" }` |
| 2 | Upload CSV via UI; progress reaches 100% |
| 3 | Bar chart renders; click segment to drill |
| 4 | Top toolbar: change type → returns to overview |
| 5 | In-chart dropdown: change type at depth → path unchanged |
| 6 | Heatmap / multiline / bubble render 2D or series shapes from API |
| 7 | Correlation / scatter: view-only at server drill levels |
| 8 | Dataset list select and delete; server export |
| 9 | Aggregation changes bar/pie/line values |
| 10 | Histogram: bins display; bin drill disabled in server mode |

## Production build

Set `VITE_API_BASE_URL=http://your-api-host:5110/api/v1` before `npm run build`.

## Legacy client pipeline

`frontend/src/workers/csv-pipeline.worker.js` is no longer used for uploads. All processing runs on the server.
