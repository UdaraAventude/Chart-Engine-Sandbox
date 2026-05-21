function triggerDownload(dataURL, filename) {
  const anchor = document.createElement("a");
  anchor.href = dataURL;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function exportToPNG(echartsInstance, filename = "chart.png") {
  if (!echartsInstance) {
    console.error("[ExportService] No ECharts instance provided.");
    return;
  }

  const dataURL = echartsInstance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    excludeComponents: ["toolbox"],
  });

  if (dataURL.startsWith("data:image/png")) {
    triggerDownload(dataURL, filename);
    return;
  }

  if (dataURL.startsWith("data:image/svg+xml")) {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = img.width * 2;
      canvas.height = img.height * 2;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);

      triggerDownload(canvas.toDataURL("image/png"), filename);
    };

    img.src = dataURL;
    return;
  }

  console.error("[ExportService] Unexpected data URL format returned.");
}

export function exportToSVG(echartsInstance, filename = "chart.svg") {
  if (!echartsInstance) {
    console.error("[ExportService] No ECharts instance provided.");
    return;
  }

  const dataURL = echartsInstance.getDataURL({
    type: "svg",
    excludeComponents: ["toolbox"],
  });

  if (!dataURL.startsWith("data:image/svg")) {
    console.error(
      "[ExportService] SVG export failed. The chart was not initialised " +
        'with renderer: "svg". Switch the renderer or use PNG instead.',
    );
    return;
  }

  triggerDownload(dataURL, filename);
}

export async function exportToPDF(
  echartsInstance,
  filename = "chart.pdf",
  headerText = "",
) {
  if (!echartsInstance) {
    console.error("[ExportService] No ECharts instance provided.");
    return;
  }

  const { jsPDF } = await import("jspdf");

  const dataURL = echartsInstance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    excludeComponents: ["toolbox"],
  });

  const buildPDF = (pngDataURL) => {
    const dom = echartsInstance.getDom();
    const { width, height } = dom.getBoundingClientRect();
    const aspectRatio = height / width;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;

    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2 - 10;

    let drawW = usableW;
    let drawH = drawW * aspectRatio;

    if (drawH > usableH) {
      drawH = usableH;
      drawW = drawH / aspectRatio;
    }

    const x = (pageW - drawW) / 2;
    const y = margin + 10 + (usableH - drawH) / 2;

    if (headerText) {
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(headerText, margin, margin + 5);
      pdf.setDrawColor(200);
      pdf.line(margin, margin + 8, pageW - margin, margin + 8);
    }

    pdf.addImage(pngDataURL, "PNG", x, y, drawW, drawH);
    pdf.save(filename);
  };

  if (dataURL.startsWith("data:image/png")) {
    buildPDF(dataURL);
    return;
  }

  if (dataURL.startsWith("data:image/svg+xml")) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);

      buildPDF(canvas.toDataURL("image/png"));
    };
    img.src = dataURL;
    return;
  }

  console.error("[ExportService] Unexpected data URL format for PDF export.");
}

export function exportToCSV(
  echartsInstance,
  filename = "chart-data.csv",
  dimensionName = "Name",
  headerText = "",
) {
  if (!echartsInstance) {
    console.error("[ExportService] No ECharts instance provided.");
    return;
  }

  const option = echartsInstance.getOption();
  const series = option.series || [];
  const xAxisData = option.xAxis?.[0]?.data || [];

  let rows = [];

  if (headerText) {
    rows.push([headerText]);
    rows.push([]);
  }

  if (xAxisData.length > 0) {
    const xAxisName = option.xAxis?.[0]?.name || "Category";
    const headers = [
      xAxisName,
      ...series.map((s, i) => s.name || `Series ${i + 1}`),
    ];
    rows.push(headers);

    xAxisData.forEach((label, i) => {
      const row = [
        label,
        ...series.map((s) => {
          const val = s.data?.[i];
          return typeof val === "object" && val !== null
            ? (val.value ?? "")
            : (val ?? "");
        }),
      ];
      rows.push(row);
    });
  } else {
    const valueHeader = series[0]?.name || "Value";
    const headers = [dimensionName, valueHeader];
    rows.push(headers);

    const data = series[0]?.data || [];
    data.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        rows.push([item.name ?? "", item.value ?? ""]);
      } else {
        rows.push(["", item]);
      }
    });
  }

  const csvContent = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportToExcel(
  echartsInstance,
  filename = "chart-data.xlsx",
  dimensionName = "Name",
  headerText = "",
) {
  if (!echartsInstance) {
    console.error("[ExportService] No ECharts instance provided.");
    return;
  }

  const { Workbook } = await import("exceljs");

  const option = echartsInstance.getOption();
  const series = option.series || [];
  const xAxisData = option.xAxis?.[0]?.data || [];

  let wsData = [];

  if (headerText) {
    wsData.push([headerText]);
    wsData.push([]);
  }

  if (xAxisData.length > 0) {
    const xAxisName = option.xAxis?.[0]?.name || "Category";
    const headers = [
      xAxisName,
      ...series.map((s, i) => s.name || `Series ${i + 1}`),
    ];
    wsData.push(headers);

    xAxisData.forEach((label, i) => {
      const row = [
        label,
        ...series.map((s) => {
          const val = s.data?.[i];
          return typeof val === "object" && val !== null
            ? (val.value ?? "")
            : (val ?? "");
        }),
      ];
      wsData.push(row);
    });
  } else {
    const valueHeader = series[0]?.name || "Value";
    wsData.push([dimensionName, valueHeader]);
    const data = series[0]?.data || [];
    data.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        wsData.push([item.name ?? "", item.value ?? ""]);
      } else {
        wsData.push(["", item]);
      }
    });
  }

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Chart Data");

  wsData.forEach((row) => {
    worksheet.addRow(row);
  });

  const maxColumns = Math.max(...wsData.map((row) => row.length), 0);
  worksheet.columns = Array.from({ length: maxColumns }, (_, colIdx) => ({
    width:
      Math.max(...wsData.map((row) => String(row[colIdx] ?? "").length), 0) + 4,
  }));

  const headerRowIndex = headerText ? 2 : 0;
  const headerRow = worksheet.getRow(headerRowIndex + 1);
  headerRow.eachCell((cell) => {
    cell.font = { ...(cell.font || {}), bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  try {
    triggerDownload(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
