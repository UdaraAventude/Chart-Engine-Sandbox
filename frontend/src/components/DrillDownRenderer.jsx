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

// Helper for tree navigation
function getSubtreeForPath(treeNodes, drillPath) {
  let nodes = treeNodes;
  for (const step of drillPath) {
    const match = nodes.find(n => n.name === String(step.value));
    if (!match?.children) return nodes;
    nodes = match.children;
  }
  return nodes;
}

const buildSunburstTreeFromDataset = (filteredData, hierarchy, measureCol, drillPath, maxLevels = 4) => {
  const remainingHierarchy = hierarchy.slice(drillPath.length);
  const levels = remainingHierarchy.slice(0, maxLevels);

  function buildNode(rows, levelIndex, parentValue) {
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
      const children = buildNode(groupRows, levelIndex + 1, value);
      return {
        name,
        value: children.length ? undefined : value,
        children: children.length ? children : undefined,
        parentValue,
      };
    }).sort((a, b) => (b.value || 0) - (a.value || 0));
  }

  return buildNode(filteredData, 0, null);
};

const DrillDownRenderer = ({ onRenderTime }) => {
  const { dataset, chartConfig, drillChartType, aggregations, totalRows } = useStore();
  const setRenderTime = useStore(state => state.setRenderTime);

  const [drillPath, setDrillPath] = useState([]);
  const [aggMethod, setAggMethod] = useState('sum');
  const [activeMetric, setActiveMetric] = useState('Satisfaction');
  const t0 = useRef(0);

  useEffect(() => {
    setDrillPath([]);
  }, [dataset, drillChartType]);

  const hasAggregations = useMemo(() => aggregations && !aggregations.error, [aggregations]);

  const columnTypes = useMemo(() => {
    if (hasAggregations && aggregations.column_types) {
      return aggregations.column_types;
    }
    return classifyColumns(dataset);
  }, [dataset, aggregations, hasAggregations]);

  const hierarchy = useMemo(() => {
    if (chartConfig?.drill_hierarchy) {
      return chartConfig.drill_hierarchy;
    }
    return buildDrillHierarchy(dataset, columnTypes);
  }, [dataset, columnTypes, chartConfig]);

  const numericCols = useMemo(() => Object.keys(columnTypes).filter(c => columnTypes[c] === 'numeric'), [columnTypes]);
  const xCol = chartConfig?.x_axis || numericCols[0];
  const yCol = chartConfig?.y_axis || numericCols[1] || numericCols[0];
  const measureCol = chartConfig?.measure_col || yCol;
  const sizeCol = chartConfig?.size_col || numericCols[2] || numericCols[1] || numericCols[0];

  const filteredData = useMemo(() => filterByDrillPath(dataset, drillPath), [dataset, drillPath]);
  const atLeaf = isLeafLevel(drillPath, hierarchy);
  const currentGroupByCol = getCurrentGroupByColumn(drillPath, hierarchy);

  // ── Row Count ──
  const currentRowCount = useMemo(() => {
    if (!drillPath.length) return totalRows;
    const pathKey = drillPath.map(s => s.value).join('|');
    if (aggregations?.drill_flat?.[pathKey]) {
      return aggregations.drill_flat[pathKey].reduce((s, r) => s + r.count, 0);
    }
    return filterByDrillPath(dataset, drillPath).length;
  }, [drillPath, aggregations, dataset, totalRows]);

  // ── Aggregation Getters ──

  const getBarDataForPath = useCallback((path, method) => {
    if (!hasAggregations || !aggregations.drill_flat) {
      return aggregateForChart(filteredData, currentGroupByCol, measureCol, method);
    }

    const pathKey = path.map(s => s.value).join('|');
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
  }, [hasAggregations, aggregations, filteredData, currentGroupByCol, measureCol]);

  const sunburstData = useMemo(() => {
    if (hasAggregations && aggregations.drill_tree) {
      return getSubtreeForPath(aggregations.drill_tree, drillPath);
    }
    const filtered = filterByDrillPath(dataset, drillPath);
    return buildSunburstTreeFromDataset(filtered, hierarchy, measureCol, drillPath);
  }, [hasAggregations, aggregations, dataset, hierarchy, measureCol, drillPath]);

  const getHeatmapData = useCallback(() => {
    // Meaningful HR Columns for Heatmap
    const hX = dataset[0]?.commute_time_min !== undefined ? 'commute_time_min' : xCol;
    const hY = dataset[0]?.work_life_balance !== undefined ? 'work_life_balance' : yCol;
    const hV = dataset[0]?.overall_satisfaction !== undefined ? 'overall_satisfaction' : yCol;

    if (drillPath.length === 0 && hasAggregations && aggregations.heatmap) {
      return aggregations.heatmap;
    }
    return aggregateForHeatmap(filteredData, hX, hY, hV, aggMethod);
  }, [drillPath.length, hasAggregations, aggregations, filteredData, dataset, xCol, yCol, aggMethod]);

  const getBubbleData = useCallback(() => {
    // Meaningful HR Columns for Bubble
    const bX = dataset[0]?.monthly_salary !== undefined ? 'monthly_salary' : xCol;
    const bY = dataset[0]?.overall_satisfaction !== undefined ? 'overall_satisfaction' : yCol;
    const bS = dataset[0]?.turnover_risk_score !== undefined ? 'turnover_risk_score' : sizeCol;

    if (drillPath.length === 0 && hasAggregations && aggregations.bubble) {
      return aggregations.bubble;
    }
    return aggregateForBubble(filteredData, currentGroupByCol, bX, bY, bS, aggMethod);
  }, [drillPath.length, hasAggregations, aggregations, filteredData, dataset, currentGroupByCol, xCol, yCol, sizeCol, aggMethod]);

  const option = useMemo(() => {
    t0.current = performance.now();
    const baseTitle = chartConfig?.title || 'Drill Analysis';
    const pathTitle = drillPath.length > 0 ? ' › ' + drillPath.map(p => p.value).join(' › ') : '';
    const title = baseTitle + pathTitle;
    
    if (drillChartType === 'drill-bar') {
      if (atLeaf || !currentGroupByCol) {
        return buildDrillScatter(filteredData, xCol, yCol, hierarchy[hierarchy.length - 1], title);
      }
      const aggregated = getBarDataForPath(drillPath, aggMethod);
      return buildDrillBar(aggregated, currentGroupByCol, measureCol, title, atLeaf, aggMethod);
    }

    if (drillChartType === 'drill-sunburst') {
      if (atLeaf) {
        return buildDrillScatter(filteredData, xCol, yCol, null, title);
      }
      const opt = buildDrillSunburst(sunburstData, measureCol, title, drillPath, hierarchy.length, aggMethod);
      if (opt.series && opt.series[0]) {
        opt.series[0].nodeClick = false; 
      }
      return opt;
    }

    if (drillChartType === 'drill-heatmap') {
      if (atLeaf || (filteredData.length < 10 && !hasAggregations)) {
        return buildDrillScatter(filteredData, xCol, yCol, null, title);
      }
      const heatmapData = getHeatmapData();
      return buildDrillHeatmap(heatmapData, xCol, yCol, yCol, title, atLeaf);
    }

    if (drillChartType === 'drill-scatter') {
      return buildDrillScatter(filteredData, xCol, yCol, currentGroupByCol, title);
    }

    if (drillChartType === 'drill-bubble') {
      if (atLeaf || !currentGroupByCol) {
        return buildDrillScatter(filteredData, xCol, yCol, null, title);
      }
      const bubbleData = getBubbleData();
      return buildDrillBubble(bubbleData, xCol, yCol, sizeCol, currentGroupByCol, title, atLeaf);
    }

    if (drillChartType === 'drill-pie') {
      const aggregated = getBarDataForPath(drillPath, aggMethod);
      return buildDrillPie(aggregated, measureCol, title, atLeaf);
    }

    if (drillChartType === 'drill-line') {
      if (!hasAggregations || !aggregations.drill_timeseries) return {};
      const pathKey = drillPath.length > 0 ? drillPath.map(s => s.value).join('|') : '';
      const tsData = aggregations.drill_timeseries.data[pathKey];
      if (!tsData) return buildDrillScatter(filteredData, xCol, yCol, null, title);
      
      return buildDrillMultiline({
        quarters: aggregations.drill_timeseries.quarters,
        metrics: tsData
      }, activeMetric, title, aggMethod);
    }

    if (drillChartType === 'drill-correlation') {
      if (!hasAggregations || !aggregations.correlation) return {};
      return buildDrillCorrelation(aggregations.correlation, title);
    }

    if (drillChartType === 'drill-histogram') {
      if (!hasAggregations || !aggregations.histogram) return {};
      return buildDrillHistogram(aggregations.histogram, title);
    }

    return {};
  }, [drillChartType, filteredData, drillPath, aggMethod, atLeaf, currentGroupByCol, hierarchy, xCol, yCol, sizeCol, chartConfig, hasAggregations, getBarDataForPath, sunburstData, getHeatmapData, getBubbleData]);

  const renderTable = () => {
    const data = drillChartType === 'drill-bar' || drillChartType === 'drill-pie' 
      ? getBarDataForPath(drillPath, aggMethod)
      : filteredData.slice(0, 100);

    if (!data.length) return <div className="empty-state">No data for table</div>;

    const cols = Object.keys(data[0]);

    return (
      <div className="table-view-container" style={{ overflow: 'auto', maxHeight: '100%' }}>
        <table className="premium-table">
          <thead>
            <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
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
    if (atLeaf) return;
    
    if (drillChartType === 'drill-sunburst') {
      const treeDepth = params.treePathInfo?.length || 1;
      
      // CENTER CLICK = go back one level
      if (treeDepth <= 1 || params.data?.name === undefined) {
        if (drillPath.length > 0) {
          setDrillPath(drillBackTo(drillPath, drillPath.length - 1));
        }
        return;
      }
      
      // SEGMENT CLICK = drill deeper
      if (!atLeaf && params.data?.name) {
        const levelInTree = treeDepth - 1;
        const colIndex = drillPath.length + levelInTree - 1;
        const col = hierarchy[colIndex];
        if (col) setDrillPath(drillInto(drillPath, col, params.data.name));
      }
      return;
    }

    let clickedValue = null;
    if (drillChartType === 'drill-bar' || drillChartType === 'drill-pie') {
      clickedValue = params.name;
    } else if (drillChartType === 'drill-bubble' || drillChartType === 'drill-line' || drillChartType === 'drill-scatter') {
      clickedValue = params.seriesName;
    }
    
    if (clickedValue !== null && currentGroupByCol) {
      setDrillPath(prev => drillInto(prev, currentGroupByCol, clickedValue));
    }
  }, [drillChartType, drillPath, atLeaf, hierarchy, currentGroupByCol]);

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
      <div className="drill-toolbar">
        <div className="drill-engine-badge">
          <Activity size={16} className="drill-engine-dot" />
          <span className="drill-engine-text">
            {drillChartType.split('-')[1].charAt(0).toUpperCase() + drillChartType.split('-')[1].slice(1)} Drill-Down
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

      <DrillDownBreadcrumb 
        drillPath={drillPath}
        hierarchy={hierarchy}
        measureCol={measureCol}
        onNavigate={(depth) => setDrillPath(drillBackTo(drillPath, depth))}
        chartType={drillChartType}
        totalRows={totalRows}
        rowCount={currentRowCount}
      />

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
