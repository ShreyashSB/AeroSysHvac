import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Mail, MapPin, Pencil, Phone, UserPlus, Wrench } from "lucide-react";
import { useCurrentUser } from "@/auth/AuthContext";
import { can } from "@/auth/permissions";
import { useAppData } from "@/hooks/useAppData";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, PageSkeleton, EmptyState } from "@/components/common/States";
import { EmployeeStatusBadge, InstrumentStatusBadge, ProjectStatusBadge } from "@/components/common/StatusBadges";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, Progress } from "@/components/ui/misc";
import { EmployeeFormDialog } from "@/features/employees/EmployeeFormDialog";
import { AssignEngineerDialog } from "@/features/projects/AssignEngineerDialog";
import { ExpenseTable } from "@/features/expenses/ExpenseTable";
import { availabilityOf, engineerLoad } from "@/features/employees/availability";
import { labourCostForAssignment } from "@/domain/costing";
import { formatDate, formatINR } from "@/lib/format";
import { sum } from "@/lib/utils";
import { NotFoundPage } from "./StatusPages";

export function EngineerDetailPage() {
  const { id = "" } = useParams();
  const { user } = useCurrentUser();
  const data = useAppData();
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  if (data.isLoading) return <PageSkeleton />;
  if (data.error) return <ErrorState error={data.error} />;
  const emp = data.employeeById.get(id);
  if (!emp) return <NotFoundPage />;

  const assignments = data.assignments.filter((a) => a.employeeId === id).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const { open, allocation } = engineerLoad(id, data.assignments);
  const past = assignments.filter((a) => a.endDate);
  const expenses = data.expenses.filter((e) => e.employeeId === id);
  const instruments = data.instruments.filter((i) => i.assignedEngineerId === id);
  const avail = availabilityOf(emp, allocation);
  const showSalary = can(user.role, "salary.view");

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Site Engineers", to: "/engineers" }, { label: emp.name }]}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={emp.name} className="size-11 text-sm" />
            <span>
              {emp.name}
              <span className="block text-sm font-normal text-muted-foreground">{emp.designation} · {emp.code}</span>
            </span>
          </span>
        }
        actions={
          <>
            {can(user.role, "project.assign") && (
              <Button variant="outline" onClick={() => setAssignOpen(true)} disabled={emp.status === "inactive"}>
                <UserPlus /> Assign to project
              </Button>
            )}
            {can(user.role, "engineer.manage") && (
              <Button onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <EmployeeStatusBadge status={emp.status} />
        <Badge tone={avail.tone}>{avail.label}</Badge>
        <span className="flex items-center gap-1.5"><Mail className="size-4" /> {emp.email}</span>
        <span className="flex items-center gap-1.5"><Phone className="size-4" /> {emp.phone}</span>
        <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {emp.baseLocation}</span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Current allocation" value={`${allocation}%`} hint={<Progress value={Math.min(allocation, 100)} className="mt-1" />} />
        <StatCard label="Projects (all time)" value={new Set(assignments.map((a) => a.projectId)).size} />
        <StatCard label="Approved expenses" value={formatINR(sum(expenses.filter((e) => e.status === "approved"), (e) => e.amount))} hint={`${expenses.filter((e) => e.status === "pending").length} pending`} />
        {showSalary ? <StatCard label="Monthly salary" value={formatINR(emp.monthlySalary)} hint="Used for labour costing" /> : <StatCard label="Instruments issued" value={instruments.length} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Current assignments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {open.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Not assigned to any project.</p>
            ) : (
              open.map((a) => {
                const p = data.projectById.get(a.projectId)!;
                return (
                  <Link key={a.id} to={`/projects/${p.id}?tab=team`} className="flex flex-wrap items-center gap-4 rounded-md border p-3 hover:bg-muted/50">
                    <div className="min-w-48 flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.site} · since {formatDate(a.startDate)}</p>
                    </div>
                    <Badge tone="info">{a.role}</Badge>
                    <Badge>{a.allocation}%</Badge>
                    <div className="flex w-32 items-center gap-2"><Progress value={p.completion} /><span className="text-xs">{p.completion}%</span></div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="size-4" /> Instruments assigned</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {instruments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No instruments issued.</p>
            ) : (
              instruments.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.code} · {data.projectById.get(i.assignedProjectId ?? "")?.name}</p>
                  </div>
                  <InstrumentStatusBadge status={i.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Project history</CardTitle></CardHeader>
        <CardContent className="px-0">
          {past.length === 0 ? (
            <EmptyState title="No completed assignments yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-5 py-2 text-left font-medium">Project</th>
                    <th className="px-3 py-2 text-left font-medium">Role</th>
                    <th className="px-3 py-2 text-left font-medium">Period</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    {showSalary && <th className="px-5 py-2 text-right font-medium">Labour cost</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {past.map((a) => {
                    const p = data.projectById.get(a.projectId);
                    return (
                      <tr key={a.id}>
                        <td className="px-5 py-2.5"><Link to={`/projects/${a.projectId}`} className="font-medium hover:text-primary hover:underline">{p?.name}</Link></td>
                        <td className="px-3 py-2.5">{a.role} · {a.allocation}%</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{formatDate(a.startDate)} – {formatDate(a.endDate)}</td>
                        <td className="px-3 py-2.5">{p && <ProjectStatusBadge status={p.status} />}</td>
                        {showSalary && <td className="px-5 py-2.5 text-right tabular">{formatINR(labourCostForAssignment(a, emp.monthlySalary))}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Expense history</h2>
        <ExpenseTable expenses={expenses} hideEmployee />
      </div>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={emp} />
      <AssignEngineerDialog open={assignOpen} onOpenChange={setAssignOpen} employeeId={emp.id} />
    </div>
  );
}
