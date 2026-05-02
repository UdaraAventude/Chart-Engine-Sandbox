import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SUNBURST_PALETTE, CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

const SunburstChart = ({
  data = [],
  measureCol = '',
  aggregationMethod = 'avg', // used only for tooltip label — values already resolved upstream
  title = '',
  drillPath = [],
  maxDepth = 4,
  height = '500px',
  palette = SUNBURST_PALETTE,
  onNodeClick,
  onCenterClick,
  onChartReady,
}) => {
  // Only assign colours — DO NOT recalculate values.
  // formatForChart already called resolveNodeValue(node, metric, aggregation)
  // so every node.value is correct for the chosen method (avg/sum/min/max/count).
  // Recalculating here was overwriting those values and breaking min/max entirely.
  console.log('🌞 SunburstChart received aggregationMethod:', aggregationMethod);
  const processedData = useMemo(() => {
    const assignColors = (nodes) =>
      nodes.map((node, i) => ({
        ...node,
        itemStyle: { color: palette[i % palette.length] },
        children: Array.isArray(node.children) && node.children.length > 0
          ? assignColors(node.children)
          : node.children,
      }));

    return assignColors(data || []);
  }, [data, palette]);

  const option = useMemo(() => {
    if (!processedData.length) return {};

    return {
      backgroundColor: 'transparent',
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        subtext: `${measureCol} (${aggregationMethod}) • click segment to drill`,
        left: 'center',
        top: 12,
      },
      tooltip: {
        ...CHART_THEME.tooltipBase,
        trigger: 'item',
        formatter: (params) =>
          `<b>${params.name}</b><br/>${aggregationMethod}: ${params.value?.toLocaleString()}`,
      },
      series: [
        {
          type: 'sunburst',
          data: processedData,
          radius: ['15%', '90%'],
          center: ['50%', '52%'],
          sort: 'desc',
          emphasis: {
            focus: 'ancestor',
            itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.15)' },
          },
          levels: [
            {},
            {
              r0: '15%',
              r:
                processedData.length === 1 && drillPath.length >= maxDepth - 1
                  ? '80%'
                  : '35%',
              label: {
                rotate: 'radial',
                fontSize: 12,
                fontWeight: '600',
                color: '#111827',
              },
              itemStyle: { borderWidth: 2, borderColor: '#ffffff' },
            },
            {
              r0: '35%',
              r: '55%',
              label: { rotate: 'radial', fontSize: 11, color: '#374151' },
              itemStyle: { borderWidth: 1.5, borderColor: '#ffffff' },
            },
            {
              r0: '55%',
              r: '72%',
              label: {
                rotate: 'tangential',
                fontSize: 10,
                color: '#374151',
                minAngle: 10,
              },
              itemStyle: { borderWidth: 1, borderColor: '#ffffff' },
            },
            {
              r0: '72%',
              r: '90%',
              label: {
                rotate: 'tangential',
                fontSize: 9,
                color: '#4b5563',
                minAngle: 8,
              },
              itemStyle: { borderWidth: 1, borderColor: '#ffffff' },
            },
          ],
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          bottom: 10,
          style: {
            text: '◎ Click arcs to dive • Center circle to go back',
            fill: '#9ca3af',
            font: '12px system-ui, sans-serif',
          },
        },
        ...(drillPath.length > 0
          ? [
            {
              type: 'circle',
              left: 'center',
              top: 'middle',
              shape: { r: 48 },
              style: { fill: 'rgba(0,0,0,0)', cursor: 'pointer' },
              onclick: onCenterClick,
            },
          ]
          : []),
      ],
    };
  }, [
    processedData,
    title,
    measureCol,
    aggregationMethod,
    drillPath,
    maxDepth,
    onCenterClick,
  ]);

  return (
    <ReactECharts
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={
        onNodeClick
          ? {
            click: (params) =>
              onNodeClick(
                params.data?.name,
                params.treePathInfo?.length ?? 0,
                params.treePathInfo,
              ),
          }
          : {}
      }
      onChartReady={onChartReady}
      notMerge
    />
  );
};

export default SunburstChart;