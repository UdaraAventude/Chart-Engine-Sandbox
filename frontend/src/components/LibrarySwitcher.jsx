import React from 'react';
import useStore from '../store/useStore';

const LibrarySwitcher = () => {
  const { selectedLibrary, setSelectedLibrary, setChartTypeOverride } = useStore();

  const libraries = [
    { id: 'echarts', name: 'Apache ECharts' },
    { id: 'plotly', name: 'Plotly.js' },
    { id: 'recharts', name: 'Recharts' },
    { id: 'd3', name: 'D3.js' },
  ];

  return (
    <div className="switcher-container">
      {libraries.map((lib) => (
        <button
          key={lib.id}
          className={`lib-btn ${selectedLibrary === lib.id ? 'active' : ''}`}
          onClick={() => {
            setSelectedLibrary(lib.id);
            setChartTypeOverride(null); // Clear complex override when switching tabs
          }}
        >
          {lib.name}
        </button>
      ))}
    </div>
  );
};

export default LibrarySwitcher;
