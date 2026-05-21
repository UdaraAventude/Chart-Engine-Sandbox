import React, { useMemo } from 'react';
import HistogramChart from '../../../../components/histogram-chart';
import { computeHistogramBins, filterRows } from '../../hooks/engine';
import { useRowSampleRows } from '../../hooks/useRowSampleRows';
import { ChartLoadingState, ChartErrorState } from '../chart-panel-state';

export default function HistogramAdapter({
  drillPath,
  metrics,
  atLeaf,
  canDrillDown,
  title,
  onChartReady,
  drillInto,
  aggregation = 'count',
}) {
  const histMetric = metrics[0] ?? '';
  const alreadyInHistBin = drillPath.some(
    (step) => step.column === `__hist__${histMetric}`,
  );

  const { rows: effectiveRows, loading, error } = useRowSampleRows(drillPath, true);

  const canDrillBins =
    (canDrillDown ?? !atLeaf) && !alreadyInHistBin && Boolean(histMetric);

  const histogramBins = useMemo(() => {
    if (!effectiveRows.length || !histMetric) return null;
    return computeHistogramBins(
      effectiveRows,
      drillPath,
      histMetric,
      filterRows,
      20,
      aggregation,
    );
  }, [effectiveRows, drillPath, histMetric, aggregation]);

  if (loading) {
    return <ChartLoadingState />;
  }

  if (error) {
    return <ChartErrorState message={error} />;
  }

  if (!histogramBins?.labels?.length) {
    return (
      <div className="empty-state">
        No numeric data available for histogram.
      </div>
    );
  }

  const handleBinClick = (label) => {
    if (!canDrillBins || !drillInto) return;
    const binIdx = histogramBins.labels.indexOf(label);
    if (binIdx === -1) return;
    drillInto(label, `__hist__${histMetric}`);
  };

  return (
    <HistogramChart
      labels={histogramBins.labels}
      counts={histogramBins.counts}
      columnName={histMetric}
      title={title}
      height="100%"
      onBarClick={canDrillBins ? handleBinClick : undefined}
      onChartReady={onChartReady}
    />
  );
}
