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
  onChartReady
}) {
  const correlationData = useMemo(() => {
    return formatForChart(currentNode, 'correlation', rows, drillPath, metrics, dimensions);
  }, [currentNode, rows, drillPath, metrics, dimensions]);

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
