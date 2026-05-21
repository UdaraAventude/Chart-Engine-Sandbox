import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wand2 } from 'lucide-react';
import useStore from '../../../../store';
import { ConfigInput } from '../../ui/config-input';
import { AxisSelector } from '../../ui/axis-selector';
import { ChartTypeSelector } from '../../ui/chart-type-selector';
import { ServerBuilderPreview } from '../../ui/server-builder-preview';

const ChartBuilderPage = () => {
  const { activeDatasetId, metadata, error } = useStore();

  const [config, setConfig] = useState({
    title: 'Custom Universal Chart',
    chartType: 'bar',
    xAxis: '',
    yAxis: '',
  });

  useEffect(() => {
    if (!metadata) return;
    setConfig((prev) => ({
      ...prev,
      xAxis: prev.xAxis || metadata.dimensions?.[0] || '',
      yAxis: prev.yAxis || metadata.metrics?.[0] || '',
    }));
  }, [metadata]);

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const availableColumns = useMemo(
    () => ({
      dimensions: metadata?.dimensions ?? [],
      metrics: metadata?.metrics ?? [],
    }),
    [metadata],
  );

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
          to="/"
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
            <Wand2 size={24} color="#2563eb" />
            Universal Chart Builder
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Preview charts from the Chart Engine API using dataset metadata.
          </p>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {!activeDatasetId ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            backgroundColor: 'white',
            borderRadius: '12px',
          }}
        >
          <h2 style={{ fontSize: '20px', color: '#1e293b' }}>No Dataset Loaded</h2>
          <p style={{ color: '#64748b' }}>
            Upload or select a dataset on the home page first.
          </p>
          <Link
            to="/"
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
              Configuration
            </h3>

            <ConfigInput
              name="title"
              label="Chart Title"
              value={config.title}
              onChange={(val) => handleChange('title', val)}
            />

            <ChartTypeSelector
              value={config.chartType}
              onChange={(val) => handleChange('chartType', val)}
            />

            <AxisSelector
              name="xAxis"
              label="X-Axis Dimension"
              value={config.xAxis}
              onChange={(val) => handleChange('xAxis', val)}
              options={availableColumns.dimensions}
            />

            <AxisSelector
              name="yAxis"
              label="Y-Axis Metric"
              value={config.yAxis}
              onChange={(val) => handleChange('yAxis', val)}
              options={availableColumns.metrics}
            />

            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '16px' }}>
              Charts are rendered via GET /documents/visual at the dataset root.
              Custom axis pairs outside the tree order may differ from selection.
            </p>
          </div>

          <div
            style={{
              flex: '2 1 600px',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              minHeight: '500px',
            }}
          >
            <ServerBuilderPreview config={config} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartBuilderPage;
