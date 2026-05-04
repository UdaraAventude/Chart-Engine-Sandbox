import useStore from '../../store';

export async function uploadCSV(file, onProgress) {
  const { result, totalRows } = await new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../../workers/csv-pipeline.worker.js', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e) => {
      const { type, pct, result, totalRows, message } = e.data;
      if (type === 'progress') {
        onProgress?.(pct);
      } else if (type === 'done') {
        worker.terminate();
        resolve({ result, totalRows });
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(message));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    worker.postMessage({ file });
  });

  const store = useStore.getState();
  store.setGlobalData(result);
  store.setTotalRows(totalRows);
  store.resetDrill();
  onProgress?.(100);
  return result;
}
