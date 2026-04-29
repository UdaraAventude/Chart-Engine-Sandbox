import React, { useMemo } from 'react';
import MultilineChart from '../../../../components/multiline-chart';
import { formatForChart } from '../../hooks/engine';

export default function MultilineAdapter({
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  categoricalDepth,
  title,
  handleClick,
  onChartReady
}) {
  const multiData = useMemo(() => {
    return formatForChart(currentNode, 'multiline', rows, drillPath, metrics, dimensions);
  }, [currentNode, rows, drillPath, metrics, dimensions]);

  const nextDimension = dimensions[categoricalDepth + 1] ?? '';

  if (!multiData.xAxisLabels || multiData.xAxisLabels.length === 0) {
    return (
      <div className='empty-state'>
        Not enough hierarchy depth to render a multi-line chart.
        Needs at least one more dimension level.
      </div>
    );
  }

  const xLabelMulti = nextDimension.replace(/_/g, ' ').toUpperCase();
  const yLabelMulti = (metrics[0] || '').replace(/_/g, ' ').toUpperCase();

  return (
    <MultilineChart
      quarters={multiData.xAxisLabels}
      series={multiData.series}
      title={title}
      xAxisLabel={xLabelMulti}
      yAxisLabel={yLabelMulti}
      height='100%'
      onSeriesClick={handleClick}
      onChartReady={onChartReady}
    />
  );
}
