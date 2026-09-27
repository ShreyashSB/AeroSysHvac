import { CalendarDays, MapPin, User2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Money } from "@/components/common/Money";
import { CostBreakdownBar } from "@/features/dashboard/CostBreakdownBar";
import type { ProjectFinancials } from "@/domain/costing";
import { daysBetween, todayISO } from "@/lib/dates";
import { formatDate, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Employee, Project } from "@/types/models";

export function OverviewTab({ project, fin, manager, showFinance }: { project: Project; fin: ProjectFinancials; manager?: Employee; showFinance: boolean }) {
  const today = todayISO();
  const totalDays = Math.max(1, daysBetween(project.startDate, project.endDate));
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(project.startDate, today)));
  const timePct = (elapsed / totalDays) * 100;
  const daysLeft = daysBetween(today, project.endDate);
  const behind = project.status === "active" && timePct - project.completion > 15;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {showFinance && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Metric label="Contract value" value={<Money value={fin.contractValue} />} />
            <Metric label="Estimated cost (budget)" value={<Money value={fin.estimatedCost} />} />
            <Metric label="Actual cost to date" value={<Money value={fin.actualCost} />} sub={`${formatPct(fin.budgetUtilisation, 0)} of budget`} />
            <Metric label="Estimated profit" value={<Money value={fin.estimatedProfit} signed />} sub="Contract value − actual cost" />
            <Metric label="Profit margin" value={formatPct(fin.profitMargin)} tone={fin.profitMargin >= 0 ? "pos" : "neg"} />
            <Metric label="Completion" value={`${project.completion}%`} sub={<Progress value={project.completion} className="mt-1.5" />} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Start · {formatDate(project.startDate)}</span>
                <span>Expected completion · {formatDate(project.endDate)}</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: `${timePct}%` }} title={`Time elapsed ${formatPct(timePct, 0)}`} />
                <div className="absolute inset-y-[3px] left-0 rounded-full bg-primary" style={{ width: `${project.completion}%` }} title={`Work complete ${project.completion}%`} />
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary/30" /> Time elapsed {formatPct(timePct, 0)}</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Work complete {project.completion}%</span>
                <span className={cn("font-medium", daysLeft < 0 && project.completion < 100 ? "text-danger" : "text-muted-foreground")}>
                  {project.completion >= 100 ? "Completed" : daysLeft >= 0 ? `${daysLeft} days remaining` : `Overdue by ${-daysLeft} days`}
                </span>
              </div>
              {behind && (
                <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
                  Progress is trailing the schedule by {Math.round(timePct - project.completion)} percentage points.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{project.description || "No description provided."}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={<User2 />} label="Project manager" value={manager?.name ?? "—"} />
            <Row icon={<MapPin />} label="Site" value={project.site} />
            <Row icon={<CalendarDays />} label="Duration" value={`${totalDays} days`} />
            <Row label="Project code" value={project.code} />
            <Row label="Client" value={project.clientName} />
          </CardContent>
        </Card>
        {showFinance && (
          <Card>
            <CardHeader>
              <CardTitle>Cost composition</CardTitle>
            </CardHeader>
            <CardContent>
              <CostBreakdownBar costs={fin.costs} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "pos" | "neg" }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular", tone === "pos" && "text-success", tone === "neg" && "text-danger")}>{value}</p>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 w-4 text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
