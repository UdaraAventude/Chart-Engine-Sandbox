/**
 * Maps ChartVisualizationDto.data from the API into shapes expected by chart adapters.
 */
export function normalizeServerChartData(chartType, apiData) {
  if (apiData == null) return null;

  switch (chartType) {
    case 'bar':
    case 'pie':
    case 'line':
      return normalizeStandard(apiData);

    case 'scatter':
    case 'correlation':
      return normalizeScatterLike(apiData);

    case 'bubble':
      return normalizeBubble(apiData);

    case 'heatmap':
      return normalizeHeatmap(apiData);

    case 'histogram':
      return normalizeHistogram(apiData);

    case 'multiline':
      return normalizeMultiline(apiData);

    case 'sunburst':
      return normalizeSunburst(apiData);

    default:
      return normalizeStandard(apiData);
  }
}

function normalizeStandard(apiData) {
  if (!Array.isArray(apiData)) return [];
  return apiData.map((item) => ({
    name: item.name ?? item.Name ?? '',
    value: item.value ?? item.Value ?? item.count ?? item.Count ?? 0,
    count: item.count ?? item.Count ?? item.value ?? 0,
  }));
}

function normalizeBubble(apiData) {
  const std = normalizeStandard(apiData);
  return std.map((d) => ({
    name: d.name,
    x: d.value,
    y: d.value,
    size: d.value,
    count: d.count,
  }));
}

function normalizeScatterLike(apiData) {
  const series = Array.isArray(apiData) ? apiData : [];
  const first = series[0];
  const points = first?.data ?? [];
  const rawData = points.map((p) => ({
    x: p.x ?? p.name,
    y: p.y ?? p.value ?? p.count ?? 0,
  }));
  return { rawData, xCol: 'x', yCol: 'y' };
}

function normalizeHeatmap(apiData) {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    return { xCategories: [], yCategories: [], cells: [] };
  }

  const xCategories = apiData.map((s) => s.id ?? s.name ?? '');
  const yCategories = ['Value'];
  const cells = apiData.map((s, xIndex) => {
    const point = (s.data && s.data[0]) || {};
    const value = point.y ?? point.value ?? 0;
    return {
      x: xIndex,
      y: 0,
      value,
      xLabel: xCategories[xIndex],
      yLabel: 'Value',
      count: value,
    };
  });

  return { xCategories, yCategories, cells };
}

function normalizeHistogram(apiData) {
  if (!Array.isArray(apiData)) return { labels: [], counts: [] };
  return {
    labels: apiData.map((b) => b.bin ?? b.name ?? ''),
    counts: apiData.map((b) => b.frequency ?? b.value ?? b.count ?? 0),
  };
}

function normalizeMultiline(apiData) {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    return { xAxisLabels: [], series: [] };
  }

  const firstSeries = apiData[0]?.data ?? [];
  const xAxisLabels = firstSeries.map((p) => p.x ?? p.name ?? '');

  const series = apiData.map((s) => ({
    name: s.id ?? 'Series',
    data: (s.data ?? []).map((p) => p.y ?? p.value ?? 0),
  }));

  return { xAxisLabels, series };
}

function normalizeSunburst(apiData) {
  const mapNode = (node) => {
    if (!node) return null;
    const mapped = { name: node.name ?? 'root' };
    if (node.loc != null) mapped.value = node.loc;
    if (node.value != null) mapped.value = node.value;
    if (node.children?.length) {
      mapped.children = node.children.map(mapNode).filter(Boolean);
    }
    return mapped;
  };

  const root = mapNode(apiData);
  return root ? [root] : [];
}
