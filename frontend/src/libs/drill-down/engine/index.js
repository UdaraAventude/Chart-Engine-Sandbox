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

export function formatForChart(node, chartType, rows, drillPath, metrics) {
  if (!node) return [];

  if (chartType === 'scatter') {
    const filtered = filterRows(rows, drillPath);
    const xCol = metrics?.[0] ?? '';
    const yCol = metrics?.[1] ?? metrics?.[0] ?? '';
    return { rawData: filtered, xCol, yCol };
  }

  return (node.children || []).map((c) => ({
    name: c.name,
    value: c.value,
    count: c.count,
  }));
}

function filterRows(rows, drillPath) {
  if (!drillPath.length) return rows;
  return rows.filter((row) =>
    drillPath.every(
      (step) => String(row[step.column] ?? '').trim() === step.value,
    ),
  );
}
