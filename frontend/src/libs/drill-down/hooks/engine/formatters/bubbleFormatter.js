export function formatBubble(node, rows, drillPath, metrics, dimensions, limit, filterRows, aggregation = 'avg') {
  if (!node || metrics.length < 2 || dimensions.length < 1) return [];

  const children = node.children || [];
  const xCol = metrics[0];
  const yCol = metrics[1];

  let filtered = rows;
  if (drillPath && drillPath.length > 0) {
    filtered = filterRows(rows, drillPath);
  }

  return children.slice(0, limit).map(child => {
    const dimCol = dimensions[drillPath.length];
    const childRows = filtered.filter(r => String(r[dimCol] ?? 'Unknown').trim() === child.name);

    const xs = childRows.map(r => Number(r[xCol]) || 0);
    const ys = childRows.map(r => Number(r[yCol]) || 0);

    // NEW: Compute x and y using the selected aggregation method
    function aggregate(arr) {
      if (!arr.length) return 0;
      if (aggregation === 'sum') return arr.reduce((a, b) => a + b, 0);
      if (aggregation === 'count') return arr.length;
      if (aggregation === 'min') return Math.min(...arr);
      if (aggregation === 'max') return Math.max(...arr);
      return arr.reduce((a, b) => a + b, 0) / arr.length; // avg default
    }

    return {
      name: child.name,
      x: aggregate(xs),
      y: aggregate(ys),
      size: xs.reduce((a, b) => a + b, 0), // Keeping size as sum
      count: childRows.length,
    };
  });
}
