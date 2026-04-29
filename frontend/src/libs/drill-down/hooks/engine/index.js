const CHART_TOP_N = 50;

export function getNodeAtPath(tree, drillPath) {
  if (!tree || !drillPath.length) return tree;
  let node = tree;
  for (const step of drillPath) {
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

function filterRows(rows, drillPath) {
  if (!drillPath.length) return rows;
  return rows.filter((row) =>
    drillPath.every(
      (step) => String(row[step.column] ?? '').trim() === step.value,
    ),
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

