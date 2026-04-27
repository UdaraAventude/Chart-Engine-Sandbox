import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity } from 'lucide-react';
import '../DrillDown.css';
import useStore from '../store/useStore';
import { 
  classifyColumns, 
  buildDrillHierarchy, 
  filterByDrillPath, 
  aggregateForChart, 
  aggregateForHeatmap, 
  aggregateForBubble, 
  drillInto, 
  drillBackTo, 
  isLeafLevel, 
  getCurrentGroupByColumn 
} from '../utils/DrillDownManager';
import { 
  buildDrillBar,
  buildDrillHeatmap,
  buildDrillBubble,
  buildDrillScatter,
  buildDrillSunburst,
  buildDrillPie,
  buildDrillMultiline,
  buildDrillCorrelation,
  buildDrillHistogram
} from '../utils/DrillDownCharts';
import DrillDownBreadcrumb from './DrillDownBreadcrumb';

// ─────────────────────────────────────────────
// Helper: navigate the pre-agg tree to a subtree
// ─────────────────────────────────────────────
function getSubtreeForPath(treeNodes, drillPath) {
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

// ─────────────────────────────────────────────
// Helper: parse a range label in ANY format into [min, max]
//   Backend format : "(4.887, 23.833)"
//   Frontend format: "4.9-23.8"
// ─────────────────────────────────────────────
function parseRangeLabel(label) {
  if (!label) return null;
  const nums = label.match(/\d+\.?\d*/g);
  if (!nums || nums.length < 2) return null;
  return [parseFloat(nums[0]), parseFloat(nums[1])];
}

// ─────────────────────────────────────────────
// Build sunburst tree from raw dataset (fallback when no pre-agg)
// ─────────────────────────────────────────────
const buildSunburstTreeFromDataset = (filteredData, hierarchy, measureCol, drillPath, maxLevels = 4) => {
  const remainingHierarchy = hierarchy.slice(drillPath.length);
  const levels = remainingHierarchy.slice(0, maxLevels);

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

// ─────────────────────────────────────────────
// Frontend computation helpers for drill-down
// ─────────────────────────────────────────────

function _computeCorrelationFrontend(data, numericCols) {
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

function _computeHistogramFrontend(data, col, bins = 10) {
  const values = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
  if (values.length === 0) return { labels: [], counts: [], col };
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / bins;

  const counts = new Array(bins).fill(0);
  values.forEach(v => {
    let idx = Math.floor((v - min) / step);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  });

  const labels = Array.from({ length: bins }, (_, i) => {
    const lo = min + i * step;
    const hi = min + (i + 1) * step;
    return `${lo.toFixed(1)}–${hi.toFixed(1)}`;
  });

  return { labels, counts, col };
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const DrillDownRenderer = ({ onRenderTime }) => {
  const { dataset, chartConfig, drillChartType, aggregations, totalRows } = useStore();
  const setRenderTime = useStore(state => state.setRenderTime);

  const [drillPath, setDrillPath] = useState([]);
  const [aggMethod, setAggMethod] = useState('sum');
  const [activeMetric, setActiveMetric] = useState('Satisfaction');

  // Track whether the current line chart is showing the bar fallback
  // so the click handler knows to use params.name instead of params.seriesName
  const [lineShowsBarFallback, setLineShowsBarFallback] = useState(false);

  const t0 = useRef(0);

  useEffect(() => {
    setDrillPath([]);
    setLineShowsBarFallback(false);
  }, [dataset, drillChartType]);

  const hasAggregations = useMemo(() => aggregations && !aggregations.error, [aggregations]);

  const columnTypes = useMemo(() => {
    if (hasAggregations && aggregations.column_types) return aggregations.column_types;
    return classifyColumns(dataset);
  }, [dataset, aggregations, hasAggregations]);

  const hierarchy = useMemo(() => {
    if (chartConfig?.drill_hierarchy) return chartConfig.drill_hierarchy;
    return buildDrillHierarchy(dataset, columnTypes);
  }, [dataset, columnTypes, chartConfig]);

  const numericCols = useMemo(
    () => Object.keys(columnTypes).filter(c => columnTypes[c] === 'numeric'),
    [columnTypes]
  );

  const xCol     = chartConfig?.x_axis     || numericCols[0];
  const yCol     = chartConfig?.y_axis     || numericCols[1] || numericCols[0];
  const measureCol = chartConfig?.measure_col || yCol;
  const sizeCol  = chartConfig?.size_col   || numericCols[2] || numericCols[1] || numericCols[0];

  const filteredData     = useMemo(() => filterByDrillPath(dataset, drillPath), [dataset, drillPath]);
  const atLeaf           = isLeafLevel(drillPath, hierarchy);
  const currentGroupByCol = getCurrentGroupByColumn(drillPath, hierarchy);

  // ── Row Count ──────────────────────────────
  const currentRowCount = useMemo(() => {
    if (!drillPath.length) return totalRows;
    const pathKey = drillPath.map(s => s.value).join('|');
    if (aggregations?.drill_flat?.[pathKey]) {
      return aggregations.drill_flat[pathKey].reduce((s, r) => s + r.count, 0);
    }
    return filteredData.length;
  }, [drillPath, aggregations, filteredData, totalRows]);

  // ── Bar / Pie data getter ──────────────────
  const getBarDataForPath = useCallback((path, method) => {
    // ── LEAF: drill_flat[leafKey] has NO children entries ──
    // Look up the parent's flat list and find this leaf's own summary row
    if (isLeafLevel(path, hierarchy) && path.length > 0) {
      const parentKey  = path.slice(0, -1).map(s => s.value).join('|');
      const leafValue  = path[path.length - 1].value;

      if (hasAggregations && aggregations.drill_flat) {
        const parentFlat = aggregations.drill_flat[parentKey] || [];
        const leafEntry  = parentFlat.find(d => d.name === leafValue);
        if (leafEntry) {
          const val = method === 'sum'   ? leafEntry.sum
                    : method === 'avg'   ? leafEntry.avg
                    : method === 'count' ? leafEntry.count
                    : method === 'min'   ? leafEntry.min
                    : method === 'max'   ? leafEntry.max
                    : leafEntry.sum;
          return [{ name: leafEntry.name, value: val, count: leafEntry.count }];
        }
      }
      // Fallback: compute directly from filteredData
      const leafCol = hierarchy[path.length - 1];
      return aggregateForChart(filteredData, leafCol, measureCol, method);
    }

    // ── NON-LEAF: use drill_flat children ──────────────────
    if (!hasAggregations || !aggregations.drill_flat) {
      return aggregateForChart(filteredData, currentGroupByCol, measureCol, method);
    }
    const pathKey  = path.map(s => s.value).join('|');
    const flatData = aggregations.drill_flat[pathKey] || [];
    return flatData.map(d => ({
      name:  d.name,
      value: method === 'sum'   ? d.sum
           : method === 'avg'   ? d.avg
           : method === 'count' ? d.count
           : method === 'min'   ? d.min
           : method === 'max'   ? d.max
           : d.sum,
      count: d.count,
    }));
  }, [hasAggregations, aggregations, filteredData, currentGroupByCol, measureCol, hierarchy]);

  // ── Sunburst data ──────────────────────────
  const sunburstData = useMemo(() => {
    if (hasAggregations && aggregations.drill_tree) {
      return getSubtreeForPath(aggregations.drill_tree, drillPath);
    }
    return buildSunburstTreeFromDataset(filteredData, hierarchy, measureCol, drillPath);
  }, [hasAggregations, aggregations, filteredData, hierarchy, measureCol, drillPath]);

  // ── Heatmap data ───────────────────────────
  const getHeatmapData = useCallback(() => {
    const hX = dataset[0]?.commute_time_min !== undefined ? 'commute_time_min' : xCol;
    const hY = dataset[0]?.work_life_balance !== undefined ? 'work_life_balance' : yCol;
    const hV = dataset[0]?.overall_satisfaction !== undefined ? 'overall_satisfaction' : yCol;

    // Use pre-aggregated heatmap ONLY at root (no drill)
    if (drillPath.length === 0 && hasAggregations && aggregations.heatmap) {
      return aggregations.heatmap;
    }

    // After drill: compute from filtered rows — pass a fixed bins number, NOT aggMethod
    const HEATMAP_BINS = 6;
    return aggregateForHeatmap(filteredData, hX, hY, hV, HEATMAP_BINS);
  }, [drillPath.length, hasAggregations, aggregations, filteredData, dataset, xCol, yCol]);

  // ── Bubble data ─────────────────────────────
  // ALWAYS use filteredData + currentGroupByCol so group names match the hierarchy
  const getBubbleData = useCallback(() => {
    const bX = dataset[0]?.monthly_salary        !== undefined ? 'monthly_salary'        : xCol;
    const bY = dataset[0]?.overall_satisfaction  !== undefined ? 'overall_satisfaction'  : yCol;
    const bS = dataset[0]?.turnover_risk_score   !== undefined ? 'turnover_risk_score'   : sizeCol;

    const groupCol = currentGroupByCol || hierarchy[drillPath.length] || hierarchy[0];
    if (!groupCol || filteredData.length === 0) return [];
    return aggregateForBubble(filteredData, groupCol, bX, bY, bS);
  }, [drillPath, filteredData, dataset, currentGroupByCol, hierarchy, xCol, yCol, sizeCol]);

  // ── Chart option builder ───────────────────
  const option = useMemo(() => {
    t0.current = performance.now();
    const baseTitle = chartConfig?.title || 'Employee Satisfaction & Salary Analysis';
    const pathTitle = drillPath.length > 0
      ? ' › ' + drillPath.map(p => p.value).join(' › ')
      : '';
    const title = baseTitle + pathTitle;

    // ── BAR ──────────────────────────────────
    if (drillChartType === 'drill-bar') {
      const aggregated = getBarDataForPath(drillPath, aggMethod);
      const groupCol   = currentGroupByCol || hierarchy[hierarchy.length - 1];
      return buildDrillBar(aggregated, groupCol, measureCol, title, atLeaf, aggMethod);
    }

    // ── SUNBURST ──────────────────────────────
    if (drillChartType === 'drill-sunburst') {
      const opt = buildDrillSunburst(sunburstData, measureCol, title, drillPath, hierarchy.length, aggMethod);

      // Add invisible clickable circle over the white center hole
      // This gives the user a click target to go back
      if (drillPath.length > 0) {
        opt.graphic = [{
          type: 'circle',
          left: 'center',
          top: 'middle',
          shape: { r: 48 },             // matches the inner radius of the sunburst
          style: {
            fill: 'rgba(0,0,0,0)',      // fully transparent — invisible
            cursor: 'pointer',
          },
          onclick: () => {
            setDrillPath(prev => prev.slice(0, -1));
          }
        }];
      } else {
        opt.graphic = [];               // no back target at root
      }

      return opt;
    }

    // ── HEATMAP ───────────────────────────────
    if (drillChartType === 'drill-heatmap') {
      const heatmapData = getHeatmapData();
      return buildDrillHeatmap(heatmapData, xCol, yCol, measureCol, title, atLeaf);
    }

    // ── SCATTER ───────────────────────────────
    if (drillChartType === 'drill-scatter') {
      return buildDrillScatter(filteredData, xCol, yCol, currentGroupByCol, title);
    }

    // ── BUBBLE ────────────────────────────────
    if (drillChartType === 'drill-bubble') {
      const bubbleData = getBubbleData();
      if (!bubbleData || bubbleData.length === 0) {
        // Fallback to count bar
        const groupCol = currentGroupByCol || hierarchy[hierarchy.length - 1];
        return buildDrillBar(getBarDataForPath(drillPath, 'count'), groupCol, 'count', title, atLeaf, 'count');
      }
      const groupCol = currentGroupByCol || hierarchy[hierarchy.length - 1];
      return buildDrillBubble(bubbleData, xCol, yCol, sizeCol, groupCol, title, atLeaf);
    }

    // ── PIE ────────────────────────────────────
    if (drillChartType === 'drill-pie') {
      const aggregated = getBarDataForPath(drillPath, aggMethod);
      return buildDrillPie(aggregated, measureCol, title, atLeaf);
    }

    // ── LINE ───────────────────────────────────
    if (drillChartType === 'drill-line') {
      // Check if timeseries data exists for this path
      if (hasAggregations && aggregations.drill_timeseries) {
        const pathKey = drillPath.map(s => s.value).join('|');
        const tsData  = aggregations.drill_timeseries.data?.[pathKey];

        if (tsData) {
          // ✓ Real timeseries available — clear fallback flag, show multiline
          setLineShowsBarFallback(false);
          return buildDrillMultiline(
            { quarters: aggregations.drill_timeseries.quarters, metrics: tsData },
            activeMetric, title, aggMethod
          );
        }
      }

      // ✗ No timeseries for this path → show bar fallback
      // Set flag so click handler knows to use params.name not params.seriesName
      setLineShowsBarFallback(true);
      const aggregated = getBarDataForPath(drillPath, 'avg');
      const groupCol   = currentGroupByCol || hierarchy[hierarchy.length - 1];
      const fallbackTitle = title + ' (avg salary by ' + (groupCol || 'group') + ')';
      return buildDrillBar(aggregated, groupCol, measureCol, fallbackTitle, atLeaf, 'avg');
    }

    // ── CORRELATION ────────────────────────────
    if (drillChartType === 'drill-correlation') {
      if (drillPath.length === 0 && hasAggregations && aggregations.correlation) {
        return buildDrillCorrelation(aggregations.correlation, title);
      }
      if (filteredData.length > 0) {
        const numCols = Object.keys(columnTypes).filter(c => columnTypes[c] === 'numeric');
        const corrData = _computeCorrelationFrontend(filteredData, numCols);
        return buildDrillCorrelation(corrData, title);
      }
      return {};
    }

    // ── HISTOGRAM ─────────────────────────────
    if (drillChartType === 'drill-histogram') {
      if (drillPath.length === 0 && hasAggregations && aggregations.histogram) {
        return buildDrillHistogram(aggregations.histogram, title);
      }
      const histCol = filteredData[0]?.overall_satisfaction !== undefined
        ? 'overall_satisfaction'
        : Object.keys(columnTypes).find(c => columnTypes[c] === 'numeric') || '';
      if (!histCol || filteredData.length === 0) return {};
      const histData = _computeHistogramFrontend(filteredData, histCol);
      return buildDrillHistogram(histData, title);
    }

    return {};
  }, [
    drillChartType, filteredData, drillPath, aggMethod, atLeaf,
    currentGroupByCol, hierarchy, xCol, yCol, sizeCol, chartConfig,
    hasAggregations, aggregations, getBarDataForPath, sunburstData,
    getHeatmapData, getBubbleData, activeMetric, measureCol,
  ]);

  // ── Table render ───────────────────────────
  const renderTable = () => {
    const data = (drillChartType === 'drill-bar' || drillChartType === 'drill-pie')
      ? getBarDataForPath(drillPath, aggMethod)
      : filteredData.slice(0, 100);

    if (!data.length) return <div className="empty-state">No data for table</div>;
    const cols = Object.keys(data[0]);
    return (
      <div className="table-view-container" style={{ overflow: 'auto', maxHeight: '100%' }}>
        <table className="premium-table">
          <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>{cols.map(c => <td key={c}>{row[c]?.toLocaleString?.() || row[c]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Click handler ──────────────────────────
  const handleChartClick = useCallback((params) => {

    // ── SUNBURST ───────────────────────────────────────────────────────────────
    // Must handle BEFORE the atLeaf guard — center click = go back, even at leaf
    if (drillChartType === 'drill-sunburst') {
      const treeDepth = params.treePathInfo?.length ?? 0;

      // Center node click (treeDepth 0 or 1) — goes back
      // Note: the graphic overlay also handles center clicks directly
      if (treeDepth <= 1) {
        if (drillPath.length > 0) {
          setDrillPath(prev => prev.slice(0, -1));
        }
        return;
      }

      // At leaf: any segment click goes back (leaf has no children to drill into)
      if (atLeaf) {
        if (drillPath.length > 0) {
          setDrillPath(prev => prev.slice(0, -1));
        }
        return;
      }

      // Non-leaf segment click: drill deeper
      if (params.data?.name) {
        const colIndex = drillPath.length + (treeDepth - 2);
        const col = hierarchy[colIndex];
        if (col) setDrillPath(prev => drillInto(prev, col, params.data.name));
      }
      return;
    }

    // ── Block all other drill-deeper actions when at leaf ──────────────────────
    if (atLeaf) return;

    // ── HEATMAP ────────────────────────────────────────────────────────────────
    if (drillChartType === 'drill-heatmap') {
      if (!params.data) return;

      const hData = getHeatmapData();
      const xIdx  = params.data[0];

      // cells array may be on hData directly or nested
      const cells = hData.cells || [];
      const cell  = cells.find(c => c.x === xIdx);
      if (!cell || !currentGroupByCol) return;

      // Parse range from label — works for BOTH backend "(4.887, 23.833)"
      // and frontend "4.9-23.8" formats
      const range = parseRangeLabel(cell.xLabel);
      if (!range) return;

      const [rangeMin, rangeMax] = range;
      const hX = dataset[0]?.commute_time_min !== undefined ? 'commute_time_min' : xCol;

      // Find rows within this bin
      const binRows = filteredData.filter(row => {
        const v = parseFloat(row[hX]);
        return !isNaN(v) && v >= rangeMin && v <= rangeMax;
      });
      if (binRows.length === 0) return;

      // Find the most common categorical value in this bin
      const freq = {};
      binRows.forEach(r => {
        const k = String(r[currentGroupByCol] ?? 'Unknown');
        freq[k] = (freq[k] || 0) + 1;
      });
      const topCategory = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topCategory) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, topCategory));
      }
      return;
    }

    // ── BAR / PIE ──────────────────────────────────────────────────────────────
    if (drillChartType === 'drill-bar' || drillChartType === 'drill-pie') {
      if (params.name && currentGroupByCol) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, params.name));
      }
      return;
    }

    // ── LINE ───────────────────────────────────────────────────────────────────
    if (drillChartType === 'drill-line') {
      // When showing bar fallback (no timeseries), clicks deliver params.name (category label)
      // When showing real multiline, clicks deliver params.seriesName (series name)
      const clickedValue = lineShowsBarFallback ? params.name : params.seriesName;
      if (clickedValue && currentGroupByCol) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, clickedValue));
      }
      return;
    }

    // ── BUBBLE / SCATTER ───────────────────────────────────────────────────────
    if (drillChartType === 'drill-bubble' || drillChartType === 'drill-scatter') {
      const clickedValue = params.seriesName;
      if (clickedValue && currentGroupByCol) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, clickedValue));
      }
      return;
    }

    // ── CORRELATION ────────────────────────────────────────────────────────────
    if (drillChartType === 'drill-correlation') {
      if (params.data?.x && currentGroupByCol && !atLeaf) {
        const freq = {};
        filteredData.forEach(r => {
          const k = String(r[currentGroupByCol] ?? 'Unknown');
          freq[k] = (freq[k] || 0) + 1;
        });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (top) setDrillPath(prev => drillInto(prev, currentGroupByCol, top));
      }
      return;
    }

    // ── HISTOGRAM ──────────────────────────────────────────────────────────────
    if (drillChartType === 'drill-histogram') {
      if (!atLeaf && params.name && currentGroupByCol) {
        const range = params.name.match(/[\d.]+/g);
        if (range && range.length >= 2) {
          const [lo, hi] = [parseFloat(range[0]), parseFloat(range[1])];
          const histCol = filteredData[0]?.overall_satisfaction !== undefined
            ? 'overall_satisfaction'
            : Object.keys(columnTypes).find(c => columnTypes[c] === 'numeric') || '';
          
          const binRows = filteredData.filter(r => {
            const v = parseFloat(r[histCol]);
            return !isNaN(v) && v >= lo && v <= hi;
          });
          if (binRows.length === 0) return;

          const freq = {};
          binRows.forEach(r => {
            const k = String(r[currentGroupByCol] ?? 'Unknown');
            freq[k] = (freq[k] || 0) + 1;
          });
          const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
          if (top) setDrillPath(prev => drillInto(prev, currentGroupByCol, top));
        }
      }
      return;
    }
  }, [
    drillChartType, drillPath, atLeaf, hierarchy, currentGroupByCol,
    getHeatmapData, filteredData, dataset, xCol, lineShowsBarFallback,
  ]);

  const onChartReady = () => {
    const elapsed = performance.now() - t0.current;
    if (onRenderTime) onRenderTime(elapsed.toFixed(1));
  };

  // ── Empty state ────────────────────────────
  if (hierarchy.length === 0) {
    return (
      <div className="empty-state">
        <Activity size={32} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <h3>No Hierarchy Available</h3>
        <p className="empty-subtext">
          Drill-down mode requires categorical columns to build a dimension hierarchy.
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────
  return (
    <div className="drill-container">

      {drillChartType !== 'drill-table' && (
        <div className="drill-toolbar">
          <div className="drill-engine-badge">
            <Activity size={16} className="drill-engine-dot" />
            <span className="drill-engine-text">
              {drillChartType.split('-')[1].charAt(0).toUpperCase() +
               drillChartType.split('-')[1].slice(1)} Drill-Down
            </span>
            <div className="drill-engine-divider" />
            <span className="drill-engine-levels">{hierarchy.length} levels</span>
          </div>

          {(drillChartType === 'drill-bar' || drillChartType === 'drill-pie') && (
            <div className="agg-switcher-wrapper">
              <span className="agg-label">agg:</span>
              <div className="agg-switcher">
                {['sum', 'avg', 'count', 'min', 'max'].map(method => (
                  <button
                    key={method}
                    onClick={() => setAggMethod(method)}
                    className={`agg-btn ${aggMethod === method ? 'active' : ''}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          )}

          {drillChartType === 'drill-line' && (
            <div className="agg-switcher-wrapper">
              <span className="agg-label">metric:</span>
              <div className="agg-switcher">
                {['Satisfaction', 'Salary'].map(m => (
                  <button
                    key={m}
                    onClick={() => setActiveMetric(m)}
                    className={`agg-btn ${activeMetric === m ? 'active' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="drill-depth-info">
            DEPTH: {drillPath.length} / {hierarchy.length}
          </div>
        </div>
      )}

      {drillChartType !== 'drill-table' && (
        <DrillDownBreadcrumb
          drillPath={drillPath}
          hierarchy={hierarchy}
          measureCol={measureCol}
          onNavigate={(depth) => setDrillPath(drillBackTo(drillPath, depth))}
          chartType={drillChartType}
          totalRows={totalRows}
          rowCount={currentRowCount}
        />
      )}

      <div className="chart-container-wrapper" style={{ height: '480px' }}>
        {drillChartType === 'drill-table' ? renderTable() : (
          <ReactECharts
            option={option}
            onChartReady={onChartReady}
            onEvents={{ click: handleChartClick }}
            notMerge={true}
            lazyUpdate={false}
            style={{ height: '100%', width: '100%' }}
          />
        )}

        {drillPath.length > 0 && (
          <div className="floating-depth-badge">
            LEVEL {drillPath.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrillDownRenderer;
