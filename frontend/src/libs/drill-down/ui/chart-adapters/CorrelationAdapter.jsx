import React, { useMemo } from 'react';
import CorrelationChart from '../../../../components/correlation-chart';
import { formatForChart } from '../../hooks/engine';

export default function CorrelationAdapter({
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  title,
  onChartReady,
  serverNormalized,
}) {
  const correlationData = useMemo(() => {
    if (serverNormalized?.columns) return serverNormalized;
    if (serverNormalized?.rawData) {
      return { columns: metrics?.slice(0, 2) ?? [], matrix: [[1, 0], [0, 1]] };
    }
    return formatForChart(currentNode, 'correlation', rows, drillPath, metrics, dimensions);
  }, [serverNormalized, currentNode, rows, drillPath, metrics, dimensions]);

  if (!correlationData.columns || correlationData.columns.length < 2) {
    return (
      <div className='empty-state'>
        Not enough numeric metrics to render a correlation chart.
        Needs at least two numeric columns.
      </div>
    );
  }

  return (
    <CorrelationChart
      columns={correlationData.columns}
      matrix={correlationData.matrix}
      title={title}
      height='100%'
      onChartReady={onChartReady}
    />
  );
}
