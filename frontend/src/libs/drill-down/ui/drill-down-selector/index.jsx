import React from 'react';
import { Layers, BarChart3, ScatterChart, PieChart, LineChart, Info } from 'lucide-react';
import '../../../../styles/DrillDown.css';

const DRILL_TYPES = [
  {
    key: 'bar',
    label: 'Bar',
    icon: <BarChart3 size={18} />,
    desc: 'Aggregate dimensions into categorical bars.',
    detail: 'Best for hierarchical categorical data. Click a bar to drill into that group.',
  },
  {
    key: 'pie',
    label: 'Pie',
    icon: <PieChart size={18} />,
    desc: 'Categorical share distribution.',
    detail: 'Shows proportional distribution of metrics. Click a slice to drill in.',
  },
  {
    key: 'line',
    label: 'Line',
    icon: <LineChart size={18} />,
    desc: 'Trend across categories.',
    detail: 'Displays metric values across the current hierarchy level as a line.',
  },
  {
    key: 'scatter',
    label: 'Scatter',
    icon: <ScatterChart size={18} />,
    desc: 'Point clustering analysis.',
    detail: 'Plots raw rows using two numeric columns. Colour-coded by current group.',
  },
];

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
        Select a chart type and click on elements to explore data hierarchies visually.
      </p>

      <div className='type-grid'>
        {DRILL_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => onSelect(type.key)}
            className={`type-btn ${activeChartType === type.key ? 'active' : ''}`}
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
              {DRILL_TYPES.find((t) => t.key === activeChartType)?.detail}
            </span>
            <div className='info-footer'>
              Hierarchy:{' '}
              <span className='info-footer-val'>Automatic categorical discovery</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillDownSelector;


const DRILL_TYPES = [
  {
    key: 'drill-bar',
    label: 'Drill Bar',
    icon: <BarChart3 size={18} />,
    desc: 'Aggregate dimensions into categorical bars.',
    detail:
      'Best for hierarchical categorical data like Category > Sub-Category.',
  },
  {
    key: 'drill-line',
    label: 'Drill Line',
    icon: <LineChart size={18} />,
    desc: 'Trend lines across quarters.',
    detail:
      'Visualizes Satisfaction or Salary trends over time for current level.',
  },
  {
    key: 'drill-pie',
    label: 'Drill Pie',
    icon: <PieChart size={18} />,
    desc: 'Categorical share distribution.',
    detail: 'Shows proportional distribution of metrics across categories.',
  },
  {
    key: 'drill-scatter',
    label: 'Drill Scatter',
    icon: <ScatterChart size={18} />,
    desc: 'Point clustering analysis.',
    detail: 'Explores raw data clusters between two numeric metrics.',
  },
  {
    key: 'drill-bubble',
    label: 'Drill Bubble',
    icon: <CircleDot size={18} />,
    desc: 'Multi-dimensional analysis.',
    detail: 'Analyzes X, Y, and Size across hierarchical groups.',
  },
  {
    key: 'drill-sunburst',
    label: 'Drill Sunburst',
    icon: (
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle cx='12' cy='12' r='10' />
        <circle cx='12' cy='12' r='4' />
        <path d='M12 2v2M12 20v2M2 12h2M20 12h2' />
      </svg>
    ),
    desc: 'Radial hierarchy rings.',
    detail:
      'Click any arc segment to zoom into that group. Each ring = one hierarchy level.',
  },
  {
    key: 'drill-heatmap',
    label: 'Drill Heatmap',
    icon: <LayoutGrid size={18} />,
    desc: 'Binned density drill-down.',
    detail: 'Bins numeric X/Y axes. Categorical drill filters these bins.',
  },
  {
    key: 'drill-correlation',
    label: 'Correlation',
    icon: <Table2 size={18} />,
    desc: 'Relationship matrix.',
    detail:
      'Heatmap showing correlation coefficients between all numeric metrics.',
  },
  {
    key: 'drill-histogram',
    label: 'Histogram',
    icon: <BarChart3 size={18} />,
    desc: 'Frequency distribution.',
    detail: 'Shows the distribution of a single metric across numeric bins.',
  },
  {
    key: 'drill-table',
    label: 'Data Table',
    icon: <Table2 size={18} />,
    desc: 'Raw data view.',
    detail: 'Displays the actual records for the current drill-down filter.',
  },
];

const DrillDownSelector = ({ activeDrillType, onSelect }) => {
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
        {DRILL_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => onSelect(type.key)}
            className={`type-btn ${activeDrillType === type.key ? 'active' : ''}`}
          >
            <div className='type-icon'>{type.icon}</div>

            <div>
              <div className='type-label'>{type.label}</div>
              <div className='type-desc'>{type.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {activeDrillType && (
        <div className='info-strip'>
          <Info size={16} className='info-icon' />
          <div className='info-content'>
            <span className='info-title'>Configuration Insight:</span>
            <span className='info-body'>
              {DRILL_TYPES.find((t) => t.key === activeDrillType)?.detail}
            </span>
            <div className='info-footer'>
              Hierarchy:{' '}
              <span className='info-footer-val'>
                Automatic categorical discovery
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillDownSelector;
