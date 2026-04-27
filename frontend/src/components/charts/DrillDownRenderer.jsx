import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity } from 'lucide-react';
import '../../styles/DrillDown.css';
import useStore from '../../store/useStore';
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
} from '../../utils/DrillDownManager';
import { 
  buildDrillBar,
  buildDrillHeatmap,
  buildDrillBubble,
  buildDrillScatter,
  buildDrillSunburst,
  buildDrillPie,
  buildDrillMultiline,
  buildDrillCorrelation,
  buildDrillHistogram,
  buildDrillLine
} from '../../utils/DrillDownCharts';
import {
  getSubtreeForPath,
  parseRangeLabel,
  buildSunburstTreeFromDataset,
  computeCorrelationFrontend,
  computeHistogramFrontend
} from '../../utils/analyticsHelpers';
import DrillDownBreadcrumb from './DrillDownBreadcrumb';

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

  const currentRowCount = useMemo(() => {
    if (!drillPath.length) return totalRows;
    const pathKey = drillPath.map(s => s.value).join('|');
    if (aggregations?.drill_flat?.[pathKey]) {
      return aggregations.drill_flat[pathKey].reduce((s, r) => s + r.count, 0);
    }
    return filteredData.length;
  }, [drillPath, aggregations, filteredData, totalRows]);

  const getBarDataForPath = useCallback((path, method) => {
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
      const leafCol = hierarchy[path.length - 1];
      return aggregateForChart(filteredData, leafCol, measureCol, method);
    }

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

  const sunburstData = useMemo(() => {
    if (hasAggregations && Array.isArray(aggregations.drill_tree) && aggregations.drill_tree.length > 0) {
      return getSubtreeForPath(aggregations.drill_tree, drillPath);
    }
    return buildSunburstTreeFromDataset(filteredData, hierarchy, measureCol, drillPath);
  }, [hasAggregations, aggregations, filteredData, hierarchy, measureCol, drillPath]);

  const getHeatmapData = useCallback(() => {
    const hX = dataset[0]?.commute_time_min !== undefined ? 'commute_time_min' : xCol;
    const hY = dataset[0]?.work_life_balance !== undefined ? 'work_life_balance' : yCol;
    const hV = dataset[0]?.overall_satisfaction !== undefined ? 'overall_satisfaction' : yCol;

    if (drillPath.length === 0 && hasAggregations && aggregations.heatmap && aggregations.heatmap.cells) {
      return aggregations.heatmap;
    }

    const HEATMAP_BINS = 6;
    return aggregateForHeatmap(filteredData, hX, hY, hV, HEATMAP_BINS);
  }, [drillPath.length, hasAggregations, aggregations, filteredData, dataset, xCol, yCol]);

  const getBubbleData = useCallback(() => {
    const bX = dataset[0]?.monthly_salary        !== undefined ? 'monthly_salary'        : xCol;
    const bY = dataset[0]?.overall_satisfaction  !== undefined ? 'overall_satisfaction'  : yCol;
    const bS = dataset[0]?.turnover_risk_score   !== undefined ? 'turnover_risk_score'   : sizeCol;

    const groupCol = currentGroupByCol || hierarchy[drillPath.length] || hierarchy[0];
    if (!groupCol || filteredData.length === 0) return [];
    return aggregateForBubble(filteredData, groupCol, bX, bY, bS);
  }, [drillPath, filteredData, dataset, currentGroupByCol, hierarchy, xCol, yCol, sizeCol]);

  const option = useMemo(() => {
    t0.current = performance.now();
    const baseTitle = chartConfig?.title || 'Employee Satisfaction & Salary Analysis';
    const pathTitle = drillPath.length > 0
      ? ' › ' + drillPath.map(p => p.value).join(' › ')
      : '';
    const title = baseTitle + pathTitle;

    if (drillChartType === 'drill-bar') {
      const aggregated = getBarDataForPath(drillPath, aggMethod);
      const groupCol   = currentGroupByCol || hierarchy[hierarchy.length - 1];
      return buildDrillBar(aggregated, groupCol, measureCol, title, atLeaf, aggMethod);
    }

    if (drillChartType === 'drill-sunburst') {
      const opt = buildDrillSunburst(sunburstData, measureCol, title, drillPath, hierarchy.length, aggMethod);
      if (drillPath.length > 0) {
        opt.graphic = [{
          type: 'circle',
          left: 'center',
          top: 'middle',
          shape: { r: 48 },
          style: {
            fill: 'rgba(0,0,0,0)',
            cursor: 'pointer',
          },
          onclick: () => {
            setDrillPath(prev => prev.slice(0, -1));
          }
        }];
      } else {
        opt.graphic = [];
      }
      return opt;
    }

    if (drillChartType === 'drill-heatmap') {
      const heatmapData = getHeatmapData();
      return buildDrillHeatmap(heatmapData, xCol, yCol, measureCol, title, atLeaf);
    }

    if (drillChartType === 'drill-scatter') {
      return buildDrillScatter(filteredData, xCol, yCol, currentGroupByCol, title);
    }

    if (drillChartType === 'drill-bubble') {
      const bubbleData = getBubbleData();
      if (!bubbleData || bubbleData.length === 0) {
        const groupCol = currentGroupByCol || hierarchy[hierarchy.length - 1];
        return buildDrillBar(getBarDataForPath(drillPath, 'count'), groupCol, 'count', title, atLeaf, 'count');
      }
      const groupCol = currentGroupByCol || hierarchy[hierarchy.length - 1];
      return buildDrillBubble(bubbleData, xCol, yCol, sizeCol, groupCol, title, atLeaf);
    }

    if (drillChartType === 'drill-pie') {
      const aggregated = getBarDataForPath(drillPath, aggMethod);
      return buildDrillPie(aggregated, measureCol, title, atLeaf);
    }

    if (drillChartType === 'drill-line') {
      if (hasAggregations && aggregations.drill_timeseries) {
        const pathKey = drillPath.map(s => s.value).join('|');
        const tsData  = aggregations.drill_timeseries.data?.[pathKey];
        const hasUsableSeries = tsData && Object.values(tsData).some(
          (seriesArr) => Array.isArray(seriesArr) && seriesArr.length > 0
        );

        if (hasUsableSeries) {
          setLineShowsBarFallback(false);
          return buildDrillMultiline(
            { quarters: aggregations.drill_timeseries.quarters, metrics: tsData },
            activeMetric, title, aggMethod
          );
        }
      }

      if (drillPath.length === 0 && hasAggregations && aggregations.timeseries?.metrics) {
        const rootMetrics = {};
        Object.entries(aggregations.timeseries.metrics).forEach(([metricName, series]) => {
          rootMetrics[metricName] = (series || []).map((s) => ({
            name: s.name,
            sum: (s.data || []).map((v) => (v == null ? 0 : v)),
            count: (s.data || []).map((v) => (v == null ? 0 : 1)),
          }));
        });

        const hasRootSeries = Object.values(rootMetrics).some(
          (seriesArr) => Array.isArray(seriesArr) && seriesArr.length > 0
        );

        if (hasRootSeries) {
          setLineShowsBarFallback(false);
          return buildDrillMultiline(
            { quarters: aggregations.timeseries.quarters || [], metrics: rootMetrics },
            activeMetric,
            title,
            aggMethod
          );
        }
      }

      setLineShowsBarFallback(true);
      const metricCol = (activeMetric === 'Salary' ? 'monthly_salary' : 
                        (activeMetric === 'Satisfaction' ? 'overall_satisfaction' : measureCol));
      
      const aggregated = getBarDataForPath(drillPath, aggMethod);
      const groupCol   = currentGroupByCol || hierarchy[hierarchy.length - 1];
      const fallbackTitle = title + ' (' + aggMethod + ' ' + (activeMetric || 'metric') + ' by ' + (groupCol || 'group') + ')';
      
      return buildDrillLine(aggregated, groupCol, metricCol, fallbackTitle, atLeaf, aggMethod);
    }

    if (drillChartType === 'drill-correlation') {
      if (drillPath.length === 0 && hasAggregations && aggregations.correlation) {
        return buildDrillCorrelation(aggregations.correlation, title);
      }
      if (filteredData.length > 0) {
        const numCols = Object.keys(columnTypes).filter(c => columnTypes[c] === 'numeric');
        const corrData = computeCorrelationFrontend(filteredData, numCols);
        return buildDrillCorrelation(corrData, title);
      }
      return {};
    }

    if (drillChartType === 'drill-histogram') {
      const hasHistAgg = hasAggregations && aggregations.histogram && 
                        Array.isArray(aggregations.histogram.labels) && 
                        aggregations.histogram.labels.length > 0;

      if (drillPath.length === 0 && hasHistAgg) {
        return buildDrillHistogram(aggregations.histogram, title);
      }
      
      const numericCols = Object.keys(columnTypes).filter(c => columnTypes[c] === 'numeric');
      let histCol = '';
      
      if (columnTypes[measureCol] === 'numeric') histCol = measureCol;
      else if (filteredData?.[0]?.overall_satisfaction !== undefined) histCol = 'overall_satisfaction';
      else if (numericCols.length > 0) histCol = numericCols[0];
      else {
        // Last resort: find any column that has numeric values in the first row
        const firstRow = filteredData?.[0] || {};
        histCol = Object.keys(firstRow).find(k => !isNaN(parseFloat(firstRow[k]))) || '';
      }
      
      if (!histCol || !filteredData || filteredData.length === 0) return {};
      const histData = computeHistogramFrontend(filteredData, histCol);
      return buildDrillHistogram(histData, title);
    }

    return {};
  }, [
    drillChartType, filteredData, drillPath, aggMethod, atLeaf,
    currentGroupByCol, hierarchy, xCol, yCol, sizeCol, chartConfig,
    hasAggregations, aggregations, getBarDataForPath, sunburstData,
    getHeatmapData, getBubbleData, activeMetric, measureCol,
  ]);

  // Log the generated option and current state for debugging
  React.useEffect(() => {
    console.log(`[DrillDownRenderer] Active Chart Type:`, drillChartType);
    console.log(`[DrillDownRenderer] Current Drill Path (Depth: ${drillPath.length}):`, drillPath);
    console.log(`[DrillDownRenderer] Generated ECharts Option Payload:`, option);
  }, [option, drillChartType, drillPath]);

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

  const handleChartClick = useCallback((params) => {
    if (drillChartType === 'drill-sunburst') {
      const treeDepth = params.treePathInfo?.length ?? 0;
      if (treeDepth <= 1) {
        if (drillPath.length > 0) {
          setDrillPath(prev => prev.slice(0, -1));
        }
        return;
      }
      if (atLeaf) {
        if (drillPath.length > 0) {
          setDrillPath(prev => prev.slice(0, -1));
        }
        return;
      }
      const pathNames = (params.treePathInfo || []).map(p => p.name).filter(Boolean);
      const targetValue = pathNames[0] || params.data?.name;
      if (targetValue && currentGroupByCol) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, targetValue));
      }
      return;
    }

    if (atLeaf) return;

    if (drillChartType === 'drill-heatmap') {
      if (!params.data) return;
      const hData = getHeatmapData();
      const xIdx  = params.data[0];
      const cells = hData.cells || [];
      const cell  = cells.find(c => c.x === xIdx);
      if (!cell || !currentGroupByCol) return;
      const range = parseRangeLabel(cell.xLabel);
      if (!range) return;
      const [rangeMin, rangeMax] = range;
      const hX = dataset[0]?.commute_time_min !== undefined ? 'commute_time_min' : xCol;
      const binRows = filteredData.filter(row => {
        const v = parseFloat(row[hX]);
        return !isNaN(v) && v >= rangeMin && v <= rangeMax;
      });
      if (binRows.length === 0) return;
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

    if (drillChartType === 'drill-bar' || drillChartType === 'drill-pie') {
      if (params.name && currentGroupByCol) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, params.name));
      }
      return;
    }

    if (drillChartType === 'drill-line') {
      const clickedValue = lineShowsBarFallback ? params.name : params.seriesName;
      if (clickedValue && currentGroupByCol) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, clickedValue));
      }
      return;
    }

    if (drillChartType === 'drill-bubble' || drillChartType === 'drill-scatter') {
      const clickedValue = params.seriesName;
      if (clickedValue && currentGroupByCol) {
        setDrillPath(prev => drillInto(prev, currentGroupByCol, clickedValue));
      }
      return;
    }

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

    if (drillChartType === 'drill-histogram') {
      if (!atLeaf && params.name && currentGroupByCol) {
        const range = params.name.match(/[\d.]+/g);
        if (range && range.length >= 2) {
          const [lo, hi] = [parseFloat(range[0]), parseFloat(range[1])];
          
          // Use the same detection logic as in the render option
          const numericCols = Object.keys(columnTypes).filter(c => columnTypes[c] === 'numeric');
          let histCol = '';
          if (columnTypes[measureCol] === 'numeric') histCol = measureCol;
          else if (filteredData?.[0]?.overall_satisfaction !== undefined) histCol = 'overall_satisfaction';
          else if (numericCols.length > 0) histCol = numericCols[0];
          
          if (!histCol) return;

          const binRows = filteredData.filter(r => {
            const v = parseFloat(r[histCol]);
            return !isNaN(v) && v >= lo && v <= hi;
          });
          // Drill into the selected histogram bin by adding the range to the drill path
          setDrillPath(prev => drillInto(prev, histCol, params.name));
        }
      }
      return;
    }
  }, [
    drillChartType, drillPath, atLeaf, hierarchy, currentGroupByCol,
    getHeatmapData, filteredData, dataset, xCol, lineShowsBarFallback,
    columnTypes, measureCol
  ]);

  const onChartReady = () => {
    const elapsed = performance.now() - t0.current;
    if (onRenderTime) onRenderTime(elapsed.toFixed(1));
  };

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
