import { formatCSV } from '../services/global-formatter/index.js';

self.onmessage = (e) => {
  const { rows } = e.data;
  try {
    const globalData = formatCSV(rows);
    self.postMessage({ type: 'done', result: globalData });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
