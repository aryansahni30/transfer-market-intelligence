import { fmtEur } from "@/lib/api";

interface ValueLedgerMarkProps {
  predicted: number | null | undefined;
  actual: number | null | undefined;
  confidence?: number;
  variant?: "live-reveal" | "static";
  dormant?: boolean;
}

/**
 * The signature MarketEdge visualization.
 * A horizontal uncertainty band with a gold tick at the model estimate
 * and a parchment circle marker at the actual fee.
 */
export default function ValueLedgerMark({
  predicted,
  actual,
  confidence = 0.7,
  variant = "static",
  dormant = false,
}: ValueLedgerMarkProps) {
  // Dormant state — empty placeholder
  if (dormant || predicted == null) {
    return (
      <div className="flex items-center gap-3">
        <div
          className="h-2 rounded-sm flex-1"
          style={{
            background: "var(--hairline)",
            opacity: 0.3,
          }}
        />
        <span
          className="text-xs"
          style={{ color: "var(--hairline)", fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums" }}
        >
          —
        </span>
      </div>
    );
  }

  const lo = predicted * 0.75;
  const hi = predicted * 1.25;
  const range = hi - lo;

  // Clamp actual position within [0, 100]%
  const actualPct =
    actual != null ? Math.min(100, Math.max(0, ((actual - lo) / range) * 100)) : null;

  // Direction
  const isUndervalued = actual != null && actual < predicted;
  const dirColor = isUndervalued ? "var(--verdigris)" : "var(--brick)";
  const dirArrow = isUndervalued ? "▲" : "▼";

  // Confidence styling
  let bandOpacity = 1;
  let bandBorder = "none";
  if (confidence < 0.45) {
    bandOpacity = 0.55;
    bandBorder = `1px dashed ${isUndervalued ? "var(--verdigris)" : "var(--brick)"}`;
  } else if (confidence < 0.7) {
    bandOpacity = 0.7;
  }

  // Gap label
  const gap = actual != null ? actual - predicted : null;
  const gapLabel =
    gap != null
      ? `${gap >= 0 ? "+" : ""}${fmtEur(gap)} vs. paid`
      : null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Band */}
      <div className="relative h-2" style={{ minWidth: 120 }}>
        {/* Track (full width baseline) */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{ background: "var(--hairline)", opacity: 0.4 }}
        />
        {/* Colored band */}
        <div
          className={variant === "live-reveal" ? "band-reveal" : ""}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "2px",
            background: isUndervalued ? "var(--verdigris)" : "var(--brick)",
            opacity: bandOpacity,
            border: bandBorder,
            animation: variant === "live-reveal" ? "band-reveal 500ms var(--ease-precise) both" : undefined,
          }}
        />
        {/* Gold tick at predicted (always center = 50%) */}
        <div
          style={{
            position: "absolute",
            top: "-3px",
            bottom: "-3px",
            left: "50%",
            width: "2px",
            marginLeft: "-1px",
            background: "var(--gold)",
            borderRadius: "1px",
          }}
        />
        {/* Parchment circle at actual fee */}
        {actualPct != null && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${actualPct}%`,
              width: "10px",
              height: "10px",
              marginTop: "-5px",
              marginLeft: "-5px",
              borderRadius: "50%",
              background: "var(--parchment)",
              border: `2px solid ${isUndervalued ? "var(--verdigris)" : "var(--brick)"}`,
              boxShadow: "0 0 0 1px var(--ink)",
            }}
          />
        )}
      </div>

      {/* Labels row */}
      {gapLabel && (
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold"
            style={{
              color: dirColor,
              fontFamily: "var(--font-ibm-plex-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {dirArrow} {gapLabel}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
          >
            {fmtEur(lo)}–{fmtEur(hi)}
          </span>
        </div>
      )}
    </div>
  );
}
