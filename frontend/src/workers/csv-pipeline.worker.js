import Papa from 'papaparse';
import { formatCSV } from '../services/global-formatter/index.js';

self.onmessage = (e) => {
  const { file } = e.data;
  const allRows = [];
  let lastPct = 0;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    chunk: (results, parser) => {
      for (const row of results.data) {
        allRows.push(row);
      }
      if (file.size > 0) {
        const pct = Math.min(
          90,
          Math.round((parser.streamer._handle.byteIndex / file.size) * 90),
        );
        if (pct > lastPct) {
          lastPct = pct;
          self.postMessage({ type: 'progress', pct });
        }
      }
    },
    complete: () => {
      self.postMessage({ type: 'progress', pct: 95 });
      try {
        const globalData = formatCSV(allRows);
        self.postMessage({
          type: 'done',
          result: globalData,
          totalRows: allRows.length,
        });
      } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
      }
    },
    error: (err) => {
      self.postMessage({ type: 'error', message: err.message });
    },
  });
};
