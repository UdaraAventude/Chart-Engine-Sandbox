import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

const CorrelationChart = ({
  columns = [],
  matrix = [],
  title = '',
  colorRange = ['#dc2626', '#ffffff', '#185FA5'],
  showLabels,
  height = '420px',
  onCellClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!columns.length || !matrix.length) return {};
    const autoLabels =
      showLabels !== undefined ? showLabels : columns.length <= 15;

    return {
      backgroundColor: 'transparent',
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        left: 'center',
        top: 12,
      },
      tooltip: {
        ...CHART_THEME.tooltipBase,
        formatter: (p) =>
          `<b>${p.data.x}</b> & <b>${p.data.y}</b><br/>Correlation: ${p.data.value}`,
      },
      grid: { top: 60, bottom: 80, left: 120, right: 40 },
      xAxis: {
        type: 'category',
        data: columns,
        axisLabel: { ...CHART_THEME.axisLabel, rotate: 35 },
      },
      yAxis: {
        type: 'category',
        data: columns,
        axisLabel: CHART_THEME.axisLabel,
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 10,
        inRange: { color: colorRange },
      },
      series: [
        {
          type: 'heatmap',
          data: matrix.map((m) => ({
            value: [columns.indexOf(m.x), columns.indexOf(m.y), m.value],
            x: m.x,
            y: m.y,
          })),
          label: {
            show: autoLabels,
            formatter: (p) => p.data.value,
          },
        },
      ],
    };
  }, [columns, matrix, title, colorRange, showLabels]);

  return (
    <ReactECharts
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
