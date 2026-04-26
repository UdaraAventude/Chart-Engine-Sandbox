import axios from 'axios';
import useStore from '../store/useStore';

const API_BASE = 'http://localhost:8000';

export async function uploadCSV(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      const pct = Math.round((e.loaded / e.total) * 80); // 0–80%
      onProgress?.(pct);
    },
  });

  const data = response.data;
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
