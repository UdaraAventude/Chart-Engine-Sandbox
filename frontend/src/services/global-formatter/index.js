function getDynamicConfig(rowCount) {
  if (rowCount > 1000000) {
    return {
      maxDimCardinality: 50,
      maxHierarchyDepth: 3,
      fallbackTopValues: 10,
      numericCategoricalThreshold: 10,
    };
  } else if (rowCount > 100000) {
    return {
      maxDimCardinality: 100,
      maxHierarchyDepth: 4,
      fallbackTopValues: 15,
      numericCategoricalThreshold: 15,
    };
  } else if (rowCount > 10000) {
    return {
      maxDimCardinality: 200,
      maxHierarchyDepth: 5,
      fallbackTopValues: 20,
      numericCategoricalThreshold: 20,
    };
  }
  return {
    maxDimCardinality: 500,
    maxHierarchyDepth: 6,
    fallbackTopValues: 20,
    numericCategoricalThreshold: 25,
  };
}

function isNumeric(value) {
  if (value === null || value === undefined || value === "") return false;
  return !isNaN(parseFloat(value)) && isFinite(value);
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
  /^\d{4}\/\d{2}\/\d{2}/,
  /^\d{1,2}-\d{1,2}-\d{4}/,
  /^[A-Za-z]+ \d{1,2},? \d{4}/,
  /^\d{1,2} [A-Za-z]+ \d{4}/,
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function preprocessDates(rows) {
  if (!rows.length) return rows;
  const sample = rows.slice(0, 500);
  const keys = Object.keys(sample[0]);
  const dateCols = new Set();

  for (const key of keys) {
    const values = sample
      .map((r) => r[key])
      .filter((v) => v !== null && v !== undefined && v !== "");
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
      if (v !== null && v !== undefined && v !== "") {
        newRow[col] = bucketToYearMonth(v);
      }
    }
    return newRow;
  });
}

function detectColumns(rows, config) {
  if (!rows.length) return { dimensions: [], metrics: [], rejected: [] };

  const sample = rows.slice(0, 500);
  const keys = Object.keys(sample[0]);

  const dimensions = [];
  const metrics = [];
  const rejected = [];

  for (const key of keys) {
    const values = sample
      .map((r) => r[key])
      .filter((v) => v !== null && v !== undefined && v !== "");
    if (!values.length) {
      rejected.push({ key, reason: "empty", cardinality: 0 });
      continue;
    }

    const numericRatio =
      values.filter((v) => isNumeric(v)).length / values.length;

    if (numericRatio >= 0.8) {
      const unique = new Set(values.map((v) => String(v).trim())).size;
      if (unique >= 2 && unique <= config.numericCategoricalThreshold) {
        dimensions.push({ key, cardinality: unique });
      } else {
        metrics.push(key);
      }
    } else {
      const unique = new Set(values.map((v) => String(v).trim())).size;
      if (unique >= 2 && unique <= config.maxDimCardinality) {
        dimensions.push({ key, cardinality: unique });
      } else {
        rejected.push({
          key,
          reason: unique < 2 ? "too_few_unique" : "too_many_unique",
          cardinality: unique,
        });
      }
    }
  }

  dimensions.sort((a, b) => a.cardinality - b.cardinality);

  return {
    dimensions: dimensions.slice(0, config.maxHierarchyDepth).map((d) => d.key),
    metrics,
    rejected,
  };
}

function applyFallbackBucketing(rows, rejected, config) {
  const candidates = rejected
    .filter((r) => r.reason === "too_many_unique")
    .sort((a, b) => a.cardinality - b.cardinality)
    .slice(0, config.maxHierarchyDepth);

  if (!candidates.length) return { patchedRows: rows, fallbackDimensions: [] };

  const sample = rows.slice(0, 500);
  const topValMaps = new Map();

  for (const { key } of candidates) {
    const freq = new Map();
    for (const row of sample) {
      const v = String(row[key] ?? "").trim();
      if (!v) continue;
      freq.set(v, (freq.get(v) ?? 0) + 1);
    }
    const top = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, config.fallbackTopValues)
      .map((e) => e[0]);
    topValMaps.set(key, new Set(top));
  }

  const patchedRows = rows.map((row) => {
    const newRow = { ...row };
    for (const { key } of candidates) {
      const v = String(newRow[key] ?? "").trim();
      if (v && !topValMaps.get(key).has(v)) {
        newRow[key] = "Other";
      }
    }
    return newRow;
  });

  return {
    patchedRows,
    fallbackDimensions: candidates.map((c) => c.key),
  };
}

function aggregateAllMethods(rows, metrics) {
  const result = {};
  for (const m of metrics) {
    const vals = rows.map((r) => parseFloat(r[m])).filter((v) => !isNaN(v));
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
    const key = String(row[col] ?? "Unknown").trim();
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
      tree: { name: "root", children: [], count: 0, metrics: {} },
      dimensions: [],
      metrics: [],
      rows: [],
      rejected: [],
    };
  }

  const config = getDynamicConfig(rows.length);

  const processedRows = preprocessDates(rows);
  let { dimensions, metrics, rejected } = detectColumns(processedRows, config);

  let finalRows = processedRows;
  if (dimensions.length === 0) {
    const { patchedRows, fallbackDimensions } = applyFallbackBucketing(
      processedRows,
      rejected,
      config,
    );
    if (fallbackDimensions.length) {
      finalRows = patchedRows;
      dimensions = fallbackDimensions;
      rejected = rejected.filter((r) => !fallbackDimensions.includes(r.key));
    }
  }
  const rootAggs = aggregateAllMethods(finalRows, metrics);
  const tree = {
    name: "root",
    value: 0,
    count: finalRows.length,
    aggs: rootAggs,
    children: buildTree(finalRows, dimensions, metrics, 0),
  };

  return { tree, dimensions, metrics, rows: finalRows, rejected };
}

export class StreamFormatter {
  constructor(estimatedRowCount = 5000000) {
    this.totalRows = 0;
    this.sampleRows = [];
    this.savedRows = [];
    this.isInitialized = false;
    this.tree = { name: "root", count: 0, aggs: {}, childrenMap: new Map() };

    this.dateCols = new Set();
    this.dimensions = [];
    this.metrics = [];
    this.rejected = [];
    this.fallbackDimensions = [];
    this.topValMaps = new Map();
    this.config = getDynamicConfig(estimatedRowCount);
  }

  processChunk(rows) {
    this.totalRows += rows.length;
    if (!this.isInitialized) {
      for (let i = 0; i < rows.length; i++) {
        this.sampleRows.push(rows[i]);
      }
      if (this.sampleRows.length >= 500) {
        this.initializeSchema();
        this.addRowsToTree(this.sampleRows);
        this.sampleRows = [];
      }
    } else {
      this.addRowsToTree(rows);
    }
  }

  initializeSchema() {
    const sample = this.sampleRows.slice(0, 500);
    const keys = Object.keys(sample[0] || {});

    for (const key of keys) {
      const values = sample
        .map((r) => r[key])
        .filter((v) => v !== null && v !== undefined && v !== "");
      if (!values.length) continue;
      const numericRatio =
        values.filter((v) => isNumeric(v)).length / values.length;
      if (numericRatio >= 0.8) continue;
      const dateRatio =
        values.filter((v) => isDateLike(v)).length / values.length;
      if (dateRatio >= 0.6) this.dateCols.add(key);
    }

    const processedSample = sample.map((row) => {
      const newRow = { ...row };
      for (const col of this.dateCols) {
        if (
          newRow[col] !== null &&
          newRow[col] !== undefined &&
          newRow[col] !== ""
        ) {
          newRow[col] = bucketToYearMonth(newRow[col]);
        }
      }
      return newRow;
    });

    const { dimensions, metrics, rejected } = detectColumns(
      processedSample,
      this.config,
    );
    this.dimensions = dimensions;
    this.metrics = metrics;
    this.rejected = rejected;

    if (this.dimensions.length === 0) {
      const candidates = rejected
        .filter((r) => r.reason === "too_many_unique")
        .sort((a, b) => a.cardinality - b.cardinality)
        .slice(0, this.config.maxHierarchyDepth);

      if (candidates.length) {
        for (const { key } of candidates) {
          const freq = new Map();
          for (const row of processedSample) {
            const v = String(row[key] ?? "").trim();
            if (!v) continue;
            freq.set(v, (freq.get(v) ?? 0) + 1);
          }
          const top = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.config.fallbackTopValues)
            .map((e) => e[0]);
          this.topValMaps.set(key, new Set(top));
          this.fallbackDimensions.push(key);
        }
        this.dimensions = this.fallbackDimensions;
        this.rejected = this.rejected.filter(
          (r) => !this.fallbackDimensions.includes(r.key),
        );
      }
    }

    this.isInitialized = true;
  }

  updateAggs(aggs, row) {
    for (const m of this.metrics) {
      const val = parseFloat(row[m]);
      if (isNaN(val)) continue;
      if (!aggs[m]) {
        aggs[m] = { sum: 0, min: val, max: val, count: 0 };
      }
      aggs[m].sum += val;
      aggs[m].count += 1;
      if (val < aggs[m].min) aggs[m].min = val;
      if (val > aggs[m].max) aggs[m].max = val;
    }
  }

  addRowsToTree(rows) {
    for (const rawRow of rows) {
      const row = { ...rawRow };
      for (const col of this.dateCols) {
        if (row[col] !== null && row[col] !== undefined && row[col] !== "") {
          row[col] = bucketToYearMonth(row[col]);
        }
      }
      for (const key of this.fallbackDimensions) {
        const v = String(row[key] ?? "").trim();
        if (v && !this.topValMaps.get(key).has(v)) {
          row[key] = "Other";
        }
      }

      this.tree.count++;
      this.updateAggs(this.tree.aggs, row);

      let currentNode = this.tree;
      for (const dim of this.dimensions) {
        const key = String(row[dim] ?? "Unknown").trim();
        if (!currentNode.childrenMap.has(key)) {
          currentNode.childrenMap.set(key, {
            name: key,
            count: 0,
            aggs: {},
            childrenMap: new Map(),
          });
        }
        currentNode = currentNode.childrenMap.get(key);
        currentNode.count++;
        this.updateAggs(currentNode.aggs, row);
      }

      const rowCap = this.config.maxDimCardinality > 50 ? 1000000 : 200000;
      if (this.savedRows.length < rowCap) {
        this.savedRows.push(row);
      }
    }
  }

  finalizeTree(node) {
    for (const m of this.metrics) {
      if (node.aggs[m] && node.aggs[m].count > 0) {
        node.aggs[m].avg = parseFloat(
          (node.aggs[m].sum / node.aggs[m].count).toFixed(4),
        );
        node.aggs[m].sum = parseFloat(node.aggs[m].sum.toFixed(4));
        node.aggs[m].min = parseFloat(node.aggs[m].min.toFixed(4));
        node.aggs[m].max = parseFloat(node.aggs[m].max.toFixed(4));
      } else {
        node.aggs[m] = { avg: 0, sum: 0, min: 0, max: 0, count: 0 };
      }
    }
    const primaryMetric = this.metrics[0];
    const primaryAggs = primaryMetric ? node.aggs[primaryMetric] : null;
    node.value = primaryAggs ? primaryAggs.avg : node.count;

    if (node.childrenMap) {
      node.children = Array.from(node.childrenMap.values());
      for (const child of node.children) {
        this.finalizeTree(child);
      }
      delete node.childrenMap;
    }
  }

  finish() {
    if (!this.isInitialized && this.sampleRows.length > 0) {
      this.initializeSchema();
      this.addRowsToTree(this.sampleRows);
    }
    this.finalizeTree(this.tree);
    return {
      tree: this.tree,
      dimensions: this.dimensions || [],
      metrics: this.metrics || [],
      rows: this.savedRows,
      rejected: this.rejected || [],
    };
  }
}
