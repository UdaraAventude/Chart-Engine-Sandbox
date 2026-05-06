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
  drillInto,
  aggregation = 'count',
}) {
  // Prevent recursive histogram drilling for the same metric
  const histMetric = metrics[0] ?? '';
  const alreadyInHistBin = drillPath.some(
    (step) => step.column === `__hist__${histMetric}`
  );

  // Treat as leaf if already inside a histogram bin for this metric
  const canDrillFurther = !atLeaf && !alreadyInHistBin && !!currentColumn;

  const histogramBins = useMemo(() => {
    if (!rows.length || !metrics.length) return null;
    return computeHistogramBins(rows, drillPath, metrics[0], filterRows, 20, aggregation);
  }, [rows, drillPath, metrics, aggregation]);

  if (!histogramBins || !histogramBins.labels.length) {
    return <div className='empty-state'>No numeric data available for histogram.</div>;
  }

  const handleBinClick = (label) => {
    if (!canDrillFurther) return;
    const binIdx = histogramBins.labels.indexOf(label);
    if (binIdx === -1) return;

    // Use numeric boundaries to avoid precision loss from re-parsing labels
  const lo = histogramBins.binEdges[binIdx];
    const hi = histogramBins.binEdges[binIdx + 1];
    // Store boundaries in step meta for accurate filtering
    drillInto(label, `__hist__${metrics[0]}`, { lo, hi });
  };

  return (
    <HistogramChart
      labels={histogramBins.labels}
      counts={histogramBins.counts}
      columnName={metrics[0]}
      title={title}
      height='100%'
      onBarClick={canDrillFurther ? handleBinClick : undefined}
      onChartReady={onChartReady}
    />
  );
}
