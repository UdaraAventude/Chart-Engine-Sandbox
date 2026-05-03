import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PALETTE, CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

const PieChart = ({
  data = [],
  title = '',
  innerRadius = '40%',
  outerRadius = '70%',
  showLegend = true,
  legendOrient = 'vertical',
  height = '420px',
  palette = PALETTE,
  aggregation = 'avg',
  isLeaf = false,
  onSliceClick,
  onChartReady,
}) => {
  const option = useMemo(() => {
    if (!data?.length) return {};
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
        trigger: 'item',
        formatter: (params) => {
          const d = data[params.dataIndex];
          const aggLabel = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          return `
            <div style="font-weight:bold;margin-bottom:4px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${d.name}</div>
            <div style="color:#374151">${aggLabel}: <span style="color:#185FA5;font-weight:bold;">${d.value.toLocaleString()}</span></div>
            <div style="color:#374151">Records: <span style="color:#7c3aed">${d.count ?? ''}</span></div>
            ${!isLeaf ? '<div style="margin-top:8px;color:#059669;font-size:11px;font-style:italic;">▲ Click to drill</div>' : ''}
          `;
        },
      },
      legend: showLegend
        ? {
          orient: legendOrient,
          left: 'left',
          top: 'middle',
          textStyle: { color: '#374151' },
          type: 'scroll',
        }
        : { show: false },
      series: [
        {
          name: title,
          type: 'pie',
          radius: [innerRadius, outerRadius],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
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
    aggregation,
    isLeaf,
  ]);

  return (
    <ReactECharts opts={{ renderer: 'svg' }}
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
