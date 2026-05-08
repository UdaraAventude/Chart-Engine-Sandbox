import React, { useRef, useCallback, useEffect, useMemo } from "react";
import {
  Activity,
  Download,
  Layers,
  Maximize2,
  Share2,
  ChevronRight,
} from "lucide-react";
import "../../../../styles/DrillDown.css";
import useStore from "../../../../store";
import {
  getNodeAtPath,
  isLeaf,
  formatForChart,
  filterRows,
} from "../../hooks/engine";
import { DRILL_CHART_OPTIONS } from "../../constants/chartOptions";
import DrillDownBreadcrumb from "../drill-down-breadcrumb";
import { AGGREGATION_OPTIONS } from "../../hooks/engine/aggregation";
import {
  exportToPNG,
  exportToSVG,
  exportToPDF,
  exportToCSV,
  exportToExcel,
} from "../../../../services/export";

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

  const tree = globalData?.tree;
  const dimensions = globalData?.dimensions ?? [];
  const metrics = globalData?.metrics ?? [];
  const rows = globalData?.rows ?? [];

  const currentNode = getNodeAtPath(tree, drillPath);
  const atLeaf = isLeaf(currentNode);

  const categoricalDepth = drillPath.filter(
    (s) => !s.column.startsWith("__hist__"),
  ).length;
  const currentColumn = dimensions[categoricalDepth] ?? "";

  const availableDepth = dimensions.length - categoricalDepth;

  const chartType = chartTypeByDepth[drillPath.length] ?? "bar";
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

  const handleExport = async (format) => {
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
      if (!atLeaf && name && currentColumn) drillInto(name, currentColumn);
    },
    [atLeaf, currentColumn, drillInto],
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

  if (!globalData || !tree) {
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

  const rejected = globalData?.rejected ?? [];
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
    let data;
    let isRaw = false;
    if (atLeaf) {
      data = filterRows(rows, drillPath).slice(0, 500);
      isRaw = true;
    } else {
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
    }

    if (!data || data.length === 0)
      return (
        <div className="empty-state">No data available for this selection.</div>
      );

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

    if (currentOption && currentOption.minRemainingDepth > availableDepth) {
      return (
        <div className="empty-state">
          <Layers
            size={40}
            strokeWidth={1.5}
            color="var(--text-light)"
            style={{ marginBottom: "12px" }}
          />
          <h3>Maximum Hierarchy Depth Reached</h3>
          <p className="empty-subtext">
            This visualization cannot drill further.
            <strong> Switch to Table view</strong> above to explore raw record
            details.
          </p>
        </div>
      );
    }

    return (
      <ChartAdapter
        chartType={chartType}
        currentNode={currentNode}
        rows={rows}
        drillPath={drillPath}
        metrics={metrics}
        dimensions={dimensions}
        currentColumn={currentColumn}
        categoricalDepth={categoricalDepth}
        atLeaf={atLeaf}
        title={title}
        handleClick={currentOption?.canDrill ? handleClick : undefined}
        onChartReady={onChartReady}
        drillInto={drillInto}
        drillIntoMany={drillIntoMany}
        drillToPath={drillToPath}
        drillBackTo={drillBackTo}
        aggregation={aggregation}
        tree={tree}
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
        <div className="drill-engine-badge">
          <Activity size={16} className="drill-engine-dot" />
          <span className="drill-engine-text">
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Analytics
          </span>
          <div className="drill-engine-divider" />
          <span className="drill-engine-levels">
            Depth {categoricalDepth + 1}/{dimensions.length}
          </span>
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

      <div className="breadcrumb-container">
        <DrillDownBreadcrumb
          drillPath={drillPath}
          onNavigate={(depth) => drillBackTo(depth)}
          rowCount={resolvedRowCount}
          totalRows={totalRows}
        />
      </div>

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

          {chartType !== "scatter" && chartType !== "heatmap" && (
            <>
              <button
                className="export-btn"
                onClick={() => handleExport("csv")}
              >
                CSV
              </button>
              <button
                className="export-btn"
                onClick={() => handleExport("excel")}
              >
                XLSX
              </button>
            </>
          )}
        </div>
      )}

      <div className="chart-container-wrapper" style={{ height: "520px" }}>
        {renderChart()}
        {drillPath.length > 0 && (
          <div className="floating-depth-badge">
            EXPLORER LVL {drillPath.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrillDownRenderer;
