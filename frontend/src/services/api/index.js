import { parseCSV } from '../local-analytics';
import { formatCSV } from '../global-formatter';
import useStore from '../../store';

export async function uploadCSV(file, onProgress) {
  const rows = await parseCSV(file, onProgress);

  const globalData = await new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../../workers/csv-pipeline.worker.js', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e) => {
      const { type, result, message } = e.data;
      if (type === 'done') {
        worker.terminate();
        resolve(result);
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(message));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    worker.postMessage({ rows });
  });

  const store = useStore.getState();
  store.setGlobalData(globalData);
  store.setTotalRows(rows.length);
  store.resetDrill();
  onProgress?.(100);
  return globalData;
}
