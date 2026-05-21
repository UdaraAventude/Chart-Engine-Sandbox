import React, { useMemo } from 'react';
import BarChart from '../../../../components/bar-chart';
import PieChart from '../../../../components/pie-chart';
import LineChart from '../../../../components/line-chart';
import { formatForChart } from '../../hooks/engine';
import { AGGREGATION_OPTIONS } from '../../hooks/engine/aggregation';

export default function StandardAdapter({
  chartType,
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  currentColumn,
  atLeaf,
  title,
  handleClick,
  onChartReady,
  aggregation,
  serverNormalized,
}) {
  const data = useMemo(() => {
    if (serverNormalized) return serverNormalized;
    return formatForChart(currentNode, chartType, rows, drillPath, metrics, dimensions, undefined, aggregation);
  }, [serverNormalized, currentNode, chartType, rows, drillPath, metrics, dimensions, aggregation]);

  const xLabel = (currentColumn || '').replace(/_/g, ' ').toUpperCase();
  
  const aggObj = AGGREGATION_OPTIONS.find(o => o.value === aggregation);
  const aggLabel = aggObj ? aggObj.label.toUpperCase() : aggregation.toUpperCase();
  const yLabel = `${aggLabel} OF ${(metrics[0] || '').replace(/_/g, ' ').toUpperCase()}`;

  if (chartType === 'pie') {
    return (
      <PieChart
        data={data}
        title={title}
        metricName={yLabel}
        height='100%'
        onSliceClick={handleClick}
        onChartReady={onChartReady}
        aggregation={aggregation}
      />
    );
  }

  if (chartType === 'line') {
    return (
      <LineChart
        data={data}
        title={title}
        xAxisLabel={xLabel}
        yAxisLabel={yLabel}
        isLeaf={atLeaf}
        height='100%'
        onPointClick={handleClick}
        onChartReady={onChartReady}
        aggregation={aggregation}
      />
    );
  }

  return (
    <BarChart
      data={data}
      title={title}
      xAxisLabel={xLabel}
      yAxisLabel={yLabel}
      isLeaf={atLeaf}
      height='100%'
      onBarClick={handleClick}
      onChartReady={onChartReady}
      aggregation={aggregation}
    />
  );
}
