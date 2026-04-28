export const createDataSlice = (set) => ({
  globalData: null,
  totalRows: 0,

  setGlobalData: (data) => set({ globalData: data }),
  setTotalRows: (n) => set({ totalRows: n }),
});
