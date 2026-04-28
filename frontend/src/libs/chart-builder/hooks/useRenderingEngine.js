import { useState, useEffect } from 'react';

// Transformer for Heat Map (Exception Chart)
const transformToHeatMapData = (rawData, xAxisCol, yAxisCol) => {
  const xMap = new Map();
  const yMap = new Map();
  const cells = new Map();

  // 1. Extract unique categories and bin the data
  rawData.forEach((row) => {
    const xVal = String(row[xAxisCol] ?? 'Unknown');
    const yVal = String(row[yAxisCol] ?? 'Unknown');

    if (!xMap.has(xVal)) xMap.set(xVal, xMap.size);
    if (!yMap.has(yVal)) yMap.set(yVal, yMap.size);

    const key = `${xVal}|${yVal}`;
    cells.set(key, (cells.get(key) || 0) + 1);
  });

  const xCategories = Array.from(xMap.keys());
  const yCategories = Array.from(yMap.keys());

  // 2. Format to Cartesian array [[xIndex, yIndex, value]]
  const heatMapData = [];
  let maxVal = 0;

  cells.forEach((count, key) => {
    const [xVal, yVal] = key.split('|');
    const xIdx = xMap.get(xVal);
    const yIdx = yMap.get(yVal);
    heatMapData.push([xIdx, yIdx, count]);
    if (count > maxVal) maxVal = count;
  });

  return { xCategories, yCategories, heatMapData, maxVal };
};

// Transformer for Standard Charts (Universal Format)
const transformToUniversalData = (rawData, xAxisCol, yAxisCol) => {
  // We group by X axis to prevent 200,000 overlapping DOM elements on preview
  const grouped = {};
  rawData.forEach((row) => {
    const xVal = String(row[xAxisCol] ?? 'Unknown');
    const yVal = parseFloat(row[yAxisCol]);

    if (!isNaN(yVal)) {
      if (!grouped[xVal]) grouped[xVal] = { sum: 0, count: 0 };
      grouped[xVal].sum += yVal;
      grouped[xVal].count += 1;
    }
  });

  const datasetSource = [
    [xAxisCol, yAxisCol], // Row 0: Headers
  ];

  // Row 1-N: Aggregated Data (Average)
  const sortedEntries = Object.entries(grouped)
    .map(([k, v]) => [k, Math.round(v.sum / v.count)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15); // Limit for preview readability

  datasetSource.push(...sortedEntries);
  return datasetSource;
};

export const useRenderingEngine = ({ data, config }) => {
  const [chartOption, setChartOption] = useState({});

  useEffect(() => {
    if (!data || data.length === 0 || !config.xAxis || !config.yAxis) {
      setChartOption({
        title: {
          text: config.title || 'Chart Preview',
          left: 'center',
          textStyle: { color: '#94a3b8' },
        },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
      });
      return;
    }

    let generatedOption = {};

    switch (config.chartType) {
      // ----------------------------------------------------
      // EXCEPTION CHART: Heat Map
      // Needs specialized transformer logic
      // ----------------------------------------------------
      case 'heatmap': {
        const { xCategories, yCategories, heatMapData, maxVal } =
          transformToHeatMapData(data, config.xAxis, config.yAxis);

        generatedOption = {
          title: {
            text: config.title || 'Heat Map Preview',
            left: 'center',
            top: 10,
          },
          tooltip: { position: 'top' },
          grid: {
            top: 60,
            bottom: 60,
            left: 60,
            right: 40,
            containLabel: true,
          },
          xAxis: {
            type: 'category',
            data: xCategories,
            splitArea: { show: true },
            axisLabel: { rotate: 30 },
          },
          yAxis: {
            type: 'category',
            data: yCategories,
            splitArea: { show: true },
          },
          visualMap: {
            min: 0,
            max: maxVal,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '0%',
            inRange: { color: ['#ebf4ff', '#2563eb', '#1e3a8a'] },
          },
          series: [
            {
              name: 'Density',
              type: 'heatmap',
              data: heatMapData,
              label: { show: true },
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
            },
          ],
        };
        break;
      }

      // ----------------------------------------------------
      // STANDARD CHARTS: Bar, Line, Scatter, Pie
      // Uses the Universal 2D Matrix Format and "encode"
      // ----------------------------------------------------
      case 'bar':
      case 'line':
      case 'scatter':
      case 'pie':
      default: {
        const datasetSource = transformToUniversalData(
          data,
          config.xAxis,
          config.yAxis,
        );

        generatedOption = {
          title: {
            text: config.title || 'Chart Preview',
            left: 'center',
            top: 10,
            textStyle: { color: '#1e293b', fontWeight: 'bold' },
          },
          tooltip: { trigger: config.chartType === 'pie' ? 'item' : 'axis' },
          dataset: { source: datasetSource },
          grid: {
            top: 60,
            bottom: 60,
            left: 60,
            right: 40,
            containLabel: true,
          },
          xAxis:
            config.chartType === 'pie'
              ? undefined
              : { type: 'category', axisLabel: { rotate: 30 } },
          yAxis: config.chartType === 'pie' ? undefined : { type: 'value' },
          series: [
            {
              type: config.chartType,
              encode: {
                x: config.xAxis,
                y: config.yAxis,
                itemName: config.xAxis,
                value: config.yAxis,
              },
              itemStyle: {
                borderRadius: config.chartType === 'bar' ? [4, 4, 0, 0] : 0,
                color: config.chartType === 'pie' ? undefined : '#2563eb',
              },
              smooth: true,
              symbolSize: config.chartType === 'scatter' ? 12 : 8,
              radius: config.chartType === 'pie' ? ['40%', '70%'] : undefined,
            },
          ],
          animationDuration: 500,
        };
        break;
      }
    }

    setChartOption(generatedOption);
  }, [data, config]);

  return { chartOption };
};
