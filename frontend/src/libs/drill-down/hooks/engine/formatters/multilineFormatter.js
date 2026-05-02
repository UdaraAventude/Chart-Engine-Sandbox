import { resolveNodeValue } from '../aggregation';

export function computeMultilineData(node, limit, aggregation = 'avg', primaryMetric = '') {
  if (!node || !node.children || node.children.length === 0) {
    return { xAxisLabels: [], series: [] };
  }

  const allGrandchildrenNames = new Set();
  node.children.slice(0, limit).forEach(child => {
    (child.children || []).forEach(gc => allGrandchildrenNames.add(gc.name));
  });

  const xAxisLabels = Array.from(allGrandchildrenNames);

  const series = node.children.slice(0, limit).map(child => {
    const gcMap = {};
    (child.children || []).forEach(gc => {
      gcMap[gc.name] = resolveNodeValue(gc, primaryMetric, aggregation);
    });
    const data = xAxisLabels.map(x => gcMap[x] ?? 0);
    return { name: child.name, data };
  });

  return { xAxisLabels, series };
}
