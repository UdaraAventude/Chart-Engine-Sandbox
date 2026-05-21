import React from 'react';
import { Info } from 'lucide-react';
import { formatDimensionList } from '../../utils/hierarchyModel';
import './HierarchyScopeNotice.css';

/**
 * Explains columns that exist in the file but are outside the drill hierarchy (large-file tree limit).
 */
export default function HierarchyScopeNotice({ depthCtx }) {
  if (!depthCtx?.hasFilterOnly) return null;

  const { treeDepth, schemaDepth, filterOnlyDimensions } = depthCtx;
  const extra = formatDimensionList(filterOnlyDimensions);

  return (
    <div className="hierarchy-scope-notice" role="note">
      <Info size={16} aria-hidden />
      <div>
        <strong>Drill hierarchy: {treeDepth} of {schemaDepth} columns</strong>
        <p>
          This dataset was indexed with {treeDepth} drill levels for performance ({treeDepth === 4 ? 'typical for 1M+ rows' : 'row-count limit'}).
          The chart drills through{' '}
          <em>{depthCtx.drillableDimensions.map((d) => d.replace(/_/g, ' ')).join(' → ')}</em>
          {extra ? (
            <>
              . <span className="hierarchy-scope-notice-extra">Not in drill path: {extra}</span> (use export or a smaller file to explore those breakdowns).
            </>
          ) : (
            '.'
          )}
        </p>
      </div>
    </div>
  );
}
