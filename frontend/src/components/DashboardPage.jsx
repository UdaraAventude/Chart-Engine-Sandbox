import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Zap, Users, TrendingUp } from 'lucide-react';
import ChartToolbar from './ChartToolbar';
import DrillDownRenderer from './DrillDownRenderer';
import UploadCSV from './UploadCSV';
import useStore from '../store/useStore';

const DashboardPage = () => {
  const { dataset, aggregations } = useStore();
  const kpi = aggregations?.kpi || {};

  if (!dataset) {
    return (
      <div className="empty-state-full">
        <Zap size={64} className="icon-pulse" />
        <h1>Welcome to ChartSandbox</h1>
        <p>Upload your employee survey data to start hierarchical exploration.</p>
        <UploadCSV />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Survey Insights</h1>
          <p className="text-muted">Hierarchical Data Exploration</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <UploadCSV />
          <Link to="/benchmarking" className="benchmarking-link">
            <Activity size={18} />
            Real-time Benchmarking
          </Link>
        </div>
      </header>

      <ChartToolbar />

      <div className="main-viz-card">
        <DrillDownRenderer />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Users size={20} className="icon-blue" style={{ marginBottom: '12px' }} />
          <div className="stat-label">Total Headcount</div>
          <div className="stat-value">{kpi.total_rows?.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <TrendingUp size={20} className="icon-green" style={{ marginBottom: '12px' }} />
          <div className="stat-label">Avg Satisfaction</div>
          <div className="stat-value">{kpi.avg_satisfaction} / 10</div>
        </div>
        <div className="stat-card">
          <Zap size={20} className="icon-orange" style={{ marginBottom: '12px' }} />
          <div className="stat-label">Top Department</div>
          <div className="stat-value">{kpi.top_department}</div>
        </div>
        <div className="stat-card">
          <Activity size={20} className="icon-purple" style={{ marginBottom: '12px' }} />
          <div className="stat-label">Avg Salary</div>
          <div className="stat-value">${kpi.avg_salary?.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
