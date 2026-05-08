/**
 * Global application constants.
 * Chart type string values here must match exactly what the store
 * (chartTypeByDepth) and the drill-down renderer use.
 */

export const CHART_TYPES = {
  BAR: "bar",
  PIE: "pie",
  LINE: "line",
  SCATTER: "scatter",
  BUBBLE: "bubble",
  HEATMAP: "heatmap",
  CORRELATION: "correlation",
  MULTILINE: "multiline",
  HISTOGRAM: "histogram",
  TABLE: "table",
};

export const DEFAULT_CHART_TYPE = CHART_TYPES.BAR;

export const CHART_TOP_N = 50;

export const AGG_METHODS = ["sum", "avg", "count", "min", "max"];

export const CHART_LIBRARIES = {
  ECHARTS: "echarts",
};

export const BUILDER_CHART_TYPES = {
  BAR: CHART_TYPES.BAR,
  LINE: CHART_TYPES.LINE,
  SCATTER: CHART_TYPES.SCATTER,
  PIE: CHART_TYPES.PIE,
  HEATMAP: CHART_TYPES.HEATMAP,
};
