/* Aggregation utilities for drill-down */

// Exported aggregation method options for UI dropdown
export const AGGREGATION_OPTIONS = [
  { value: "avg", label: "Average", symbol: "〈A〉" },
  { value: "sum", label: "Sum", symbol: "∑" },
  { value: "min", label: "Min", symbol: "↓" },
  { value: "max", label: "Max", symbol: "↑" },
  { value: "count", label: "Count", symbol: "#" },
];

/**
 * Resolve a node's value for a given metric and aggregation type.
 * Falls back to node.value (average) if specific aggregation data missing.
 * @param {object} node - Tree node containing aggs map.
 * @param {string} metric - Primary metric name.
 * @param {string} aggregation - One of 'avg', 'sum', 'min', 'max', 'count'.
 * @returns {number} Resolved numeric value.
 */
export function resolveNodeValue(node, metric = "", aggregation = "avg") {
  if (!node) return undefined;

  if (node.aggs && node.aggs[metric] && aggregation in node.aggs[metric]) {
    return node.aggs[metric][aggregation];
  }
  // Fallback to node.value (which is avg by default)
  return node.value;
}
