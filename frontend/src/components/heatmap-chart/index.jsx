import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { CHART_THEME } from "../_shared/chartTheme";
import "../_shared/charts.css";

const HeatmapChart = ({
  xCategories = [],
  yCategories = [],
  cells = [],
  xCol = "",
  yCol = "",
  measureCol = "",
  title = "",
  isLeaf = false,
  colorRange = ["#ede9fe", "#a5b4fc", "#818cf8", "#5b5bd6", "#3730a3"],
  showCellLabels,
  height = "420px",
  aggregation = "avg",
  onCellClick,
  onChartReady,
}) => {
  const maxVal = useMemo(
    () => Math.max(...cells.map((c) => c.value).filter((v) => v !== 0), 100),
    [cells],
  );

  const option = useMemo(() => {
    if (!xCategories.length) return {};
    const autoLabels =
      showCellLabels !== undefined ? showCellLabels : cells.length <= 64;
    const values = cells.map((c) => [c.x, c.y, c.value]);

    return {
      backgroundColor: "transparent",
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        left: "center",
        top: 12,
      },
      tooltip: {
        ...CHART_THEME.tooltipBase,
        position: "top",
        formatter: (params) => {
          const c = cells.find(
            (cell) => cell.x === params.data[0] && cell.y === params.data[1],
          );
          if (!c) return "";
          const aggLabel = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          return `
            <div style="font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;padding-bottom:5px;margin-bottom:5px;">Cell Detail</div>
            <div style="color:#374151">${xCol}: <span style="color:#5b5bd6;font-weight:600">${c.xLabel}</span></div>
            <div style="color:#374151">${yCol}: <span style="color:#5b5bd6;font-weight:600">${c.yLabel}</span></div>
            <div style="color:#374151">${aggLabel}: <span style="color:#10b981;font-weight:700">${c.value.toFixed(2)}</span></div>
            <div style="color:#374151">Count: <span style="color:#8b5cf6;font-weight:600">${c.count}</span></div>
          `;
        },
      },
      grid: { top: 60, bottom: 80, left: 80, right: 40 },
      xAxis: {
        type: "category",
        data: xCategories,
        name: xCol.replace(/_/g, " ").toUpperCase(),
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: { ...CHART_THEME.axisLabel, rotate: 30 },
        splitArea: {
          show: true,
          areaStyle: { color: ["rgba(0,0,0,0.02)", "rgba(0,0,0,0)"] },
        },
      },
      yAxis: {
        type: "category",
        data: yCategories,
        name: measureCol.replace(/_/g, " ").toUpperCase(),
        nameLocation: "middle",
        nameGap: 60,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        splitArea: {
          show: true,
          areaStyle: { color: ["rgba(0,0,0,0.02)", "rgba(0,0,0,0)"] },
        },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        inRange: { color: colorRange },
        textStyle: { color: "#374151" },
      },
      series: [
        {
          name: "Heatmap",
          type: "heatmap",
          data: values,
          label: {
            show: autoLabels,
            formatter: (params) =>
              params.data[2] > 0 ? params.data[2].toFixed(1) : "",
            color: "#ffffff",
            fontSize: 10,
          },
        },
      ],
    };
  }, [
    xCategories,
    yCategories,
    cells,
    xCol,
    yCol,
    measureCol,
    title,
    maxVal,
    colorRange,
    showCellLabels,
  ]);

  return (
    <ReactECharts
      opts={{ renderer: "svg" }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={
        onCellClick
          ? {
              click: (p) =>
                onCellClick(
                  p.data[0],
                  cells.find((c) => c.x === p.data[0] && c.y === p.data[1]),
                ),
            }
          : {}
      }
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default HeatmapChart;
