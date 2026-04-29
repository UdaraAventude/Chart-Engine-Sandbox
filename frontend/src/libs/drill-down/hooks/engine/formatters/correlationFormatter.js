export function computeCorrelationData(rows, drillPath, metrics, filterRows) {
  if (!metrics || metrics.length < 2) {
    return { columns: [], matrix: [] };
  }

  const filtered = filterRows(rows, drillPath);
  if (filtered.length === 0) {
    return { columns: metrics, matrix: [] };
  }

  // Pre-parse numeric columns for performance
  const data = metrics.map(metric => {
    return filtered.map(row => Number(row[metric]) || 0);
  });

  const n = filtered.length;
  const matrix = [];

  for (let i = 0; i < metrics.length; i++) {
    for (let j = 0; j <= i; j++) {
      const x = data[i];
      const y = data[j];
      
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
      for (let k = 0; k < n; k++) {
        sumX += x[k];
        sumY += y[k];
        sumXY += x[k] * y[k];
        sumX2 += x[k] * x[k];
        sumY2 += y[k] * y[k];
      }

      const numerator = n * sumXY - sumX * sumY;
      const denomX = n * sumX2 - sumX * sumX;
      const denomY = n * sumY2 - sumY * sumY;

      let r = 0;
      if (denomX > 0 && denomY > 0) {
        r = numerator / Math.sqrt(denomX * denomY);
      }

      // Format to 2 decimal places
      const value = Number(r.toFixed(2));

      matrix.push({ x: metrics[i], y: metrics[j], value });
      if (i !== j) {
        matrix.push({ x: metrics[j], y: metrics[i], value });
      }
    }
  }

  return { columns: metrics, matrix };
}
