export function formatBubble(node, rows, drillPath, metrics, dimensions, limit, filterRows) {
  const xCol = metrics[0] ?? '';
  const yCol = metrics[1] ?? metrics[0] ?? '';
  const currentColumn = dimensions[drillPath.length] ?? '';
  const children = node?.children || [];
  const filtered = filterRows(rows, drillPath);

  return children.slice(0, limit).map((child) => {
    const childRows = filtered.filter(
      (r) => String(r[currentColumn] ?? '').trim() === child.name
    );

    const xs = childRows.map((r) => Number(r[xCol]) || 0);
    const ys = childRows.map((r) => Number(r[yCol]) || 0);

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    return {
      name: child.name,
      x: avg(xs),
      y: avg(ys),
      size: xs.reduce((a, b) => a + b, 0),
      count: childRows.length,
    };
  });
}
