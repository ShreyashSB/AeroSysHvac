import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, HardHat, Receipt, TrendingUp } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { ErrorState } from "@/components/common/States";
import { EXPENSE_STATUS, ExpenseStatusBadge, PROJECT_STATUS, ProjectStatusBadge } from "@/components/common/StatusBadges";
import { Money } from "@/components/common/Money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXPENSE_CATEGORIES } from "@/features/expenses/ExpenseFormDialog";
import { engineerLoad } from "@/features/employees/availability";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { formatINR, formatPct } from "@/lib/format";
import { cn, sum } from "@/lib/utils";
import type { Employee, Expense, Project, ProjectStatus } from "@/types/models";

type ProjectRow = { p: Project; value: number; cost: number; profit: number; margin: number };

export function ReportsPage() {
  const data = useAppData();
  const [tab, setTab] = useState("performance");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [exStatus, setExStatus] = useState("");
  const [exCategory, setExCategory] = useState("");
  const [exProject, setExProject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const projectRows = useMemo<ProjectRow[]>(
    () =>
      data.projects
        .filter((p) => (status ? p.status === status : p.status !== "archived") && (!manager || p.managerId === manager))
        .map((p) => {
          const fin = data.financials.get(p.id)!;
          return { p, value: p.contractValue, cost: fin.actualCost, profit: fin.estimatedProfit, margin: fin.profitMargin };
        }),
    [data.projects, data.financials, status, manager],
  );

  const expenseRows = useMemo(
    () =>
      data.expenses.filter(
        (e) =>
          (!exStatus || e.status === exStatus) &&
          (!exCategory || e.category === exCategory) &&
          (!exProject || e.projectId === exProject) &&
          (!from || e.date >= from) &&
          (!to || e.date <= to),
      ),
    [data.expenses, exStatus, exCategory, exProject, from, to],
  );

  const engineerRows = useMemo(
    () =>
      data.employees
        .filter((e) => e.isSiteEngineer)
        .map((e) => {
          const all = data.assignments.filter((a) => a.employeeId === e.id);
          const { open, allocation } = engineerLoad(e.id, data.assignments);
          return { e, open, allocation, projects: new Set(all.map((a) => a.projectId)).size };
        }),
    [data.employees, data.assignments],
  );

  const name = (id: string) => data.employeeById.get(id)?.name ?? "";
  const pname = (id: string) => data.projectById.get(id)?.name ?? "";
  const managers = [...new Set(data.projects.map((p) => p.managerId))].map((id) => data.employeeById.get(id)).filter((e): e is Employee => !!e);

  const perfCols: Column<ProjectRow>[] = [
    { key: "p", header: "Project", sortValue: (r) => r.p.name, cell: (r) => <Link to={`/projects/${r.p.id}`} className="font-medium hover:text-primary hover:underline">{r.p.name}</Link> },
    { key: "v", header: "Contract value", align: "right", sortValue: (r) => r.value, cell: (r) => <Money value={r.value} /> },
    { key: "c", header: "Cost", align: "right", sortValue: (r) => r.cost, cell: (r) => <Money value={r.cost} /> },
    { key: "pr", header: "Profit", align: "right", sortValue: (r) => r.profit, cell: (r) => <Money value={r.profit} signed /> },
    { key: "cm", header: "Completion", sortValue: (r) => r.p.completion, cell: (r) => <div className="flex w-28 items-center gap-2"><Progress value={r.p.completion} /><span className="text-xs tabular">{r.p.completion}%</span></div> },
    { key: "s", header: "Status", sortValue: (r) => r.p.status, cell: (r) => <ProjectStatusBadge status={r.p.status} /> },
  ];
  const profitCols: Column<ProjectRow>[] = [
    { key: "p", header: "Project", sortValue: (r) => r.p.name, cell: (r) => <><p className="font-medium">{r.p.name}</p><p className="text-xs text-muted-foreground">{r.p.clientName}</p></> },
    { key: "v", header: "Contract value", align: "right", sortValue: (r) => r.value, cell: (r) => <span className="tabular">{formatINR(r.value)}</span> },
    { key: "c", header: "Cost", align: "right", sortValue: (r) => r.cost, cell: (r) => <span className="tabular">{formatINR(r.cost)}</span> },
    { key: "pr", header: "Profit", align: "right", sortValue: (r) => r.profit, cell: (r) => <span className={cn("tabular font-medium", r.profit < 0 ? "text-danger" : "text-success")}>{formatINR(r.profit)}</span> },
    {
      key: "m",
      header: "Margin",
      align: "right",
      sortValue: (r) => r.margin,
      cell: (r) => <Badge tone={r.margin < 10 ? "danger" : r.margin < 25 ? "warning" : "success"}>{formatPct(r.margin)}</Badge>,
    },
  ];
  const expCols: Column<Expense>[] = [
    { key: "d", header: "Date", sortValue: (e) => e.date, cell: (e) => e.date },
    { key: "e", header: "Employee", sortValue: (e) => name(e.employeeId), cell: (e) => name(e.employeeId) },
    { key: "p", header: "Project", sortValue: (e) => pname(e.projectId), cell: (e) => pname(e.projectId) },
    { key: "c", header: "Category", sortValue: (e) => e.category, cell: (e) => e.category },
    { key: "a", header: "Amount", align: "right", sortValue: (e) => e.amount, cell: (e) => <span className="tabular">{formatINR(e.amount)}</span> },
    { key: "s", header: "Status", sortValue: (e) => e.status, cell: (e) => <ExpenseStatusBadge status={e.status} /> },
  ];
  type EngRow = (typeof engineerRows)[number];
  const engCols: Column<EngRow>[] = [
    { key: "n", header: "Engineer", sortValue: (r) => r.e.name, cell: (r) => <Link to={`/engineers/${r.e.id}`} className="font-medium hover:text-primary hover:underline">{r.e.name}</Link> },
    { key: "cp", header: "Current project", cell: (r) => (r.open.length ? r.open.map((a) => pname(a.projectId)).join(", ") : <span className="text-muted-foreground">—</span>) },
    { key: "np", header: "No. of projects", align: "right", sortValue: (r) => r.projects, cell: (r) => r.projects },
    { key: "u", header: "Utilisation", sortValue: (r) => r.allocation, cell: (r) => <div className="flex w-32 items-center gap-2"><Progress value={Math.min(100, r.allocation)} tone={r.allocation > 100 ? "warning" : "primary"} /><span className="text-xs tabular">{r.allocation}%</span></div> },
    { key: "s", header: "Assignment status", sortValue: (r) => r.allocation, cell: (r) => r.e.status === "on_leave" ? <Badge tone="warning">On leave</Badge> : r.allocation === 0 ? <Badge tone="success">Unassigned</Badge> : r.allocation >= 100 ? <Badge>Fully assigned</Badge> : <Badge tone="info">Partially assigned</Badge> },
  ];

  const exporters: Record<string, () => void> = {
    performance: () => exportRows("project-performance", projectRows, [
      { header: "Project", value: (r) => r.p.name }, { header: "Client", value: (r) => r.p.clientName },
      { header: "Contract value", value: (r) => Math.round(r.value) }, { header: "Cost", value: (r) => Math.round(r.cost) },
      { header: "Profit", value: (r) => Math.round(r.profit) }, { header: "Completion %", value: (r) => r.p.completion },
      { header: "Status", value: (r) => PROJECT_STATUS[r.p.status].label },
    ]),
    expenses: () => exportRows("expense-report", expenseRows, [
      { header: "Date", value: (e) => e.date }, { header: "Employee", value: (e) => name(e.employeeId) },
      { header: "Project", value: (e) => pname(e.projectId) }, { header: "Category", value: (e) => e.category },
      { header: "Description", value: (e) => e.description }, { header: "Amount", value: (e) => e.amount },
      { header: "Status", value: (e) => EXPENSE_STATUS[e.status].label },
    ]),
    utilisation: () => exportRows("engineer-utilisation", engineerRows, [
      { header: "Engineer", value: (r) => r.e.name }, { header: "Employee ID", value: (r) => r.e.code },
      { header: "Current project(s)", value: (r) => r.open.map((a) => pname(a.projectId)).join("; ") },
      { header: "No. of projects", value: (r) => r.projects }, { header: "Allocation %", value: (r) => r.allocation },
    ]),
    profitability: () => exportRows("profitability", projectRows, [
      { header: "Project", value: (r) => r.p.name }, { header: "Contract value", value: (r) => Math.round(r.value) },
      { header: "Cost", value: (r) => Math.round(r.cost) }, { header: "Profit", value: (r) => Math.round(r.profit) },
      { header: "Margin %", value: (r) => r.margin.toFixed(1) },
    ]),
  };

  if (data.error) return <ErrorState error={data.error} />;

  const totals = { value: sum(projectRows, (r) => r.value), cost: sum(projectRows, (r) => r.cost) };
  const projectFilters = (
    <FilterBar onReset={() => { setStatus(""); setManager(""); }} showReset={!!(status || manager)}>
      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto" aria-label="Filter by status">
        <option value="">All statuses (excl. archived)</option>
        {(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((s) => (<option key={s} value={s}>{PROJECT_STATUS[s].label}</option>))}
      </Select>
      <Select value={manager} onChange={(e) => setManager(e.target.value)} className="w-auto" aria-label="Filter by manager">
        <option value="">All managers</option>
        {managers.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
      </Select>
    </FilterBar>
  );
  const totalsFooter = (
    <tr>
      <td className="px-4 py-3">Total ({projectRows.length} projects)</td>
      <td className="px-4 py-3 text-right tabular">{formatINR(totals.value)}</td>
      <td className="px-4 py-3 text-right tabular">{formatINR(totals.cost)}</td>
      <td className="px-4 py-3 text-right tabular">{formatINR(totals.value - totals.cost)}</td>
      <td className="px-4 py-3 text-right tabular" colSpan={2}>{formatPct(totals.value ? ((totals.value - totals.cost) / totals.value) * 100 : 0)}</td>
    </tr>
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Live reports calculated from current project, expense and assignment data."
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Reports" }]}
        actions={<Button variant="outline" onClick={exporters[tab]}><Download /> Export CSV (Excel)</Button>}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="performance"><BarChart3 /> Project performance</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt /> Expense report</TabsTrigger>
          <TabsTrigger value="utilisation"><HardHat /> Engineer utilisation</TabsTrigger>
          <TabsTrigger value="profitability"><TrendingUp /> Profitability</TabsTrigger>
        </TabsList>
        <TabsContent value="performance">
          {projectFilters}
          <DataTable rows={projectRows} columns={perfCols} rowKey={(r) => r.p.id} loading={data.isLoading} pageSize={15} initialSort={{ key: "v", dir: "desc" }} />
        </TabsContent>
        <TabsContent value="expenses">
          <FilterBar onReset={() => { setExStatus(""); setExCategory(""); setExProject(""); setFrom(""); setTo(""); }} showReset={!!(exStatus || exCategory || exProject || from || to)}>
            <Select value={exProject} onChange={(e) => setExProject(e.target.value)} className="w-auto max-w-56" aria-label="Filter by project">
              <option value="">All projects</option>
              {data.projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </Select>
            <Select value={exStatus} onChange={(e) => setExStatus(e.target.value)} className="w-auto" aria-label="Filter by status">
              <option value="">All statuses</option>
              {Object.entries(EXPENSE_STATUS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </Select>
            <Select value={exCategory} onChange={(e) => setExCategory(e.target.value)} className="w-auto" aria-label="Filter by category">
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label="To date" />
          </FilterBar>
          <div className="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{expenseRows.length} expenses</span>
            <span>Total <strong className="text-foreground">{formatINR(sum(expenseRows, (e) => e.amount))}</strong></span>
            <span>Approved <strong className="text-foreground">{formatINR(sum(expenseRows.filter((e) => e.status === "approved"), (e) => e.amount))}</strong></span>
          </div>
          <DataTable rows={expenseRows} columns={expCols} rowKey={(e) => e.id} loading={data.isLoading} pageSize={15} initialSort={{ key: "d", dir: "desc" }} />
        </TabsContent>
        <TabsContent value="utilisation">
          <DataTable rows={engineerRows} columns={engCols} rowKey={(r) => r.e.id} loading={data.isLoading} pageSize={20} initialSort={{ key: "u", dir: "desc" }} />
        </TabsContent>
        <TabsContent value="profitability">
          {projectFilters}
          <DataTable rows={projectRows} columns={profitCols} rowKey={(r) => r.p.id} loading={data.isLoading} pageSize={15} initialSort={{ key: "m", dir: "desc" }} footer={totalsFooter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function exportRows<T>(name: string, rows: T[], cols: CsvColumn<T>[]) {
  downloadCsv(`aerosys-${name}-${todayISO()}`, toCsv(rows, cols));
}
