import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { Activity } from 'lucide-react';
import '../../../../styles/DrillDown.css';
import useStore from '../../../../store';
import { getNodeAtPath, isLeaf, formatForChart, computeHistogramBins } from '../../hooks/engine';
import { DRILL_CHART_OPTIONS } from '../../constants/chartOptions';
import DrillDownBreadcrumb from '../drill-down-breadcrumb';
import BarChart from '../../../../components/bar-chart';
import PieChart from '../../../../components/pie-chart';
import LineChart from '../../../../components/line-chart';
import ScatterChart from '../../../../components/scatter-chart';
import BubbleChart from '../../../../components/bubble-chart';
import HistogramChart from '../../../../components/histogram-chart';

// Inline range parser — mirrors parseHistBinRange in engine/index.js
function parseHistBinRange(label) {
  const parseVal = (s) => {
    const str = s.trim();
    if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
    if (str.endsWith('k')) return parseFloat(str) * 1_000;
    return parseFloat(str);
  };
  const parts = label.split(' – ');
  if (parts.length !== 2) return null;
  return { lo: parseVal(parts[0]), hi: parseVal(parts[1]) };
}

const DrillDownRenderer = ({ onRenderTime }) => {
  // ── Store subscriptions ────────────────────────────────────────────────────
  const globalData        = useStore((s) => s.globalData);
  const totalRows         = useStore((s) => s.totalRows);
  const drillPath         = useStore((s) => s.drillPath);
  const chartTypeByDepth  = useStore((s) => s.chartTypeByDepth);
  const drillInto         = useStore((s) => s.drillInto);
  const drillBackTo       = useStore((s) => s.drillBackTo);
  const setChartTypeAtDepth = useStore((s) => s.setChartTypeAtDepth);
  const setRenderTime     = useStore((s) => s.setRenderTime);

  const t0 = useRef(0);

  // ── Derived values (safe: no conditional returns yet) ─────────────────────
  const chartType  = chartTypeByDepth[drillPath.length] ?? 'bar';
  const tree       = globalData?.tree;
  const dimensions = globalData?.dimensions ?? [];
  const metrics    = globalData?.metrics ?? [];
  const rows       = globalData?.rows ?? [];

  const currentNode = getNodeAtPath(tree, drillPath);
  const atLeaf      = isLeaf(currentNode);

  // __hist__ steps are numeric range filters — they do NOT consume a categorical
  // dimension slot, so we count only non-hist steps for the dimension index.
  const categoricalDepth = drillPath.filter((s) => !s.column.startsWith('__hist__')).length;
  const currentColumn    = dimensions[categoricalDepth] ?? '';

  // Whether the current drillPath contains any histogram bin step
  const lastHistStep = useMemo(
    () => [...drillPath].reverse().find((s) => s.column.startsWith('__hist__')) ?? null,
    [drillPath],
  );

  // ── ALL hooks unconditionally at top ──────────────────────────────────────

  const onChartReady = useCallback(() => {
    const elapsed = performance.now() - t0.current;
    onRenderTime?.(elapsed.toFixed(1));
    setRenderTime?.(elapsed.toFixed(1));
  }, [onRenderTime, setRenderTime]);

  const handleClick = useCallback(
    (name) => {
      if (!atLeaf && name && currentColumn) drillInto(name, currentColumn);
    },
    [atLeaf, currentColumn, drillInto],
  );

  useEffect(() => {
    t0.current = performance.now();
  });

  // Compute histogram bins (null when not in histogram mode)
  const histogramBins = useMemo(() => {
    if (chartType !== 'histogram' || !rows.length || !metrics.length) return null;
    return computeHistogramBins(rows, drillPath, metrics[0]);
  }, [chartType, rows, drillPath, metrics]);

  // When drillPath contains a __hist__ step, count the rows that satisfy
  // the full path (including the range filter) so the breadcrumb is accurate.
  const histDrilledRowCount = useMemo(() => {
    if (!lastHistStep || !rows.length) return null;
    return rows.filter((row) =>
      drillPath.every((step) => {
        if (step.column.startsWith('__hist__')) {
          const col   = step.column.slice('__hist__'.length);
          const range = parseHistBinRange(step.value);
          if (!range) return true;
          const v = Number(row[col]);
          return !isNaN(v) && v >= range.lo && v < range.hi;
        }
        return String(row[step.column] ?? '').trim() === step.value;
      }),
    ).length;
  }, [lastHistStep, rows, drillPath]);

  const treeRowCount    = currentNode?.count ?? totalRows;
  const resolvedRowCount = histDrilledRowCount ?? treeRowCount;

  // ── CONDITIONAL RETURNS — after ALL hooks ─────────────────────────────────

  if (!globalData || !tree) {
    return (
      <div className='empty-state'>
        <Activity size={32} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <h3>No Data</h3>
        <p className='empty-subtext'>Upload a CSV file to begin.</p>
      </div>
    );
  }

  const rejected       = globalData?.rejected ?? [];
  const hasOnlyNumeric = metrics.length > 0 && rejected.every((r) => r.reason !== 'too_few_unique');

  if (!dimensions.length) {
    return (
      <div className='empty-state'>
        <Activity size={32} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <h3>No Hierarchy Detected</h3>
        {hasOnlyNumeric ? (
          <p className='empty-subtext'>
            All columns appear to be numeric
            {metrics.length
              ? ` (${metrics.slice(0, 3).join(', ')}${metrics.length > 3 ? '…' : ''}).`
              : '.'}{' '}
            Add a column with categorical values (e.g. country, category, status) to build a
            drill-down hierarchy.
          </p>
        ) : (
          <p className='empty-subtext'>
            No suitable categorical columns found. Each dimension column needs 2–500 unique values.
            Try removing ID columns or columns with free-text.
          </p>
        )}
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildTitle() {
    const base = 'Data Explorer';
    if (drillPath.length === 0) return base;
    return base + ' › ' + drillPath.map((p) => p.value).join(' › ');
  }

  // ── Chart renderer ────────────────────────────────────────────────────────

  const renderChart = () => {
    t0.current = performance.now();
    const title = buildTitle();

    // ── HISTOGRAM ────────────────────────────────────────────────────────────
    if (chartType === 'histogram') {
      if (!histogramBins || !histogramBins.labels.length) {
        return <div className='empty-state'>No numeric data available for histogram.</div>;
      }

      const handleBinClick = (label) => {
        if (atLeaf || !currentColumn) return;
        // Sentinel column "__hist__<metricCol>" carries the bin range in its value.
        // filterRows() in the engine knows how to interpret this.
        drillInto(label, `__hist__${metrics[0]}`);
      };

      return (
        <HistogramChart
          labels={histogramBins.labels}
          counts={histogramBins.counts}
          columnName={metrics[0]}
          title={title}
          height='100%'
          onBarClick={!atLeaf ? handleBinClick : undefined}
          onChartReady={onChartReady}
        />
      );
    }

    // ── SCATTER ───────────────────────────────────────────────────────────────
    if (chartType === 'scatter') {
      const { rawData, xCol, yCol } = formatForChart(
        currentNode, 'scatter', rows, drillPath, metrics, dimensions,
      );
      return (
        <ScatterChart
          rawData={rawData}
          xCol={xCol}
          yCol={yCol}
          colorCol={currentColumn}
          title={title}
          height='100%'
          onPointClick={handleClick}
          onChartReady={onChartReady}
        />
      );
    }

    // ── BUBBLE ────────────────────────────────────────────────────────────────
    if (chartType === 'bubble') {
      const bubbleData = formatForChart(currentNode, 'bubble', rows, drillPath, metrics, dimensions, 50);
      return (
        <BubbleChart
          data={bubbleData}
          xCol={metrics[0] ?? ''}
          yCol={metrics[1] ?? metrics[0] ?? ''}
          sizeCol={metrics[0] ?? ''}
          title={title}
          isLeaf={atLeaf}
          height='100%'
          onBubbleClick={handleClick}
          onChartReady={onChartReady}
        />
      );
    }

    // ── BAR / LINE / PIE ──────────────────────────────────────────────────────
    const data   = formatForChart(currentNode, chartType, rows, drillPath, metrics, dimensions);
    const xLabel = (currentColumn || '').replace(/_/g, ' ').toUpperCase();
    const yLabel = (metrics[0]   || '').replace(/_/g, ' ').toUpperCase();

    if (chartType === 'pie') {
      return (
        <PieChart
          data={data}
          title={title}
          height='100%'
          onSliceClick={handleClick}
          onChartReady={onChartReady}
        />
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart
          data={data}
          title={title}
          xAxisLabel={xLabel}
          yAxisLabel={yLabel}
          isLeaf={atLeaf}
          height='100%'
          onPointClick={handleClick}
          onChartReady={onChartReady}
        />
      );
    }

    // Default: Bar
    return (
      <BarChart
        data={data}
        title={title}
        xAxisLabel={xLabel}
        yAxisLabel={yLabel}
        isLeaf={atLeaf}
        height='100%'
        onBarClick={handleClick}
        onChartReady={onChartReady}
      />
    );
  };

  // ── Table renderer ────────────────────────────────────────────────────────

  const renderTable = () => {
    const data = formatForChart(currentNode, 'bar', rows, drillPath, metrics, dimensions, null);
    if (data.length === 0) return <div className='empty-state'>No data</div>;
    const cols = Object.keys(data[0]);
    return (
      <div className='table-view-container' style={{ overflow: 'auto', maxHeight: '100%' }}>
        <table className='premium-table'>
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c}>{row[c]?.toLocaleString?.() ?? row[c]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className='drill-container'>
      <div
        className='drill-toolbar'
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div className='drill-engine-badge'>
          <Activity size={16} className='drill-engine-dot' />
          <span className='drill-engine-text'>
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Drill-Down
          </span>
          <div className='drill-engine-divider' />
          <span className='drill-engine-levels'>{dimensions.length} levels</span>
        </div>

        <select
          value={chartType}
          onChange={(e) => setChartTypeAtDepth(drillPath.length, e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          {DRILL_CHART_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <DrillDownBreadcrumb
        drillPath={drillPath}
        onNavigate={(depth) => drillBackTo(depth)}
        rowCount={resolvedRowCount}
        totalRows={totalRows}
      />

      <div className='chart-container-wrapper' style={{ height: '480px' }}>
        {chartType === 'table' ? renderTable() : renderChart()}
        {drillPath.length > 0 && (
          <div className='floating-depth-badge'>LEVEL {drillPath.length}</div>
        )}
      </div>
    </div>
  );
};

export default DrillDownRenderer;
