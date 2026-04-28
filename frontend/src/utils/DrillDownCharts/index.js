import * as echarts from 'echarts';

const PALETTE = ['#185FA5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#9333ea', '#16a34a', '#ea580c', '#db2777'];
const SUNBURST_PALETTE = ['#185FA5', '#7c3aed', '#059669', '#d97706', '#dc2626'];

const COMMON_THEME = {
  backgroundColor: 'transparent',
  title: {
    textStyle: { color: '#111827', fontSize: 15, fontWeight: '600', fontFamily: 'system-ui, sans-serif' },
    subtextStyle: { color: '#6b7280', fontSize: 12 }
  },
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: { color: '#111827', fontSize: 13 }
  },
  axisLabels: { color: '#374151', fontSize: 12 },
  axisLines: { lineStyle: { color: '#e5e7eb' } },
  splitLines: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
  axisName: { color: '#6b7280', fontSize: 12 }
};

export const buildDrillBar = (aggregated, groupByCol, measureCol, drillTitle, isLeaf, aggregationMethod) => {
  if (!aggregated || !Array.isArray(aggregated)) return {};
  const names = aggregated.map(d => d.name);
  const values = aggregated.map(d => d.value);

  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      trigger: 'axis',
      formatter: (params) => {
        const idx = params[0].dataIndex;
        const d = aggregated[idx];
        return `
          <div style="font-weight: bold; margin-bottom: 4px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">${d.name}</div>
          <div style="color: #374151">${aggregationMethod}: <span style="color: #185FA5; font-weight: bold;">${d.value.toLocaleString()}</span></div>
          <div style="color: #374151">Records: <span style="color: #7c3aed">${d.count}</span></div>
          ${!isLeaf ? '<div style="margin-top: 8px; color: #059669; font-size: 11px; font-style: italic;">▲ Click to drill into that group</div>' : ''}
        `;
      }
    },
    grid: { top: 60, bottom: 80, left: 80, right: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      name: groupByCol.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: names.length > 8 ? 50 : 35,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: { ...COMMON_THEME.axisLabels, rotate: names.length > 8 ? 30 : 0 },
      axisLine: COMMON_THEME.axisLines
    },
    yAxis: {
      type: 'value',
      name: (aggregationMethod + ' of ' + measureCol).replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 60,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: { ...COMMON_THEME.axisLabels, formatter: (v) => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(1) + 'k' : v },
      splitLine: COMMON_THEME.splitLines
    },
    series: [{
      data: values,
      type: 'bar',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#185FA5' },
          { offset: 1, color: '#93c5fd' }
        ]),
        borderRadius: [4, 4, 0, 0],
        borderColor: isLeaf ? '#d97706' : 'transparent',
        borderWidth: isLeaf ? 2 : 0
      },
      label: {
        show: aggregated.length <= 12,
        position: 'top',
        color: '#6b7280',
        fontSize: 10,
        formatter: (params) => params.value >= 1000 ? (params.value/1000).toFixed(1) + 'k' : params.value
      }
    }],
    dataZoom: names.length > 15 ? [
      { 
        type: 'slider', 
        bottom: 5, 
        height: 20, 
        backgroundColor: '#f9fafb', 
        borderColor: '#e5e7eb',
        fillerColor: 'rgba(24,95,165,0.12)',
        textStyle: { color: '#6b7280' }
      }
    ] : [],
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };
};

export const buildDrillPie = (aggregated, measureCol, drillTitle, isLeaf) => {
  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: { color: '#374151' },
      type: 'scroll'
    },
    series: [{
      name: drillTitle,
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      labelLine: { show: false },
      data: (aggregated || []).map((d, i) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: PALETTE[i % PALETTE.length] }
      }))
    }]
  };
};

export const buildDrillMultiline = (timeseries, activeMetric, drillTitle, aggMethod) => {
  if (!timeseries || !timeseries.metrics) return {};
  const { quarters, metrics } = timeseries;
  const rawSeries = metrics[activeMetric] || [];

  const processedSeries = (rawSeries || []).map(s => {
    let data = [];
    if (aggMethod === 'sum') data = s.sum;
    else if (aggMethod === 'count') data = s.count;
    else data = s.sum.map((sum, i) => s.count[i] > 0 ? round(sum / s.count[i], 2) : 0);
    
    return { ...s, data };
  });

  function round(num, decimalPlaces) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
  }

  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      trigger: 'axis'
    },
    legend: {
      bottom: 10,
      left: 'center',
      textStyle: { color: '#374151' },
      type: 'scroll'
    },
    grid: { top: 60, bottom: 60, left: 60, right: 40, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: quarters,
      name: 'QUARTER',
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b' },
      axisLabel: COMMON_THEME.axisLabels,
      axisLine: COMMON_THEME.axisLines
    },
    yAxis: {
      type: 'value',
      name: activeMetric.toUpperCase(),
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b' },
      axisLabel: COMMON_THEME.axisLabels,
      splitLine: COMMON_THEME.splitLines
    },
    series: processedSeries.map((s, i) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data,
      symbolSize: 8,
      lineStyle: { width: 3, color: PALETTE[i % PALETTE.length] },
      itemStyle: { color: PALETTE[i % PALETTE.length] },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: PALETTE[i % PALETTE.length] + '44' },
          { offset: 1, color: PALETTE[i % PALETTE.length] + '00' }
        ])
      }
    }))
  };
};

export const buildDrillCorrelation = (correlation, drillTitle) => {
  if (!correlation || !correlation.columns || !correlation.matrix) return {};
  const { columns, matrix } = correlation;
  
  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      formatter: (p) => {
        return `<b>${p.data.x}</b> & <b>${p.data.y}</b><br/>Correlation: ${p.data.value}`;
      }
    },
    grid: { top: 60, bottom: 80, left: 120, right: 40 },
    xAxis: {
      type: 'category',
      data: columns,
      axisLabel: { ...COMMON_THEME.axisLabels, rotate: 35 }
    },
    yAxis: {
      type: 'category',
      data: columns,
      axisLabel: COMMON_THEME.axisLabels
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#dc2626', '#ffffff', '#185FA5'] }
    },
    series: [{
      type: 'heatmap',
      data: matrix.map(m => ({
        value: [columns.indexOf(m.x), columns.indexOf(m.y), m.value],
        x: m.x,
        y: m.y
      })),
      label: {
        show: columns.length <= 15,
        formatter: (p) => p.data.value
      }
    }]
  };
};

export const buildDrillHistogram = (histogram, drillTitle) => {
  if (!histogram || !histogram.labels) return {};
  const { labels, counts, col } = histogram;

  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, subtext: `Distribution of ${col}`, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      trigger: 'axis'
    },
    grid: { top: 70, bottom: 60, left: 60, right: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      name: (col || 'VALUE').replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: { ...COMMON_THEME.axisLabels, rotate: 20 },
      axisLine: COMMON_THEME.axisLines
    },
    yAxis: {
      type: 'value',
      name: 'FREQUENCY',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: COMMON_THEME.axisLabels,
      splitLine: COMMON_THEME.splitLines
    },
    series: [{
      data: counts,
      type: 'bar',
      barWidth: '90%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#7c3aed' },
          { offset: 1, color: '#c4b5fd' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }]
  };
};

export const buildDrillHeatmap = (heatmapData, xCol, yCol, measureCol, drillTitle, isLeaf) => {
  if (!heatmapData || !heatmapData.cells) return {};
  const { xCategories, yCategories, cells } = heatmapData;
  const values = (cells || []).map(c => [c.x, c.y, c.value]);
  const validValues = (cells || []).map(c => c.value).filter(v => v !== 0);
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 100;

  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      position: 'top',
      formatter: (params) => {
        const c = cells.find(cell => cell.x === params.data[0] && cell.y === params.data[1]);
        return `
          <div style="font-weight: bold; margin-bottom: 4px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">Cell Detail</div>
          <div style="color: #374151">${xCol}: <span style="color: #185FA5">${c.xLabel}</span></div>
          <div style="color: #374151">${yCol}: <span style="color: #185FA5">${c.yLabel}</span></div>
          <div style="color: #374151">Avg Value: <span style="color: #059669; font-weight: bold;">${c.value.toFixed(2)}</span></div>
          <div style="color: #374151">Count: <span style="color: #7c3aed">${c.count}</span></div>
        `;
      }
    },
    grid: { top: 60, bottom: 80, left: 80, right: 40 },
    xAxis: {
      type: 'category',
      data: xCategories,
      name: xCol.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: { ...COMMON_THEME.axisLabels, rotate: 30 },
      splitArea: { show: true, areaStyle: { color: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0)'] } }
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      name: measureCol.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 60,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: COMMON_THEME.axisLabels,
      splitArea: { show: true, areaStyle: { color: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0)'] } }
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#FCEBEB', '#F09595', '#E24B4A', '#A32D2D', '#501313'] },
      textStyle: { color: '#374151' }
    },
    series: [{
      name: 'Heatmap',
      type: 'heatmap',
      data: values,
      label: {
        show: cells.length <= 64,
        formatter: (params) => params.data[2] > 0 ? params.data[2].toFixed(1) : '',
        color: '#ffffff',
        fontSize: 10
      }
    }]
  };
};

export const buildDrillBubble = (bubbleData, xCol, yCol, sizeCol, groupCol, drillTitle, isLeaf) => {
  if (!bubbleData || !Array.isArray(bubbleData) || bubbleData.length === 0) return {};
  const maxSize = Math.max(...bubbleData.map(d => d.size)) || 1;
  
  const series = bubbleData.map((d, i) => ({
    name: d.name,
    type: 'scatter',
    data: [[d.x, d.y, d.size, d.count]],
    symbolSize: (data) => Math.max(12, Math.min(80, (data[2] / maxSize) * 70 + 10)),
    itemStyle: {
      color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
        { offset: 0, color: PALETTE[i % PALETTE.length] },
        { offset: 1, color: PALETTE[i % PALETTE.length] + '99' } // Darker variant
      ]),
      borderColor: isLeaf ? '#d97706' : PALETTE[i % PALETTE.length],
      borderWidth: isLeaf ? 2 : 1,
      opacity: 0.9
    }
  }));

  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    legend: {
      bottom: 10,
      left: 'center',
      textStyle: { color: '#374151' },
      type: 'scroll'
    },
    tooltip: {
      ...COMMON_THEME.tooltip,
      formatter: (params) => {
        const d = bubbleData[params.seriesIndex];
        return `
          <div style="font-weight: bold; margin-bottom: 4px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">${d.name}</div>
          <div style="color: #374151">Avg ${xCol}: <span style="color: #185FA5">${d.x.toFixed(2)}</span></div>
          <div style="color: #374151">Avg ${yCol}: <span style="color: #185FA5">${d.y.toFixed(2)}</span></div>
          <div style="color: #374151">Sum ${sizeCol}: <span style="color: #059669; font-weight: bold;">${d.size.toLocaleString()}</span></div>
          <div style="color: #374151">Records: <span style="color: #7c3aed">${d.count}</span></div>
        `;
      }
    },
    grid: { top: 60, bottom: 60, left: 60, right: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: xCol.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: COMMON_THEME.axisLabels,
      axisLine: COMMON_THEME.axisLines,
      splitLine: COMMON_THEME.splitLines
    },
    yAxis: {
      type: 'value',
      name: yCol.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: COMMON_THEME.axisLabels,
      axisLine: COMMON_THEME.axisLines,
      splitLine: COMMON_THEME.splitLines
    },
    series
  };
};

export const buildDrillScatter = (rawData, xCol, yCol, colorCol, drillTitle) => {
  if (!rawData || !Array.isArray(rawData)) return {};
  const limitedData = rawData.slice(0, 5000);
  let series = [];

  if (colorCol) {
    const groups = {};
    limitedData.forEach(r => {
      const val = String(r[colorCol]);
      if (!groups[val]) groups[val] = [];
      groups[val].push([r[xCol], r[yCol]]);
    });

    const groupKeys = Object.keys(groups);
    if (groupKeys.length > 0 && groupKeys.length <= 15) {
      series = groupKeys.map((key, i) => ({
        name: key,
        type: 'scatter',
        data: groups[key],
        symbolSize: 5,
        itemStyle: { color: PALETTE[i % PALETTE.length], opacity: 0.7 },
        animation: false
      }));
    }
  }

  if (series.length === 0) {
    series = [{
      type: 'scatter',
      data: limitedData.map(r => [r[xCol], r[yCol]]),
      symbolSize: 5,
      itemStyle: { color: '#185FA5', opacity: 0.7 },
      animation: false
    }];
  }

  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      formatter: (params) => {
        return `
          <div style="color: #374151">${xCol}: <span style="color: #185FA5">${params.data[0]}</span></div>
          <div style="color: #374151">${yCol}: <span style="color: #059669">${params.data[1]}</span></div>
        `;
      }
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
        textStyle: { color: '#6b7280', fontSize: 10 } 
      }
    ],
    grid: { top: 60, bottom: 60, left: 60, right: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: xCol.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: COMMON_THEME.axisLabels,
      splitLine: COMMON_THEME.splitLines
    },
    yAxis: {
      type: 'value',
      name: yCol.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: COMMON_THEME.axisLabels,
      splitLine: COMMON_THEME.splitLines
    },
    series
  };
};

export const buildDrillLine = (aggregated, groupByCol, measureCol, drillTitle, isLeaf, aggregationMethod) => {
  if (!aggregated || !Array.isArray(aggregated)) return {};
  const names = aggregated.map(d => d.name);
  const values = aggregated.map(d => d.value);

  return {
    ...COMMON_THEME,
    title: { ...COMMON_THEME.title, text: drillTitle, left: 'center', top: 12 },
    tooltip: {
      ...COMMON_THEME.tooltip,
      trigger: 'axis',
      formatter: (params) => {
        const idx = params[0].dataIndex;
        const d = aggregated[idx];
        return `
          <div style="font-weight: bold; margin-bottom: 4px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">${d.name}</div>
          <div style="color: #374151">${aggregationMethod}: <span style="color: #185FA5; font-weight: bold;">${d.value.toLocaleString()}</span></div>
          <div style="color: #374151">Records: <span style="color: #7c3aed">${d.count}</span></div>
          ${!isLeaf ? '<div style="margin-top: 8px; color: #059669; font-size: 11px; font-style: italic;">▲ Click to drill into that group</div>' : ''}
        `;
      }
    },
    grid: { top: 60, bottom: 80, left: 80, right: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      name: (groupByCol || 'Group').replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: names.length > 8 ? 50 : 35,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: { ...COMMON_THEME.axisLabels, rotate: names.length > 8 ? 30 : 0 },
      axisLine: COMMON_THEME.axisLines
    },
    yAxis: {
      type: 'value',
      name: (aggregationMethod + ' of ' + measureCol).replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 60,
      nameTextStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
      axisLabel: { ...COMMON_THEME.axisLabels, formatter: (v) => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(1) + 'k' : v },
      splitLine: COMMON_THEME.splitLines
    },
    series: [{
      data: values,
      type: 'line',
      smooth: true,
      symbolSize: 8,
      itemStyle: {
        color: '#185FA5',
        borderColor: isLeaf ? '#d97706' : '#185FA5',
        borderWidth: isLeaf ? 2 : 0
      },
      lineStyle: { width: 3, color: '#185FA5' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(24,95,165,0.3)' },
          { offset: 1, color: 'rgba(24,95,165,0)' }
        ])
      },
      label: {
        show: aggregated.length <= 12,
        position: 'top',
        color: '#6b7280',
        fontSize: 10,
        formatter: (params) => params.value >= 1000 ? (params.value/1000).toFixed(1) + 'k' : params.value
      }
    }],
    dataZoom: names.length > 15 ? [
      { 
        type: 'slider', 
        bottom: 5, 
        height: 20, 
        backgroundColor: '#f9fafb', 
        borderColor: '#e5e7eb',
        fillerColor: 'rgba(24,95,165,0.12)',
        textStyle: { color: '#6b7280' }
      }
    ] : [],
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };
};

export const buildDrillSunburst = (sunburstData, measureCol, drillTitle, drillPath, maxDepth, aggMethod) => {
  // Recursively update node values based on aggMethod
  const updateNodes = (nodes) => {
    return nodes.map(node => {
      const baseSum = typeof node.sum === 'number' ? node.sum : (typeof node.value === 'number' ? node.value : 0);
      const baseCount = typeof node.count === 'number' ? node.count : 0;

      let val = baseSum;
      if (aggMethod === 'avg' || aggMethod === 'mean') val = baseCount > 0 ? baseSum / baseCount : 0;
      else if (aggMethod === 'count') val = baseCount;

      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const newNode = { ...node };

      if (hasChildren) {
        // Keep parent nodes as structural containers so nested rings render.
        // ECharts computes parent spans from children when parent value is omitted.
        newNode.children = updateNodes(node.children);
        delete newNode.value;
      } else {
        newNode.value = val;
      }

      return newNode;
    });
  };

  const processedData = updateNodes(sunburstData || []);

  // Assign colors to L1 segments
  processedData.forEach((node, i) => {
    node.itemStyle = { color: SUNBURST_PALETTE[i % SUNBURST_PALETTE.length] };
  });

  return {
    ...COMMON_THEME,
    title: { 
      ...COMMON_THEME.title,
      text: drillTitle, 
      subtext: `${measureCol} (${aggMethod}) • click segment to drill`,
      left: 'center', 
      top: 12 
    },
    tooltip: {
      ...COMMON_THEME.tooltip,
      trigger: 'item',
      formatter: (params) => {
        const val = params.value.toLocaleString();
        return `<b>${params.name}</b><br/>${aggMethod}: ${val}`;
      }
    },
    series: [{
      type: 'sunburst',
      data: processedData,
      radius: ['15%', '90%'],
      center: ['50%', '52%'],
      sort: 'desc',
      emphasis: {
        focus: 'ancestor',
        itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.15)' }
      },
      levels: [
        {},
        {
          r0: '15%', r: (processedData.length === 1 && drillPath.length >= maxDepth - 1) ? '80%' : '35%',
          label: { rotate: 'radial', fontSize: 12, fontWeight: '600', color: '#111827' },
          itemStyle: { borderWidth: 2, borderColor: '#ffffff' }
        },
        {
          r0: '35%', r: '55%',
          label: { rotate: 'radial', fontSize: 11, color: '#374151' },
          itemStyle: { borderWidth: 1.5, borderColor: '#ffffff' }
        },
        {
          r0: '55%', r: '72%',
          label: { rotate: 'tangential', fontSize: 10, color: '#374151', minAngle: 10 },
          itemStyle: { borderWidth: 1, borderColor: '#ffffff' }
        },
        {
          r0: '72%', r: '90%',
          label: { rotate: 'tangential', fontSize: 9, color: '#4b5563', minAngle: 8 },
          itemStyle: { borderWidth: 1, borderColor: '#ffffff' }
        }
      ]
    }],
    graphic: [{
      type: 'text',
      left: 'center',
      bottom: 10,
      style: {
        text: '◎ Click arcs to dive • Center circle to go back',
        fill: '#9ca3af',
        font: '12px system-ui, sans-serif'
      }
    }]
  };
};

