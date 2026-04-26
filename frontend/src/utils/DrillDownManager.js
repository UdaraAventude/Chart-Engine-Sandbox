/**
 * DrillDownManager.js
 * Pure utility functions for data processing in drill-down mode.
 */

export function classifyColumns(dataset) {
  if (!dataset || dataset.length === 0) return {};
  const sample = dataset.slice(0, Math.min(500, dataset.length));
  const keys = Object.keys(sample[0]);
  const result = {};

  for (const key of keys) {
    const values = sample
      .map(r => r[key])
      .filter(v => v !== null && v !== undefined && v !== '');

    const uniqueVals = new Set(values.map(v => String(v)));
    const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
    const pctNumeric = numericCount / values.length;
    const pctUnique = uniqueVals.size / values.length;

    // ← KEY FIX: numeric columns with ≤10 unique values
    //   are coded/ordinal categoricals (e.g. sex=0/1, cp=1/2/3/4)
    if (pctNumeric > 0.85 && uniqueVals.size <= 10) {
      result[key] = 'categorical';
    } else if (pctNumeric > 0.85) {
      result[key] = 'numeric';
    } else if (uniqueVals.size <= 20 || pctUnique <= 0.3) {
      result[key] = 'categorical';
    } else {
      result[key] = 'high_cardinality';
    }
  }
  return result;
}

export const buildDrillHierarchy = (dataset, columnTypes, maxLevels = 4) => {
  const categoricalCols = Object.keys(columnTypes).filter(col => columnTypes[col] === 'categorical');
  
  const stats = categoricalCols.map(col => {
    const uniqueCount = new Set(dataset.map(row => row[col])).size;
    return { col, uniqueCount };
  });

  return stats
    .sort((a, b) => a.uniqueCount - b.uniqueCount)
    .slice(0, maxLevels)
    .map(s => s.col);
};

export const filterByDrillPath = (dataset, drillPath) => {
  if (!drillPath || drillPath.length === 0) return dataset;
  return dataset.filter(row => 
    drillPath.every(step => {
      const rowVal = row[step.column];
      // Loose equality to handle potential type differences (e.g., "1" vs 1)
      return String(rowVal) === String(step.value);
    })
  );
};

export const aggregateForChart = (filteredData, groupByColumn, measureColumn, method = 'sum') => {
  const groups = {};
  
  filteredData.forEach(row => {
    const key = row[groupByColumn] === null || row[groupByColumn] === undefined ? 'Unknown' : String(row[groupByColumn]);
    if (!groups[key]) {
      groups[key] = { name: key, values: [], rawRows: [] };
    }
    const val = parseFloat(row[measureColumn]);
    if (!isNaN(val)) groups[key].values.push(val);
    groups[key].rawRows.push(row);
  });

  const result = Object.values(groups).map(g => {
    let aggValue = 0;
    const nums = g.values;
    if (method === 'count') {
      aggValue = g.rawRows.length;
    } else if (nums.length > 0) {
      if (method === 'sum') aggValue = nums.reduce((a, b) => a + b, 0);
      else if (method === 'avg') aggValue = nums.reduce((a, b) => a + b, 0) / nums.length;
      else if (method === 'min') aggValue = Math.min(...nums);
      else if (method === 'max') aggValue = Math.max(...nums);
    }

    return {
      name: g.name,
      value: aggValue,
      count: g.rawRows.length,
      rawRows: g.rawRows
    };
  });

  return result.sort((a, b) => b.value - a.value);
};

export const aggregateForHeatmap = (filteredData, xCol, yCol, measureCol, bins = 8) => {
  const getBounds = (col) => {
    const vals = filteredData.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
    if (vals.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  };

  const xBounds = getBounds(xCol);
  const yBounds = getBounds(yCol);

  const getBin = (val, bounds) => {
    if (bounds.max === bounds.min) return 0;
    const b = Math.floor(((val - bounds.min) / (bounds.max - bounds.min)) * bins);
    return Math.min(Math.max(0, b), bins - 1);
  };

  const xRange = xBounds.max - xBounds.min;
  const yRange = yBounds.max - yBounds.min;

  const xCategories = Array.from({ length: bins }, (_, i) => {
    const start = xBounds.min + (i * xRange) / bins;
    const end = xBounds.min + ((i + 1) * xRange) / bins;
    return `${start.toFixed(1)}-${end.toFixed(1)}`;
  });

  const yCategories = Array.from({ length: bins }, (_, i) => {
    const start = yBounds.min + (i * yRange) / bins;
    const end = yBounds.min + ((i + 1) * yRange) / bins;
    return `${start.toFixed(1)}-${end.toFixed(1)}`;
  });

  const grid = {};
  filteredData.forEach(row => {
    const xVal = parseFloat(row[xCol]);
    const yVal = parseFloat(row[yCol]);
    const mVal = parseFloat(row[measureCol]);
    if (isNaN(xVal) || isNaN(yVal)) return;

    const xi = getBin(xVal, xBounds);
    const yi = getBin(yVal, yBounds);
    const key = `${xi}-${yi}`;

    if (!grid[key]) grid[key] = { values: [], count: 0 };
    if (!isNaN(mVal)) grid[key].values.push(mVal);
    grid[key].count++;
  });

  const cells = [];
  for (let xi = 0; xi < bins; xi++) {
    for (let yi = 0; yi < bins; yi++) {
      const data = grid[`${xi}-${yi}`] || { values: [], count: 0 };
      const avg = data.values.length > 0 ? data.values.reduce((a, b) => a + b, 0) / data.values.length : 0;
      cells.push({
        x: xi,
        y: yi,
        xLabel: xCategories[xi],
        yLabel: yCategories[yi],
        value: avg,
        count: data.count
      });
    }
  }

  return { xCategories, yCategories, cells };
};

export const aggregateForBubble = (filteredData, groupCol, xCol, yCol, sizeCol) => {
  const groups = {};
  filteredData.forEach(row => {
    const key = row[groupCol] === null || row[groupCol] === undefined ? 'Unknown' : String(row[groupCol]);
    if (!groups[key]) groups[key] = { name: key, xs: [], ys: [], sizes: [], count: 0 };
    
    const x = parseFloat(row[xCol]);
    const y = parseFloat(row[yCol]);
    const s = parseFloat(row[sizeCol]);

    if (!isNaN(x)) groups[key].xs.push(x);
    if (!isNaN(y)) groups[key].ys.push(y);
    if (!isNaN(s)) groups[key].sizes.push(s);
    groups[key].count++;
  });

  return Object.values(groups).map(g => ({
    name: g.name,
    x: g.xs.length > 0 ? g.xs.reduce((a, b) => a + b, 0) / g.xs.length : 0,
    y: g.ys.length > 0 ? g.ys.reduce((a, b) => a + b, 0) / g.ys.length : 0,
    size: g.sizes.length > 0 ? g.sizes.reduce((a, b) => a + b, 0) : 0,
    count: g.count
  }));
};

export const drillInto = (currentPath, column, value) => {
  return [...currentPath, { column, value }];
};

export const drillBackTo = (currentPath, depth) => {
  return currentPath.slice(0, depth);
};

export const isLeafLevel = (drillPath, hierarchy) => {
  return drillPath.length >= hierarchy.length;
};

export const getCurrentGroupByColumn = (drillPath, hierarchy) => {
  return hierarchy[drillPath.length] || null;
};
