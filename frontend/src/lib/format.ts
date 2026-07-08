export function fmtEur(n: number | null | undefined, opts: { compact?: boolean; sign?: boolean } = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const { compact = true, sign = false } = opts;
  const abs = Math.abs(n);
  let body: string;
  if (compact) {
    if (abs >= 1_000_000) body = `€${(n / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
    else if (abs >= 1_000) body = `€${(n / 1_000).toFixed(0)}k`;
    else body = `€${n.toFixed(0)}`;
  } else {
    body = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }
  if (sign && n > 0) return `+${body}`;
  return body;
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function pct(n: number, digits = 0) {
  const s = (n * 100).toFixed(digits);
  return `${n > 0 ? "+" : ""}${s}%`;
}
