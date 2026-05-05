import { resolveNodeValue } from "../aggregation";

export function formatSunburstData(
  node,
  limit,
  aggregation = "avg",
  primaryMetric = "",
) {
  if (!node) return null;

  function buildNode(n, path = "") {
    // Prevent "root" from being prepended to match the ECharts targetNodeId correctly
    const isRoot = path === "" && n.name === "root";
    let currentPath = "";
    if (!isRoot) {
      currentPath = path ? `${path}/${n.name}` : n.name;
    }

    const result = {
      id: currentPath || "root",
      name: n.name,
      value: resolveNodeValue(n, primaryMetric, aggregation),
      count: n.count,
    };

    if (n.children && n.children.length > 0) {
      result.children = n.children.map(c => buildNode(c, currentPath));
      if (limit !== null && result.children.length > limit) {
        result.children = result.children
          .sort((a, b) => b.value - a.value)
          .slice(0, limit);
      }
    }
    return result;
  }

  // Build from the provided node (which could be the root or a sub-node)
  const formattedRoot = buildNode(node);
  return formattedRoot.children || [];
}
