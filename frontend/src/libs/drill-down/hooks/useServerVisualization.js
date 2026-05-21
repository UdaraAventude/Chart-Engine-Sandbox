import { useEffect } from 'react';
import useStore from '../../../store';
import { getVisualization } from '../../../services/api/documents';
import { normalizeServerChartData } from '../../../services/api/normalizeChartData';
import { ApiError } from '../../../services/api/httpClient';

export function useServerVisualization(refreshKey = 0) {
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const drillPath = useStore((s) => s.drillPath);
  const chartTypeByDepth = useStore((s) => s.chartTypeByDepth);
  const aggregation = useStore((s) => s.aggregation);
  const setServerChart = useStore((s) => s.setServerChart);
  const setChartLoading = useStore((s) => s.setChartLoading);
  const setChartError = useStore((s) => s.setChartError);

  const chartType = chartTypeByDepth[drillPath.length] ?? 'bar';
  /** Table shows the same grouped breakdown as bar at this drill level. */
  const apiChartType = chartType === 'table' ? 'bar' : chartType;

  useEffect(() => {
    if (
      !activeDatasetId ||
      chartType === 'sunburst' ||
      chartType === 'scatter' ||
      chartType === 'correlation' ||
      chartType === 'histogram'
    ) {
      setServerChart(null);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setChartLoading(true);
      setChartError(null);
      try {
        const response = await getVisualization({
          id: activeDatasetId,
          chartType: apiChartType,
          drillPath,
          aggregation,
          drillDown: drillPath.filter((s) => !s.column.startsWith('__hist__')).length,
        });

        if (cancelled) return;

        const normalized = normalizeServerChartData(
          response.chartType || apiChartType,
          response.data,
        );

        setServerChart({
          ...response,
          normalized,
        });
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : err?.message || 'Failed to load chart data';
          setChartError(message);
          setServerChart(null);
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeDatasetId,
    drillPath,
    chartType,
    apiChartType,
    aggregation,
    setServerChart,
    setChartLoading,
    setChartError,
    refreshKey,
  ]);

  return { chartType };
}
