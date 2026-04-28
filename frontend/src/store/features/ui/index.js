export const createUISlice = (set) => ({
  isLoading: false,
  error: null,
  lastRenderTime: 0,
  uploadProgress: 0,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (err) => set({ error: err }),
  setRenderTime: (time) => set({ lastRenderTime: time }),
  setUploadProgress: (pct) => set({ uploadProgress: pct }),
});
