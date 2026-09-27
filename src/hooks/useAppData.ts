import { useMemo } from "react";
import { computeProjectFinancials, summarisePortfolio, type ProjectFinancials } from "@/domain/costing";
import { scopeProjects } from "@/auth/permissions";
import { useAuth } from "@/auth/AuthContext";
import {
  useAssignments,
  useDeployments,
  useEmployees,
  useExpenses,
  useInstruments,
  useProjectCosts,
  useProjects,
  useSettings,
} from "./queries";

/**
 * Joins the independent resources into lookups and derived financials.
 * Components read from here instead of stitching relationships themselves.
 */
export function useAppData() {
  const projects = useProjects();
  const employees = useEmployees();
  const assignments = useAssignments();
  const expenses = useExpenses();
  const instruments = useInstruments();
  const deployments = useDeployments();
  const projectCosts = useProjectCosts();
  const settings = useSettings();

  const all = [projects, employees, assignments, expenses, instruments, deployments, projectCosts, settings];
  const isLoading = all.some((q) => q.isLoading);
  const error = all.find((q) => q.error)?.error ?? null;

  const derived = useMemo(() => {
    const p = projects.data ?? [];
    const e = employees.data ?? [];
    const ctx = {
      employees: e,
      assignments: assignments.data ?? [],
      expenses: expenses.data ?? [],
      instruments: instruments.data ?? [],
      projectInstruments: deployments.data ?? [],
      projectCosts: projectCosts.data ?? [],
      settings: settings.data ?? { instrumentMonthlyRatePct: 3 },
    };
    const financials = new Map<string, ProjectFinancials>();
    for (const project of p) financials.set(project.id, computeProjectFinancials(project, ctx));
    return {
      projects: p,
      employees: e,
      assignments: ctx.assignments,
      expenses: ctx.expenses,
      instruments: ctx.instruments,
      deployments: ctx.projectInstruments,
      projectCosts: ctx.projectCosts,
      settings: settings.data,
      financials,
      employeeById: new Map(e.map((x) => [x.id, x])),
      projectById: new Map(p.map((x) => [x.id, x])),
      instrumentById: new Map(ctx.instruments.map((x) => [x.id, x])),
    };
  }, [projects.data, employees.data, assignments.data, expenses.data, instruments.data, deployments.data, projectCosts.data, settings.data]);

  return { ...derived, isLoading, error };
}

export type AppData = ReturnType<typeof useAppData>;

/** Projects visible to the signed-in user (row-level scoping) + portfolio summary. */
export function useScopedData() {
  const data = useAppData();
  const { user } = useAuth();
  return useMemo(() => {
    const projects = user ? scopeProjects(user, data.projects, data.assignments) : [];
    const ids = new Set(projects.map((p) => p.id));
    const isEngineer = user?.role === "site_engineer";
    const expenses = user
      ? data.expenses.filter((e) =>
          user.role === "management" || user.role === "accounts"
            ? true
            : isEngineer
              ? e.employeeId === user.employeeId
              : ids.has(e.projectId) || e.employeeId === user.employeeId,
        )
      : [];
    const instruments = user
      ? data.instruments.filter((i) =>
          isEngineer ? i.assignedEngineerId === user.employeeId : true,
        )
      : [];
    return {
      ...data,
      scopedProjects: projects,
      scopedProjectIds: ids,
      scopedExpenses: expenses,
      scopedInstruments: instruments,
      summary: summarisePortfolio(projects, data.financials),
    };
  }, [data, user]);
}
