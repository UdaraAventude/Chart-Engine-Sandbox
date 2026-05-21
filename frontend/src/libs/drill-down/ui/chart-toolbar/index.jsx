import React from 'react';
import { Info } from 'lucide-react';
import {
  DRILL_CHART_OPTIONS,
  DRILL_SUPPORT_LEGEND,
  DRILL_TIER_LABELS,
} from '../../constants/chartOptions';
import './ChartToolbar.css';

/* Color for each chart type icon circle */
const CHART_ICON_COLORS = {
  bar:         { bg: '#ede9fe', color: '#7c3aed' },
  pie:         { bg: '#fce7f3', color: '#be185d' },
  sunburst:    { bg: '#fff7ed', color: '#c2410c' },
  line:        { bg: '#ecfdf5', color: '#047857' },
  scatter:     { bg: '#eff6ff', color: '#1d4ed8' },
  bubble:      { bg: '#fdf4ff', color: '#9333ea' },
  heatmap:     { bg: '#fff1f2', color: '#be123c' },
  correlation: { bg: '#f0fdf4', color: '#15803d' },
  multiline:   { bg: '#ecfeff', color: '#0e7490' },
  histogram:   { bg: '#fefce8', color: '#a16207' },
  table:       { bg: '#f8fafc', color: '#475569' },
};

const ChartToolbar = ({ activeChartType, onSelect }) => {
  return (
    <div className="chart-toolbar-panel">
      {/* Legend strip */}
      <div className="chart-toolbar-legend-bar">
        <span className="chart-toolbar-legend-label">Visualization type</span>
        <div className="chart-toolbar-legend-items">
          {DRILL_SUPPORT_LEGEND.map((item) => (
            <span key={item.tier} className="chart-legend-chip">
              <span className="chart-legend-dot" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart type card grid */}
      <div className="chart-type-grid">
        {DRILL_CHART_OPTIONS.map((opt) => {
          const isActive = activeChartType === opt.value;
          const tier = opt.drillSupport || 'none';
          const tierLabel = DRILL_TIER_LABELS[tier];
          const legend = DRILL_SUPPORT_LEGEND.find((l) => l.tier === tier);
          const iconStyle = CHART_ICON_COLORS[opt.value] ?? { bg: '#f1f5f9', color: '#475569' };

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`chart-type-card ${isActive ? 'chart-type-card--active' : ''}`}
              title={opt.detail}
            >
              <div
                className="chart-type-icon-wrap"
                style={isActive
                  ? { background: 'rgba(255,255,255,.18)', color: '#fff' }
                  : { background: iconStyle.bg, color: iconStyle.color }
                }
              >
                {opt.icon}
              </div>
              <span className="chart-type-name">{opt.label}</span>
              <span
                className="chart-type-tier"
                style={isActive
                  ? { background: 'rgba(255,255,255,.2)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }
                  : { borderColor: legend?.color, color: legend?.color }
                }
              >
                {tierLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footnote */}
      <div className="chart-toolbar-footnote">
        <Info size={13} />
        <span>
          <strong>Bar</strong>, <strong>Pie</strong>, <strong>Sunburst</strong> and{' '}
          <strong>Line</strong> recommended for deep drill. Selecting any type resets to
          Overview level 1.
        </span>
      </div>
    </div>
  );
};

export default ChartToolbar;
