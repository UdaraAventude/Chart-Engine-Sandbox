import React, { useMemo } from "react";
import BarChart from "../../../../components/bar-chart";
import PieChart from "../../../../components/pie-chart";
import LineChart from "../../../../components/line-chart";
import { formatForChart } from "../../hooks/engine";

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
}) {
  const data = useMemo(() => {
    // pass `limit` as undefined and provide `aggregation` explicitly
    return formatForChart(
      currentNode,
      chartType,
      rows,
      drillPath,
      metrics,
      dimensions,
      undefined,
      aggregation,
    );
  }, [
    currentNode,
    chartType,
    rows,
    drillPath,
    metrics,
    dimensions,
    aggregation,
  ]);

  const xLabel = (currentColumn || "").replace(/_/g, " ").toUpperCase();
  const yLabel = (metrics[0] || "").replace(/_/g, " ").toUpperCase();

  if (chartType === "pie") {
    return (
      <PieChart
        data={data}
        title={title}
        height="100%"
        onSliceClick={handleClick}
        aggregationMethod={aggregation}
        onChartReady={onChartReady}
      />
    );
  }

  if (chartType === "line") {
    return (
      <LineChart
        data={data}
        title={title}
        xAxisLabel={xLabel}
        yAxisLabel={yLabel}
        isLeaf={atLeaf}
        height="100%"
        aggregationMethod={aggregation}
        onPointClick={handleClick}
        onChartReady={onChartReady}
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
      height="100%"
      aggregationMethod={aggregation}
      onBarClick={handleClick}
      onChartReady={onChartReady}
    />
  );
}
