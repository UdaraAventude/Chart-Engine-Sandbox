import Papa from 'papaparse';

export function parseCSV(file, onProgress) {
  return new Promise((resolve, reject) => {
    let lastPct = 0;
    const allRows = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      chunk: (results, parser) => {
        allRows.push(...results.data);
        if (file.size > 0) {
          const pct = Math.min(
            90,
            Math.round((parser.streamer._handle.byteIndex / file.size) * 90),
          );
          if (pct > lastPct) {
            lastPct = pct;
            onProgress?.(pct);
          }
        }
      },
      complete: () => {
        onProgress?.(95);
        resolve(allRows);
      },
      error: (err) => reject(err),
    });
  });
}
