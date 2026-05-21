import React, { useEffect } from 'react';
import { X, Home, CornerLeftUp } from 'lucide-react';
import { formatColumnLabel } from '../../utils/drillDepth';
import './DrillPathModal.css';

export default function DrillPathModal({
  open,
  onClose,
  drillPath = [],
  dimensions = [],
  totalRows = 0,
  rowCount = 0,
  onNavigate,
  onGoUp,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drill-path-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="drill-path-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="drill-path-modal-title"
        aria-modal="true"
      >
        <header className="drill-path-modal-header">
          <div>
            <h2 id="drill-path-modal-title">Exploration path</h2>
            <p className="drill-path-modal-sub">
              {rowCount.toLocaleString()} of {totalRows.toLocaleString()} records in this
              slice
            </p>
          </div>
          <button type="button" className="drill-path-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="drill-path-modal-body">
          <button
            type="button"
            className="drill-path-modal-row"
            onClick={() => {
              onNavigate(0);
              onClose();
            }}
          >
            <Home size={16} />
            <span>Overview (root)</span>
          </button>

          {drillPath.map((step, idx) => (
            <button
              key={`${step.column}-${step.value}-${idx}`}
              type="button"
              className="drill-path-modal-row drill-path-modal-row--active"
              onClick={() => {
                onNavigate(idx + 1);
                onClose();
              }}
            >
              <span className="drill-path-modal-level">Level {idx + 1}</span>
              <span className="drill-path-modal-dim">{formatColumnLabel(step.column)}</span>
              <span className="drill-path-modal-val">{step.value}</span>
            </button>
          ))}

          {dimensions.length > 0 && (
            <section className="drill-path-modal-schema">
              <h3>Hierarchy order</h3>
              <ol>
                {dimensions.map((dim) => (
                  <li key={dim}>{formatColumnLabel(dim)}</li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <footer className="drill-path-modal-footer">
          {drillPath.length > 0 && (
            <button
              type="button"
              className="drill-path-modal-btn secondary"
              onClick={() => {
                onGoUp();
                onClose();
              }}
            >
              <CornerLeftUp size={16} />
              Go up one level
            </button>
          )}
          <button type="button" className="drill-path-modal-btn primary" onClick={onClose}>
            Continue exploring
          </button>
        </footer>
      </div>
    </div>
  );
}
