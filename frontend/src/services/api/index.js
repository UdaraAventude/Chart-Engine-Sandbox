import { parseCSV } from "../local-analytics";
import { formatCSV } from "../global-formatter";
import useStore from "../../store";

export async function uploadCSV(file, onProgress) {
  const rows = await parseCSV(file, onProgress);
  console.log(rows, "rows data papaparse");
  const globalData = formatCSV(rows);
  console.log(globalData , "after converting globle formatter");

  const store = useStore.getState();

  store.setGlobalData(globalData);
  
  store.setTotalRows(rows.length);
  store.resetDrill();
  onProgress?.(100);
  return globalData;
}
