import { resolveNodeValue } from "../aggregation";

export function formatBubble(node, rows, drillPath, metrics, dimensions, limit, filterRows, aggregation = 'avg') {
  const xCol = metrics[0] ?? '';
  const yCol = metrics[1] ?? metrics[0] ?? '';
  const children = node?.children || [];

  return children.slice(0, limit).map((child) => {
    return {
      name: child.name,
      x: resolveNodeValue(child, xCol, aggregation),
      y: resolveNodeValue(child, yCol, aggregation),
      // Size usually represents the weight/volume, but let's follow the aggregation too
      size: resolveNodeValue(child, xCol, aggregation),
      count: child.count,
    };
  });
}
