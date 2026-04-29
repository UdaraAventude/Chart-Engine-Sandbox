import React, { useRef, useCallback, useEffect } from 'react';
import { Activity } from 'lucide-react';
import '../../../../styles/DrillDown.css';
import useStore from '../../../../store';
import { getNodeAtPath, isLeaf, formatForChart } from '../../hooks/engine';
import { DRILL_CHART_OPTIONS } from '../../constants/chartOptions';
import DrillDownBreadcrumb from '../drill-down-breadcrumb';
import BarChart from '../../../../components/bar-chart';
import PieChart from '../../../../components/pie-chart';
import LineChart from '../../../../components/line-chart';
import ScatterChart from '../../../../components/scatter-chart';
import BubbleChart from '../../../../components/bubble-chart';


// CHART_OPTIONS is now imported as DRILL_CHART_OPTIONS from '../../constants/chartOptions'

const DrillDownRenderer = ({ onRenderTime }) => {
  const globalData = useStore((s) => s.globalData);
  const totalRows = useStore((s) => s.totalRows);
  const drillPath = useStore((s) => s.drillPath);
  const chartTypeByDepth = useStore((s) => s.chartTypeByDepth);
  const drillInto = useStore((s) => s.drillInto);
  const drillBackTo = useStore((s) => s.drillBackTo);
  const setChartTypeAtDepth = useStore((s) => s.setChartTypeAtDepth);
  const setRenderTime = useStore((s) => s.setRenderTime);

  const t0 = useRef(0);

  const chartType = chartTypeByDepth[drillPath.length] ?? 'bar';
  const tree = globalData?.tree;
  const dimensions = globalData?.dimensions ?? [];
  const metrics = globalData?.metrics ?? [];
  const rows = globalData?.rows ?? [];

  const currentNode = getNodeAtPath(tree, drillPath);
  const atLeaf = isLeaf(currentNode);
  const currentColumn = dimensions[drillPath.length] ?? '';
  const currentRowCount = currentNode?.count ?? totalRows;

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

  if (!globalData || !tree) {
    return (
      <div className='empty-state'>
        <Activity
          size={32}
          strokeWidth={1.5}
          style={{ marginBottom: '12px', opacity: 0.5 }}
        />
        <h3>No Data</h3>
        <p className='empty-subtext'>Upload a CSV file to begin.</p>
      </div>
    );
  }

  const rejected = globalData?.rejected ?? [];
  const hasOnlyNumeric =
    metrics.length > 0 && rejected.every((r) => r.reason !== 'too_few_unique');

  if (!dimensions.length) {
    return (
      <div className='empty-state'>
        <Activity
          size={32}
          strokeWidth={1.5}
          style={{ marginBottom: '12px', opacity: 0.5 }}
        />
        <h3>No Hierarchy Detected</h3>
        {hasOnlyNumeric ? (
          <p className='empty-subtext'>
            All columns appear to be numeric
            {metrics.length
              ? ` (${metrics.slice(0, 3).join(', ')}${metrics.length > 3 ? '…' : ''}).`
              : '.'}{' '}
            Add a column with categorical values (e.g. country, category,
            status) to build a drill-down hierarchy.
          </p>
        ) : (
          <p className='empty-subtext'>
            No suitable categorical columns found. Each dimension column needs
            2–500 unique values. Try removing ID columns or columns with
            free-text.
          </p>
        )}
      </div>
    );
  }

  function buildTitle() {
    const base = 'Data Explorer';
    if (drillPath.length === 0) return base;
    return base + ' \u203a ' + drillPath.map((p) => p.value).join(' \u203a ');
  }

  const renderChart = () => {
    t0.current = performance.now();
    const title = buildTitle();

    if (chartType === 'scatter') {
      const { rawData, xCol, yCol } = formatForChart(
        currentNode,
        'scatter',
        rows,
        drillPath,
        metrics,
        dimensions,
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


    const data = formatForChart(
      currentNode,
      chartType,
      rows,
      drillPath,
      metrics,
      dimensions,
    );
    const xLabel = (currentColumn || '').replace(/_/g, ' ').toUpperCase();
    const yLabel = (metrics[0] || '').replace(/_/g, ' ').toUpperCase();

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

  const renderTable = () => {
    const data = formatForChart(
      currentNode,
      'bar',
      rows,
      drillPath,
      metrics,
      dimensions,
      null,
    );
    if (data.length === 0) return <div className='empty-state'>No data</div>;
    const cols = Object.keys(data[0]);
    return (
      <div
        className='table-view-container'
        style={{ overflow: 'auto', maxHeight: '100%' }}
      >
        <table className='premium-table'>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
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

  return (
    <div className='drill-container'>
      <div
        className='drill-toolbar'
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className='drill-engine-badge'>
          <Activity size={16} className='drill-engine-dot' />
          <span className='drill-engine-text'>
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Drill-Down
          </span>
          <div className='drill-engine-divider' />
          <span className='drill-engine-levels'>
            {dimensions.length} levels
          </span>
        </div>
        <select
          value={chartType}
          onChange={(e) =>
            setChartTypeAtDepth(drillPath.length, e.target.value)
          }
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
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <DrillDownBreadcrumb
        drillPath={drillPath}
        onNavigate={(depth) => drillBackTo(depth)}
        rowCount={currentRowCount}
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
