export function formatStandard(node, limit) {
  if (!node) return [];

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
