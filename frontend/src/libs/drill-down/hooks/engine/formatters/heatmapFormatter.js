import { resolveNodeValue } from "../aggregation";

export function computeHeatmapData(node, limit, aggregation = 'avg', primaryMetric = '') {
  if (!node || !node.children || node.children.length === 0) {
    return { xCategories: [], yCategories: [], cells: [] };
  }

  // xCategories are the children of the current node (current dimension)
  const xCategories = node.children.slice(0, limit).map(c => c.name);

  // yCategories are the unique grandchildren (next dimension)
  const ySet = new Set();
  node.children.slice(0, limit).forEach(child => {
    (child.children || []).forEach(gc => ySet.add(gc.name));
  });
  const yCategories = Array.from(ySet).sort();

  // cells: [{x, y, value, xLabel, yLabel, count}]
  const cells = [];
  node.children.slice(0, limit).forEach((child, xIndex) => {
    (child.children || []).forEach(gc => {
      const yIndex = yCategories.indexOf(gc.name);
      if (yIndex !== -1) {
        cells.push({
          x: xIndex,
          y: yIndex,
          value: resolveNodeValue(gc, primaryMetric, aggregation),
          xLabel: child.name,
          yLabel: gc.name,
          count: gc.count,
        });
      }
    });
  });

  return { xCategories, yCategories, cells };
}
