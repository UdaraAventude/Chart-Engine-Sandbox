import React from 'react';
import { Layers, Info } from 'lucide-react';
import { DRILL_CHART_OPTIONS } from '../../constants/chartOptions';
import '../../../../styles/DrillDown.css';

/**
 * DrillDownSelector — richer chart-type picker with descriptions & info strip.
 * Currently not rendered in the page (ChartToolbar is used instead), but kept
 * here for future use as a side-panel or modal selector.
 */
const DrillDownSelector = ({ activeChartType, onSelect }) => {
  return (
    <div className='drill-selector'>
      <div className='selector-header'>
        <div className='selector-title-group'>
          <Layers size={20} className='selector-icon' />
          <div>
            <h3 className='selector-title'>Hierarchical Discovery</h3>
            <span className='active-status-badge'>Drill-down Active</span>
          </div>
        </div>
      </div>

      <p className='selector-desc'>
        Select a chart type and click on elements to explore data hierarchies
        visually.
      </p>

      <div className='type-grid'>
        {DRILL_CHART_OPTIONS.map((type) => (
          <button
            key={type.value}
            onClick={() => onSelect(type.value)}
            className={`type-btn ${activeChartType === type.value ? 'active' : ''}`}
          >
            <div className='type-icon'>{type.icon}</div>
            <div>
              <div className='type-label'>{type.label}</div>
              <div className='type-desc'>{type.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {activeChartType && (
        <div className='info-strip'>
          <Info size={16} className='info-icon' />
          <div className='info-content'>
            <span className='info-title'>Configuration Insight:</span>
            <span className='info-body'>
              {DRILL_CHART_OPTIONS.find((t) => t.value === activeChartType)?.detail}
            </span>
            <div className='info-footer'>
              Drill-down:{' '}
              <span className='info-footer-val'>
                {DRILL_CHART_OPTIONS.find((t) => t.value === activeChartType)?.canDrill
                  ? 'Enabled — click chart elements to go deeper'
                  : 'Disabled — analytical / read-only view'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillDownSelector;
