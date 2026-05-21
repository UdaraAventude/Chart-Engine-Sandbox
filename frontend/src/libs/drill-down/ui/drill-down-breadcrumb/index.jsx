import React from 'react';
import { ChevronRight, Home, CornerLeftUp, ListTree } from 'lucide-react';
import { formatColumnLabel } from '../../utils/drillDepth';
import '../../../../styles/DrillDown.css';

const DrillDownBreadcrumb = ({
  drillPath,
  onNavigate,
  rowCount,
  totalRows,
  onOpenPathModal,
}) => {
  const atRoot = drillPath.length === 0;

  return (
    <div className="drill-path-bar">
      <div className="drill-path-bar-trail">
        <button
          type="button"
          onClick={() => onNavigate(0)}
          className={`drill-path-chip ${atRoot ? 'drill-path-chip--active' : ''}`}
        >
          <Home size={14} />
          <span>Overview</span>
        </button>

        {drillPath.map((step, idx) => {
          const isLast = idx === drillPath.length - 1;
          return (
            <React.Fragment key={`${step.column}-${step.value}-${idx}`}>
              <ChevronRight size={14} className="drill-path-sep" aria-hidden />
              <button
                type="button"
                onClick={() => onNavigate(idx + 1)}
                className={`drill-path-chip ${isLast ? 'drill-path-chip--active' : ''}`}
              >
                <span className="drill-path-chip-dim">{formatColumnLabel(step.column)}</span>
                <span className="drill-path-chip-val">{step.value}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="drill-path-bar-actions">
        <span className="drill-record-badge" title="Records in current slice">
          {(rowCount ?? totalRows ?? 0).toLocaleString()} records
        </span>

        {drillPath.length > 0 && (
          <>
            <button
              type="button"
              className="drill-path-action-btn"
              onClick={() => onNavigate(drillPath.length - 1)}
            >
              <CornerLeftUp size={14} />
              Up
            </button>
            <button
              type="button"
              className="drill-path-action-btn drill-path-action-btn--outline"
              onClick={onOpenPathModal}
            >
              <ListTree size={14} />
              Path
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DrillDownBreadcrumb;
