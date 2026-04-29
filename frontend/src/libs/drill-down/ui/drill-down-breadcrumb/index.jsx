import React from 'react';
import { ChevronRight, Undo2 } from 'lucide-react';
import '../../../../styles/DrillDown.css';

const DrillDownBreadcrumb = ({
  drillPath,
  onNavigate,
  rowCount,
  totalRows,
}) => {
  const atRoot = drillPath.length === 0;

  return (
    <div className='breadcrumb-container'>
      {/* Breadcrumb trail */}
      <div className='breadcrumb-trail'>
        <button
          onClick={() => onNavigate(0)}
          className={`breadcrumb-btn root ${!atRoot ? 'clickable' : ''}`}
        >
          All Data
        </button>

        {drillPath.map((step, idx) => {
          // Format __hist__<col> → "<col> bin" for readability
          const colLabel = step.column.startsWith('__hist__')
            ? step.column.slice('__hist__'.length).replace(/_/g, ' ') + ' bin'
            : step.column.replace(/_/g, ' ');
          return (
            <React.Fragment key={idx}>
              <span className='breadcrumb-sep'>›</span>
              <button
                onClick={() => onNavigate(idx + 1)}
                className={`breadcrumb-btn ${idx === drillPath.length - 1 ? 'active' : 'inactive'}`}
              >
                <span className='breadcrumb-label'>{colLabel}:</span>
                <span className='breadcrumb-val'>{step.value}</span>
              </button>
            </React.Fragment>
          );
        })}

        <div className={`rows-badge ${!atRoot ? 'active' : ''}`}>
          <span className='row-count-badge'>
            {rowCount?.toLocaleString() || totalRows?.toLocaleString() || 0}{' '}
            rows
            {drillPath.length === 0 && ' (full dataset)'}
          </span>
        </div>
      </div>

      {/* Back Button */}
      {!atRoot && (
        <button
          onClick={() => onNavigate(drillPath.length - 1)}
          className='back-btn'
        >
          <Undo2 size={12} />
          Back
        </button>
      )}
    </div>
  );
};

export default DrillDownBreadcrumb;
