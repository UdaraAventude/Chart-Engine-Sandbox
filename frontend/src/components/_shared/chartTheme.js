export const PALETTE = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
];

export const SUNBURST_PALETTE = [
  "#4e79a7",
  "#a0cbe8",
  "#f28e2b",
  "#ffbe7d",
  "#59a14f",
  "#8cd17d",
  "#b6992d",
  "#f1ce63",
  "#499894",
  "#86bcb6",
  "#e15759",
  "#ff9d9a",
];

export const CHART_THEME = {
  color: [
    "#4e79a7",
    "#f28e2b",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc948",
    "#b07aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ac",
  ],
  backgroundColor: "transparent",
  textStyle: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#334155",
  },
  titleStyle: {
    textStyle: {
      color: "#1e293b",
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "'Inter', system-ui, sans-serif",
    },
    subtextStyle: {
      color: "#64748b",
      fontSize: 13,
      fontFamily: "'Inter', system-ui, sans-serif",
    },
  },
  tooltipBase: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 8,
    shadowBlur: 10,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    textStyle: { color: "#1e293b", fontSize: 13 },
    padding: [10, 15],
  },
  axisLabel: {
    color: "#64748b",
    fontSize: 11,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  axisLine: { lineStyle: { color: "#e2e8f0" } },
  splitLine: { lineStyle: { color: "#f1f5f9", type: "solid" } },
  axisNameStyle: {
    fontWeight: "600",
    color: "#94a3b8",
    fontSize: 11,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
};

export const numFormatter = (v) =>
  v >= 1_000_000
    ? (v / 1_000_000).toFixed(1) + "M"
    : v >= 1_000
      ? (v / 1_000).toFixed(1) + "k"
      : v;
