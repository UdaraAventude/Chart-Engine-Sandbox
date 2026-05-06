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
}) {
  // Always format from the full tree root — data never changes during drill.
  // ECharts manages zoom state internally via nodeClick: "rootToNode".
  const data = useMemo(() => {
    if (!tree) return [];
    return formatSunburstData(tree, 200, aggregation, metrics[0] ?? "");
  }, [tree, aggregation, metrics]);

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        Not enough data to render a Sunburst chart.
      </div>
    );
  }

  /**
   * Called when the user clicks any arc.
   *
   * We build the COMPLETE new drillPath from root → clicked node using
   * treePathInfo, then call drillToPath to atomically replace the entire path.
   *
   * This handles:
   *  - Forward drilling (clicking deeper arcs)
   *  - Sideways navigation (clicking a sibling arc)
   *  - Backward navigation (clicking an ancestor arc)
   *
   * treePathInfo index mapping:
   *   [0] = invisible root  (skip)
   *   [1] = depth-1 node    → dimensions[0]
   *   [2] = depth-2 node    → dimensions[1]
   */
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
