import React, { useMemo } from 'react';
import SunburstChart from '../../../../components/sunburst-chart';
import { formatForChart } from '../../hooks/engine';

export default function SunburstAdapter({
    currentNode,
    rows,
    drillPath,
    metrics,
    dimensions,
    atLeaf,
    title,
    handleClick,
    onChartReady,
    drillInto,
    drillBackTo
}) {

    const sunburstData = useMemo(() => {
        return formatForChart(currentNode, 'sunburst', rows, drillPath, metrics, dimensions);
    }, [currentNode, rows, drillPath, metrics, dimensions]);

    if (!sunburstData || sunburstData.length === 0) {
        return (
            <div className='empty-state flex items-center justify-center h-full text-gray-500'>
                No data to display in Sunburst chart.
            </div>
        );
    }

    return (
        <SunburstChart
            data={sunburstData}
            measureCol={metrics[0] ?? ''}
            aggregationMethod='avg'
            title={title}
            drillPath={drillPath}
            maxDepth={dimensions.length}
            height='100%'
            onNodeClick={(name) => handleClick(name)}
            onCenterClick={() => drillBackTo(Math.max(0, drillPath.length - 1))}
            onChartReady={onChartReady}
        />
    );
}
