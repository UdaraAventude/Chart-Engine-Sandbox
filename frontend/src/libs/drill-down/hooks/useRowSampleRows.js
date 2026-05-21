import { useEffect, useState } from 'react';
import useStore from '../../../store';
import { getSampleRows } from '../../../services/api/documents';

/**
 * Row-level charts (scatter, correlation) need filtered CSV rows, not tree aggregates.
 * Uses local globalData.rows when present; otherwise fetches a server sample.
 */
export function useRowSampleRows(drillPath, enabled = true) {
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const localRows = useStore((s) => s.globalData?.rows ?? []);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const drillKey = JSON.stringify(drillPath ?? []);

  useEffect(() => {
    if (!enabled || localRows.length > 0 || !activeDatasetId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getSampleRows({
          id: activeDatasetId,
          drillPath,
          limit: 5000,
        });
        if (cancelled) return;
        setRows(res?.rows ?? res?.Rows ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load row sample');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, activeDatasetId, localRows.length, drillKey]);

  return {
    rows: localRows.length > 0 ? localRows : rows,
    loading: enabled && localRows.length === 0 && loading,
    error,
  };
}
