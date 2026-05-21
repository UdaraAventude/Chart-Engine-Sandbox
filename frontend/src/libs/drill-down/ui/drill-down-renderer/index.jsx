import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Download,
  Layers,
  Maximize2,
} from "lucide-react";
import "../../../../styles/DrillDown.css";
import useStore from "../../../../store";
import {
  getNodeAtPath,
  isLeaf,
  formatForChart,
  filterRows,
} from "../../hooks/engine";
import { useServerVisualization } from "../../hooks/useServerVisualization";
import { useRowSampleRows } from "../../hooks/useRowSampleRows";
import { DRILL_CHART_OPTIONS } from "../../constants/chartOptions";
import DrillDownBreadcrumb from "../drill-down-breadcrumb";
import DrillHierarchyStrip from "../drill-hierarchy-strip";
import DrillPathModal from "../drill-path-modal";
import {
  ChartLoadingState,
  ChartErrorState,
  ChartEmptyState,
  hasNormalizedChartData,
} from "../chart-panel-state";
import {
  getDepthContext,
  formatColumnLabel,
  trimDrillPathToTreeDepth,
} from "../../utils/drillDepth";
import { AGGREGATION_OPTIONS } from "../../hooks/engine/aggregation";
import {
  exportToPNG,
  exportToSVG,
  exportToPDF,
  exportToCSV,
  exportToExcel,
} from "../../../../services/export";
import { runServerExport } from "../../../../services/export/serverExport";

import {
  HistogramAdapter,
  HeatmapAdapter,
  MultilineAdapter,
  BubbleAdapter,
  ScatterAdapter,
  StandardAdapter,
  CorrelationAdapter,
  SunburstAdapter,
} from "../chart-adapters";

const CHART_ADAPTERS = {
  histogram: HistogramAdapter,
  heatmap: HeatmapAdapter,
  multiline: MultilineAdapter,
  bubble: BubbleAdapter,
  scatter: ScatterAdapter,
  correlation: CorrelationAdapter,
  bar: StandardAdapter,
  line: StandardAdapter,
  pie: StandardAdapter,
  sunburst: SunburstAdapter,
};

function parseHistBinRange(label) {
  const parseVal = (s) => {
    const str = s.trim();
    if (str.endsWith("M")) return parseFloat(str) * 1_000_000;
    if (str.endsWith("k")) return parseFloat(str) * 1_000;
    return parseFloat(str);
  };
  const parts = label.split(" – ");
  if (parts.length !== 2) return null;
  return { lo: parseVal(parts[0]), hi: parseVal(parts[1]) };
}

const DrillDownRenderer = ({ onRenderTime }) => {
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const metadata = useStore((s) => s.metadata);
  const serverChartData = useStore((s) => s.serverChartData);
  const chartLoading = useStore((s) => s.chartLoading);
  const chartError = useStore((s) => s.chartError);
  const globalData = useStore((s) => s.globalData);
  const totalRows = useStore((s) => s.totalRows);
  const drillPath = useStore((s) => s.drillPath);
  const chartTypeByDepth = useStore((s) => s.chartTypeByDepth);
  const drillInto = useStore((s) => s.drillInto);
  const drillIntoMany = useStore((s) => s.drillIntoMany);
  const drillToPath = useStore((s) => s.drillToPath);
  const drillBackTo = useStore((s) => s.drillBackTo);
  const setChartTypeAtDepth = useStore((s) => s.setChartTypeAtDepth);
  const setRenderTime = useStore((s) => s.setRenderTime);
  const aggregation = useStore((s) => s.aggregation);
  const setAggregation = useStore((s) => s.setAggregation);

  const t0 = useRef(0);
  const echartsRef = useRef(null);
  const [pathModalOpen, setPathModalOpen] = useState(false);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);

  useServerVisualization(chartRefreshKey);

  const tree = globalData?.tree;
  const dimensions = metadata?.dimensions ?? globalData?.dimensions ?? [];
  const metrics = metadata?.metrics ?? globalData?.metrics ?? [];
  const rows = globalData?.rows ?? [];

  const currentNode = tree ? getNodeAtPath(tree, drillPath) : null;
  const maxHierarchyDepth = metadata?.maxHierarchyDepth ?? 0;
  const depthCtx = getDepthContext(drillPath, dimensions, {
    maxHierarchyDepth,
    totalRows: metadata?.totalRows ?? totalRows ?? 0,
  });
  const {
    categoricalDepth,
    displayLevel,
    maxDepth,
    drillableDimensions,
    currentDimension,
    nextDimension,
    atMaxDepth,
    atTreeLeaf,
    canDrillFurther,
    progressPct,
    segmentLabel,
    segmentColumn,
    breakdownDimension,
  } = depthCtx;

  const meta = serverChartData?.meta;
  const canDrillDown = activeDatasetId
    ? canDrillFurther &&
      (meta?.canDrillDown ?? (meta?.nodesCount ?? 0) > 0)
    : !isLeaf(currentNode);

  const atLeaf = activeDatasetId ? atMaxDepth : isLeaf(currentNode);

  const chartType = chartTypeByDepth[drillPath.length] ?? "bar";
  const tableWantsRawRows = Boolean(activeDatasetId) && atMaxDepth;
  const {
    rows: tableSampleRows,
    loading: tableRowsLoading,
    error: tableRowsError,
  } = useRowSampleRows(drillPath, chartType === "table" && tableWantsRawRows);

  const breakdownColumn =
    depthCtx.breakdownDimension || meta?.groupedBy || "";

  useEffect(() => {
    if (!activeDatasetId || !maxHierarchyDepth) return;
    const trimmed = trimDrillPathToTreeDepth(
      drillPath,
      maxHierarchyDepth,
      dimensions,
      metadata?.totalRows ?? totalRows ?? 0,
    );
    if (trimmed.length !== drillPath.length) {
      drillToPath(trimmed);
    }
  }, [activeDatasetId, maxHierarchyDepth, metadata?.datasetId, dimensions, drillPath, drillToPath]);

  const currentColumn = breakdownColumn || segmentColumn || "";

  const availableDepth = maxDepth - categoricalDepth;

  const currentOption = DRILL_CHART_OPTIONS.find((o) => o.value === chartType);

  const lastHistStep = useMemo(
    () =>
      [...drillPath].reverse().find((s) => s.column.startsWith("__hist__")) ??
      null,
    [drillPath],
  );

  const onChartReady = useCallback(
    (instance) => {
      if (instance) echartsRef.current = instance;
      const elapsed = performance.now() - t0.current;
      onRenderTime?.(elapsed.toFixed(1));
      setRenderTime?.(elapsed.toFixed(1));
    },
    [onRenderTime, setRenderTime],
  );

  const handleServerDataExport = async (format) => {
    if (!activeDatasetId) return;
    try {
      await runServerExport(activeDatasetId, format, drillPath);
    } catch (err) {
      console.error("[DrillDown] Server export failed:", err);
      useStore.getState().setError(err?.message || "Server export failed");
    }
  };

  const handleExport = async (format) => {
    if (format === "server-csv") {
      await handleServerDataExport("CSV");
      return;
    }
    if (format === "server-excel") {
      await handleServerDataExport("Excel");
      return;
    }

    if (!echartsRef.current) {
      console.warn("[DrillDown] Export called before chart was ready.");
      return;
    }

    const instance = echartsRef.current;
    const pathLabel =
      drillPath.length > 0
        ? drillPath.map((d) => d.value).join("_")
        : "overview";

    const filename = `chart_${pathLabel}`;
    const dimLabel =
      (currentColumn || "").replace(/_/g, " ").toUpperCase() || "Name";

    const drillContext =
      drillPath.length > 0
        ? drillPath.map((d) => d.value).join(" > ")
        : "Overview";
    const headerText = `Chart Export: ${drillContext} | Aggregation: ${aggregation.toUpperCase()}`;

    if (format === "png") exportToPNG(instance, `${filename}.png`);
    if (format === "svg") exportToSVG(instance, `${filename}.svg`);
    if (format === "pdf")
      await exportToPDF(instance, `${filename}.pdf`, headerText);
    if (format === "csv")
      exportToCSV(instance, `${filename}.csv`, dimLabel, headerText);
    if (format === "excel")
      await exportToExcel(instance, `${filename}.xlsx`, dimLabel, headerText);
  };

  const handleClick = useCallback(
    (name) => {
      const column =
        depthCtx.breakdownDimension ||
        drillableDimensions[categoricalDepth] ||
        meta?.groupedBy;
      if (canDrillDown && name && column) drillInto(name, column);
    },
    [canDrillDown, categoricalDepth, depthCtx.breakdownDimension, drillableDimensions, meta, drillInto],
  );

  useEffect(() => {
    t0.current = performance.now();
  });

  // Count rows satisfying the full path for accurate breadcrumb row count
  const histDrilledRowCount = useMemo(() => {
    if (!lastHistStep || !rows.length) return null;
    return rows.filter((row) =>
      drillPath.every((step) => {
        if (step.column.startsWith("__hist__")) {
          const col = step.column.slice("__hist__".length);
          const range = parseHistBinRange(step.value);
          if (!range) return true;
          const v = Number(row[col]);
          return !isNaN(v) && v >= range.lo && v < range.hi;
        }
        return String(row[step.column] ?? "").trim() === step.value;
      }),
    ).length;
  }, [lastHistStep, rows, drillPath]);

  const treeRowCount = currentNode?.count ?? totalRows;
  const resolvedRowCount = histDrilledRowCount ?? treeRowCount;

  if (!activeDatasetId && (!globalData || !tree)) {
    return (
      <div className="empty-state">
        <Layers
          size={48}
          strokeWidth={1.2}
          color="var(--text-light)"
          style={{ marginBottom: "20px" }}
        />
        <h3>No Workspace Loaded</h3>
        <p className="empty-subtext">
          Select a CSV file to generate your interactive analytics dashboard.
        </p>
      </div>
    );
  }

  const rejected = metadata?.rejected ?? globalData?.rejected ?? [];
  const hasOnlyNumeric =
    metrics.length > 0 && rejected.every((r) => r.reason !== "too_few_unique");

  if (!dimensions.length) {
    return (
      <div className="empty-state">
        <Activity
          size={48}
          strokeWidth={1.2}
          color="var(--text-light)"
          style={{ marginBottom: "20px" }}
        />
        <h3>No Hierarchy Detected</h3>
        {hasOnlyNumeric ? (
          <p className="empty-subtext">
            All columns appear to be numeric. Add a categorical column to enable
            drill-down features.
          </p>
        ) : (
          <p className="empty-subtext">
            No suitable categorical columns found for hierarchy construction.
          </p>
        )}
      </div>
    );
  }

  function buildTitle() {
    const base = "Data Explorer";
    if (drillPath.length === 0) return base;
    return base + " › " + drillPath.map((p) => p.value).join(" › ");
  }

  const renderTable = () => {
    const serverAgg =
      activeDatasetId &&
      !tableWantsRawRows &&
      serverChartData?.normalized?.length;

    if (tableRowsLoading || (activeDatasetId && !tableWantsRawRows && chartLoading)) {
      return <ChartLoadingState />;
    }

    if (tableRowsError) {
      return (
        <ChartErrorState
          message={tableRowsError}
          onRetry={() => setChartRefreshKey((k) => k + 1)}
        />
      );
    }

    if (activeDatasetId && !tableWantsRawRows && chartError) {
      return (
        <ChartErrorState
          message={chartError}
          onRetry={() => setChartRefreshKey((k) => k + 1)}
        />
      );
    }

    let data;
    let isRaw = false;

    if (tableWantsRawRows && tableSampleRows.length) {
      data = filterRows(tableSampleRows, drillPath).slice(0, 500);
      isRaw = true;
    } else if (atLeaf && rows.length) {
      data = filterRows(rows, drillPath).slice(0, 500);
      isRaw = true;
    } else if (serverAgg) {
      data = serverChartData.normalized.map((d) => ({
        name: d.name,
        value: d.value,
        count: d.count,
      }));
    } else if (currentNode) {
      data = formatForChart(
        currentNode,
        "bar",
        rows,
        drillPath,
        metrics,
        dimensions,
        null,
        aggregation,
      );
    } else {
      data = [];
    }

    if (!data || data.length === 0) {
      return (
        <div className="empty-state">No data available for this selection.</div>
      );
    }

    const cols = Object.keys(data[0]).filter((c) => c !== "aggs");

    return (
      <div className="table-view-container">
        <div className="table-header-info">
          <span className="table-mode-badge">
            {isRaw ? "RAW RECORDS" : "AGGREGATED INSIGHTS"}
          </span>
          <span className="table-row-count">
            Showing {data.length.toLocaleString()}{" "}
            {isRaw ? "total records" : "groups"}
          </span>
        </div>
        <div className="table-scroll-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c}>{c.replace(/_/g, " ").toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c}>
                      {typeof row[c] === "number"
                        ? row[c].toLocaleString()
                        : String(row[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    t0.current = performance.now();
    const title = buildTitle();

    if (chartType === "table") return renderTable();

    const ChartAdapter = CHART_ADAPTERS[chartType];
    if (!ChartAdapter) {
      return (
        <div className="empty-state">Unsupported chart type: {chartType}</div>
      );
    }

    const needsMoreLevelsBelow =
      !atTreeLeaf &&
      currentOption &&
      currentOption.minRemainingDepth > availableDepth;

    if (needsMoreLevelsBelow) {
      return (
        <div className="empty-state">
          <Layers
            size={40}
            strokeWidth={1.5}
            color="var(--text-light)"
            style={{ marginBottom: "12px" }}
          />
          <h3>Not enough levels below</h3>
          <p className="empty-subtext">
            {currentOption.label} needs at least {currentOption.minRemainingDepth}{' '}
            more hierarchy level
            {currentOption.minRemainingDepth !== 1 ? 's' : ''} under your current
            position. Go up or pick another chart type.
            {atTreeLeaf ? '' : ' At the deepest drill step, use Bar or Table for this segment.'}
          </p>
        </div>
      );
    }

    const usesRowSample =
      chartType === "sunburst" ||
      chartType === "scatter" ||
      chartType === "correlation" ||
      chartType === "histogram";

    if (!usesRowSample && chartLoading) {
      return <ChartLoadingState />;
    }

    if (!usesRowSample && chartError) {
      return (
        <ChartErrorState
          message={chartError}
          onRetry={() => setChartRefreshKey((k) => k + 1)}
        />
      );
    }

    if (
      !usesRowSample &&
      activeDatasetId &&
      !hasNormalizedChartData(chartType, serverChartData?.normalized)
    ) {
      return (
        <ChartEmptyState
          title="No data at this level"
          hint={
            atTreeLeaf
              ? "You reached the deepest drill level for this dataset. The chart shows this segment's aggregate, or go up to explore siblings."
              : `Try a different aggregation or go up. Next breakdown: ${nextDimension ? formatColumnLabel(nextDimension) : 'n/a'}.`
          }
          canDrill={canDrillFurther && currentOption?.canDrill}
        />
      );
    }

    return (
      <ChartAdapter
        chartType={chartType}
        currentNode={currentNode}
        rows={rows}
        drillPath={drillPath}
        metrics={metrics}
        dimensions={depthCtx.drillableDimensions}
        currentColumn={currentColumn}
        categoricalDepth={categoricalDepth}
        atLeaf={atLeaf}
        title={title}
        handleClick={
          currentOption?.canDrill && canDrillDown ? handleClick : undefined
        }
        canDrillDown={canDrillDown}
        serverMode={
          Boolean(activeDatasetId) &&
          chartType !== "sunburst" &&
          !usesRowSample
        }
        onChartReady={onChartReady}
        drillInto={drillInto}
        drillIntoMany={drillIntoMany}
        drillToPath={drillToPath}
        drillBackTo={drillBackTo}
        aggregation={aggregation}
        tree={tree}
        serverNormalized={
          usesRowSample ? null : serverChartData?.normalized
        }
      />
    );
  };

  const containerRef = useRef(null);

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="drill-container" ref={containerRef}>
      <div className="drill-toolbar">
        <div className="drill-toolbar-left">
          <div className="drill-engine-badge">
            <Activity size={16} className="drill-engine-dot" />
            <span className="drill-engine-text">
              {chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart
            </span>
          </div>
          <div className="drill-depth-meter" aria-label={`Hierarchy level ${displayLevel} of ${maxDepth}`}>
            <div className="drill-depth-meter-labels">
              <span>Level {displayLevel} of {maxDepth || '—'}</span>
              {atTreeLeaf && segmentLabel ? (
                <span className="drill-depth-meter-dim">
                  Segment: {segmentLabel}
                  {segmentColumn ? ` (${formatColumnLabel(segmentColumn)})` : ''}
                </span>
              ) : breakdownColumn ? (
                <span className="drill-depth-meter-dim">
                  Breakdown: {formatColumnLabel(breakdownColumn)}
                </span>
              ) : null}
            </div>
            <div className="drill-depth-meter-track">
              <div
                className="drill-depth-meter-fill"
                style={{ width: `${Math.max(progressPct, displayLevel > 0 ? 8 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="drill-controls">
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
            className="premium-select"
          >
            {AGGREGATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.symbol} {o.label}
              </option>
            ))}
          </select>

          <select
            value={chartType}
            onChange={(e) =>
              setChartTypeAtDepth(drillPath.length, e.target.value)
            }
            className="premium-select"
          >
            {DRILL_CHART_OPTIONS.map((o) => {
              const isSupported = o.minRemainingDepth <= availableDepth;
              if (!isSupported && o.value !== chartType) return null;
              return (
                <option key={o.value} value={o.value} disabled={!isSupported}>
                  {o.label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <DrillHierarchyStrip
        drillableDimensions={depthCtx.drillableDimensions}
        drillPath={drillPath}
        onJumpToDepth={(depth) => drillBackTo(depth)}
      />

      {canDrillDown && breakdownDimension && !atTreeLeaf && (
        <p className="drill-select-hint" role="status">
          {chartType === "sunburst" ? (
            <>
              Click an arc to drill into{" "}
              <strong>{formatColumnLabel(breakdownDimension)}</strong>
              {categoricalDepth + 1 >= maxDepth
                ? " (last drill step)."
                : "."}
            </>
          ) : chartType === "pie" ? (
            <>
              Click a slice to drill into{" "}
              <strong>{formatColumnLabel(breakdownDimension)}</strong>
              {categoricalDepth + 1 >= maxDepth ? " (last drill step)." : "."}
            </>
          ) : chartType === "line" ? (
            <>
              Click a point to drill into{" "}
              <strong>{formatColumnLabel(breakdownDimension)}</strong>
              {categoricalDepth + 1 >= maxDepth ? " (last drill step)." : "."}
            </>
          ) : chartType === "scatter" ? (
            <>
              Plots up to 5,000 rows: X = <strong>{metrics[0]}</strong>, Y ={" "}
              <strong>{metrics[1] ?? metrics[0]}</strong>
              {currentColumn
                ? `, coloured by ${formatColumnLabel(currentColumn)}`
                : ""}
              . View only — use Bar or Line to drill.
            </>
          ) : chartType === "correlation" ? (
            <>
              Pearson correlation between numeric metrics (up to 5,000 rows at this
              drill level). View only — use Bar or Line to drill down.
            </>
          ) : chartType === "histogram" ? (
            <>
              Distribution of <strong>{metrics[0]}</strong> (up to 5,000 rows).
              Click a bar to filter by that value range, then use Bar or Pie to
              drill the hierarchy.
            </>
          ) : (
            <>
              Click a bar to select{" "}
              <strong>{formatColumnLabel(breakdownDimension)}</strong>
              {categoricalDepth + 1 >= maxDepth
                ? " (last drill step — then one bar for that group)."
                : "."}
            </>
          )}
        </p>
      )}

      <DrillDownBreadcrumb
        drillPath={drillPath}
        onNavigate={(depth) => drillBackTo(depth)}
        rowCount={resolvedRowCount}
        totalRows={totalRows}
        onOpenPathModal={() => setPathModalOpen(true)}
      />

      <DrillPathModal
        open={pathModalOpen}
        onClose={() => setPathModalOpen(false)}
        drillPath={drillPath}
        dimensions={depthCtx.drillableDimensions}
        totalRows={totalRows}
        rowCount={resolvedRowCount}
        onNavigate={(depth) => drillBackTo(depth)}
        onGoUp={() => drillBackTo(Math.max(0, drillPath.length - 1))}
      />

      {chartType !== "table" && (
        <div className="export-toolbar">
          <div style={{ marginRight: "auto", display: "flex", gap: "8px" }}>
            <button
              className="export-btn"
              title="View in Fullscreen"
              onClick={handleFullscreen}
            >
              <Maximize2 size={12} />
            </button>
          </div>
          <span className="export-label">
            <Download size={10} style={{ marginRight: "4px" }} /> Export
          </span>

          <button className="export-btn" onClick={() => handleExport("png")}>
            PNG
          </button>
          <button className="export-btn" onClick={() => handleExport("svg")}>
            SVG
          </button>
          <button className="export-btn" onClick={() => handleExport("pdf")}>
            PDF
          </button>

          {activeDatasetId && (
            <>
              <button
                className="export-btn"
                onClick={() => handleExport("server-csv")}
                title="Export filtered data via server"
              >
                Data CSV
              </button>
              <button
                className="export-btn"
                onClick={() => handleExport("server-excel")}
                title="Export filtered data via server"
              >
                Data XLSX
              </button>
            </>
          )}

          {chartType !== "scatter" && chartType !== "heatmap" && (
            <>
              <button
                className="export-btn"
                onClick={() => handleExport("csv")}
              >
                Chart CSV
              </button>
              <button
                className="export-btn"
                onClick={() => handleExport("excel")}
              >
                Chart XLSX
              </button>
            </>
          )}
        </div>
      )}

      <div className="chart-container-wrapper">
        {renderChart()}
      </div>
    </div>
  );
};

export default DrillDownRenderer;
