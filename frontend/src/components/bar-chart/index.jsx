import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import {
  PALETTE,
  CHART_THEME,
  numFormatter,
  buildTooltip,
} from "../_shared/chartTheme";
import "../_shared/charts.css";

const BarChart = ({
  data = [],
  title = "",
  xAxisLabel = "",
  yAxisLabel = "",
  isLeaf = false,
  aggregation = "avg",
  height = "420px",
  palette = PALETTE,
  showDataZoom,
  barBorderRadius = [6, 6, 0, 0],
  onBarClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!data?.length) return {};
    const names = data.map((d) => d.name);
    const values = data.map((d) => d.value);
    const autoZoom = showDataZoom !== undefined ? showDataZoom : names.length > 15;

    const baseColor = palette[0]; // "#5b5bd6"

    // Wider bars for fewer categories, narrower for many
    const dynamicMaxWidth = Math.max(16, Math.min(120, Math.round(560 / names.length)));

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
        trigger: "axis",
        formatter: (params) => {
          const d = data[params[0].dataIndex];
          const aggLabel = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          return buildTooltip({ name: d.name, aggLabel, value: d.value, count: d.count, isLeaf });
        },
      },
      grid: { top: 56, bottom: autoZoom ? 74 : 56, left: 72, right: 32, containLabel: true },
      xAxis: {
        type: "category",
        data: names,
        name: xAxisLabel,
        nameLocation: "middle",
        nameGap: names.length > 8 ? 50 : 34,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: { ...CHART_THEME.axisLabel, rotate: names.length > 8 ? 30 : 0 },
        axisLine: CHART_THEME.axisLine,
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        name: yAxisLabel,
        nameLocation: "middle",
        nameGap: 56,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: { ...CHART_THEME.axisLabel, formatter: numFormatter },
        axisLine: { show: false },
        splitLine: CHART_THEME.splitLine,
      },
      series: [
        {
          name: yAxisLabel,
          data: values,
          type: "bar",
          barMaxWidth: dynamicMaxWidth,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: baseColor },
              { offset: 1, color: baseColor + "55" },
            ]),
            borderRadius: barBorderRadius,
            borderColor: isLeaf ? "#f59e0b" : "transparent",
            borderWidth: isLeaf ? 2 : 0,
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#818cf8" },
                { offset: 1, color: "#818cf855" },
              ]),
            },
          },
          label: {
            show: data.length <= 14,
            position: "top",
            color: "#9ca3af",
            fontSize: 10,
            fontWeight: "600",
            formatter: (params) => numFormatter(params.value),
          },
        },
      ],
      dataZoom: autoZoom
        ? [{ ...CHART_THEME.dataZoomSlider }]
        : [],
      animationDuration: 700,
      animationEasing: "cubicOut",
    };
  }, [data, title, xAxisLabel, yAxisLabel, isLeaf, aggregation, palette, showDataZoom, barBorderRadius]);

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

export default BarChart;
