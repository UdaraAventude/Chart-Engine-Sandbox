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

## Smoke checklist

| Step | Action |
|------|--------|
| 1 | API health returns `{ status: "healthy" }` |
| 2 | Upload CSV via UI; progress reaches 100% |
| 3 | Bar chart renders; click segment to drill |
| 4 | Switch chart type and aggregation |
| 5 | Dataset panel lists files; select and delete work |
| 6 | Data CSV / Data XLSX export completes |
| 7 | Chart builder shows preview with active dataset |

## Production build

Set `VITE_API_BASE_URL=http://your-api-host:5110/api/v1` before `npm run build`.

## Legacy client pipeline

`frontend/src/workers/csv-pipeline.worker.js` is no longer used for uploads. All processing runs on the server.
