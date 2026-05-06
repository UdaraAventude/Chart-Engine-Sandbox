export const HISTOGRAM_BINS = 20;

export function parseHistBinRange(label) {
  const parseVal = (s) => {
    const str = s.trim();
    if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
    if (str.endsWith('k')) return parseFloat(str) * 1_000;
    return parseFloat(str);
  };
  const parts = label.split(' – ');
  if (parts.length !== 2) return null;
  return { lo: parseVal(parts[0]), hi: parseVal(parts[1]) };
}

export function computeHistogramBins(rows, drillPath, metricCol, filterRows, binCount = HISTOGRAM_BINS, aggregation = 'count') {
  const filtered = filterRows(rows, drillPath);

  const values = filtered
    .map((r) => Number(r[metricCol]))
    .filter((v) => !isNaN(v) && isFinite(v));

  if (values.length === 0) {
    return { labels: [], counts: [], binRows: [], binEdges: [], min: 0, max: 0, binSize: 0, metricCol };
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  const range = max - min;

  const effectiveBins = range === 0 ? 1 : binCount;
  const binSize = range === 0 ? 1 : range / effectiveBins;

  const binRows = Array.from({ length: effectiveBins }, () => []);

  filtered.forEach((row) => {
    const v = Number(row[metricCol]);
    if (isNaN(v) || !isFinite(v)) return;
    const idx = Math.min(Math.floor((v - min) / binSize), effectiveBins - 1);
    binRows[idx].push(row);
  });

  const counts = binRows.map((rowsInBin) => {
    if (rowsInBin.length === 0) return 0;
    const vals = rowsInBin.map((r) => Number(r[metricCol]));

    switch (aggregation) {
      case 'sum':
        return vals.reduce((a, b) => a + b, 0);
      case 'avg':
      case 'mean':
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      case 'min':
        return Math.min(...vals);
      case 'max':
        return Math.max(...vals);
      case 'count':
      default:
        return vals.length;
    }
  });

  const fmt = (v) =>
    v >= 1_000_000
      ? (v / 1_000_000).toFixed(1) + 'M'
      : v >= 1_000
        ? (v / 1_000).toFixed(1) + 'k'
        : Number.isInteger(v)
          ? String(v)
          : v.toFixed(1);

  // exact boundaries for each bin (lo of bin i, hi of last bin)
  const binEdges = Array.from({ length: effectiveBins + 1 }, (_, i) => min + i * binSize);
  // Clamp last edge to actual max to avoid precision overshoot
  binEdges[effectiveBins] = max;

  const labels = Array.from({ length: effectiveBins }, (_, i) => {
    const lo = binEdges[i];
    const hi = binEdges[i + 1];
    return `${fmt(lo)} – ${fmt(hi)}`;
  });

  return { labels, counts, binRows, binEdges, min, max, binSize, metricCol };
}
