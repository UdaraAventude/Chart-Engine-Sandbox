import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import {
  CHART_THEME,
  numFormatter,
  buildTooltip,
} from "../_shared/chartTheme";
import "../_shared/charts.css";

const LineChart = ({
  data = [],
  title = "",
  xAxisLabel = "",
  yAxisLabel = "",
  isLeaf = false,
  aggregation = "avg",
  smooth = true,
  color = "#5b5bd6",
  showArea = true,
  symbolSize = 7,
  lineWidth = 2.5,
  height = "420px",
  showDataZoom,
  onPointClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!data?.length) return {};
    const names = data.map((d) => d.name);
    const values = data.map((d) => d.value);
    const autoZoom = showDataZoom !== undefined ? showDataZoom : names.length > 15;

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
          type: "line",
          smooth,
          symbolSize,
          symbol: "circle",
          itemStyle: {
            color,
            borderColor: "#fff",
            borderWidth: 2,
          },
          lineStyle: { width: lineWidth, color },
          areaStyle: showArea
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: color + "30" },
                  { offset: 1, color: color + "00" },
                ]),
              }
            : undefined,
          emphasis: {
            itemStyle: { borderWidth: 3, shadowBlur: 8, shadowColor: color + "60" },
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
  }, [data, title, xAxisLabel, yAxisLabel, isLeaf, aggregation, smooth, color, showArea, symbolSize, lineWidth, showDataZoom]);

  return (
    <ReactECharts
      opts={{ renderer: "svg" }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={onPointClick ? { click: (p) => onPointClick(p.name) } : {}}
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default LineChart;
