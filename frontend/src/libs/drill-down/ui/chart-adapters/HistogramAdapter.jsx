import React, { useMemo } from 'react';
import HistogramChart from '../../../../components/histogram-chart';
import { computeHistogramBins, filterRows } from '../../hooks/engine';

export default function HistogramAdapter({
  rows,
  drillPath,
  metrics,
  currentColumn,
  atLeaf,
  title,
  onChartReady,
  drillInto
}) {
  const histogramBins = useMemo(() => {
    if (!rows.length || !metrics.length) return null;
    return computeHistogramBins(rows, drillPath, metrics[0], filterRows);
  }, [rows, drillPath, metrics]);

  if (!histogramBins || !histogramBins.labels.length) {
    return <div className='empty-state'>No numeric data available for histogram.</div>;
  }

  const handleBinClick = (label) => {
    if (atLeaf || !currentColumn) return;
    const binIdx = histogramBins.labels.indexOf(label);
    if (binIdx === -1) return;
    drillInto(label, `__hist__${metrics[0]}`);
  };

  return (
    <HistogramChart
      labels={histogramBins.labels}
      counts={histogramBins.counts}
      columnName={metrics[0]}
      title={title}
      height='100%'
      onBarClick={!atLeaf ? handleBinClick : undefined}
      onChartReady={onChartReady}
    />
  );
}
