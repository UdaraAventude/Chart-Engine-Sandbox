import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Zap, Users, TrendingUp } from 'lucide-react';
import ChartToolbar from '../../../drill-down/ui/chart-toolbar';
import DrillDownRenderer from '../../../drill-down/ui/drill-down-renderer';
import UploadCSV from '../../../../components/upload-csv';
import useStore from '../../../../store';

const DashboardPage = () => {
  const {
    globalData,
    totalRows,
    drillPath,
    chartTypeByDepth,
    setChartTypeAtDepth,
  } = useStore();
  const activeChartType = chartTypeByDepth[drillPath.length] ?? 'bar';

  if (!globalData) {
    return (
      <div className='empty-state-full'>
        <Zap size={64} className='icon-pulse' />
        <h1>Welcome to ChartSandbox</h1>
        <p>
          Upload your employee survey data to start hierarchical exploration.
        </p>
        <UploadCSV />
      </div>
    );
  }

  return (
    <div className='dashboard-container'>
      <header className='dashboard-header'>
        <div>
          <h1>Survey Insights</h1>
          <p className='text-muted'>Hierarchical Data Exploration</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <UploadCSV />
        </div>
      </header>

      <ChartToolbar
        activeChartType={activeChartType}
        onSelect={(type) => setChartTypeAtDepth(drillPath.length, type)}
      />

      <div className='main-viz-card'>
        <DrillDownRenderer />
      </div>

      <div className='stats-grid'>
        <div className='stat-card'>
          <Users
            size={20}
            className='icon-blue'
            style={{ marginBottom: '12px' }}
          />
          <div className='stat-label'>Total Rows</div>
          <div className='stat-value'>{totalRows?.toLocaleString()}</div>
        </div>
        <div className='stat-card'>
          <TrendingUp
            size={20}
            className='icon-green'
            style={{ marginBottom: '12px' }}
          />
          <div className='stat-label'>Dimensions</div>
          <div className='stat-value'>
            {globalData?.dimensions?.length ?? 0}
          </div>
        </div>
        <div className='stat-card'>
          <Zap
            size={20}
            className='icon-orange'
            style={{ marginBottom: '12px' }}
          />
          <div className='stat-label'>Metrics</div>
          <div className='stat-value'>{globalData?.metrics?.length ?? 0}</div>
        </div>
        <div className='stat-card'>
          <Activity
            size={20}
            className='icon-purple'
            style={{ marginBottom: '12px' }}
          />
          <div className='stat-label'>Drill Depth</div>
          <div className='stat-value'>{drillPath.length}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
