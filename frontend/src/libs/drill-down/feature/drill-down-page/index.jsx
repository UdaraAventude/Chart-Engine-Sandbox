import React from "react";
import { Link } from "react-router-dom";
import UploadCSV from "../../../../components/upload-csv";
import ChartToolbar from "../../ui/chart-toolbar";
import DrillDownRenderer from "../../ui/drill-down-renderer";
import useStore from "../../../../store";
import { LayoutDashboard, ArrowRight, Wand2 } from "lucide-react";

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
          <h1>Chart Engine Decision Matrix</h1>
          <p className="subtitle">
            Technical Evaluation & Performance Benchmarking
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <UploadCSV />
        </div>
      </header>

      <main className="eval-main">
        <section
          className="bench-section"
          style={{
            border: "none",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          {globalData ? (
            <>
              <ChartToolbar
                activeChartType={activeChartType}
                onSelect={handleChartTypeSelect}
              />

              <div
                className="viz-viewport"
                style={{
                  background: "white",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                  marginTop: "24px",
                  padding: "24px",
                  minHeight: "600px",
                }}
              >
                <DrillDownRenderer onRenderTime={setRenderTime} />
              </div>


            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <h2 style={{ fontSize: "24px", color: "#1e293b" }}>
                Awaiting Dataset...
              </h2>
              <p style={{ color: "#64748b" }}>
                Upload dataset to begin hierarchical exploration.
              </p>
            </div>
          )}
        </section>
      </main>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

export default DrillDownPage;
