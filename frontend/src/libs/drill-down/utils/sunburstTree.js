/**
 * Convert server sunburst payload to client tree shape (ids for rootToNode zoom).
 */

function childList(node) {
  return node?.children ?? node?.Children ?? [];
}

export function serverNormalizedToSunburstChildren(normalized) {
  if (!normalized) return [];

  const nodes = Array.isArray(normalized) ? normalized : [normalized];
  if (nodes.length === 0) return [];

  let root = nodes[0];
  if (
    nodes.length === 1 &&
    (root.name === "root" || root.id === "root") &&
    childList(root).length > 0
  ) {
    root = { ...root, children: childList(root) };
  }

  const convert = (node) => {
    const name = node.name ?? node.Name ?? "—";
    const id = node.id ?? name;
    const kids = childList(node);
    const out = {
      id,
      name,
      value: node.value ?? node.Value ?? 0,
      count: node.count ?? node.Count ?? 0,
    };
    if (kids.length > 0) {
      out.children = kids.map(convert);
    }
    return out;
  };

  if (root.name === "root" || root.id === "root") {
    return (root.children ?? []).map(convert);
  }

  return nodes.map(convert);
}
