import { resolveNodeValue } from '../aggregation';

export function formatStandard(node, limit, aggregation = 'avg', primaryMetric = '') {
  if (!node) return [];

  const children = (node.children || []).map((c) => ({
    name: c.name,
    value: resolveNodeValue(c, primaryMetric, aggregation),
    count: c.count,
    aggs: c.aggs,
  }));

  if (limit !== null && children.length > limit) {
    return children.sort((a, b) => b.value - a.value).slice(0, limit);
  }

  return children;
}
