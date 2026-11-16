/**
 * Calm style dashboard: a big greeting with the three numbers that matter most, then soft cards with the cost
 * trend, a week-by-week in/out chart and three small cards (margin, approvals waiting, where the money went).
 * Only shown when the Calm style is on and the user can see finance; every number comes from the same engine
 * (useScopedData + computeProjectPerformance) as the rest of the app.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Plus, Receipt } from "lucide-react";
import { useCurrentUser } from "@/auth/AuthContext";
import { can } from "@/auth/permissions";
import type { useScopedData } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, Skeleton } from "@/components/ui/misc";
import { COST_HEADS } from "./CostBreakdown";
import { headsBetween, weeklyPortfolioSeries, type WeekPoint } from "./calmSeries";
import { formatINR, formatINRShort, formatPct } from "@/lib/format";
import { cn, sum } from "@/lib/utils";
import type { Expense } from "@/types/models";

type Scoped = ReturnType<typeof useScopedData>;

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = (iso: string) => shortDate.format(new Date(`${iso}T00:00:00`));

function partOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}

/** "₹4.82 Cr" → ₹ small and raised, number big, unit small, like the reference design. */
function BigMoney({ value }: { value: number }) {
  const m = formatINRShort(value).match(/^(-?)₹([\d.,]+)\s?(Cr|L)?$/);
  if (!m) return <>{formatINRShort(value)}</>;
  return (
    <>
      {m[1]}
      <span className="mr-0.5 align-top text-[0.45em] font-medium">₹</span>
      {m[2]}
      {m[3] && <span className="ml-1 text-[0.45em] font-medium">{m[3]}</span>}
    </>
  );
}

/** Tiny trend line for the hero numbers and cards. */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24 - 2}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-7 w-24", className)} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative size-[88px] shrink-0" role="img" aria-label={`${Math.round(pct * 100)}% of the portfolio executed`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--calm-ring-track)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--calm-accent)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-semibold tabular">{Math.round(pct * 100)}%</span>
        <span className="mt-1 text-[11px] text-muted-foreground">done</span>
      </span>
    </div>
  );
}

function HeroStat({ label, value, sub, trend }: { label: string; value: ReactNode; sub: ReactNode; trend: number[] }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p data-slot="hero-number" className="mt-1 whitespace-nowrap tabular">{value}</p>
      <div className="mt-1 flex items-center gap-3">
        <span className="min-w-0 text-sm text-muted-foreground">{sub}</span>
        <Sparkline values={trend} className="hidden text-[var(--calm-accent)] sm:block" />
      </div>
    </div>
  );
}

export function CalmHero({ data, pending, onNewProject }: { data: Scoped; pending: Expense[]; onNewProject: () => void }) {
  const { user, employee } = useCurrentUser();
  const navigate = useNavigate();
  const s = data.portfolio;
  const series = useWeekly(data, 13);
  const atRisk = data.insights.filter((i) => i.tone === "bad").length;
  const firstName = employee.name.split(" ")[0];
  const profit = s.contractValue - s.finalCost;

  const facts = [
    pending.length > 0 && `${pending.length} claim${pending.length > 1 ? "s" : ""} waiting for approval`,
    atRisk > 0 && `${atRisk} issue${atRisk > 1 ? "s" : ""} need${atRisk > 1 ? "" : "s"} attention`,
  ].filter(Boolean);

  return (
    <section aria-label="Overview" className="space-y-5">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:gap-10">
        <div className="flex items-center gap-6">
          <h1 data-slot="calm-greeting" className="text-foreground">
            {partOfDay()},<br className="hidden sm:block" /> {firstName}
          </h1>
          <ProgressRing value={s.progress} />
        </div>
        <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
          <HeroStat label="Contract value" value={<BigMoney value={s.contractValue} />} sub={`${s.projectCount} projects`} trend={series.map((w) => w.earned)} />
          <HeroStat label="Cost to date" value={<BigMoney value={s.costToDate} />} sub={`${formatPct(s.earnedValue ? (s.costToDate / s.earnedValue) * 100 : 0, 0)} of earned value`} trend={series.map((w) => w.cost)} />
          <HeroStat
            label="Projected margin"
            value={<>{formatPct(s.finalMarginPct)}</>}
            sub={`${formatINRShort(profit)} profit · estimate`}
            trend={series.map((w) => (w.earned ? (w.earned - w.cost) / w.earned : 0))}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {longDate.format(new Date())}
          {facts.length > 0 ? <> · <span className="font-medium text-foreground">{facts.join(", ")}</span></> : " · Everything is on track"}
        </p>
        <div className="flex flex-wrap gap-2">
          {can(user.role, "expense.approve") && pending.length > 0 && (
            <Button variant="outline" data-ground-outline onClick={() => navigate("/expenses?status=pending")}>
              <Receipt /> Claims to approve
            </Button>
          )}
          {can(user.role, "project.create") && (
            <Button onClick={onNewProject}>
              <Plus /> New project
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function useWeekly(data: Scoped, weeks: number) {
  return useMemo(() => weeklyPortfolioSeries(data.scopedProjects, data.index, data.settings, weeks), [data.scopedProjects, data.index, data.settings, weeks]);
}

const axisTick = { fontSize: 12, fill: "var(--color-muted-foreground)" };
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)", fontSize: 12 };

function Chip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl px-3 py-2", highlight ? "bg-[var(--calm-chip-strong)]" : "bg-muted")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular">{value}</p>
    </div>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-muted p-1" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors", value === o.value ? "bg-[var(--calm-pill)] text-[var(--calm-pill-fg)]" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CalmCharts({ data, pending, loading }: { data: Scoped; pending: Expense[]; loading: boolean }) {
  const { user } = useCurrentUser();
  const [weeks, setWeeks] = useState<6 | 13>(13);
  const series = useWeekly(data, 13);
  const s = data.portfolio;

  if (loading) {
    return (
      <div className="grid gap-5 lg:grid-cols-5 [&>*]:min-w-0">
        <Skeleton className="h-96 rounded-[22px] lg:col-span-3" />
        <Skeleton className="h-96 rounded-[22px] lg:col-span-2" />
      </div>
    );
  }

  const last4 = series.slice(-4);
  const earned4 = sum(last4, (w) => w.in);
  const spent4 = sum(last4, (w) => w.out);
  const ahead = s.earnedValue - s.costToDate;
  const monthAgo = series[series.length - 5];
  const evChange = monthAgo && monthAgo.earned ? ((s.earnedValue - monthAgo.earned) / monthAgo.earned) * 100 : 0;
  const shown = series.slice(-weeks);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-5 [&>*]:min-w-0">
        {/* Earned value and cost, cumulative */}
        <Card className="p-5 lg:col-span-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Earned value across {s.projectCount} projects</p>
              <p data-slot="metric" className="mt-1 text-3xl font-semibold tabular">{formatINR(s.earnedValue)}</p>
              <p className="mt-1.5 flex items-center gap-2 text-sm">
                <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", evChange >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                  {evChange >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {formatPct(Math.abs(evChange))}
                </span>
                <span className="text-muted-foreground">on 4 weeks ago</span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Chip label="Earned, 4 wks" value={formatINRShort(earned4)} />
              <Chip label="Spent, 4 wks" value={formatINRShort(spent4)} />
              <Chip label="Ahead of cost" value={formatINRShort(ahead)} highlight />
            </div>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="calm-earned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--calm-earned)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--calm-earned)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
                <XAxis dataKey="date" tickFormatter={fmtShort} tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tickFormatter={(v) => formatINRShort(Number(v))} tick={axisTick} axisLine={false} tickLine={false} width={64} />
                <Tooltip
                  formatter={(v, n) => [formatINR(Number(v)), n === "earned" ? "Earned value" : "Cost to date"]}
                  labelFormatter={(l) => `Week ending ${fmtShort(String(l))}`}
                  contentStyle={tooltipStyle}
                />
                <Area type="monotone" dataKey="earned" stroke="var(--calm-earned)" strokeWidth={2.5} fill="url(#calm-earned)" animationDuration={700} />
                <Area type="monotone" dataKey="cost" stroke="var(--calm-cost)" strokeWidth={2} strokeDasharray="5 4" fill="none" animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ label: "Earned value", color: "var(--calm-earned)" }, { label: "Cost to date", color: "var(--calm-cost)", dashed: true }]} />
        </Card>

        {/* Week by week in / out with net line */}
        <Card className="flex flex-col p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">In and out, week by week</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Above the line is earned value added, below is cost. The line is each week's net.</p>
            </div>
            <Segmented value={weeks} onChange={setWeeks} options={[{ value: 6, label: "6 wks" }, { value: 13, label: "13 wks" }]} />
          </div>
          <div className="mt-4 min-h-64 w-full flex-1">
            <ResponsiveContainer>
              <ComposedChart data={shown.map((w) => ({ ...w, outNeg: -w.out }))} stackOffset="sign" margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
                <XAxis dataKey="date" tickFormatter={fmtShort} tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tickFormatter={(v) => formatINRShort(Number(v))} tick={axisTick} axisLine={false} tickLine={false} width={58} />
                <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.6 }}
                  formatter={(v, n) => [formatINR(Math.abs(Number(v))), n === "in" ? "Earned (in)" : n === "outNeg" ? "Cost (out)" : "Net"]}
                  labelFormatter={(l) => `Week ending ${fmtShort(String(l))}`}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="in" stackId="w" fill="var(--calm-in)" radius={[6, 6, 0, 0]} animationDuration={600} />
                <Bar dataKey="outNeg" stackId="w" fill="var(--calm-out)" radius={[6, 6, 0, 0]} animationDuration={600} />
                <Line type="monotone" dataKey="net" stroke="var(--calm-net)" strokeWidth={2.5} dot={false} animationDuration={800} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ label: "Earned (in)", color: "var(--calm-in)", box: true }, { label: "Cost (out)", color: "var(--calm-out)", box: true }, { label: "Net", color: "var(--calm-net)" }]} />
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <MarginCard data={data} series={series} />
        {can(user.role, "expense.approve") ? <WaitingCard pending={pending} data={data} /> : null}
        <WhereItWentCard series={series} />
      </div>
    </div>
  );
}

function Legend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean; box?: boolean }> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.box ? (
            <span className="size-3 rounded-[3px]" style={{ background: i.color }} />
          ) : (
            <svg width="18" height="6" aria-hidden><line x1="1" y1="3" x2="17" y2="3" stroke={i.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={i.dashed ? "4 3" : undefined} /></svg>
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}

function MarginCard({ data, series }: { data: Scoped; series: WeekPoint[] }) {
  const s = data.portfolio;
  const target = data.settings.targetMarginPct;
  const pct = Math.max(0, Math.min(1, s.finalMarginPct / Math.max(target, 1)));
  return (
    <Card className="p-5">
      <h3 className="font-semibold">Margin holding</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">Projected margin across the portfolio, against the {formatPct(target, 0)} target</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p data-slot="metric" className="text-4xl font-semibold tabular">{formatPct(s.finalMarginPct)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatINRShort(s.contractValue - s.finalCost)} of {formatINRShort(s.contractValue)}</p>
        </div>
        <Sparkline values={series.map((w) => (w.earned ? (w.earned - w.cost) / w.earned : 0))} className="h-12 w-32 text-[var(--calm-earned)]" />
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${formatPct(pct * 100, 0)} of target margin`}>
        <div className="h-full rounded-full bg-[var(--calm-earned)] transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{formatPct(pct * 100, 0)} of target · estimate</p>
    </Card>
  );
}

function WaitingCard({ pending, data }: { pending: Expense[]; data: Scoped }) {
  const top = [...pending].sort((a, b) => b.amount - a.amount).slice(0, 3);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Waiting for you</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pending.length ? `${formatINR(sum(pending, (e) => e.amount))} across ${pending.length} claim${pending.length > 1 ? "s" : ""}` : "No claims waiting"}
          </p>
        </div>
        <Link to="/expenses?status=pending" className="inline-flex items-center text-sm font-medium text-foreground hover:underline">
          All <ChevronRight className="size-4" />
        </Link>
      </div>
      <ul className="mt-3 divide-y">
        {top.map((e) => {
          const who = data.employeeById.get(e.employeeId)?.name ?? "Someone";
          return (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={who} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{who}</p>
                <p className="truncate text-xs text-muted-foreground">{data.projectById.get(e.projectId)?.name ?? ""} · {e.category}</p>
              </div>
              <span className="text-sm font-semibold tabular">{formatINRShort(e.amount)}</span>
              <Link to="/expenses?status=pending" aria-label={`Review claim from ${who}`} className="flex size-8 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground">
                <Check className="size-4" />
              </Link>
            </li>
          );
        })}
        {top.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">You're all caught up.</li>}
      </ul>
    </Card>
  );
}

function WhereItWentCard({ series }: { series: WeekPoint[] }) {
  const n = series.length;
  if (n < 9) return null;
  const now = headsBetween(series[n - 1].costs, series[n - 5].costs);
  const before = headsBetween(series[n - 5].costs, series[n - 9].costs);
  const heads = COST_HEADS.filter((h) => now[h.key] > 0 || before[h.key] > 0).sort((a, b) => now[b.key] - now[a.key]).slice(0, 5);
  const max = Math.max(1, ...heads.map((h) => Math.max(now[h.key], before[h.key])));
  return (
    <Card className="p-5">
      <h3 className="font-semibold">Where it went</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">Cost in the last 4 weeks, against the 4 weeks before</p>
      <ul className="mt-4 space-y-3">
        {heads.map((h) => (
          <li key={h.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{h.label}</span>
              <span className="font-semibold tabular">{formatINRShort(now[h.key])}</span>
            </div>
            <div className="relative mt-1.5 h-2.5 rounded-full bg-muted">
              {/* the earlier period as a faint marker, the current period as the bar */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--calm-cost)] transition-[width] duration-700" style={{ width: `${(now[h.key] / max) * 100}%` }} />
              <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground/60" style={{ left: `calc(${(before[h.key] / max) * 100}% - 1px)` }} title={`Previous 4 weeks: ${formatINR(before[h.key])}`} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-3 w-0.5 rounded bg-foreground/60" /> previous 4 weeks
      </p>
    </Card>
  );
}
