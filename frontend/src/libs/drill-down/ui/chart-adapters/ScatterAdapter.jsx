import React, { useMemo } from 'react';
import ScatterChart from '../../../../components/scatter-chart';
import { formatForChart } from '../../hooks/engine';
import { useRowSampleRows } from '../../hooks/useRowSampleRows';
import { ChartLoadingState, ChartErrorState } from '../chart-panel-state';

export default function ScatterAdapter({
  rows,
  drillPath,
  metrics,
  dimensions,
  currentColumn,
  title,
  handleClick,
  onChartReady,
}) {
  const { rows: effectiveRows, loading, error } = useRowSampleRows(drillPath, true);

  const { rawData, xCol, yCol } = useMemo(() => {
    return formatForChart(
      null,
      'scatter',
      effectiveRows,
      drillPath,
      metrics,
      dimensions,
    );
  }, [effectiveRows, drillPath, metrics, dimensions]);

  if (loading) {
    return <ChartLoadingState />;
  }

  if (error) {
    return <ChartErrorState message={error} />;
  }

  if (!rawData?.length || !xCol || !yCol) {
    return (
      <div className="chart-panel-state chart-panel-state--empty" style={{ minHeight: 360 }}>
        <p>
          Scatter needs numeric row data (X = first metric, Y = second metric). No rows
          available at this drill level.
        </p>
      </div>
    );
  }

  if (metrics.length < 2) {
    return (
      <div className="chart-panel-state chart-panel-state--empty" style={{ minHeight: 360 }}>
        <p>Scatter needs at least two numeric metrics in the dataset.</p>
      </div>
    );
  }

  return (
    <ScatterChart
      rawData={rawData}
      xCol={xCol}
      yCol={yCol}
      colorCol={currentColumn}
      title={title}
      height="100%"
      onPointClick={handleClick}
      onChartReady={onChartReady}
    />
  );
}
