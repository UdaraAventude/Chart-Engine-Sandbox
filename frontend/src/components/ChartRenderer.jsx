import React, { useEffect, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Plot from 'react-plotly.js';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import {
  buildScatterPlus, buildBubble, buildHeatmap,
  buildCorrelationMatrix, buildHistogram, buildMultiLine,
  buildCorrelationFromAggregation, buildHistogramFromAggregation, 
  buildMultiLineFromAggregation, buildBubbleFromAggregation
} from './ComplexCharts';
import D3Renderer from './D3Renderer';
import useStore from '../store/useStore';

const ChartRenderer = () => {
  const { dataset, chartConfig, selectedLibrary, setRenderTime, chartTypeOverride, aggregations } = useStore();
  const renderStartRef = useRef(null);
  const isMeasuring = useRef(false);

  const overrideOption = useMemo(() => {
    if (!chartTypeOverride || !dataset) return null;
    const xCol = chartConfig?.x_axis;
    const yCol = chartConfig?.y_axis;

    switch (chartTypeOverride) {
      case 'scatter_enhanced': 
        return buildScatterPlus(dataset, xCol, yCol);
      case 'bubble':           
        return aggregations?.bubble
          ? buildBubbleFromAggregation(aggregations.bubble)
          : buildBubble(dataset, chartConfig);
      case 'heatmap':          
        return buildHeatmap(dataset, aggregations?.heatmap);
      case 'correlation':      
        return aggregations?.correlation 
          ? buildCorrelationFromAggregation(aggregations.correlation)
          : buildCorrelationMatrix(dataset);
      case 'histogram':        
        return aggregations?.histogram
          ? buildHistogramFromAggregation(aggregations.histogram)
          : buildHistogram(dataset, xCol);
      case 'multiline':        
        return aggregations?.timeseries
          ? buildMultiLineFromAggregation(aggregations.timeseries)
          : buildMultiLine(dataset);
      default: return null;
    }
  }, [chartTypeOverride, dataset, chartConfig, aggregations]);


  // Trigger measurement start only when library or dataset changes
  useEffect(() => {
    if (dataset && selectedLibrary) {
      renderStartRef.current = performance.now();
      isMeasuring.current = true;
    }
  }, [selectedLibrary, dataset]);

  const reportTime = () => {
    if (isMeasuring.current && renderStartRef.current) {
      const duration = performance.now() - renderStartRef.current;
      isMeasuring.current = false; 
      setRenderTime(duration.toFixed(2));
    }
  };

  // Recharts specific: Uses double requestAnimationFrame to ensure the browser has committed the SVG paint
  useEffect(() => {
    if (selectedLibrary === 'recharts' && isMeasuring.current) {
      const raf = requestAnimationFrame(() => {
        const secondRaf = requestAnimationFrame(() => {
          reportTime();
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [selectedLibrary, dataset]);

  // Memoize options to prevent unnecessary re-renders
  const eChartsOption = useMemo(() => {
    if (!dataset || !chartConfig) return {};
    
    return {
      title: { text: chartConfig.title, left: 'center' },
      tooltip: { 
        trigger: 'item',
        formatter: (params) => {
          return `${chartConfig.x_axis}: ${params.value[0]}<br/>${chartConfig.y_axis}: ${params.value[1]}`;
        }
      },
      grid: { bottom: 80, top: 60, left: 60, right: 40 },
      xAxis: { 
        name: chartConfig.x_axis.charAt(0).toUpperCase() + chartConfig.x_axis.slice(1), 
        type: 'value',
        nameLocation: 'middle',
        nameGap: 35,
      },
      yAxis: { 
        name: chartConfig.y_axis.charAt(0).toUpperCase() + chartConfig.y_axis.slice(1), 
        type: 'value',
        nameLocation: 'middle',
        nameGap: 45,
      },
      dataZoom: [
        { type: 'slider', xAxisIndex: 0, bottom: 10 },
        { type: 'inside' }
      ],
      series: [
        {
          symbolSize: 10,
          type: chartConfig.chart_type === 'scatter' ? 'scatter' : 'bar',
          data: dataset.map(row => [row[chartConfig.x_axis], row[chartConfig.y_axis]]),
          itemStyle: { color: '#2563eb' }
        }
      ]
    };
  }, [dataset, chartConfig]);

  if (!dataset || !chartConfig) {
    return <div className="placeholder">Upload a CSV to see evaluation</div>;
  }

  const renderECharts = () => (
    <ReactECharts 
      option={eChartsOption} 
      onChartReady={reportTime}
      style={{ height: '480px', width: '100%' }} 
    />
  );

  const renderPlotly = () => {
    const data = [{
      x: dataset.map(row => row[chartConfig.x_axis]),
      y: dataset.map(row => row[chartConfig.y_axis]),
      type: chartConfig.chart_type === 'bar' ? 'bar' : 'scatter',
      mode: 'markers',
      marker: { 
        color: '#4169E1', 
        size: 6,
        opacity: 0.7,
        symbol: 'circle'
      },
    }];

    const layout = {
      title: chartConfig.title,
      autosize: true,
      margin: { l: 60, r: 40, b: 60, t: 60 },
      xaxis: { title: chartConfig.x_axis },
      yaxis: { title: chartConfig.y_axis },
      height: 480,
      width: undefined // Remove fixed width for better resizing
    };

    return (
      <Plot
        data={data}
        layout={layout}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler={true}
        onInitialized={reportTime}
        onUpdate={reportTime}
        style={{ width: '100%', height: '480px' }}
      />
    );
  };

  const renderRecharts = () => {
    const height = 480;
    if (chartConfig.chart_type === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey={chartConfig.x_axis} name={chartConfig.x_axis} label={{ value: chartConfig.x_axis, position: 'insideBottom', offset: -10 }} />
            <YAxis type="number" dataKey={chartConfig.y_axis} name={chartConfig.y_axis} label={{ value: chartConfig.y_axis, angle: -90, position: 'insideLeft' }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Data" data={dataset} fill="#2563eb" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }
    
    const ChartTag = chartConfig.chart_type === 'bar' ? BarChart : LineChart;
    const DataTag = chartConfig.chart_type === 'bar' ? Bar : Line;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ChartTag data={dataset} margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chartConfig.x_axis} label={{ value: chartConfig.x_axis, position: 'insideBottom', offset: -10 }} />
          <YAxis label={{ value: chartConfig.y_axis, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <DataTag dataKey={chartConfig.y_axis} fill="#2563eb" stroke="#2563eb" />
        </ChartTag>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="renderer-view">
      <div className="chart-wrapper">
        {overrideOption && selectedLibrary === 'echarts' ? (
          <ReactECharts
            option={overrideOption}
            notMerge={true}
            style={{ height: '480px', width: '100%' }}
            onChartReady={reportTime}
          />
        ) : (
          <>
            {selectedLibrary === 'echarts' && (
              <ReactECharts 
                option={eChartsOption} 
                notMerge={true}
                onChartReady={reportTime}
                style={{ height: '480px', width: '100%' }} 
              />
            )}
            {selectedLibrary === 'plotly' && renderPlotly()}
            {selectedLibrary === 'recharts' && renderRecharts()}
            {selectedLibrary === 'd3' && (
              <D3Renderer
                dataset={dataset}
                chartConfig={chartConfig}
                onRenderTime={setRenderTime}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChartRenderer;
