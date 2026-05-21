import useStore from '../../store';
import { uploadDocument } from './sseUpload';
import { getMetadata } from './documents';

export async function uploadCSV(file, onProgress) {
  const result = await uploadDocument(file, onProgress);

  const store = useStore.getState();

  let metadata = {
    datasetId: result.datasetId,
    totalRows: result.totalRows,
    dimensions: result.dimensions,
    metrics: result.metrics,
    rejected: result.rejected ?? [],
    maxHierarchyDepth:
      result.maxHierarchyDepth ?? result.MaxHierarchyDepth ?? result.dimensions?.length,
  };

  if (!metadata.dimensions?.length || !metadata.metrics?.length) {
    try {
      const fromApi = await getMetadata(result.datasetId);
      metadata = {
        datasetId: fromApi.datasetId,
        fileName: fromApi.fileName,
        status: fromApi.status,
        totalRows: fromApi.totalRows,
        dimensions: fromApi.dimensions,
        metrics: fromApi.metrics,
        rejected: fromApi.rejected ?? [],
        maxHierarchyDepth: fromApi.maxHierarchyDepth ?? fromApi.MaxHierarchyDepth,
      };
    } catch {
      // use upload payload as fallback
    }
  }

  store.setActiveDataset(result.datasetId);
  store.setMetadata(metadata);
  store.setTotalRows(metadata.totalRows ?? result.totalRows);
  store.setGlobalData(null);
  store.resetDrill();
  store.setChartError(null);

  onProgress?.(100);
  return metadata;
}
