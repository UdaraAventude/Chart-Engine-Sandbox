/**
 * Global application constants.
 * Chart type string values here must match exactly what the store
 * (chartTypeByDepth) and the drill-down renderer use.
 */

// All supported chart types in the drill-down engine
export const CHART_TYPES = {
  BAR:         'bar',
  PIE:         'pie',
  LINE:        'line',
  SCATTER:     'scatter',
  BUBBLE:      'bubble',
  HEATMAP:     'heatmap',
  CORRELATION: 'correlation',
  MULTILINE:   'multiline',
  HISTOGRAM:   'histogram',
  TABLE:       'table',
};

// Default chart type when none is set at a given depth
export const DEFAULT_CHART_TYPE = CHART_TYPES.BAR;

// Maximum rows to show per chart level (engine top-N cap)
export const CHART_TOP_N = 50;

// Aggregation method options
export const AGG_METHODS = ['sum', 'avg', 'count', 'min', 'max'];

// Supported chart libraries
export const CHART_LIBRARIES = {
  ECHARTS: 'echarts',
};

// Chart builder supported types (subset used in the builder page)
export const BUILDER_CHART_TYPES = {
  BAR:     CHART_TYPES.BAR,
  LINE:    CHART_TYPES.LINE,
  SCATTER: CHART_TYPES.SCATTER,
  PIE:     CHART_TYPES.PIE,
  HEATMAP: CHART_TYPES.HEATMAP,
};
