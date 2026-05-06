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

  // Atomically drill through multiple levels at once
  drillIntoMany: (steps) =>
    set((state) => {
      const baseDepth = state.drillPath.length;
      const baseType = state.chartTypeByDepth[baseDepth] ?? 'sunburst';
      const newPath = [...state.drillPath];
      const newChartTypeByDepth = { ...state.chartTypeByDepth };
      steps.forEach((step, i) => {
        newPath.push({ column: step.column, value: step.value });
        newChartTypeByDepth[baseDepth + i + 1] = baseType; // inherit chart type
      });
      return { drillPath: newPath, chartTypeByDepth: newChartTypeByDepth };
    }),

  drillBack: () =>
    set((state) => {
      const newPath = state.drillPath.slice(0, -1);
      const newChartTypeByDepth = { ...state.chartTypeByDepth };
      delete newChartTypeByDepth[state.drillPath.length];
      return { drillPath: newPath, chartTypeByDepth: newChartTypeByDepth };
    }),

  // Atomically replace the entire drillPath
  drillToPath: (steps) =>
    set((state) => {
      const baseType = state.chartTypeByDepth[0] ?? 'sunburst';
      const newChartTypeByDepth = { [0]: baseType };
      steps.forEach((_, i) => {
        newChartTypeByDepth[i + 1] = baseType;
      });
      return { drillPath: steps, chartTypeByDepth: newChartTypeByDepth };
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
  aggregation: 'avg',
  setAggregation: (aggregation) => set({ aggregation }),

  setChartTypeAtDepth: (depth, type) =>
    set((state) => ({
      chartTypeByDepth: { ...state.chartTypeByDepth, [depth]: type },
    })),
});
