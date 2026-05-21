import React from 'react';
import { Check, Circle, ChevronRight } from 'lucide-react';
import { buildHierarchySteps } from '../../utils/drillDepth';
import './DrillHierarchyStrip.css';

export default function DrillHierarchyStrip({
  dimensions = [],
  drillPath = [],
  onJumpToDepth,
}) {
  const steps = buildHierarchySteps(dimensions, drillPath);

  if (!steps.length) return null;

  return (
    <div className="drill-hierarchy-strip" role="navigation" aria-label="Hierarchy depth">
      <div className="drill-hierarchy-track">
        {steps.map((step, idx) => (
          <React.Fragment key={`${step.column}-${idx}`}>
            {idx > 0 && (
              <ChevronRight size={14} className="drill-hierarchy-chevron" aria-hidden />
            )}
            <button
              type="button"
              className={`drill-hierarchy-step drill-hierarchy-step--${step.status}`}
              onClick={() => {
                if (step.status === 'completed' && onJumpToDepth) {
                  onJumpToDepth(step.depthIndex + 1);
                }
              }}
              disabled={step.status !== 'completed'}
              title={
                step.value
                  ? `${step.label}: ${step.value}`
                  : `Level ${idx + 1}: ${step.label}`
              }
            >
              <span className="drill-hierarchy-step-icon">
                {step.status === 'completed' ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <Circle size={10} />
                )}
              </span>
              <span className="drill-hierarchy-step-label">{step.label}</span>
              {step.value && (
                <span className="drill-hierarchy-step-value">{step.value}</span>
              )}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
