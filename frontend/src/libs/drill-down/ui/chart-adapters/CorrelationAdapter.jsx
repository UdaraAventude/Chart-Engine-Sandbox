import React, { useMemo } from 'react';
import CorrelationChart from '../../../../components/correlation-chart';
import { computeCorrelationData } from '../../hooks/engine/formatters/correlationFormatter';
import { filterRows } from '../../hooks/engine';
import { useRowSampleRows } from '../../hooks/useRowSampleRows';
import { ChartLoadingState, ChartErrorState } from '../chart-panel-state';

export default function CorrelationAdapter({
  drillPath,
  metrics,
  title,
  onChartReady,
}) {
  const { rows: effectiveRows, loading, error } = useRowSampleRows(drillPath, true);

  const correlationData = useMemo(
    () => computeCorrelationData(effectiveRows, drillPath, metrics, filterRows),
    [effectiveRows, drillPath, metrics],
  );

  if (loading) {
    return <ChartLoadingState />;
  }

  if (error) {
    return <ChartErrorState message={error} />;
  }

  if (!correlationData?.columns || correlationData.columns.length < 2) {
    return (
      <div className="empty-state">
        <h3>Not enough numeric metrics</h3>
        <p className="empty-subtext">
          Correlation needs at least two numeric columns in the dataset.
        </p>
      </div>
    );
  }

  if (!correlationData.matrix?.length) {
    return (
      <div className="empty-state">
        <h3>No rows at this drill level</h3>
        <p className="empty-subtext">
          Try going up a level or pick another chart type to drill down.
        </p>
      </div>
    );
  }

  return (
    <CorrelationChart
      columns={correlationData.columns}
      matrix={correlationData.matrix}
      title={title}
      height="100%"
      onChartReady={onChartReady}
    />
  );
}
