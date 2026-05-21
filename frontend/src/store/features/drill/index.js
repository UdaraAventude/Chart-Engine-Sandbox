import { getCategoricalDepth } from '../../../libs/drill-down/utils/drillDepth';
import { resolveHierarchyModel } from '../../../libs/drill-down/utils/hierarchyModel';

export const createDrillSlice = (set, get) => ({
  drillPath: [],
  chartTypeByDepth: {},

  drillInto: (childName, column) =>
    set((state) => {
      const meta = state.metadata;
      const dimensions = meta?.dimensions ?? [];
      const maxDepth = meta?.maxHierarchyDepth ?? 0;
      const { treeDepth } = resolveHierarchyModel(dimensions, maxDepth);
      const catDepth = getCategoricalDepth(state.drillPath);

      if (treeDepth > 0 && catDepth >= treeDepth) {
        return state;
      }

      const currentDepth = state.drillPath.length;
      const parentType = state.chartTypeByDepth[currentDepth] ?? "bar";
      return {
        drillPath: [...state.drillPath, { column, value: childName }],
        chartTypeByDepth: {
          ...state.chartTypeByDepth,
          [currentDepth + 1]: parentType,
        },
      };
    }),

  drillIntoMany: (steps) =>
    set((state) => {
      const baseDepth = state.drillPath.length;
      const baseType = state.chartTypeByDepth[baseDepth] ?? "sunburst";
      const newPath = [...state.drillPath];
      const newChartTypeByDepth = { ...state.chartTypeByDepth };
      steps.forEach((step, i) => {
        newPath.push({ column: step.column, value: step.value });
        newChartTypeByDepth[baseDepth + i + 1] = baseType;
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

  drillToPath: (steps) =>
    set((state) => {
      const currentDepth = state.drillPath.length;
      const activeType =
        state.chartTypeByDepth[currentDepth] ??
        state.chartTypeByDepth[0] ??
        "sunburst";

      const newChartTypeByDepth = { ...state.chartTypeByDepth };

      const maxDepth = Math.max(state.drillPath.length, steps.length);
      for (let i = steps.length + 1; i <= maxDepth; i++) {
        delete newChartTypeByDepth[i];
      }

      steps.forEach((_, i) => {
        newChartTypeByDepth[i + 1] = activeType;
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

  /** Top toolbar: clear drill path and set chart type at overview. */
  resetDrillAndSetChartType: (type) =>
    set({ drillPath: [], chartTypeByDepth: { 0: type } }),
  aggregation: "avg",
  setAggregation: (aggregation) => set({ aggregation }),

  setChartTypeAtDepth: (depth, type) =>
    set((state) => ({
      chartTypeByDepth: { ...state.chartTypeByDepth, [depth]: type },
    })),
});
