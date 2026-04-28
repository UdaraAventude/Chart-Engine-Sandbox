const MAX_DIMENSION_CARDINALITY = 50;
const MAX_HIERARCHY_DEPTH = 4;

function isNumeric(value) {
  if (value === null || value === undefined || value === '') return false;
  return !isNaN(parseFloat(value)) && isFinite(value);
}

function detectColumns(rows) {
  if (!rows.length) return { dimensions: [], metrics: [] };

  const sample = rows.slice(0, 500);
  const keys = Object.keys(sample[0]);

  const dimensions = [];
  const metrics = [];

  for (const key of keys) {
    const values = sample
      .map((r) => r[key])
      .filter((v) => v !== null && v !== undefined && v !== '');
    if (!values.length) continue;

    const numericCount = values.filter((v) => isNumeric(v)).length;
    const numericRatio = numericCount / values.length;

    if (numericRatio >= 0.8) {
      metrics.push(key);
    } else {
      const unique = new Set(values.map((v) => String(v).trim())).size;
      if (unique >= 2 && unique <= MAX_DIMENSION_CARDINALITY) {
        dimensions.push({ key, cardinality: unique });
      }
    }
  }

  dimensions.sort((a, b) => a.cardinality - b.cardinality);

  return {
    dimensions: dimensions.slice(0, MAX_HIERARCHY_DEPTH).map((d) => d.key),
    metrics,
  };
}

function aggregateMetrics(rows, metrics) {
  const result = {};
  for (const m of metrics) {
    const vals = rows.map((r) => parseFloat(r[m])).filter((v) => !isNaN(v));
    if (!vals.length) continue;
    result[m] = parseFloat(
      (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(4),
    );
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
    const metricAggs = aggregateMetrics(groupRows, metrics);
    const value = primaryMetric
      ? parseFloat(
          (
            groupRows
              .map((r) => parseFloat(r[primaryMetric]))
              .filter((v) => !isNaN(v))
              .reduce((s, v) => s + v, 0) / groupRows.length
          ).toFixed(4),
        )
      : groupRows.length;

    return {
      name,
      value: isNaN(value) ? groupRows.length : value,
      count: groupRows.length,
      metrics: metricAggs,
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
    };
  }

  const { dimensions, metrics } = detectColumns(rows);

  const tree = {
    name: 'root',
    value: 0,
    count: rows.length,
    metrics: aggregateMetrics(rows, metrics),
    children: buildTree(rows, dimensions, metrics, 0),
  };

  return { tree, dimensions, metrics, rows };
}
