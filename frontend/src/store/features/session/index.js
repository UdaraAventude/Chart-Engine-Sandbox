export const createSessionSlice = (set) => ({
  activeDatasetId: null,
  metadata: null,
  serverChartData: null,
  chartLoading: false,
  chartError: null,

  setActiveDataset: (id) => set({ activeDatasetId: id }),
  setMetadata: (metadata) => set({ metadata }),
  setServerChart: (data) => set({ serverChartData: data }),
  setChartLoading: (chartLoading) => set({ chartLoading }),
  setChartError: (chartError) => set({ chartError }),

  clearSession: () =>
    set({
      activeDatasetId: null,
      metadata: null,
      serverChartData: null,
      chartLoading: false,
      chartError: null,
      globalData: null,
      totalRows: 0,
    }),
});
