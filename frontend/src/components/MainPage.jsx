import React from 'react';
import { Link } from 'react-router-dom';
import UploadCSV from './UploadCSV';
import ChartToolbar from './ChartToolbar';
import DrillDownRenderer from './DrillDownRenderer';
import useStore from '../store/useStore';
import { LayoutDashboard, ArrowRight } from 'lucide-react';

const MainPage = () => {
  const { 
    dataset, 
    error,
    drillChartType,
    setDrillChartType,
    setRenderTime
  } = useStore();

  const handleDrillSelect = (type) => {
    setDrillChartType(type);
  };

  return (
    <div className="eval-container">
      <header className="eval-header">
        <div className="title-area">
          <h1>Chart Engine Decision Matrix</h1>
          <p className="subtitle">Technical Evaluation & Performance Benchmarking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <UploadCSV />
        </div>
      </header>

      <main className="eval-main">
        <section className="bench-section" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
          {dataset ? (
            <>
              <ChartToolbar 
                activeDrillType={drillChartType}
                onSelect={handleDrillSelect}
              />
              <div className="viz-viewport" style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', marginTop: '24px' }}>
                <DrillDownRenderer 
                  onRenderTime={setRenderTime} 
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                <Link to="/benchmarking" className="matrix-toggle-btn" style={{ 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px 32px',
                  background: 'var(--primary)',
                  color: 'white',
                  borderRadius: '16px',
                  fontWeight: 700,
                  fontSize: '16px'
                }}>
                  <LayoutDashboard size={20} />
                  Explore Real-time Benchmarking
                  <ArrowRight size={20} />
                </Link>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <h2 style={{ fontSize: '24px', color: '#1e293b' }}>Awaiting Dataset...</h2>
              <p style={{ color: '#64748b' }}>Upload employee_survey_200k.csv to begin hierarchical exploration.</p>
            </div>
          )}
        </section>
      </main>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

export default MainPage;
