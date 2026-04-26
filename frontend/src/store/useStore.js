import { create } from 'zustand';

const useStore = create((set) => ({
  dataset: null,
  chartConfig: null,
  selectedLibrary: 'echarts',
  chartTypeOverride: null,        // NEW
  isLoading: false,
  error: null,
  lastRenderTime: 0,

  isDrillMode: true,
  drillChartType: 'drill-bar',

  aggregations: null,        // full pre-aggregated payload from backend
  totalRows: 0,              // true row count from backend
  fileSizeMb: 0,             // for display in UI
  processingMs: 0,           // backend processing time
  uploadProgress: 0,         // for progress bar

  setDataset: (data) => set({ dataset: data }),
  setChartConfig: (config) => set({ chartConfig: config }),
  setSelectedLibrary: (lib) => set({ selectedLibrary: lib }),
  setChartTypeOverride: (type) => set({ chartTypeOverride: type }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (err) => set({ error: err }),
  setRenderTime: (time) => set({ lastRenderTime: time }),
  setIsDrillMode: (val) => set({ isDrillMode: val }),
  setDrillChartType: (type) => set({ drillChartType: type }),
  toggleDrillMode: () => set(state => ({ isDrillMode: !state.isDrillMode })),

  setAggregations: (agg) => set({ aggregations: agg }),
  setTotalRows: (n) => set({ totalRows: n }),
  setFileSizeMb: (mb) => set({ fileSizeMb: mb }),
  setProcessingMs: (ms) => set({ processingMs: ms }),
  setUploadProgress: (pct) => set({ uploadProgress: pct }),
}));

// Expose store for R&D console testing
if (typeof window !== 'undefined') {
  window.__zustand_store__ = useStore;
}

export default useStore;
