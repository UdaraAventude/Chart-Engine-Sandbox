import { parseCSV } from '../localAnalytics';
import { formatCSV } from '../global-formatter';
import useStore from '../../store';

export async function uploadCSV(file, onProgress) {
  const rows = await parseCSV(file, onProgress);
  const globalData = formatCSV(rows);
  const store = useStore.getState();
  store.setGlobalData(globalData);
  store.setTotalRows(rows.length);
  store.resetDrill();
  onProgress?.(100);
  return globalData;
}
