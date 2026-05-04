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
  '#da0d68', // Pink/Berry
  '#da1d23', // Red/Cherry
  '#ebb40f', // Yellow/Lemon
  '#187a2f', // Green/Lime
  '#0aa3b5', // Cyan/Aqua
  '#007fb1', // Blue/Ocean
  '#c94930', // Orange/Sunset
  '#7c3aed', // Purple/Grape
  '#059669', // Emerald
  '#d97706', // Amber
  '#db2777', // Rose
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
