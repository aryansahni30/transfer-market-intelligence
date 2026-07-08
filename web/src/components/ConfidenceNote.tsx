export default function ConfidenceNote() {
  return (
    <div
      className="text-xs rounded px-4 py-3 flex gap-2"
      style={{
        background: "var(--panel)",
        color: "var(--text-secondary)",
        border: "1px solid var(--hairline)",
      }}
    >
      <span style={{ color: "var(--gold)", fontWeight: 600, whiteSpace: "nowrap" }}>CAVEAT</span>
      <span>
        Median absolute error ≈68%. Predictions systematically underestimate record-breaking fees
        (Neymar-style outliers). Ranking Jaccard ≈0.42 across bootstrap runs — treat rankings as
        directional signals, not exact truth. Tier-1 clubs show highest uncertainty (p90 error ≈€16M).
        See VALIDATION_REPORT.md for full diagnostics.
      </span>
    </div>
  );
}
