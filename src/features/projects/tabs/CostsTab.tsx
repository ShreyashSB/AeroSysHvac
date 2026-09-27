import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Money } from "@/components/common/Money";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useForm, type Errors } from "@/hooks/useForm";
import { useCreateProjectCost, useDeleteProjectCost } from "@/hooks/mutations";
import type { ProjectFinancials } from "@/domain/costing";
import { todayISO } from "@/lib/dates";
import { formatDate, formatINR, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Project, ProjectCost, ProjectCostType } from "@/types/models";

const TYPE_LABEL: Record<ProjectCostType, string> = {
  material: "Material",
  labour_contract: "Sub-contract labour",
  other: "Other",
};

export function CostsTab({ project, fin, costs, canEdit }: { project: Project; fin: ProjectFinancials; costs: ProjectCost[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProjectCost | null>(null);
  const del = useDeleteProjectCost();
  const c = fin.costs;

  const lines: Array<{ label: string; value: number; note: string }> = [
    { label: "Labour cost", value: c.labour, note: `Engineer salaries ${formatINR(c.engineerSalaries)} (pro-rated by allocation) + sub-contract ${formatINR(c.subcontractLabour)}` },
    { label: "Material cost", value: c.material, note: "Equipment & material purchase entries" },
    { label: "Engineer expenses", value: c.engineerExpenses, note: "Approved site expenses (food, conveyance, material, tools…)" },
    { label: "Travel / accommodation", value: c.travelAccommodation, note: "Approved travel & stay expenses" },
    { label: "Instrument / equipment cost", value: c.instruments, note: "Usage charge for deployed instruments" },
    { label: "Other costs", value: c.other, note: "Hire, rentals, testing, transport" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-3">
        <CardHeader>
          <div>
            <CardTitle>Cost calculation</CardTitle>
            <CardDescription>Live — recalculates when expenses are approved, engineers assigned or costs added.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {lines.map((l, i) => (
                <tr key={l.label}>
                  <td className="w-8 py-2.5 pl-5 text-muted-foreground">{i === 0 ? "" : "+"}</td>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{l.label}</p>
                    <p className="text-xs text-muted-foreground">{l.note}</p>
                  </td>
                  <td className="py-2.5 pr-5 text-right tabular">{formatINR(l.value)}</td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-semibold">
                <td className="py-3 pl-5">=</td>
                <td className="py-3">Total cost</td>
                <td className="py-3 pr-5 text-right tabular">{formatINR(c.total)}</td>
              </tr>
              <tr>
                <td className="py-2.5 pl-5" />
                <td className="py-2.5">Contract value</td>
                <td className="py-2.5 pr-5 text-right tabular">{formatINR(project.contractValue)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="py-3 pl-5">=</td>
                <td className="py-3">
                  Estimated profit <span className="font-normal text-muted-foreground">(contract value − total cost)</span>
                </td>
                <td className={cn("py-3 pr-5 text-right tabular", fin.estimatedProfit < 0 ? "text-danger" : "text-success")}>{formatINR(fin.estimatedProfit)}</td>
              </tr>
              <tr>
                <td className="py-2.5 pl-5" />
                <td className="py-2.5">
                  Profit margin <span className="text-muted-foreground">(profit ÷ contract value × 100)</span>
                </td>
                <td className="py-2.5 pr-5 text-right font-semibold tabular">{formatPct(fin.profitMargin)}</td>
              </tr>
            </tbody>
          </table>
          {fin.pendingExpenses > 0 && (
            <p className="mx-5 mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              {formatINR(fin.pendingExpenses)} of expenses are pending approval and not yet included.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Forecast at completion</CardTitle>
              <CardDescription>Actual cost + remaining budget for unfinished work</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Budget</p><p className="text-lg font-semibold"><Money value={fin.estimatedCost} /></p></div>
            <div><p className="text-xs text-muted-foreground">Budget used</p><p className={cn("text-lg font-semibold", fin.budgetUtilisation > project.completion + 10 && "text-warning")}>{formatPct(fin.budgetUtilisation, 0)}</p></div>
            <div><p className="text-xs text-muted-foreground">Forecast cost</p><p className="text-lg font-semibold"><Money value={fin.forecastCost} /></p></div>
            <div><p className="text-xs text-muted-foreground">Forecast profit</p><p className="text-lg font-semibold"><Money value={fin.forecastProfit} signed /></p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Direct cost entries</CardTitle>
              <CardDescription>Material, sub-contract and other costs</CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus /> Add cost
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-0">
            {costs.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">No direct costs recorded.</p>
            ) : (
              <ul className="divide-y text-sm">
                {[...costs].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
                  <li key={x.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{x.description}</p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABEL[x.type]} · {formatDate(x.date)}</p>
                    </div>
                    <span className="tabular font-medium">{formatINR(x.amount)}</span>
                    {canEdit && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(x)} aria-label="Delete cost entry">
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AddCostDialog open={open} onOpenChange={setOpen} projectId={project.id} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete cost entry?"
        description={deleting && <>{deleting.description} — {formatINR(deleting.amount)} will be removed from project cost.</>}
        destructive
        confirmLabel="Delete"
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => { toast.success("Cost entry deleted"); setDeleting(null); } })}
      />
    </div>
  );
}

type Values = { type: ProjectCostType; description: string; amount: string; date: string };

function AddCostDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  const create = useCreateProjectCost();
  const form = useForm<Values>({ type: "material", description: "", amount: "", date: todayISO() }, (v) => {
    const e: Errors<Values> = {};
    if (!v.description.trim()) e.description = "Description is required";
    if (!(Number(v.amount) > 0)) e.amount = "Enter an amount";
    return e;
  });
  const { values: v, errors, set } = form;
  const submit = form.handleSubmit((vals) =>
    create.mutate(
      { projectId, type: vals.type, description: vals.description.trim(), amount: Number(vals.amount), date: vals.date },
      {
        onSuccess: () => {
          toast.success("Cost added", { description: `${formatINR(Number(vals.amount))} added to project cost` });
          form.reset();
          onOpenChange(false);
        },
      },
    ),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add project cost"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="cost-form" loading={create.isPending}>Add cost</Button>
          </>
        }
      >
        <form id="cost-form" onSubmit={submit} className="grid grid-cols-2 gap-4" noValidate>
          <Field label="Type" htmlFor="c-type">
            <Select id="c-type" value={v.type} onChange={(e) => set("type", e.target.value as ProjectCostType)}>
              {(Object.keys(TYPE_LABEL) as ProjectCostType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="c-date">
            <Input id="c-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="c-desc" required error={errors.description} className="col-span-2">
            <Input id="c-desc" value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. AHU supply – 2 units" aria-invalid={!!errors.description} />
          </Field>
          <Field label="Amount (₹)" htmlFor="c-amt" required error={errors.amount}>
            <Input id="c-amt" type="number" min={0} value={v.amount} onChange={(e) => set("amount", e.target.value)} aria-invalid={!!errors.amount} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
