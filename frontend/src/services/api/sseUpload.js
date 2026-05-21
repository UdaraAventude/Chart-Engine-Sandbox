import config from '../../config';
import { ApiError } from './httpClient';

function buildUploadUrl() {
  const base = (config.apiBaseUrl || '/api/v1').replace(/\/$/, '');
  return `${base}/documents/upload`;
}

/**
 * Upload CSV via multipart POST; parse Server-Sent Events progress stream.
 * @returns {Promise<{ datasetId, totalRows, dimensions, metrics, rejected? }>}
 */
export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildUploadUrl(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new ApiError(
      errBody?.error || errBody?.message || 'Upload failed',
      { status: response.status, body: errBody },
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ApiError('Upload response has no body stream');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let completed = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      let event;
      try {
        event = JSON.parse(jsonStr);
      } catch {
        continue;
      }

      if (event.status === 'error') {
        throw new ApiError(event.message || 'Processing failed on server');
      }

      if (event.progress !== undefined && event.status === 'processing') {
        onProgress?.(event.progress);
      }

      if (event.status === 'completed' && event.data) {
        onProgress?.(100);
        completed = event.data;
      }
    }
  }

  if (!completed?.datasetId) {
    throw new ApiError('Upload completed without dataset id');
  }

  return {
    datasetId: completed.datasetId,
    totalRows: completed.totalRows ?? 0,
    dimensions: completed.dimensionColumns ?? completed.dimensions ?? [],
    metrics: completed.metricColumns ?? completed.metrics ?? [],
    rejected: completed.rejected ?? [],
    dimensionCount: completed.dimensions,
    metricCount: completed.metrics,
  };
}
