import React, { useMemo } from "react";
import SunburstChart from "../../../../components/sunburst-chart";
import { formatSunburstData } from "../../hooks/engine/formatters/sunburstFormatter";

export default function SunburstAdapter({
  rows,
  drillPath,
  metrics,
  dimensions,
  title,
  onChartReady,
  aggregation,
  drillBackTo,
  drillToPath,
  tree,
  serverNormalized,
}) {
  const data = useMemo(() => {
    if (serverNormalized?.length) return serverNormalized;
    if (!tree) return [];
    return formatSunburstData(tree, 200, aggregation, metrics[0] ?? "");
  }, [serverNormalized, tree, aggregation, metrics]);

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        Not enough data to render a Sunburst chart.
      </div>
    );
  }

  const handleNodeClick = (name, clickedDepth, treePathInfo) => {
    const newSteps = [];
    for (let d = 1; d <= clickedDepth; d++) {
      const entry = treePathInfo[d];
      if (!entry || !entry.name) break;
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
        if (drillPath.length > 0) {
          drillBackTo(drillPath.length - 1);
        }
      }}
      onChartReady={onChartReady}
      aggregation={aggregation}
    />
  );
}
