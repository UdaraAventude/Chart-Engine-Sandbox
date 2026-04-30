function triggerDownload(dataURL, filename) {
  const anchor = document.createElement('a');
  anchor.href = dataURL;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

// ─────────────────────────────────────────────────────────────────
// PNG EXPORT
// ─────────────────────────────────────────────────────────────────

export function exportToPNG(echartsInstance, filename = 'chart.png') {
  if (!echartsInstance) {
    console.error('[ExportService] No ECharts instance provided.');
    return;
  }

  // Requesting png type. If renderer is 'svg', ECharts will ignore this and return an SVG data URL.
  const dataURL = echartsInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    excludeComponents: ['toolbox'],
  });

  if (dataURL.startsWith('data:image/png')) {
    triggerDownload(dataURL, filename);
    return;
  }

  if (dataURL.startsWith('data:image/svg+xml')) {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');

      canvas.width = img.width * 2;
      canvas.height = img.height * 2;

      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);

      // Download the converted PNG
      triggerDownload(canvas.toDataURL('image/png'), filename);
    };

    img.src = dataURL;
    return;
  }

  console.error('[ExportService] Unexpected data URL format returned.');
}

// ─────────────────────────────────────────────────────────────────
// SVG EXPORT
// ─────────────────────────────────────────────────────────────────

export function exportToSVG(echartsInstance, filename = 'chart.svg') {
  if (!echartsInstance) {
    console.error('[ExportService] No ECharts instance provided.');
    return;
  }

  const dataURL = echartsInstance.getDataURL({
    type: 'svg',
    excludeComponents: ['toolbox'],
  });

  if (!dataURL.startsWith('data:image/svg')) {
    console.error(
      '[ExportService] SVG export failed. The chart was not initialised ' +
      'with renderer: "svg". Switch the renderer or use PNG instead.'
    );
    return;
  }

  triggerDownload(dataURL, filename);
}
