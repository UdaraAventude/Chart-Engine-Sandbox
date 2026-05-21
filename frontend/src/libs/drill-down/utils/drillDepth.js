import { resolveHierarchyModel } from './hierarchyModel';

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

/**
 * Depth context uses drillable hierarchy only (not full schema column count).
 */
export function getDepthContext(drillPath, dimensions, options = {}) {
  const model = resolveHierarchyModel(dimensions, options.maxHierarchyDepth ?? 0, {
    totalRows: options.totalRows ?? 0,
  });
  const { drillableDimensions, treeDepth, schemaDepth, filterOnlyDimensions, hasFilterOnly } =
    model;

  const categoricalDepth = getCategoricalDepth(drillPath);
  const maxDepth = treeDepth;
  const atMaxDepth = maxDepth > 0 && categoricalDepth >= maxDepth;
  const atTreeLeaf = atMaxDepth;
  /** Can add one more drill step (e.g. pick PhD when viewing education bars at 3/4). */
  const canDrillFurther = maxDepth > 0 && categoricalDepth < maxDepth;
  /** Dimension labels for the chart you are viewing now. */
  const breakdownDimension =
    canDrillFurther && drillableDimensions[categoricalDepth]
      ? drillableDimensions[categoricalDepth]
      : null;
  const currentDimension = breakdownDimension;
  const nextDimension = drillableDimensions[categoricalDepth + 1] ?? null;

  const lastStep = drillPath.filter((s) => !s.column.startsWith('__hist__')).at(-1);

  return {
    ...model,
    categoricalDepth,
    displayLevel:
      maxDepth > 0
        ? Math.min(categoricalDepth + 1, maxDepth)
        : categoricalDepth + 1,
    maxDepth,
    currentDimension,
    nextDimension,
    atMaxDepth,
    atTreeLeaf,
    canDrillFurther,
    breakdownDimension,
    progressPct: maxDepth > 0 ? Math.round((categoricalDepth / maxDepth) * 100) : 0,
    segmentLabel: lastStep?.value ?? null,
    segmentColumn: lastStep?.column ?? null,
    filterOnlyDimensions,
    hasFilterOnly,
  };
}

export function buildHierarchySteps(dimensions, drillPath, options = {}) {
  const { drillableDimensions } = resolveHierarchyModel(
    dimensions,
    options.maxHierarchyDepth ?? 0,
    { totalRows: options.totalRows ?? 0 },
  );

  const categoricalSteps = drillPath.filter((s) => !s.column.startsWith('__hist__'));
  const histSteps = drillPath.filter((s) => s.column.startsWith('__hist__'));
  const categoricalCount = categoricalSteps.length;

  const steps = drillableDimensions.map((dim, index) => {
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
      depthIndex: drillableDimensions.length + i,
    });
  });

  return steps;
}

/** Trim drill path if dataset tree is shallower than saved path (e.g. after re-upload). */
export function trimDrillPathToTreeDepth(drillPath, maxHierarchyDepth, dimensions = [], totalRows = 0) {
  const { treeDepth } = resolveHierarchyModel(dimensions, maxHierarchyDepth, { totalRows });
  const cat = drillPath.filter((s) => !s.column.startsWith('__hist__'));
  const hist = drillPath.filter((s) => s.column.startsWith('__hist__'));
  if (cat.length <= treeDepth) return drillPath;
  return [...cat.slice(0, treeDepth), ...hist];
}
