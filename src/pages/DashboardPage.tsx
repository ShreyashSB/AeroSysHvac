import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock, Percent, FolderKanban, Gauge, IndianRupee, Plus, Receipt, TrendingUp, Wallet, Wrench,
} from "lucide-react";
import { useCurrentUser } from "@/auth/AuthContext";
import { can, ROLE_LABELS } from "@/auth/permissions";
import { useScopedData } from "@/hooks/useAppData";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ErrorState, EmptyState } from "@/components/common/States";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress, Skeleton } from "@/components/ui/misc";
import { ProjectStatusBadge, PROJECT_STATUS, InstrumentStatusBadge } from "@/components/common/StatusBadges";
import { Money } from "@/components/common/Money";
import { ContractCostChart } from "@/features/dashboard/ContractCostChart";
import { CostBreakdownBar } from "@/features/dashboard/CostBreakdownBar";
import { ExpenseTable } from "@/features/expenses/ExpenseTable";
import { ExpenseFormDialog } from "@/features/expenses/ExpenseFormDialog";
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { daysBetween, todayISO } from "@/lib/dates";
import { formatDate, formatINR, formatINRShort, formatPct } from "@/lib/format";
import { sum } from "@/lib/utils";
import type { CostBreakdown } from "@/domain/costing";
import type { ProjectStatus } from "@/types/models";

export function DashboardPage() {
  const { user } = useCurrentUser();
  return user.role === "site_engineer" ? <EngineerDashboard /> : <PortfolioDashboard />;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function PortfolioDashboard() {
  const { user, employee } = useCurrentUser();
  const data = useScopedData();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { summary, scopedProjects: projects, financials, isLoading, error } = data;
  const showFinance = can(user.role, "finance.view");
  const today = todayISO();

  const pendingForMe = useMemo(
    () =>
      data.scopedExpenses.filter(
        (e) => e.status === "pending" && (user.role !== "project_manager" || data.projectById.get(e.projectId)?.managerId === user.employeeId),
      ),
    [data.scopedExpenses, data.projectById, user],
  );

  const portfolioCosts = useMemo(() => {
    const keys: Array<keyof CostBreakdown> = ["labour", "material", "engineerExpenses", "travelAccommodation", "instruments", "other", "total", "engineerSalaries", "subcontractLabour"];
    const out = Object.fromEntries(keys.map((k) => [k, 0])) as unknown as CostBreakdown;
    for (const p of projects) {
      const f = financials.get(p.id);
      if (!f || p.status === "archived") continue;
      for (const k of keys) out[k] += f.costs[k];
    }
    return out;
  }, [projects, financials]);

  const forecastProfit = sum(
    projects.filter((p) => p.status !== "archived"),
    (p) => financials.get(p.id)?.forecastProfit ?? 0,
  );

  const atRisk = useMemo(
    () =>
      projects
        .filter((p) => p.status === "active" || p.status === "on_hold")
        .map((p) => {
          const f = financials.get(p.id)!;
          const daysLeft = daysBetween(today, p.endDate);
          const reasons: string[] = [];
          if (daysLeft < 0) reasons.push(`Overdue by ${-daysLeft}d`);
          else if (daysLeft <= 30 && p.completion < 90) reasons.push(`Due in ${daysLeft}d at ${p.completion}%`);
          if (f && f.budgetUtilisation > 85 && p.completion < 85) reasons.push(`${formatPct(f.budgetUtilisation, 0)} budget used`);
          if (p.status === "on_hold") reasons.push("On hold");
          return { p, reasons };
        })
        .filter((x) => x.reasons.length > 0),
    [projects, financials, today],
  );

  if (error) return <ErrorState error={error} />;

  const statusCounts = (Object.keys(PROJECT_STATUS) as ProjectStatus[])
    .filter((s) => s !== "archived")
    .map((s) => ({ s, n: projects.filter((p) => p.status === s).length }));

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${employee.name.split(" ")[0]}`}
        description={
          user.role === "project_manager"
            ? `Overview of the ${projects.length} projects you manage.`
            : `${ROLE_LABELS[user.role]} overview across all Aerosys HVAC projects.`
        }
        actions={
          <>
            {can(user.role, "expense.approve") && pendingForMe.length > 0 && (
              <Button variant="outline" onClick={() => navigate("/expenses?status=pending")}>
                <Receipt /> {pendingForMe.length} pending approval{pendingForMe.length > 1 ? "s" : ""}
              </Button>
            )}
            {can(user.role, "project.create") && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> New project
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
        <StatCard label="Total Projects" value={summary.totalProjects} icon={<FolderKanban />} loading={isLoading} hint={`${summary.planningProjects} planning · ${summary.onHoldProjects} on hold`} />
        <StatCard label="Active Projects" value={summary.activeProjects} icon={<Gauge />} loading={isLoading} />
        <StatCard label="Completed" value={summary.completedProjects} icon={<CheckCircle2 />} loading={isLoading} />
        {showFinance && (
          <>
            <StatCard label="Total Contract Value" value={<Money value={summary.totalContractValue} />} icon={<IndianRupee />} loading={isLoading} />
            <StatCard label="Total Cost" value={<Money value={summary.totalCost} />} icon={<Wallet />} loading={isLoading} hint="Approved costs to date" />
            <StatCard
              label="Estimated Profit"
              value={<Money value={summary.estimatedProfit} />}
              icon={<TrendingUp />}
              loading={isLoading}
              tone={summary.estimatedProfit >= 0 ? "positive" : "negative"}
              hint={`${formatPct(summary.profitMargin)} margin · forecast ${formatINRShort(forecastProfit)} at completion`}
            />
          </>
        )}
        <StatCard label="Avg. Completion" value={formatPct(summary.averageCompletion, 0)} icon={<Percent />} loading={isLoading} hint={<Progress value={summary.averageCompletion} className="mt-1" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {showFinance && (
          <Card className="xl:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Contract value vs. cost to date</CardTitle>
                <CardDescription>Top projects by contract value. Cost includes labour, material, approved expenses and equipment.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>{isLoading ? <Skeleton className="h-80" /> : <ContractCostChart projects={projects} financials={financials} />}</CardContent>
          </Card>
        )}
        <Card className={showFinance ? "" : "xl:col-span-3"}>
          <CardHeader>
            <div>
              <CardTitle>Projects by status</CardTitle>
              <CardDescription>{summary.totalProjects} projects</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusCounts.map(({ s, n }) => (
              <Link key={s} to={`/projects?status=${s}`} className="block rounded-md p-1 hover:bg-muted/60">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <ProjectStatusBadge status={s} />
                  <span className="tabular font-medium">{n}</span>
                </div>
                <Progress value={summary.totalProjects ? (n / summary.totalProjects) * 100 : 0} tone={s === "completed" ? "success" : s === "on_hold" ? "warning" : "primary"} />
              </Link>
            ))}
            {showFinance && !isLoading && (
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-semibold">Cost composition</p>
                <CostBreakdownBar costs={portfolioCosts} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Active projects</CardTitle>
              <CardDescription>Progress and profitability of running projects</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {isLoading ? (
              <div className="space-y-3 px-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-5 py-2 text-left font-medium">Project</th>
                      <th className="px-3 py-2 text-left font-medium">Completion</th>
                      {showFinance && <th className="px-3 py-2 text-right font-medium">Cost</th>}
                      {showFinance && <th className="px-5 py-2 text-right font-medium">Est. profit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projects
                      .filter((p) => p.status === "active")
                      .map((p) => {
                        const f = financials.get(p.id)!;
                        return (
                          <tr key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${p.id}`)}>
                            <td className="px-5 py-2.5">
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.clientName}</p>
                            </td>
                            <td className="w-44 px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <Progress value={p.completion} className="w-24" />
                                <span className="tabular text-xs">{p.completion}%</span>
                              </div>
                            </td>
                            {showFinance && <td className="px-3 py-2.5 text-right"><Money value={f.actualCost} /></td>}
                            {showFinance && (
                              <td className="px-5 py-2.5 text-right">
                                <Money value={f.estimatedProfit} signed />
                                <span className="ml-1 text-xs text-muted-foreground">({formatPct(f.profitMargin, 0)})</span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {projects.filter((p) => p.status === "active").length === 0 && <EmptyState title="No active projects" />}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" /> Needs attention
              </CardTitle>
              <CardDescription>Deadlines, budget and on-hold projects</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : atRisk.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing needs attention right now.</p>
            ) : (
              atRisk.map(({ p, reasons }) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="block rounded-md border p-3 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{p.name}</p>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {reasons.map((r) => (
                      <Badge key={r} tone="warning">
                        <Clock className="size-3" /> {r}
                      </Badge>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {(can(user.role, "expense.approve") || can(user.role, "expense.viewAll")) && (
        <Card className="mt-6">
          <CardHeader>
            <div>
              <CardTitle>Expenses awaiting approval</CardTitle>
              <CardDescription>
                {pendingForMe.length} claims · {formatINR(sum(pendingForMe, (e) => e.amount))} — approved claims are added to project cost immediately
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/expenses?status=pending">Open expenses</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ExpenseTable expenses={pendingForMe} loading={isLoading} pageSize={5} />
          </CardContent>
        </Card>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function EngineerDashboard() {
  const { user, employee } = useCurrentUser();
  const data = useScopedData();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const { isLoading, error } = data;

  const myAssignments = data.assignments.filter((a) => a.employeeId === user.employeeId && !a.endDate);
  const myExpenses = data.scopedExpenses;
  const myInstruments = data.instruments.filter((i) => i.assignedEngineerId === user.employeeId);
  const pending = myExpenses.filter((e) => e.status === "pending");
  const approvedThisMonth = myExpenses.filter((e) => e.status === "approved" && e.date.slice(0, 7) === todayISO().slice(0, 7));

  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${employee.name.split(" ")[0]}`}
        description={`${employee.designation} · ${employee.baseLocation}`}
        actions={
          <Button onClick={() => setExpenseOpen(true)}>
            <Plus /> Add expense
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active assignments" value={myAssignments.length} icon={<FolderKanban />} loading={isLoading} />
        <StatCard label="Pending claims" value={pending.length} icon={<Clock />} loading={isLoading} hint={formatINR(sum(pending, (e) => e.amount))} />
        <StatCard label="Approved this month" value={formatINRShort(sum(approvedThisMonth, (e) => e.amount))} icon={<CheckCircle2 />} loading={isLoading} hint={`${approvedThisMonth.length} claims`} />
        <StatCard label="Instruments with me" value={myInstruments.length} icon={<Wrench />} loading={isLoading} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">My assigned projects</h2>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : myAssignments.length === 0 ? (
        <Card><EmptyState icon={<FolderKanban />} title="No active assignments" description="Your project manager will assign you to a project." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {myAssignments.map((a) => {
            const p = data.projectById.get(a.projectId)!;
            const daysLeft = daysBetween(todayISO(), p.endDate);
            return (
              <Link key={a.id} to={`/projects/${p.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.site}</p>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={p.completion} />
                    <span className="text-sm font-medium tabular">{p.completion}%</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-muted-foreground">My role</p><p className="font-medium">{a.role}</p></div>
                    <div><p className="text-muted-foreground">Manager</p><p className="font-medium">{data.employeeById.get(p.managerId)?.name}</p></div>
                    <div><p className="text-muted-foreground">Due</p><p className={daysLeft < 0 ? "font-medium text-danger" : "font-medium"}>{formatDate(p.endDate)}</p></div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <div>
            <CardTitle>My instruments</CardTitle>
            <CardDescription>Equipment issued to you</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild><Link to="/instruments">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {myInstruments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No instruments issued.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {myInstruments.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{i.code} · {data.projectById.get(i.assignedProjectId ?? "")?.name}</p>
                  </div>
                  <InstrumentStatusBadge status={i.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>My recent expenses</CardTitle>
            <CardDescription>Track the approval status of your claims</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild><Link to="/expenses">View all</Link></Button>
        </CardHeader>
        <CardContent>
          <ExpenseTable expenses={myExpenses} loading={isLoading} hideEmployee pageSize={5} />
        </CardContent>
      </Card>
      <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
    </div>
  );
}
