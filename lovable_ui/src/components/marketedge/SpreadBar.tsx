import { fmtEur } from "@/lib/format";

interface Props {
  low: number;
  mid: number;
  high: number;
  domainMin: number;
  domainMax: number;
  marketValue?: number;
  actualFee?: number;
  compact?: boolean;
  showLabels?: boolean;
}

// Horizontal spread bar: translucent band = predicted range,
// tick = midpoint, diamond = market value, filled circle = actual fee.
export function SpreadBar({
  low, mid, high, domainMin, domainMax,
  marketValue, actualFee, compact = false, showLabels = true,
}: Props) {
  const range = domainMax - domainMin || 1;
  const pct = (v: number) => `${((v - domainMin) / range) * 100}%`;

  return (
    <div className={compact ? "w-full" : "w-full space-y-1.5"}>
      <div className="relative h-2.5 w-full rounded-sm bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
        {/* fair range band */}
        <div
          className="absolute inset-y-0 rounded-sm bg-[color:var(--edge-pos)]/25 ring-1 ring-[color:var(--edge-pos)]/40"
          style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }}
        />
        {/* midpoint tick */}
        <div
          className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--edge-pos)]"
          style={{ left: pct(mid) }}
        />
        {/* market value marker (diamond) */}
        {typeof marketValue === "number" && marketValue > 0 && (
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/70 bg-transparent"
            style={{ left: pct(marketValue) }}
            title={`Market value ${fmtEur(marketValue)}`}
          />
        )}
        {/* actual fee marker (filled circle) */}
        {typeof actualFee === "number" && (
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--edge-neg)] ring-2 ring-background"
            style={{ left: pct(actualFee) }}
            title={`Actual fee ${fmtEur(actualFee)}`}
          />
        )}
      </div>
      {showLabels && (
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>{fmtEur(domainMin)}</span>
          <span>{fmtEur(domainMax)}</span>
        </div>
      )}
    </div>
  );
}
