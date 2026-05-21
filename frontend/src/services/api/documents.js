import { apiRequest } from './httpClient';

export function listDocuments({ page = 1, pageSize = 10, sortBy, search } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (sortBy) params.set('sortBy', sortBy);
  if (search) params.set('search', search);
  return apiRequest(`/documents?${params}`);
}

export function getMetadata(datasetId) {
  return apiRequest(`/documents/${datasetId}/metadata`);
}

export function deleteDocument(datasetId) {
  return apiRequest(`/documents/${datasetId}`, { method: 'DELETE', parseJson: false });
}

export function getVisualization({ id, chartType, drillPath = [], aggregation = 'count', drillDown = 0 }) {
  const params = new URLSearchParams({
    id: String(id),
    chartType,
    aggregation,
    drillDown: String(drillDown),
  });
  if (drillPath?.length > 0) {
    params.set('drillPath', JSON.stringify(drillPath));
  }
  return apiRequest(`/documents/visual?${params}`);
}
