import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Activity, Calculator, LayoutGrid, MapPin, Pencil, Plus, Receipt, Users, Wrench, Building2 } from "lucide-react";
import { useCurrentUser } from "@/auth/AuthContext";
import { can, canManageProject } from "@/auth/permissions";
import { useScopedData } from "@/hooks/useAppData";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, PageSkeleton } from "@/components/common/States";
import { ProjectStatusBadge } from "@/components/common/StatusBadges";
import { Money } from "@/components/common/Money";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { ExpenseFormDialog } from "@/features/expenses/ExpenseFormDialog";
import { ExpenseTable } from "@/features/expenses/ExpenseTable";
import { OverviewTab } from "@/features/projects/tabs/OverviewTab";
import { TeamTab } from "@/features/projects/tabs/TeamTab";
import { InstrumentsTab } from "@/features/projects/tabs/InstrumentsTab";
import { CostsTab } from "@/features/projects/tabs/CostsTab";
import { ProgressTab } from "@/features/projects/tabs/ProgressTab";
import { ForbiddenPage, NotFoundPage } from "./StatusPages";
import { formatINR } from "@/lib/format";
import { sum } from "@/lib/utils";

export function ProjectDetailPage() {
  const { id = "" } = useParams();
  const { user } = useCurrentUser();
  const data = useScopedData();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const [editOpen, setEditOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  if (data.isLoading) return <PageSkeleton />;
  if (data.error) return <ErrorState error={data.error} />;
  const project = data.projectById.get(id);
  if (!project) return <NotFoundPage />;
  if (!data.scopedProjectIds.has(id)) return <ForbiddenPage />;

  const fin = data.financials.get(id)!;
  const manager = data.employeeById.get(project.managerId);
  const assignments = data.assignments.filter((a) => a.projectId === id);
  const isManager = canManageProject(user, project);
  const isAssignedEngineer = assignments.some((a) => a.employeeId === user.employeeId && !a.endDate);
  const showFinance = can(user.role, "finance.view");
  const canEdit = can(user.role, "project.edit") && isManager;
  const canProgress = can(user.role, "project.progress") && (isManager || isAssignedEngineer);
  const canAddExpense = can(user.role, "expense.create") && (user.role !== "site_engineer" || isAssignedEngineer) && project.status !== "archived" && project.status !== "completed";
  const canEditCosts = can(user.role, "project.costs.edit") && (user.role !== "project_manager" || isManager);

  const projectExpenses = (user.role === "site_engineer" ? data.scopedExpenses : data.expenses).filter((e) => e.projectId === id);
  const pending = projectExpenses.filter((e) => e.status === "pending");

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Projects", to: "/projects" }, { label: project.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name} <ProjectStatusBadge status={project.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1"><Building2 className="size-3.5" /> {project.clientName}</span>
            <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {project.site}</span>
            <span>{project.code}</span>
          </span>
        }
        actions={
          <>
            {canAddExpense && (
              <Button variant="outline" onClick={() => setExpenseOpen(true)}>
                <Plus /> Add expense
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border bg-surface p-4 md:grid-cols-4">
        <HeaderStat label="Completion">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tabular">{project.completion}%</span>
            <Progress value={project.completion} className="w-24" tone={project.completion === 100 ? "success" : "primary"} />
          </div>
        </HeaderStat>
        {showFinance ? (
          <>
            <HeaderStat label="Contract value"><span className="text-lg font-semibold"><Money value={project.contractValue} /></span></HeaderStat>
            <HeaderStat label="Cost to date"><span className="text-lg font-semibold"><Money value={fin.actualCost} /></span></HeaderStat>
            <HeaderStat label="Estimated profit">
              <span className="text-lg font-semibold"><Money value={fin.estimatedProfit} signed /></span>
              <span className="ml-1.5 text-xs text-muted-foreground">{fin.profitMargin.toFixed(1)}%</span>
            </HeaderStat>
          </>
        ) : (
          <>
            <HeaderStat label="Project manager"><span className="font-medium">{manager?.name}</span></HeaderStat>
            <HeaderStat label="Team size"><span className="font-medium">{assignments.filter((a) => !a.endDate).length} engineers</span></HeaderStat>
            <HeaderStat label="My pending claims"><span className="font-medium">{formatINR(sum(pending, (e) => e.amount))}</span></HeaderStat>
          </>
        )}
      </div>

      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="overview"><LayoutGrid /> Overview</TabsTrigger>
          <TabsTrigger value="team"><Users /> Team</TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt /> Expenses {pending.length > 0 && <span className="rounded-full bg-warning-soft px-1.5 text-xs text-warning">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="instruments"><Wrench /> Instruments</TabsTrigger>
          {showFinance && <TabsTrigger value="costs"><Calculator /> Costs</TabsTrigger>}
          <TabsTrigger value="progress"><Activity /> Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab project={project} fin={fin} manager={manager} showFinance={showFinance} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab
            project={project}
            assignments={assignments}
            employeeById={data.employeeById}
            canAssign={can(user.role, "project.assign") && isManager}
            showCost={can(user.role, "salary.view")}
          />
        </TabsContent>
        <TabsContent value="expenses">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {projectExpenses.length} expenses · Approved {formatINR(sum(projectExpenses.filter((e) => e.status === "approved"), (e) => e.amount))} · Pending{" "}
              {formatINR(sum(pending, (e) => e.amount))}
            </p>
            {canAddExpense && (
              <Button onClick={() => setExpenseOpen(true)}>
                <Plus /> Add expense
              </Button>
            )}
          </div>
          <ExpenseTable
            expenses={projectExpenses}
            hideProject
            emptyAction={canAddExpense ? <Button variant="outline" onClick={() => setExpenseOpen(true)}><Plus /> Add expense</Button> : undefined}
          />
        </TabsContent>
        <TabsContent value="instruments">
          <InstrumentsTab
            project={project}
            instruments={data.instruments}
            deployments={data.deployments}
            employeeById={data.employeeById}
            instrumentById={data.instrumentById}
            canManage={can(user.role, "instrument.manage") && isManager}
            showCost={showFinance}
            monthlyRatePct={data.settings?.instrumentMonthlyRatePct ?? 3}
          />
        </TabsContent>
        {showFinance && (
          <TabsContent value="costs">
            <CostsTab project={project} fin={fin} costs={data.projectCosts.filter((c) => c.projectId === id)} canEdit={canEditCosts} />
          </TabsContent>
        )}
        <TabsContent value="progress">
          <ProgressTab project={project} canUpdate={canProgress} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} projectId={project.id} />
    </div>
  );
}

function HeaderStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-center">{children}</div>
    </div>
  );
}
