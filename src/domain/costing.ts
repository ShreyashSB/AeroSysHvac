/**
 * Project costing rules – pure functions, no I/O.
 *
 *   Total Cost      = Labour + Material + Engineer Expenses + Travel/Accommodation
 *                     + Instrument/Equipment + Other
 *   Estimated Profit = Contract Value − Total Cost
 *   Profit Margin    = Estimated Profit / Contract Value × 100
 *
 * In a production system these would typically run on the server; they are
 * kept isolated here so they can be moved (or unit tested) independently.
 */
import { daysBetween, minDate, todayISO } from "@/lib/dates";
import { sum } from "@/lib/utils";
import type {
  AppSettings,
  Employee,
  Expense,
  Instrument,
  Project,
  ProjectAssignment,
  ProjectCost,
  ProjectInstrument,
} from "@/types/models";

const DAYS_PER_MONTH = 30.4;
const TRAVEL_CATEGORIES = new Set(["Travel", "Accommodation"]);

export interface CostBreakdown {
  labour: number; // engineer salaries (pro-rated) + sub-contract labour
  engineerSalaries: number;
  subcontractLabour: number;
  material: number;
  engineerExpenses: number;
  travelAccommodation: number;
  instruments: number;
  other: number;
  total: number;
}

export interface ProjectFinancials {
  projectId: string;
  contractValue: number;
  estimatedCost: number;
  costs: CostBreakdown;
  actualCost: number;
  estimatedProfit: number;
  profitMargin: number; // %
  budgetUtilisation: number; // % of estimated cost consumed
  forecastCost: number; // projected cost at completion
  forecastProfit: number;
  pendingExpenses: number; // awaiting approval – not yet in cost
}

export interface CostingContext {
  employees: Employee[];
  assignments: ProjectAssignment[];
  expenses: Expense[];
  instruments: Instrument[];
  projectInstruments: ProjectInstrument[];
  projectCosts: ProjectCost[];
  settings: Pick<AppSettings, "instrumentMonthlyRatePct">;
  today?: string;
}

/** Days an interval overlaps with [.., today], inclusive of start day. */
function activeDays(start: string, end: string | null, today: string) {
  const effectiveEnd = minDate(end ?? today, today);
  if (effectiveEnd < start) return 0;
  return daysBetween(start, effectiveEnd) + 1;
}

export function labourCostForAssignment(a: ProjectAssignment, salary: number, today = todayISO()) {
  return (salary * (a.allocation / 100) * activeDays(a.startDate, a.endDate, today)) / DAYS_PER_MONTH;
}

export function instrumentCostForDeployment(pi: ProjectInstrument, purchaseValue: number, monthlyRatePct: number, today = todayISO()) {
  return (purchaseValue * (monthlyRatePct / 100) * activeDays(pi.assignedAt, pi.returnedAt, today)) / DAYS_PER_MONTH;
}

export function computeProjectFinancials(project: Project, ctx: CostingContext): ProjectFinancials {
  const today = ctx.today ?? todayISO();
  const salaryOf = new Map(ctx.employees.map((e) => [e.id, e.monthlySalary]));
  const valueOf = new Map(ctx.instruments.map((i) => [i.id, i.purchaseValue]));

  const engineerSalaries = sum(
    ctx.assignments.filter((a) => a.projectId === project.id),
    (a) => labourCostForAssignment(a, salaryOf.get(a.employeeId) ?? 0, today),
  );
  const direct = ctx.projectCosts.filter((c) => c.projectId === project.id);
  const subcontractLabour = sum(direct.filter((c) => c.type === "labour_contract"), (c) => c.amount);
  const material = sum(direct.filter((c) => c.type === "material"), (c) => c.amount);
  const other = sum(direct.filter((c) => c.type === "other"), (c) => c.amount);

  const projectExpenses = ctx.expenses.filter((e) => e.projectId === project.id);
  const approved = projectExpenses.filter((e) => e.status === "approved");
  const travelAccommodation = sum(approved.filter((e) => TRAVEL_CATEGORIES.has(e.category)), (e) => e.amount);
  const engineerExpenses = sum(approved.filter((e) => !TRAVEL_CATEGORIES.has(e.category)), (e) => e.amount);
  const pendingExpenses = sum(projectExpenses.filter((e) => e.status === "pending"), (e) => e.amount);

  const instruments = sum(
    ctx.projectInstruments.filter((pi) => pi.projectId === project.id),
    (pi) => instrumentCostForDeployment(pi, valueOf.get(pi.instrumentId) ?? 0, ctx.settings.instrumentMonthlyRatePct, today),
  );

  const labour = engineerSalaries + subcontractLabour;
  const total = labour + material + engineerExpenses + travelAccommodation + instruments + other;
  const estimatedProfit = project.contractValue - total;
  const profitMargin = project.contractValue > 0 ? (estimatedProfit / project.contractValue) * 100 : 0;

  // Estimate at completion (EAC) = actual cost + remaining budgeted work.
  const c = project.completion / 100;
  const forecastCost = total + project.estimatedCost * (1 - c);

  return {
    projectId: project.id,
    contractValue: project.contractValue,
    estimatedCost: project.estimatedCost,
    costs: {
      labour,
      engineerSalaries,
      subcontractLabour,
      material,
      engineerExpenses,
      travelAccommodation,
      instruments,
      other,
      total,
    },
    actualCost: total,
    estimatedProfit,
    profitMargin,
    budgetUtilisation: project.estimatedCost > 0 ? (total / project.estimatedCost) * 100 : 0,
    forecastCost,
    forecastProfit: project.contractValue - forecastCost,
    pendingExpenses,
  };
}

export interface PortfolioSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  planningProjects: number;
  onHoldProjects: number;
  totalContractValue: number;
  totalCost: number;
  estimatedProfit: number;
  averageCompletion: number;
  profitMargin: number;
}

export function summarisePortfolio(projects: Project[], fin: Map<string, ProjectFinancials>): PortfolioSummary {
  const live = projects.filter((p) => p.status !== "archived");
  const totalContractValue = sum(live, (p) => p.contractValue);
  const totalCost = sum(live, (p) => fin.get(p.id)?.actualCost ?? 0);
  const estimatedProfit = totalContractValue - totalCost;
  return {
    totalProjects: live.length,
    activeProjects: live.filter((p) => p.status === "active").length,
    completedProjects: live.filter((p) => p.status === "completed").length,
    planningProjects: live.filter((p) => p.status === "planning").length,
    onHoldProjects: live.filter((p) => p.status === "on_hold").length,
    totalContractValue,
    totalCost,
    estimatedProfit,
    averageCompletion: live.length ? sum(live, (p) => p.completion) / live.length : 0,
    profitMargin: totalContractValue ? (estimatedProfit / totalContractValue) * 100 : 0,
  };
}

/** Engineers are "available" when they have no open assignment on an active/planning project. */
export function openAssignmentsFor(employeeId: string, assignments: ProjectAssignment[]) {
  return assignments.filter((a) => a.employeeId === employeeId && !a.endDate);
}
