import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { CHART_THEME } from "../_shared/chartTheme";
import "../_shared/charts.css";

const HistogramChart = ({
  labels = [],
  counts = [],
  columnName = "",
  title = "",
  color = "#5b5bd6",
  barWidth = "90%",
  height = "420px",
  onBarClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!labels.length) return {};
    return {
      backgroundColor: "transparent",
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        subtext: columnName ? `Distribution of ${columnName}` : "",
        left: "center",
        top: 12,
      },
      tooltip: {
        ...CHART_THEME.tooltipBase,
        trigger: "axis",
        formatter: (params) => {
          const p = params[0];
          return `
            <div style="font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;padding-bottom:5px;margin-bottom:5px;">${p.name}</div>
            <div style="color:#374151">Frequency: <span style="color:#5b5bd6;font-weight:700">${p.value.toLocaleString()}</span></div>
          `;
        },
      },
      grid: { top: 70, bottom: 56, left: 56, right: 32, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        name: columnName.replace(/_/g, " ").toUpperCase(),
        nameLocation: "middle",
        nameGap: 38,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: { ...CHART_THEME.axisLabel, rotate: 20 },
        axisLine: CHART_THEME.axisLine,
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        name: "FREQUENCY",
        nameLocation: "middle",
        nameGap: 48,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        axisLine: { show: false },
        splitLine: CHART_THEME.splitLine,
      },
      series: [
        {
          name: "Frequency",
          data: counts,
          type: "bar",
          barWidth,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color },
              { offset: 1, color: color + "55" },
            ]),
            borderRadius: [5, 5, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#818cf8" },
                { offset: 1, color: "#818cf855" },
              ]),
            },
          },
        },
      ],
      animationDuration: 700,
      animationEasing: "cubicOut",
    };
  }, [labels, counts, columnName, title, color, barWidth]);

  return (
    <ReactECharts
      opts={{ renderer: "svg" }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={onBarClick ? { click: (p) => onBarClick(p.name) } : {}}
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default HistogramChart;
