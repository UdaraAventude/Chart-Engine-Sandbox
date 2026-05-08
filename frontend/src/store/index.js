import { create } from "zustand";
import { createDataSlice } from "./features/data";
import { createUISlice } from "./features/ui";
import { createDrillSlice } from "./features/drill";

const useStore = create((set, get) => ({
  ...createDataSlice(set, get),
  ...createUISlice(set, get),
  ...createDrillSlice(set, get),
}));

if (typeof window !== "undefined") {
  window.__zustand_store__ = useStore;
}

export default useStore;
