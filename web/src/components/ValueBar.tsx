import { fmtEur } from "@/lib/api";

interface ValueBarProps {
  predicted: number | null;
  actual: number | null;
  market: number | null;
}

export default function ValueBar({ predicted, actual, market }: ValueBarProps) {
  const values = [predicted, actual, market].filter((v): v is number => v != null);
  if (values.length === 0) return null;

  const max = Math.max(...values) * 1.1;

  const bar = (value: number | null, color: string, label: string) => {
    if (value == null) return null;
    const pct = (value / max) * 100;
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="w-32 shrink-0 text-right" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <div className="flex-1 rounded-full h-4 overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className="w-20 shrink-0 font-mono text-xs">{fmtEur(value)}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {bar(predicted, "var(--accent-blue)", "Fair Value")}
      {bar(actual, "var(--accent-amber)", "Transfer Fee")}
      {bar(market, "var(--text-secondary)", "Market Value")}
    </div>
  );
}
