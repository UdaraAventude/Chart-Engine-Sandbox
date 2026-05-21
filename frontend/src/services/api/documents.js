import { apiRequest } from './httpClient';

/** Normalize API list item (camelCase or PascalCase). */
export function normalizeDatasetListItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw.Id;
  if (!id) return null;
  return {
    id: String(id),
    fileName: raw.fileName ?? raw.FileName ?? 'Unnamed dataset',
    status: String(raw.status ?? raw.Status ?? 'Unknown'),
    totalRows: Number(raw.totalRows ?? raw.TotalRows ?? 0),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
  };
}

export function parsePagedDocuments(result) {
  if (!result) {
    return { items: [], totalCount: 0, page: 1, pageSize: 10 };
  }

  const rawList =
    result.items ??
    result.Items ??
    result.data ??
    result.Data ??
    (Array.isArray(result) ? result : []);

  const items = rawList
    .map(normalizeDatasetListItem)
    .filter(Boolean);

  return {
    items,
    totalCount: result.totalCount ?? result.TotalCount ?? items.length,
    page: result.page ?? result.Page ?? 1,
    pageSize: result.pageSize ?? result.PageSize ?? items.length,
  };
}

export async function listDocuments({ page = 1, pageSize = 10, sortBy, search } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (sortBy) params.set('sortBy', sortBy);
  if (search) params.set('search', search);
  const result = await apiRequest(`/documents?${params}`);
  return parsePagedDocuments(result);
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
