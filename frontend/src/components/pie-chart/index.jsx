import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { PALETTE, CHART_THEME } from "../_shared/chartTheme";
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
  aggregationMethod = "avg", // ✅ added to props
  onSliceClick,
  onChartReady,
}) => {
  console.log("🥧 PieChart received aggregationMethod:", aggregationMethod); // ✅ now works

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
        formatter: (
          params, // ✅ changed from string to function
        ) =>
          `<b>${params.name}</b><br/>
           ${aggregationMethod}: <span style="color:#185FA5;font-weight:bold;">
           ${params.value?.toLocaleString()}</span>
           (${params.percent}%)`,
      },
      legend: showLegend
        ? {
            orient: legendOrient,
            left: "left",
            top: "middle",
            textStyle: { color: "#374151" },
            type: "scroll",
          }
        : { show: false },
      series: [
        {
          name: title,
          type: "pie",
          radius: [innerRadius, outerRadius],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
          label: { show: false, position: "center" },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold" } },
          labelLine: { show: false },
          data: data.map((d, i) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: palette[i % palette.length] },
          })),
        },
      ],
    };
  }, [
    data,
    title,
    innerRadius,
    outerRadius,
    showLegend,
    legendOrient,
    palette,
    aggregationMethod, // ✅ added to dependency array
  ]);

  return (
    <ReactECharts
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
