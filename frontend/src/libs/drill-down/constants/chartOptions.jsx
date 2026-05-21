import React from 'react';
import {
  BarChart3,
  PieChart,
  LineChart,
  ScatterChart,
  CircleDot,
  LayoutGrid,
  GitCommit,
  Sun,
  TrendingUp,
  BarChart2,
  Table2,
} from 'lucide-react';

/** @typedef {'excellent' | 'good' | 'limited' | 'none'} DrillSupportTier */

export const DRILL_SUPPORT_LEGEND = [
  {
    tier: 'excellent',
    label: 'Best for deep drill-down',
    hint: 'Click segments to walk every hierarchy level',
    color: '#059669',
  },
  {
    tier: 'good',
    label: 'Good drill-down',
    hint: 'Click to drill; works at most depth levels',
    color: '#2563eb',
  },
  {
    tier: 'limited',
    label: 'Needs 2+ levels below',
    hint: 'Use when enough dimensions remain under you',
    color: '#d97706',
  },
  {
    tier: 'none',
    label: 'No drill-down',
    hint: 'Snapshot / analysis only at current filter',
    color: '#64748b',
  },
];

export const DRILL_TIER_LABELS = {
  excellent: 'Deep drill',
  good: 'Drill',
  limited: '2+ levels',
  none: 'View only',
};

export const DRILL_CHART_OPTIONS = [
  {
    value: 'bar',
    label: 'Bar',
    icon: <BarChart3 size={16} />,
    color: '#4e79a7', // Tableau Blue
    desc: 'Aggregate dimensions into categorical bars.',
    detail: 'Best for hierarchical categorical data. Click a bar to drill into that group.',
    canDrill: true,
    minRemainingDepth: 1,
    drillSupport: 'excellent',
  },
  {
    value: 'pie',
    label: 'Pie',
    icon: <PieChart size={16} />,
    color: '#76b7b2', // Tableau Teal
    desc: 'Categorical share distribution.',
    detail: 'Shows proportional distribution of metrics. Click a slice to drill in.',
    canDrill: true,
    minRemainingDepth: 1,
    drillSupport: 'excellent',
  },
  {
    value: 'sunburst',
    label: 'Sunburst',
    icon: <Sun size={16} />,
    color: '#f28e2b', // Tableau Orange
    desc: 'Hierarchical radial partition.',
    detail: 'Click a segment to drill into deeper groups.',
    canDrill: true,
    minRemainingDepth: 1,
    drillSupport: 'excellent',
  },
  {
    value: 'line',
    label: 'Line',
    icon: <LineChart size={16} />,
    color: '#e15759', // Tableau Red
    desc: 'Trend across categories.',
    detail: 'Displays metric values as a trend line. Click a point to drill.',
    canDrill: true,
    minRemainingDepth: 1,
    drillSupport: 'excellent',
  },
  {
    value: 'scatter',
    label: 'Scatter',
    icon: <ScatterChart size={16} />,
    color: '#59a14f', // Tableau Green
    desc: 'Point clustering analysis.',
    detail: 'Plots raw rows using two numeric columns. Colour-coded by current group.',
    canDrill: false,
    minRemainingDepth: 1,
    drillSupport: 'none',
  },
  {
    value: 'bubble',
    label: 'Bubble',
    icon: <CircleDot size={16} />,
    color: '#b07aa1', // Tableau Purple
    desc: 'Multi-dimensional group analysis.',
    detail: 'X, Y, and Size each encode a different metric per group. Click a bubble to drill.',
    canDrill: true,
    minRemainingDepth: 1,
    drillSupport: 'good',
  },

  {
    value: 'heatmap',
    label: 'Heatmap',
    icon: <LayoutGrid size={16} />,
    color: '#bab0ac', // Tableau Grey
    desc: 'Cross-tab density map.',
    detail: 'Shows average metric across two dimension axes. Click a cell to drill on X axis.',
    canDrill: true,
    minRemainingDepth: 2,
    drillSupport: 'limited',
  },
  {
    value: 'correlation',
    label: 'Correlation',
    icon: <GitCommit size={16} />,
    color: '#475569', // Slate
    desc: 'Metric relationship matrix.',
    detail: 'Pearson correlation between all numeric columns. Read-only analytical view.',
    canDrill: false,
    minRemainingDepth: 1,
    drillSupport: 'none',
  },
  {
    value: 'multiline',
    label: 'Multi-Line',
    icon: <TrendingUp size={16} />,
    color: '#059669', // Emerald
    desc: 'Time-series by group.',
    detail: 'One line per group plotted over a time/sequence column. Click a series to drill.',
    canDrill: true,
    minRemainingDepth: 2,
    drillSupport: 'limited',
  },
  {
    value: 'histogram',
    label: 'Histogram',
    icon: <BarChart2 size={16} />,
    color: '#edc948', // Tableau Yellow
    desc: 'Frequency distribution.',
    detail: 'Distribution of a single numeric metric across equal-width bins. Click a bin to drill into the next dimension for rows within that range.',
    canDrill: true,
    minRemainingDepth: 1,
    drillSupport: 'good',
  },
  {
    value: 'table',
    label: 'Table',
    icon: <Table2 size={16} />,
    color: '#52525b', // Zinc
    desc: 'Raw data grid.',
    detail: 'Tabular view of aggregated data at the current drill level.',
    canDrill: false,
    minRemainingDepth: 0,
    drillSupport: 'none',
  },
];

export function getChartsByDrillSupport() {
  const excellent = DRILL_CHART_OPTIONS.filter((o) => o.drillSupport === 'excellent');
  const good = DRILL_CHART_OPTIONS.filter((o) => o.drillSupport === 'good');
  const limited = DRILL_CHART_OPTIONS.filter((o) => o.drillSupport === 'limited');
  const none = DRILL_CHART_OPTIONS.filter((o) => o.drillSupport === 'none');
  return { excellent, good, limited, none };
}

