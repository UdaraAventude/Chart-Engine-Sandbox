import React, { useMemo, useRef, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { SUNBURST_PALETTE, CHART_THEME } from "../_shared/chartTheme";
import "../_shared/charts.css";

const SunburstChart = ({
  data = [],
  measureCol = "",
  aggregation = "avg",
  drillPath = [],
  height = "500px",
  palette = SUNBURST_PALETTE,
  onNodeClick,
  onCenterClick,
  onChartReady,
}) => {
  const echartsRef = useRef(null);

  const clickedInternally = useRef(false);

  const drillPathRef = useRef(drillPath);
  useEffect(() => {
    drillPathRef.current = drillPath;
  }, [drillPath]);

  const processedData = useMemo(() => {
    const updateNodes = (nodes) =>
      nodes.map((node) => {
        const newNode = { ...node };
        if (Array.isArray(node.children) && node.children.length > 0) {
          newNode.children = updateNodes(node.children);
          delete newNode.value;
        }
        return newNode;
      });

    let processed = updateNodes(data || []);
    while (processed.length === 1 && processed[0].children?.length > 0) {
      processed = processed[0].children;
    }
    processed.forEach((node, i) => {
      node.itemStyle = { color: palette[i % palette.length] };
    });
    return processed;
  }, [data, palette]);

  const option = useMemo(() => {
    if (!processedData.length) return {};
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...CHART_THEME.tooltipBase,
        trigger: "item",
        formatter: (params) => {
          const aggLabel =
            aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          return `<b>${params.name}</b><br/>${aggLabel}: ${params.value?.toLocaleString()}`;
        },
      },
      series: [
        {
          name: `${aggregation.toUpperCase()} OF ${measureCol.toUpperCase()}`,
          type: "sunburst",
          data: processedData,
          radius: [0, "88%"],
          center: ["50%", "52%"],
          sort: "desc",
          nodeClick: "rootToNode",
          label: { show: false },
          emphasis: {
            focus: "ancestor",
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" },
            label: { show: true },
          },
          levels: [
            {
              r0: 0,
              r: "15%",
              label: {
                show: true,
                formatter: "◎",
                fontSize: 16,
                color: "#6b7280",
              },
              itemStyle: { color: "#ffffff", opacity: 0.8 },
            },
            {
              r0: "15%",
              r: "35%",
              label: {
                show: true,
                rotate: "radial",
                fontSize: 11,
                fontWeight: "600",
                color: "#111827",
                minAngle: 8,
                overflow: "truncate",
              },
              itemStyle: { borderWidth: 2, borderColor: "#ffffff" },
            },
            {
              r0: "35%",
              r: "70%",
              label: {
                show: true,
                rotate: "radial",
                fontSize: 10,
                color: "#374151",
                minAngle: 10,
                overflow: "truncate",
              },
              itemStyle: { borderWidth: 1.5, borderColor: "#ffffff" },
            },
            {
              r0: "70%",
              r: "72%",
              label: {
                show: false,
                position: "outside",
                padding: 3,
                fontSize: 9,
                minAngle: 5,
              },
              itemStyle: { borderWidth: 1, borderColor: "#ffffff" },
            },
          ],
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedData, measureCol, aggregation]);

  const dispatchZoom = (chart, path) => {
    const targetNodeId =
      path.length > 0 ? path.map((p) => p.value).join("/") : null;
    chart.dispatchAction({ type: "sunburstRootToNode", targetNodeId });
  };

  useEffect(() => {
    if (clickedInternally.current) {
      clickedInternally.current = false;
      return;
    }
    if (!echartsRef.current) return;
    const chart = echartsRef.current.getEchartsInstance();
    dispatchZoom(chart, drillPath);
  }, [drillPath]);

  const handleChartReady = (chartInstance) => {
    const path = drillPathRef.current;
    if (path.length > 0) {
      setTimeout(() => dispatchZoom(chartInstance, path), 50);
    }
    if (onChartReady) onChartReady(chartInstance);
  };

  return (
    <div style={{ position: "relative", height }}>
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1e293b",
            letterSpacing: 0.2,
          }}
        >
          {drillPath.length === 0
            ? "Data Explorer"
            : "Data Explorer › " + drillPath.map((p) => p.value).join(" › ")}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
          {measureCol} ({aggregation}) • click arc to dive
        </div>
      </div>

      <ReactECharts
        ref={echartsRef}
        opts={{ renderer: "svg" }}
        option={option}
        className="echarts-wrapper"
        style={{ height: "100%", width: "100%" }}
        onEvents={{
          click: (params) => {
            const treePathInfo = params.treePathInfo ?? [];
            const clickedDepth = treePathInfo.length - 1;

            if (clickedDepth <= 0 || params.dataIndex === undefined) {
              if (onCenterClick) onCenterClick();
              return;
            }

            clickedInternally.current = true;

            if (onNodeClick) {
              onNodeClick(params.name, clickedDepth, treePathInfo);
            }
          },
        }}
        onChartReady={handleChartReady}
        notMerge={false}
      />

      {/* ── Bottom hint ── */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 10,
          color: "#9ca3af",
          pointerEvents: "none",
        }}
      >
        ◎ Click center to drill back • Click arcs to dive
      </div>
    </div>
  );
};

export default SunburstChart;
