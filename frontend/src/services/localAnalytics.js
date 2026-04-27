import Papa from 'papaparse';

const SAMPLE_ROWS = 2000;
const DRILL_HIERARCHY = ['country', 'department', 'seniority_level', 'education_level'];
const MEASURE_COL = 'monthly_salary';
const TIMESERIES_COL = 'overall_satisfaction';

const NUMERIC_COLS = [
  'age',
  'years_at_company',
  'monthly_salary',
  'bonus_pct',
  'commute_time_min',
  'overall_satisfaction',
  'work_life_balance',
  'career_growth',
  'management_satisfaction',
  'team_collaboration',
  'compensation_satisfaction',
  'turnover_risk_score',
];

const DIMENSION_EXTRAS = ['gender', 'employment_type', 'age_group', 'quarter'];

const DATASET_CONFIGS = {
  cleveland: {
    chart_type: 'scatter',
    x_axis: 'age',
    y_axis: 'chol',
    title: 'Age vs Cholesterol',
    correlation_score: 0.21,
  },
  superstore: {
    chart_type: 'scatter',
    x_axis: 'Sales',
    y_axis: 'Profit',
    title: 'Sales vs Profit',
    correlation_score: 0.48,
  },
  ecommerce: {
    chart_type: 'sunburst',
    x_axis: 'Revenue',
    y_axis: 'Profit',
    title: 'Global E-Commerce Revenue Breakdown',
    correlation_score: 0.87,
  },
  employee_survey: {
    chart_type: 'sunburst',
    x_axis: 'monthly_salary',
    y_axis: 'overall_satisfaction',
    title: 'Employee Satisfaction & Salary Analysis',
    correlation_score: 0.41,
    drill_hierarchy: ['country', 'department', 'seniority_level', 'education_level'],
    measure_col: 'monthly_salary',
    size_col: 'turnover_risk_score',
  },
};

const CLEVELAND_COLUMNS = [
  'age',
  'sex',
  'cp',
  'trestbps',
  'chol',
  'fbs',
  'restecg',
  'thalach',
  'exang',
  'oldpeak',
  'slope',
  'ca',
  'thal',
  'num',
];

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeCell(value) {
  if (value === undefined || value === '') return null;
  return value;
}

function sanitizeRow(row) {
  const clean = {};
  for (const [key, value] of Object.entries(row || {})) {
    clean[String(key).trim()] = sanitizeCell(value);
  }
  return clean;
}

function dropAllNullRows(rows) {
  return rows.filter((row) => Object.values(row).some((v) => v !== null && v !== undefined && v !== ''));
}

function parseClevelandRows(rawRows) {
  return rawRows
    .map((row) => {
      const clean = {};
      CLEVELAND_COLUMNS.forEach((col, index) => {
        const raw = row[index];
        if (raw === '?' || raw === undefined || raw === '') {
          clean[col] = null;
          return;
        }
        const num = Number(raw);
        clean[col] = Number.isFinite(num) ? num : raw;
      });
      return clean;
    })
    .filter((row) => Object.values(row).every((v) => v !== null));
}

function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const isCleveland = (file?.name || '').toLowerCase() === 'processed.cleveland.data';
    Papa.parse(file, {
      header: !isCleveland,
      skipEmptyLines: true,
      worker: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors?.length) {
          reject(new Error(results.errors[0].message || 'CSV parse error'));
          return;
        }

        let rows = results.data || [];
        if (isCleveland) {
          rows = parseClevelandRows(rows);
        } else {
          rows = rows.map((row) => sanitizeRow(row));
        }

        rows = dropAllNullRows(rows);

        if (!rows.length) {
          reject(new Error('CSV contains no usable rows.'));
          return;
        }

        resolve(rows);
      },
      error: (error) => reject(error),
    });
  });
}

function detectChartConfig(rows) {
  const columns = Object.keys(rows[0] || {});
  const colsLower = columns.map((c) => c.toLowerCase());

  if (colsLower.includes('age') && colsLower.includes('chol')) return DATASET_CONFIGS.cleveland;
  if (colsLower.includes('sales') && colsLower.includes('profit')) return DATASET_CONFIGS.superstore;
  if (colsLower.includes('region') && colsLower.includes('revenue') && colsLower.includes('sub_category')) {
    return DATASET_CONFIGS.ecommerce;
  }
  if (colsLower.includes('overall_satisfaction') && colsLower.includes('seniority_level') && colsLower.includes('municipality')) {
    return DATASET_CONFIGS.employee_survey;
  }

  const numericCols = columns.filter((col) => rows.some((row) => toNumber(row[col]) !== null));
  if (numericCols.length >= 2) {
    const [xCol, yCol] = numericCols;
    return {
      chart_type: 'scatter',
      x_axis: xCol,
      y_axis: yCol,
      title: `${xCol} vs ${yCol}`,
      correlation_score: round(correlationForColumns(rows, xCol, yCol), 2),
    };
  }

  if (columns.length >= 2) {
    return {
      chart_type: 'scatter',
      x_axis: columns[0],
      y_axis: columns[1],
      title: `${columns[0]} vs ${columns[1]}`,
      correlation_score: 0,
    };
  }

  throw new Error('Dataset has fewer than 2 columns');
}

function sum(arr) {
  return arr.reduce((acc, v) => acc + v, 0);
}

function mean(arr) {
  return arr.length ? sum(arr) / arr.length : 0;
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = mean(arr.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

function valueCounts(rows, col) {
  const map = new Map();
  rows.forEach((row) => {
    const key = String(row[col] ?? 'Unknown');
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function topKey(countMap) {
  let top = null;
  let count = -1;
  for (const [key, value] of countMap.entries()) {
    if (value > count) {
      top = key;
      count = value;
    }
  }
  return top;
}

function computeKpis(rows) {
  const kpi = { total_rows: rows.length };

  if (rows[0]?.overall_satisfaction !== undefined) {
    const vals = rows.map((r) => toNumber(r.overall_satisfaction)).filter((v) => v !== null);
    if (vals.length) {
      kpi.avg_satisfaction = round(mean(vals), 2);
      kpi.median_satisfaction = round(median(vals), 2);
      kpi.std_satisfaction = round(std(vals), 2);
    }
  }

  if (rows[0]?.monthly_salary !== undefined) {
    const vals = rows.map((r) => toNumber(r.monthly_salary)).filter((v) => v !== null);
    if (vals.length) kpi.avg_salary = toInt(mean(vals));
  }

  if (rows[0]?.turnover_risk_score !== undefined) {
    const vals = rows.map((r) => toNumber(r.turnover_risk_score)).filter((v) => v !== null);
    if (vals.length) kpi.avg_turnover_risk = round(mean(vals), 2);
  }

  if (rows[0]?.country !== undefined) {
    const counts = valueCounts(rows, 'country');
    kpi.top_country = topKey(counts);
    kpi.n_countries = counts.size;
  }

  if (rows[0]?.department !== undefined) {
    kpi.top_department = topKey(valueCounts(rows, 'department'));
  }

  if (rows[0]?.municipality !== undefined) {
    kpi.n_municipalities = valueCounts(rows, 'municipality').size;
  }

  return kpi;
}

function buildGrouped(rows, hierarchy, measure) {
  const groupedMap = new Map();

  rows.forEach((row) => {
    const m = toNumber(row[measure]);
    if (m === null) return;

    const keyValues = hierarchy.map((col) => String(row[col] ?? 'Unknown'));
    const key = keyValues.join('|');
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        hierarchyValues: keyValues,
        sum: 0,
        count: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
      });
    }
    const g = groupedMap.get(key);
    g.sum += m;
    g.count += 1;
    g.min = Math.min(g.min, m);
    g.max = Math.max(g.max, m);
  });

  return Array.from(groupedMap.values()).map((g) => ({
    hierarchyValues: g.hierarchyValues,
    sum: toInt(g.sum),
    avg: toInt(g.sum / g.count),
    count: g.count,
    min: toInt(g.min),
    max: toInt(g.max),
  }));
}

function aggregateGrouped(groupedRows, nameIndex) {
  const map = new Map();
  groupedRows.forEach((row) => {
    const name = row.hierarchyValues[nameIndex];
    if (!map.has(name)) {
      map.set(name, { name, sum: 0, avgNumerator: 0, count: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY });
    }
    const agg = map.get(name);
    agg.sum += row.sum;
    agg.avgNumerator += row.avg * row.count;
    agg.count += row.count;
    agg.min = Math.min(agg.min, row.min);
    agg.max = Math.max(agg.max, row.max);
  });

  return Array.from(map.values()).map((row) => ({
    name: row.name,
    sum: toInt(row.sum),
    avg: row.count > 0 ? toInt(row.avgNumerator / row.count) : 0,
    count: row.count,
    min: toInt(row.min),
    max: toInt(row.max),
  }));
}

function buildDrillFlat(grouped, hierarchy) {
  const n = hierarchy.length;
  const flat = {};

  if (n >= 1) {
    flat[''] = aggregateGrouped(grouped, 0);
  }

  if (n >= 2) {
    const levelMap = new Map();
    grouped.forEach((row) => {
      const key = row.hierarchyValues[0];
      if (!levelMap.has(key)) levelMap.set(key, []);
      levelMap.get(key).push(row);
    });

    for (const [key, rows] of levelMap.entries()) {
      flat[String(key)] = aggregateGrouped(rows, 1);
    }
  }

  if (n >= 3) {
    const levelMap = new Map();
    grouped.forEach((row) => {
      const key = `${row.hierarchyValues[0]}|${row.hierarchyValues[1]}`;
      if (!levelMap.has(key)) levelMap.set(key, []);
      levelMap.get(key).push(row);
    });

    for (const [key, rows] of levelMap.entries()) {
      flat[key] = aggregateGrouped(rows, 2);
    }
  }

  if (n >= 4) {
    const levelMap = new Map();
    grouped.forEach((row) => {
      const key = `${row.hierarchyValues[0]}|${row.hierarchyValues[1]}|${row.hierarchyValues[2]}`;
      if (!levelMap.has(key)) levelMap.set(key, []);
      levelMap.get(key).push(row);
    });

    for (const [key, rows] of levelMap.entries()) {
      flat[key] = rows.map((row) => ({
        name: String(row.hierarchyValues[3]),
        sum: row.sum,
        avg: row.avg,
        count: row.count,
        min: row.min,
        max: row.max,
      }));
    }
  }

  return flat;
}

function buildDrillTree(grouped, hierarchy) {
  function node(rows, depth) {
    if (depth >= hierarchy.length) return [];

    const map = new Map();
    rows.forEach((row) => {
      const key = row.hierarchyValues[depth];
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });

    const out = [];
    for (const [name, subRows] of map.entries()) {
      const s = sum(subRows.map((r) => r.sum));
      const c = sum(subRows.map((r) => r.count));
      if (depth === hierarchy.length - 1) {
        out.push({ name: String(name), value: toInt(s), sum: toInt(s), count: c });
      } else {
        const children = node(subRows, depth + 1);
        out.push({ name: String(name), children, sum: toInt(s), count: c, value: toInt(s) });
      }
    }

    out.sort((a, b) => (b.sum || 0) - (a.sum || 0));
    return out;
  }

  return node(grouped, 0);
}

function computeBubble(rows) {
  if (rows[0]?.department === undefined) return [];

  const xCol = rows[0]?.monthly_salary !== undefined ? 'monthly_salary' : firstNumericColumn(rows);
  const yCol = rows[0]?.overall_satisfaction !== undefined ? 'overall_satisfaction' : secondNumericColumn(rows, xCol);
  const sizeCol = rows[0]?.turnover_risk_score !== undefined ? 'turnover_risk_score' : null;

  const map = new Map();
  rows.forEach((row) => {
    const dept = String(row.department ?? 'Unknown');
    if (!map.has(dept)) map.set(dept, { name: dept, x: [], y: [], size: [] });
    const bucket = map.get(dept);

    const x = toNumber(row[xCol]);
    const y = toNumber(row[yCol]);
    if (x !== null) bucket.x.push(x);
    if (y !== null) bucket.y.push(y);

    if (sizeCol) {
      const s = toNumber(row[sizeCol]);
      if (s !== null) bucket.size.push(s);
    }
  });

  return Array.from(map.values()).map((entry) => ({
    name: entry.name,
    x: toInt(mean(entry.x)),
    y: round(mean(entry.y), 2),
    size: entry.x.length,
    ...(sizeCol ? { avg_turnover: round(mean(entry.size), 2) } : {}),
  }));
}

function binLabel(min, max, i, bins, fixed = 1) {
  const start = min + (i * (max - min)) / bins;
  const end = min + ((i + 1) * (max - min)) / bins;
  return `${start.toFixed(fixed)}-${end.toFixed(fixed)}`;
}

function computeHeatmap(rows) {
  let xCol;
  let yCol;
  let vCol;
  let xLabel;
  let yLabel;

  if (rows[0]?.commute_time_min !== undefined && rows[0]?.work_life_balance !== undefined) {
    xCol = 'commute_time_min';
    yCol = 'work_life_balance';
    vCol = 'overall_satisfaction';
    xLabel = 'Commute Time (min)';
    yLabel = 'Work-Life Balance Score';
  } else if (rows[0]?.Sales !== undefined && rows[0]?.Profit !== undefined) {
    xCol = 'Sales';
    yCol = 'Profit';
    vCol = 'Profit';
    xLabel = 'Sales';
    yLabel = 'Profit';
  } else if (rows[0]?.age !== undefined && rows[0]?.chol !== undefined) {
    xCol = 'age';
    yCol = 'chol';
    vCol = 'chol';
    xLabel = 'Age group';
    yLabel = 'Cholesterol range';
  } else {
    const nums = numericColumns(rows);
    if (nums.length < 2) return {};
    [xCol, yCol] = nums;
    vCol = nums[1];
    xLabel = xCol;
    yLabel = yCol;
  }

  const data = rows
    .map((row) => ({ x: toNumber(row[xCol]), y: toNumber(row[yCol]), v: toNumber(row[vCol]) }))
    .filter((r) => r.x !== null && r.y !== null && r.v !== null);

  if (!data.length) return {};

  const bins = 6;
  const xVals = data.map((d) => d.x);
  const yVals = data.map((d) => d.y);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);

  const xCategories = Array.from({ length: bins }, (_, i) => binLabel(xMin, xMax, i, bins));
  const yCategories = Array.from({ length: bins }, (_, i) => binLabel(yMin, yMax, i, bins));

  const grid = new Map();
  data.forEach((row) => {
    const xStep = xMax === xMin ? 0 : (row.x - xMin) / (xMax - xMin);
    const yStep = yMax === yMin ? 0 : (row.y - yMin) / (yMax - yMin);
    const xi = Math.min(bins - 1, Math.max(0, Math.floor(xStep * bins)));
    const yi = Math.min(bins - 1, Math.max(0, Math.floor(yStep * bins)));
    const key = `${xi}|${yi}`;
    if (!grid.has(key)) grid.set(key, { sum: 0, count: 0 });
    const cell = grid.get(key);
    cell.sum += row.v;
    cell.count += 1;
  });

  const cells = [];
  for (const [key, cell] of grid.entries()) {
    if (!cell.count) continue;
    const [x, y] = key.split('|').map(Number);
    cells.push({
      x,
      y,
      xLabel: xCategories[x],
      yLabel: yCategories[y],
      value: round(cell.sum / cell.count, 2),
      count: cell.count,
    });
  }

  return { xCategories, yCategories, cells, xLabel, yLabel };
}

function computeHistogram(rows) {
  const col = rows[0]?.overall_satisfaction !== undefined ? 'overall_satisfaction' : firstNumericColumn(rows);
  const values = rows.map((r) => toNumber(r[col])).filter((v) => v !== null);
  if (!values.length) return { labels: [], counts: [], col };

  const bins = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / bins;

  const counts = new Array(bins).fill(0);
  values.forEach((v) => {
    const idx = max === min ? 0 : Math.min(bins - 1, Math.floor((v - min) / width));
    counts[idx] += 1;
  });

  const labels = Array.from({ length: bins }, (_, i) => {
    const lo = min + i * width;
    const hi = min + (i + 1) * width;
    return `${lo.toFixed(1)}-${hi.toFixed(1)}`;
  });

  return { labels, counts, col };
}

function computeTimeseries(rows) {
  if (rows[0]?.quarter === undefined || rows[0]?.[TIMESERIES_COL] === undefined) return {};

  const quarters = [...new Set(rows.map((r) => String(r.quarter)).filter(Boolean))].sort();
  const metrics = {
    Satisfaction: 'overall_satisfaction',
    Salary: 'monthly_salary',
  };

  const deptCol = rows[0]?.department !== undefined ? 'department' : null;
  const result = {};

  for (const [metricLabel, metricCol] of Object.entries(metrics)) {
    if (rows[0]?.[metricCol] === undefined) continue;

    if (deptCol) {
      const deptAverages = new Map();
      rows.forEach((row) => {
        const dept = String(row[deptCol] ?? 'Unknown');
        const val = toNumber(row[metricCol]);
        if (val === null) return;
        if (!deptAverages.has(dept)) deptAverages.set(dept, []);
        deptAverages.get(dept).push(val);
      });

      const topDepartments = Array.from(deptAverages.entries())
        .map(([dept, vals]) => ({ dept, avg: mean(vals) }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5)
        .map((d) => d.dept);

      result[metricLabel] = topDepartments.map((dept) => {
        const data = quarters.map((quarter) => {
          const vals = rows
            .filter((r) => String(r[deptCol] ?? 'Unknown') === dept && String(r.quarter) === quarter)
            .map((r) => toNumber(r[metricCol]))
            .filter((v) => v !== null);
          return vals.length ? round(mean(vals), 2) : null;
        });
        return { name: dept, data };
      });
    } else {
      const data = quarters.map((quarter) => {
        const vals = rows
          .filter((r) => String(r.quarter) === quarter)
          .map((r) => toNumber(r[metricCol]))
          .filter((v) => v !== null);
        return vals.length ? round(mean(vals), 2) : 0;
      });
      result[metricLabel] = [{ name: 'All', data }];
    }
  }

  return { quarters, metrics: result };
}

function groupRowsByKey(rows, keys) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keys.map((k) => String(row[k] ?? 'Unknown')).join('|');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function buildDrillTimeseries(rows, hierarchy) {
  if (rows[0]?.quarter === undefined) return {};

  const quarters = [...new Set(rows.map((r) => String(r.quarter)).filter(Boolean))].sort();
  const metrics = {
    Satisfaction: 'overall_satisfaction',
    Salary: 'monthly_salary',
  };

  function timeSeriesFor(rowsAtNode, groupCol) {
    const response = {};
    for (const [label, col] of Object.entries(metrics)) {
      if (rowsAtNode[0]?.[col] === undefined) continue;

      const byChild = groupRowsByKey(rowsAtNode, [groupCol]);
      const topChildren = Array.from(byChild.entries())
        .map(([name, childRows]) => {
          const vals = childRows.map((r) => toNumber(r[col])).filter((v) => v !== null);
          return { name, avg: vals.length ? mean(vals) : -Infinity };
        })
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5)
        .map((item) => item.name);

      response[label] = topChildren.map((child) => {
        const childRows = byChild.get(child) || [];
        const sumSeries = [];
        const countSeries = [];

        quarters.forEach((quarter) => {
          const vals = childRows
            .filter((row) => String(row.quarter) === quarter)
            .map((row) => toNumber(row[col]))
            .filter((v) => v !== null);

          sumSeries.push(round(sum(vals), 2));
          countSeries.push(vals.length);
        });

        return {
          name: String(child),
          sum: sumSeries,
          count: countSeries,
        };
      });
    }
    return response;
  }

  const result = {};

  if (hierarchy.length > 0) {
    result[''] = timeSeriesFor(rows, hierarchy[0]);
  }

  if (hierarchy.length >= 2) {
    const byL1 = groupRowsByKey(rows, [hierarchy[0]]);
    for (const [v0, rows0] of byL1.entries()) {
      result[v0] = timeSeriesFor(rows0, hierarchy[1]);

      if (hierarchy.length >= 3) {
        const byL2 = groupRowsByKey(rows0, [hierarchy[1]]);
        for (const [v1, rows1] of byL2.entries()) {
          const keyL2 = `${v0}|${v1}`;
          result[keyL2] = timeSeriesFor(rows1, hierarchy[2]);

          if (hierarchy.length >= 4) {
            const byL3 = groupRowsByKey(rows1, [hierarchy[2]]);
            for (const [v2, rows2] of byL3.entries()) {
              result[`${v0}|${v1}|${v2}`] = timeSeriesFor(rows2, hierarchy[3]);
            }
          }
        }
      }
    }
  }

  return { quarters, data: result };
}

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  const x = xs.slice(0, n);
  const y = ys.slice(0, n);
  const mx = mean(x);
  const my = mean(y);

  let numerator = 0;
  let dx = 0;
  let dy = 0;

  for (let i = 0; i < n; i += 1) {
    const a = x[i] - mx;
    const b = y[i] - my;
    numerator += a * b;
    dx += a * a;
    dy += b * b;
  }

  const denom = Math.sqrt(dx * dy);
  if (denom === 0) return 0;
  return numerator / denom;
}

function correlationForColumns(rows, colX, colY) {
  const points = rows
    .map((row) => [toNumber(row[colX]), toNumber(row[colY])])
    .filter(([x, y]) => x !== null && y !== null);

  if (points.length < 2) return 0;
  return pearson(points.map((p) => p[0]), points.map((p) => p[1]));
}

function computeCorrelation(rows) {
  let available = NUMERIC_COLS.filter((col) => rows[0]?.[col] !== undefined);
  if (available.length < 2) available = numericColumns(rows).slice(0, 10);

  const matrix = [];
  available.forEach((c1) => {
    available.forEach((c2) => {
      matrix.push({ x: c1, y: c2, value: round(correlationForColumns(rows, c1, c2), 3) });
    });
  });

  return { columns: available, matrix };
}

function classifyColumns(rows) {
  const result = {};
  const cols = Object.keys(rows[0] || {});

  cols.forEach((col) => {
    const vals = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== '');
    const unique = new Set(vals.map((v) => String(v)));
    const numericCount = vals.filter((v) => toNumber(v) !== null).length;
    const pctNumeric = vals.length ? numericCount / vals.length : 0;

    if (pctNumeric > 0.85 && unique.size <= 10) {
      result[col] = 'categorical';
    } else if (pctNumeric > 0.85) {
      result[col] = 'numeric';
    } else if (unique.size <= 50 || unique.size / Math.max(vals.length, 1) <= 0.3) {
      result[col] = 'categorical';
    } else {
      result[col] = 'high_cardinality';
    }
  });

  return result;
}

function computeDimensionValues(rows, hierarchy) {
  const cols = [...hierarchy, ...DIMENSION_EXTRAS.filter((c) => rows[0]?.[c] !== undefined && !hierarchy.includes(c))];
  const result = {};

  cols.forEach((col) => {
    result[col] = [...new Set(rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined))].sort();
  });

  return result;
}

function numericColumns(rows) {
  const cols = Object.keys(rows[0] || {});
  return cols.filter((col) => rows.some((row) => toNumber(row[col]) !== null));
}

function firstNumericColumn(rows) {
  return numericColumns(rows)[0];
}

function secondNumericColumn(rows, first) {
  return numericColumns(rows).find((col) => col !== first) || first;
}

function computeAllAggregations(rows) {
  const hierarchy = DRILL_HIERARCHY.filter((col) => rows[0]?.[col] !== undefined);
  const measure = rows[0]?.[MEASURE_COL] !== undefined ? MEASURE_COL : firstNumericColumn(rows);

  let grouped = [];
  if (hierarchy.length && measure) {
    try {
      grouped = buildGrouped(rows, hierarchy, measure);
    } catch {
      grouped = [];
    }
  }

  const safe = (fn, fallback) => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };

  return {
    kpi: safe(() => computeKpis(rows), { total_rows: rows.length }),
    drill_tree: safe(() => (grouped.length ? buildDrillTree(grouped, hierarchy) : []), []),
    drill_flat: safe(() => (grouped.length ? buildDrillFlat(grouped, hierarchy) : {}), {}),
    bubble: safe(() => computeBubble(rows), []),
    heatmap: safe(() => computeHeatmap(rows), {}),
    histogram: safe(() => computeHistogram(rows), { labels: [], counts: [], col: '' }),
    timeseries: safe(() => computeTimeseries(rows), {}),
    correlation: safe(() => computeCorrelation(rows), { columns: [], matrix: [] }),
    column_types: safe(() => classifyColumns(rows), {}),
    dimension_values: safe(() => computeDimensionValues(rows, hierarchy), {}),
    drill_timeseries: safe(() => (hierarchy.length ? buildDrillTimeseries(rows, hierarchy) : {}), {}),
  };
}

export async function processCsvFile(file, onProgress) {
  const ext = (file?.name || '').includes('.') ? `.${file.name.split('.').pop().toLowerCase()}` : '';
  const allowed = new Set(['.csv', '.data', '.txt']);
  if (!allowed.has(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  const fileSizeMb = file?.size ? round(file.size / 1024 / 1024, 1) : 0;

  onProgress?.(10);
  const rows = await parseCsvFile(file);
  const normalizedRows = rows.map((row) => sanitizeRow(row));

  onProgress?.(55);
  const tStart = performance.now();
  const chartConfig = detectChartConfig(normalizedRows);
  const aggregations = computeAllAggregations(normalizedRows);
  const processingMs = Math.round(performance.now() - tStart);

  onProgress?.(90);
  const payload = {
    columns: Object.keys(normalizedRows[0] || {}),
    rows: normalizedRows.slice(0, SAMPLE_ROWS),
    total_rows: normalizedRows.length,
    file_size_mb: fileSizeMb,
    processing_ms: processingMs,
    chart_config: chartConfig,
    aggregations,
  };

  onProgress?.(100);
  return payload;
}
