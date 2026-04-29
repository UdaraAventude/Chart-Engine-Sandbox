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
  filterRowsFn, aggregation = 'avg'
) {
  const primaryMetric = metrics[0] ?? '';

  if (chartType === 'scatter') {
    return formatScatter(rows, drillPath, metrics, filterRowsFn);
  }
  if (chartType === 'bubble') {
    return formatBubble(node, rows, drillPath, metrics, dimensions, limit, filterRowsFn);
  }
  if (chartType === 'multiline') {
    return computeMultilineData(node, limit, aggregation, primaryMetric);
  }
  if (chartType === 'heatmap') {
    return computeHeatmapData(node, limit, aggregation, primaryMetric);
  }

  if (chartType === 'sunburst') {
    return formatSunburstData(node, limit, aggregation, primaryMetric);
  }
  if (chartType === 'correlation') {
    return computeCorrelationData(rows, drillPath, metrics, filterRowsFn);
  }
  return formatStandard(node, limit, aggregation, primaryMetric);
}
