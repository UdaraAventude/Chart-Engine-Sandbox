import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { PALETTE, CHART_THEME } from "../_shared/chartTheme";
import "../_shared/charts.css";

const MultilineChart = ({
  quarters = [],
  series = [],
  title = "",
  xAxisLabel = "QUARTER",
  yAxisLabel = "",
  smooth = true,
  showArea = true,
  symbolSize = 8,
  lineWidth = 3,
  height = "420px",
  palette = PALETTE,
  aggregation = "avg",
  onSeriesClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!quarters.length || !series.length) return {};
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
          const aggLabel =
            aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          let res = `<div style="font-weight:bold;margin-bottom:4px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${params[0].name}</div>`;
          params.forEach((item) => {
            res += `<div style="color:#374151">${item.marker} ${item.seriesName}: <span style="font-weight:bold;">${item.value.toLocaleString()}</span> (${aggLabel})</div>`;
          });
          return res;
        },
      },
      legend: {
        bottom: 10,
        left: "center",
        textStyle: { color: "#374151" },
        type: "scroll",
      },
      grid: { top: 60, bottom: 60, left: 60, right: 40, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: quarters,
        name: xAxisLabel,
        nameLocation: "middle",
        nameGap: 35,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        axisLine: CHART_THEME.axisLine,
      },
      yAxis: {
        type: "value",
        name: yAxisLabel,
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        splitLine: CHART_THEME.splitLine,
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: "line",
        smooth,
        data: s.data,
        symbolSize,
        lineStyle: { width: lineWidth, color: palette[i % palette.length] },
        itemStyle: { color: palette[i % palette.length] },
        areaStyle: showArea
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: palette[i % palette.length] + "44" },
                { offset: 1, color: palette[i % palette.length] + "00" },
              ]),
            }
          : undefined,
      })),
    };
  }, [
    quarters,
    series,
    title,
    xAxisLabel,
    yAxisLabel,
    smooth,
    showArea,
    symbolSize,
    lineWidth,
    palette,
    aggregation,
  ]);

  return (
    <ReactECharts
      opts={{ renderer: "svg" }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={
        onSeriesClick ? { click: (p) => onSeriesClick(p.seriesName) } : {}
      }
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default MultilineChart;
