import React from "react";
import UploadCSV from "../../../../components/upload-csv";
import ChartToolbar from "../../ui/chart-toolbar";
import DrillDownRenderer from "../../ui/drill-down-renderer";
import useStore from "../../../../store";

const DrillDownPage = () => {
  const {
    globalData,
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
        {globalData ? (
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
            <p>Please upload a CSV file to activate the hierarchical exploration engine.</p>
          </div>
        )}
      </main>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

export default DrillDownPage;

