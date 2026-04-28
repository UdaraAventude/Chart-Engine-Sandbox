import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wand2 } from 'lucide-react';
import useStore from '../../../../store';
import { ConfigInput } from '../../ui/config-input';
import { AxisSelector } from '../../ui/axis-selector';
import { ChartTypeSelector } from '../../ui/chart-type-selector';
import { UniversalChartRenderer } from '../../ui/universal-chart-renderer';

const ChartBuilderPage = () => {
  const { globalData, error } = useStore();
  const dataset = globalData?.rows ?? null;

  const [config, setConfig] = useState({
    title: 'Custom Universal Chart',
    chartType: 'bar',
    xAxis: 'department',
    yAxis: 'monthly_salary',
  });

  const handleChange = (key, value) => {
    setConfig((prev) => {
      const newConfig = { ...prev, [key]: value };
      console.log(`[ChartBuilder] Config Updated:`, newConfig);
      return newConfig;
    });
  };

  const availableColumns = useMemo(() => {
    if (!dataset || dataset.length === 0)
      return { dimensions: [], metrics: [] };
    const firstRow = dataset[0] || {};
    const cols = Object.keys(firstRow);

    const metrics = cols.filter((col) => {
      const val = parseFloat(firstRow[col]);
      return !isNaN(val);
    });

    const dimensions = cols.filter((col) => !metrics.includes(col));

    const forceDimensions = [
      'seniority_level',
      'education_level',
      'overall_satisfaction',
    ];
    forceDimensions.forEach((fd) => {
      if (cols.includes(fd) && !dimensions.includes(fd)) {
        dimensions.push(fd);
      }
    });

    return { dimensions, metrics };
  }, [dataset]);

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      <header
        style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <Link
          to='/'
          style={{
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1
            style={{
              fontSize: '24px',
              color: '#0f172a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Wand2 size={24} color='#2563eb' />
            Universal Chart Builder
          </h1>
          <p
            style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}
          >
            Configure visualizations using the universal JSON dataset format.
          </p>
        </div>
      </header>

      {error && <div className='error-banner'>{error}</div>}

      {!globalData ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            backgroundColor: 'white',
            borderRadius: '12px',
          }}
        >
          <h2 style={{ fontSize: '20px', color: '#1e293b' }}>
            No Dataset Loaded
          </h2>
          <p style={{ color: '#64748b' }}>
            Please go back to the home page and upload a dataset first.
          </p>
          <Link
            to='/'
            style={{
              display: 'inline-block',
              marginTop: '16px',
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Return Home
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* LEFT PANEL: The Builder Controls */}
          <div
            style={{
              flex: '1 1 300px',
              maxWidth: '400px',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: '24px',
                color: '#1e293b',
                fontSize: '16px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
              }}
            >
              Configuration Payload
            </h3>

            <ConfigInput
              name='title'
              label='Chart Title'
              value={config.title}
              onChange={(val) => handleChange('title', val)}
            />

            <ChartTypeSelector
              value={config.chartType}
              onChange={(val) => handleChange('chartType', val)}
            />

            <AxisSelector
              name='xAxis'
              label='X-Axis Dimension'
              value={config.xAxis}
              onChange={(val) => handleChange('xAxis', val)}
              options={availableColumns.dimensions}
            />

            <AxisSelector
              name='yAxis'
              label='Y-Axis Metric'
              value={config.yAxis}
              onChange={(val) => handleChange('yAxis', val)}
              options={availableColumns.metrics}
            />

            <div
              style={{
                marginTop: '32px',
                padding: '16px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#334155',
              }}
            >
              <strong>Current JSON Config:</strong>
              <pre style={{ margin: '8px 0 0 0', overflowX: 'auto' }}>
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>

          {/* RIGHT PANEL: The Renderer */}
          <div style={{ flex: '2 1 600px' }}>
            <UniversalChartRenderer config={config} rawData={dataset} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartBuilderPage;
