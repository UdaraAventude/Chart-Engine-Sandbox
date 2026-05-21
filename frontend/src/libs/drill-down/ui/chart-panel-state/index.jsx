import React from 'react';
import { Loader2, BarChart3, AlertCircle, MousePointerClick } from 'lucide-react';
import './ChartPanelState.css';

export function ChartLoadingState() {
  return (
    <div className="chart-panel-state chart-panel-state--loading">
      <Loader2 size={32} className="chart-panel-spin" />
      <p>Loading visualization…</p>
    </div>
  );
}

export function ChartErrorState({ message, onRetry }) {
  return (
    <div className="chart-panel-state chart-panel-state--error">
      <AlertCircle size={36} strokeWidth={1.5} />
      <h3>Could not load chart</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="chart-panel-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function ChartEmptyState({ title, hint, canDrill }) {
  return (
    <div className="chart-panel-state chart-panel-state--empty">
      <BarChart3 size={40} strokeWidth={1.2} color="var(--text-light)" />
      <h3>{title || 'No data at this level'}</h3>
      <p>{hint || 'Try going up a level or changing aggregation.'}</p>
      {canDrill && (
        <p className="chart-panel-hint">
          <MousePointerClick size={14} />
          Click a bar or segment to drill deeper
        </p>
      )}
    </div>
  );
}

export function hasNormalizedChartData(chartType, normalized) {
  if (normalized == null) return false;
  if (chartType === 'scatter' || chartType === 'bubble' || chartType === 'correlation') {
    return Boolean(normalized.rawData?.length);
  }
  if (chartType === 'heatmap') {
    return Boolean(normalized.cells?.length);
  }
  if (chartType === 'multiline') {
    return Boolean(normalized.xAxisLabels?.length);
  }
  if (chartType === 'histogram') {
    return Boolean(normalized.labels?.length);
  }
  if (chartType === 'sunburst') {
    return Array.isArray(normalized) ? normalized.length > 0 : Boolean(normalized?.children);
  }
  return Array.isArray(normalized) && normalized.length > 0;
}
