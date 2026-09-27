import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { HardHat, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AssignEngineerDialog } from "@/features/projects/AssignEngineerDialog";
import { useReleaseAssignment } from "@/hooks/mutations";
import { labourCostForAssignment } from "@/domain/costing";
import { formatDate, formatINR } from "@/lib/format";
import type { Employee, Project, ProjectAssignment } from "@/types/models";

export function TeamTab({
  project,
  assignments,
  employeeById,
  canAssign,
  showCost,
}: {
  project: Project;
  assignments: ProjectAssignment[];
  employeeById: Map<string, Employee>;
  canAssign: boolean;
  showCost: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [releasing, setReleasing] = useState<ProjectAssignment | null>(null);
  const release = useReleaseAssignment();
  const active = assignments.filter((a) => !a.endDate);
  const past = assignments.filter((a) => a.endDate);
  const closed = project.status === "completed" || project.status === "archived";
  const manager = employeeById.get(project.managerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {active.length} engineer{active.length === 1 ? "" : "s"} currently deployed · Project manager: <strong className="text-foreground">{manager?.name}</strong>
        </p>
        {canAssign && (
          <Button onClick={() => setOpen(true)} disabled={closed} title={closed ? "Project is closed" : undefined}>
            <UserPlus /> Assign engineer
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HardHat />}
            title="No engineers assigned"
            description={closed ? "This project is closed." : "Assign site engineers to start tracking labour cost and progress."}
            action={canAssign && !closed ? <Button variant="outline" onClick={() => setOpen(true)}><UserPlus /> Assign engineer</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((a) => {
            const e = employeeById.get(a.employeeId);
            if (!e) return null;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={e.name} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/engineers/${e.id}`} className="font-medium hover:text-primary hover:underline">{e.name}</Link>
                    <p className="text-xs text-muted-foreground">{e.designation} · {e.code}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="info">{a.role}</Badge>
                      <Badge>{a.allocation}% allocation</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between border-t pt-3 text-xs text-muted-foreground">
                  <div>
                    <p>Since {formatDate(a.startDate)}</p>
                    {showCost && <p className="mt-0.5">Labour to date: <span className="font-medium text-foreground">{formatINR(labourCostForAssignment(a, e.monthlySalary))}</span></p>}
                  </div>
                  {canAssign && (
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => setReleasing(a)}>
                      <UserMinus /> Remove
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Previous team members</h3>
          <Card className="divide-y">
            {past.map((a) => {
              const e = employeeById.get(a.employeeId);
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <Avatar name={e?.name ?? "?"} className="size-7 text-[10px]" /> {e?.name} <span className="text-muted-foreground">· {a.role}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(a.startDate)} – {formatDate(a.endDate)}
                    {showCost && e && ` · ${formatINR(labourCostForAssignment(a, e.monthlySalary))}`}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      <AssignEngineerDialog open={open} onOpenChange={setOpen} projectId={project.id} />
      <ConfirmDialog
        open={!!releasing}
        onOpenChange={(o) => !o && setReleasing(null)}
        title="Remove engineer from project?"
        description={<>{employeeById.get(releasing?.employeeId ?? "")?.name} will be released from this project today. Labour cost already incurred remains on the project.</>}
        confirmLabel="Remove"
        destructive
        loading={release.isPending}
        onConfirm={() => releasing && release.mutate(releasing.id, { onSuccess: () => { toast.success("Engineer removed from project"); setReleasing(null); } })}
      />
    </div>
  );
}
