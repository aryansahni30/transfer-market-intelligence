export default function ConfidenceNote() {
  return (
    <div
      className="text-xs rounded-lg px-4 py-3"
      style={{ background: "var(--surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
    >
      <strong style={{ color: "var(--accent-amber)" }}>Model caveats:</strong> Median absolute error ≈68%. Predictions
      systematically underestimate record-breaking fees (Neymar-style outliers). Ranking Jaccard ≈0.42 across
      bootstrap runs — treat rankings as directional signals, not exact truth. Tier-1 clubs show highest
      uncertainty (p90 error ≈€16M). See VALIDATION_REPORT.md for full diagnostics.
    </div>
  );
}
