import React from 'react';
import {
  BarChart3,
  PieChart,
  LineChart,
  ScatterChart,
  Table2,
} from 'lucide-react';

const CHART_OPTIONS = [
  { value: 'bar', label: 'Bar', icon: <BarChart3 size={16} /> },
  { value: 'pie', label: 'Pie', icon: <PieChart size={16} /> },
  { value: 'line', label: 'Line', icon: <LineChart size={16} /> },
  { value: 'scatter', label: 'Scatter', icon: <ScatterChart size={16} /> },
  { value: 'table', label: 'Table', icon: <Table2 size={16} /> },
];

const ChartToolbar = ({ activeChartType, onSelect }) => {
  return (
    <div className='premium-toolbar-row'>
      <div className='pill-group'>
        {CHART_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`pill-btn ${activeChartType === opt.value ? 'active' : ''}`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChartToolbar;
