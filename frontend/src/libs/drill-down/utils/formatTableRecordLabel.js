/**
 * @param {number} displayed - rows rendered in the table
 * @param {number | null | undefined} matchingTotal - records in this drill slice (from tree / count)
 */
export function formatTableRecordLabel(displayed, matchingTotal) {
  const shown = Math.max(0, displayed);
  const total =
    typeof matchingTotal === "number" && matchingTotal > 0 ? matchingTotal : null;

  if (total != null && total > shown) {
    return `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} records`;
  }

  const word = shown === 1 ? "record" : "records";
  return `Showing ${shown.toLocaleString()} ${word}`;
}
