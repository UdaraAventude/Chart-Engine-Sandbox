import React, { useCallback, useEffect, useState } from 'react';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import useStore from '../../store';
import { listDocuments, deleteDocument, getMetadata } from '../../services/api/documents';
import './DatasetPanel.css';

export default function DatasetPanel() {
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const setActiveDataset = useStore((s) => s.setActiveDataset);
  const setMetadata = useStore((s) => s.setMetadata);
  const setTotalRows = useStore((s) => s.setTotalRows);
  const resetDrill = useStore((s) => s.resetDrill);
  const setChartError = useStore((s) => s.setChartError);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDocuments({ page: 1, pageSize: 50 });
      setItems(result.items ?? result.data ?? []);
    } catch (err) {
      setError(err?.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList, activeDatasetId]);

  const handleSelect = async (id) => {
    try {
      const meta = await getMetadata(id);
      setActiveDataset(id);
      setMetadata({
        datasetId: meta.datasetId,
        fileName: meta.fileName,
        status: meta.status,
        totalRows: meta.totalRows,
        dimensions: meta.dimensions,
        metrics: meta.metrics,
        rejected: meta.rejected ?? [],
      });
      setTotalRows(meta.totalRows);
      resetDrill();
      setChartError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load dataset');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this dataset?')) return;
    try {
      await deleteDocument(id);
      if (activeDatasetId === id) {
        useStore.getState().clearSession();
        resetDrill();
      }
      await loadList();
    } catch (err) {
      setError(err?.message || 'Delete failed');
    }
  };

  return (
    <aside className="dataset-panel">
      <div className="dataset-panel-header">
        <Database size={16} />
        <span>Datasets</span>
        <button
          type="button"
          className="dataset-panel-refresh"
          onClick={loadList}
          disabled={loading}
          title="Refresh list"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && <p className="dataset-panel-error">{error}</p>}

      <ul className="dataset-panel-list">
        {items.length === 0 && !loading && (
          <li className="dataset-panel-empty">No datasets yet. Upload a CSV.</li>
        )}
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`dataset-panel-item ${activeDatasetId === item.id ? 'active' : ''}`}
              onClick={() => handleSelect(item.id)}
            >
              <span className="dataset-panel-name">{item.fileName}</span>
              <span className="dataset-panel-meta">
                {item.totalRows?.toLocaleString() ?? 0} rows · {item.status}
              </span>
            </button>
            <button
              type="button"
              className="dataset-panel-delete"
              onClick={(e) => handleDelete(item.id, e)}
              title="Delete dataset"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
