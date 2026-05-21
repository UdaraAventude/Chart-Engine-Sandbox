import React from 'react';
import { Layers, Info } from 'lucide-react';
import {
  DRILL_CHART_OPTIONS,
  DRILL_SUPPORT_LEGEND,
  DRILL_TIER_LABELS,
} from '../../constants/chartOptions';
import './ChartToolbar.css';

const ChartToolbar = ({ activeChartType, onSelect, availableDepth = 99 }) => {
  return (
    <div className="chart-toolbar-panel">
      <div className="chart-toolbar-intro">
        <Layers size={18} />
        <div>
          <h2 className="chart-toolbar-title">Choose visualization</h2>
          <p className="chart-toolbar-sub">
            Types marked <strong>Deep drill</strong> support clicking through every hierarchy
            level. <strong>2+ levels</strong> need at least two dimensions remaining below you.
          </p>
        </div>
      </div>

      <div className="drill-legend" role="list" aria-label="Drill-down support legend">
        {DRILL_SUPPORT_LEGEND.map((item) => (
          <div key={item.tier} className="drill-legend-item" role="listitem">
            <span
              className="drill-legend-dot"
              style={{ background: item.color }}
              aria-hidden
            />
            <span className="drill-legend-label">{item.label}</span>
            <span className="drill-legend-hint">{item.hint}</span>
          </div>
        ))}
      </div>

      <div className="premium-toolbar-row">
        <div className="pill-group">
          {DRILL_CHART_OPTIONS.map((opt) => {
            const isActive = activeChartType === opt.value;
            const tier = opt.drillSupport || 'none';
            const tierLabel = DRILL_TIER_LABELS[tier];
            const legend = DRILL_SUPPORT_LEGEND.find((l) => l.tier === tier);
            const depthBlocked =
              opt.minRemainingDepth > availableDepth && opt.value !== activeChartType;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !depthBlocked && onSelect(opt.value)}
                disabled={depthBlocked}
                className={`pill-btn ${isActive ? 'active' : ''} pill-btn--${tier}`}
                title={`${opt.detail}\n\nDrill-down: ${legend?.label ?? tierLabel}`}
              >
                {opt.icon}
                <span className="pill-btn-label">{opt.label}</span>
                <span
                  className={`pill-drill-badge pill-drill-badge--${tier}`}
                  style={{ borderColor: legend?.color, color: legend?.color }}
                >
                  {tierLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="chart-toolbar-footnote">
        <Info size={14} />
        Recommended for exploration: <strong>Bar</strong>, <strong>Pie</strong>,{' '}
        <strong>Sunburst</strong>, and <strong>Line</strong>. Use Table at the deepest level
        for raw rows.
      </p>
    </div>
  );
};

export default ChartToolbar;
