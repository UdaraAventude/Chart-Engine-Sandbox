import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { CHART_THEME } from "../_shared/chartTheme";
import "../_shared/charts.css";

const CorrelationChart = ({
  columns = [],
  matrix = [],
  title = "",
  colorRange = ["#ef4444", "#f8f8ff", "#5b5bd6"],
  showLabels,
  height = "420px",
  onCellClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!columns.length || !matrix.length) return {};
    const autoLabels = showLabels !== undefined ? showLabels : columns.length <= 15;

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
        formatter: (p) => `
          <div style="font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;padding-bottom:5px;margin-bottom:5px;">Correlation</div>
          <div style="color:#374151"><b>${p.data.x}</b></div>
          <div style="color:#374151">vs <b>${p.data.y}</b></div>
          <div style="margin-top:4px;color:#5b5bd6;font-weight:700;font-size:14px;">${p.data.value}</div>
        `,
      },
      grid: { top: 60, bottom: 80, left: 120, right: 40 },
      xAxis: {
        type: "category",
        data: columns,
        axisLabel: { ...CHART_THEME.axisLabel, rotate: 35 },
        axisLine: CHART_THEME.axisLine,
        axisTick: { show: false },
      },
      yAxis: {
        type: "category",
        data: columns,
        axisLabel: CHART_THEME.axisLabel,
        axisLine: CHART_THEME.axisLine,
        axisTick: { show: false },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        inRange: { color: colorRange },
        textStyle: { color: "#6b7280", fontSize: 11 },
        borderColor: "#e5e7eb",
        borderWidth: 1,
        borderRadius: 8,
        padding: [8, 12],
      },
      series: [
        {
          type: "heatmap",
          data: matrix.map((m) => ({
            value: [columns.indexOf(m.x), columns.indexOf(m.y), m.value],
            x: m.x,
            y: m.y,
          })),
          label: {
            show: autoLabels,
            formatter: (p) => p.data.value,
            color: "#374151",
            fontSize: 10,
            fontWeight: "600",
          },
          itemStyle: { borderRadius: 2 },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.15)" } },
        },
      ],
    };
  }, [columns, matrix, title, colorRange, showLabels]);

  return (
    <ReactECharts
      opts={{ renderer: "svg" }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={
        onCellClick
          ? { click: (p) => onCellClick(p.data?.x, p.data?.y, p.data?.value) }
          : {}
      }
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default CorrelationChart;
