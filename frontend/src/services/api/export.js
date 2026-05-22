import config from '../../config';
import { apiRequest, ApiError } from './httpClient';

export function startExport(datasetId, format, drillPath = []) {
  const body = {
    format,
    drillPath: drillPath.length > 0 ? drillPath : null,
  };
  return apiRequest(`/datasets/${datasetId}/export`, {
    method: 'POST',
    body,
  });
}

export function getExportStatus(jobId) {
  return apiRequest(`/datasets/exports/${jobId}`);
}

export function exportStatusMessage(status) {
  const s = String(status?.status ?? status ?? '').toLowerCase();
  if (s === 'pending') return 'Export queued on server…';
  if (s === 'processing') return 'Preparing export… large datasets may take a minute';
  if (s === 'completed') return 'Finishing download…';
  return 'Preparing export…';
}

export async function pollExportUntilDone(
  jobId,
  { intervalMs = 1000, maxAttempts = 120, onStatus } = {},
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await getExportStatus(jobId);
    onStatus?.(status);
    if (status.status === 'Completed') return status;
    if (status.status === 'Failed') {
      throw new ApiError(status.errorMessage || 'Export job failed');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new ApiError('Export timed out — try again or narrow your drill path');
}

function buildDownloadUrl(jobId) {
  const base = (config.apiBaseUrl || '/api/v1').replace(/\/$/, '');
  return `${base}/datasets/exports/${jobId}/download`;
}

export async function downloadExportFile(jobId, fileName = 'export.csv') {
  const response = await fetch(buildDownloadUrl(jobId));
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new ApiError(
      errBody?.error || 'Download failed',
      { status: response.status, body: errBody },
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function runServerExport(datasetId, format, drillPath, { onStatus } = {}) {
  onStatus?.({ status: 'Pending' });
  const job = await startExport(datasetId, format, drillPath);
  await pollExportUntilDone(job.jobId, { onStatus });
  const ext = format.toLowerCase() === 'excel' ? 'xlsx' : 'csv';
  await downloadExportFile(job.jobId, `export.${ext}`);
}
