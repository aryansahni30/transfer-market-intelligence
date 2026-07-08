import { fmtEur } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DeltaChip({ value, className, size = "sm" }: { value: number; className?: string; size?: "sm" | "md" }) {
  const positive = value > 0;   // overpaid
  const negative = value < 0;   // underpaid / steal
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border font-mono tabular-nums tracking-tight",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-sm",
        positive && "border-[color:var(--edge-neg)]/40 bg-[color:var(--edge-neg)]/15 text-[color:var(--edge-neg)]",
        negative && "border-[color:var(--edge-pos)]/40 bg-[color:var(--edge-pos)]/15 text-[color:var(--edge-pos)]",
        !positive && !negative && "border-white/10 bg-white/5 text-muted-foreground",
        className,
      )}
    >
      {positive ? "▲" : negative ? "▼" : "◆"} {fmtEur(value, { sign: true })}
    </span>
  );
}
