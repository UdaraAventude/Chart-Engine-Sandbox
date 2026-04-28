import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useRenderingEngine } from '../../hooks/useRenderingEngine';

export const UniversalChartRenderer = ({ config, rawData }) => {
  const { chartOption } = useRenderingEngine({ data: rawData, config });

  return (
    <div
      style={{
        height: '500px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      {Object.keys(chartOption).length > 0 ? (
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
          }}
        >
          Configuring Rendering Engine...
        </div>
      )}
    </div>
  );
};
