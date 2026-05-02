import React, { useMemo } from "react";
import HeatmapChart from "../../../../components/heatmap-chart";
import { formatForChart } from "../../hooks/engine";

export default function HeatmapAdapter({
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  currentColumn,
  categoricalDepth,
  atLeaf,
  title,
  handleClick,
  onChartReady,
  aggregation,
}) {
  const heatData = useMemo(() => {
    return formatForChart(
      currentNode,
      "heatmap",
      rows,
      drillPath,
      metrics,
      dimensions,
      50,
      aggregation,
    );
  }, [currentNode, rows, drillPath, metrics, dimensions, aggregation]);

  const nextDimension = dimensions[categoricalDepth + 1] ?? "";

  if (
    !heatData.xCategories ||
    heatData.xCategories.length === 0 ||
    !heatData.yCategories ||
    heatData.yCategories.length === 0
  ) {
    return (
      <div className="empty-state">
        Not enough hierarchy depth to render a heatmap chart. Needs at least one
        more dimension level.
      </div>
    );
  }

  return (
    <HeatmapChart
      xCategories={heatData.xCategories}
      yCategories={heatData.yCategories}
      cells={heatData.cells}
      xCol={currentColumn}
      yCol={nextDimension}
      measureCol={metrics[0]}
      title={title}
      height="100%"
      onCellClick={
        !atLeaf ? (xIdx, cell) => handleClick(cell.xLabel) : undefined
      }
      aggregationMethod={aggregation}
      onChartReady={onChartReady}
    />
  );
}
