/**
 * DRILL_CHART_OPTIONS — single source of truth for all chart type metadata
 * used across:
 *   - ChartToolbar       (pill buttons)
 *   - DrillDownRenderer  (inner <select> dropdown)
 *   - DrillDownSelector  (rich type-grid panel)
 *
 * `canDrill` — whether clicking elements in this chart type triggers drillInto().
 *              Set to false for read-only / analytical views.
 */

import React from 'react';
import {
  BarChart3,
  PieChart,
  LineChart,
  ScatterChart,
  CircleDot,
  LayoutGrid,
  GitCommit,
  TrendingUp,
  BarChart2,
  Table2,
} from 'lucide-react';

export const DRILL_CHART_OPTIONS = [
  {
    value: 'bar',
    label: 'Bar',
    icon: <BarChart3 size={16} />,
    desc: 'Aggregate dimensions into categorical bars.',
    detail: 'Best for hierarchical categorical data. Click a bar to drill into that group.',
    canDrill: true,
    minRemainingDepth: 1,
  },
  {
    value: 'pie',
    label: 'Pie',
    icon: <PieChart size={16} />,
    desc: 'Categorical share distribution.',
    detail: 'Shows proportional distribution of metrics. Click a slice to drill in.',
    canDrill: true,
    minRemainingDepth: 1,
  },
  {
    value: 'line',
    label: 'Line',
    icon: <LineChart size={16} />,
    desc: 'Trend across categories.',
    detail: 'Displays metric values as a trend line. Click a point to drill.',
    canDrill: true,
    minRemainingDepth: 1,
  },
  {
    value: 'scatter',
    label: 'Scatter',
    icon: <ScatterChart size={16} />,
    desc: 'Point clustering analysis.',
    detail: 'Plots raw rows using two numeric columns. Colour-coded by current group.',
    canDrill: false,
    minRemainingDepth: 1,
  },
  {
    value: 'bubble',
    label: 'Bubble',
    icon: <CircleDot size={16} />,
    desc: 'Multi-dimensional group analysis.',
    detail: 'X, Y, and Size each encode a different metric per group. Click a bubble to drill.',
    canDrill: true,
    minRemainingDepth: 1,
  },
  {
    value: 'heatmap',
    label: 'Heatmap',
    icon: <LayoutGrid size={16} />,
    desc: 'Cross-tab density map.',
    detail: 'Shows average metric across two dimension axes. Click a cell to drill on X axis.',
    canDrill: true,
    minRemainingDepth: 2,
  },
  {
    value: 'correlation',
    label: 'Correlation',
    icon: <GitCommit size={16} />,
    desc: 'Metric relationship matrix.',
    detail: 'Pearson correlation between all numeric columns. Read-only analytical view.',
    canDrill: false,
    minRemainingDepth: 1,
  },
  {
    value: 'multiline',
    label: 'Multi-Line',
    icon: <TrendingUp size={16} />,
    desc: 'Time-series by group.',
    detail: 'One line per group plotted over a time/sequence column. Click a series to drill.',
    canDrill: true,
    minRemainingDepth: 2,
  },
  {
    value: 'histogram',
    label: 'Histogram',
    icon: <BarChart2 size={16} />,
    desc: 'Frequency distribution.',
    detail: 'Distribution of a single numeric metric across equal-width bins. Click a bin to drill into the next dimension for rows within that range.',
    canDrill: true,
    minRemainingDepth: 1,
  },
  {
    value: 'table',
    label: 'Table',
    icon: <Table2 size={16} />,
    desc: 'Raw data grid.',
    detail: 'Tabular view of aggregated data at the current drill level.',
    canDrill: false,
    minRemainingDepth: 0,
  },
];
