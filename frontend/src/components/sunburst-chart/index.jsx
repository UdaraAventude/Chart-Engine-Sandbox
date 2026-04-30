import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SUNBURST_PALETTE, CHART_THEME } from '../_shared/chartTheme';
import '../_shared/charts.css';

const SunburstChart = ({
  data = [],
  measureCol = '',
  aggregationMethod = 'sum',
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
        const baseSum =
          typeof node.sum === 'number'
            ? node.sum
            : typeof node.value === 'number'
              ? node.value
              : 0;
        const baseCount = typeof node.count === 'number' ? node.count : 0;

        let val = baseSum;
        if (aggregationMethod === 'avg' || aggregationMethod === 'mean')
          val = baseCount > 0 ? baseSum / baseCount : 0;
        else if (aggregationMethod === 'count') val = baseCount;

        const hasChildren =
          Array.isArray(node.children) && node.children.length > 0;
        const newNode = { ...node };

        if (hasChildren) {
          newNode.children = updateNodes(node.children);
          delete newNode.value;
        } else {
          newNode.value = val;
        }
        return newNode;
      });

    const processed = updateNodes(data || []);
    processed.forEach((node, i) => {
      node.itemStyle = { color: palette[i % palette.length] };
    });
    return processed;
  }, [data, aggregationMethod, palette]);

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
