import { resolveNodeValue } from "../aggregation";

export function formatSunburstData(
  node,
  limit,
  aggregation = "avg",
  primaryMetric = "",
) {
  if (!node) return null;

  function buildNode(n) {
    const result = {
      name: n.name,
      value: resolveNodeValue(n, primaryMetric, aggregation), // ← Use the utility here!
      count: n.count,
    };

    if (n.children && n.children.length > 0) {
      result.children = n.children.map(buildNode);
      // If there is a limit, we sort and slice the children
      if (limit !== null && result.children.length > limit) {
        result.children = result.children
          .sort((a, b) => b.value - a.value)
          .slice(0, limit);
      }
    }
    return result;
  }

  // The sunburst expects a root node with a children array
  const formattedRoot = buildNode(node);
  return formattedRoot.children || [];
}
