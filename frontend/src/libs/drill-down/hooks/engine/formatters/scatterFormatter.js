export function formatScatter(rows, drillPath, metrics, filterRows) {
  const filtered = filterRows(rows, drillPath);
  const xCol = metrics?.[0] ?? '';
  const yCol = metrics?.[1] ?? metrics?.[0] ?? '';
  return { rawData: filtered, xCol, yCol };
}
