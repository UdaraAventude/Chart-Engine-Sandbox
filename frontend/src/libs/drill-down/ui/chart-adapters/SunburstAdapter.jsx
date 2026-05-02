import React, { useMemo } from "react";
import SunburstChart from "../../../../components/sunburst-chart";
import { formatForChart } from "../../hooks/engine";

export default function SunburstAdapter({
  currentNode,
  rows,
  drillPath,
  metrics,
  dimensions,
  title,
  handleClick,
  onChartReady,
  aggregation,
}) {
  const data = useMemo(() => {
    // console.log('Debug: currentNode:', currentNode);
    // console.log('Debug: rows:', rows);
    // console.log('Debug: drillPath:', drillPath);
    // console.log('Debug: metrics:', metrics);
    // console.log('Debug: dimensions:', dimensions);
    // console.log('Debug: aggregation:', aggregation);

    return formatForChart(
      currentNode,
      "sunburst",
      rows,
      drillPath,
      metrics,
      dimensions,
      30,
      aggregation,
    );
  }, [currentNode, rows, drillPath, metrics, dimensions, aggregation]);

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        Not enough data to render a Sunburst chart.
      </div>
    );
  }

  return (
    <SunburstChart
      data={data}
      title={title}
      height="100%"
      onSliceClick={handleClick}
      aggregationMethod={aggregation}
      onChartReady={onChartReady}
    />
  );
}
