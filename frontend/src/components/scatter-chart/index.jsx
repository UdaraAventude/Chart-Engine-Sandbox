import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PALETTE, CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

const ScatterChart = ({
  rawData = [],
  xCol,
  yCol,
  colorCol = '',
  title = '',
  maxPoints = 5000,
  maxGroups = 15,
  symbolSize = 5,
  opacity = 0.7,
  height = '420px',
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
        const k = String(r[colorCol]);
        if (!groups[k]) groups[k] = [];
        groups[k].push([r[xCol], r[yCol]]);
      });
      const keys = Object.keys(groups);
      if (keys.length > 0 && keys.length <= maxGroups) {
        return keys.map((key, i) => ({
          name: key,
          type: 'scatter',
          data: groups[key],
          symbolSize,
          itemStyle: { color: palette[i % palette.length], opacity },
          animation: false,
        }));
      }
    }

    return [
      {
        type: 'scatter',
        data: limited.map((r) => [r[xCol], r[yCol]]),
        symbolSize,
        itemStyle: { color: palette[0], opacity },
        animation: false,
      },
    ];
  }, [
    rawData,
    xCol,
    yCol,
    colorCol,
    maxPoints,
    maxGroups,
    symbolSize,
    opacity,
    palette,
  ]);

  const option = useMemo(() => {
    if (!series.length) return {};
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
        formatter: (params) => `
          <div style="color:#374151">${xCol}: <span style="color:#185FA5">${params.data[0]}</span></div>
          <div style="color:#374151">${yCol}: <span style="color:#059669">${params.data[1]}</span></div>
        `,
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'inside', yAxisIndex: 0 },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 10,
          height: 20,
          backgroundColor: '#f9fafb',
          borderColor: '#e5e7eb',
          fillerColor: 'rgba(24,95,165,0.12)',
          textStyle: { color: '#6b7280', fontSize: 10 },
        },
      ],
      grid: { top: 60, bottom: 60, left: 60, right: 40, containLabel: true },
      xAxis: {
        type: 'value',
        name: (xCol || '').replace(/_/g, ' ').toUpperCase(),
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        splitLine: CHART_THEME.splitLine,
      },
      yAxis: {
        type: 'value',
        name: (yCol || '').replace(/_/g, ' ').toUpperCase(),
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: CHART_THEME.axisNameStyle,
        axisLabel: CHART_THEME.axisLabel,
        splitLine: CHART_THEME.splitLine,
      },
      series,
    };
  }, [series, title, xCol, yCol]);

  return (
    <ReactECharts opts={{ renderer: 'svg' }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={
        onPointClick ? { click: (p) => onPointClick(p.seriesName) } : {}
      }
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default ScatterChart;
