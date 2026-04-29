import React from 'react';
import { DRILL_CHART_OPTIONS } from '../../constants/chartOptions';

/**
 * ChartToolbar — pill-button row for selecting chart type.
 * Calls onSelect(value) when a pill is clicked.
 * Driven by DRILL_CHART_OPTIONS (single source of truth).
 */
const ChartToolbar = ({ activeChartType, onSelect }) => {
  return (
    <div className='premium-toolbar-row'>
      <div className='pill-group'>
        {DRILL_CHART_OPTIONS.map((opt) => {
          const isActive = activeChartType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`pill-btn ${isActive ? 'active' : ''}`}
              title={opt.detail}
              style={
                isActive
                  ? { backgroundColor: opt.color || '#0284c7', color: 'white' }
                  : {}
              }
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChartToolbar;
