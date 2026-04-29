import React, { useMemo } from 'react';
import ScatterChart from '../../../../components/scatter-chart';
import { formatForChart } from '../../hooks/engine';

export default function ScatterAdapter({
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  currentColumn,
  title,
  handleClick,
  onChartReady
}) {
  const { rawData, xCol, yCol } = useMemo(() => {
    return formatForChart(currentNode, 'scatter', rows, drillPath, metrics, dimensions);
  }, [currentNode, rows, drillPath, metrics, dimensions]);

  return (
    <ScatterChart
      rawData={rawData}
      xCol={xCol}
      yCol={yCol}
      colorCol={currentColumn}
      title={title}
      height='100%'
      onPointClick={handleClick}
      onChartReady={onChartReady}
    />
  );
}
