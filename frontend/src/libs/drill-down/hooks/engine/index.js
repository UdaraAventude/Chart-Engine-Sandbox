const CHART_TOP_N = 50;
const HISTOGRAM_BINS = 20;

export function getNodeAtPath(tree, drillPath) {
  if (!tree || !drillPath.length) return tree;
  let node = tree;
  for (const step of drillPath) {
    // Histogram bin steps have no corresponding tree node — skip them
    if (step.column.startsWith('__hist__')) continue;
    const next = (node.children || []).find((c) => c.name === step.value);
    if (!next) return node;
    node = next;
  }
  return node;
}

export function isLeaf(node) {
  return !node || !node.children || node.children.length === 0;
}

export function formatForChart(
  node,
  chartType,
  rows,
  drillPath,
  metrics,
  dimensions,
  limit = CHART_TOP_N,
) {
  if (!node) return [];

  if (chartType === 'scatter') {
    const filtered = filterRows(rows, drillPath);
    const xCol = metrics?.[0] ?? '';
    const yCol = metrics?.[1] ?? metrics?.[0] ?? '';
    return { rawData: filtered, xCol, yCol };
  }

  if (chartType === 'bubble') {
    return formatBubble(node, rows, drillPath, metrics, dimensions, limit);
  }

  const children = (node.children || []).map((c) => ({
    name: c.name,
    value: c.value,
    count: c.count,
  }));

  if (limit !== null && children.length > limit) {
    return children.sort((a, b) => b.value - a.value).slice(0, limit);
  }

  return children;
}

/**
 * parseHistBinRange
 * -----------------
 * Parses the bin label produced by computeHistogramBins, e.g.:
 *   "5k – 10k"  →  { lo: 5000, hi: 10000 }
 *   "1.2M – 1.5M" →  { lo: 1200000, hi: 1500000 }
 */
function parseHistBinRange(label) {
  const parseVal = (s) => {
    const str = s.trim();
    if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
    if (str.endsWith('k')) return parseFloat(str) * 1_000;
    return parseFloat(str);
  };
  // Split on the en-dash separator used in computeHistogramBins
  const parts = label.split(' – ');
  if (parts.length !== 2) return null;
  return { lo: parseVal(parts[0]), hi: parseVal(parts[1]) };
}

function filterRows(rows, drillPath) {
  if (!drillPath.length) return rows;
  return rows.filter((row) =>
    drillPath.every((step) => {
      // ── Histogram bin step ────────────────────────────────────────────────
      // Column is encoded as "__hist__<metricCol>" by DrillDownRenderer
      if (step.column.startsWith('__hist__')) {
        const metricCol = step.column.slice('__hist__'.length);
        const range = parseHistBinRange(step.value);
        if (!range) return true; // cannot parse → skip filter
        const v = Number(row[metricCol]);
        return !isNaN(v) && v >= range.lo && v < range.hi;
      }
      // ── Standard categorical step ─────────────────────────────────────────
      return String(row[step.column] ?? '').trim() === step.value;
    }),
  );
}

function formatBubble(node, rows, drillPath, metrics, dimensions, limit) {
  const xCol = metrics[0] ?? '';
  const yCol = metrics[1] ?? metrics[0] ?? '';
  const currentColumn = dimensions[drillPath.length] ?? '';
  const children = node.children || [];
  const filtered = filterRows(rows, drillPath);

  return children.slice(0, limit).map(child => {

    const childRows = filtered.filter(r => String(r[currentColumn] ?? '').trim() === child.name);

    const xs = childRows.map(r => Number(r[xCol]) || 0);
    const ys = childRows.map(r => Number(r[yCol]) || 0);

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      name: child.name,
      x: avg(xs),
      y: avg(ys),
      size: xs.reduce((a, b) => a + b, 0),
      count: childRows.length,
    };
  });


}

/**
 * computeHistogramBins
 * --------------------
 * Builds equal-width histogram bins from the filtered raw rows.
 *
 * @param {object[]} rows        - All raw CSV rows (strings)
 * @param {string[]} drillPath   - Current drill steps for row-filtering
 * @param {string}   metricCol   - The numeric column to distribute
 * @param {number}   binCount    - Number of bins (default HISTOGRAM_BINS)
 *
 * @returns {{
 *   labels:   string[],          // e.g. ["0 – 5k", "5k – 10k", ...]
 *   counts:   number[],          // frequency per bin
 *   binRows:  object[][],        // raw rows that fall in each bin
 *   min:      number,
 *   max:      number,
 *   binSize:  number,
 *   metricCol: string
 * }}
 */
export function computeHistogramBins(
  rows,
  drillPath,
  metricCol,
  binCount = HISTOGRAM_BINS,
) {
  // 1. Filter rows to the current drill level
  const filtered = filterRows(rows, drillPath);

  // 2. Parse numeric values
  const values = filtered
    .map((r) => Number(r[metricCol]))
    .filter((v) => !isNaN(v) && isFinite(v));

  if (values.length === 0) {
    return { labels: [], counts: [], binRows: [], min: 0, max: 0, binSize: 0, metricCol };
  }

  // 3. Compute range
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  const range = max - min;

  // Edge case: all values identical → single bin
  const effectiveBins = range === 0 ? 1 : binCount;
  const binSize = range === 0 ? 1 : range / effectiveBins;

  // 4. Initialize bins
  const counts = new Array(effectiveBins).fill(0);
  const binRows = Array.from({ length: effectiveBins }, () => []);

  // 5. Assign each row to its bin
  filtered.forEach((row) => {
    const v = Number(row[metricCol]);
    if (isNaN(v) || !isFinite(v)) return;
    // clamp the last value into the final bin
    const idx = Math.min(
      Math.floor((v - min) / binSize),
      effectiveBins - 1,
    );
    counts[idx] += 1;
    binRows[idx].push(row);
  });

  // 6. Format labels
  const fmt = (v) =>
    v >= 1_000_000
      ? (v / 1_000_000).toFixed(1) + 'M'
      : v >= 1_000
        ? (v / 1_000).toFixed(1) + 'k'
        : Number.isInteger(v)
          ? String(v)
          : v.toFixed(1);

  const labels = Array.from({ length: effectiveBins }, (_, i) => {
    const lo = min + i * binSize;
    const hi = lo + binSize;
    return `${fmt(lo)} – ${fmt(hi)}`;
  });

  return { labels, counts, binRows, min, max, binSize, metricCol };
}

