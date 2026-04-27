import React from 'react';

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', icon: '📊' },
  { id: 'line', label: 'Line Chart', icon: '📈' },
  { id: 'scatter', label: 'Scatter Plot', icon: '📉' },
  { id: 'pie', label: 'Pie Chart', icon: '🥧' },
  { id: 'heatmap', label: 'Heat Map', icon: '🔥' }
];

export const ChartTypeSelector = ({ value, onChange }) => {
  return (
    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Chart Type
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {CHART_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: value === type.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: value === type.id ? '#eff6ff' : 'white',
              color: value === type.id ? '#1e3a8a' : '#475569',
              fontWeight: value === type.id ? '600' : '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
};
