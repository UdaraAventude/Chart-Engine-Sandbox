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
  drillBackTo,
  tree,
}) {
  const data = useMemo(() => {
    return formatForChart(
      tree,
      "sunburst",
      rows,
      drillPath,
      metrics,
      dimensions,
      200,
      aggregation,
    );
  }, [tree, rows, drillPath, metrics, dimensions, aggregation]);

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
      measureCol={metrics[0]}
      drillPath={drillPath}
      title={title}
      height="100%"
      onNodeClick={handleClick}
      onCenterClick={() => {
        if (drillPath.length > 0) {
          drillBackTo(drillPath.length - 1);
        }
      }}
      onChartReady={onChartReady}
      aggregation={aggregation}
    />
  );
}
