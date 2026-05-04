import React, { useMemo, useRef, useEffect } from 'react';
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

  const echartsRef = useRef(null);

  const option = useMemo(() => {
    if (!processedData.length) return {};

    return {
      backgroundColor: 'transparent',
      title: {
        ...CHART_THEME.titleStyle,
        text: title,
        subtext: `${measureCol} (${aggregation}) • click arc to dive`,
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
          radius: [0, '95%'],
          center: ['50%', '52%'],
          sort: 'desc',
          nodeClick: 'rootToNode',
          label: {
            show: false, // Global default: hide labels to prevent messiness
          },
          emphasis: {
            focus: 'ancestor',
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' },
            label: {
              show: true, // Show label on hover for ANY level
            },
          },
          levels: [
            {
              // Root level
              r0: 0,
              r: '15%',
              label: {
                show: drillPath.length > 0,
                formatter: '◎',
                fontSize: 16,
                color: '#6b7280',
              },
              itemStyle: { color: '#ffffff', opacity: 0.8 },
            },
            {
              // Level 1
              r0: '15%',
              r: '35%',
              label: {
                show: true, // Explicitly show for level 1
                rotate: 'radial',
                fontSize: 11,
                fontWeight: '600',
                color: '#111827',
                minAngle: 8,
                overflow: 'truncate',
              },
              itemStyle: { borderWidth: 2, borderColor: '#ffffff' },
            },
            {
              // Level 2
              r0: '35%',
              r: '70%',
              label: { 
                show: true, // Explicitly show for level 2
                rotate: 'radial', 
                fontSize: 10, 
                color: '#374151', 
                minAngle: 10,
                overflow: 'truncate',
              },
              itemStyle: { borderWidth: 1.5, borderColor: '#ffffff' },
            },
            {
              // Level 3+
              r0: '70%',
              r: '72%',
              label: {
                show: false, // Explicitly hide for level 3 and beyond
                position: 'outside',
                padding: 3,
                fontSize: 9,
                color: '#4b5563',
                minAngle: 5,
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
            text: '◎ Click center to drill back • Click arcs to dive',
            fill: '#9ca3af',
            font: '11px system-ui, sans-serif',
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
  ]);

  const isProgrammatic = useRef(false);

  // Sync internal ECharts zoom state with external drillPath
  useEffect(() => {
    if (!echartsRef.current) return;
    
    const chart = echartsRef.current.getEchartsInstance();
    
    isProgrammatic.current = true;
    if (drillPath.length === 0) {
      chart.dispatchAction({
        type: 'sunburstClick',
        targetNodeId: null 
      });
    } else {
      const targetId = drillPath.map(p => p.value).join('/');
      chart.dispatchAction({
        type: 'sunburstClick',
        targetNodeId: targetId
      });
    }
    // Reset flag after the action has been dispatched and potentially triggered events
    setTimeout(() => {
      isProgrammatic.current = false;
    }, 50);
  }, [drillPath]);

  return (
    <ReactECharts
      ref={echartsRef}
      opts={{ renderer: 'svg' }}
      option={option}
      className="echarts-wrapper"
      style={{ height }}
      onEvents={{
        click: (params) => {
          // Ignore programmatic clicks to avoid loops
          if (isProgrammatic.current) return;

          const clickedDepth = (params.treePathInfo?.length ?? 1) - 1;
          const currentDepth = drillPath.length;

          // If center hole or level 0 is clicked
          if (params.dataIndex === undefined || clickedDepth === 0) {
            if (onCenterClick) onCenterClick();
            return;
          }

          // Only trigger onNodeClick if we are clicking deeper than current path
          if (clickedDepth > currentDepth && onNodeClick) {
            // If the user clicked several levels deep at once, 
            // we should technically drill through all of them, but the engine 
            // currently expects one step at a time. For now, we take the name of 
            // the node at currentDepth + 1 from the treePathInfo.
            const nextNodeInfo = params.treePathInfo[currentDepth + 1];
            onNodeClick(
              nextNodeInfo.name,
              currentDepth + 1,
              params.treePathInfo,
            );
          }
        },
      }}
      onChartReady={onChartReady}
      notMerge={false} 
    />
  );
};

export default SunburstChart;
