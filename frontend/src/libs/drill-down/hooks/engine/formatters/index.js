import { formatScatter } from './scatterFormatter';
import { formatBubble } from './bubbleFormatter';
import { computeMultilineData } from './multilineFormatter';
import { computeHeatmapData } from './heatmapFormatter';
import { formatStandard } from './standardFormatter';
import { computeCorrelationData } from './correlationFormatter';
import { formatSunburstData } from './sunburstFormatter';

export function formatForChartRegistry(
  node,
  chartType,
  rows,
  drillPath,
  metrics,
  dimensions,
  limit,
  filterRowsFn
) {
  if (chartType === 'scatter') {
    return formatScatter(rows, drillPath, metrics, filterRowsFn);
  }
  if (chartType === 'bubble') {
    return formatBubble(node, rows, drillPath, metrics, dimensions, limit, filterRowsFn);
  }
  if (chartType === 'multiline') {
    return computeMultilineData(node, limit);
  }
  if (chartType === 'heatmap') {
    return computeHeatmapData(node, limit);
  }
  if (chartType === 'correlation') {
    return computeCorrelationData(rows, drillPath, metrics, filterRowsFn);
  }
  if (chartType === 'sunburst') {
    return formatSunburstData(node, limit);
  }
  return formatStandard(node, limit);
}
