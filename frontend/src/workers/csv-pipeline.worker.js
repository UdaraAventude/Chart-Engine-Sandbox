/** @deprecated Server-only upload; kept for reference. */
import Papa from "papaparse";
import { StreamFormatter } from "../services/global-formatter/index.js";

self.onmessage = (e) => {
  const { file } = e.data;
  const estimatedRowCount = Math.floor(file.size / 100);
  const streamProcessor = new StreamFormatter(estimatedRowCount);
  let lastPct = 0;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    chunk: (results, parser) => {
      if (lastPct === 0) {
        console.log("1. RAW PAPAPARSE CHUNK (Flat Data):", results.data);
      }
      streamProcessor.processChunk(results.data);
      if (file.size > 0) {
        const pct = Math.min(
          90,
          Math.round((parser.streamer._handle.byteIndex / file.size) * 90),
        );
        if (pct > lastPct) {
          lastPct = pct;
          self.postMessage({ type: "progress", pct });
        }
      }
    },
    complete: () => {
      self.postMessage({ type: "progress", pct: 95 });
      try {
        const globalData = streamProcessor.finish();
        console.log("2. FINAL GENERATED TREE (Nested Data):", globalData.tree);
        self.postMessage({
          type: "done",
          result: globalData,
          totalRows: streamProcessor.totalRows,
        });
      } catch (err) {
        self.postMessage({ type: "error", message: err.message });
      }
    },
    error: (err) => {
      self.postMessage({ type: "error", message: err.message });
    },
  });
};
