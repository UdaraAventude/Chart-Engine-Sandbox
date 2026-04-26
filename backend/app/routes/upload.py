from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import time
from typing import Any

from app.services.ai_mock import get_mock_chart_config
from app.services.aggregations import compute_all_aggregations
from app.services.correlation import get_correlation_matrix

router = APIRouter()

SAMPLE_ROWS = 2000          # rows sent as raw JSON for scatter leaf / preview
MAX_FILE_MB = 60            # reject files larger than this

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # ── Validate extension ──
    allowed = {'.csv', '.data', '.txt'}
    filename = file.filename or ""
    ext = '.' + filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    # ── Read bytes ──
    t0 = time.time()
    content = await file.read()
    file_mb = len(content) / 1024 / 1024

    if file_mb > MAX_FILE_MB:
        raise HTTPException(413, f"File too large: {file_mb:.1f} MB (max {MAX_FILE_MB} MB)")

    # ── Parse CSV ──
    try:
        # Detect cleveland by filename or structure
        if filename == "processed.cleveland.data":
            cols = ['age','sex','cp','trestbps','chol','fbs','restecg',
                    'thalach','exang','oldpeak','slope','ca','thal','num']
            df = pd.read_csv(io.BytesIO(content), header=None, names=cols, na_values="?")
            df = df.dropna()
        else:
            try:
                # PERFORMANCE: try C engine with comma first (standard CSV)
                df = pd.read_csv(io.BytesIO(content), sep=',', engine='c', encoding='utf-8')
            except:
                try:
                    # Fallback to automatic detection (slower Python engine)
                    df = pd.read_csv(io.BytesIO(content), sep=None, engine='python', encoding='utf-8')
                except UnicodeDecodeError:
                    # Fallback to Latin-1
                    df = pd.read_csv(io.BytesIO(content), sep=None, engine='python', encoding='latin1')
    except Exception as e:
        raise HTTPException(400, f"CSV parse error: {e}")

    # ── Drop rows with ALL values missing ──
    df = df.dropna(how='all')
    df.columns = [str(c).strip() for c in df.columns]
    total_rows = len(df)

    # ── AI mock config ──
    chart_config = get_mock_chart_config(df)

    # ── Processing & Aggregations ──
    t_start = time.time()
    sample_rows = df.head(2000).where(pd.notnull(df), None).to_dict(orient='records')
    aggregations = compute_all_aggregations(df)
    processing_ms = int((time.time() - t_start) * 1000)

    return JSONResponse({
        "columns": df.columns.tolist(),
        "rows": sample_rows,
        "total_rows": total_rows,
        "file_size_mb": round(file_mb, 1),
        "processing_ms": processing_ms,
        "chart_config": chart_config,
        "aggregations": aggregations,
    })
