import React, { useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Layers, BarChart3, Database } from 'lucide-react';
import DatasetWorkspace from '../../../../components/dataset-workspace';
import ChartToolbar from '../../ui/chart-toolbar';
import DrillDownRenderer from '../../ui/drill-down-renderer';
import useStore from '../../../../store';
import { getDepthContext } from '../../utils/drillDepth';
import '../../../../styles/ExploreView.css';

const DrillDownPage = () => {
  const {
    activeDatasetId,
    metadata,
    error,
    drillPath,
    chartTypeByDepth,
    setRenderTime,
    resetDrillAndSetChartType,
  } = useStore();

  const [showExplore, setShowExplore] = useState(Boolean(activeDatasetId));

  const activeChartType = chartTypeByDepth[drillPath.length] ?? 'bar';
  const depthCtx = getDepthContext(drillPath, metadata?.dimensions ?? [], {
    maxHierarchyDepth: metadata?.maxHierarchyDepth,
    totalRows: metadata?.totalRows ?? 0,
  });

  const handleChartTypeSelect = (type) => { resetDrillAndSetChartType(type); };
  const handleChangeDataset = () => { setShowExplore(false); };
  const handleDatasetReady = () => {
    if (useStore.getState().activeDatasetId) setShowExplore(true);
  };

  if (!showExplore || !activeDatasetId) {
    return (
      <div className="eval-container eval-container--workspace">
        <DatasetWorkspace onDatasetReady={handleDatasetReady} />
        {error && <div className="error-banner">{error}</div>}
      </div>
    );
  }

  return (
    <div className="eval-container eval-container--explore">
      <header className="explore-header">
        <button type="button" className="explore-back-btn" onClick={handleChangeDataset}>
          <ArrowLeft size={14} />
          Change dataset
        </button>

        <div className="explore-dataset-chip">
          <FileSpreadsheet size={18} />
          <div>
            <strong>{metadata?.fileName ?? 'Dataset'}</strong>
            <span>Active dataset</span>
          </div>
        </div>

        <div className="explore-header-stats">
          <span className="explore-stat-pill">
            <Database size={11} />
            <strong>{(metadata?.totalRows ?? 0).toLocaleString()}</strong> rows
          </span>
          <span className="explore-stat-pill">
            <Layers size={11} />
            <strong>{depthCtx.treeDepth}</strong> drill level{depthCtx.treeDepth !== 1 ? 's' : ''}
          </span>
          <span className="explore-stat-pill">
            <BarChart3 size={11} />
            <strong>{metadata?.metrics?.length ?? 0}</strong> metrics
          </span>
        </div>
      </header>

      <main className="explore-main">
        <ChartToolbar
          activeChartType={activeChartType}
          onSelect={handleChartTypeSelect}
        />
        <DrillDownRenderer onRenderTime={setRenderTime} />
      </main>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

export default DrillDownPage;
