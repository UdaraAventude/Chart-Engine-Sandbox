export function computeMultilineData(node, limit) {
  if (!node || !node.children || node.children.length === 0) {
    return { xAxisLabels: [], series: [] };
  }

  // 1. Gather all unique grandchild names to form the common X-axis
  const xSet = new Set();
  node.children.forEach(child => {
    (child.children || []).forEach(gc => xSet.add(gc.name));
  });

  const xAxisLabels = Array.from(xSet).sort();

  // If there's no next dimension (xAxisLabels is empty), we can't draw multiline
  if (xAxisLabels.length === 0) {
    return { xAxisLabels: [], series: [] };
  }

  // 2. Build a series for each top N child
  const series = node.children.slice(0, limit).map(child => {
    const gcMap = {};
    (child.children || []).forEach(gc => {
      gcMap[gc.name] = gc.value;
    });

    const data = xAxisLabels.map(x => gcMap[x] ?? 0);

    return {
      name: child.name,
      data
    };
  });

  return { xAxisLabels, series };
}
