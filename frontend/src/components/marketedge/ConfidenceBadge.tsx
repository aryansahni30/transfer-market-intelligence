import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/mock/players";

const map: Record<Confidence, { label: string; cls: string }> = {
  high: { label: "High conf.", cls: "border-[color:var(--confidence-high)]/40 bg-[color:var(--confidence-high)]/10 text-[color:var(--confidence-high)]" },
  mid:  { label: "Med. conf.", cls: "border-[color:var(--confidence-mid)]/40 bg-[color:var(--confidence-mid)]/10 text-[color:var(--confidence-mid)]" },
  low:  { label: "Low conf.",  cls: "border-[color:var(--confidence-low)]/50 bg-[color:var(--confidence-low)]/10 text-[color:var(--confidence-low)]" },
};

export function ConfidenceBadge({ level, note, className }: { level: Confidence; note?: string; className?: string }) {
  const { label, cls } = map[level];
  return (
    <span
      title={note}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        cls,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
