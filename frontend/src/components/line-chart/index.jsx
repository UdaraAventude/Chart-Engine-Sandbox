import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { CHART_THEME, numFormatter } from '../_shared/chartTheme';

const LineChart = ({
  data = [],
  title = '',
  xAxisLabel = '',
  yAxisLabel = '',
  isLeaf = false,
  aggregationMethod = 'sum',
  smooth = true,
  color = '#185FA5',
  showArea = true,
  symbolSize = 8,
  lineWidth = 3,
  height = '420px',
  showDataZoom,
  onPointClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!data?.length) return {};
    const names = data.map((d) => d.name);
    const values = data.map((d) => d.value);
    const autoZoom =
      showDataZoom !== undefined ? showDataZoom : names.length > 15;

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
        trigger: 'axis',
        formatter: (params) => {
          const d = data[params[0].dataIndex];
          return `
            <div style="font-weight:bold;margin-bottom:4px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${d.name}</div>
            <div style="color:#374151">${aggregationMethod}: <span style="color:${color};font-weight:bold;">${d.value.toLocaleString()}</span></div>
            <div style="color:#374151">Records: <span style="color:#7c3aed">${d.count}</span></div>
            ${!isLeaf ? '<div style="margin-top:8px;color:#059669;font-size:11px;font-style:italic;">▲ Click to drill</div>' : ''}
          `;
        },
      },
      grid: { top: 60, bottom: 80, left: 80, right: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: names,
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: names.length > 8 ? 50 : 35,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: {
          ...CHART_THEME.axisLabel,
          rotate: names.length > 8 ? 30 : 0,
        },
        axisLine: CHART_THEME.axisLine,
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: 60,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: { ...CHART_THEME.axisLabel, formatter: numFormatter },
        splitLine: CHART_THEME.splitLine,
      },
      series: [
        {
          data: values,
          type: 'line',
          smooth,
          symbolSize,
          itemStyle: {
            color,
            borderColor: isLeaf ? '#d97706' : color,
            borderWidth: isLeaf ? 2 : 0,
          },
          lineStyle: { width: lineWidth, color },
          areaStyle: showArea
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: color + '4d' },
                  { offset: 1, color: color + '00' },
                ]),
              }
            : undefined,
          label: {
            show: data.length <= 12,
            position: 'top',
            color: '#6b7280',
            fontSize: 10,
            formatter: (params) => numFormatter(params.value),
          },
        },
      ],
      dataZoom: autoZoom
        ? [
            {
              type: 'slider',
              bottom: 5,
              height: 20,
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              fillerColor: 'rgba(24,95,165,0.12)',
              textStyle: { color: '#6b7280' },
            },
          ]
        : [],
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [
    data,
    title,
    xAxisLabel,
    yAxisLabel,
    isLeaf,
    aggregationMethod,
    smooth,
    color,
    showArea,
    symbolSize,
    lineWidth,
    showDataZoom,
  ]);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      onEvents={onPointClick ? { click: (p) => onPointClick(p.name) } : {}}
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default LineChart;
