import { computeProjectPerformance, type CostHeads, type PerformanceIndex } from "@/domain/performance";
import { addDays, todayISO } from "@/lib/dates";
import type { AppSettings, Project } from "@/types/models";

export interface WeekPoint {
  /** Last day of the week (ISO date). */
  date: string;
  /** Portfolio earned value and total cost, cumulative up to `date`. */
  earned: number;
  cost: number;
  /** What changed during this week: earned value added (money in) and cost added (money out). */
  in: number;
  out: number;
  net: number;
  costs: CostHeads;
}

const EMPTY_HEADS = (): CostHeads => ({ wages: 0, expenses: 0, overhead: 0, instruments: 0, management: 0, other: 0, total: 0 });

/**
 * Week-by-week portfolio series for the Calm dashboard, computed with the same engine as every other screen
 * (computeProjectPerformance "as of" each week end), so the numbers agree with the KPI tiles.
 * "In" is earned value added that week (work executed against the BOQ), "out" is cost added that week.
 */
export function weeklyPortfolioSeries(projects: Project[], index: PerformanceIndex, settings: AppSettings, weeks = 13): WeekPoint[] {
  const today = todayISO();
  const live = projects.filter((p) => p.status !== "archived");
  const ends = Array.from({ length: weeks + 1 }, (_, i) => addDays(today, -7 * (weeks - i)));
  const cumulative = ends.map((asOf) => {
    let earned = 0;
    const costs = EMPTY_HEADS();
    for (const p of live) {
      if (asOf < p.startDate) continue;
      const f = computeProjectPerformance(p, index, settings, asOf);
      earned += f.earnedValue;
      for (const k of Object.keys(costs) as Array<keyof CostHeads>) costs[k] += f.costs[k];
    }
    return { date: asOf, earned, cost: costs.total, costs };
  });
  return cumulative.slice(1).map((c, i) => {
    const prev = cumulative[i];
    const inn = Math.max(0, c.earned - prev.earned);
    const out = Math.max(0, c.cost - prev.cost);
    return { date: c.date, earned: Math.round(c.earned), cost: Math.round(c.cost), in: Math.round(inn), out: Math.round(out), net: Math.round(inn - out), costs: c.costs };
  });
}

/** Cost added per head between two cumulative points. */
export function headsBetween(later: CostHeads, earlier: CostHeads): CostHeads {
  const out = EMPTY_HEADS();
  for (const k of Object.keys(out) as Array<keyof CostHeads>) out[k] = Math.max(0, later[k] - earlier[k]);
  return out;
}
