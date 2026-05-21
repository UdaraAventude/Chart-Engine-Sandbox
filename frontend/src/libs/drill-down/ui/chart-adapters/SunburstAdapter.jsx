import React from "react";
import SunburstChart from "../../../../components/sunburst-chart";
import { useSunburstTreeData } from "../../hooks/useSunburstTreeData";
import { ChartLoadingState, ChartErrorState } from "../chart-panel-state";

export default function SunburstAdapter({
  drillPath,
  metrics,
  dimensions = [],
  onChartReady,
  aggregation,
  drillBackTo,
  drillToPath,
}) {
  const { data, loading, error } = useSunburstTreeData(aggregation, metrics);

  if (loading) {
    return <ChartLoadingState />;
  }

  if (error) {
    return <ChartErrorState message={error} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        Not enough data to render a Sunburst chart.
      </div>
    );
  }

  const handleNodeClick = (_name, clickedDepth, treePathInfo) => {
    const newSteps = [];
    for (let d = 1; d <= clickedDepth; d++) {
      const entry = treePathInfo[d];
      if (!entry?.name) break;
      const column = dimensions[d - 1];
      if (!column) break;
      newSteps.push({ column, value: entry.name });
    }
    if (newSteps.length > 0 && drillToPath) {
      drillToPath(newSteps);
    }
  };

  return (
    <SunburstChart
      data={data}
      measureCol={metrics[0]}
      drillPath={drillPath}
      height="100%"
      onNodeClick={handleNodeClick}
      onCenterClick={() => {
        if (drillPath.length > 0 && drillBackTo) {
          drillBackTo(drillPath.length - 1);
        }
      }}
      onChartReady={onChartReady}
      aggregation={aggregation}
    />
  );
}
