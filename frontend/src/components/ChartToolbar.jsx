import React from 'react';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  ScatterChart, 
  CircleDot, 
  Table2,
  ChevronDown,
  LayoutGrid,
  Activity,
  GitBranch,
  BarChart
} from 'lucide-react';

const CHART_OPTIONS = [
  { id: 'drill-bar', label: 'Bar', icon: <BarChart3 size={18} /> },
  { id: 'drill-line', label: 'Line', icon: <LineChart size={18} /> },
  { id: 'drill-pie', label: 'Pie', icon: <PieChart size={18} /> },
  { id: 'drill-scatter', label: 'Scatter', icon: <ScatterChart size={18} /> },
  { id: 'drill-bubble', label: 'Bubble', icon: <CircleDot size={18} /> },
  { id: 'drill-heatmap', label: 'Heatmap', icon: <LayoutGrid size={18} /> },
  { id: 'drill-sunburst', label: 'Sunburst', icon: <Activity size={18} /> },
  { id: 'drill-correlation', label: 'Correlation', icon: <Table2 size={18} /> },
  { id: 'drill-histogram', label: 'Histogram', icon: <BarChart size={18} /> },
  { id: 'drill-table', label: 'Table', icon: <Table2 size={18} /> }
];

const ChartToolbar = ({ activeDrillType, onSelect }) => {
  return (
    <div className="premium-toolbar-row">
      <div className="pill-group">
        {CHART_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`pill-btn ${activeDrillType === opt.id ? 'active' : ''}`}
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
