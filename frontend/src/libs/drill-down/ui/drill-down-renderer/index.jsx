import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { Activity } from "lucide-react";
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

// Import our new chart adapters
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

// Inline range parser — mirrors parseHistBinRange in engine/index.js
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
  // ── Store subscriptions ────────────────────────────────────────────────────
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

  // __hist__ steps are numeric range filters — they do NOT consume a categorical
  // dimension slot, so we count only non-hist steps for the dimension index.
  const categoricalDepth = drillPath.filter(
    (s) => !s.column.startsWith("__hist__"),
  ).length;
  const currentColumn = dimensions[categoricalDepth] ?? "";

  const availableDepth = dimensions.length - categoricalDepth;

  const chartType = chartTypeByDepth[drillPath.length] ?? "bar";
  const currentOption = DRILL_CHART_OPTIONS.find((o) => o.value === chartType);

  // Whether the current drillPath contains any histogram bin step
  const lastHistStep = useMemo(
    () =>
      [...drillPath].reverse().find((s) => s.column.startsWith("__hist__")) ??
      null,
    [drillPath],
  );

  // ── ALL hooks unconditionally at top ──────────────────────────────────────

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

    if (format === "png") exportToPNG(instance, `${filename}.png`);
    if (format === "svg") exportToSVG(instance, `${filename}.svg`);
    if (format === "pdf") await exportToPDF(instance, `${filename}.pdf`);
    if (format === "csv") exportToCSV(instance, `${filename}.csv`, dimLabel);
    if (format === "excel")
      await exportToExcel(instance, `${filename}.xlsx`, dimLabel);
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

  // When drillPath contains a __hist__ step, count the rows that satisfy
  // the full path (including the range filter) so the breadcrumb is accurate.
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

  // ── CONDITIONAL RETURNS — after ALL hooks ─────────────────────────────────

  if (!globalData || !tree) {
    return (
      <div className="empty-state">
        <Activity
          size={32}
          strokeWidth={1.5}
          style={{ marginBottom: "12px", opacity: 0.5 }}
        />
        <h3>No Data</h3>
        <p className="empty-subtext">Upload a CSV file to begin.</p>
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
          size={32}
          strokeWidth={1.5}
          style={{ marginBottom: "12px", opacity: 0.5 }}
        />
        <h3>No Hierarchy Detected</h3>
        {hasOnlyNumeric ? (
          <p className="empty-subtext">
            All columns appear to be numeric
            {metrics.length
              ? ` (${metrics.slice(0, 3).join(", ")}${metrics.length > 3 ? "…" : ""}).`
              : "."}{" "}
            Add a column with categorical values (e.g. country, category,
            status) to build a drill-down hierarchy.
          </p>
        ) : (
          <p className="empty-subtext">
            No suitable categorical columns found. Each dimension column needs
            2–500 unique values. Try removing ID columns or columns with
            free-text.
          </p>
        )}
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildTitle() {
    const base = "Data Explorer";
    if (drillPath.length === 0) return base;
    return base + " › " + drillPath.map((p) => p.value).join(" › ");
  }

  // ── Chart / Table renderer ────────────────────────────────────────────────

  const renderTable = () => {
    let data;
    if (atLeaf) {
      // At the absolute leaf, show raw filtered rows (limited to 500 for performance)
      data = filterRows(rows, drillPath).slice(0, 500);
    } else {
      // At categorical levels, show aggregated metrics per child
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
      return <div className="empty-state">No data</div>;
    const cols = Object.keys(data[0]).filter((c) => c !== "aggs");
    return (
      <div
        className="table-view-container"
        style={{ overflow: "auto", maxHeight: "100%" }}
      >
        <table className="premium-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c.toUpperCase()}</th>
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
          <Activity
            size={32}
            strokeWidth={1.5}
            style={{ marginBottom: "12px", opacity: 0.5 }}
          />
          <h3>Not Enough Data</h3>
          <p className="empty-subtext">
            Cannot drill down furthermore. Not enough hierarchy depth remaining
            to render a {currentOption.label} chart.
            <br />
            Please switch to a supported chart type (like Table or Scatter) from
            the dropdown above.
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

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="drill-container">
      <div
        className="drill-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="drill-engine-badge">
          <Activity size={16} className="drill-engine-dot" />
          <span className="drill-engine-text">
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Drill-Down
          </span>
          <div className="drill-engine-divider" />
          <span className="drill-engine-levels">
            {currentOption && !currentOption.canDrill
              ? "Read-Only View"
              : `Level ${Math.min(categoricalDepth + 1, dimensions.length)} of ${dimensions.length}`}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: "13px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
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
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: "13px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            {DRILL_CHART_OPTIONS.map((o) => {
              const isSupported = o.minRemainingDepth <= availableDepth;
              if (!isSupported && o.value !== chartType) return null;
              return (
                <option key={o.value} value={o.value} disabled={!isSupported}>
                  {o.label} {!isSupported ? "(Not enough data)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <DrillDownBreadcrumb
        drillPath={drillPath}
        onNavigate={(depth) => drillBackTo(depth)}
        rowCount={resolvedRowCount}
        totalRows={totalRows}
      />

      {/* Export Toolbar */}
      {chartType !== "table" && (
        <div className="export-toolbar">
          <span className="export-label">Export</span>

          <button
            className="export-btn"
            onClick={() => handleExport("png")}
            title="Download chart as PNG image"
          >
            PNG
          </button>

          <button
            className="export-btn"
            onClick={() => handleExport("svg")}
            title="Download chart as scalable SVG"
          >
            SVG
          </button>

          <button
            className="export-btn"
            onClick={() => handleExport("pdf")}
            title="Download chart as PDF document"
          >
            PDF
          </button>

          {/* Data exports — only meaningful for charts that have series data */}
          {chartType !== "scatter" && chartType !== "heatmap" && (
            <>
              <button
                className="export-btn"
                onClick={() => handleExport("csv")}
                title="Download chart data as CSV"
              >
                CSV
              </button>

              <button
                className="export-btn"
                onClick={() => handleExport("excel")}
                title="Download chart data as Excel"
              >
                Excel
              </button>
            </>
          )}
        </div>
      )}

      <div className="chart-container-wrapper" style={{ height: "480px" }}>
        {renderChart()}
        {drillPath.length > 0 && (
          <div className="floating-depth-badge">LEVEL {drillPath.length}</div>
        )}
      </div>
    </div>
  );
};

export default DrillDownRenderer;
