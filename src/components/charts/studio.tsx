/**
 * Chart pieces used only by the Studio style (see useStudio()). They draw the same numbers as the
 * standard charts, just with a softer finish: rounded tracks, a gauge, a dot chart and a stacked ribbon.
 * Colours come from the theme tokens so light, dark and sunlight all work.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Tooltip box style for Recharts in Studio: dark pill-ish card, no border. */
export const studioTooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: "none",
  fontSize: 12,
  background: "var(--color-sidebar)",
  color: "#eef2f7",
  boxShadow: "0 8px 24px rgb(15 23 41 / 0.18)",
};
export const studioTooltipLabelStyle: CSSProperties = { color: "#eef2f7", fontWeight: 600, marginBottom: 2 };
export const studioTooltipItemStyle: CSSProperties = { color: "#eef2f7" };

/** Rounded track with a filled bar and an optional target tick (a bullet chart). Values are 0–1 shares of the track. */
export function Track({
  value,
  target,
  barClass = "bg-primary",
  className,
  label,
}: {
  value: number;
  target?: number;
  barClass?: string;
  className?: string;
  label?: string;
}) {
  const pct = (n: number) => `${Math.max(0, Math.min(1, n)) * 100}%`;
  return (
    <span className={cn("relative block h-2 rounded-full", className)} style={{ background: "var(--studio-track)" }} role={label ? "img" : undefined} aria-label={label}>
      <span className={cn("absolute inset-y-0 left-0 rounded-full", barClass)} style={{ width: pct(value) }} />
      {target !== undefined && <span className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground" style={{ left: pct(target) }} />}
    </span>
  );
}

/** Half-circle gauge: `value` against a `baseline` tick on a 0–max scale. */
export function Gauge({
  value,
  baseline,
  max,
  toneClass,
  valueLabel,
  caption,
  baselineLabel,
}: {
  value: number;
  baseline: number;
  max: number;
  /** Tailwind text colour class for the filled arc, e.g. "text-danger". */
  toneClass: string;
  valueLabel: string;
  caption: string;
  baselineLabel: string;
}) {
  const cx = 150, cy = 140, r = 110;
  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  const pt = (v: number, rr = r) => {
    const a = Math.PI * (1 - clamp(v) / max);
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)] as const;
  };
  const arc = (v: number) => {
    const [x0, y0] = pt(0);
    const [x1, y1] = pt(v);
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
  };
  const [bx0, by0] = pt(baseline, r - 17);
  const [bx1, by1] = pt(baseline, r + 17);
  const [lx, ly] = pt(baseline, r + 30);
  return (
    <svg viewBox="0 0 300 168" className="mx-auto block w-full max-w-[320px] overflow-visible" role="img" aria-label={`${caption}: ${valueLabel}. ${baselineLabel}`}>
      <path d={arc(max)} fill="none" stroke="var(--studio-track)" strokeWidth={18} strokeLinecap="round" />
      {value > 0 && <path d={arc(value)} fill="none" stroke="currentColor" className={toneClass} strokeWidth={18} strokeLinecap="round" />}
      <line x1={bx0} y1={by0} x2={bx1} y2={by1} stroke="var(--color-foreground)" strokeWidth={3} strokeLinecap="round" />
      <text x={lx} y={ly} textAnchor={baseline / max > 0.5 ? "start" : "end"} fontSize={11} fill="var(--color-muted-foreground)">
        {baselineLabel}
      </text>
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize={30} fontWeight={500} fill="var(--color-foreground)" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
        {valueLabel}
      </text>
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">
        {caption}
      </text>
    </svg>
  );
}

/**
 * Dot chart: per row, an earned-value dot and a cost dot joined by a bar that is green when earned value
 * is ahead and red when cost is ahead. Replaces the paired bars in Studio.
 */
export function DumbbellChart({
  rows,
  fmt,
  tipFmt,
}: {
  rows: Array<{ name: string; full: string; ev: number; cost: number }>;
  fmt: (n: number) => string;
  tipFmt: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the container's real pixel width so text stays 12px on phones instead of shrinking with the SVG.
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const labelW = Math.min(190, Math.round(W * 0.36)), right = 20, rowH = 34, top = 8;
  const maxChars = Math.floor((labelW - 16) / 6.6);
  const short = (name: string) => (name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name);
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => [r.ev, r.cost])));
  const ticks = (W < 480 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((t) => t * max);
  const X = (v: number) => labelW + (v / max) * (W - labelW - right);
  const H = top + rows.length * rowH + 24;
  const h = hover !== null ? rows[hover] : null;

  return (
    <div ref={boxRef} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full overflow-visible" role="img" aria-label="Earned value and cost to date per project">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={top - 4} y2={top + rows.length * rowH - 6} stroke="var(--color-border)" />
            <text x={X(t)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">{fmt(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = top + i * rowH + rowH / 2 - 4;
          const ahead = r.ev >= r.cost;
          return (
            <g key={r.full} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === i ? 1 : 0.45}>
              <rect x={0} y={y - rowH / 2} width={W} height={rowH} fill="transparent" />
              <text x={labelW - 14} y={y + 4} textAnchor="end" fontSize={12} fill="var(--color-foreground)">{short(r.full)}</text>
              <line x1={X(Math.min(r.ev, r.cost))} x2={X(Math.max(r.ev, r.cost))} y1={y} y2={y} stroke={ahead ? "var(--color-success)" : "var(--color-danger)"} strokeOpacity={0.4} strokeWidth={7} strokeLinecap="round" />
              <circle cx={X(r.cost)} cy={y} r={6.5} fill="var(--color-series-2)" stroke="var(--color-surface)" strokeWidth={2} />
              <circle cx={X(r.ev)} cy={y} r={6.5} fill="var(--color-series-1)" stroke="var(--color-surface)" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-xl px-3 py-2 text-xs leading-relaxed shadow-lg" style={studioTooltipStyle}>
          <p className="font-semibold">{h.full}</p>
          <p>Earned value {tipFmt(h.ev)}</p>
          <p>Cost to date {tipFmt(h.cost)}</p>
          <p>{h.ev >= h.cost ? `Ahead by ${tipFmt(h.ev - h.cost)}` : `Behind by ${tipFmt(h.cost - h.ev)}`}</p>
        </div>
      )}
    </div>
  );
}

/** One stacked bar showing each part's share of a total, with 2px gaps between parts. */
export function Ribbon({
  parts,
  hover,
  onHover,
}: {
  parts: Array<{ key: string; label: string; value: number; color: string }>;
  hover?: string | null;
  onHover?: (key: string | null) => void;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="flex h-7 w-full gap-0.5" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}>
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <span
            key={p.key}
            className={cn("block h-full rounded-md transition-opacity", hover && hover !== p.key ? "opacity-40" : "opacity-100")}
            style={{ width: `${(p.value / total) * 100}%`, minWidth: 4, background: p.color }}
            onMouseEnter={() => onHover?.(p.key)}
            onMouseLeave={() => onHover?.(null)}
          />
        ))}
    </div>
  );
}

/** Sequential blues for parts of a whole, biggest share strongest. Values live in index.css per theme. */
export const SEQUENTIAL = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)", "var(--seq-6)"];

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
