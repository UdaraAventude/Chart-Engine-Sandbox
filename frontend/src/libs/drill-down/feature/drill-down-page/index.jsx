import React from "react";
import UploadCSV from "../../../../components/upload-csv";
import DatasetPanel from "../../../../components/dataset-panel";
import ChartToolbar from "../../ui/chart-toolbar";
import DrillDownRenderer from "../../ui/drill-down-renderer";
import useStore from "../../../../store";

const DrillDownPage = () => {
  const {
    activeDatasetId,
    error,
    drillPath,
    chartTypeByDepth,
    setChartTypeAtDepth,
    setRenderTime,
    resetDrill,
  } = useStore();

  const activeChartType = chartTypeByDepth[drillPath.length] ?? "bar";

  const handleChartTypeSelect = (type) => {
    resetDrill();
    setChartTypeAtDepth(0, type);
  };

  const hasWorkspace = Boolean(activeDatasetId);

  return (
    <div className="eval-container">
      <header className="eval-header">
        <div className="title-area">
          <h1 className="page-title">Chart Engine Decision Matrix</h1>
          <p className="subtitle">
            Technical Evaluation & Performance Benchmarking
          </p>
        </div>

        <UploadCSV />
      </header>

      <main className="eval-main">
        <div className="eval-layout-with-panel">
          <DatasetPanel />
          {hasWorkspace ? (
            <div className="dashboard-content">
              <ChartToolbar
                activeChartType={activeChartType}
                onSelect={handleChartTypeSelect}
              />
              <DrillDownRenderer onRenderTime={setRenderTime} />
            </div>
          ) : (
            <div className="awaiting-state">
              <h2>Awaiting Dataset Ingestion</h2>
              <p>
                Upload a CSV or select a dataset from the panel to start
                exploration.
              </p>
            </div>
          )}
        </div>
      </main>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

export default DrillDownPage;
