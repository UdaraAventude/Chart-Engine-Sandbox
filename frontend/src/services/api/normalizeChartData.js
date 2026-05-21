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
      return normalizeScatterLike(apiData);

    case 'correlation':
      return null;

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

function isSeriesPointsPayload(apiData) {
  if (!Array.isArray(apiData) || apiData.length === 0) return false;
  const first = apiData[0];
  const points = first?.data ?? first?.Data;
  if (!Array.isArray(points) || points.length === 0) return false;
  const p0 = points[0];
  return (
    p0?.x != null ||
    p0?.X != null ||
    p0?.y != null ||
    p0?.Y != null
  );
}

function normalizeSeriesPoints(apiData) {
  const points = apiData[0]?.data ?? apiData[0]?.Data ?? [];
  return points.map((p) => ({
    name: String(p.x ?? p.X ?? p.name ?? p.Name ?? ''),
    value: p.y ?? p.Y ?? p.value ?? p.Value ?? 0,
    count: p.count ?? p.Count ?? 0,
  }));
}

function normalizeStandard(apiData) {
  if (!Array.isArray(apiData)) return [];

  if (isSeriesPointsPayload(apiData)) {
    return normalizeSeriesPoints(apiData);
  }

  return apiData.map((item) => ({
    name: item.name ?? item.Name ?? '',
    value: item.value ?? item.Value ?? item.count ?? item.Count ?? 0,
    count: item.count ?? item.Count ?? item.value ?? 0,
  }));
}

function normalizeBubble(apiData) {
  if (Array.isArray(apiData) && apiData.length > 0 && (apiData[0].x != null || apiData[0].X != null)) {
    return apiData.map((item) => ({
      name: item.name ?? item.Name ?? '',
      x: item.x ?? item.X ?? 0,
      y: item.y ?? item.Y ?? 0,
      size: item.size ?? item.Size ?? item.x ?? 0,
      count: item.count ?? item.Count ?? 0,
    }));
  }

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
  if (Array.isArray(apiData) && apiData.length > 0 && (apiData[0].y != null || apiData[0].Y != null)) {
    const rawData = apiData.map((p, i) => {
      const label = String(p.name ?? p.Name ?? p.x ?? p.X ?? i);
      return {
        name: label,
        x: i,
        y: p.y ?? p.Y ?? p.value ?? 0,
        count: p.count ?? p.Count ?? 0,
      };
    });
    return {
      rawData,
      xCol: 'x',
      yCol: 'y',
      categoryLabels: rawData.map((d) => d.name),
    };
  }

  const series = Array.isArray(apiData) ? apiData : [];
  const first = series[0];
  const points = first?.data ?? first?.Data ?? [];
  const rawData = points.map((p, i) => ({
    name: String(p.name ?? p.Name ?? p.x ?? i),
    x: i,
    y: p.y ?? p.Y ?? p.value ?? 0,
    count: p.count ?? p.Count ?? 0,
  }));
  return {
    rawData,
    xCol: 'x',
    yCol: 'y',
    categoryLabels: rawData.map((d) => d.name),
  };
}

function normalizeHeatmap(apiData) {
  if (apiData?.xCategories && apiData?.cells) {
    return {
      xCategories: apiData.xCategories ?? apiData.XCategories ?? [],
      yCategories: apiData.yCategories ?? apiData.YCategories ?? [],
      cells: apiData.cells ?? apiData.Cells ?? [],
    };
  }

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
  if (apiData?.xAxisLabels && apiData?.series) {
    return {
      xAxisLabels: apiData.xAxisLabels ?? apiData.XAxisLabels ?? [],
      series: apiData.series ?? apiData.Series ?? [],
    };
  }

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
  const childList = (node) =>
    node?.children ?? node?.Children ?? [];

  const mapNode = (node, pathPrefix = '') => {
    if (!node) return null;
    const name = node.name ?? node.Name ?? 'root';
    const isRoot = name === 'root' && !pathPrefix;
    const id = isRoot ? 'root' : pathPrefix ? `${pathPrefix}/${name}` : name;

    const mapped = {
      name,
      id,
      value: node.value ?? node.Value ?? node.loc ?? 0,
      count: node.count ?? node.Count ?? 0,
    };

    const kids = childList(node);
    if (kids.length > 0) {
      mapped.children = kids
        .map((child) => mapNode(child, isRoot ? '' : id))
        .filter(Boolean);
    }
    return mapped;
  };

  if (Array.isArray(apiData)) {
    if (apiData.length === 0) return [];
    if (apiData[0]?.name === 'root' || apiData[0]?.Name === 'root') {
      return apiData.map((n) => mapNode(n)).filter(Boolean);
    }
    return apiData.map((n) => mapNode(n)).filter(Boolean);
  }

  const root = mapNode(apiData);
  return root ? [root] : [];
}
