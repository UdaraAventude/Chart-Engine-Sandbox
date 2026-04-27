import useStore from '../../store/useStore';

const TYPES = [
  { key: 'scatter_enhanced', label: 'Scatter+' },
  { key: 'bubble',           label: 'Bubble' },
  { key: 'heatmap',          label: 'Heatmap' },
  { key: 'correlation',      label: 'Correlation' },
  { key: 'histogram',        label: 'Histogram' },
  { key: 'multiline',        label: 'Multi-line' },
]

export default function ChartTypeSelector() {
  const { chartTypeOverride, setChartTypeOverride, setSelectedLibrary } = useStore()

  return (
    <div className="chart-type-selector" style={{ 
      display: 'flex', 
      gap: '8px', 
      flexWrap: 'wrap', 
      padding: '0 2.5rem',
      margin: '0.5rem 0 1.5rem 0',
      alignItems: 'center'
    }}>
      <span style={{ 
        fontSize: '0.75rem', 
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginRight: '8px'
      }}>
        ECharts Extensions:
      </span>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {TYPES.map(t => {
          const isActive = chartTypeOverride === t.key;
          return (
            <button key={t.key}
              onClick={() => {
                setChartTypeOverride(isActive ? null : t.key);
                setSelectedLibrary('echarts');
              }}
              style={{
                padding: '6px 16px', 
                fontSize: '0.85rem', 
                borderRadius: '12px', 
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: isActive ? '#eff6ff' : 'white',
                color: isActive ? '#2563eb' : '#64748b',
                boxShadow: isActive ? '0 2px 4px rgba(37, 99, 235, 0.1)' : 'none',
                fontFamily: 'inherit',
              }}>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  )
}
