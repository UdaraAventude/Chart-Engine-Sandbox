export const PALETTE = [
  '#185FA5',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#9333ea',
  '#16a34a',
  '#ea580c',
  '#db2777',
];

export const SUNBURST_PALETTE = [
  '#185FA5',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
];

export const CHART_THEME = {
  titleStyle: {
    textStyle: {
      color: '#111827',
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'system-ui, sans-serif',
    },
    subtextStyle: { color: '#6b7280', fontSize: 12 },
  },
  tooltipBase: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: { color: '#111827', fontSize: 13 },
  },
  axisLabel: { color: '#374151', fontSize: 12 },
  axisLine: { lineStyle: { color: '#e5e7eb' } },
  splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
  axisNameStyle: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
};

export const numFormatter = (v) =>
  v >= 1_000_000
    ? (v / 1_000_000).toFixed(1) + 'M'
    : v >= 1_000
      ? (v / 1_000).toFixed(1) + 'k'
      : v;
