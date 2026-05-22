import React, { useCallback, useEffect, useState } from 'react';
import {
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  ArrowRight,
  Layers,
  BarChart3,
  Clock,
  AlertCircle,
} from 'lucide-react';
import useStore from '../../store';
import { uploadCSV } from '../../services/api';
import { listDocuments, deleteDocument, getMetadata } from '../../services/api/documents';
import './DatasetWorkspace.css';

/* ── Upload panel ─────────────────────────────────────────── */
function WorkspaceUpload({ onUploaded }) {
  const { setLoading, setError, isLoading, uploadProgress } = useStore();
  const store = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    const allowed = ['.csv', '.data', '.txt'];
    if (!file || !allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setError('Please upload a valid CSV, DATA, or TXT file.');
      return;
    }
    setLoading(true);
    setError(null);
    store.setUploadProgress(0);
    try {
      await uploadCSV(file, (pct) => store.setUploadProgress(pct));
      onUploaded?.();
    } catch (err) {
      setError(err?.message || err?.body?.error || 'Upload failed. Is the API running on port 5110?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`ws-drop-zone ${isDragging ? 'ws-drop-zone--dragging' : ''} ${isLoading ? 'ws-drop-zone--loading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
    >
      <label className="ws-drop-label">
        <div className="ws-drop-icon-ring">
          {isLoading ? <Loader2 size={26} className="ws-spin" /> : <Upload size={26} />}
        </div>

        <div className="ws-drop-text">
          <span className="ws-drop-title">
            {isLoading ? 'Uploading & indexing…' : 'Drop your file here'}
          </span>
          <span className="ws-drop-sub">
            {isLoading ? 'Building drill-down hierarchy on the server' : 'or click to browse · CSV, DATA, TXT up to 2\u00a0GB'}
          </span>
        </div>

        {!isLoading && (
          <div className="ws-drop-formats">
            <span>.csv</span><span>.data</span><span>.txt</span>
          </div>
        )}

        <input
          type="file"
          accept=".csv,.data,.txt"
          disabled={isLoading}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          onChange={(e) => processFile(e.target.files[0])}
        />
      </label>

      {isLoading && (
        <div className="ws-drop-progress">
          <div className="ws-drop-progress-bar">
            <div className="ws-drop-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <span className="ws-drop-progress-pct">{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
}

/* ── Main workspace ───────────────────────────────────────── */
export default function DatasetWorkspace({ onDatasetReady }) {
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const metadata = useStore((s) => s.metadata);
  const setActiveDataset = useStore((s) => s.setActiveDataset);
  const setMetadata = useStore((s) => s.setMetadata);
  const setTotalRows = useStore((s) => s.setTotalRows);
  const resetDrill = useStore((s) => s.resetDrill);
  const setChartError = useStore((s) => s.setChartError);
  const isLoading = useStore((s) => s.isLoading);

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [pendingId, setPendingId] = useState(activeDatasetId);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const result = await listDocuments({ page: 1, pageSize: 100 });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setListError(err?.message || 'Could not load datasets');
      setItems([]);
      setTotalCount(0);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (activeDatasetId) setPendingId(activeDatasetId); }, [activeDatasetId]);

  const selectDataset = async (id) => {
    try {
      const meta = await getMetadata(id);
      setPendingId(id);
      setActiveDataset(id);
      setMetadata({
        datasetId: meta.datasetId,
        fileName: meta.fileName,
        status: meta.status,
        totalRows: meta.totalRows,
        dimensions: meta.dimensions,
        metrics: meta.metrics,
        rejected: meta.rejected ?? [],
        maxHierarchyDepth: meta.maxHierarchyDepth ?? meta.MaxHierarchyDepth,
      });
      setTotalRows(meta.totalRows);
      resetDrill();
      setChartError(null);
    } catch (err) {
      setListError(err?.message || 'Failed to load dataset');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this dataset permanently?')) return;
    try {
      await deleteDocument(id);
      // Optimistic update — remove from local state immediately
      setItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (pendingId === id) setPendingId(null);
      if (activeDatasetId === id) useStore.getState().clearSession();
      // Background refresh to stay in sync with server
      loadList();
    } catch (err) {
      setListError(err?.message || 'Delete failed');
    }
  };

  const isReadyStatus = (s) => String(s).toLowerCase() === 'ready';
  const readyCount = items.filter((i) => isReadyStatus(i.status)).length;
  const canContinue = Boolean(pendingId) && (metadata?.datasetId === pendingId || activeDatasetId === pendingId);

  return (
    <div className="ds-workspace">

      {/* ── Hero header ─────────────────────────────────── */}
      <header className="ds-hero">
        <div className="ds-hero-left">
          <div className="ds-hero-icon">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="ds-hero-title">Chart Engine</h1>
            <p className="ds-hero-sub">Upload or select a dataset to explore your data through interactive drill-down charts.</p>
          </div>
        </div>
        <div className="ds-hero-steps">
          <div className="ds-step ds-step--active">
            <span className="ds-step-num">1</span>
            <span>Select dataset</span>
          </div>
          <div className="ds-step-arrow">›</div>
          <div className={`ds-step ${canContinue ? '' : 'ds-step--dim'}`}>
            <span className="ds-step-num">2</span>
            <span>Explore charts</span>
          </div>
        </div>
      </header>

      {/* ── Main two-col grid ────────────────────────────── */}
      <div className="ds-grid">

        {/* Upload panel */}
        <section className="ds-panel">
          <div className="ds-panel-head">
            <Upload size={14} />
            <span>New upload</span>
          </div>
          <WorkspaceUpload
            onUploaded={() => {
              loadList();
              const id = useStore.getState().activeDatasetId;
              if (id) { setPendingId(id); onDatasetReady?.(); }
            }}
          />
          <div className="ds-upload-tips">
            <div className="ds-tip">
              <Layers size={13} />
              <span>Hierarchical columns are auto-detected</span>
            </div>
            <div className="ds-tip">
              <BarChart3 size={13} />
              <span>Numeric columns become chart metrics</span>
            </div>
            <div className="ds-tip">
              <Clock size={13} />
              <span>Large files (2M+ rows) are indexed server-side</span>
            </div>
          </div>
        </section>

        {/* Dataset library */}
        <section className="ds-panel ds-panel--library">
          <div className="ds-panel-head">
            <Database size={14} />
            <span>Your datasets</span>
            {!listLoading && totalCount > 0 && (
              <span className="ds-count-badge">{readyCount} ready</span>
            )}
            <button
              type="button"
              className="ds-refresh-btn"
              onClick={loadList}
              disabled={listLoading}
              aria-label="Refresh"
            >
              <RefreshCw size={13} className={listLoading ? 'ws-spin' : ''} />
            </button>
          </div>

          {listError && (
            <div className="ds-list-error">
              <AlertCircle size={14} /> {listError}
            </div>
          )}

          <ul className="ds-list" role="list">
            {listLoading && (
              <li className="ds-list-placeholder">
                <Loader2 size={16} className="ws-spin" /> Loading datasets…
              </li>
            )}
            {!listLoading && items.length === 0 && !listError && (
              <li className="ds-list-empty">
                <Database size={32} />
                <strong>No datasets yet</strong>
                <span>Upload a CSV to get started</span>
              </li>
            )}
            {!listLoading && items.map((item) => {
              const isReady = isReadyStatus(item.status);
              const isSelected = String(pendingId) === String(item.id);
              const statusKey = String(item.status).toLowerCase();
              const rowCount = Number(item.totalRows) || 0;

              return (
                <li key={item.id} className={`ds-item ${isSelected ? 'ds-item--selected' : ''} ${!isReady ? 'ds-item--dim' : ''}`}>
                  <button
                    type="button"
                    className="ds-item-btn"
                    disabled={!isReady}
                    onClick={() => selectDataset(item.id)}
                  >
                    <div className="ds-item-icon">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="ds-item-body">
                      <span className="ds-item-name" title={item.fileName}>{item.fileName}</span>
                      <div className="ds-item-meta">
                        {rowCount > 0 && (
                          <span className="ds-meta-chip">{rowCount.toLocaleString()} rows</span>
                        )}
                        <span className={`ds-status ds-status--${statusKey}`}>{item.status}</span>
                        {!isReady && statusKey === 'processing' && (
                          <span className="ds-processing">Processing…</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="ds-item-check">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    className="ds-item-delete"
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Delete dataset"
                    aria-label={`Delete ${item.fileName}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ── Selection / CTA bar ─────────────────────────── */}
      <footer className={`ds-cta-bar ${canContinue ? 'ds-cta-bar--ready' : ''}`}>
        <div className="ds-cta-info">
          {canContinue && metadata ? (
            <>
              <div className="ds-cta-file">
                <FileSpreadsheet size={16} />
                <span className="ds-cta-filename">{metadata.fileName}</span>
              </div>
              <div className="ds-cta-chips">
                <span className="ds-cta-chip">{(metadata.totalRows ?? 0).toLocaleString()} rows</span>
                <span className="ds-cta-chip">
                  {metadata.maxHierarchyDepth ?? metadata.dimensions?.length ?? 0} drill levels
                  {(metadata.maxHierarchyDepth ?? 0) > 0 && (metadata.dimensions?.length ?? 0) > metadata.maxHierarchyDepth
                    ? ` (${metadata.dimensions.length} cols)`
                    : ''}
                </span>
                <span className="ds-cta-chip">{metadata.metrics?.length ?? 0} metrics</span>
              </div>
            </>
          ) : (
            <span className="ds-cta-hint">Select a dataset from the list to continue</span>
          )}
        </div>

        <button
          type="button"
          className="ds-cta-btn"
          disabled={!canContinue || isLoading}
          onClick={() => onDatasetReady?.()}
        >
          Continue to visualizations
          <ArrowRight size={17} />
        </button>
      </footer>
    </div>
  );
}
