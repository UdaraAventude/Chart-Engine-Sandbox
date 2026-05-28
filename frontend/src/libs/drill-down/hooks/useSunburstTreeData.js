import { useEffect, useState } from "react";
import useStore from "../../../store";
import { getVisualization } from "../../../services/api/documents";
import { normalizeServerChartData } from "../../../services/api/normalizeChartData";
import { formatSunburstData } from "./engine/formatters/sunburstFormatter";
import { serverNormalizedToSunburstChildren } from "../utils/sunburstTree";

const SUNBURST_CHILD_LIMIT = 80;

/**
 * Sunburst uses one stable hierarchy (client tree or one-time server fetch).
 * Drill only updates drillPath + ECharts rootToNode — no per-level API refetch.
 */
export function useSunburstTreeData(aggregation, metrics) {
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const tree = useStore((s) => s.globalData?.tree);
  const primaryMetric = metrics?.[0] ?? "";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tree) {
      setData(formatSunburstData(tree, SUNBURST_CHILD_LIMIT, aggregation, primaryMetric));
      setLoading(false);
      setError(null);
      return undefined;
    }

    if (!activeDatasetId) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await getVisualization({
          id: activeDatasetId,
          chartType: "sunburst",
          drillPath: [],
          aggregation,
          drillDown: 0,
        });

        if (cancelled) return;

        const normalized = normalizeServerChartData(
          response.chartType || "sunburst",
          response.data,
        );
        setData(serverNormalizedToSunburstChildren(normalized));
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load sunburst hierarchy");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDatasetId, tree, aggregation, primaryMetric]);

  return { data, loading, error };
}
