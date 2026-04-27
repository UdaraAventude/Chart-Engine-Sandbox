import useStore from '../store/useStore';
import { processCsvFile } from './localAnalytics';

export async function uploadCSV(file, onProgress) {
  const data = await processCsvFile(file, onProgress);
  const store = useStore.getState();

  store.setDataset(data.rows);
  store.setChartConfig(data.chart_config);
  store.setAggregations(data.aggregations || null);
  store.setTotalRows(data.total_rows || data.rows.length);
  store.setFileSizeMb(data.file_size_mb || 0);
  store.setProcessingMs(data.processing_ms || 0);

  onProgress?.(100);
  return data;
}
