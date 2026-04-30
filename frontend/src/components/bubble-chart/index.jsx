import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { PALETTE, CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

const BubbleChart = ({
  data = [],
  xCol = '',
  yCol = '',
  sizeCol = '',
  title = '',
  isLeaf = false,
  minBubbleSize = 12,
  maxBubbleSize = 80,
  height = '420px',
  palette = PALETTE,
  onBubbleClick,
  onChartReady,
}) => {
  const maxSize = useMemo(
    () => Math.max(...data.map((d) => d.size), 1),
    [data],
  );

  const option = useMemo(() => {
    if (!data?.length) return {};

    const series = data.map((d, i) => ({
      name: d.name,
      type: 'scatter',
      data: [[d.x, d.y, d.size, d.count]],
      symbolSize: (val) =>
        Math.max(
          minBubbleSize,
          Math.min(
            maxBubbleSize,
            (val[2] / maxSize) * (maxBubbleSize - minBubbleSize) +
              minBubbleSize,
          ),
        ),
      itemStyle: {
        color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
          { offset: 0, color: palette[i % palette.length] },
          { offset: 1, color: palette[i % palette.length] + '99' },
        ]),
        borderColor: isLeaf ? '#d97706' : palette[i % palette.length],
        borderWidth: isLeaf ? 2 : 1,
        opacity: 0.9,
      },
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        left: 'center',
        top: 12,
      },
      legend: {
        bottom: 10,
        left: 'center',
        textStyle: { color: '#374151' },
        type: 'scroll',
      },
      tooltip: {
        ...CHART_THEME.tooltipBase,
        formatter: (params) => {
          const d = data[params.seriesIndex];
          return `
            <div style="font-weight:bold;margin-bottom:4px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${d.name}</div>
            <div style="color:#374151">Avg ${xCol}: <span style="color:#185FA5">${d.x.toFixed(2)}</span></div>
            <div style="color:#374151">Avg ${yCol}: <span style="color:#185FA5">${d.y.toFixed(2)}</span></div>
            <div style="color:#374151">Sum ${sizeCol}: <span style="color:#059669;font-weight:bold;">${d.size.toLocaleString()}</span></div>
            <div style="color:#374151">Records: <span style="color:#7c3aed">${d.count}</span></div>
          `;
        },
      },
      grid: { top: 60, bottom: 60, left: 60, right: 40, containLabel: true },
      xAxis: {
        type: 'value',
        name: xCol.replace(/_/g, ' ').toUpperCase(),
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        axisLine: CHART_THEME.axisLine,
        splitLine: CHART_THEME.splitLine,
      },
      yAxis: {
        type: 'value',
        name: yCol.replace(/_/g, ' ').toUpperCase(),
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        axisLine: CHART_THEME.axisLine,
        splitLine: CHART_THEME.splitLine,
      },
      series,
    };
  }, [
    data,
    xCol,
    yCol,
    sizeCol,
    title,
    isLeaf,
    palette,
    maxSize,
    minBubbleSize,
    maxBubbleSize,
  ]);

  return (
    <ReactECharts opts={{ renderer: 'svg' }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={
        onBubbleClick ? { click: (p) => onBubbleClick(p.seriesName) } : {}
      }
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default BubbleChart;
