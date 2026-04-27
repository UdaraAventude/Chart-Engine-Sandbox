// Pure functions — each returns an ECharts option object
// Takes dataset (array of row objects) and chartConfig

export function buildScatterPlus(dataset, xCol, yCol) {
  if (!dataset || dataset.length === 0) return {};

  // Dynamic color grouping
  const COLOR_CANDIDATES = ['department','country','seniority_level','gender','category','target','cp'];
  const colorCol = COLOR_CANDIDATES.find(c => dataset[0] && c in dataset[0]) || null;

  // Get unique groups
  const groups = colorCol
    ? [...new Set(dataset.map(r => r[colorCol]))]
    : ['All'];

  const PALETTE = ['#185FA5','#7c3aed','#059669','#d97706','#dc2626',
                   '#0891b2','#9333ea','#16a34a','#ea580c','#db2777'];

  const series = groups.map((g, i) => ({
    name: String(g),
    type: 'scatter',
    data: dataset
      .filter(r => !colorCol || String(r[colorCol]) === String(g))
      .map(r => [parseFloat(r[xCol]), parseFloat(r[yCol])])
      .filter(d => !isNaN(d[0]) && !isNaN(d[1])),
    symbolSize: 6,
    itemStyle: { color: PALETTE[i % PALETTE.length], opacity: 0.75 },
  }));

  return {
    backgroundColor: 'transparent',
    title: {
      text: `${xCol} vs ${yCol}`,
      left: 'center',
      textStyle: { color: '#111827', fontSize: 15, fontWeight: '600' }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      textStyle: { color: '#111827', fontSize: 13 },
      formatter: p => `${p.seriesName}<br/>${xCol}: ${p.data[0]}<br/>${yCol}: ${p.data[1]}`
    },
    legend: {
      bottom: 40,
      textStyle: { color: '#374151', fontSize: 12 },
      data: groups.map(String)
    },
    grid: { top: 60, right: 30, bottom: 100, left: 70 },
    xAxis: {
      name: xCol, type: 'value',
      nameLocation: 'middle', nameGap: 30,
      nameTextStyle: { color: '#374151' },
      axisLabel: { color: '#374151' },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }
    },
    yAxis: {
      name: yCol, type: 'value',
      nameLocation: 'middle', nameGap: 50,
      nameTextStyle: { color: '#374151' },
      axisLabel: { color: '#374151' },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'inside', yAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, bottom: 10 },
    ],
    series,
    animation: false,
  };
}

export function buildBubble(dataset, chartConfig) {
  const { x_axis, y_axis, title } = chartConfig
  
  // General numeric column detection for fallback
  const keys = Object.keys(dataset[0] || {})
  const numericKeys = keys.filter(k => 
    !isNaN(Number(dataset[0][k])) && k !== x_axis && k !== y_axis
  )

  // Superstore: prefer Quantity for bubble size
  // Cleveland: prefer thalach (heart rate)
  const isSuperstore = 'Quantity' in (dataset[0] || {});
  const isCleveland = 'thalach' in (dataset[0] || {});
  const sizeCol = isSuperstore ? 'Quantity' : (isCleveland ? 'thalach' : (numericKeys[0] || x_axis));

  const vals = dataset.map(r => Number(r[sizeCol])).filter(v => !isNaN(v))
  const minV = Math.min(...vals), maxV = Math.max(...vals)
  const normalize = v => 8 + ((v - minV) / (maxV - minV)) * 30

  const data = dataset.map(r => ({
    value: [Number(r[x_axis]), Number(r[y_axis]), Number(r[sizeCol])],
    symbolSize: normalize(Number(r[sizeCol]))
  }))

  return {
    title: { text: `${title} (bubble size = ${sizeCol})`, left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500 } },
    tooltip: {
      formatter: p => {
        if (!p || !p.value) return '';
        return `${x_axis}: ${p.value[0]}<br/>${y_axis}: ${p.value[1]}<br/>${sizeCol}: ${p.value[2]}`;
      }
    },
    xAxis: { name: x_axis, nameLocation: 'middle', nameGap: 25 },
    yAxis: { name: y_axis, nameLocation: 'middle', nameGap: 40 },
    dataZoom: [{ type: 'inside' }],
    series: [{
      type: 'scatter',
      data,
      itemStyle: { color: '#1D9E75', opacity: 0.6 },
      emphasis: { focus: 'self' }
    }]
  }
}

export function buildHeatmap(dataset, aggregationsHeatmap) {
  // Prefer pre-aggregated backend data
  if (aggregationsHeatmap && aggregationsHeatmap.cells?.length > 0) {
    const { xCategories, yCategories, cells, xLabel, yLabel } = aggregationsHeatmap;
    const vals = cells.map(c => c.value);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    return _buildHeatmapOption(xCategories, yCategories, cells, xLabel, yLabel, minV, maxV);
  }

  if (!dataset || dataset.length === 0) return {};

  // Auto-detect columns
  const row = dataset[0];
  let xCol, yCol, valueCol, xLabel, yLabel;
  if ('commute_time_min' in row && 'work_life_balance' in row) {
    xCol='commute_time_min'; yCol='work_life_balance'; valueCol='overall_satisfaction';
    xLabel='Commute Time (min)'; yLabel='Work-Life Balance Score';
  } else if ('Sales' in row && 'Profit' in row) {
    xCol='Sales'; yCol='Profit'; valueCol='Profit';
    xLabel='Sales'; yLabel='Profit';
  } else if ('age' in row && 'chol' in row) {
    xCol='age'; yCol='chol'; valueCol='chol';
    xLabel='Age group'; yLabel='Cholesterol range';
  } else {
    const nums = Object.keys(row).filter(k => !isNaN(parseFloat(row[k])));
    [xCol, yCol] = nums; valueCol = nums[1];
    xLabel=xCol; yLabel=yCol;
  }

  // Bin the data
  const xVals = dataset.map(r=>parseFloat(r[xCol])).filter(v=>!isNaN(v));
  const yVals = dataset.map(r=>parseFloat(r[yCol])).filter(v=>!isNaN(v));
  if (xVals.length === 0 || yVals.length === 0) return {};

  const bins = 6;
  const xMin=Math.min(...xVals), xMax=Math.max(...xVals);
  const yMin=Math.min(...yVals), yMax=Math.max(...yVals);
  const xStep=(xMax-xMin)/bins, yStep=(yMax-yMin)/bins;

  const xCats = Array.from({length:bins}, (_,i)=>
    `${Math.round(xMin+i*xStep)}–${Math.round(xMin+(i+1)*xStep)}`);
  const yCats = Array.from({length:bins}, (_,i)=>
    `${(yMin+i*yStep).toFixed(1)}–${(yMin+(i+1)*yStep).toFixed(1)}`);

  const grid = Array.from({length:bins}, ()=>Array(bins).fill(null).map(()=>({sum:0,count:0})));
  for (const row of dataset) {
    const x=parseFloat(row[xCol]), y=parseFloat(row[yCol]), v=parseFloat(row[valueCol]);
    if (isNaN(x)||isNaN(y)||isNaN(v)) continue;
    const xi=Math.min(bins-1, Math.floor((x-xMin)/xStep));
    const yi=Math.min(bins-1, Math.floor((y-yMin)/yStep));
    grid[yi][xi].sum += v;
    grid[yi][xi].count += 1;
  }

  const cells = [];
  for (let yi=0; yi<bins; yi++) {
    for (let xi=0; xi<bins; xi++) {
      const g=grid[yi][xi];
      if (g.count>0) cells.push({x:xi,y:yi,xLabel:xCats[xi],yLabel:yCats[yi],
        value:round2(g.sum/g.count),count:g.count});
    }
  }

  const vals = cells.map(c=>c.value);
  return _buildHeatmapOption(xCats, yCats, cells, xLabel, yLabel, Math.min(...vals), Math.max(...vals));
}

function round2(v) { return Math.round(v*100)/100; }

function _buildHeatmapOption(xCats, yCats, cells, xLabel, yLabel, minV, maxV) {
  return {
    backgroundColor: 'transparent',
    title: {
      text: `${yLabel} — ${xLabel}`,
      left: 'center',
      textStyle: { color: '#111827', fontSize: 15, fontWeight: '600' }
    },
    tooltip: {
      position: 'top',
      backgroundColor: '#ffffff', borderColor: '#e5e7eb',
      textStyle: { color: '#111827', fontSize: 13 },
      formatter: p => {
        const d = p.data;
        return `${d.xLabel}<br/>${d.yLabel}<br/>Avg: <b>${d.value}</b><br/>Count: ${d.count}`;
      }
    },
    grid: { top: 60, right: 120, bottom: 80, left: 100 },
    xAxis: {
      type: 'category', data: xCats, name: xLabel,
      nameLocation: 'middle', nameGap: 35,
      nameTextStyle: { color: '#374151' },
      axisLabel: { color: '#374151', fontSize: 11 },
    },
    yAxis: {
      type: 'category', data: yCats, name: yLabel,
      nameLocation: 'middle', nameGap: 60,
      nameTextStyle: { color: '#374151' },
      axisLabel: { color: '#374151', fontSize: 11 },
    },
    visualMap: {
      min: minV, max: maxV,
      calculable: true, orient: 'vertical', right: 10, top: 'center',
      inRange: { color: ['#dbeafe','#93c5fd','#3b82f6','#1d4ed8','#1e40af'] },
      textStyle: { color: '#374151' },
    },
    series: [{
      type: 'heatmap',
      data: cells.map(c => ({ ...c, value: [c.x, c.y, c.value] })),
      label: { show: true, formatter: p => p.data.value[2], color: '#374151', fontSize: 10 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
    dataZoom: [{ type: 'slider', xAxisIndex: 0, bottom: 10 }],
  };
}

export function buildCorrelationMatrix(dataset) {
  const isSuperstore = dataset[0] && 'Sales' in dataset[0];
  const cols = isSuperstore 
    ? ['Sales', 'Quantity', 'Discount', 'Profit']
    : ['age', 'trestbps', 'chol', 'thalach', 'oldpeak'];
  const n = cols.length

  function pearson(a, b) {
    const pairs = dataset.map(r => [Number(r[a]), Number(r[b])])
      .filter(p => !isNaN(p[0]) && !isNaN(p[1]))
    const n = pairs.length
    if (n < 2) return 0;
    const meanA = pairs.reduce((s, p) => s + p[0], 0) / n
    const meanB = pairs.reduce((s, p) => s + p[1], 0) / n
    let num = 0, da = 0, db = 0
    pairs.forEach(([x, y]) => {
      num += (x - meanA) * (y - meanB)
      da += (x - meanA) ** 2
      db += (y - meanB) ** 2
    })
    const denom = Math.sqrt(da * db);
    return denom === 0 ? 0 : +(num / denom).toFixed(2)
  }

  const data = []
  cols.forEach((c1, i) =>
    cols.forEach((c2, j) => data.push([i, j, pearson(c1, c2)]))
  )

  return {
    title: { text: 'Correlation matrix — numeric features',
      left: 'center', textStyle: { fontSize: 14, fontWeight: 500 } },
    tooltip: {
      formatter: p => {
        if (!p || !p.value) return '';
        return `${cols[p.value[0]]} × ${cols[p.value[1]]}<br/>r = ${p.value[2]}`;
      }
    },
    grid: { top: 60, bottom: 80, left: 80, right: 40 },
    xAxis: { type: 'category', data: cols, axisLabel: { rotate: 30 } },
    yAxis: { type: 'category', data: cols },
    visualMap: {
      min: -1, max: 1, calculable: true,
      orient: 'horizontal', left: 'center', bottom: -5,
      inRange: { color: ['#E24B4A', '#f5f5f5', '#185FA5'] }
    },
    series: [{
      type: 'heatmap', data,
      label: { show: true, fontSize: 11,
        formatter: p => p.value[2].toFixed(2) },
      emphasis: { itemStyle: { shadowBlur: 10 } }
    }]
  }
}

export function buildHistogram(dataset, xCol) {
  if (!dataset || dataset.length === 0) return {};
  const isCleveland = dataset[0] && 'chol' in dataset[0] && 'age' in dataset[0];
  const col = xCol || (isCleveland ? 'chol' : Object.keys(dataset[0]).find(k => !isNaN(Number(dataset[0][k]))));
  const vals = dataset.map(r => Number(r[col])).filter(v => !isNaN(v) && v !== 0)
  if (vals.length === 0) return {};
  
  const min = isCleveland ? 100 : Math.min(...vals);
  const max = isCleveland ? 600 : Math.max(...vals);
  const bins = 20;
  const step = (max - min) / bins;
  const counts = Array(bins).fill(0);
  
  vals.forEach(v => {
    const i = Math.min(Math.floor((v - min) / step), bins - 1);
    if (i >= 0) counts[i]++;
  });
  
  const labels = counts.map((_, i) =>
    `${Math.round(min + i * step)}–${Math.round(min + (i + 1) * step)}`);

  return {
    title: { text: `${col} distribution`,
      left: 'center', textStyle: { fontSize: 14, fontWeight: 500 } },
    tooltip: { trigger: 'axis',
      formatter: p => {
        if (!p || !p[0]) return '';
        return `${p[0].name}<br/>Count: ${p[0].value}`;
      }
    },
    xAxis: { type: 'category', data: labels,
      axisLabel: { rotate: 45, fontSize: 10 },
      name: col, nameLocation: 'middle', nameGap: 50 },
    yAxis: { name: 'Frequency', nameLocation: 'middle', nameGap: 35 },
    dataZoom: [{ type: 'slider', bottom: 0 }],
    series: [{
      type: 'bar', data: counts, barCategoryGap: '2%',
      itemStyle: { color: '#1D9E75' },
      emphasis: { itemStyle: { color: '#0F6E56' } }
    }]
  }
}

export function buildMultiLine(dataset) {
  if (!dataset || dataset.length === 0) return {};
  const isCleveland = dataset[0] && 'chol' in dataset[0] && 'age' in dataset[0];
  const xCol = isCleveland ? 'age' : Object.keys(dataset[0]).find(k => !isNaN(Number(dataset[0][k])));
  const yCol = isCleveland ? 'chol' : Object.keys(dataset[0]).filter(k => !isNaN(Number(dataset[0][k])))[1];
  
  // Detect a 3rd numeric column for the second line fallback
  const keys = Object.keys(dataset[0] || {})
  const numericKeys = keys.filter(k => 
    !isNaN(Number(dataset[0][k])) && k !== xCol && k !== yCol
  )
  const secCol = isCleveland ? 'thalach' : (numericKeys[0] || yCol);

  // Cleveland uses fixed 5-year bins
  const bins = isCleveland 
    ? [35,40,45,50,55,60,65,70,75]
    : (() => {
        const xVals = dataset.map(r => Number(r[xCol])).filter(v => !isNaN(v));
        if (xVals.length === 0) return [0, 10, 20, 30, 40, 50, 60, 70, 80];
        const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
        const binSize = (xMax - xMin) / 8;
        return Array.from({length: 9}, (_, i) => xMin + i * binSize);
      })();

  const labels = bins.slice(0, -1).map((v, i) => `${Math.round(v)}–${Math.round(bins[i+1])}`);

  function avgByBin(col) {
    return bins.slice(0, -1).map((lo, i) => {
      const hi = bins[i + 1]
      const group = dataset.filter(r => Number(r[xCol]) >= lo && Number(r[xCol]) < hi)
      const vals = group.map(r => Number(r[col])).filter(v => !isNaN(v))
      return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
    })
  }

  const title = isCleveland 
    ? 'Avg cholesterol & heart rate by age group' 
    : `Avg ${yCol} & ${secCol} by ${xCol} groups`;

  const legendData = isCleveland 
    ? ['Avg cholesterol', 'Avg heart rate']
    : [yCol, secCol];

  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14, fontWeight: 500 } },
    tooltip: { trigger: 'axis' },
    legend: { data: legendData, bottom: 0 },
    xAxis: { type: 'category', data: labels,
      name: isCleveland ? 'Age group' : xCol, nameLocation: 'middle', nameGap: 25 },
    yAxis: [
      { name: isCleveland ? 'Chol (mg/dl)' : yCol, nameLocation: 'middle', nameGap: 45 },
      { name: isCleveland ? 'Heart rate' : secCol, nameLocation: 'middle', nameGap: 45, splitLine: { show: false } }
    ],
    series: [
      { name: legendData[0], type: 'line', data: avgByBin(yCol),
        smooth: true, itemStyle: { color: '#185FA5' },
        areaStyle: { opacity: 0.1, color: '#185FA5' } },
      { name: legendData[1], type: 'line', yAxisIndex: 1,
        data: avgByBin(secCol), smooth: true,
        itemStyle: { color: '#E24B4A' } }
    ]
  }
}

export function buildCorrelationFromAggregation(corrAgg) {
  if (!corrAgg || !corrAgg.columns) return {};
  const { columns, matrix } = corrAgg;
  return {
    backgroundColor: 'transparent',
    title: { text: 'Correlation Matrix', left: 'center',
             textStyle: { color: '#111827', fontSize: 15, fontWeight: '600' } },
    tooltip: {
      formatter: p => `${p.data.x} × ${p.data.y}<br/>r = <b>${p.data.value[2]}</b>`,
      backgroundColor: '#fff', borderColor: '#e5e7eb',
      textStyle: { color: '#111827', fontSize: 13 },
    },
    grid: { top: 60, right: 30, bottom: 100, left: 130 },
    xAxis: { type: 'category', data: columns, axisLabel: { color:'#374151', rotate:45, fontSize:10 } },
    yAxis: { type: 'category', data: columns, axisLabel: { color:'#374151', fontSize:10 } },
    visualMap: {
      min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: 10,
      inRange: { color: ['#dc2626','#ffffff','#185FA5'] },
      textStyle: { color: '#374151' },
    },
    series: [{
      type: 'heatmap',
      data: matrix.map(c => ({ ...c, value: [columns.indexOf(c.x), columns.indexOf(c.y), c.value] })),
      label: { show: true, formatter: p => p.data.value[2].toFixed(2), fontSize: 9 },
    }],
  };
}

export function buildHistogramFromAggregation(histAgg) {
  if (!histAgg || !histAgg.labels) return {};
  const { labels, counts, col } = histAgg;
  return {
    backgroundColor: 'transparent',
    title: { text: `Distribution — ${col}`, left: 'center',
             textStyle: { color: '#111827', fontSize: 15, fontWeight: '600' } },
    tooltip: {
      trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb',
      textStyle: { color: '#111827', fontSize: 13 },
    },
    grid: { top: 60, right: 30, bottom: 60, left: 70 },
    xAxis: { type: 'category', data: labels, axisLabel: { color:'#374151', rotate:30, fontSize:11 } },
    yAxis: { type: 'value', name: 'Count', axisLabel: { color:'#374151' },
             splitLine: { lineStyle: { color:'#f3f4f6', type:'dashed' } } },
    series: [{
      type: 'bar', data: counts,
      itemStyle: {
        color: { type: 'linear', x:0,y:0,x2:0,y2:1,
          colorStops:[{offset:0,color:'#185FA5'},{offset:1,color:'#93c5fd'}] }
      },
      barCategoryGap: '10%',
    }],
  };
}

export function buildMultiLineFromAggregation(tsAgg) {
  if (!tsAgg || !tsAgg.quarters) return {};
  const { quarters, series } = tsAgg;
  const PALETTE = ['#185FA5','#7c3aed','#059669','#d97706','#dc2626'];
  return {
    backgroundColor: 'transparent',
    title: { text: 'Satisfaction Trend by Department', left: 'center',
             textStyle: { color: '#111827', fontSize: 15, fontWeight: '600' } },
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb',
               textStyle: { color: '#111827', fontSize: 13 } },
    legend: { bottom: 0, textStyle: { color: '#374151', fontSize: 12 } },
    grid: { top: 60, right: 30, bottom: 60, left: 70 },
    xAxis: { type: 'category', data: quarters, axisLabel: { color:'#374151', rotate:30, fontSize:11 } },
    yAxis: { type: 'value', name: 'Avg Satisfaction', min: 4, max: 8,
             axisLabel: { color:'#374151' },
             splitLine: { lineStyle: { color:'#f3f4f6', type:'dashed' } } },
    series: series.map((s, i) => ({
      name: s.name, type: 'line',
      data: s.data,
      smooth: true,
      lineStyle: { color: PALETTE[i % PALETTE.length], width: 2 },
      itemStyle: { color: PALETTE[i % PALETTE.length] },
      connectNulls: true,
    })),
  };
}

export function buildBubbleFromAggregation(bubbleAgg) {
  if (!bubbleAgg || bubbleAgg.length === 0) return {};
  const PALETTE = ['#185FA5','#7c3aed','#059669','#d97706','#dc2626',
                   '#0891b2','#9333ea','#16a34a','#ea580c','#db2777'];
  const maxSize = Math.max(...bubbleAgg.map(d => d.size));
  return {
    backgroundColor: 'transparent',
    title: { text: 'Department — Salary vs Satisfaction', left: 'center',
             textStyle: { color: '#111827', fontSize: 15, fontWeight: '600' } },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff', borderColor: '#e5e7eb',
      textStyle: { color: '#111827', fontSize: 13 },
      formatter: p => {
        const d = bubbleAgg[p.dataIndex] || {};
        return `<b>${d.name}</b><br/>
          Avg Salary: ${d.x?.toLocaleString()}<br/>
          Avg Satisfaction: ${d.y}<br/>
          Headcount: ${d.size?.toLocaleString()}<br/>
          Avg Turnover Risk: ${d.avg_turnover ?? '—'}`;
      }
    },
    legend: { bottom: 0, textStyle: { color: '#374151', fontSize: 12 } },
    grid: { top: 60, right: 30, bottom: 60, left: 80 },
    xAxis: {
      type: 'value', name: 'Avg Monthly Salary',
      nameLocation: 'middle', nameGap: 35,
      nameTextStyle: { color: '#374151' },
      axisLabel: { color: '#374151', formatter: v => v.toLocaleString() },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    yAxis: {
      type: 'value', name: 'Avg Satisfaction', min: 5.5, max: 7.5,
      nameLocation: 'middle', nameGap: 50,
      nameTextStyle: { color: '#374151' },
      axisLabel: { color: '#374151' },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    series: bubbleAgg.map((d, i) => ({
      name: d.name,
      type: 'scatter',
      data: [[d.x, d.y]],
      symbolSize: Math.max(20, Math.round(60 * (d.size / maxSize))),
      itemStyle: { color: PALETTE[i % PALETTE.length], opacity: 0.85 },
      label: { show: true, formatter: d.name, position: 'top',
               color: '#374151', fontSize: 11, fontWeight: '600' },
    })),
  };
}
