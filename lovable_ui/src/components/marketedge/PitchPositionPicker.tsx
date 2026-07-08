import type { Position } from "@/lib/mock/players";
import { cn } from "@/lib/utils";

const slots: { pos: Position; x: number; y: number }[] = [
  { pos: "GK",  x: 50, y: 92 },
  { pos: "CB",  x: 35, y: 76 },
  { pos: "CB",  x: 65, y: 76 },
  { pos: "LB",  x: 12, y: 66 },
  { pos: "RB",  x: 88, y: 66 },
  { pos: "CDM", x: 50, y: 60 },
  { pos: "CM",  x: 32, y: 48 },
  { pos: "CM",  x: 68, y: 48 },
  { pos: "CAM", x: 50, y: 34 },
  { pos: "LW",  x: 18, y: 22 },
  { pos: "RW",  x: 82, y: 22 },
  { pos: "ST",  x: 50, y: 12 },
];

export function PitchPositionPicker({
  value,
  onChange,
}: {
  value: Position | null;
  onChange: (p: Position | null) => void;
}) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm border border-white/10 bg-[color:var(--pitch)]">
      {/* pitch markings */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-white/15" preserveAspectRatio="none">
        <rect x="1" y="1" width="98" height="98" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <line x1="1" y1="50" x2="99" y2="50" stroke="currentColor" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <rect x="30" y="1" width="40" height="14" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <rect x="30" y="85" width="40" height="14" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <rect x="40" y="1" width="20" height="5" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <rect x="40" y="94" width="20" height="5" fill="none" stroke="currentColor" strokeWidth="0.3" />
      </svg>

      {slots.map((s, i) => {
        const active = value === s.pos;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(active ? null : s.pos)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border font-mono text-[10px] font-semibold tracking-wider transition-all",
              "h-8 w-8 flex items-center justify-center",
              active
                ? "border-[color:var(--edge-pos)] bg-[color:var(--edge-pos)] text-[color:var(--primary-foreground)] shadow-[0_0_20px_color-mix(in_oklab,var(--edge-pos)_60%,transparent)]"
                : "border-white/20 bg-white/[0.04] text-muted-foreground hover:border-white/40 hover:text-foreground",
            )}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {s.pos}
          </button>
        );
      })}
    </div>
  );
}
