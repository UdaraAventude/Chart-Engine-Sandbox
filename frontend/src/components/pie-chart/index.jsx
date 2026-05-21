import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { PALETTE, CHART_THEME, buildTooltip } from "../_shared/chartTheme";
import "../_shared/charts.css";

const PieChart = ({
  data = [],
  title = "",
  innerRadius = "40%",
  outerRadius = "70%",
  showLegend = true,
  legendOrient = "vertical",
  height = "420px",
  palette = PALETTE,
  aggregation = "avg",
  isLeaf = false,
  metricName = "",
  onSliceClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!data?.length) return {};
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
        trigger: "item",
        formatter: (params) => {
          const d = data[params.dataIndex];
          const aggLabel = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          return buildTooltip({ name: d.name, aggLabel, value: d.value, count: d.count ?? "", isLeaf });
        },
      },
      legend: showLegend
        ? {
            orient: legendOrient,
            left: "left",
            top: "middle",
            type: "scroll",
            textStyle: { color: "#374151", fontSize: 11.5, fontFamily: "'Inter', sans-serif" },
            itemWidth: 10,
            itemHeight: 10,
            itemStyle: { borderRadius: 2 },
          }
        : { show: false },
      series: [
        {
          name: metricName || title,
          type: "pie",
          radius: [innerRadius, outerRadius],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: { show: false, position: "center" },
          emphasis: {
            itemStyle: { shadowBlur: 14, shadowColor: "rgba(0,0,0,0.18)" },
            label: { show: true, fontSize: 15, fontWeight: "700", color: "#111827" },
          },
          labelLine: { show: false },
          data: data.map((d, i) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: palette[i % palette.length] },
          })),
        },
      ],
      animationDuration: 700,
      animationEasing: "cubicOut",
    };
  }, [data, title, innerRadius, outerRadius, showLegend, legendOrient, palette, aggregation, isLeaf, metricName]);

  return (
    <ReactECharts
      opts={{ renderer: "svg" }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={onSliceClick ? { click: (p) => onSliceClick(p.name) } : {}}
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default PieChart;
