import type { CostBreakdown } from "@/domain/costing";
import { formatINR, formatPct } from "@/lib/format";

export const COST_LINES: Array<{ key: keyof CostBreakdown; label: string; color: string }> = [
  { key: "labour", label: "Labour", color: "#2a78d6" },
  { key: "material", label: "Material", color: "#eb6834" },
  { key: "engineerExpenses", label: "Engineer expenses", color: "#1baf7a" },
  { key: "travelAccommodation", label: "Travel & accommodation", color: "#eda100" },
  { key: "instruments", label: "Instruments / equipment", color: "#4a3aa7" },
  { key: "other", label: "Other", color: "#8a8f98" },
];

/** Horizontal 100% stacked bar with a legend table beneath – identity never by color alone. */
export function CostBreakdownBar({ costs }: { costs: CostBreakdown }) {
  const total = costs.total || 1;
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-muted">
        {COST_LINES.map((l) => {
          const pct = (costs[l.key] / total) * 100;
          return pct > 0 ? (
            <div key={l.key} style={{ width: `${pct}%`, background: l.color }} title={`${l.label}: ${formatINR(costs[l.key])} (${formatPct(pct)})`} />
          ) : null;
        })}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {COST_LINES.map((l) => (
          <li key={l.key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: l.color }} />
            <span className="flex-1 text-muted-foreground">{l.label}</span>
            <span className="tabular font-medium">{formatINR(costs[l.key])}</span>
            <span className="w-12 text-right text-xs tabular text-muted-foreground">{formatPct((costs[l.key] / total) * 100)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
