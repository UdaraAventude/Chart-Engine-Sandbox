/**
 * Analytics and Data Transformation Helpers for ECharts Drill-Down
 */

/**
 * Navigates the pre-aggregated tree to a specific subtree based on drillPath
 */
export function getSubtreeForPath(treeNodes, drillPath) {
  let nodes = treeNodes;
  for (const step of drillPath) {
    const match = nodes.find(n => n.name === String(step.value));
    if (!match) return nodes;
    if (!match.children) {
      // Leaf node reached — wrap it so the sunburst renders ONLY this node
      return [{ ...match }];
    }
    nodes = match.children;
  }
  return nodes;
}

/**
 * Parses a range label into [min, max]
 * Supports backend "(4.887, 23.833)" and frontend "4.9-23.8" formats
 */
export function parseRangeLabel(label) {
  if (!label) return null;
  const nums = label.match(/\d+\.?\d*/g);
  if (!nums || nums.length < 2) return null;
  return [parseFloat(nums[0]), parseFloat(nums[1])];
}

/**
 * Builds sunburst tree structure from raw dataset (fallback when no pre-agg exists)
 */
export const buildSunburstTreeFromDataset = (filteredData, hierarchy, measureCol, drillPath, maxLevels = 4) => {
  const remainingHierarchy = hierarchy.slice(drillPath.length);
  const levels = remainingHierarchy.slice(0, maxLevels);

  if (levels.length === 0) {
    const total = Math.round(
      filteredData.reduce((sum, r) => sum + (parseFloat(r[measureCol]) || 0), 0)
    );
    const leafName = drillPath[drillPath.length - 1]?.value || 'Current Level';
    return [{ name: String(leafName), value: total, sum: total, count: filteredData.length }];
  }

  function buildNode(rows, levelIndex) {
    if (levelIndex >= levels.length) return [];
    const col = levels[levelIndex];
    const groups = {};
    for (const row of rows) {
      const key = String(row[col] ?? 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return Object.entries(groups).map(([name, groupRows]) => {
      const value = Math.round(
        groupRows.reduce((sum, r) => sum + (parseFloat(r[measureCol]) || 0), 0)
      );
      const children = buildNode(groupRows, levelIndex + 1);
      return {
        name,
        value: children.length ? undefined : value,
        children: children.length ? children : undefined,
      };
    }).sort((a, b) => (b.value || 0) - (a.value || 0));
  }

  return buildNode(filteredData, 0);
};

/**
 * Computes Pearson correlation matrix for numeric columns
 */
export function computeCorrelationFrontend(data, numericCols) {
  const avail = numericCols.filter(col => data[0]?.[col] !== undefined).slice(0, 12);
  const n = data.length;
  
  const colArrays = {};
  avail.forEach(col => {
    colArrays[col] = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
  });

  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const pearson = (xs, ys) => {
    const len = Math.min(xs.length, ys.length);
    if (len < 2) return 0;
    const mx = mean(xs), my = mean(ys);
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < len; i++) {
      const a = xs[i] - mx, b = ys[i] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : parseFloat((num / denom).toFixed(3));
  };

  const matrix = [];
  avail.forEach(c1 => {
    avail.forEach(c2 => {
      matrix.push({ x: c1, y: c2, value: pearson(colArrays[c1], colArrays[c2]) });
    });
  });

  return { columns: avail, matrix };
}

/**
 * Computes histogram bins for a numeric column
 */
export function computeHistogramFrontend(data, col, bins = 10) {
  const values = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
  if (values.length === 0) return { labels: [], counts: [], col };
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const counts = new Array(bins).fill(0);
  let step = 0;
  
  if (max === min) {
    counts[0] = values.length;
  } else {
    step = (max - min) / bins;
    values.forEach(v => {
      let idx = Math.floor((v - min) / step);
      if (idx >= bins) idx = bins - 1;
      counts[idx]++;
    });
  }

  const labels = Array.from({ length: bins }, (_, i) => {
    const lo = min + i * step;
    const hi = min + (i + 1) * step;
    return `${lo.toFixed(1)}–${hi.toFixed(1)}`;
  });

  return { labels, counts, col };
}
