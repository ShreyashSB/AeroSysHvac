import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Project } from "@/types/models";
import type { ProjectFinancials } from "@/domain/costing";
import { formatINR, formatINRShort } from "@/lib/format";

const SERIES = { value: "var(--color-series-1)", cost: "var(--color-series-2)" };

/** Contract value vs. cost to date, per project (grouped bars, one axis). */
export function ContractCostChart({ projects, financials }: { projects: Project[]; financials: Map<string, ProjectFinancials> }) {
  const rows = projects
    .filter((p) => p.status !== "archived")
    .sort((a, b) => b.contractValue - a.contractValue)
    .slice(0, 8)
    .map((p) => ({
      name: p.name.length > 26 ? `${p.name.slice(0, 24)}…` : p.name,
      fullName: p.name,
      value: p.contractValue,
      cost: Math.round(financials.get(p.id)?.actualCost ?? 0),
    }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis type="number" tickFormatter={(v) => formatINRShort(v)} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 11, fill: "var(--color-foreground)" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            formatter={(v, n) => [formatINR(Number(v)), n === "value" ? "Contract value" : "Cost to date"]}
            labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""}
            contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
          />
          <Legend formatter={(v) => <span className="text-xs text-foreground">{v === "value" ? "Contract value" : "Cost to date"}</span>} iconType="circle" iconSize={8} />
          <Bar dataKey="value" fill={SERIES.value} radius={[0, 4, 4, 0]} maxBarSize={12} />
          <Bar dataKey="cost" fill={SERIES.cost} radius={[0, 4, 4, 0]} maxBarSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
