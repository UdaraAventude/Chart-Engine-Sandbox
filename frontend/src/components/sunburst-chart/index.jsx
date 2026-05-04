import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SUNBURST_PALETTE, CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

const SunburstChart = ({
  data = [],
  measureCol = '',
  aggregation = 'avg',
  title = '',
  drillPath = [],
  maxDepth = 4,
  height = '500px',
  palette = SUNBURST_PALETTE,
  onNodeClick,
  onCenterClick,
  onChartReady,
}) => {
  const processedData = useMemo(() => {
    const updateNodes = (nodes) =>
      nodes.map((node) => {
        const newNode = { ...node };
        if (Array.isArray(node.children) && node.children.length > 0) {
          newNode.children = updateNodes(node.children);
          // If it's a branch, we don't want a value property on it for Sunburst usually, 
          // but we want to keep the children structure.
          delete newNode.value;
        }
        return newNode;
      });

    let processed = updateNodes(data || []);
    
    // Aggressively skip any single-child roots to keep the center hole clean and relevant
    while (processed.length === 1 && processed[0].children?.length > 0) {
      processed = processed[0].children;
    }

    processed.forEach((node, i) => {
      node.itemStyle = { color: palette[i % palette.length] };
    });
    return processed;
  }, [data, palette]);

  const option = useMemo(() => {
    if (!processedData.length) return {};

    return {
      backgroundColor: 'transparent',
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        subtext: `${measureCol} (${aggregation}) • click segment to drill`,
        left: 'center',
        top: 12,
      },
      tooltip: {
        ...CHART_THEME.tooltipBase,
        trigger: 'item',
        formatter: (params) => {
          const aggLabel = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
          return `<b>${params.name}</b><br/>${aggLabel}: ${params.value?.toLocaleString()}`;
        },
      },
          series: [
            {
              name: `${aggregation.toUpperCase()} OF ${measureCol.toUpperCase()}`,
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
            { label: { show: false }, itemStyle: { color: 'transparent' } },
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
            text: '◎ Click arcs to dive',
            fill: '#9ca3af',
            font: '12px system-ui, sans-serif',
          },
        },
      ],
    };
  }, [
    processedData,
    title,
    measureCol,
    aggregation,
    drillPath,
    maxDepth,
    onCenterClick,
  ]);

  return (
    <ReactECharts opts={{ renderer: 'svg' }}
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
