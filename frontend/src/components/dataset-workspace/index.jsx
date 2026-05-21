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
} from 'lucide-react';
import useStore from '../../store';
import { uploadCSV } from '../../services/api';
import { listDocuments, deleteDocument, getMetadata } from '../../services/api/documents';
import './DatasetWorkspace.css';

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
      setError(
        err?.message ||
          err?.body?.error ||
          'Upload failed. Is the API running on port 5110?',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`workspace-upload-zone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        processFile(e.dataTransfer.files[0]);
      }}
    >
      <label className="workspace-upload-label">
        <div className="workspace-upload-icon">
          {isLoading ? (
            <Loader2 size={32} className="spin" />
          ) : (
            <Upload size={32} />
          )}
        </div>
        <div>
          <p className="workspace-upload-title">
            {isLoading ? 'Processing on server…' : 'Upload a new CSV'}
          </p>
          <p className="workspace-upload-sub">
            Drag and drop or click to browse · up to 2GB
          </p>
        </div>
        <input
          type="file"
          accept=".csv,.data,.txt"
          disabled={isLoading}
          onChange={(e) => processFile(e.target.files[0])}
        />
      </label>

      {isLoading && (
        <div className="workspace-upload-progress">
          <div className="workspace-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
          <span>{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (activeDatasetId) setPendingId(activeDatasetId);
  }, [activeDatasetId]);

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
      if (pendingId === id) setPendingId(null);
      if (activeDatasetId === id) useStore.getState().clearSession();
      await loadList();
    } catch (err) {
      setListError(err?.message || 'Delete failed');
    }
  };

  const isReadyStatus = (status) => String(status).toLowerCase() === 'ready';
  const readyCount = items.filter((i) => isReadyStatus(i.status)).length;

  const canContinue =
    Boolean(pendingId) &&
    (metadata?.datasetId === pendingId || activeDatasetId === pendingId);

  return (
    <div className="dataset-workspace">
      <header className="workspace-header">
        <h1>Chart Engine Sandbox</h1>
        <p>Upload a file or open an existing dataset, then pick a chart type to explore your hierarchy.</p>
      </header>

      <div className="workspace-grid">
        <section className="workspace-card workspace-card--upload">
          <h2>
            <Upload size={18} />
            New upload
          </h2>
          <WorkspaceUpload
            onUploaded={() => {
              loadList();
              const id = useStore.getState().activeDatasetId;
              if (id) {
                setPendingId(id);
                onDatasetReady?.();
              }
            }}
          />
        </section>

        <section className="workspace-card workspace-card--existing">
          <div className="workspace-card-head">
            <h2>
              <Database size={18} />
              Existing datasets
            </h2>
            <button
              type="button"
              className="workspace-refresh"
              onClick={loadList}
              disabled={listLoading}
              aria-label="Refresh list"
            >
              <RefreshCw size={16} className={listLoading ? 'spin' : ''} />
            </button>
          </div>

          {listError && <p className="workspace-list-error">{listError}</p>}

          {!listLoading && !listError && (totalCount > 0 || items.length > 0) && (
            <p className="workspace-list-summary">
              {(items.length || totalCount)} dataset
              {(items.length || totalCount) !== 1 ? 's' : ''} shown
              {readyCount > 0 && readyCount < (items.length || totalCount)
                ? ` · ${readyCount} ready to open`
                : ''}
            </p>
          )}
          {!listLoading && totalCount > 0 && items.length === 0 && !listError && (
            <p className="workspace-list-error">
              Could not display dataset list. Try refresh.
            </p>
          )}

          <ul className="workspace-dataset-list" role="list">
            {listLoading && (
              <li className="workspace-empty">Loading datasets…</li>
            )}
            {!listLoading && items.length === 0 && !listError && (
              <li className="workspace-empty">No datasets yet. Upload a CSV to get started.</li>
            )}
            {!listLoading &&
              items.map((item) => {
                const isReady = isReadyStatus(item.status);
                const isSelected = String(pendingId) === String(item.id);
                const statusKey = String(item.status).toLowerCase();
                const rowCount = Number(item.totalRows) || 0;

                return (
                  <li
                    key={item.id}
                    className={`workspace-dataset-row ${isSelected ? 'selected' : ''} ${!isReady ? 'not-ready' : ''}`}
                  >
                    <button
                      type="button"
                      className="workspace-dataset-row-select"
                      disabled={!isReady}
                      onClick={() => selectDataset(item.id)}
                    >
                      <FileSpreadsheet size={20} aria-hidden />
                      <div className="workspace-dataset-row-body">
                        <span className="workspace-dataset-name" title={item.fileName}>
                          {item.fileName}
                        </span>
                        <span className="workspace-dataset-meta">
                          {rowCount.toLocaleString()} rows
                          <span className={`workspace-status workspace-status--${statusKey}`}>
                            {item.status}
                          </span>
                        </span>
                        {isSelected && (
                          <span className="workspace-selected-mark">
                            <CheckCircle2 size={14} aria-hidden />
                            Selected
                          </span>
                        )}
                        {!isReady && (
                          <span className="workspace-processing-hint">
                            {statusKey === 'processing'
                              ? 'Still processing — refresh in a moment'
                              : `Status: ${item.status}`}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="workspace-dataset-delete"
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete dataset"
                      aria-label={`Delete ${item.fileName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      </div>

      <footer className="workspace-footer">
        {metadata && pendingId && (
          <div className="workspace-selection-summary">
            <strong>{metadata.fileName}</strong>
            <span>
              {(metadata.totalRows ?? 0).toLocaleString()} rows ·{' '}
              {metadata.maxHierarchyDepth ?? metadata.dimensions?.length ?? 0} drill
              levels
              {(metadata.maxHierarchyDepth ?? 0) > 0 &&
              (metadata.dimensions?.length ?? 0) > metadata.maxHierarchyDepth
                ? ` (${metadata.dimensions.length} columns in file)`
                : ''}{' '}
              · {metadata.metrics?.length ?? 0} metrics
            </span>
          </div>
        )}
        <button
          type="button"
          className="workspace-continue-btn"
          disabled={!canContinue || isLoading}
          onClick={() => onDatasetReady?.()}
        >
          Continue to visualizations
          <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
}
