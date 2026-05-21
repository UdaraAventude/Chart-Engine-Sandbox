import React, { useEffect, useState } from 'react';
import useStore from '../../../../store';
import { getVisualization } from '../../../../services/api/documents';
import { normalizeServerChartData } from '../../../../services/api/normalizeChartData';
import BarChart from '../../../../components/bar-chart';
import PieChart from '../../../../components/pie-chart';
import LineChart from '../../../../components/line-chart';

export function ServerBuilderPreview({ config }) {
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const metadata = useStore((s) => s.metadata);
  const aggregation = useStore((s) => s.aggregation) ?? 'count';

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!activeDatasetId) return undefined;

    const dims = metadata?.dimensions ?? [];
    if (config.xAxis && dims.length > 0 && config.xAxis !== dims[0]) {
      setNotice(
        `Axis "${config.xAxis}" does not match root dimension "${dims[0]}". Chart shows server hierarchy at root level.`,
      );
    } else {
      setNotice(null);
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getVisualization({
          id: activeDatasetId,
          chartType: config.chartType,
          drillPath: [],
          aggregation,
        });
        if (cancelled) return;
        setChartData(
          normalizeServerChartData(res.chartType || config.chartType, res.data),
        );
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load chart');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId, config.chartType, config.xAxis, metadata, aggregation]);

  if (loading) {
    return <div className="builder-preview-status">Loading from API...</div>;
  }
  if (error) {
    return <div className="builder-preview-status builder-preview-error">{error}</div>;
  }
  if (!chartData?.length) {
    return <div className="builder-preview-status">No chart data returned.</div>;
  }

  const xLabel = (config.xAxis || '').replace(/_/g, ' ').toUpperCase();
  const yLabel = (config.yAxis || metadata?.metrics?.[0] || '')
    .replace(/_/g, ' ')
    .toUpperCase();

  return (
    <div>
      {notice && <p className="builder-preview-notice">{notice}</p>}
      {config.chartType === 'pie' ? (
        <PieChart data={chartData} title={config.title} metricName={yLabel} height="460px" />
      ) : config.chartType === 'line' ? (
        <LineChart
          data={chartData}
          title={config.title}
          xAxisLabel={xLabel}
          yAxisLabel={yLabel}
          height="460px"
        />
      ) : (
        <BarChart
          data={chartData}
          title={config.title}
          xAxisLabel={xLabel}
          yAxisLabel={yLabel}
          height="460px"
        />
      )}
    </div>
  );
}
