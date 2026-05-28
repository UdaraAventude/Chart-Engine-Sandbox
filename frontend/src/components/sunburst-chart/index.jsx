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
          const aggLabel = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          return `
            <div style="font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;padding-bottom:5px;margin-bottom:5px;">${params.name}</div>
            <div style="color:#374151">${aggLabel}: <span style="color:#5b5bd6;font-weight:700">${params.value?.toLocaleString()}</span></div>
          `;
        },
      },
      series: [
        {
          name: `${aggregation.toUpperCase()} OF ${measureCol.toUpperCase()}`,
          type: "sunburst",
          data: processedData,
          animation: true,
          animationDuration: 450,
          animationDurationUpdate: 320,
          animationEasing: "cubicOut",
          animationEasingUpdate: "cubicOut",
          radius: [0, "78%"],
          center: ["50%", "54%"],
          sort: "desc",
          nodeClick: "rootToNode",
          label: { show: false },
          emphasis: {
            focus: "none",
            itemStyle: { shadowBlur: 12, shadowColor: "rgba(91,91,214,0.25)" },
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
                color: "#9ca3af",
              },
              itemStyle: { color: "#f3f4f6", opacity: 1 },
            },
            {
              r0: "15%",
              r: "35%",
              label: {
                show: true,
                rotate: "radial",
                fontSize: 11,
                fontWeight: "700",
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

  useEffect(() => {
    if (clickedInternally.current) {
      clickedInternally.current = false;
      return;
    }
    if (!echartsRef.current) return;
    const chart = echartsRef.current.getEchartsInstance();
    const targetNodeId =
      drillPath.length > 0 ? drillPath.map((p) => p.value).join("/") : null;
    chart.dispatchAction({ type: "sunburstRootToNode", targetNodeId });
  }, [drillPath]);

  const handleChartReady = (chartInstance) => {
    const path = drillPathRef.current;
    const targetNodeId =
      path.length > 0 ? path.map((p) => p.value).join("/") : null;
    setTimeout(() => {
      chartInstance.dispatchAction({ type: "sunburstRootToNode", targetNodeId });
    }, 50);
    if (onChartReady) onChartReady(chartInstance);
  };

  return (
    <div style={{ position: "relative", height }}>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", letterSpacing: -0.2 }}>
          {drillPath.length === 0
            ? "Data Explorer"
            : "Data Explorer › " + drillPath.map((p) => p.value).join(" › ")}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          {measureCol} ({aggregation}) · click arc to dive
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
            if (onNodeClick) onNodeClick(params.name, clickedDepth, treePathInfo);
          },
        }}
        onChartReady={handleChartReady}
        notMerge={false}
        lazyUpdate={true}
      />

      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 10,
          color: "#d1d5db",
          pointerEvents: "none",
        }}
      >
        ◎ Click center to drill back · Click arcs to dive deeper
      </div>
    </div>
  );
};

export default SunburstChart;
