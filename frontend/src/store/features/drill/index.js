export const createDrillSlice = (set, get) => ({
  drillPath: [],
  chartTypeByDepth: {},

  drillInto: (childName, column) =>
    set((state) => {
      const currentDepth = state.drillPath.length;
      const parentType = state.chartTypeByDepth[currentDepth] ?? 'bar';
      return {
        drillPath: [...state.drillPath, { column, value: childName }],
        chartTypeByDepth: {
          ...state.chartTypeByDepth,
          [currentDepth + 1]: parentType,   // ← inherit parent type
        },
      };
    }),

  drillBack: () =>
    set((state) => {
      const newPath = state.drillPath.slice(0, -1);
      const newChartTypeByDepth = { ...state.chartTypeByDepth };
      delete newChartTypeByDepth[state.drillPath.length];
      return { drillPath: newPath, chartTypeByDepth: newChartTypeByDepth };
    }),

  drillBackTo: (depth) =>
    set((state) => {
      const newChartTypeByDepth = { ...state.chartTypeByDepth };
      for (let i = depth + 1; i <= state.drillPath.length; i++) {
        delete newChartTypeByDepth[i];
      }
      return {
        drillPath: state.drillPath.slice(0, depth),
        chartTypeByDepth: newChartTypeByDepth,
      };
    }),

  resetDrill: () => set({ drillPath: [], chartTypeByDepth: {} }),

  setChartTypeAtDepth: (depth, type) =>
    set((state) => ({
      chartTypeByDepth: { ...state.chartTypeByDepth, [depth]: type },
    })),
});
