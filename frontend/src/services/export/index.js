import { jsPDF } from 'jspdf';
import { utils, writeFile } from 'xlsx';

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

// ─────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────

export function exportToPDF(echartsInstance, filename = 'chart.pdf') {
  if (!echartsInstance) {
    console.error('[ExportService] No ECharts instance provided.');
    return;
  }

  const dataURL = echartsInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    excludeComponents: ['toolbox'],
  });

  // Helper that takes a real PNG dataURL and builds the PDF
  const buildPDF = (pngDataURL) => {
    // Get the rendered DOM element to read actual pixel dimensions
    const dom = echartsInstance.getDom();
    const { width, height } = dom.getBoundingClientRect();
    const aspectRatio = height / width;

    // A4 landscape: 297mm × 210mm
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = pdf.internal.pageSize.getWidth();   // 297mm
    const pageH = pdf.internal.pageSize.getHeight();  // 210mm
    const margin = 15; // 15mm margin on all sides

    const usableW = pageW - margin * 2;  // 267mm
    const usableH = pageH - margin * 2;  // 180mm

    // Fit chart within usable area preserving aspect ratio
    let drawW = usableW;
    let drawH = drawW * aspectRatio;

    if (drawH > usableH) {
      drawH = usableH;
      drawW = drawH / aspectRatio;
    }

    // Centre the chart on the page
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    pdf.addImage(pngDataURL, 'PNG', x, y, drawW, drawH);
    pdf.save(filename);
  };

  // Same SVG→Canvas bridge as exportToPNG
  if (dataURL.startsWith('data:image/png')) {
    buildPDF(dataURL);
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

      buildPDF(canvas.toDataURL('image/png'));
    };
    img.src = dataURL;
    return;
  }

  console.error('[ExportService] Unexpected data URL format for PDF export.');
}

// ─────────────────────────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────────────────────────

export function exportToCSV(echartsInstance, filename = 'chart-data.csv', dimensionName = 'Name') {
  if (!echartsInstance) {
    console.error('[ExportService] No ECharts instance provided.');
    return;
  }

  const option = echartsInstance.getOption();
  const series = option.series || [];
  const xAxisData = option.xAxis?.[0]?.data || [];

  let rows = []; // will hold arrays of [col1, col2, ...]

  if (xAxisData.length > 0) {
    // ── Shape A: Bar / Line — xAxis has category labels ──────────
    // Get column names from xAxis and series
    const xAxisName = option.xAxis?.[0]?.name || 'Category';
    const headers = [xAxisName, ...series.map((s, i) => s.name || `Series ${i + 1}`)];
    rows.push(headers);

    // Data rows: label + each series value at that index
    xAxisData.forEach((label, i) => {
      const row = [label, ...series.map((s) => {
        const val = s.data?.[i];
        // data items can be plain numbers OR objects like { value: 42 }
        return (typeof val === 'object' && val !== null) ? (val.value ?? '') : (val ?? '');
      })];
      rows.push(row);
    });

  } else {
    // ── Shape B: Pie / Sunburst — data is self-contained ─────────
    const valueHeader = series[0]?.name || 'Value';
    const headers = [dimensionName, valueHeader];
    rows.push(headers);

    const data = series[0]?.data || [];
    data.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        rows.push([item.name ?? '', item.value ?? '']);
      } else {
        rows.push(['', item]);
      }
    });
  }

  // Convert rows array → CSV string
  // Wrap every cell in quotes to handle commas inside values
  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);

  // Clean up the object URL after download is triggered
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────────
// EXCEL EXPORT
// ─────────────────────────────────────────────────────────────────

export function exportToExcel(echartsInstance, filename = 'chart-data.xlsx', dimensionName = 'Name') {
  if (!echartsInstance) {
    console.error('[ExportService] No ECharts instance provided.');
    return;
  }

  const option = echartsInstance.getOption();
  const series = option.series || [];
  const xAxisData = option.xAxis?.[0]?.data || [];

  let wsData = []; // worksheet data — array of arrays

  if (xAxisData.length > 0) {
    // ── Shape A: Bar / Line ───────────────────────────────────────
    const xAxisName = option.xAxis?.[0]?.name || 'Category';
    const headers = [xAxisName, ...series.map((s, i) => s.name || `Series ${i + 1}`)];
    wsData.push(headers);

    xAxisData.forEach((label, i) => {
      const row = [label, ...series.map((s) => {
        const val = s.data?.[i];
        return (typeof val === 'object' && val !== null) ? (val.value ?? '') : (val ?? '');
      })];
      wsData.push(row);
    });

  } else {
    // ── Shape B: Pie / Sunburst ───────────────────────────────────
    const valueHeader = series[0]?.name || 'Value';
    wsData.push([dimensionName, valueHeader]);
    const data = series[0]?.data || [];
    data.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        wsData.push([item.name ?? '', item.value ?? '']);
      } else {
        wsData.push(['', item]);
      }
    });
  }

  // Build the worksheet
  const ws = utils.aoa_to_sheet(wsData);

  // Auto-size each column based on longest content in that column
  ws['!cols'] = wsData[0].map((_, colIdx) => ({
    wch: Math.max(...wsData.map((row) => String(row[colIdx] ?? '').length)) + 4,
  }));

  // Bold the header row
  const headerRange = utils.decode_range(ws['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddr = utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = { font: { bold: true } };
  }

  // Create workbook, append sheet, save
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Chart Data');
  writeFile(wb, filename);
}
