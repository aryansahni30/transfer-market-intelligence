import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { SimNode } from "@/lib/mock/similarity";
import { fmtEur } from "@/lib/format";

interface Props {
  anchor: SimNode;
  nodes: SimNode[];
  cheaperOnly: boolean;
}

export function SimilarityMap({ anchor, nodes, cheaperOnly }: Props) {
  const [hover, setHover] = useState<SimNode | null>(null);

  const visible = useMemo(
    () => nodes.map((n) => ({ ...n, dim: cheaperOnly && n.marketValue >= anchor.marketValue })),
    [nodes, cheaperOnly, anchor.marketValue],
  );

  const size = 560;
  const px = (v: number) => 40 + v * (size - 80);
  const py = (v: number) => size - (40 + v * (size - 80));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full rounded-sm border border-white/10 bg-[color:var(--pitch)]"
      >
        {/* grid */}
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1={40 + (i * (size - 80)) / 8} y1={40} x2={40 + (i * (size - 80)) / 8} y2={size - 40}
                  stroke="currentColor" strokeOpacity="0.05" className="text-foreground" />
            <line y1={40 + (i * (size - 80)) / 8} x1={40} y2={40 + (i * (size - 80)) / 8} x2={size - 40}
                  stroke="currentColor" strokeOpacity="0.05" className="text-foreground" />
          </g>
        ))}
        {/* axis labels */}
        <text x={size / 2} y={size - 12} textAnchor="middle" className="fill-current font-mono uppercase" fontSize="10" opacity="0.5">
          Progressive passing / carrying →
        </text>
        <text
          x={-size / 2} y={16} textAnchor="middle" transform="rotate(-90)"
          className="fill-current font-mono uppercase" fontSize="10" opacity="0.5"
        >
          Box threat / npxG →
        </text>

        {/* rings around anchor */}
        {[0.15, 0.28, 0.42].map((r) => (
          <circle key={r}
            cx={px(anchor.x)} cy={py(anchor.y)} r={r * (size - 80)}
            fill="none" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 4"
            className="text-foreground"
          />
        ))}

        {/* nodes */}
        {visible.map((n) => {
          const r = 4 + (n.minutes / 3000) * 8;
          const opacity = n.dim ? 0.18 : 0.55 + n.similarity * 0.45;
          return (
            <Link key={n.slug} to="/player/$slug" params={{ slug: n.slug }}>
              <g
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={px(n.x)} cy={py(n.y)} r={r}
                  fill="var(--edge-pos)" fillOpacity={opacity}
                  stroke="var(--edge-pos)" strokeOpacity={n.dim ? 0.2 : 0.9} strokeWidth="1"
                />
                <text x={px(n.x) + r + 4} y={py(n.y) + 3} fontSize="10"
                      className="fill-current font-medium"
                      opacity={n.dim ? 0.3 : 0.9}
                >
                  {n.name}
                </text>
              </g>
            </Link>
          );
        })}

        {/* anchor */}
        <g>
          <circle cx={px(anchor.x)} cy={py(anchor.y)} r="9" fill="var(--edge-neg)" />
          <circle cx={px(anchor.x)} cy={py(anchor.y)} r="14" fill="none" stroke="var(--edge-neg)" strokeOpacity="0.5" />
          <text x={px(anchor.x) + 16} y={py(anchor.y) + 4} fontSize="12"
                className="fill-current font-display font-semibold">
            {anchor.name}
          </text>
        </g>
      </svg>

      {hover && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-sm border border-white/10 bg-popover/95 px-3 py-2 text-xs shadow-xl">
          <div className="font-semibold">{hover.name}</div>
          <div className="text-muted-foreground">{hover.club} · age {hover.age}</div>
          <div className="mt-1 font-mono">MV {fmtEur(hover.marketValue)} · sim {(hover.similarity * 100).toFixed(0)}%</div>
        </div>
      )}
    </div>
  );
}
