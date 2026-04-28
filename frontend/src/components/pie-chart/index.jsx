import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PALETTE, CHART_THEME } from '../_shared/chartTheme';

const PieChart = ({
  data = [],
  title = '',
  innerRadius = '40%',
  outerRadius = '70%',
  showLegend = true,
  legendOrient = 'vertical',
  height = '420px',
  palette = PALETTE,
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
        formatter: '{b}: {c} ({d}%)',
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
  ]);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      onEvents={onSliceClick ? { click: (p) => onSliceClick(p.name) } : {}}
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default PieChart;
