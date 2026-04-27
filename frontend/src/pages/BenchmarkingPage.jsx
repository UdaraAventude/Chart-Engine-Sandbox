import React from 'react';
import { Link } from 'react-router-dom';
import LibrarySwitcher from '../components/ui/LibrarySwitcher';
import ChartRenderer from '../components/charts/ChartRenderer';
import ChartTypeSelector from '../components/ui/ChartTypeSelector';
import DecisionMatrixPanel from '../components/ui/DecisionMatrixPanel';
import useStore from '../store/useStore';
import { ShieldCheck, Activity, Cpu, Code2, Table2, ArrowLeft } from 'lucide-react';

const BenchmarkingPage = () => {
  const { 
    selectedLibrary, 
    lastRenderTime, 
    error
  } = useStore();
  const [showMatrix, setShowMatrix] = React.useState(false);

  const metrics = {
    echarts: { 
      tech: "Canvas", 
      dx: "High (JSON-driven)", 
      perf: "Best for >5k points", 
      verdict: "The industry standard for enterprise AI dashboards.",
      tooltip: "Scientific floating list (High Control)",
      killerFeature: "Built-in DataZoom & Toolbox" 
    },
    plotly: { 
      tech: "SVG/WebGL", 
      dx: "Medium (Scientific)", 
      perf: "Best for exploration", 
      verdict: "Ideal for scientific R&D and data exploration tools.",
      tooltip: "Coordinate-based (X, Y)",
      killerFeature: "Lasso Select & SVG Export" 
    },
    recharts: { 
      tech: "SVG", 
      dx: "Excellent (React)", 
      perf: "Optimal for <1k points", 
      verdict: "CRITICAL: Silently drops data at >10k points without warning.",
      tooltip: "Key-Value pairs (Declarative)",
      killerFeature: "Native React Component feel" 
    },
    d3: {
      tech: "SVG",
      dx: "Low (Imperative)",
      perf: "Manual (Capped at 2k)",
      verdict: "Fallback for custom chart types ECharts cannot render.",
      tooltip: "N/A (Standard SVG)",
      killerFeature: "Unlimited custom visualizations"
    }
  };

  const active = metrics[selectedLibrary];

  return (
    <div className="eval-container">
      <header className="eval-header">
        <div className="title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/" style={{ color: '#64748b' }}><ArrowLeft size={24} /></Link>
            <h1>Real-time Benchmarking</h1>
          </div>
          <p className="subtitle">Apache ECharts • Plotly.js • Recharts • D3.js</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setShowMatrix(prev => !prev)}
            className="matrix-toggle-btn"
            style={{
              padding: '10px 20px',
              border: '1.5px solid #2563eb',
              borderRadius: '12px',
              background: showMatrix ? '#2563eb' : 'transparent',
              color: showMatrix ? 'white' : '#2563eb',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Table2 size={16} />
            {showMatrix ? 'Hide Matrix' : 'Decision Matrix'}
          </button>
        </div>
      </header>

      <main className="eval-main">
        {showMatrix && <DecisionMatrixPanel />}

        <section className="bench-section">
          <div className="bench-header">
            <div className="bench-info">
              <Activity size={20} className="icon-blue" />
              <span>Performance Test Suite</span>
            </div>
            <LibrarySwitcher />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px', padding: '0 32px' }}>
            {selectedLibrary === 'echarts' && <ChartTypeSelector />}
          </div>
          
          <div className="viz-viewport">
            <ChartRenderer />
          </div>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="data-section">
          <div className="metrics-grid">
            <div className="metric-card shadow-sm">
              <Cpu size={24} />
              <label>Latency</label>
              <div className="value">{lastRenderTime}<span>ms</span></div>
            </div>
            <div className="metric-card shadow-sm">
              <Code2 size={24} />
              <label>Core Tech</label>
              <div className="value">{active.tech}</div>
            </div>
            <div className="metric-card shadow-sm highlight-verdict">
              <ShieldCheck size={24} />
              <label>R&D Verdict</label>
              <div className="verdict-text">{active.verdict}</div>
              <div className="sub-info">
                 <p><strong>Tooltip:</strong> {active.tooltip}</p>
                 <p><strong>Killer Feature:</strong> {active.killerFeature}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BenchmarkingPage;
