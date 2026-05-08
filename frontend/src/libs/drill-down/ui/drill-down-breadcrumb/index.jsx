import React from 'react';
import { ChevronRight, Home, CornerLeftUp } from 'lucide-react';
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
      <div className='breadcrumb-trail'>
        <button
          onClick={() => onNavigate(0)}
          className={`breadcrumb-btn ${atRoot ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Home size={14} />
          Overview
        </button>

        {drillPath.map((step, idx) => {
          const isLast = idx === drillPath.length - 1;
          const colLabel = step.column.startsWith('__hist__')
            ? step.column.slice('__hist__'.length).replace(/_/g, ' ') + ' range'
            : step.column.replace(/_/g, ' ');
            
          return (
            <div key={idx} className="breadcrumb-item">
              <ChevronRight size={14} className='breadcrumb-sep' />
              <button
                onClick={() => onNavigate(idx + 1)}
                className={`breadcrumb-btn ${isLast ? 'active' : ''}`}
              >
                <span style={{ opacity: 0.7, marginRight: '4px' }}>{colLabel}:</span>
                <span>{step.value}</span>
              </button>
            </div>
          );
        })}

        <div className={`rows-badge active`}>
          <span>
            {rowCount?.toLocaleString() || totalRows?.toLocaleString() || 0}{' '}
            Records
          </span>
        </div>
        
        {!atRoot && (
          <button 
            className="export-btn" 
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => onNavigate(drillPath.length - 1)}
          >
            <CornerLeftUp size={12} />
            Go Up
          </button>
        )}
      </div>
    </div>
  );
};

export default DrillDownBreadcrumb;

