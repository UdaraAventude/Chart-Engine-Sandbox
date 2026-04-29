import { formatForChartRegistry } from './formatters';
import { parseHistBinRange, computeHistogramBins } from './formatters/histogramFormatter';

const CHART_TOP_N = 50;

export function getNodeAtPath(tree, drillPath) {
  if (!tree || !drillPath.length) return tree;
  let node = tree;
  for (const step of drillPath) {
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

export function filterRows(rows, drillPath) {
  if (!drillPath.length) return rows;
  return rows.filter((row) =>
    drillPath.every((step) => {
      if (step.column.startsWith('__hist__')) {
        const metricCol = step.column.slice('__hist__'.length);
        const range = parseHistBinRange(step.value);
        if (!range) return true;
        const v = Number(row[metricCol]);
        return !isNaN(v) && v >= range.lo && v < range.hi;
      }
      return String(row[step.column] ?? '').trim() === step.value;
    }),
  );
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
  return formatForChartRegistry(
    node,
    chartType,
    rows,
    drillPath,
    metrics,
    dimensions,
    limit,
    filterRows
  );
}

// We re-export computeHistogramBins because the UI component calls it directly
export { computeHistogramBins };
