import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { PALETTE, CHART_THEME } from "../_shared/chartTheme";
import "../_shared/charts.css";

const ScatterChart = ({
  rawData = [],
  xCol,
  yCol,
  colorCol = "",
  title = "",
  maxPoints = 5000,
  maxGroups = 15,
  symbolSize = 5,
  opacity = 0.75,
  height = "420px",
  palette = PALETTE,
  onPointClick,
  onChartReady,
}) => {
  const series = useMemo(() => {
    if (!rawData?.length || !xCol || !yCol) return [];
    const limited = rawData.slice(0, maxPoints);

    if (colorCol) {
      const groups = {};
      limited.forEach((r) => {
        const k = String(r[colorCol] ?? "");
        if (!k) return;
        if (!groups[k]) groups[k] = [];
        groups[k].push([Number(r[xCol]), Number(r[yCol])]);
      });
      const keys = Object.keys(groups);
      if (keys.length > 0 && keys.length <= maxGroups) {
        return keys.map((key, i) => ({
          name: key,
          type: "scatter",
          data: groups[key],
          symbolSize,
          itemStyle: { color: palette[i % palette.length], opacity },
          animation: false,
        }));
      }
    }

    return [
      {
        type: "scatter",
        data: limited.map((r) => [Number(r[xCol]), Number(r[yCol])]),
        symbolSize,
        itemStyle: { color: palette[0], opacity },
        animation: false,
      },
    ];
  }, [rawData, xCol, yCol, colorCol, maxPoints, maxGroups, symbolSize, opacity, palette]);

  const option = useMemo(() => {
    if (!series.length) return {};
    return {
      backgroundColor: "transparent",
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        left: "center",
        top: 12,
      },
      legend: series.length > 1
        ? { type: "scroll", bottom: 32, textStyle: { color: "#374151", fontSize: 11 } }
        : { show: false },
      tooltip: {
        ...CHART_THEME.tooltipBase,
        formatter: (params) => `
          <div style="color:#374151">${xCol}: <span style="color:#5b5bd6;font-weight:700">${params.data[0]}</span></div>
          <div style="color:#374151">${yCol}: <span style="color:#10b981;font-weight:700">${params.data[1]}</span></div>
          ${params.seriesName && params.seriesName !== "scatter" ? `<div style="color:#6b7280;margin-top:3px;">${colorCol}: ${params.seriesName}</div>` : ""}
        `,
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        { type: "inside", yAxisIndex: 0 },
        {
          ...CHART_THEME.dataZoomSlider,
          xAxisIndex: 0,
          bottom: series.length > 1 ? 56 : 8,
        },
      ],
      grid: {
        top: 56,
        bottom: series.length > 1 ? 80 : 52,
        left: 56,
        right: 32,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        name: (xCol || "").replace(/_/g, " ").toUpperCase(),
        nameLocation: "middle",
        nameGap: 32,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        splitLine: CHART_THEME.splitLine,
        axisLine: CHART_THEME.axisLine,
      },
      yAxis: {
        type: "value",
        name: (yCol || "").replace(/_/g, " ").toUpperCase(),
        nameLocation: "middle",
        nameGap: 48,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        splitLine: CHART_THEME.splitLine,
        axisLine: { show: false },
      },
      series,
    };
  }, [series, title, xCol, yCol, colorCol]);

  return (
    <ReactECharts
      opts={{ renderer: "svg" }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={onPointClick ? { click: (p) => onPointClick(p.seriesName) } : {}}
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default ScatterChart;
