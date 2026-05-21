/**
 * Unified chart theme — cool indigo palette, modern ECharts styling.
 * All chart components import from here to stay visually consistent.
 */

/* ── Multi-series palette (10 distinct cool-to-warm hues) ── */
export const PALETTE = [
  "#5b5bd6", // Indigo (app primary)
  "#0ea5e9", // Sky blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red-rose
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#ec4899", // Pink
];

/* ── Sunburst palette — primaries + softer siblings ───────── */
export const SUNBURST_PALETTE = [
  "#5b5bd6", // Indigo
  "#818cf8", // Indigo-light
  "#0ea5e9", // Sky
  "#7dd3fc", // Sky-light
  "#10b981", // Emerald
  "#6ee7b7", // Emerald-light
  "#f59e0b", // Amber
  "#fcd34d", // Amber-light
  "#ef4444", // Red
  "#fca5a5", // Red-light
  "#8b5cf6", // Violet
  "#c4b5fd", // Violet-light
];

/* ── Shared helpers ───────────────────────────────────────── */
const FONT = "'Inter', system-ui, -apple-system, sans-serif";

export const CHART_THEME = {
  color: PALETTE,
  backgroundColor: "transparent",

  textStyle: {
    fontFamily: FONT,
    color: "#374151",
  },

  titleStyle: {
    textStyle: {
      color: "#111827",
      fontSize: 15,
      fontWeight: "700",
      fontFamily: FONT,
    },
    subtextStyle: {
      color: "#6b7280",
      fontSize: 12,
      fontFamily: FONT,
    },
  },

  tooltipBase: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 10,
    shadowBlur: 16,
    shadowColor: "rgba(0,0,0,0.10)",
    shadowOffsetX: 0,
    shadowOffsetY: 6,
    textStyle: { color: "#111827", fontSize: 12.5, fontFamily: FONT },
    padding: [10, 14],
    extraCssText: "backdrop-filter:blur(4px);",
  },

  axisLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontFamily: FONT,
  },

  axisLine: {
    lineStyle: { color: "rgba(0,0,0,0.08)" },
  },

  splitLine: {
    lineStyle: { color: "rgba(0,0,0,0.04)", type: "dashed" },
  },

  axisNameStyle: {
    fontWeight: "600",
    color: "#9ca3af",
    fontSize: 10.5,
    fontFamily: FONT,
  },

  /* shared dataZoom slider style */
  dataZoomSlider: {
    type: "slider",
    bottom: 5,
    height: 18,
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    fillerColor: "rgba(91,91,214,0.12)",
    handleStyle: { color: "#5b5bd6", borderColor: "#5b5bd6" },
    moveHandleStyle: { color: "#5b5bd6" },
    textStyle: { color: "#9ca3af", fontSize: 10 },
    dataBackground: { lineStyle: { color: "#d1d5db" }, areaStyle: { color: "#f3f4f6" } },
    selectedDataBackground: { lineStyle: { color: "#818cf8" }, areaStyle: { color: "rgba(91,91,214,0.08)" } },
  },
};

/* ── Tooltip HTML helpers ─────────────────────────────────── */
const P = "#5b5bd6";   // primary value accent
const G = "#10b981";   // drill hint / emerald
const V = "#8b5cf6";   // secondary (records)

export const tooltipRow = (label, val, accent = P) =>
  `<div style="color:#374151">${label}: <span style="color:${accent};font-weight:700">${val}</span></div>`;

export const tooltipTitle = (name) =>
  `<div style="font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;padding-bottom:5px;margin-bottom:5px;">${name}</div>`;

export const tooltipDrillHint = () =>
  `<div style="margin-top:6px;color:${G};font-size:11px;">▲ Click to drill into this group</div>`;

export const buildTooltip = ({ name, aggLabel, value, count, isLeaf }) => `
  ${tooltipTitle(name)}
  ${tooltipRow(aggLabel, value.toLocaleString())}
  ${tooltipRow("Records", count, V)}
  ${!isLeaf ? tooltipDrillHint() : ""}
`;

/* ── Number formatter ─────────────────────────────────────── */
export const numFormatter = (v) =>
  v >= 1_000_000
    ? (v / 1_000_000).toFixed(1) + "M"
    : v >= 1_000
      ? (v / 1_000).toFixed(1) + "k"
      : v;
