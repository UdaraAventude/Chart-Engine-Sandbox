/**
 * Split schema columns vs drill hierarchy (what the server tree actually supports).
 */
export function resolveHierarchyModel(dimensions = [], maxHierarchyDepth = 0, options = {}) {
  const allDimensions = Array.isArray(dimensions) ? dimensions : [];
  const schemaDepth = allDimensions.length;
  const totalRows = options.totalRows ?? 0;

  let treeDepth = maxHierarchyDepth > 0 ? maxHierarchyDepth : 0;

  // Legacy metadata used column count as depth — infer for large files
  if (treeDepth <= 0 || treeDepth >= schemaDepth) {
    if (totalRows > 1_000_000 && schemaDepth > 4) {
      treeDepth = 4;
    } else {
      treeDepth = schemaDepth;
    }
  }

  treeDepth = Math.min(treeDepth, schemaDepth);

  return {
    allDimensions,
    drillableDimensions: allDimensions.slice(0, treeDepth),
    filterOnlyDimensions: allDimensions.slice(treeDepth),
    treeDepth,
    schemaDepth,
    hasFilterOnly: treeDepth < schemaDepth,
  };
}

export function formatDimensionList(columns, max = 4) {
  if (!columns?.length) return '';
  const labels = columns.map((c) => c.replace(/_/g, ' '));
  if (labels.length <= max) return labels.join(', ');
  return `${labels.slice(0, max).join(', ')} +${labels.length - max} more`;
}
