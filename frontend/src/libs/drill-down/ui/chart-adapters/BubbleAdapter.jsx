import React, { useMemo } from 'react';
import BubbleChart from '../../../../components/bubble-chart';
import { formatForChart } from '../../hooks/engine';

export default function BubbleAdapter({
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  atLeaf,
  title,
  handleClick,
  onChartReady,
  aggregation
}) {
  const bubbleData = useMemo(() => {
    return formatForChart(currentNode, 'bubble', rows, drillPath, metrics, dimensions, 50, aggregation);
  }, [currentNode, rows, drillPath, metrics, dimensions, aggregation]);

  return (
    <BubbleChart
      data={bubbleData}
      xCol={metrics[0] ?? ''}
      yCol={metrics[1] ?? metrics[0] ?? ''}
      sizeCol={metrics[0] ?? ''}
      title={title}
      isLeaf={atLeaf}
      height='100%'
      onBubbleClick={handleClick}
      onChartReady={onChartReady}
    />
  );
}
