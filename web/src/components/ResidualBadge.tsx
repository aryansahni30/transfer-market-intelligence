import { fmtEur } from "@/lib/api";

interface ResidualBadgeProps {
  residual: number | null | undefined;
  size?: "sm" | "md";
}

export default function ResidualBadge({ residual, size = "md" }: ResidualBadgeProps) {
  if (residual == null) return <span style={{ color: "var(--text-secondary)" }}>—</span>;

  const isUnderpaid = residual > 0;
  const color = isUnderpaid ? "var(--accent-green)" : "var(--accent-red)";
  const label = isUnderpaid ? "UNDERVALUED" : "OVERVALUED";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${textSize}`}
      style={{ color }}
    >
      {isUnderpaid ? "▲" : "▼"} {fmtEur(Math.abs(residual))}
      <span className="font-normal opacity-70 text-xs ml-1">{label}</span>
    </span>
  );
}
