export function formatColumnLabel(column) {
  if (!column) return '';
  if (column.startsWith('__hist__')) {
    const metric = column.slice('__hist__'.length);
    return `${metric.replace(/_/g, ' ')} (range)`;
  }
  return column.replace(/_/g, ' ');
}

export function getCategoricalDepth(drillPath) {
  return drillPath.filter((s) => !s.column.startsWith('__hist__')).length;
}

export function getDepthContext(drillPath, dimensions) {
  const categoricalDepth = getCategoricalDepth(drillPath);
  const maxDepth = dimensions?.length ?? 0;
  const currentDimension = dimensions[categoricalDepth] ?? null;
  const nextDimension = dimensions[categoricalDepth + 1] ?? null;
  const atMaxDepth = maxDepth > 0 && categoricalDepth >= maxDepth;
  const canDrillFurther = !atMaxDepth && Boolean(nextDimension);

  return {
    categoricalDepth,
    displayLevel: categoricalDepth + 1,
    maxDepth,
    currentDimension,
    nextDimension,
    atMaxDepth,
    canDrillFurther,
    progressPct: maxDepth > 0 ? Math.round((categoricalDepth / maxDepth) * 100) : 0,
  };
}

export function buildHierarchySteps(dimensions, drillPath) {
  const categoricalSteps = drillPath.filter((s) => !s.column.startsWith('__hist__'));
  const histSteps = drillPath.filter((s) => s.column.startsWith('__hist__'));

  const categoricalCount = categoricalSteps.length;

  const steps = (dimensions ?? []).map((dim, index) => {
    const match = categoricalSteps.find((s) => s.column === dim);
    let status = 'upcoming';
    if (match) status = 'completed';
    else if (index === categoricalCount) status = 'current';

    return {
      type: 'dimension',
      column: dim,
      label: formatColumnLabel(dim),
      value: match?.value ?? null,
      status,
      depthIndex: index,
    };
  });

  histSteps.forEach((step, i) => {
    steps.push({
      type: 'histogram',
      column: step.column,
      label: formatColumnLabel(step.column),
      value: step.value,
      status: 'completed',
      depthIndex: dimensions.length + i,
    });
  });

  return steps;
}
