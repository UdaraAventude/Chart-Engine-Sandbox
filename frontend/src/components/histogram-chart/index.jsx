import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

/**
 * HistogramChart — ECharts distribution bar chart
 *
 * Props:
 *   labels       {string[]}  — bin labels, e.g. "0 – 10k"
 *   counts       {number[]}  — frequency per bin
 *   columnName   {string}    — column being distributed (used in axis label & subtitle)
 *   title        {string}
 *   color        {string}    — bar gradient base colour, default "#7c3aed"
 *   barWidth     {string}    — default "90%"
 *   height       {string}    — CSS height, default "420px"
 *   onBarClick   {(label:string)=>void}
 *   onChartReady {()=>void}
 */
const HistogramChart = ({
  labels = [],
  counts = [],
  columnName = '',
  title = '',
  color = '#7c3aed',
  barWidth = '90%',
  height = '420px',
  onBarClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!labels.length) return {};
    return {
      backgroundColor: 'transparent',
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        subtext: columnName ? `Distribution of ${columnName}` : '',
        left: 'center',
        top: 12,
      },
      tooltip: { ...CHART_THEME.tooltipBase, trigger: 'axis' },
      grid: { top: 70, bottom: 60, left: 60, right: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        name: columnName.replace(/_/g, ' ').toUpperCase(),
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: { ...CHART_THEME.axisLabel, rotate: 20 },
        axisLine: CHART_THEME.axisLine,
      },
      yAxis: {
        type: 'value',
        name: 'FREQUENCY',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        splitLine: CHART_THEME.splitLine,
      },
      series: [
        {
          data: counts,
          type: 'bar',
          barWidth,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color },
              { offset: 1, color: color + '66' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [labels, counts, columnName, title, color, barWidth]);

  return (
    <ReactECharts opts={{ renderer: 'svg' }}
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
