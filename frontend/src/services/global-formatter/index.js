const MAX_DIMENSION_CARDINALITY = 500;
const MAX_HIERARCHY_DEPTH = 4;
const FALLBACK_TOP_VALUES = 20;
// Numeric columns with ≤ this many unique values are treated as categorical
// dimensions (e.g. year, encoded sex/cp/fbs columns, ordinal scales)
const NUMERIC_CATEGORICAL_THRESHOLD = 25;

function isNumeric(value) {
  if (value === null || value === undefined || value === '') return false;
  return !isNaN(parseFloat(value)) && isFinite(value);
}

// Conservative date pattern matching — avoids false-positives on plain numbers/text
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/, // ISO: 2023-01-15
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // US: 01/15/2023 or 1/15/23
  /^\d{4}\/\d{2}\/\d{2}/, // ISO alt: 2023/01/15
  /^\d{1,2}-\d{1,2}-\d{4}/, // EU: 15-01-2023
  /^[A-Za-z]+ \d{1,2},? \d{4}/, // "January 15, 2023"
  /^\d{1,2} [A-Za-z]+ \d{4}/, // "15 January 2023"
];

function isDateLike(value) {
  const v = String(value).trim();
  if (!v || !DATE_PATTERNS.some((p) => p.test(v))) return false;
  const d = new Date(v);
  return (
    !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100
  );
}

function bucketToYearMonth(value) {
  const v = String(value).trim();
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Phase 1: bucket date columns to YYYY-MM before classification
function preprocessDates(rows) {
  if (!rows.length) return rows;
  const sample = rows.slice(0, 500);
  const keys = Object.keys(sample[0]);
  const dateCols = new Set();

  for (const key of keys) {
    const values = sample
      .map((r) => r[key])
      .filter((v) => v !== null && v !== undefined && v !== '');
    if (!values.length) continue;
    const numericRatio =
      values.filter((v) => isNumeric(v)).length / values.length;
    if (numericRatio >= 0.8) continue;
    const dateRatio =
      values.filter((v) => isDateLike(v)).length / values.length;
    if (dateRatio >= 0.6) dateCols.add(key);
  }

  if (!dateCols.size) return rows;

  return rows.map((row) => {
    const newRow = { ...row };
    for (const col of dateCols) {
      const v = newRow[col];
      if (v !== null && v !== undefined && v !== '') {
        newRow[col] = bucketToYearMonth(v);
      }
    }
    return newRow;
  });
}

// Phase 2: classify columns; returns rejected list for fallback use
function detectColumns(rows) {
  if (!rows.length) return { dimensions: [], metrics: [], rejected: [] };

  const sample = rows.slice(0, 500);
  const keys = Object.keys(sample[0]);

  const dimensions = [];
  const metrics = [];
  const rejected = [];

  for (const key of keys) {
    const values = sample
      .map((r) => r[key])
      .filter((v) => v !== null && v !== undefined && v !== '');
    if (!values.length) {
      rejected.push({ key, reason: 'empty', cardinality: 0 });
      continue;
    }

    const numericRatio =
      values.filter((v) => isNumeric(v)).length / values.length;

    if (numericRatio >= 0.8) {
      const unique = new Set(values.map((v) => String(v).trim())).size;
      if (unique >= 2 && unique <= NUMERIC_CATEGORICAL_THRESHOLD) {
        // Low-cardinality numeric column — treat as categorical dimension
        // (e.g. year, encoded sex/cp/fbs, ordinal rating scales)
        dimensions.push({ key, cardinality: unique });
      } else {
        metrics.push(key);
      }
    } else {
      const unique = new Set(values.map((v) => String(v).trim())).size;
      if (unique >= 2 && unique <= MAX_DIMENSION_CARDINALITY) {
        dimensions.push({ key, cardinality: unique });
      } else {
        rejected.push({
          key,
          reason: unique < 2 ? 'too_few_unique' : 'too_many_unique',
          cardinality: unique,
        });
      }
    }
  }

  dimensions.sort((a, b) => a.cardinality - b.cardinality);

  return {
    dimensions: dimensions.slice(0, MAX_HIERARCHY_DEPTH).map((d) => d.key),
    metrics,
    rejected,
  };
}

// Phase 3: fallback — bucket high-cardinality columns to Top-N + "Other"
function applyFallbackBucketing(rows, rejected) {
  const candidates = rejected
    .filter((r) => r.reason === 'too_many_unique')
    .sort((a, b) => a.cardinality - b.cardinality)
    .slice(0, MAX_HIERARCHY_DEPTH);

  if (!candidates.length) return { patchedRows: rows, fallbackDimensions: [] };

  const sample = rows.slice(0, 500);
  const topValMaps = new Map();

  for (const { key } of candidates) {
    const freq = new Map();
    for (const row of sample) {
      const v = String(row[key] ?? '').trim();
      if (!v) continue;
      freq.set(v, (freq.get(v) ?? 0) + 1);
    }
    const top = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, FALLBACK_TOP_VALUES)
      .map((e) => e[0]);
    topValMaps.set(key, new Set(top));
  }

  const patchedRows = rows.map((row) => {
    const newRow = { ...row };
    for (const { key } of candidates) {
      const v = String(newRow[key] ?? '').trim();
      if (v && !topValMaps.get(key).has(v)) {
        newRow[key] = 'Other';
      }
    }
    return newRow;
  });

  return {
    patchedRows,
    fallbackDimensions: candidates.map((c) => c.key),
  };
}

// Computes all aggregation methods for each metric column
// Returns: { salary: { avg, sum, min, max, count }, age: { ... }, ... }
function aggregateAllMethods(rows, metrics) {
  const result = {};
  for (const m of metrics) {
    const vals = rows.map(r => parseFloat(r[m])).filter(v => !isNaN(v));
    if (!vals.length) {
      result[m] = { avg: 0, sum: 0, min: 0, max: 0, count: 0 };
      continue;
    }
    const sum = vals.reduce((s, v) => s + v, 0);
    let min = vals[0];
    let max = vals[0];
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] < min) min = vals[i];
      if (vals[i] > max) max = vals[i];
    }
    result[m] = {
      avg: parseFloat((sum / vals.length).toFixed(4)),
      sum: parseFloat(sum.toFixed(4)),
      min: parseFloat(min.toFixed(4)),
      max: parseFloat(max.toFixed(4)),
      count: vals.length,
    };
  }
  return result;
}

function buildTree(rows, dimensions, metrics, depth = 0) {
  if (depth >= dimensions.length || !rows.length) return [];

  const col = dimensions[depth];
  const groups = new Map();

  for (const row of rows) {
    const key = String(row[col] ?? 'Unknown').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const primaryMetric = metrics[0];

  return Array.from(groups.entries()).map(([name, groupRows]) => {
    const children = buildTree(groupRows, dimensions, metrics, depth + 1);
    const aggs = aggregateAllMethods(groupRows, metrics);


    const primaryAggs = primaryMetric ? aggs[primaryMetric] : null;
    const value = primaryAggs ? primaryAggs.avg : groupRows.length;

    return {
      name,
      value,
      count: groupRows.length,
      aggs,
      children,
    };
  });

}

export function formatCSV(rows) {
  if (!rows || !rows.length) {
    return {
      tree: { name: 'root', children: [], count: 0, metrics: {} },
      dimensions: [],
      metrics: [],
      rows: [],
      rejected: [],
    };
  }

  // Phase 1: bucket date columns to YYYY-MM
  const processedRows = preprocessDates(rows);

  // Phase 2: classify columns
  let { dimensions, metrics, rejected } = detectColumns(processedRows);

  // Phase 3: if still no dimensions, bucket high-cardinality columns Top-N + "Other"
  let finalRows = processedRows;
  if (dimensions.length === 0) {
    const { patchedRows, fallbackDimensions } = applyFallbackBucketing(
      processedRows,
      rejected,
    );
    if (fallbackDimensions.length) {
      finalRows = patchedRows;
      dimensions = fallbackDimensions;
      rejected = rejected.filter((r) => !fallbackDimensions.includes(r.key));
    }
  }
  const rootAggs = aggregateAllMethods(finalRows, metrics);
  const tree = {
    name: 'root',
    value: 0,
    count: finalRows.length,
    aggs: rootAggs,
    children: buildTree(finalRows, dimensions, metrics, 0),
  };


  return { tree, dimensions, metrics, rows: finalRows, rejected };
}
